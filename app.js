const express    = require('express'),
      bodyParser = require('body-parser'),
      request    = require('request'),
      mongoose   = require('mongoose'),
      routes     = require('./routes');

const app = express();


mongoose.connect('mongodb://belly:belly@ds113736.mlab.com:13736/aast_portal');


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(routes);



app.listen(process.env.PORT);