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
var util = require('util');

var REST_PORT = (process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 5000);
var SEVER_IP_ADDR = process.env.OPENSHIFT_NODEJS_IP || process.env.HEROKU_IP ;
var APIAI_ACCESS_TOKEN = "c8021e1a2dac4f85aee8f805a5a920b2" ; 
var APIAI_LANG = 'en' ;
var FB_VERIFY_TOKEN = "CAA30DE7-CC67-4CBA-AF93-2B1C5C4C19D4" ;
var FB_PAGE_ACCESS_TOKEN = "EAAEziYhGZAZAIBAABLZAuLkFLCRcrbEg0wPlNtHwvENI2vOikW7uSoqpUZABfNSUZAWSwIVdqLThflu78IC2ic8AjUcEFSfTNtTq9ht03TPZCYvbCZAJaLiUnahD9krlEC0WsxEOcmcdDNUsTt4JJRPZB1ZAuYfS4eRILvbQZB8uXp2QZDZD";
var APIAI_VERIFY_TOKEN = "verify123" ;
var apiAiService = apiai(APIAI_ACCESS_TOKEN, {language: APIAI_LANG, requestSource: "fb"});
var sessionIds = new Map();
var userData = new Map();



//======================
/*
log4js.loadAppender('file');
//log4js.addAppender(log4js.appenders.console());
log4js.addAppender(log4js.appenders.file('./logger.txt'), 'VZ');

var logger = log4js.getLogger('VZ');
logger.setLevel('INFO');
*/

log4js.configure({
    appenders: 
    [
        { type: 'console' },
        {
            type: 'dateFile', filename: 'D:\\app\\log\\bot\\botws.log', category: 'botws', "pattern": "-yyyy-MM-dd","alwaysIncludePattern": false
        },
        {
            type: 'logLevelFilter',
            level: 'ERROR', appender: {
                type: "dateFile",
                filename: 'D:\\app\\log\\bot\\boterrors.log',
                category: 'errorlog',"pattern": "-yyyy-MM-dd","alwaysIncludePattern": false
            }
        }
        ,
        {
            type: 'logLevelFilter',
            level: 'debug', appender: {
                type: "dateFile",
                filename: 'D:\\app\\log\\bot\\ChatHistory.log',
                category: 'Debug', "pattern": "-yyyy-MM-dd", "alwaysIncludePattern": false
            }
        }
    ]
});

var logger = log4js.getLogger("botws");
var Errlogger = log4js.getLogger('errorlog');
var ChatHistoryLog = log4js.getLogger('Debug');

//=========================================================

