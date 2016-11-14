'use strict';

var apiai = require('apiai');
var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('node-uuid');
var request = require('request');
var JSONbig = require('json-bigint');
var async = require('async');
var log4js = require('log4js');
var fs = require('fs');

var REST_PORT = (process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 5000);
var SEVER_IP_ADDR = process.env.OPENSHIFT_NODEJS_IP || process.env.HEROKU_IP ;
var APIAI_ACCESS_TOKEN = "c8021e1a2dac4f85aee8f805a5a920b2" ; 
var APIAI_LANG = 'en' ;
var FB_VERIFY_TOKEN = "CAA30DE7-CC67-4CBA-AF93-2B1C5C4C19D4" ;
var FB_PAGE_ACCESS_TOKEN = "EAAEziYhGZAZAIBAOutH2TU9KoF5GtZAM2bzvr1VnophuxZBHu5PDzjHY8KnuI4T7IbtPnPs3Wy57imBRC5GiKW58vl1c3vgQPYnrK4vJK2ifNnAoZBAstE9PW4JIYz97pMk9Bzk6xqFrMre1ONFjzmg4EKSv5ErZAEZCj7Kuzmm0ZAcecf4DYLuG";
var APIAI_VERIFY_TOKEN = "verify123" ;
var apiAiService = apiai(APIAI_ACCESS_TOKEN, {language: APIAI_LANG, requestSource: "fb"});
var sessionIds = new Map();

//======================

log4js.loadAppender('file');
//log4js.addAppender(log4js.appenders.console());
log4js.addAppender(log4js.appenders.file('./logger.txt'), 'VZ');

var logger = log4js.getLogger('VZ');
logger.setLevel('INFO');

/*
logger.trace('Entering cheese testing');
logger.debug('Got cheese.');
logger.info('Cheese is Gouda.');
logger.warn('Cheese is quite smelly.');
logger.error('error');
logger.fatal('fatel');
*/

//=========================================================

