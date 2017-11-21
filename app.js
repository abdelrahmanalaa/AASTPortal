const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const mongoose = require('mongoose');
const config = require('./config');
const app = express();
const routes = require('./routes');
app.use(bodyParser.urlencoded({extend: false}));
app.use(bodyParser.json());
mongoose.connect(process.env.DBURL);

app.use(routes);

app.listen(process.env.PORT);