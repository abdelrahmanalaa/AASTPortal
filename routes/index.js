const express = require('express');
const FacebookCallbackHandler = require("../handler");
const router = express.Router();

router.get("/webhook", function (req, res) {
  if (req.query["hub.verify_token"] === 'stayawayfromme') {
    console.log("Verified webhook");
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.error("Verification failed. The tokens do not match.");
    res.sendStatus(403);
  }
});

router.post("/webhook", function (req, res) {
  if (req.body.object == "page") {
    req.body.entry.forEach(function(entry) {
      if(entry.messaging)
      entry.messaging.forEach(function(event) {
        var facebookHandler = new FacebookCallbackHandler(event);
        if (event.postback) {
          facebookHandler.processPostback();
        }
        if(event.message.text) {
          facebookHandler.processMessage();
        }
      });
    });

    res.sendStatus(200);
  }
});

module.exports = router;

//