function processEvent(event) {
    var sender = event.sender.id.toString();

    if ((event.message && event.message.text) || (event.postback && event.postback.payload)) {
        var text = event.message ? event.message.text : event.postback.payload;
        // Handle a text message from this sender
        
        if (!sessionIds.has(sender)) {
            sessionIds.set(sender, uuid.v1());
        }
        console.log("Text", text);	        
        logger.info("info text :-"+ text);
	logger.error("Error Text :-"+ text);
        var apiaiRequest  = apiAiService.textRequest(text,{sessionId: sessionIds.get(sender)});

        apiaiRequest .on('response', function (response)  {
            if (isDefined(response.result)) {
                var responseText = response.result.fulfillment.speech;
                var responseData = response.result.fulfillment.data;
                var action = response.result.action;
		    
                var intent = response.result.metadata.intentName;
		console.log(JSON.stringify(response));
		var Finished_Status=response.result.actionIncomplete;
		 console.log("Finished_Status "+ Finished_Status);
		    
		console.log('responseText  : - '+ responseText);
		console.log('responseData  : - '+ responseData);
	        console.log('action : - '+ action );
                console.log('intent : - '+ intent );
		
		    //send request to api.ai
    		//var request = app.textRequest(session.message.text, options);
		// see if the intent is not finished play the prompt of API.ai or fall back messages
		if(Finished_Status == true || intent=="Default Fallback Intent" ) 
		{
			sendFBMessage(sender, {text: responseText});
		}
			else //if the intent is complete do action
			{
				    console.log("----->>>>>>>>>>>> INTENT SELECTION <<<<<<<<<<<------");
				    var straction =response.result.action;
				    console.log("Selected_action : "+ straction);
				   // Methods to be called based on action 
				    switch (straction) 
				    {
					 case "getStarted":
					    console.log("----->>>>>>>>>>>> INSIDE getStarted <<<<<<<<<<<------");
					   welcomeMsg(sender);  
					   break;
					case "LinkOptions":
					     console.log("----->>>>>>>>>>>> INSIDE LinkOptions <<<<<<<<<<<------");
					    accountlinking(response,sender);
					    break;
					case "MoreOptions":
						     console.log("----->>>>>>>>>>>> INSIDE MoreOptions <<<<<<<<<<<------");
					      sendFBMessage(sender,  {text: responseText});
					    break;
					case "MainMenu":
						     console.log("----->>>>>>>>>>>> INSIDE MainMenu <<<<<<<<<<<------");
					    MainMenu(sender);
					    break;
					case "record":
					    console.log("----->>>>>>>>>>>> INSIDE recordnew <<<<<<<<<<<------");	    
					     RecordScenario (response,sender); 
					     break;  
					case "CategoryList":
						     console.log("----->>>>>>>>>>>> INSIDE CategoryList <<<<<<<<<<<------");
					     CategoryList(response,sender);
					     break;
					case "recommendation":
						     console.log("----->>>>>>>>>>>> INSIDE demowhatshot <<<<<<<<<<<------");
					    recommendations('whatshot',function (str) {recommendationsCallback(str,sender)}); 
					    break;
					case "channelsearch":
						     console.log("----->>>>>>>>>>>> INSIDE channelsearch <<<<<<<<<<<------");
					   ChnlSearch(response,function (str){ ChnlSearchCallback(str,sender)}); 
					   break;
					case "programSearch":
						     console.log("----->>>>>>>>>>>> INSIDE programSearch <<<<<<<<<<<------");
					    PgmSearch(response,function (str){ PgmSearchCallback(str,sender)});
					    break;
					case "support":
						     console.log("----->>>>>>>>>>>> INSIDE support <<<<<<<<<<<------");
					     support(sender);
					    break;
					case "upgradeDVR":
						     console.log("----->>>>>>>>>>>> INSIDE upgradeDVR <<<<<<<<<<<------");
					     upgradeDVR(response,sender);
					     break;
					case "upsell":
						     console.log("----->>>>>>>>>>>> INSIDE upsell <<<<<<<<<<<------");
					     upsell(response,sender);
					     break;
					case "Billing":
						     console.log("----->>>>>>>>>>>> INSIDE Billing <<<<<<<<<<<------");
					     testmethod(sender);
					    break;
					case "demowhatshot":
						     console.log("----->>>>>>>>>>>> INSIDE demowhatshot <<<<<<<<<<<------");
					    demowhatshot(sender);
					    break;
					default:
						console.log("----->>>>>>>>>>>> INSIDE default <<<<<<<<<<<------");
					    sendFBMessage(sender,  {text: responseText});
					 }
		    }
		    
	    }    
                
        });

       // apiaiRequest.on('error', function (error) {console.error(error)});
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
	
	   console.log('sendFBMessage: sender '+ sender + "messageData  " + messageData);
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
	
	//=========================================
	// Get facebook users profile
 function getprofile (session) 
 {
        console.log("=== DIALOG: GETPROFILE | STEP: 1/1 ====");
        //console.log(session);
        // Store the returned user page-scoped id (USER_ID) and page id
        session.userData.userid = session.message.sourceEvent.sender.id;
        session.userData.pageid = session.message.sourceEvent.recipient.id;

        console.log("FB User ID " + session.userData.userid);
        console.log("FB Page ID " + session.userData.pageid);

        // Let the user know we are 'working'
        //session.sendTyping();
        // Get the users profile information from FB
        request({
            url: 'https://graph.facebook.com/v2.8/' + session.userData.userid + '?fields=first_name,last_name,profile_pic,locale,timezone,gender',
            qs: { access_token: 'EAAEziYhGZAZAIBAOutH2TU9KoF5GtZAM2bzvr1VnophuxZBHu5PDzjHY8KnuI4T7IbtPnPs3Wy57imBRC5GiKW58vl1c3vgQPYnrK4vJK2ifNnAoZBAstE9PW4JIYz97pMk9Bzk6xqFrMre1ONFjzmg4EKSv5ErZAEZCj7Kuzmm0ZAcecf4DYLuG' },
            method: 'GET'
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                // Parse the JSON returned from FB
                body = JSON.parse(body);
                // Save profile to userData
                session.dialogData.firstname = body.first_name;
                session.dialogData.lastname = body.last_name;
                session.dialogData.profilepic = body.profile_pic;
                session.dialogData.locale = body.locale;
                session.dialogData.timezone = body.timezone;
                session.dialogData.gender = body.gender;

                console.log("Last Name " + body.last_name);
                console.log("First Name " + body.first_name);
                console.log("Gender " + body.gender);
                console.log("Locale " + body.locale);

                // Return to /startSession
                session.endDialogWithResult({ response: session.dialogData });
            } else {
                // TODO: Handle errors
                console.log(error);
                console.log("Get user profile failed");
            }
        }
		);
}

function accountlinking(apireq,usersession)
{
	console.log('Account Linking Button') ;
	var respobj ={"facebook":{"attachment":{"type":"template","payload":{"template_type":"generic","elements":[{"title":"Login to Verizon","image_url":"https://www98.verizon.com/foryourhome/vzrepair/siwizard/img/verizon-logo-200.png","buttons":[{"type":"account_link","url":"https://www98.verizon.com/foryourhome/myaccount/ngen/upr/bots/preauth.aspx"}]}]}}}};
	         
        sendFBMessage(usersession,  respobj.facebook);
}

// function calls
function welcomeMsg(usersession)
{
     console.log("inside welcomeMsg");
       var respobj= {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":"Want to know what’s on tonight? When your favorite sports team is playing? What time your favorite show is coming on? I can answer almost anything, so try me! Before we get started—let’s take a few minutes to get me linked to your Verizon account, this way I can send you personalized recommendations, alerts.","buttons":[{"type":"postback","title":"Link Account","payload":"Link Account"},{"type":"postback","title":"Maybe later","payload":"Main Menu"}]}}}};
	 console.log(JSON.stringify(respobj)); 
	 sendFBMessage(usersession, {text: "Hi Welcome to Verizon"});
	 sendFBMessage(usersession,  respobj.facebook);
	
	
}

function MainMenu(usersession)
{
   // var respobj = {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":"Are you looking for something to watch, or do you want to see more options? Type or tap below.","buttons":[{"type":"postback","title":"What's on tonight?","payload":"On Later"},{"type":"postback","title":"More Options","payload":"More Options"}]}}}};
     var respobj ={"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":"Are you looking for something to watch, or do you want to see more options? Type or tap below.","buttons":[{"type":"postback","title":"What's on tonight?","payload":"On Later"},{"type":"postback","title":"Show Program Categories","payload":"Show Program Categories"},{"type":"postback","title":"More Options","payload":"More Options"}]}}}};    
	sendFBMessage(usersession,  respobj.facebook);
}


