const request = require("request");
const User = require('../models/user');
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const password = 'd6F3Efeq';

class FacebookCallbackHandler {
    constructor(event) {
        this.event = event;
    }
    processPostback() {
        let senderID = this.event.sender.id;
        let payload = this.event.postback.payload;
        let studentService = new StudentService(senderID);
        studentService.postbackHandler(payload);
    }
    
    processMessage(){
        let senderID = this.event.sender.id;
        let message = this.event.message;
        let studentService = new StudentService(senderID);
        studentService.messageHandler(message.text.toLowerCase().trim());
    }
    
    static sendMessage(recipientId, message){
      request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
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
}

class StudentService {
    constructor(senderID){
        this.senderID = senderID;
    }
    postbackHandler(payload){
        if(payload === "Greetings") {
          request({
            url: "https://graph.facebook.com/v2.6/" + this.senderID,
            qs: {
                      access_token: process.env.PAGE_ACCESS_TOKEN,
                      fields: "first_name"
                      },
                  method: "GET" 
          }, (error, response, body) => {
            if(!error){
              let bodyObj = JSON.parse(body);
              FacebookCallbackHandler.sendMessage(this.senderID, {text: "Hey " + bodyObj.first_name + ", I can help you with various things like your student portal try 'help' or check the menu left here." });      
            }
          });
          
        }
        
        if(payload === "SUBSCRIBE_PAYLOAD") {
          User.findOne({facebook: this.senderID}, function(err, fUser){
            if(!err && fUser.statuss === "active"){
              return FacebookCallbackHandler.sendMessage(this.senderID, {text: "You are already subscribed"});
            }
          User.create({facebook_id: this.senderID,status: "waiting regno"}, function(err, user){
            if(!err){
              return FacebookCallbackHandler.sendMessage(this.senderID, {text: "Please enter your registeration number"});
            }
            return console.error(err);
          });
          });

        }
        
    }
    
    messageHandler(message) {

        if(/^\d+$/.test(message)) {
         User.findOne({facebook_id: this.senderID}, function(err, user){
          if(!err){
            if(user.statuss === "waiting regno"){
              FacebookCallbackHandler.sendMessage(this.senderID, {text: "Please enter your pin code"});
              user.registeration_no = message;
              user.statuss = "waiting pin code";
              user.save();
            }
            if(user.statuss === "waiting pin code"){
              user.pin_code = encrypt(message);
              user.statuss = "active";
              user.save();
            }
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

module.exports = FacebookCallbackHandler;

