var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var secret = require('./config').SESSIONSECRET;
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
	secret: secret,
	resave: true,
	saveUninitialized: true
}));

// 加载controller
require('./controllers')(app);
// 加载schedule任务
require('./schedules');

app.use(function(req, res) {

	res.status(404).send('api not found');
});

app.listen(6932, function() {

	console.log('STARTAPP');
});
