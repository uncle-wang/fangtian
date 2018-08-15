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
app.post('/sign', (req, res) => {

	const tel = req.body.tel;
	const password = req.body.password;
	Promise.all([
		validator.phonenumber(tel),
		validator.password(password)
	]).then(() => {
		return api.login(tel, password, req.session);
	}).then((userInfo) => {
		res.send({status: 1000, userInfo});
	}).catch(err => {
		res.send(err);
	});
});

// 注销登录
app.post('/logout', (req, res) => {

	api.getSessionUser(req.session).then(() => {
		return api.logout(req.session);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 获取用户信息
app.post('/getUserInfo', (req, res) => {

	api.getSessionUser(req.session).then(api.getUserInfo).then(userInfo => {
		res.send({status: 1000, userInfo});
	}).catch(err => {
		res.send(err);
	});
});

// 注册
app.post('/register', (req, res) => {

	const tel = req.body.tel;
	const code = req.body.code;
	const password = req.body.password;
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
app.post('/sendRegisterCode', (req, res) => {

	const tel = req.body.tel;
	validator.phonenumber(tel).then(api.sendRegisterCode).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 修改密码
app.post('/updatePassword', (req, res) => {

	const oldpassword = req.body.oldpassword;
	const newpassword = req.body.newpassword;
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
app.post('/resetPassword', (req, res) => {

	const tel = req.body.tel;
	const code = req.body.code;
	const password = req.body.password;
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
app.post('/sendResetCode', (req, res) => {

	const tel = req.body.tel;
	validator.phonenumber(tel).then(api.sendResetCode).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 绑定支付宝
app.post('/setAlipay', (req, res) => {

	const {alipay, code, realname} = req.body;
	Promise.all([
		validator.alipay(alipay),
		validator.smscode(code),
		validator.realname(realname)
	]).then(() => {
		return api.getSessionUser(req.session);
	}).then(userId => {
		return api.setAlipay(userId, alipay, realname, code);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 创建并发送绑定支付宝验证码
app.post('/sendAlipayCode', (req, res) => {

	const tel = req.body.tel;
	validator.phonenumber(tel).then(api.sendAlipayCode).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 绑定微信
app.post('/setWechat', (req, res) => {

	const {wechat, code, realname} = req.body;
	Promise.all([
		validator.wechat(wechat),
		validator.smscode(code),
		validator.realname(realname)
	]).then(() => {
		return api.getSessionUser(req.session);
	}).then(userId => {
		return api.setWechat(userId, wechat, realname, code);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 创建并发送绑定微信验证码
app.post('/sendWechatCode', (req, res) => {

	const tel = req.body.tel;
	validator.phonenumber(tel).then(api.sendWechatCode).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 创建充值订单
app.post('/createRecharge', (req, res) => {

	const {quota, payment, account} = req.body;
	Promise.all([
		validator.rechargequota(quota),
		validator.payment(payment)
	]).then(() => {
		let p;
		if (payment === '0') {
			p = validator.alipay(account);
		}
		else {
			p = validator.wechat(account);
		}
		return p;
	}).then(() => {
		return api.getSessionUser(req.session);
	}).then(userid => {
		return api.createRecharge(userid, quota, payment, account);
	}).then(rechargeId => {
		res.send({status: 1000, rechargeId});
	}).catch(err => {
		res.send(err);
	});
});

// 取消充值订单
app.post('/cancelRecharge', (req, res) => {

	const {id} = req.body;
	validator.rechargeid(id).then(() => {
		return api.getSessionUser(req.session);
	}).then(userid => {
		return api.cancelRecharge(id, userid);
	}).then(() => {
		res.send({status: 1000});
	}).catch(err => {
		res.send(err);
	});
});

// 获取充值历史记录
app.post('/getRechargeHistory', (req, res) => {

	api.getSessionUser(req.session).then(api.getRechargeHistoryByUser).then(rechargeList => {
		res.send({status: 1000, rechargeList});
	}).catch(err => {
		res.send(err);
	});
});

// 对已创建充值订单计算支付签名(支付已创建订单)
app.post('/payRecharge', (req, res) => {

	const rechargeId = req.body.rechargeId;
	const redirect = req.body.redirect;
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
app.post('/getLatestConfessedGame', (req, res) => {

	api.getLatestConfessedGame().then(gameInfo => {
		res.send({status: 1000, gameInfo});
	}).catch(err => {
		res.send(err);
	});
});

// 查询往期confessed游戏
app.post('/getConfessedHistory', (req, res) => {

	api.getConfessedGameHistory().then(gameList => {
		res.send({status: 1000, gameList});
	}).catch(err => {
		res.send(err);
	});
});

// 获取历史订单
app.post('/getOrderHistory', (req, res) => {

	api.getSessionUser(req.session).then(api.getOrderHistoryByUser).then(orderList => {
		res.send({status: 1000, orderList});
	}).catch(err => {
		res.send(err);
	});
});

// confessed下单
app.post('/createOrder', (req, res) => {

	var userId = req.session.userid;
	const quota = req.body.quota, gameId = req.body.gameId, type = req.body.type;
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
app.post('/pickup', (req, res) => {

	const quota = req.body.quota;
	const type = req.body.type;
	Promise.all([
		validator.pickupquota(quota),
		validator.payment(type),
	]).then(() => {
		return api.getSessionUser(req.session);
	}).then(userId => {
		return api.pickup(userId, quota, type);
	}).then(balance => {
		res.send({status: 1000, balance});
	}).catch(err => {
		res.send(err);
	});
});

// 全部提现
app.post('/pickupall', (req, res) => {

	const type = req.body.type;
	validator.payment(type).then(() => {
		return api.getSessionUser(req.session);
	}).then(userId => {
		return api.pickupall(userId, type);
	}).then(balance => {
		res.send({status: 1000, balance});
	}).catch(err => {
		res.send(err);
	});
});

// 获取提现历史记录
app.post('/getPickupHistory', (req, res) => {

	api.getSessionUser(req.session).then(api.getPickupHistoryByUser).then(pickupList => {
		res.send({status: 1000, pickupList});
	}).catch(err => {
		res.send(err);
	});
});

// 取消提现订单
app.post('/cancelPickup', (req, res) => {

	const pickupId = req.body.id;
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
