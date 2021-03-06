const request = require("request");
const User = require('../models/user');
const config = require('../config');
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const password = 'd6F3Efeq';
const puppeteer = require('puppeteer');
const fs = require("fs");
const FormData = require('form-data');
const https = require("https");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const async = require('async');

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
        studentService.messageHandler(senderID, message);
    }
    
    static sendMessage(recipientId, message, cb){
      
      request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs: {access_token: config.access_token},
        method: "POST",
        json: {
          recipient: {id: recipientId},
          message: message,
        }
      }, function(error, response, body) {
        if (error) {
          return console.error(error);
        }
        if(cb){
          cb();
        }
    });  
  }
  
  static sendImageMessage(recipientId){
     var file_loc = './' + recipientId + '.png';
     var readStream = fs.createReadStream(file_loc);
     var messageData = new FormData();
     messageData.append('recipient', '{id:' +recipientId+ '}');
     messageData.append('message', '{attachment :{type:"image", payload:{}}}');
     messageData.append('filedata', readStream);
     var options = {
     method: 'post',
     host: 'graph.facebook.com',
     path: '/v2.6/me/messages?access_token=' + config.access_token,
     headers: messageData.getHeaders()
    };
    var request = https.request(options);
    messageData.pipe(request);
    fs.unlink('./' + recipientId + '.png', function(){
      
    });
 }
}

class StudentService {

