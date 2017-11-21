const express = require('express');
var FacebookCallbackHandler = require("../handler");
const router = express.Router();

router.get("/webhook", function (req, res) {
  if (req.query["hub.verify_token"] === process.env.VTOKEN) {
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
      entry.messaging.forEach(function(event) {
        var facebookHandler = new FacebookCallbackHandler(event);
        if (event.postback) {
          facebookHandler.processPostback();
        }
        if(event.message) {
          facebookHandler.processMessage();
        }
      });
    });

    res.sendStatus(200);
  }
});

module.exports = router;