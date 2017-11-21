const express    = require('express'),
      bodyParser = require('body-parser'),
      request    = require('request'),
      mongoose   = require('mongoose'),
      routes     = require('./routes');
const app = express();


mongoose.connect(process.env.DB_URL);

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(routes);



app.listen(process.env.PORT);