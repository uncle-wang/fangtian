// 加载api模块
var api = require('./api');

/*
	状态码
	1000-成功
	1001-需要登陆
	1002-参数错误
	1003-服务器错误
	2001-用户已存在(注册)
	2002-用户名或密码错误(登陆)
*/

var init = function(app) {

	// 注册
	app.get('/register', function(req, res) {

		var username = req.query.username;
		var password = req.query.password;
		var nickname = req.query.nickname;

		if (username && password && nickname) {
			// 验证用户名是否已存在
			api.userExist(username, function(err, exist) {
				if (err) {
					res.send({status: 1003, desc: err});
				}
				else {
					if (exist) {
						res.send({status: 2001, desc: '用户已存在'});
					}
					else {
						api.createUser(username, password, nickname, function(err, result) {
							if (!err && result.status === 1000) {
								res.send({status: 1000, userId: result.userId});
							}
							else {
								res.send({status: 1003, desc: err});
							}
						});
					}
				}
			});
		}
		else {
			res.send({status: 1002, desc: 'username, password, nickname required'});
		}
	});

	// 验证用户名是否已存在
	app.get('/checkUserExist', function(req, res) {

		var username = req.query.username;
		if (username) {
			api.userExist(username, function(err, exist) {
				if (err) {
					res.send({status: 1003, desc: err});
				}
				else {
					res.send({status: 1000, exist: exist});
				}
			});
		}
		else {
			res.send({status: 1002, desc: 'username required'});
		}
	});

	// 登陆
	app.get('/sign', function(req, res) {

		var username = req.query.username;
		var password = req.query.password;
		if (username && password) {
			api.login(username, password, function(err, resultMap) {
				if (err) {
					res.send({status: 1003, desc: err});
				}
				else {
					if (resultMap.status === 1000) {
						var userInfo = resultMap.userInfo;
						req.session.userid = userInfo.id;
						res.send({status: 1000});
					}
					else {
						res.send({status: 2002, desc: 'username or password wrong'});
					}
				}
			});
		}
		else {
			res.send({status: 1002, desc: 'username and password required'});
		}
	});

	// 创建订单
	app.get('/createOrder', function(req, res) {

		if (req.session.userid) {
			
		}
		else {
			res.send({status: 1001});
		}
	});
};

module.exports = init;