function CategoryList(apireq,usersession) {
	
	var pgNo = apireq.result.parameters.PageNo;
	var categlist={}
	
	switch(pgNo)
	{
		case '1':
			categlist={"facebook":
			{ "text":"Pick a category", 
			 "quick_replies":[ 
			//    "content_type":"text", "title":"Red", "payload":"red"
			    { "content_type": "text", "title":"Children & Family", "payload":"show Kids movies" }, 
			    { "content_type": "text", "title":"Action & Adventure", "payload":"show Action movies" }, 
			    { "content_type": "text", "title":"Documentary", "payload":"show Documentary movies" }, 
			    { "content_type": "text", "title":"Mystery", "payload":"show Mystery movies" },
			    { "content_type": "text", "title":"More Categories ", "payload":"show categories list pageno: 2" }
			 ] }};
			break;
		default :
		categlist={"facebook":
			{ "text":"I can also sort my recommendations for you by genre. Type or tap below", 
			 "quick_replies":[ 
			    { "content_type": "text", "payload":"Show Comedy movies", "title":"Comedy" }, 
			    { "content_type": "text", "payload":"Show Drama movies", "title":"Drama" }, 
			    { "content_type": "text", "payload":"Show Sports program" , "title":"Sports"}, 
			    { "content_type": "text", "payload":"show Sci-Fi movies" , "title":"Sci-Fi"},
			    { "content_type": "text", "payload":"show categories list pageno: 1" , "title":"More Categories "}
			 ] }};
			break;
		}           
  	 sendFBMessage(usersession,  categlist.facebook);
	
	
} 

