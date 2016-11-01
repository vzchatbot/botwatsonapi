'use strict';

var apiai = require('apiai');
var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var request = require('request');
var JSONbig = require('json-bigint');
var async = require('async');


var REST_PORT = (process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 5000);
var SEVER_IP_ADDR = process.env.OPENSHIFT_NODEJS_IP || process.env.HEROKU_IP ;
var APIAI_ACCESS_TOKEN = process.env.APIAI_ACCESS_TOKEN ; 
var APIAI_LANG = process.env.APIAI_LANG ;
var FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN ;
var FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
var APIAI_VERIFY_TOKEN = process.env.APIAI_VERIFY_TOKEN 
var apiAiService = apiai(APIAI_ACCESS_TOKEN, {language: APIAI_LANG, requestSource: "fb"});
var sessionIds = new Map();

/*
var REST_PORT = (process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 5000);		
 var SEVER_IP_ADDR = process.env.OPENSHIFT_NODEJS_IP || process.env.HEROKU_IP || '127.0.0.1';		
 var APIAI_ACCESS_TOKEN = "badaab9333804060b3e6195665b3c2ca"; 		
 var APIAI_LANG = 'en';		
 var FB_VERIFY_TOKEN = "7E783CC9-A7BD-443C-A100-6851D448CDF1";		
 var FB_PAGE_ACCESS_TOKEN = "EAAEziYhGZAZAIBAOutH2TU9KoF5GtZAM2bzvr1VnophuxZBHu5PDzjHY8KnuI4T7IbtPnPs3Wy57imBRC5GiKW58vl1c3vgQPYnrK4vJK2ifNnAoZBAstE9PW4JIYz97pMk9Bzk6xqFrMre1ONFjzmg4EKSv5ErZAEZCj7Kuzmm0ZAcecf4DYLuG";		
 var APIAI_VERIFY_TOKEN =  "basic1234"		
 var apiAiService = apiai(APIAI_ACCESS_TOKEN, {language: APIAI_LANG, requestSource: "fb"});		
  var sessionIds = new Map();

*/
function processEvent(event) {
    var sender = event.sender.id.toString();

    if ((event.message && event.message.text) || (event.postback && event.postback.payload)) {
        var text = event.message ? event.message.text : event.postback.payload;
        // Handle a text message from this sender
        
        if (!sessionIds.has(sender)) {
            sessionIds.set(sender, uuid.v1());
        }

        console.log("Text", text);
               
        
        var apiaiRequest = apiAiService.textRequest(text,
            {
                sessionId: sessionIds.get(sender)
            });

        apiaiRequest.on('response', function (response)  {
            if (isDefined(response.result)) {
                var responseText = response.result.fulfillment.speech;
                var responseData = response.result.fulfillment.data;
                var action = response.result.action;
		console.log('responseText  : - '+ responseText);
		console.log('responseData  : - '+ responseData);
		    
 		//sendFBMessage(sender, {responseText});
		//   sendFBMessage(sender, responseText.facebook);
		    
                if (isDefined(responseText) || isDefined(responseText.facebook)) {
			console.log('first  : - ');
                    if (!Array.isArray(responseText.facebook)) {
			    console.log('second  : - ');
                        try {
                            console.log('Response as formatted message'+ responseText.facebook);
                            sendFBMessage(sender, responseText.facebook);
                        } catch (err) {
                            sendFBMessage(sender, {text: err.message});
                        }
                    } else {
                        responseText.facebook.forEach(function (facebookMessage)  {
                            try {
                                if (facebookMessage.sender_action) {
                                    console.log('Response as sender action');
                                    console.log("facebookMessage.sender_action" + facebookMessage.sender_action);
                                    sendFBSenderAction(sender, facebookMessage.sender_action);
                                }
                                else {
                                    console.log('Response as formatted message');
                                    console.log("facebookMessage"+facebookMessage);
                                    sendFBMessage(sender, facebookMessage);
                                }
                            } catch (err) {
                                sendFBMessage(sender, {text: err.message});
                            }
                        });
                    }
                } else if (isDefined(responseData)) {
                    console.log('Response as data message'+ responseText);
                    // facebook API limit for text length is 320,
                    // so we must split message if needed
                    var splittedText = splitResponse(responseData);

                    async.eachSeries(splittedText, function (textPart, callback) {
                        sendFBMessage(sender, {text: textPart}, callback);
                    });
                }

            }
        });

        apiaiRequest.on('error', function (error) {console.error(error)});
        apiaiRequest.end();
    }
}

