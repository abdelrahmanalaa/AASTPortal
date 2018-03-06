const express    = require('express'),
      bodyParser = require('body-parser'),
      mongoose   = require('mongoose'),
      routes     = require('./routes'),
      config     = require("./config");
      
const app = express();


mongoose.connect(config.db_url);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


app.use(routes);



app.listen(process.env.PORT || 5000);