function PgmSearch(apireq,callback) { 
         var strProgram =  apireq.result.parameters.Programs;
	 var strGenre =  apireq.result.parameters.Genre;
	 var strdate =  apireq.result.parameters.date;
	 var strChannelName =  apireq.result.parameters.Channel;
	 var strRegionId = "92377";
	 console.log("strProgram " + strProgram + "strGenre " + strGenre + "strdate " +strdate);
	
        var headersInfo = { "Content-Type": "application/json" };
	
	var args = {
		"headers": headersInfo,
		"json": {Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
			 Request: {ThisValue: 'EnhProgramSearch', 
				   BotstrTitleValue:strProgram, 
				   BotdtAirStartDateTime : strdate,
				   BotstrGenreRootId : strGenre,
				   BotstrStationCallSign:strChannelName,
				   BotstrFIOSRegionID : strRegionId
				  } 
			}
		};
	
	 console.log("args " + args);
	
    request.post("https://www.verizon.com/foryourhome/vzrepair/flowengine/restapi.ashx", args,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
             
                 console.log("body " + body);
                callback(body);
            }
            else
            	console.log('error: ' + error + ' body: ' + body);
        }
    );
 } 
  
function PgmSearchCallback(apiresp,usersession) {
    var objToJson = {};
    objToJson = apiresp;
	var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
	 console.log("subflow-PgmSearchCallback " + JSON.stringify(subflow));
	 logger.info("subflow-PgmSearchCallback" + subflow );
	
		// console.log("=====>>>>>>>>>Attachment is EMpty " + JSON.stringify(subflow.facebook));
		// logger.info("Attachment is EMpty");
	
	 sendFBMessage(usersession,  subflow.facebook);
} 

function ChnlSearch(apireq,callback) { 
	console.log("ChnlSearch called " );
	
      var strChannelName =  apireq.result.parameters.Channel.toUpperCase();
	
	  console.log("strChannelName " + strChannelName);
        var headersInfo = { "Content-Type": "application/json" };
	var args = {
		"headers": headersInfo,
		"json": {Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
			 Request: {ThisValue: 'ChannelSearch',BotstrStationCallSign:strChannelName} 
			}
		
	};
  console.log("json " + String(args));
	
    request.post("https://www.verizon.com/foryourhome/vzrepair/flowengine/restapi.ashx", args,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
             
                 console.log("body " + body);
                callback(body);
            }
            else
            	console.log('error: ' + error + ' body: ' + body);
        }
    );
 } 
  
function ChnlSearchCallback(apiresp,usersession) {
    var objToJson = {};
    objToJson = apiresp;
	var chposition = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
	
	console.log("chposition :" + chposition)
	sendFBMessage(usersession,  {text:"You can watch it on channel # " + chposition});
} 

function recommendations(pgmtype,callback) { 
       	console.log('inside external call ');
        var headersInfo = { "Content-Type": "application/json" };
	var args = {
		"headers": headersInfo,
		"json": {
			Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
			Request: {
				ThisValue: pgmtype, BotstrVCN:''
			}
		}
	};

    request.post("https://www.verizon.com/foryourhome/vzrepair/flowengine/restapi.ashx", args,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
             
                 console.log("body " + body);
                callback(body);
            }
            else
            	console.log('error: ' + error + ' body: ' + body);
        }
    );
 } 
  
