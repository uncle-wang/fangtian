// md5
var md5 = require('md5');
// 加载api模块
var api = require('./../apis/webApi');
// 加载配置文件
var PAYCONFIG = require('./../config').PAYMENT;
// 参数校验模块
const validator = require('./../validator');

const app = require('./../app');

// 登陆
app.get('/sign', (req, res) => {

	const username = req.query.username;
	const password = req.query.password;
	Promise.all([
		validator.phonenumber(username),
		validator.password(password)
	]).then(() => {
		return api.login(username, password, req.session);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 注销登录
app.get('/logout', (req, res) => {

	api.getSessionUser(req.session).then(() => {
		return api.logout(req.session);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 获取用户信息
app.get('/getUserInfo', (req, res) => {

	api.getSessionUser(req.session).then(api.getUserInfo).then(userInfo => {
		res.send({status: 1000, userInfo});
	}).catch(err => {
		res.send(err);
	});
});

// 注册
app.get('/register', (req, res) => {

	const tel = req.query.tel;
	const code = req.query.code;
	const password = req.query.password;
	Promise.all([
		validator.phonenumber(tel),
		validator.smscode(code),
		validator.password(password)
	]).then(() => {
		return api.register(tel, code, password);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 创建并发送注册验证码
app.get('/sendRegisterCode', (req, res) => {

	const tel = req.query.tel;
	validator.phonenumber(tel).then(() => {
		return api.sendRegisterCode(tel);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 修改密码
app.get('/updatePassword', (req, res) => {

	const oldpassword = req.query.oldpassword;
	const newpassword = req.query.newpassword;
	Promise.all([
		validator.password(oldpassword),
		validator.password(newpassword)
	]).then(() => {
		return api.getSessionUser(req.session);
	}).then(userId => {
		return api.updatePassword(userId, oldpassword, newpassword);
	}).then(() => {
		return api.logout(req.session);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 重置密码
app.get('/resetPassword', (req, res) => {

	const tel = req.query.tel;
	const code = req.query.code;
	const password = req.query.password;
	Promise.all([
		validator.phonenumber(tel),
		validator.smscode(code),
		validator.password(password)
	]).then(() => {
		return api.resetPassword(tel, code, password);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 创建并发送重置密码验证码
app.get('/sendResetCode', (req, res) => {

	const tel = req.query.tel;
	validator.phonenumber(tel).then(() => {
		return api.sendResetCode(tel);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 绑定支付宝
app.get('/setAlipay', (req, res) => {

	const alipay = req.query.alipay;
	const code = req.query.code;
	Promise.all([
		validator.alipay(alipay),
		validator.smscode(code)
	]).then(() => {
		return api.setAlipay(userId, alipay, code);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 创建并发送绑定支付宝验证码
app.get('/sendAlipayCode', (req, res) => {

	api.getSessionUser(req.session).then(api.sendAlipayCode).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 绑定微信
app.get('/setWechat', (req, res) => {

	const wechat = req.query.wechat;
	const code = req.query.code;
	Promise.all([
		validator.wechat(wechat),
		validator.smscode(code)
	]).then(() => {
		return api.setWechat(userId, wechat, code);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 创建并发送绑定微信验证码
app.get('/sendWechatCode', (req, res) => {

	api.getSessionUser(req.session).then(api.sendWechatCode).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 创建充值订单并计算支付签名
app.get('/createRecharge', (req, res) => {

	const quota = req.query.quota;
	const redirect = req.query.redirect;
	Promise.all([
		validator.rechargequota(quota),
		validator.redirect(redirect)
	]).then(() => {
		return api.getSessionUser(req.session);
	}).then(userId => {
		const apiKey = PAYCONFIG.APIKEY;
		const apiUser = PAYCONFIG.APIUSER;
		const type = PAYCONFIG.TYPE;
		return api.createRecharge(userId, parseInt(quota));
	}).then(rechargeId => {
		const payenv = PAYCONFIG.ENVKEY;
		const orderId = payenv + '_' + rechargeId;
		const str = apiKey + apiUser + orderId + payenv + quota + redirect + type;
		const signature = md5(str);
		res.send({status: 1000, payInfo: {
			order_id: orderId,
			order_info: payenv,
			signature
		}});
	}).catch(err => {
		res.send(err);
	});
});

// 获取充值历史记录
app.get('/getRechargeHistory', (req, res) => {

	api.getSessionUser(req.session).then(api.getRechargeHistoryByUser).then(rechargeList => {
		res.send({status: 1000, rechargeList});
	}).catch(err => {
		res.send(err);
	});
});

// 对已创建充值订单计算支付签名(支付已创建订单)
app.get('/payRecharge', (req, res) => {

	const rechargeId = req.query.rechargeId;
	const redirect = req.query.redirect;
	Promise.all([
		validator.rechargeid(rechargeId),
		validator.redirect(redirect)
	]).then(() => {
		return api.getSessionUser(req,session);
	}).then(userId => {
		return api.getRechargeInfo(rechargeId).then(rechargeInfo => {
			if (rechargeInfo.user !== userId) {
				return Promise.reject({status: 9002});
			}
			const payenv = PAYCONFIG.ENVKEY;
			const apiKey = PAYCONFIG.APIKEY;
			const apiUser = PAYCONFIG.APIUSER;
			const orderId = payenv + '_' + rechargeId;
			const price = rechargeInfo.quota.toFixed(2);
			const type = PAYCONFIG.TYPE;
			const str = apiKey + apiUser + orderId + payenv + price + redirect + type;
			const signature = md5(str);
			res.send({status: 1000, rechargeInfo: {
				order_info: payenv,
				signature
			}});
		}).catch(err => {
			res.send(err);
		});
	});
});

// 支付回调
app.post('/payCallback', (req, res) => {

	const payenv = PAYCONFIG.ENVKEY;
	const apiKey = PAYCONFIG.APIKEY;
	const orderId = req.body.order_id;
	const ppzOrderId = req.body.ppz_order_id;
	const price = req.body.price;
	const realPrice = req.body.real_price;
	const signature = req.body.signature;
	// 校验
	if (signature === md5(apiKey + orderId + payenv + ppzOrderId + price + realPrice)) {
		// 实际支付允许0.02元的误差
		if (Number(price) - Number(realPrice) <= 0.02) {
			if (orderId.indexOf(payenv + '_') === 0) {
				const formatId = orderId.substr(payenv.length + 1);
				api.payRecharge(formatId);
			}
		}
	}
	res.send({status: 1000});
});

// 查询最近一期confessed游戏
app.get('/getLatestConfessedGame', (req, res) => {

	api.getLatestConfessedGame().then(gameInfo => {
		res.send({status: 1000, gameInfo});
	}).catch(err => {
		res.send(err);
	});
});

// 查询往期confessed游戏
app.get('/getConfessedHistory', (req, res) => {

	api.getConfessedGameHistory().then(gameList => {
		res.send({status: 1000, gameList});
	}).catch(err => {
		res.send(err);
	});
});

// 获取历史订单
app.get('/getOrderHistory', (req, res) => {

	api.getSessionUser(req.session).then(api.getOrderHistoryByUser).then(orderList => {
		res.send({status: 1000, orderList});
	}).catch(err => {
		res.send(err);
	});
});

// confessed下单
app.get('/createOrder', (req, res) => {

	var userId = req.session.userid;
	const quota = req.query.quota, gameId = req.query.gameId, type = req.query.type;
	Promise.all([
		validator.orderquota(quota),
		validator.gameid(gameId),
		validator.ordertype(type)
	]).then(() => {
		return api.getSessionUser(req.session);
	}).then(userId => {
		return api.createConfessedOrder(type, parseInt(quota), userId, gameId);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 提现
app.get('/pickup', (req, res) => {

	const quota = req.query.quota;
	const type = req.query.type;
	Promise.all([
		validator.pickupquota(quota),
		validator.payment(type),
	]).then(() => {
		return api.getSessionUser(req.session);
	}).then(userId => {
		return api.pickup(userId, quota, type);
	}).then(newBalance => {
		res.send({status: 1000, newBalance});
	}).catch(err => {
		res.send(err);
	});
});

// 获取提现历史记录
app.get('/getPickupHistory', (req, res) => {

	api.getSessionUser(req.session).then(api.getPickupHistoryByUser).then(pickupList => {
		res.send({status: 1000, pickupList});
	}).catch(err => {
		res.send(err);
	});
});

// 取消提现订单
app.get('/cancelPickup', (req, res) => {

	const pickupId = req.query.id;
	validator.pickupid(pickupId).then(() => {
		return api.getSessionUser(req.session);
	}).then(userId => {
		api.cancelPickup(userId, pickupId);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});