function splitResponse(str) {
    if (str.length <= 320) {
        return [str];
    }

    return chunkString(str, 300);
}

function chunkString(s, len) {
    var curr = len, prev = 0;

    var output = [];

    while (s[curr]) {
        if (s[curr++] == ' ') {
            output.push(s.substring(prev, curr));
            prev = curr;
            curr += len;
        }
        else {
            var currReverse = curr;
            do {
                if (s.substring(currReverse - 1, currReverse) == ' ') {
                    output.push(s.substring(prev, currReverse));
                    prev = currReverse;
                    curr = currReverse + len;
                    break;
                }
                currReverse--;
            } while (currReverse > prev)
        }
    }
    output.push(s.substr(prev));
    return output;
}

function sendFBMessage(sender, messageData, callback) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: FB_PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: sender},
            message: messageData
        }
    }, function(error, response, body)  {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }

        if (callback) {
            callback();
        }
    });
}

function sendFBSenderAction(sender, action, callback) {
    setTimeout(function() {
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: FB_PAGE_ACCESS_TOKEN},
            method: 'POST',
            json: {
                recipient: {id: sender},
                sender_action: action
            }
        }, function (error, response, body)  {
            if (error) {
                console.log('Error sending action: ', error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
            }
            if (callback) {
                callback();
            }
        });
    }, 1000);
}

function doSubscribeRequest() {
    request({
            method: 'POST',
            uri: "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=" + FB_PAGE_ACCESS_TOKEN
        },
        function(error, response, body)  {
            if (error) {
                console.error('Error while subscription: ', error);
            } else {
                console.log('Subscription result: ', response.body);
            }
        });
}

function isDefined(obj) {
    if (typeof obj == 'undefined') {
        return false;
    }

    if (!obj) {
        return false;
    }

    return obj != null;
}

var app = express();

app.use(bodyParser.text({type: 'application/json'}));

app.get('/webhook/', function (req, res)  {
    if (req.query['hub.verify_token'] == FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);

        setTimeout(function()  {
            doSubscribeRequest();
        }, 3000);
    } else {
        res.send('Error, wrong validation token');
    }
});

app.get('/apiaiwebhook/', function (req, res)  {
if (req.headers['apiai_verify_token'] == APIAI_VERIFY_TOKEN) {
            return res.status(200).json({
                status: "ok"
            });
    } else {
        res.send('Error, wrong validation token');
    }
});

app.post('/apiaiwebhook/', function (req, res)  {
try {
        console.log ("here1");
        var data = JSONbig.parse(req.body);
        var actualFBMessage={"attachment":{"type":"template","payload":{"template_type":"generic","elements":[{"title":"Login to Verizon","image_url":"https://ss7.vzw.com/is/image/VerizonWireless/vzw-logo-156-130-c?$pngalpha$&wid=156&hei=30","buttons":[{"type":"account_link","url":"https://www98.verizon.com/foryourhome/myaccount/ngen/upr/bots/preauth.aspx"}]}]}}};
        
var datResponse={"speech":"Sign in ","data":{"facebook": actualFBMessage},"contextOut":[{"name":"signin", "lifespan":2, "parameters":{"type":"signin"}}],"source":"apiaiwebhook"};
console.log ("here"+JSONbig.stringify(datResponse));
  
        res.send(datResponse);
            /*return res.status(200).json({
            status: "ok"
            });*/
        } catch (err) {
            return res.status(400).json({
                status: "error",
                error: err
            });
        }
});



app.post('/webhook/', function (req, res)  {
    try {
        var data = JSONbig.parse(req.body);
		console.log(req.body);
        if (data.entry) {
            var entries = data.entry;
            entries.forEach(function (entry)  {
                var messaging_events = entry.messaging;
                if (messaging_events) {
                    messaging_events.forEach(function (event)  {
                        if (event.message && !event.message.is_echo ||
                            event.postback && event.postback.payload) {
                            processEvent(event);
                        }
                    });
                }
            });
        }

        return res.status(200).json({
            status: "ok"
        });
    } catch (err) {
        return res.status(400).json({
            status: "error",
            error: err
        });
    }

});

app.listen(REST_PORT,SEVER_IP_ADDR, function()  {
    console.log('Rest service ready on port ' + REST_PORT);
});

doSubscribeRequest();
