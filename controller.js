// 加载api模块
var api = require('./api');

/*
	状态码
	1000-成功
	1001-需要登陆
	1002-参数错误
	1003-服务器错误
	2001-用户已存在(注册)
	2002-用户不存在
	2003-用户余额不足
	2004-用户已登录(登录)
	2005-用户密码错误
	3001-订单不存在
	3002-订单已失效
	3003-订单发起人与响应人冲突
*/

var init = function(app) {

	// 登陆
	app.get('/sign', function(req, res) {

		var username = req.query.username;
		var password = req.query.password;
		if (username && password) {
			var userId = req.session.userid;
			if (userId) {
				res.send({status: 2004});
				return;
			}
			api.login(username, password, function(err, resultMap) {
				if (err) {
					res.send({status: 1003, desc: err});
				}
				else {
					if (resultMap.status === 1) {
						var userInfo = resultMap.userInfo;
						req.session.userid = userInfo.id;
						res.send({status: 1000});
					}
					else {
						res.send({status: 2005, desc: 'username or password wrong'});
					}
				}
			});
		}
		else {
			res.send({status: 1002, desc: 'username and password required'});
		}
	});

	// 注销登录
	app.get('/logout', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			delete req.session.userid;
			res.send({status: 1000});
		}
		else {
			res.send({status: 1001});
		}
	});

	// 注册
	app.get('/register', function(req, res) {

		var username = req.query.username;
		var password = req.query.password;
		var nickname = req.query.nickname;

		if (username && password && nickname) {
			api.register(username, password, nickname, function(resultMap) {
				res.send(resultMap);
			});
		}
		else {
			res.send({status: 1002, desc: 'username, password, nickname required'});
		}
	});

	// 修改密码
	app.get('/updatePassword', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			var password = req.query.password;
			if (password) {
				api.updatePassword(userId, password);
			}
			else {
				res.send({status: 1002, desc: 'password required'});
			}
		}
		else {
			res.send({status: 1001});
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

	// 查询待响应订单列表
	app.get('/getOrderListToBeResponded', function(req, res) {

		api.getOrderListToBeResponded(function(err, result) {
			if (err) {
				res.send({status: 1003, desc: err});
			}
			else {
				res.send({status: 1000, orderList: result});
			}
		});
	});

	// 查询用户订单列表
	app.get('/getOrderListByUser', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			api.getOrderListByUser(userId, function(err, result) {
				if (err) {
					res.send({status: 1003, desc: err});
				}
				else {
					res.send({status: 1000, orderList: result});
				}
			});
		}
		else {
			res.send({status: 1001});
		}
	});

	// 响应订单
	app.get('/responseOrder', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			var orderId = req.query.orderid;
			if (orderId) {
				api.responseOrder(userId, orderId, function(resultMap) {
					res.send(resultMap);
				});
			}
			else {
				res.send({status: 1002, desc: 'orderid is required'});
			}
		}
		else {
			res.send({status: 1001});
		}
	});

	// 创建订单
	app.get('/createOrder', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			var quota = parseInt(req.query.quota);
			var type = parseInt(req.query.type);
			if (quota >= 0 && (type === 0 || type === 1)) {
				api.createOrder(userId, quota, type, function(resultMap) {
					res.send(resultMap);
				});
			}
			else {
				res.send({status: 1002, desc: 'quota and type is required'});
			}
		}
		else {
			res.send({status: 1001});
		}
	});
};

module.exports = init;
