const request = require("request");

class FacebookCallbackHandler {
    constructor(event) {
        this.event = event;
    }
    processPostback() {
        let senderID = this.event.sender.id;
        let payload = this.event.postback.payload;
        let StudentService = new StudentService(senderID);
        StudentService.postbackHandler(payload);
    }
    
    processMessage(){
        let senderID = this.event.sender.id;
        let message = this.event.message;
        let StudentService = new StudentService(senderID);
        StudentService.messageHandler(message.text.toLowerCase().trim());
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
          console.error("Error sending message: " + response.error);
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
          FacebookCallbackHandler.sendMessage(this.senderID, {text: "Hello dude"});
        }
    }
    
    messageHandler(message) {
        
    }
}

module.exports = FacebookCallbackHandler;