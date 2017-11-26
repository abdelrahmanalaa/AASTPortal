const request = require("request");
const User = require('../models/user');
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const password = 'd6F3Efeq';
const puppeteer = require('puppeteer');
const fs = require("fs");
const FormData = require('form-data');
const https = require("https");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

class FacebookCallbackHandler {
    constructor(event) {
        this.event = event;
    }
    processPostback() {
        let senderID = this.event.sender.id;
        let payload = this.event.postback.payload;
        let studentService = new StudentService();
        studentService.postbackHandler(senderID, payload);
    }
    
    processMessage(){
        let senderID = this.event.sender.id;
        let message = this.event.message;
        let studentService = new StudentService(senderID);
        studentService.messageHandler(senderID, message.text.toLowerCase().trim());
    }
    
    static sendMessage(recipientId, message){
      request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs: {access_token: 'EAAVxOKBphOQBAI4pSLYIRqoBbJJAd0fb935SIECzwhP3QOOd4tLji0wtd8ZBo6ZBdZBJTeZAlZCZAybOUW0ecZBT48SUVtbPlzEbbv13BGZBYjIvVjbs9yBeZBM66knIFgrP0RWPxduX8E2FA0KvdeA1N5V4owmlrGAFwYcIykITLGwZDZD'},
        method: "POST",
        json: {
          recipient: {id: recipientId},
          message: message,
        }
      }, function(error, response, body) {
        if (error) {
          return console.error(error);
        }
    });  
  }
  
  static sendImageMessage(recipientId, timestamp){
    var file_loc = './' + timestamp + '.png';
     var readStream = fs.createReadStream(file_loc);
     var messageData = new FormData();
     messageData.append('recipient', '{id:' +recipientId+ '}');
     messageData.append('message', '{attachment :{type:"image", payload:{}}}');
     messageData.append('filedata', readStream);
     FacebookCallbackHandler.callSendAPI(messageData, timestamp);
}
 static callSendAPI(messageData, timestamp) {
    var options = {
    method: 'post',
    host: 'graph.facebook.com',
    path: '/v2.6/me/messages?access_token=EAAVxOKBphOQBAI4pSLYIRqoBbJJAd0fb935SIECzwhP3QOOd4tLji0wtd8ZBo6ZBdZBJTeZAlZCZAybOUW0ecZBT48SUVtbPlzEbbv13BGZBYjIvVjbs9yBeZBM66knIFgrP0RWPxduX8E2FA0KvdeA1N5V4owmlrGAFwYcIykITLGwZDZD',
    headers: messageData.getHeaders()
  };
  var request = https.request(options);
  messageData.pipe(request);
  fs.unlink('./' + timestamp + '.png'), function(){
    // nothing to handle xD
  };
}
  
}

class StudentService {

