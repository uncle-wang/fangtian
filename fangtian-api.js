const app = require('./app');

// 加载控制器
require('./controllers');

app.use(function(req, res) {

	res.status(404).send('api not found');
});

app.listen(6932, function() {

	console.log('STARTAPP');
});
