const request = require("request");

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
              FacebookCallbackHandler.sendMessage(this.senderID, {text: "Hey " + bodyObj.first_name + ", I can help you with various things like your student portal try 'help' or check the menu left here" });      
            }
          });
          
        }
    }
    
    messageHandler(message) {
        
    }
}

module.exports = FacebookCallbackHandler;