    postbackHandler(senderID, payload){
        if(payload === "Greetings") {
          request({
            url: "https://graph.facebook.com/v2.6/" + senderID,
            qs: {
                      access_token: 'EAAVxOKBphOQBAI4pSLYIRqoBbJJAd0fb935SIECzwhP3QOOd4tLji0wtd8ZBo6ZBdZBJTeZAlZCZAybOUW0ecZBT48SUVtbPlzEbbv13BGZBYjIvVjbs9yBeZBM66knIFgrP0RWPxduX8E2FA0KvdeA1N5V4owmlrGAFwYcIykITLGwZDZD' ,
                      fields: "first_name"
                      },
                  method: "GET" 
          }, (error, response, body) => {
            if(!error){
              let bodyObj = JSON.parse(body);
              FacebookCallbackHandler.sendMessage(senderID, {text: "Hey " + bodyObj.first_name + ", I can help you with various things like your student portal try 'help' or check the menu left here." });      
            }
          });
          
        }
        
        if(payload === "SUBSCRIBE_PAYLOAD") {
          User.findOne({ facebook_id: senderID }, function(err, fUser){
            if(!err && fUser && fUser.statuss === "active"){
              return FacebookCallbackHandler.sendMessage(senderID, {text: "You are already subscribed."});
            }
            if(fUser && fUser.statuss === 'waiting regno'){
              return FacebookCallbackHandler.sendMessage(senderID, {text: "Please enter your registeration number."});
            }
            if(!err && !fUser){
              User.create({facebook_id: senderID,statuss: "waiting regno"}, function(err, user){
                if(!err){
                  return FacebookCallbackHandler.sendMessage(senderID, {text: "Please enter your registeration number."});
              }
            return console.error(err);
          });
          }
          if(err){
            return console.error(err);
          }

          });

        }
        
        if(payload === "UNSUBSCRIBE_PAYLOAD") {
          User.findOne({facebook_id: senderID}, function(err, user){
            if(err){
              return console.error(err);
            } else{
              if(!user){
                return FacebookCallbackHandler.sendMessage(senderID, {text: "You are not subscribed."});
              }
              else{
                User.findOneAndRemove({facebook_id: senderID}, function(err, user){
                  if(err)
                    return console.error(err);
                  return FacebookCallbackHandler.sendMessage(senderID, {text: "Done."});
                });
              }
            }
          });

        }
        
        if(payload === "RESULTS_PAYLOAD") {
        
          User.findOne({facebook_id: senderID}, function(err, user){
            
            if(!err && user && user.statuss === 'active'){
              let regno     = user.registeration_no;
              let pincode   = decrypt(user.pin_code);
             try{  (async () => {
                const browser = await puppeteer.launch({args: ['--no-sandbox']});
                const page = await browser.newPage();
                const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
                await page.goto('https://studentportal.aast.edu/', {waitUntil: 'networkidle2'});
      
                const USERNAME_SELECTOR = "#user_name";
                const PIN_SELECTOR = "#password";
                const BUTTON_SELECTOR = "#Button2";
                const RESULTS_SELECTOR = "#ctl00_ContentPlaceHolder1_ctl01_ctl04_service_color";
                
                await page.click(USERNAME_SELECTOR);
                await page.keyboard.type(regno);
                
                await page.click(PIN_SELECTOR);
                await page.keyboard.type(pincode);
                
                await page.click(BUTTON_SELECTOR);
                await page.waitForNavigation();
                await page.click(RESULTS_SELECTOR);
                const newPage = await newPagePromise;
                await newPage.waitFor(5000);
                let timestamp = new Date().valueOf();
                await newPage.screenshot({
          		    path:  timestamp + '.png',
          		    fullPage: true
          	    });
                await browser.close();
                FacebookCallbackHandler.sendImageMessage(senderID, timestamp);
          })(); }
          
          catch(err){
            FacebookCallbackHandler.sendMessage(senderID, {text: "Unfortunately, There is something wrong with your credentials, You may want to unsubscribe then subscribe again."});
          }
              
            }
            
            else {
              FacebookCallbackHandler.sendMessage(senderID, {text: "You must subscribe first."});
            }
          
          });
        }
        
        if(payload === 'SCHEDULE_PAYLOAD') {
          User.findOne({facebook_id: senderID}, function(err, fUser){
            if(err){
              return console.error(err);
            }
            
            if(!fUser){
              return FacebookCallbackHandler.sendMessage(senderID, {text: "You must subscribe first."});
            }
            
            FacebookCallbackHandler.sendMessage(senderID, {text: "One Moment, please."});
            
              let regno     = fUser.registeration_no;
              let pincode   = decrypt(fUser.pin_code);
              
              try {
                    (async () => {
                    const browser = await puppeteer.launch({args: ['--no-sandbox']});
                    const page = await browser.newPage();
                    const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
                    await page.goto('https://studentportal.aast.edu/', {waitUntil: 'networkidle2'});
          
                    const USERNAME_SELECTOR = "#user_name";
                    const PIN_SELECTOR = "#password";
                    const BUTTON_SELECTOR = "#Button2";
                    const RESULTS_SELECTOR = "#ctl00_ContentPlaceHolder1_ctl01_ctl12_service_color";
                    
                    await page.click(USERNAME_SELECTOR);
                    await page.keyboard.type(regno);
                    
                    await page.click(PIN_SELECTOR);
                    await page.keyboard.type(pincode);
                    
                    await page.click(BUTTON_SELECTOR);
                    await page.waitForNavigation();
                    await page.click(RESULTS_SELECTOR);
                    const newPage = await newPagePromise;
                    await newPage.waitFor(3000);
                    let url = newPage.url();
                    request(url, (error, response, html) => {
                        if(!error){
                            let dom = new JSDOM(html);
                            let table = dom.window.document.querySelectorAll('tbody')[3];
                            let trs = table.querySelectorAll('tr');
                            let day = new Date().getDay();
                            let tds = trs[(day+2)%7].querySelectorAll('td');
                            const periodsMap = {
                                1: 1,
                                3: 2,
                                5: 3,
                                7: 4
                            };
                    
                            let currentColumn = 1;
                            let f = 0;
                            for(let i =1 ; i < tds.length; i++){
                                if(tds[i].hasAttribute('colspan')){
                                   f=1;
                                   const courseName = tds[i].querySelector('span > span').textContent.trim();
                                   const period = periodsMap[currentColumn];
                                   currentColumn += parseInt(tds[i].getAttribute('colspan') || 1, 10);
                                   FacebookCallbackHandler.sendMessage(senderID, {text: formatSchedule(period, courseName)});
                                    
                               } else{
                                   currentColumn += 1;
                               }
                             if(i === tds.length - 1 && !f) {
                               FacebookCallbackHandler.sendMessage(senderID, {text: "Fortunately, You are free today! Enjoy :D"});
                             }   
                            }
                        }
                    });
                    await browser.close();
                    
              })();
              }
              
              catch(err){
                FacebookCallbackHandler.sendMessage(senderID, {text: "Unfortunately, There is something wrong with your credentials, You may want to unsubscribe then subscribe again."});
              }
            
          });
        }
    }
    
    messageHandler(senderID, message) {
      if(!message.is_echo){
        if(message === 'help'){
          return FacebookCallbackHandler.sendMessage(senderID, {text: "I am a chatbot that helps you easily check your results or schedule only with one click!."});
        }
         User.findOne({facebook_id: senderID}, function(err, user){
          if(!err && user){
            if(user.statuss === "waiting pin code"){
              user.pin_code = encrypt(message);
              user.statuss = "active";
              user.save();
              FacebookCallbackHandler.sendMessage(senderID, {text: "Done, now you can query for your current semester results or your current day schedule from the menu."});
            }
            
            if(user.statuss === "waiting regno"){
              FacebookCallbackHandler.sendMessage(senderID, {text: "Please enter your pin code."});
              user.registeration_no = message;
              user.statuss = "waiting pin code";
              user.save();
            }
            
          }
          if(!user || user.statuss === "active"){
            FacebookCallbackHandler.sendMessage(senderID, {text: "Sorry, I don't understand you. try 'help' or check the menu."});
          }
        });
        
    }
}
}

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password);
  var crypted = cipher.update(text,'utf8','hex');
  crypted += cipher.final('hex');
  return crypted;
}
 
function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,password);
  var dec = decipher.update(text,'hex','utf8');
  dec += decipher.final('utf8');
  return dec;
}

function formatSchedule(p, text){
  text = text.replace(/\s\s+/g, ' ');
  return p + " - " + text;
}

module.exports = FacebookCallbackHandler;
//