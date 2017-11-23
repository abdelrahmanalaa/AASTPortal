const express    = require('express'),
      bodyParser = require('body-parser'),
      mongoose   = require('mongoose'),
      routes     = require('./routes');

const app = express();


mongoose.connect('mongodb://belly:belly@ds113736.mlab.com:13736/aast_portal');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


app.use(routes);



app.listen(process.env.PORT);