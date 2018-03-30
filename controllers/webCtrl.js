// 加载api模块
var api = require('./../api');

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

module.exports = function(app) {

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
					if (resultMap.status === 1) {
						var userInfo = resultMap.userInfo;
						req.session.userid = userInfo.id;
						req.session.username = userInfo.name;
						req.session.balance = userInfo.balance;
						res.send({status: 1000});
						api.updateLastLoginTime(userInfo.id);
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
			delete req.session.username;
			delete req.session.balance;
			res.send({status: 1000});
		}
		else {
			res.send({status: 1001});
		}
	});

	// 获取登录信息
	app.get('/getLoginStatus', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			api.getUserInfo(userId, function(resultMap) {
				if (resultMap.status === 1) {
					res.send({status: 1000, signed: true, info: resultMap.info});
				}
				else {
					if (resultMap.status === 0) {
						res.send({status: 1003, desc: resultMap.err});
					}
					else {
						res.send({status: 2002});
					}
				}
			});
		}
		else {
			res.send({status: 1000, signed: false});
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
		var username = req.session.username;
		if (userId && username) {
			api.getOrderListByUser(username, function(err, result) {
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
		var username = req.session.username;
		if (userId && username) {
			var orderId = req.query.orderid;
			if (orderId) {
				api.responseOrder(userId, username, orderId, function(resultMap) {
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