function recommendationsCallback(apiresp,usersession) {
    var objToJson = {};
    objToJson = apiresp;
	var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
	
	 console.log("subflow " + JSON.stringify(subflow));
	sendFBMessage(usersession,  subflow.facebook);
} 

function LinkOptions(apireq,usersession)
{
    console.log('Calling from  link options:') ;
	
    var strRegionId =  apireq.result.parameters.RegionId;
    console.log('strRegionId:' + strRegionId) ;
	var respobj={};
	if (strRegionId != undefined  && strRegionId !='')
	{
		respobj= {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":"Are you looking for something to watch, or do you want to see more options? Type or tap below.","buttons":[{"type":"postback","title":"What's on tonight?","payload":"On Later"},{"type":"postback","title":"More Options","payload":"More Options"}]}}}};
	}
	else
	{
		var struserid = ''; 
		for (var i = 0, len = apireq.result.contexts.length; i < len; i++) 
		{
				if (apireq.result.contexts[i].name == "sessionuserid")
				{
					 struserid = apireq.result.contexts[i].parameters.Userid;
					console.log("original userid " + ": " + struserid);
				}
		} 

		if (struserid == '' || struserid == undefined) struserid='lt6sth2'; //hardcoding if its empty	

		respobj= {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":"Congrats, we got your details. Tap Continue to proceed.","buttons":[{"type":"postback","title":"Continue","payload":"Userid : " + struserid + "   Regionid : 92377"}]}}}};
	}
	sendFBMessage(usersession,  respobj.facebook);
}

function RecordScenario (apiresp,usersession)
{
	console.log("inside RecordScenario");
	var channel = apiresp.result.parameters.Channel.toUpperCase();
	var program = apiresp.result.parameters.Programs.toUpperCase();
	var time = apiresp.result.parameters.timeofpgm;
	var dateofrecord = apiresp.result.parameters.date;
	var SelectedSTB = apiresp.result.parameters.SelectedSTB;
	console.log("SelectedSTB : " + SelectedSTB + " channel : " + channel + " dateofrecord :" + dateofrecord + " time :" + time);
		
		if (time == "") //if time is empty show schedule
			{ PgmSearch(apiresp,function (str){ PgmSearchCallback(str,usersession)});}
		else if (SelectedSTB == "" || SelectedSTB == undefined) 
			{ STBList(apiresp,function (str){ STBListCallBack(str,usersession)}); }
		else if (channel == 'HBOSIG') //not subscribed scenario - call to be made
			{
			  var respobj = {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":" Sorry you are not subscribed to " + channel +". Would you like to subscribe " + channel + " ?","buttons":[{"type":"postback","title":"Subscribe","payload":"Subscribe"},{"type":"postback","title":"No, I'll do it later ","payload":"Main Menu"}]}}}};	
			  sendFBMessage(usersession,  respobj.facebook);
				
			}
		else if (channel == 'CBSSN')  //DVR full scenario - call to be made
			{
			   var respobj= {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":" Sorry your DVR storage is full.  Would you like to upgrade your DVR ?","buttons":[{"type":"postback","title":"Upgrade my DVR","payload":"Upgrade my DVR"},{"type":"postback","title":"No, I'll do it later ","payload":"Main Menu"}]}}}};
			   sendFBMessage(usersession,  respobj.facebook);
			}
		else 
			{  //Schedule Recording
			   console.log(" Channel: " + apiresp.result.parameters.Channel +" Programs: " + apiresp.result.parameters.Programs +" SelectedSTB: " + apiresp.result.parameters.SelectedSTB +" Duration: " + apiresp.result.parameters.Duration +" FiosId: " + apiresp.result.parameters.FiosId +" RegionId: " + apiresp.result.parameters.RegionId +" STBModel: " + apiresp.result.parameters.STBModel +" StationId: " + apiresp.result.parameters.StationId +" date: " + apiresp.result.parameters.date +" timeofpgm: " + apiresp.result.parameters.timeofpgm );
			   DVRRecord(apiresp,function (str){ DVRRecordCallback(str,usersession)});
			}  
}


function STBList(apireq,callback) { 
       	console.log('inside external call '+ apireq.contexts);
	var struserid = ''; 
	for (var i = 0, len = apireq.result.contexts.length; i < len; i++) {
		if (apireq.result.contexts[i].name == "sessionuserid") {

			 struserid = apireq.result.contexts[i].parameters.Userid;
			console.log("original userid " + ": " + struserid);
		}
	} 
	
	if (struserid == '' || struserid == undefined) struserid='lt6sth2'; //hardcoding if its empty
	
		console.log('struserid '+ struserid);
        var headersInfo = { "Content-Type": "application/json" };
	var args = {
		"headers": headersInfo,
		"json": {Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
			 Request: {ThisValue: 'STBList',Userid:struserid} 
			}
		
	};

    request.post("https://www.verizon.com/foryourhome/vzrepair/flowengine/restapi.ashx", args,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
             
                 console.log("body " + body);
                callback(body);
            }
            else
            	console.log('error: ' + error + ' body: ' + body);
        }
    );
 } 
  
function STBListCallBack(apiresp,usersession) {
    var objToJson = {};
    objToJson = apiresp;
	var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;   	
	sendFBMessage(usersession,  subflow.facebook);
} 

function DVRRecord(apireq,callback) { 
	
	var strUserid = ''; 
	for (var i = 0, len = apireq.result.contexts.length; i < len; i++) {
		if (apireq.result.contexts[i].name == "sessionuserid") {

			 strUserid = apireq.result.contexts[i].parameters.Userid;
			console.log("original userid " + ": " + strUserid);
		}
	} 
	if (strUserid == '' || strUserid == undefined) strUserid='lt6sth2'; //hardcoding if its empty
		
         var strProgram =  apireq.result.parameters.Programs;
	 var strChannelName =  apireq.result.parameters.Channel;
	 var strGenre =  apireq.result.parameters.Genre;

	var strFiosId = apireq.result.parameters.FiosId;
	var strStationId =apireq.result.parameters.StationId  ;
	
	var strAirDate =apireq.result.parameters.date  ;
	var strAirTime =apireq.result.parameters.timeofpgm  ;
	var strDuration =apireq.result.parameters.Duration  ;
	
	var strRegionId =apireq.result.parameters.RegionId;
	var strSTBModel =apireq.result.parameters.STBModel  ;
	var strSTBId =apireq.result.parameters.SelectedSTB  ;
	
	var strVhoId =apireq.result.parameters.VhoId  ;
	var strProviderId =apireq.result.parameters.ProviderId  ;
	
	
	 console.log(" strUserid " + strUserid + "Recording strProgram " + strProgram + " strGenre " + strGenre + " strdate " +strAirDate + " strFiosId " +strFiosId + " strStationId " +strStationId  +" strAirDate " + strAirDate + " strAirTime " + strAirTime+ " strSTBId " +strSTBId + " strSTBModel " +strSTBModel+" strRegionId " +strRegionId+ " strDuration " +strDuration );
	
        var headersInfo = { "Content-Type": "application/json" };
	
	var args = {
		"headers": headersInfo,
		"json": {Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
			 Request: {ThisValue: 'DVRSchedule', 
				   Userid : strUserid,
				   BotStbId:strSTBId, 
				   BotDeviceModel : strSTBModel,
				   BotstrFIOSRegionID : '91629',
				   BotstrFIOSServiceId : strFiosId,
				   BotStationId : strStationId,
				   BotAirDate : strAirDate,
				   BotAirTime : strAirTime,
				   BotDuration : strDuration,
				   BotVhoId : strVhoId,
				   BotProviderId : strProviderId
				   } 
			}
		};
	
	 console.log("args " + JSON.stringify(args));
	
    request.post("https://www.verizon.com/foryourhome/vzrepair/flowengine/restapi.ashx", args,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
             
                 console.log("body " + JSON.stringify(body));
                callback(body);
            }
            else
            	console.log('error: ' + error + ' body: ' + body);
        }
    );
 } 

