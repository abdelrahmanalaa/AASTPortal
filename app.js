const express    = require('express'),
      bodyParser = require('body-parser'),
      request    = require('request'),
      mongoose   = require('mongoose');

const app = express();
const routes = require('./routes');

mongoose.connect(process.env.DBURL);

app.use(bodyParser.urlencoded({extend: false}));
app.use(bodyParser.json());
app.use(routes);



app.listen(process.env.PORT);