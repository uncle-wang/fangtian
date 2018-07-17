const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const secret = require('./config').SESSIONSECRET;

app.disable('x-powered-by');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
	secret: secret,
	resave: true,
	saveUninitialized: true
}));

module.exports = app;