function DVRRecordCallback(apiresp,usersession) 
{
     var objToJson = {};
     objToJson = apiresp;
	try{
		var subflow = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
		console.log(JSON.stringify(subflow));
		var respobj={};
		if (subflow !=null )
		{
			if (subflow.facebook.result.msg =="success" )
			{
				respobj = {"facebook":
					   {"attachment":
					    {"type":"template","payload":
					     {"template_type":"button","text":"Good news, you have successfully scheduled this recording. Would you like to see some other TV Recommendations for tonight?","buttons":[
						     {"type":"postback","title":"Show Recommendations","payload":"Show Recommendations"},
						     {"type":"postback","title":"More Options","payload":"More Options"}]}}}};				
				sendFBMessage(usersession,  respobj.facebook);
			}
			else if (subflow.facebook.result.code = "9507")
 			{
 				respobj = "This Program has already been scheduled";
 				sendFBMessage(usersession,  {text: respobj});
 			}
			else
			{
				console.log( "Error occured in recording: " + subflow.facebook.result.msg); 				
				respobj = "I'm unable to schedule this Program now. Can you please try this later";
				sendFBMessage(usersession,  {text: respobj});				
			}
		}
		else
		{
			respobj = "I'm unable to schedule this Program now. Can you please try this later";			
			sendFBMessage(usersession,  {text: respobj});
		}
	}
	catch (err) 
	{
		console.log( "Error occured in recording: " + err);
		respobj = "Sorry!, There is a problem occured in Scheduling. Try some other.";
		//sendFBMessage(usersession,  respobj.facebook);
		 sendFBMessage(usersession,  {text: respobj});
	}
}

