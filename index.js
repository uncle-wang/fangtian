var express = require('express');
var app = express();

app.get('/test', function(req, res) {

	res.send({aa: 'bb'});
});

app.use(function(req, res) {

	res.send({code: 2000, desc: 'api not found'});
});

app.listen(6932, function() {

	console.log('STARTAPP');
});