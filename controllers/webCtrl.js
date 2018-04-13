var crypto = require('crypto');
// 加载api模块
var api = require('./../api');
// 加载配置文件
var PAYCONFIG = require('./../config').PAYMENT;

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
	4001-游戏不存在
	4002-游戏已封盘
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

	// 计算支付签名
	app.get('/getSignature', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			var apiKey = PAYCONFIG.APIKEY;
			var apiUser = PAYCONFIG.APIUSER;
			var type = PAYCONFIG.TYPE;
			var price = req.query.price;
			var redirect = req.query.redirect;
			var quota = parseInt(price);
			api.createRecharge(userId, quota, function(resultMap) {
				if (resultMap.status === 1) {
					var orderId = resultMap.orderId;
					var orderInfo = PAYCONFIG.CALLBACKKEY;
					var md5 = crypto.createHash('md5');
					var str = apiKey + apiUser + orderId + orderInfo + price + redirect + type;
					md5.update(str);
					var signature = md5.digest('hex');
					res.send({status: 1000, payInfo: {
						order_id: orderId,
						order_info: orderInfo,
						signature: signature
					}});
				}
				else {
					res.send({status: 1003, desc: resultMap.error});
				}
			});
		}
		else {
			res.send({status: 1001});
		}
	});

	// 支付回调
	app.post('/payCallback', function(req, res) {

		var apiKey = PAYCONFIG.APIKEY;
		var orderId = req.body.order_id;
		var ppzOrderId = req.body.ppz_order_id;
		var price = req.body.price;
		var realPrice = req.body.real_price;
		var signature = req.body.signature;
		// 校验
		var md5 = crypto.createHash('md5');
		md5.update(apiKey + orderId + PAYCONFIG.CALLBACKKEY + ppzOrderId + price + realPrice);
		if (signature === md5.digest('hex')) {
			price = Number(price);
			realPrice = Number(realPrice);
			// 实际支付允许0.02元的误差
			if (price - realPrice <= 0.02) {
				api.payRecharge(orderId);
			}
		}
		res.send({status: 1000});
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

	// 查询当期confessed游戏
	app.get('/getOpenConfessedGame', function(req, res) {

		api.getCurrentConfessedGame(function(resultMap) {
			res.send(resultMap);
		});
	});

	// 查询往期confessed游戏
	app.get('/getConfessedHistory', function(req, res) {

		api.getConfessedGameHistory(function(resultMap) {
			res.send(resultMap);
		});
	});

	// 获取历史订单
	app.get('/getOrderHistory', function(req, res) {

		var userId = req.session.userid;
		// 未登录
		if (!userId) {
			res.send({status: 1001});
			return;
		}
		api.getOrderHistoryByUser(userId, function(resultMap) {
			res.send(resultMap);
		});
	});

	// confessed下单
	app.get('/buyConfessed', function(req, res) {

		var userId = req.session.userid;
		var quota = parseInt(req.query.quota), gameId = req.query.gameId, type = req.query.type;
		// 未登录
		if (!userId) {
			res.send({status: 1001});
			return;
		}
		api.createConfessedOrder(type, quota, userId, gameId, function(resultMap) {
			var status = resultMap.status;
			if (status === 1) {
				res.send({status: 1000});
			}
			else if (status === 2) {
				res.send({status: 4001});
			}
			else if (status === 3) {
				res.send({status: 4002});
			}
			else if (status === 4) {
				res.send({status: 2002});
			}
			else if (status == 5) {
				res.send({status: 2003});
			}
			else {
				res.send({status: 1003, desc: resultMap.error});
			}
		});
	});

};