function support(usersession)
{
	var respobj={"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":"You may need some additional help. Tap one below.","buttons":[{"type":"web_url","url":"https://m.me/fios","title":"Chat with Agent "},{"type":"phone_number","title":"Talk to an agent","payload":"+918554804789"}]}}}};	
 	//var msg = new builder.Message(usersession).sourceEvent(respobj);              
    	//usersession.send(respobj);
	sendFBMessage(usersession,  respobj.facebook);
}

function upsell(apiresp,usersession) 
{
	var respstr ='Congrats, Now you are subscribed for ' + apiresp.result.parameters.Channel +" Channel.  Now  I can help you with  TV Recommendations or Recording a program. What would you like to do?" ;
	var respobj={"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text": respstr,"buttons":[{"type":"postback","title":"TV Recommendations","payload":"Yes"},{"type":"postback","title":"Record","payload":"I want to record"}]}}}};
	//var msg = new builder.Message(usersession).sourceEvent(respobj);              
    	sendFBMessage(usersession,  respobj.facebook);
}

function upgradeDVR(apiresp,usersession) 
{
   var purchasepin =  apiresp.result.parameters.purchasepin;
   if (purchasepin !="" || purchasepin !=undefined )
    	var respstr ="Congrats, Your DVR is upgraded.  Now  I can help you with  TV Recommendations or Recording a program. What would you like to do?" ;
   else
    	var respstr ="Ok, we are not upgratding the DVR now.  Now  I can help you with  TV Recommendations or Recording a program. What would you like to do?" ;

    var respobj={"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text": respstr ,"buttons":[{"type":"postback","title":"TV Recommendations","payload":"Yes"},{"type":"postback","title":"Record","payload":"I want to record"}]}}}}
   // var msg = new builder.Message(usersession).sourceEvent(respobj);              
    sendFBMessage(usersession,  respobj.facebook);
}

