// md5
var md5 = require('md5');
// 加载api模块
var api = require('./../apis/webApi');
// 参数格式验证
var Inspect = require('./../services/inspect');
// 短息服务模块
var sms = require('./../services/sms');
// 加载配置文件
var PAYCONFIG = require('./../config').PAYMENT;

module.exports = function(app) {

	// 登陆
	app.get('/sign', function(req, res) {

		var tel = req.query.tel;
		var password = req.query.password;
		if (tel && password) {
			api.login(tel, password, function(resultMap) {
				if (resultMap.status === 1000) {
					var userInfo = resultMap.userInfo;
					req.session.userid = userInfo.id;
					req.session.tel = userInfo.tel;
					res.send({status: 1000});
				}
				else {
					res.send(resultMap);
				}
			});
		}
		else {
			res.send({status: 1002, desc: 'tel and password required'});
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

		var tel = req.query.tel;
		var code = req.query.code;
		var password = req.query.password;
		var nickname = req.query.nickname;

		if (tel && code && password && nickname) {
			api.register(tel, code, password, nickname, function(resultMap) {
				res.send(resultMap);
			});
		}
		else {
			res.send({status: 1002, desc: 'tel, code, password, nickname required'});
		}
	});

	// 创建并发送注册验证码
	app.get('/sendRegisterCode', function(req, res) {

		var tel = req.query.tel;
		var reg = /^1\d{10}$/;
		if (tel) {
			if (reg.test(tel)) {
				api.sendRegisterCode(tel, function(resultMap) {
					res.send(resultMap);
				});
			}
			else {
				res.send({status: 1002, desc: 'tel invalid'});
			}
		}
		else {
			res.send({status: 1002, desc: 'tel required'});
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

	// 重置密码
	app.get('/resetPassword', function(req, res) {

		var tel = req.query.tel;
		var code = req.query.code;
		var password = req.query.password;
		if (tel && code && password) {
			api.resetPassword(tel, code, password, function(resultMap) {
				res.send(resultMap);
			});
		}
		else {
			res.send({status: 1002, desc: 'tel, code, password required'});
		}
	});

	// 创建并发送重置密码验证码
	app.get('/sendResetCode', function(req, res) {

		var tel = req.query.tel;
		var reg = /^1\d{10}$/;
		if (tel) {
			if (reg.test(tel)) {
				api.sendResetCode(tel, function(resultMap) {
					res.send(resultMap);
				});
			}
			else {
				res.send({status: 1002, desc: 'tel invalid'});
			}
		}
		else {
			res.send({status: 1002, desc: 'tel required'});
		}
	});

	// 绑定支付宝
	app.get('/setAlipay', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			var alipay = req.query.alipay;
			var code = req.query.code;
			if (alipay && code) {
				api.setAlipay(userId, alipay, code, function(resultMap) {
					res.send(resultMap);
				});
			}
			else {
				res.send({status: 1002, desc: 'alipay and code required'});
			}
		}
		else {
			res.send({status: 1001});
		}
	});

	// 创建并发送绑定支付宝验证码
	app.get('/sendAlipayCode', function(req, res) {

		var userId = req.session.userid;
		if (userId) {
			api.sendAlipayCode(userId, function(resultMap) {
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
			var alipay = req.query.alipay;
			if (quota && alipay) {
				if (reg.test(quota)) {
					quota = parseInt(quota);
					if (quota >= 100) {
						api.pickup(userId, quota, alipay, function(resultMap) {
							res.send(resultMap);
						});
						return;
					}
				}
			}
			res.send({status: 1002, desc: 'quota and alipay invalid'});
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

	// 取消提现订单
	app.get('/cancelPickup', function(req, res) {

		var userId = req.session.userid;
		var pickupId = req.query.id;
		if (userId) {
			if (pickupId) {
				api.cancelPickup(userId, pickupId, function(resultMap) {
					res.send(resultMap);
				});
			}
			else {
				res.send({status: 1002, desc: 'id required'});;
			}
		}
		else {
			res.send({status: 1001});
		}
	});

};
