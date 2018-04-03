var express = require('express');
var session = require('express-session');
var app = express();

app.use(session({
	secret: 'fangtian game',
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