function demowhatshot(usersession) 
{
    var respobj =  {"facebook":{"attachment":{"type":"template","payload":{"template_type":"generic","elements":[{"title":"Family Guy","subtitle":"WBIN : Comedy","image_url":"http://image.vam.synacor.com.edgesuite.net/8d/53/8d532ad0e94c271f8fb153a86141de2c92ee15b0/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay","buttons":[{"type":"web_url","url":"http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg","title":"Watch Video"},{"type":"postback","title":"RecordNow","payload":"Get Program info of Program: Family Guy Channel: WBIN"}]},{"title":"NCIS","subtitle":"USA : Action &amp; Adventure,Drama","image_url":"http://image.vam.synacor.com.edgesuite.net/85/ed/85ed791472df3065ae5462d42560773a649fdfaf/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay","buttons":[{"type":"web_url","url":"http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg","title":"Watch Video"},{"type":"postback","title":"RecordNow","payload":"Get Program info of Program: NCIS Channel: USA"}]},{"title":"Shark Tank","subtitle":"CNBC : Action &amp; Adventure,Drama","image_url":"http://image.vam.synacor.com.edgesuite.net/0f/07/0f07592094a2a596d2f6646271e9cb0311508415/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay","buttons":[{"type":"web_url","url":"http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg","title":"Watch Video"},{"type":"postback","title":"RecordNow","payload":"Get Program info of Program: Shark Tank Channel: CNBC"}]},{"title":"Notorious","subtitle":"ABC WCVB : Action &amp; Adventure,Drama","image_url":"http://image.vam.synacor.com.edgesuite.net/ba/51/ba51ba91eafe2da2a01791589bca98c0044b6622/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay","buttons":[{"type":"web_url","url":"http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg","title":"Watch Video"},{"type":"postback","title":"RecordNow","payload":"Get Program info of Program: Notorious Channel: ABC WCVB"}]},{"title":"Chicago Med","subtitle":"NBC WHDH : Action &amp; Adventure,Drama","image_url":"http://image.vam.synacor.com.edgesuite.net/e1/93/e1933b6aee82a467980415c36dced6fddf64d80a/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay","buttons":[{"type":"web_url","url":"http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg","title":"Watch Video"},{"type":"postback","title":"RecordNow","payload":"Get Program info of Program: Chicago Med Channel: NBC WHDH"}]},{"title":"Modern Family","subtitle":"CW WLVI : Action &amp; Adventure,Drama","image_url":"http://image.vam.synacor.com.edgesuite.net/c1/58/c1586d0e69ca53c32ae64526da7793b8ec962678/w=207,h=151,crop=auto/?sig=0cdc5e32bc854a2e2d767ab10d96385797b360a24c9f845ead33b1ea3d79aa01&app=powerplay","buttons":[{"type":"web_url","url":"http://www.verizon.com/msvsearch/whatshotimage/thumbnails/default.jpg","title":"Watch Video"},{"type":"postback","title":"RecordNow","payload":"Get Program info of Program: Modern Family Channel: CW WLVI"}]}]}}}};
  //  var msg = new builder.Message(usersession).sourceEvent(respobj);              
   sendFBMessage(usersession,  respobj.facebook);
}

function testmethod(usersession)
{
 	console.log("inside test method");
	var myobj=  {   "facebook": {
			"attachment": {
				"type": "template",
				"payload": {
					"template_type": "button",
					"text": "Are you looking for something to watch, or do you want to see more options? Type or tap below.",
					"buttons": [
						{
							"type": "postback",
							"title": "What's on tonight?",
							"payload": "On Later"
						},
						{
							"type": "postback",
							"title": "More Options",
							"payload": "More Options"
						}
						   ]
					}
				}
			  	}
		    };
	
	//  var msg = new builder.Message(usersession).sourceEvent(myobj);              
         sendFBMessage(usersession,  myobj.facebook);
}