function processEvent(event) {
    var sender = event.sender.id.toString();
    console.log("senderid", sender);
    ChatHistoryLog.log("senderid", sender);
	
	
	
    if ((event.message && event.message.text) || (event.postback && event.postback.payload)) 
    {
        var text = event.message ? event.message.text : event.postback.payload;      
        console.log("Before Account Linking ");  
	
	    
        if (!sessionIds.has(sender))
        {
            console.log("Inside sessionID:- ");
            sessionIds.set(sender, uuid.v1());
        }
	/*
	var ReqSenderID = event.sender.id.toString();
        var ReqRecipientID = event.recipient.id.toString();
        var ReqTimeStamp = event.timestamp.toString();        
        var ReqMessageID = event.message.mid.toString();
        var ReqMessageText = event.message.text.toString();   
	*/
	    
        console.log("Text Value", text);   
        console.log("event content :- " +JSON.stringify(event.entry));
       
        if (event.account_linking) 
        {
            console.log("event account_linking content :- " + JSON.stringify(event.account_linking));
            console.log("Account Linking null - 1");
            if (event.account_linking == undefined) {
                console.log("Account Linking null - 2");
            }
            else if (event.account_linking.status == "linked") {
                console.log("Account Linking convert: " + JSON.stringify(event.account_linking.authorization_code, null, 2));
                console.log("Account Linking convert: " + JSON.stringify(event.account_linking.status, null, 2));
                var authCode = event.account_linking.authorization_code;
                //delete event.account_linking;
                getVzProfile(authCode, function (str) { getVzProfileCallBack(str, event) });
                MainMenu(sender);
                
            } else if (event.account_linking.status == "unlinked") {
                //Place holder code to unlink.
            }
        }
	    
    
   
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
		    
//console.log("||" + JSON.stringify(ReqSenderID) + "||" + JSON.stringify(ReqRecipientID) +"||"+ JSON.stringify(ReqTimeStamp) + "||" + JSON.stringify(ReqMessageID) + "|| "+ JSON.stringify(ReqMessageText)+ "||"  + JSON.stringify(action) + "||"+  JSON.stringify(intent)+ "|| Undefined");	    
 
		    
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
                            RecordScenario (response,sender,sender); 
                            break;  
                        case "CategoryList":
                            console.log("----->>>>>>>>>>>> INSIDE CategoryList <<<<<<<<<<<------");
                            CategoryList(response,sender);
                            break;
                        case "recommendation":
                            console.log("----->>>>>>>>>>>> INSIDE recommendation <<<<<<<<<<<------");
                            recommendations(response,'OnLater',function (str) {recommendationsCallback(str,sender)}); 
                            break;
                        case "OnNowrecommendation":
                            console.log("----->>>>>>>>>>>> INSIDE OnNowrecommendation <<<<<<<<<<<------");
                            recommendations(response,'OnNow',function (str) {recommendationsCallback(str,sender)}); 
                            break;
                        case "channelsearch":
                            console.log("----->>>>>>>>>>>> INSIDE channelsearch <<<<<<<<<<<------");
                            //ChnlSearch(response,function (str){ ChnlSearchCallback(str,sender)}); 
				    stationsearch(response,function (str){ stationsearchCallback(str,sender)}); 
                            break;
                        case "programSearch":
                            console.log("----->>>>>>>>>>>> INSIDE programSearch <<<<<<<<<<<------");
                            PgmSearch(response,sender,function (str){ PgmSearchCallback(str,sender)});
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
                            stationsearch(sender);
                            break;
                            /*case "demowhatshot":
                                     console.log("----->>>>>>>>>>>> INSIDE demowhatshot <<<<<<<<<<<------");
                                demowhatshot(sender);
                                break; */
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
	   console.log('sendFBMessage - ResSenderID :' + sender);   

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
        var actualFBMessage={"attachment":{"type":"template","payload":{"template_type":"generic","elements":[
		{"title":"Login to Verizon","image_url":"https://ss7.vzw.com/is/image/VerizonWireless/vzw-logo-156-130-c?$pngalpha$&wid=156&hei=30","buttons":[
		{"type":"account_link","url":"https://www98.verizon.com/foryourhome/myaccount/ngen/upr/bots/preauth.aspx"}]}]}}};        
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
        console.log("ResBodyMessage" + req.body);
        if (data.entry) {
            var entries = data.entry;				
            entries.forEach(function (entry)  {
		    		
                var messaging_events = entry.messaging;
                if (messaging_events) {
                    messaging_events.forEach(function (event)  {
			     if (event.sender)
				{
				  var SenderID = event.sender.id;
				 }
			    if (event.recipient) 
			    {
				    var RecipientID = event.recipient.id;
				  
			    } 		
			     if (event.message) 
				 {
					  var TimeStamp = event.timestamp;
					  var MessageID = event.message.mid;
					  var MessageText = event.message.text;
console.log("||" + JSON.stringify(SenderID) + "||" + JSON.stringify(RecipientID) +"||"+ JSON.stringify(TimeStamp) +
	    "||" + JSON.stringify(MessageID) + "|| " + JSON.stringify(MessageText)+ "|| Undefined || Undefined ||" + JSON.stringify(data));

                       		 } 
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
// function calls
function getvzUserID(authCode, apireq, senderid) {
    // Using Authcode pull the user ID from DB.
    var strAuth = userData.get("authcode");

    var args = {
        json: {
            Request: {
                op: "GETFBACCOUNTLINKDETAILS",              
                Authcode: strAuth               
            }
        }       
    }
    console.log('args ' + JSON.stringify(args));
    request({
        url: 'https://www25.verizon.com/fiostv/myservices/admin/botapinew.ashx',
        proxy: '',
        headers: headersInfo,
        method: 'POST',
        json: args.json
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {

            console.log("body " + body);
            callback(body);
        }
        else
            console.log('error: ' + error + ' body: ' + body);
    });
}


function getvzUserIDCallback(apiresp, senderid) {

    // Using Authcode pull the user ID from DB.
    var objToJson = {};
    objToJson = apiresp;  

    var UD_UserID = objToJson.oDSAccountDetails.oDAAccountDetails.strUserID;
    userData.set("UD_UserID", UD_UserID.replace(/\"/g, ""));
    console.log("UserID:" + JSON.stringify(UD_UserID))
    console.log("UserID:" + UD_UserID)
    
    getVzProfileAccountUpdate(UD_UserID, function (str) { getVzProfileAccountUpdateCallBack(str, senderid) });
  
   
} 

function getVzProfileAccountUpdate(struserid, callback) {
    console.log('Inside getVzProfileAccountUpdate Profile');
       
    if (struserid == '' || struserid == undefined) struserid = 'lt6sth2'; //hardcoding if its empty
    console.log('struserid ' + struserid);

    var headersInfo = { "Content-Type": "application/json" };
    var args = {
        json: {
            Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
            Request: { ThisValue: 'GetProfile', Userid: struserid }
        }

    };
    console.log('args ' + JSON.stringify(args));

    request({
        url: config.rest_api,
        proxy: config.vz_proxy,
        headers: headersInfo,
        method: 'POST',
        json: args.json
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {

            console.log("body " + body);
            callback(body);
        }
        else
            console.log('error: ' + error + ' body: ' + body);
    });
}

function getVzProfileAccountUpdateCallBack(apiresp,senderid) {
    console.log('Inside getVzProfileAccountUpdateCallBack');
    try {
        var strUserid = userData.get("UD_UserID");
        var strAuth1 = userData.get("authcode");
        var objToJson = {};
        objToJson = apiresp;
        var profileDetails = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
        console.log('Profile Details ' + JSON.stringify(profileDetails));
        var CKTID_1 = JSON.stringify(profileDetails.ProfileResponse.CKTID, null, 2)
        var regionId = JSON.stringify(profileDetails.ProfileResponse.regionId, null, 2)
        var vhoId = JSON.stringify(profileDetails.ProfileResponse.vhoId, null, 2)
        var CanNo = JSON.stringify(profileDetails.ProfileResponse.Can, null, 2)
        var VisionCustId = JSON.stringify(profileDetails.ProfileResponse.VisionCustId, null, 2)
        var VisionAcctId = JSON.stringify(profileDetails.ProfileResponse.VisionAcctId, null, 2)
        
        var args = {
            json: {
                Request: {
                    op: "FBACCOUNTLINKACTIVITY",               
                    VHOID: vhoId,
                    RegionID: regionId,
                    CircuitID: CKTID_1,
                    SenderID: senderid,
                    UserID: strUserid,
                    Authcode: strAuth1
                }
            }       
        }
        console.log('args FBACCOUNTLINKACTIVITY' + JSON.stringify(args));

        request({
            url: 'https://www25.verizon.com/fiostv/myservices/admin/botapinew.ashx',
            proxy: '',
            headers: headersInfo,
            method: 'POST',
            json: args.json
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                console.log("body " + body);
                callback(body);
            }
            else
                console.log('error: ' + error + ' body: ' + body);
        });
    }
    catch (err) {
        console.error(err);
      
    }
}

function getVzProfile(apireq,callback) { 
    console.log('Inside Verizon Profile');
	
    var struserid = ''; 
    
    if (struserid == '' || struserid == undefined) struserid='lt6sth2'; //hardcoding if its empty
    console.log('struserid '+ struserid);
        
    var headersInfo = { "Content-Type": "application/json" };
    var args = {
        "headers": headersInfo,
        "json": {Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
            Request: {ThisValue: 'GetProfile',Userid:struserid} 
        }
		
    };
    console.log('args ' + JSON.stringify(args));
    request.post("https://www.verizon.com/foryourhome/vzrepair/flowengine/restapi.ashx", args,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
             
                console.log('body ' + JSON.stringify(body));
                callback(body);
            }
            else
                console.log('error: ' + error + ' body: ' + body);
        }
    );
} 

function stationsearch(apireq,callback) { 
	console.log("srationSearch called " );
	
      var strChannelName =  apireq.result.parameters.Channel.toUpperCase();
      var strChannelNo =  apireq.result.parameters.ChannelNo;
      var strRegionid =  91629;
	
	  console.log("strChannelName " + strChannelName +" strChannelNo: "+strChannelNo);
        var headersInfo = { "Content-Type": "application/json" };
	var args = {
		"headers": headersInfo,
		"json": {Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
			 Request: {
				 ThisValue: 'StationSearch',
				 BotRegionID : strRegionid ,
				 BotstrFIOSServiceId : strChannelNo, //channel number search
				 BotstrStationCallSign:strChannelName
			 	  } 
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
  
function stationsearchCallback(apiresp,usersession) {
    var objToJson = {};
    objToJson = apiresp;
	var respobj = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
	 console.log(JSON.stringify(respobj));
	if (respobj != null && respobj.facebook != null && respobj.facebook.channels != null)
	{
	 if (respobj.facebook.channels.channel) {
           // let entries = respobj.facebook.channels.channel;
		  var entries = respobj.facebook.channels.channel;
		 console.log("entries: "+entries);
            entries.forEach((channel) => {
		     console.log("channel: "+channel);
               			sendFBMessage(usersession,  {text: channel});
		    		//usersession.send(channel);
	    			}
			   )};
	}
	else if (respobj != null && respobj.facebook != null && respobj.facebook.attachment != null)
	{	 console.log("less than 10 channels ");
		//sendFBMessage(usersession,  respobj.facebook);
	 
	 		//fix to single element array 
			if (respobj != null 
			&& respobj.facebook != null 
			&& respobj.facebook.attachment != null 
			&& respobj.facebook.attachment.payload != null 
			&& respobj.facebook.attachment.payload.elements != null) {
			try {
				var chanls = respobj.facebook.attachment.payload.elements;
				console.log ("Is array? "+ util.isArray(chanls))
						if (!util.isArray(chanls))
						{
							respobj.facebook.attachment.payload.elements = [];
							respobj.facebook.attachment.payload.elements.push(chanls);
							console.log("ProgramSearchCallBack=After=" + JSON.stringify(respobj));
						}
					 }catch (err) { console.log(err); }
			}

	 	sendFBMessage(usersession, respobj.facebook);
	 	//var msg = new builder.Message(usersession).sourceEvent(respobj);              
          	//usersession.send(msg);
	}
	else
	{
		 console.log("Sorry i dont find channel details");
		sendFBMessage(usersession,  {text: "Sorry I dont find the channel details. Can you try another."});
		
		//usersession.send("Sorry I dont find the channel details. Can you try another.");
	}
	
} 	
/*	
function stationsearch(usersession) 
{
    var cntr=0;
    var diplaytext="";
    var respobj ={"facebook":{"text":"You can watch it at ","channels":{"channel":["#-899- HBO HD","#-400- HBO","#-902- HBO 2 HD","#-402- HBO 2","#-903- HBO 2 West HD","#-403- HBO 2 West","#-908- HBO Comedy HD","#-408- HBO Comedy","#-909- HBO Comedy West HD","#-409- HBO Comedy West","#-906- HBO Family HD","#-406- HBO Family","#-907- HBO Family West HD","#-407- HBO Family West","#-912- HBO Latino HD","#-412- HBO Latino","#-913- HBO Latino West HD","#-413- HBO Latino West","#-904- HBO Signature HD","#-404- HBO Signature","#-905- HBO Signature West HD","#-405- HBO Signature West","#-901- HBO West HD","#-401- HBO West","#-910- HBO Zone HD","#-410- HBO Zone","#-911- HBO Zone West HD","#-411- HBO Zone West"]}}};
    if (respobj.facebook.channels.channel) {
        let entries = respobj.facebook.channels.channel;
        console.log("entries: "+entries);
        entries.forEach((channel) => {
            console.log("channel: "+channel);
        if(cntr==3)
        {
            sendFBMessage(usersession,  {text: diplaytext});
            cntr=0;
            diplaytext="";
        }
        else
        {
            cntr=cntr+1;
            diplaytext =diplaytext + channel;
        }
	    			
    }
			   )};
	
/*var respobj =  {"facebook":{"text":"You can watch it at#-899- HBO HD#-400- HBO#-902- HBO 2 HD#-402- HBO 2#-903- HBO 2 West HD#-403- HBO 2 West#-908- HBO Comedy HD#-408- HBO Comedy#-909- HBO Comedy West HD#-409- HBO Comedy West#-906- HBO Family HD#-406- HBO Family#-907- HBO Family West HD#-407- HBO Family West#-912- HBO Latino HD#-412- HBO Latino#-913- HBO Latino West HD#-413- HBO Latino West#-904- HBO Signature HD#-404- HBO Signature#-905- HBO Signature West HD#-405- HBO Signature West#-901- HBO West HD#-401- HBO West#-910- HBO Zone HD#-410- HBO Zone#-911- HBO Zone West HD#-411- HBO Zone West"}};
 var splittedText = splitResponse(respobj.facebook.text);
console.log ("splittedText:"+splittedText)
                 async.eachSeries(splittedText, (textPart, callback) => {
                    sendFBMessage(usersession, {text: textPart}, callback); });
        */
	
/*var respobj ={"facebook":{"text":"You can watch it at ","channels":{"channel":["#-899- HBO HD","#-400- HBO","#-902- HBO 2 HD","#-402- HBO 2","#-903- HBO 2 West HD","#-403- HBO 2 West","#-908- HBO Comedy HD","#-408- HBO Comedy","#-909- HBO Comedy West HD","#-409- HBO Comedy West","#-906- HBO Family HD","#-406- HBO Family","#-907- HBO Family West HD","#-407- HBO Family West","#-912- HBO Latino HD","#-412- HBO Latino","#-913- HBO Latino West HD","#-413- HBO Latino West","#-904- HBO Signature HD","#-404- HBO Signature","#-905- HBO Signature West HD","#-405- HBO Signature West","#-901- HBO West HD","#-401- HBO West","#-910- HBO Zone HD","#-410- HBO Zone","#-911- HBO Zone West HD","#-411- HBO Zone West"]}}};
 if (respobj.facebook.channels.channel) {
        let entries = respobj.facebook.channels.channel;
     console.log("entries: "+entries);
        entries.forEach((channel) => {
         console.log("channel: "+channel);
                sendFBMessage(usersession,  {text: channel});}
           )};

	
	
}
*/


function getVzProfileCallBack(apiresp,usersession) {
    console.log('Inside Verizon Profile Call back');
    var objToJson = {};
    objToJson = apiresp;
	
    var profileDetails = objToJson[0].Inputs.newTemp.Section.Inputs.Response;
    console.log('Profile Details ' + JSON.stringify(profileDetails));
	
    var CKTID_1 = JSON.stringify(profileDetails.ProfileResponse.CKTID, null, 2)
    var regionId = JSON.stringify(profileDetails.ProfileResponse.regionId, null, 2)
    var vhoId = JSON.stringify(profileDetails.ProfileResponse.vhoId, null, 2)
    var CanNo = JSON.stringify(profileDetails.ProfileResponse.Can, null, 2)
    var VisionCustId = JSON.stringify(profileDetails.ProfileResponse.VisionCustId, null, 2)
    var VisionAcctId = JSON.stringify(profileDetails.ProfileResponse.VisionAcctId, null, 2)
	
    console.log("CKT ID  " + CKTID_1 );
    console.log("regionId  " + regionId );
    console.log("vhoId  " + vhoId );
    console.log("CanNo  " + CanNo );
    console.log("VisionCustId  " + VisionCustId );
    console.log("VisionAcctId  " + VisionAcctId );
	
    usersession.userData.CKTID_1 = CKTID_1;
    usersession.userData.regionId = regionId;
    usersession.userData.vhoId = vhoId;
    usersession.userData.Can = CanNo;
    usersession.userData.VisionCustId = VisionCustId;
    usersession.userData.VisionAcctId = VisionAcctId;
	
    console.log("In userData Session CKT ID  " + usersession.userData.CKTID_1 );
    console.log("In userData Session regionId  " + usersession.userData.regionId );
    console.log("In userData Session vhoId  " + usersession.userData.vhoId );
    console.log("In userData Session CanNo  " + usersession.userData.Can );
    console.log("In userData Session VisionCustId  " + usersession.userData.VisionCustId );
    console.log("In userData Session VisionAcctId  " + usersession.userData.VisionAcctId );
}

//====================

app.use(bodyParser.text({ type: 'application/json' }));
app.get('/deeplink', function (req, res) {
    var cType;
    var reqUrl;
    var redirectURL;
    var contentString;
    var redirectAppStoreURL;
    var redirectPlayStoreURL;
    
    var contentType = req.query.ContentType;
    var userAgent = req.headers['user-agent'].toLowerCase();
    
    console.log("DeepLink-Started");
    console.log(req.get('User-Agent'));
    
    if (userAgent.match(/(iphone|ipod|ipad)/)) {
        console.log("iOS");
        
        cType = contentType? ((contentType == 'MOVIE')? 'MOV' : (contentType == 'SEASON')? 'SEASON' : 'TVS') :'TVS';
        
        if (req.query.fiosID) {
            
            reqUrl = "fiosID=" + req.query.fiosID + "&ContentType=" + cType;

            if (req.query.SeriesID)
                reqUrl = reqUrl + "&SeriesID=" + req.query.SeriesID;
            
            console.log("TV Listing - " + contentType);
        }
        else {
            if (cType == 'SEASON')
            {
                reqUrl = "SeriesID=" + encodeURI(req.query.SeriesID);
            }
            else
            {
                if(req.query.PID && req.query.PAID)
                    reqUrl = "PID=" + req.query.PID + "&PAID=" + req.query.PAID;
                else
                    reqUrl = "CID=" + req.query.CID + "&ContentType=" + cType;
            }
            console.log("On Demand - " + contentType);
        }
        
        redirectURL = 'vz-carbon://app/details?' + reqUrl;
        redirectAppStoreURL = "https://itunes.apple.com/us/app/verizon-fios-mobile/id406387206";
        
        console.log("Request URL = " + redirectURL);
        
        contentString = "<html><head><script type='text/javascript' charset='utf-8'>window.location = '" + redirectURL + "';  var isActive = true;  var testInterval = function () { if(isActive) { window.location='" + redirectAppStoreURL + "';} else {clearInterval(testInterval); testInterval = null;} }; window.onfocus = function () { if(!isActive) return; else {isActive = true;}}; window.onblur = function () { isActive = false; };  setInterval(testInterval, 5000); </script></head> <body> Hello </body> </html>";
    }
    else if (userAgent.match(/(android)/)) {
        console.log("Android");
        
        var now = new Date().valueOf();
        
        if (req.query.fiosID) {
            reqUrl = "/tvlistingdetail/" + req.query.fiosID;
            
            console.log("TV Listing - " + contentType);
        }
        else {
            var conType = (cType == 'MOV')? 'moviedetails':'tvepisodedetails';
            
            reqUrl = ".mm/" + conType + "/" + req.query.CID;
            
            console.log("On Demand - " + contentType);
        }
        
        redirectURL = 'app://com.verizon.fiosmobile' + reqUrl;
        redirectPlayStoreURL = "market://details?id=com.verizon.fiosmobile";
        
        console.log("Request URL = " + redirectURL);
        
        contentString = "<html><head><title></title><script type='text/javascript' charset='utf-8'> window.location = '" + redirectURL + "'; setTimeout(function () { window.location.replace('" + redirectPlayStoreURL + "'); }, 500); </script></head><body></body></html>"
    }
    else {
        console.log("WebSite");
        
        var uri = 'http://tv.verizon.com/';
        
        var callSign = req.query.CallSign;
        callSign = callSign? ((callSign.slice(-2) == 'HD')? callSign.slice(0, -2) : callSign) : '';
        
        redirectURL = req.query.IsLive? (uri + 'livetv/' + callSign) : uri;
        contentString = "<html><head><script type='text/javascript' charset='utf-8'> window.location='" + redirectURL + "'; </script></head></html>";
    }
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(contentString);
    res.end();
    
    console.log("URI = " + redirectURL);
    console.log("DeepLink-Ended");
});

//=================================
	

function accountlinking(apireq,usersession)
{
    console.log('Account Linking Button') ;
    var respobj ={"facebook":
		      {"attachment":
		       {"type":"template","payload":
			{"template_type":"generic","elements":[
				{"title":"Login to Verizon","image_url":"https://www98.verizon.com/foryourhome/vzrepair/siwizard/img/verizon-logo-200.png","buttons":[
					{"type":"account_link","url":"https://www98.verizon.com/vzssobot/upr/preauth"}]}]}}}};
    // AccountLinkDBcall(apireq,usersession);         
    sendFBMessage(usersession,  respobj.facebook);	
}

// function calls
function welcomeMsg(usersession)
{
	//var authCode = "lt6sth2"; 
   // getvzUserID(authCode, function (str) { getvzUserIDCallBack(str, event) });
    console.log("inside welcomeMsg");
    var respobj= {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":"Want to know what’s on tonight? When your favorite sports team is playing? What time your favorite show is coming on? I can answer almost anything, so try me! Before we get started—let’s take a few minutes to get me linked to your Verizon account, this way I can send you personalized recommendations, alerts.","buttons":[{"type":"postback","title":"Link Account","payload":"Link Account"},{"type":"postback","title":"Maybe later","payload":"Main Menu"}]}}}};
    console.log(JSON.stringify(respobj)); 
    sendFBMessage(usersession, {text: "Hi Welcome to Verizon"});
    sendFBMessage(usersession,  respobj.facebook);
}
	

function MainMenu(usersession)
{
    // var respobj = {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":"Are you looking for something to watch, or do you want to see more options? Type or tap below.","buttons":[{"type":"postback","title":"What's on tonight?","payload":"On Later"},{"type":"postback","title":"More Options","payload":"More Options"}]}}}};
    var respobj ={"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":"Are you looking for something to watch, or do you want to see more options? Type or tap below.","buttons":[{"type":"postback","title":"On Now","payload":"On Now"},{"type":"postback","title":"On Later","payload":"On Later"},{"type":"postback","title":"More Options","payload":"More Options"}]}}}};
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
                       { "content_type": "text", "title":"Music", "payload":"show Music shows" },
                       { "content_type": "text", "payload":"Show Sports program" , "title":"Sports"}, 
                       { "content_type": "text", "payload":"show Sci-Fi movies" , "title":"Sci-Fi"},
                       { "content_type": "text", "title":"Children & Family", "payload":"show Kids movies" }, 
                       { "content_type": "text", "title":"Action & Adventure", "payload":"show Action movies" }, 
                       { "content_type": "text", "title":"Documentary", "payload":"show Documentary movies" }, 
                       { "content_type": "text", "title":"Mystery", "payload":"show Mystery movies" }
                      // { "content_type": "text", "payload":"show categories list pageno: 1" , "title":"More Categories "}
                    ] }};
            break;
    }           
    sendFBMessage(usersession,  categlist.facebook);
	
	
} 

	
	function PgmSearch(apireq,sender,callback) 
	{ 
	 console.log("<<<Inside PgmSearch>>>");	
	 console.log("<<<sender>>>" + sender);
         var strProgram =  apireq.result.parameters.Programs;
	 var strGenre =  apireq.result.parameters.Genre;
	 var strdate =  apireq.result.parameters.date;
	 var strChannelName =  apireq.result.parameters.Channel;
	 var strFiosId =  apireq.result.parameters.FiosId;
	 var strStationId =  apireq.result.parameters.StationId;
	 var strRegionId = "";	
	
        var headersInfo = { "Content-Type": "application/json" };
	
	var args = {
		"headers": headersInfo,
		"json": {Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
			 Request: {ThisValue: 'AdvProgramSearch', //  EnhProgramSearch
				   BotProviderId :sender, //'1113342795429187',  // usersession ; sender id
				   BotstrTitleValue:strProgram, 
				   BotdtAirStartDateTime : strdate,
				   BotstrGenreRootId : strGenre,
				   BotstrStationCallSign:strChannelName,
				   BotstrFIOSRegionID : strRegionId,
				   BotstrFIOSID : strFiosId,
				   BotstrFIOSServiceId : strStationId		   
				  } 
			}
		};
		
	  console.log("args " + JSON.stringify(args));
	
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
	 console.log("subflow " + JSON.stringify(subflow));
	 logger.info("subflow-PgmSearchCallback" + subflow );
	
	//fix to single element array 
	if (subflow != null 
        && subflow.facebook != null 
        && subflow.facebook.attachment != null 
        && subflow.facebook.attachment.payload != null 
        && subflow.facebook.attachment.payload.buttons != null) {
        try {
				var pgms = subflow.facebook.attachment.payload.buttons;
		console.log ("Is array? "+ util.isArray(pgms))
				if (!util.isArray(pgms))
				{
					subflow.facebook.attachment.payload.buttons = [];
					subflow.facebook.attachment.payload.buttons.push(pgms);
					console.log("ProgramSearchCallBack=After=" + JSON.stringify(subflow));
				}
			 }catch (err) { console.log(err); }
        } 
   
	if (subflow != null 
        && subflow.facebook != null 
        && subflow.facebook.text != null && subflow.facebook.text =='UserNotFound')
	{
		console.log ("PGM Serach subflow "+ subflow.facebook.text);
		var respobj ={"facebook":{"attachment":{"type":"template","payload":{"template_type":"generic","elements":[
		{"title":"You have to Login to Verizon to proceed","image_url":"https://www98.verizon.com/foryourhome/vzrepair/siwizard/img/verizon-logo-200.png","buttons":[
			{"type":"account_link","url":"https://www98.verizon.com/vzssobot/upr/preauth"}]}]}}}};
		
		sendFBMessage(usersession,  respobj.facebook);
	}
	else
	{	
         sendFBMessage(usersession,  subflow.facebook);
	}
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
    if(chposition !=null)
        sendFBMessage(usersession,  {text:"You can watch it on channel # " + chposition});
    else
        sendFBMessage(usersession,  {text:"Sorry I don't have the details. Can you try with another. "});
} 
	
function recommendations(apireq,pgmtype,callback) { 
    console.log('inside recommendations ');
	
    var struserid = ''; 
    for (var i = 0, len = apireq.result.contexts.length; i < len; i++) {
        if (apireq.result.contexts[i].name == "sessionuserid") {
            struserid = apireq.result.contexts[i].parameters.Userid;
            console.log("original userid " + ": " + struserid);
        }
    } 	
    if (struserid == '' || struserid == undefined) struserid='lt6sth2'; //hardcoding if its empty	
    var headersInfo = { "Content-Type": "application/json" };
    var args={};
    if(pgmtype == "OnNow")
    {
        args = {
            "headers": headersInfo,
            "json": {
                Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
                Request: {
                    ThisValue:  'HydraTrending', 
                    BotPgmType :"MyDashBoard",
                    BotstrVCN:''
                }
            }
        };
    }
    else
    {
        args = {
            "headers": headersInfo,
            "json": {
                Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
                Request: {
                    ThisValue:  'HydraOnLater', 
                    Userid :struserid,
                    BotVhoId:'VHO1'
                }
            }
        };
	
    }
    console.log("args " + JSON.stringify(args));
	
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

        if (struserid == '' || struserid == undefined) struserid='lt6sth4'; //hardcoding if its empty	

        respobj= {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":"Congrats, we got your details. Tap Continue to proceed.","buttons":[{"type":"postback","title":"Continue","payload":"Userid : " + struserid + "   Regionid : 92377"}]}}}};
    }
    sendFBMessage(usersession,  respobj.facebook);
}

function RecordScenario (apiresp,sender,usersession)
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
    { STBList(apiresp,sender,function (str){ STBListCallBack(str,usersession)}); }
        /*else if (channel == 'HBOSIG') //not subscribed scenario - call to be made
			{
			  var respobj = {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":" Sorry you are not subscribed to " + channel +". Would you like to subscribe " + channel + " ?","buttons":[{"type":"postback","title":"Subscribe","payload":"Subscribe"},{"type":"postback","title":"No, I'll do it later ","payload":"Main Menu"}]}}}};	
			  sendFBMessage(usersession,  respobj.facebook);
				
			}
		else if (channel == 'CBSSN')  //DVR full scenario - call to be made
			{
			   var respobj= {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":" Sorry your DVR storage is full.  Would you like to upgrade your DVR ?","buttons":[{"type":"postback","title":"Upgrade my DVR","payload":"Upgrade my DVR"},{"type":"postback","title":"No, I'll do it later ","payload":"Main Menu"}]}}}};
			   sendFBMessage(usersession,  respobj.facebook);
			}*/
    else 
    {  //Schedule Recording
        console.log(" Channel: " + apiresp.result.parameters.Channel +" Programs: " + apiresp.result.parameters.Programs +" SelectedSTB: " + apiresp.result.parameters.SelectedSTB +" Duration: " + apiresp.result.parameters.Duration +" FiosId: " + apiresp.result.parameters.FiosId +" RegionId: " + apiresp.result.parameters.RegionId +" STBModel: " + apiresp.result.parameters.STBModel +" StationId: " + apiresp.result.parameters.StationId +" date: " + apiresp.result.parameters.date +" timeofpgm: " + apiresp.result.parameters.timeofpgm );
        DVRRecord(apiresp,function (str){ DVRRecordCallback(str,usersession)});
    }  
}


function STBList(apireq,sender,callback) { 
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
            Request: {ThisValue: 'AuthSTBList',
		       BotProviderId :sender, 
		      Userid:''} 
        }		
    };
console.log("args=" + JSON.stringify(args));
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
	console.log("STBListCresp=" + JSON.stringify(subflow));
    //fix to single element array 
    if (subflow != null 
         && subflow.facebook != null 
         && subflow.facebook.attachment != null 
         && subflow.facebook.attachment.payload != null 
         && subflow.facebook.attachment.payload.buttons != null) {
        try {
            var pgms = subflow.facebook.attachment.payload.buttons;
            console.log ("Is array? "+ util.isArray(pgms))
            if (!util.isArray(pgms))
            {
                subflow.facebook.attachment.payload.buttons = [];
                subflow.facebook.attachment.payload.buttons.push(pgms);
                console.log("STBListCallBack=After=" + JSON.stringify(subflow));
            }
        }catch (err) { console.log(err); }
    } 
    console.log("STBListCallBack=" + JSON.stringify(subflow));
	
	if (subflow != null 
        && subflow.facebook != null 
        && subflow.facebook.text != null && subflow.facebook.text =='UserNotFound')
	{
		console.log ("STBListCallBack subflow "+ subflow.facebook.text);
		var respobj ={"facebook":{"attachment":{"type":"template","payload":{"template_type":"generic","elements":[
		{"title":"You have to Login to Verizon to proceed","image_url":"https://www98.verizon.com/foryourhome/vzrepair/siwizard/img/verizon-logo-200.png","buttons":[
			{"type":"account_link","url":"https://www98.verizon.com/vzssobot/upr/preauth"}]}]}}}};		
		sendFBMessage(usersession,  respobj.facebook);
	}
	else
	{	
         sendFBMessage(usersession,  subflow.facebook);
	}
   
} 

function DVRRecord(apireq,callback) { 
	
    console.log("<<< Inside DVRRecord function >>>");
    var strUserid = ''; 
    var args ={};
    for (var i = 0, len = apireq.result.contexts.length; i < len; i++) {
        if (apireq.result.contexts[i].name == "sessionuserid") 
        {
            strUserid = apireq.result.contexts[i].parameters.Userid;
            console.log("original userid " + ": " + strUserid);
        }
    } 
    if (strUserid == '' || strUserid == undefined) strUserid='lt6sth2'; //hardcoding if its empty
		
    var strProgram =  apireq.result.parameters.Programs;
    var strChannelName =  apireq.result.parameters.Channel;
    var strGenre =  apireq.result.parameters.Genre;

    var strFiosId = apireq.result.parameters.FiosId;
    var strSeriesId = apireq.result.parameters.SeriesId;
    var strStationId =apireq.result.parameters.StationId  ;
	
    var strAirDate =apireq.result.parameters.date  ;
    var strAirTime =apireq.result.parameters.timeofpgm  ;
    var strDuration =apireq.result.parameters.Duration  ;
	
    var strRegionId =apireq.result.parameters.RegionId;
    var strSTBModel =apireq.result.parameters.STBModel  ;
    var strSTBId =apireq.result.parameters.SelectedSTB  ;	
    var strVhoId =apireq.result.parameters.VhoId  ;
    var strProviderId =apireq.result.parameters.ProviderId  ;
	
    console.log(" strUserid " + strUserid + "Recording strProgram " + strProgram + " strGenre " + strGenre + " strdate " +strAirDate + " strFiosId " +strFiosId +" strSeriesId "+ strSeriesId +" strStationId " +strStationId  +" strAirDate " + strAirDate + " strAirTime " + strAirTime+ " strSTBId " +strSTBId + " strSTBModel " +strSTBModel+" strRegionId " +strRegionId+ " strDuration " +strDuration );
	
    var headersInfo = { "Content-Type": "application/json" };
	
    if (strSeriesId !='' && strSeriesId != undefined  )
    {
        console.log ("Record Series");
        args = {
            "headers": headersInfo,
            "json": {Flow: 'TroubleShooting Flows\\Test\\APIChatBot.xml',
                Request: {ThisValue: 'DVRSeriesSchedule',  //DVRSeriesSchedule
                    Userid : strUserid,
                    BotStbId:strSTBId, 
                    BotDeviceModel : strSTBModel,
                    BotstrFIOSRegionID : '91629',
                    BotstrFIOSID:strFiosId,
                    BotstrFIOSServiceId : strSeriesId, //yes its series id
                    BotStationId : strStationId,
                    BotAirDate : strAirDate,
                    BotAirTime : strAirTime,
                    BotDuration : strDuration,
                    BotstrTitleValue: strProgram,
                    BotVhoId : strVhoId,
                    BotProviderId : strProviderId,
                    BotstrFIOSRegionID : strRegionId
                } 
            }
	
        };
    }
    else
    {
        console.log ("Record Episode");
        args = {
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
    }
	
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
        console.log( "subflow Value -----" + JSON.stringify(subflow));
        var respobj={};
        if (subflow !=null )
        {
            if (subflow != null  && subflow.facebook != null  && subflow.facebook.result != null && subflow.facebook.result.msg !=null && subflow.facebook.result.msg =="success" )
            {
                respobj = {"facebook":{"attachment":{"type":"template","payload":{"template_type":"button","text":"Good news, you have successfully scheduled this recording. Would you like to see some other TV Recommendations for tonight?","buttons":[{"type":"postback","title":"Show Recommendations","payload":"Show Recommendations"},{"type":"postback","title":"More Options","payload":"More Options"}]}}}};				
                sendFBMessage(usersession,  respobj.facebook);
            }
            else if (subflow != null  && subflow.facebook != null  && subflow.facebook.result != null && subflow.facebook.result.code != null &&  subflow.facebook.result.code == "9507")
            {
                respobj = "This Program has already been scheduled";
                sendFBMessage(usersession,  {text: respobj});
            }
            else if (subflow != null  && subflow.facebook != null  && subflow.facebook.result != null && subflow.facebook.result.code != null && subflow.facebook.result.code == "9117") //not subscribed
            {
                respobj = {"facebook":{"attachment":{"type":"template","payload":
                                    {"template_type":"button","text":" Sorry you are not subscribed to this channel. Would you like to subscribe ?","buttons":[
                                        {"type":"postback","title":"Subscribe","payload":"Subscribe"},
                                        {"type":"postback","title":"No, I'll do it later ","payload":"Main Menu"}]}}}};	
                sendFBMessage(usersession,  respobj.facebook);
            }
            else
            {				
                console.log( "Error occured in recording: ");
                if (subflow != null  && subflow.facebook != null  && subflow.facebook.result != null && subflow.facebook.result.msg != null)
                    respobj =  "I'm unable to schedule this Program now. Can you please try this later ("+subflow.facebook.result.code+" : " + subflow.facebook.result.msg +")"  ;
                else if (subflow != null  && subflow.facebook != null  && subflow.facebook.errorPage != null && subflow.facebook.errorPage.errormsg  != null)
                    respobj =  "I'm unable to schedule this Program now. Can you please try this later (" + subflow.facebook.errorPage.errormsg +")"  ;
                else
                    respobj =  "I'm unable to schedule this Program now. Can you please try this later" ;
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
        respobj = "I'm unable to schedule this Program now. Can you please try this later (" + err + ")";
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