    postbackHandler(senderID, payload){
        if(payload === "Greetings") {
          request({
            url: "https://graph.facebook.com/v2.6/" + senderID,
            qs: {
                      access_token: config.access_token,
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
              return FacebookCallbackHandler.sendMessage(senderID, {text: "Please enter your registration number."});
            }
            if(!err && !fUser){
              User.create({facebook_id: senderID,statuss: "waiting regno"}, function(err, user){
                if(!err){
                  return FacebookCallbackHandler.sendMessage(senderID, {text: "Please enter your registration number."});
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
          getResults(senderID);
        }
        
        if(payload === 'SCHEDULE_PAYLOAD') {
            getSchedule(senderID);
        }
    }
    
    messageHandler(senderID, message) {
      if(!message.is_echo){
      
        const greeting = firstEntity(message.nlp, 'greetings');
        const thx = firstEntity(message.nlp, 'thanks');
        const bye = firstEntity(message.nlp, 'bye');
        
        if (greeting && greeting.confidence > 0.8) {
            return FacebookCallbackHandler.sendMessage(senderID, {text: 'Hi there!'});
        } 
        
        if(thx && thx.confidence > 0.8) {
          return FacebookCallbackHandler.sendMessage(senderID, {text: 'You are always welcome :)'});
        }
        
        if(bye && bye.confidence > 0.8) {
          return FacebookCallbackHandler.sendMessage(senderID, {text: "Goodbye!"});
        }
        
        if(message.text.toLowerCase().trim() === 'results'){
          getResults(senderID);
        }
        if(message.text.toLowerCase().trim() === 'schedule'){
          getSchedule(senderID);
        }
        if(message.text.toLowerCase().trim() === 'help'){
          return FacebookCallbackHandler.sendMessage(senderID, {text: "I am a chatbot that helps you easily check your results or schedule only with one click!."});
        }
         User.findOne({facebook_id: senderID}, function(err, user){
          if(!err && user){
            if(user.statuss === "waiting pin code"){
              user.pin_code = encrypt(message.text.toLowerCase().trim());
              user.statuss = "active";
              user.save();
             return  FacebookCallbackHandler.sendMessage(senderID, {text: "Done, now you can query for your current semester results or your current day schedule from the menu."});
            }
            
            if(user.statuss === "waiting regno"){
              if(/^\d+$/.test(message.text.toLowerCase().trim()) && message.text.toLowerCase().trim().length === 8){ 
              FacebookCallbackHandler.sendMessage(senderID, {text: "Please enter your pin code."});
              user.registeration_no = message.text.toLowerCase().trim();
              user.statuss = "waiting pin code";
              user.save();
             }
            
              else{
                FacebookCallbackHandler.sendMessage(senderID, {text: "Invalid, Please enter your regitration number correctly!."});
              }
            }
          }
        });
        
    }
}
}

async function getResults(senderID){
          User.findOne({facebook_id: senderID}, function(err, user){
            
            if(!err && user && user.statuss === 'active'){
              let regno     = user.registeration_no;
              let pincode   = decrypt(user.pin_code);
              FacebookCallbackHandler.sendMessage(senderID, {text: "One Moment, please."});
               (async () => {
                const browser = await puppeteer.launch({args: ['--no-sandbox']});
                const page = await browser.newPage();
                const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
                await page.goto('https://studentportal.aast.edu/', {waitUntil: 'networkidle2'});
      
                const USERNAME_SELECTOR = "#user_name";
                const PIN_SELECTOR = "#password";
                const BUTTON_SELECTOR = "#Button2";
                const RESULTS_SELECTOR = "#ctl00_ContentPlaceHolder1_ctl01_ctl05_service_image";
                
                await page.click(USERNAME_SELECTOR);
                await page.keyboard.type(regno);
                
                await page.click(PIN_SELECTOR);
                await page.keyboard.type(pincode);
                
                await page.click(BUTTON_SELECTOR);
                try{
                     await page.waitForNavigation();
                   } catch(err){
                    return FacebookCallbackHandler.sendMessage(senderID, {text: "Unfortunately, There is something wrong with your credentials, You may have to unsubscribe and subscribe again."});
                   }
                await page.click(RESULTS_SELECTOR);
                const newPage = await newPagePromise;
                await newPage.waitFor(4000);
                await newPage.screenshot({
          		    path:  senderID + '.png',
          		    fullPage: true
          	    });
                await browser.close();
                FacebookCallbackHandler.sendImageMessage(senderID);
          })(); 
              
            }
            
            else {
              FacebookCallbackHandler.sendMessage(senderID, {text: "You must subscribe first."});
            }
          
          });
  
}

async function getSchedule(senderID){
          User.findOne({facebook_id: senderID}, function(err, fUser){
            if(err){
              return console.error(err);
            }
            
            if(!fUser){
              return FacebookCallbackHandler.sendMessage(senderID, {text: "You must subscribe first."});
            }
            let day = new Date().getDay();
            if(day === 5) {
              return FacebookCallbackHandler.sendMessage(senderID, {text: "Fortunately, You are free today! Enjoy. :D"});
            }
            FacebookCallbackHandler.sendMessage(senderID, {text: "One Moment, please."});
            
              let regno     = fUser.registeration_no;
              let pincode   = decrypt(fUser.pin_code);
              
              
                    (async () => {
                    const browser = await puppeteer.launch({args: ['--no-sandbox']});
                    const page = await browser.newPage();
                    const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
                    await page.goto('https://studentportal.aast.edu/', {waitUntil: 'networkidle2'});
          
                    const USERNAME_SELECTOR = "#user_name";
                    const PIN_SELECTOR = "#password";
                    const BUTTON_SELECTOR = "#Button2";
                    const SCHEDULE_SELECTOR = "#ctl00_ContentPlaceHolder1_ctl01_ctl13_service_color";
                    
                    
                    await page.click(USERNAME_SELECTOR);
                    await page.keyboard.type(regno);
                    
                    await page.click(PIN_SELECTOR);
                    await page.keyboard.type(pincode);
                    
                    await page.click(BUTTON_SELECTOR);
                   try{
                     await page.waitForNavigation();
                   } catch(err){
                     return FacebookCallbackHandler.sendMessage(senderID, {text: "Unfortunately, There is something wrong with your credentials, You may have to unsubscribe and subscribe again."});
                   }
                    await page.click(SCHEDULE_SELECTOR);
                    const newPage = await newPagePromise;
                    let url = newPage.url();
                    
                    request(url, (error, response, html) => {
                        if(!error){
                            let dom = new JSDOM(html);
                            let table = dom.window.document.querySelectorAll('tbody')[3];
                            let trs = table.querySelectorAll('tr');
                            var pos = [];
                            if(trs.length > 8) {
                              var offset = trs.length - 8;
                              for(let i=1; i<trs.length; i++){
                                if(trs[i].querySelectorAll('td').length <= offset){
                                  pos.push(i);
                                }
                              }
                            }
                            
                            if(!pos.length || (day+2)%7 < pos[0]){
                              
                              var tds = trs[(day+2)%7].querySelectorAll('td');
                              
                            }
                            
                            
                            
                            else{
                                var tds = trs[((day+2)%7)+offset].querySelectorAll('td');
                                 
                            }
                            
                            
                            const periodsMap = {
                                1: 1,
                                3: 2,
                                5: 3,
                                7: 4
                            };
                          
                            let currentColumn = 1;
                            let f = 0;
                            let periods = {};
                           
                            for(let i =1 ; i < tds.length; i++){
                                if(tds[i].hasAttribute('colspan')){
                                   f=1;
                                   const courseName = tds[i].querySelector('span > span').textContent.trim();
                                   const period = periodsMap[currentColumn];
                                   periods[period] = courseName;
                                   currentColumn += parseInt(tds[i].getAttribute('colspan') || 1, 10);
                                    
                               } else{
                                   currentColumn += 1;
                               }
                             if(i === tds.length - 1 && !f) {
                               FacebookCallbackHandler.sendMessage(senderID, {text: "Fortunately, You are free today! Enjoy. :D"});
                             }
                            }
                            
                            
                              
                            
                            
                            if(f){
                              async.timesSeries(Object.keys(periods).length, sendSchedule, finished);
                              function sendSchedule(n, next){
                                FacebookCallbackHandler.sendMessage(senderID, {text: formatSchedule(Object.keys(periods)[n],periods[Object.keys(periods)[n]])}, function(){
                                  next();
                                });
                              }
                              function finished(){
                                
                              }
                            }
                            
                            
                            
                        }
                    });
                    await browser.close();
                    
              })();
              
              
              
            
          });  
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

function firstEntity(nlp, name) {
  return nlp && nlp.entities && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}

module.exports = FacebookCallbackHandler;



