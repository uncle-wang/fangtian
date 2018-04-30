// md5
var md5 = require('md5');
// 加载api模块
var api = require('./../apis/webApi');
// 参数格式验证
var Inspect = require('./../services/inspect');
// 加载配置文件
var PAYCONFIG = require('./../config').PAYMENT;

module.exports = function(app) {

	// 登陆
	app.get('/sign', function(req, res) {

		var username = req.query.username;
		var password = req.query.password;
		if (username && password) {
			api.login(username, password, function(resultMap) {
				if (resultMap.status === 1000) {
					var userInfo = resultMap.userInfo;
					req.session.userid = userInfo.id;
					req.session.username = userInfo.name;
					res.send({status: 1000});
				}
				else {
					res.send(resultMap);
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
			req.session.destroy(function(err) {
				if (err) {
					res.send({status: 1003, desc: err});
				}
				else {
					res.send({status: 1000});
				}
			});
		}
		else {
			res.send({status: 1001});
		}
	});

	// 获取用户信息
	app.get('/getUserInfo', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			api.getUserInfo(userId, function(resultMap) {
				res.send(resultMap);
			});
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
			var oldpassword = req.query.oldpassword;
			var newpassword = req.query.newpassword;
			if (oldpassword && newpassword) {
				api.updatePassword(userId, oldpassword, newpassword, function(resultMap) {
					if (resultMap.status === 1000) {
						req.session.destroy();
					}
					res.send(resultMap);
				});
			}
			else {
				res.send({status: 1002, desc: 'oldpassword and newpassword required'});
			}
		}
		else {
			res.send({status: 1001});
		}
	});

	// 查询密保问题(通过用户名)
	app.get('/getQuestionsByName', function(req, res) {

		var username = req.query.username;
		if (username) {
			api.getQuestionsByName(username, function(resultMap) {
				res.send(resultMap);
			});
		}
		else {
			res.send({status: 1002, desc: 'username required'});
		}
	});

	// 查询密保问题(当前已登录用户)
	app.get('/getQuestions', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			api.getQuestionsById(userId, function(resultMap) {
				res.send(resultMap);
			});
		}
		else {
			res.send({status: 1001});
		}
	});

	// 重置密码
	app.get('/resetPasswordByProtection', function(req, res) {

		var username = req.query.username;
		var password = req.query.password;
		var answA = req.query.answ_a;
		var answB = req.query.answ_b;
		var answC = req.query.answ_c;
		if (username && password && answA && answB && answC) {
			api.resetPasswordByProtection(username, password, answA, answB, answC, function(resultMap) {
				res.send(resultMap);
			});
		}
		else {
			res.send({status: 1002, desc: 'username, password, answ_a, answ_b, answ_c required'});
		}
	});

	// 设置密保问题
	app.get('/setProtection', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			var type = req.query.type;
			var oldAnswA = req.query.old_answ_a;
			var oldAnswB = req.query.old_answ_b;
			var oldAnswC = req.query.old_answ_c;
			var newQuesA = req.query.new_ques_a;
			var newQuesB = req.query.new_ques_b;
			var newQuesC = req.query.new_ques_c;
			var newAnswA = req.query.new_answ_a;
			var newAnswB = req.query.new_answ_b;
			var newAnswC = req.query.new_answ_c;
			var password = req.query.password;
			// type: 0-首次设置 1-非首次设置
			if (type !== '1' && type !== '0') {
				res.send({status: 1002, desc: 'type invalid, only 0 or 1'});
				return;
			}
			var newQuesAndAnsw = new Inspect([newQuesA, newQuesB, newQuesC, newAnswA, newAnswB, newAnswC]);
			if (!newQuesAndAnsw.lessThan16()) {
				res.send({status: 1002, desc: 'the length of questions or answers is invalid'});
				return;
			}
			// 首次设置需要验证密码
			if (type === '0') {
				if (!password) {
					res.send({status: 1002, desc: 'password required'});
					return;
				}
			}
			// 非首次设置需要验证旧答案
			else {
				var oldAnsw = new Inspect([oldAnswA, oldAnswB, oldAnswC]);
				if (!oldAnsw.lessThan16()) {
					res.send({status: 1002, desc: 'old_answ_a,old_answ_b or old_answ_c invalid'});
					return;
				}
			}
			api.setProtection(userId, req.query, function(resultMap) {
				res.send(resultMap);
			});
		}
		else {
			res.send({status: 1001});
		}
	});

	// 创建充值订单并计算支付签名
	app.get('/createRecharge', function(req, res) {

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
					var payenv = PAYCONFIG.ENVKEY;
					var orderId = payenv + '_' + resultMap.orderId;
					var orderInfo = payenv;
					var str = apiKey + apiUser + orderId + orderInfo + price + redirect + type;
					var signature = md5(str);
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

	// 获取充值历史记录
	app.get('/getRechargeHistory', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			api.getRechargeHistoryByUser(userId, function(resultMap) {
				res.send(resultMap);
			});
		}
		else {
			res.send({status: 1001});
		}
	});

	// 对已创建充值订单计算支付签名(支付已创建订单)
	app.get('/payRecharge', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			var rechargeId = req.query.rechargeId;
			var redirect = req.query.redirect;
			api.getRechargeInfo(rechargeId, function(resultMap) {
				if (resultMap.status === 0) {
					res.send({status: 1003, desc: resultMap.error});
				}
				else if (resultMap.status === 1) {
					var rechargeInfo = resultMap.rechargeInfo;
					if (rechargeInfo.user !== userId) {
						res.send({status: 3001});
						return;
					}
					var payenv = PAYCONFIG.ENVKEY;
					var apiKey = PAYCONFIG.APIKEY;
					var apiUser = PAYCONFIG.APIUSER;
					var orderId = payenv + '_' + rechargeId;
					var orderInfo = payenv;
					var price = rechargeInfo.quota.toFixed(2);
					var type = PAYCONFIG.TYPE;
					var str = apiKey + apiUser + orderId + orderInfo + price + redirect + type;
					var signature = md5(str);
					res.send({status: 1000, rechargeInfo: {
						signature: signature,
						order_info: orderInfo
					}});
				}
				else {
					res.send({status: 3001});
				}
			});
		}
		else {
			res.send({status: 1001});
		}
	});

	// 支付回调
	app.post('/payCallback', function(req, res) {

		var payenv = PAYCONFIG.ENVKEY;
		var apiKey = PAYCONFIG.APIKEY;
		var orderId = req.body.order_id;
		var ppzOrderId = req.body.ppz_order_id;
		var price = req.body.price;
		var realPrice = req.body.real_price;
		var signature = req.body.signature;
		// 校验
		if (signature === md5(apiKey + orderId + payenv + ppzOrderId + price + realPrice)) {
			price = Number(price);
			realPrice = Number(realPrice);
			// 实际支付允许0.02元的误差
			if (price - realPrice <= 0.02) {
				if (orderId.indexOf(payenv + '_') === 0) {
					var formatId = orderId.substr(payenv.length + 1);
					api.payRecharge(formatId);
				}
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

	// 查询最近一期confessed游戏
	app.get('/getLatestConfessedGame', function(req, res) {

		api.getLatestConfessedGame(function(resultMap) {
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
	app.get('/createOrder', function(req, res) {

		var userId = req.session.userid;
		var quota = parseInt(req.query.quota), gameId = req.query.gameId, type = req.query.type;
		// 未登录
		if (!userId) {
			res.send({status: 1001});
			return;
		}
		api.createConfessedOrder(type, quota, userId, gameId, function(resultMap) {
			res.send(resultMap);
		});
	});

	// 提现
	app.get('/pickup', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			var reg = /^[1-9]\d*$/;
			var quota = req.query.quota;
			if (quota) {
				if (reg.test(quota)) {
					quota = parseInt(quota);
					if (quota >= 100) {
						api.pickup(userId, quota, function(resultMap) {
							res.send(resultMap);
						});
						return;
					}
				}
			}
			res.send({status: 1002, desc: 'quota invalid'});
		}
		else {
			res.send({status: 1001});
		}
	});

	// 获取提现历史记录
	app.get('/getPickupHistory', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			api.getPickupHistoryByUser(userId, function(resultMap) {
				res.send(resultMap);
			});
		}
		else {
			res.send({status: 1001});
		}
	});

};
