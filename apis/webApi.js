// md5
const md5 = require('md5');
// 加载sql模块
const {pool, trans, tables, transs} = require('./../sql');
// 短信服务模块
const sms = require('./../services/sms');
// 时区
const timeZone = require('./../config').TIMEZONE;

const _release = connection => {

	connection.rollback && connection.rollback();
	connection.release && connection.release();
};

// 密码连续错误次数+1
var _setTryTimes = function(userid, times, callback) {

	pool.query('update users set try_times=' + times + ' where id=' + userid, function(errB, resultB) {
		if (errB) {
			callback({status: 1003, desc: errB});
			return;
		}
		callback({status: 2005, wrongTimes: times});
	});
};

// 创建6位数字的验证码
const _createRandomCode = () => {

	var s = '';
	for (var i = 0; i < 6; i ++) {
		s = s + Math.floor(Math.random() * 10);
	}
	return s;
};

// 登陆 1-成功 0-用户不存在 2-密码错误
const login = async (tel, password) => {

	const userInfo = await tables.users.getUserByTel(pool, tel);
	// 密码连续错误5次
	const tryTimes = userInfo.try_times;
	if (tryTimes >= 5) {
		return Promise.reject({status: 2009});
	}
	// 密码错误
	if (userInfo.password !== md5(password)) {
		const newTryTimes = tryTimes + 1;
		await tables.users.setTryTimes(pool, userInfo.id, newTryTimes);
		return Promise.reject({status: 2005, wrongTimes: newTryTimes});
	}
	// 成功
	if (tryTimes > 0) {
		await tables.users.setTryTimes(pool, userInfo.id, 0);
	}
	return userInfo;
};

// 获取用户信息
const getUserInfo = async userId => {

	return await tables.users.getUserById(pool, userId);
};

// 注册 1-成功 0-数据库异常
const register = async (tel, code, password) => {

	const conn = await transs.getConnection();
	try {
		const telAvailable = await tables.users.telRegisterAvailable(conn, tel);
		// 手机号已被注册
		if (!telAvailable) {
			await Promise.reject({status: 2001});
		}
		// 获取验证码id
		const codeId = await tables.code.getIdByValidCode(conn, tel, 0, code);
		// 将验证码置为已使用状态
		await tables.code.consumeCode(conn, codeId);
		// 添加新用户
		await tables.users.insert(conn, tel, md5(password));
		// 提交
		await transs.commit(conn);
	}
	catch (e) {
		_release(conn);
		return Promise.reject(e);
	}
};

// 创建并发送注册所需的验证码
const sendRegisterCode = async tel => {

	const code = _createRandomCode();
	const registered = await tables.users.telRegistered(pool, tel);
	if (registered) {
		return Promise.reject({status: 2001});
	}
	await tables.code.checkCanGet(pool, tel, 0);
	await tables.code.insert(pool, tel, 0, code);
	await sms.sendVerifyCode(tel, code, 0);
};

// 修改密码
const updatePassword = async (userId, oldpassword, newpassword) => {

	const userInfo = await tables.users.getPwdAndTrytimesById(pool, userId);
	const tryTimes = userInfo.try_times;
	// 账号已被锁定
	if (tryTimes >= 5) {
		return Promise.reject({status: 2009});
	}
	// 密码错误
	if (md5(oldpassword) !== userInfo.password) {
		const newTryTimes = tryTimes + 1;
		await tables.users.setTryTimes(pool, userId, newTryTimes);
		return Promise.reject({status: 2005, wrongTimes: newTryTimes});
	}
	// 修改密码
	await tables.users.updatePassword(pool, userId, md5(newpassword));
};

// 重置密码
const resetPassword = async (tel, code, password) => {

	const userInfo = await tables.users.getUserByTel(pool, tel);
	const conn = await transs.getConnection();
	try {
		// 获取验证码id
		const codeId = await tables.code.getIdByValidCode(conn, tel, 1, code);
		// 将验证码置为已使用状态
		await tables.code.consumeCode(conn, codeId);
		// 重置密码
		await tables.users.updatePassword(conn, userInfo.id, md5(password));
		// 提交
		await transs.commit(conn);
	}
	catch(e) {
		_release(conn);
		return Promise.reject(e);
	}
};

// 创建并发送重置密码所需的验证码
const sendResetCode = async tel => {

	const code = _createRandomCode();
	const registered = await tables.users.telRegistered(pool, tel);
	if (!registered) {
		await Promise.reject({status: 2002});
	}
	await tables.code.checkCanGet(pool, tel, 1);
	await tables.code.insert(pool, tel, 1, code);
	await sms.sendVerifyCode(tel, code, 1);
};

// 设置支付宝
const setAlipay = async (userid, alipay, code) => {

	// 获取用户手机号
	const tel = await tables.users.getTelById(pool, userid);
	const conn = await transs.getConnection();
	try {
		// 获取验证码id
		const codeId = await tables.code.getIdByValidCode(conn, tel, 2, code);
		// 将验证码置为已使用状态
		await tables.code.consumeCode(conn, codeId);
		// 设置支付宝
		await tables.users.setAlipay(conn, userid, alipay);
		// 提交
		await transs.commit(conn);
	}
	catch(e) {
		_release(conn);
		return Promise.reject(e);
	}
};

// 创建并发送绑定支付宝所需的验证码
const sendAlipayCode = async userid => {

	const code = _createRandomCode();
	const registered = await tables.users.telRegistered(pool, tel);
	if (!registered) {
		await Promise.reject({status: 2002});
	}
	await tables.code.checkCanGet(pool, tel, 2);
	await tables.code.insert(pool, tel, 2, code);
	await sms.sendVerifyCode(tel, code, 2);
};

// 创建充值订单
const createRecharge = async (userid, quota) => {

	const rechargeId = await tables.recharge.insert(pool, userid, quota);
	return rechargeId;
};

// 获取充值记录
const getRechargeHistoryByUser = async userid => {

	const history = await tables.recharge.getHistoryByUserid(pool, userid);
	return history;
};

// 查询充值订单信息
const getRechargeInfo = async rechargeid => {

	const rechargeInfo = await tables.recharge.getInfo(pool, rechargeid);
	return rechargeInfo;
};

// 支付充值订单
const payRecharge = rechargeId => {

	const conn = transs.getConnection();
	try {
		// 获取充值订单信息
		const rechargeInfo = await tables.recharge.getInfo(conn, rechargeId, true);
		// 订单为非待支付状态
		if (rechargeInfo.status !== '0') {
			await Promise.reject({status: 9003});
		}
		// 获取订单用户
		const userId = rechargeInfo.user;
		// 获取用户余额
		const balance = await tables.users.getBalanceForUpdate(conn, userId);
		// 计算用户最新余额
		const newBalance = balance + rechargeInfo.quota;
		// 更新用户余额
		await tables.users.setBalance(conn, userId, newBalance);
		// 修改订单为已支付状态
		await tables.recharge.payed(conn, rechargeId);
		// 提交
		await transs.commit(conn);
	}
	catch(e) {
		_release(conn);
		return Promise.reject(e);
	}
};

// 获取最近一期公开游戏局
const getLatestConfessedGame = async () => {

	const gameInfo = await tables.games.getLatestGameInfo(pool);
	return gameInfo;
};

// 获取往期记录
const getConfessedGameHistory = async () => {

	const history = await tables.games.getHistory(pool);
	return history;
};

// 查询历史订单
var getOrderHistoryByUser = function(userid, callback) {

	pool.query('select * from confessed_orders where user=' + userid + ' order by create_time desc', function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		callback({status: 1000, orderList: result});
	});
};

// 公开局下单
const createConfessedOrder = async (type, quota, userid, gameid) => {

	const conn = await transs.getConnection();

	try {
		// 获取比赛信息及用户余额
		const [gameInfo, balance] = await Promise.all([
			tables.games.getOpenGameById(conn, gameid),
			tables.users.getBalanceForUpdate(conn, userid)
		]);

		const newBalance = balance - quota;
		// 余额不足
		if (newBalance < 0) {
			await Promise.reject({status: 2003});
		}

		// 扣款
		await tables.users.setBalance(conn, userid, newBalance);
		// 创建订单
		await tables.orders.insert(conn, type, userid, gameid, quota);
		// 更新游戏总投注金额
		let columnName, value;
		if (type === '0') {
			columnName = 'even_amount';
		}
		else {
			columnName = 'odd_amount';
		}
		value = gameInfo[columnName] + quota;
		await tables.games.updateAmount(conn, columnName, value, gameid);

		// 提交事务
		await transs.commit(conn);
	}
	catch (e) {
		_release(conn);
		return Promise.reject(e);
	}
};

// 提现
var pickup = function(userid, quota, alipay, callback) {

	trans(function(transerr, conn) {
		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		conn.query('select balance,last_pickup_time from users where id=' + userid + ' for update', function(errA, resultA) {
			if (errA) {
				_release(conn);
				callback({status: 1003, desc: errA});
				return;
			}
			// 用户不存在
			var userInfo = resultA[0];
			if (!userInfo) {
				_release(conn);
				callback({status: 2002});
				return;
			}

			// 验证今日提现次数是否已达上限(每日1次)
			var lastPickupTime = userInfo.last_pickup_time;
			var timeOffset = 8 - timeZone, today = new Date();
			// 北京时间
			today.setHours(today.getHours() + timeOffset);
			// 今日0点
			today.setHours(0);
			today.setMinutes(0);
			today.setSeconds(0);
			today.setHours(today.getHours() - timeOffset);
			// 如果上次提现时间比北京时间今日0点晚，则不允许提现
			if (lastPickupTime >= today.getTime()) {
				_release(conn);
				callback({status: 3004});
				return;
			}

			var balance = userInfo.balance;
			// 手续费
			var fees = Math.ceil(quota * 2 / 100);
			var newBalance = balance - quota - fees;
			// 余额不足
			if (newBalance < 0) {
				_release(conn);
				callback({status: 2003});
				return;
			}
			// 扣款
			var newPickupTimeStr = _updatePickupTime(lastPickupStr);
			conn.query('update users set balance=' + newBalance + ',last_pickup_time="' + newPickupTimeStr + '" where id=' + userid, function(errB, resultB) {
				if (errB) {
					_release(conn);
					callback({status: 1003, desc: errB});
					return;
				}
				// 创建提现订单
				conn.query('insert into pickup(user,alipay,quota,fees,create_time) values(' + userid + ',"' + alipay + '",' + quota + ',' + fees + ',' + Date.now() + ')', function(errC, resultC) {
					if (errC) {
						_release(conn);
						callback({status: 1003, desc: errC});
						return;
					}
					conn.commit(function(comerr) {
						if (comerr) {
							_release(conn);
							callback({status: 1003, desc: comerr});
							return;
						}
						conn.release();
						callback({status: 1000, newBalance: newBalance});
						return;
					});
				});
			});
		});
	});
};

// 获取提现记录
var getPickupHistoryByUser = function(userid, callback) {

	pool.query('select * from pickup where user=' + userid + ' order by create_time desc', function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		callback({status: 1000, pickupList: result});
	});
};

// 取消提现订单
var cancelPickup = function(userid, pickupid, callback) {

	trans(function(transerr, conn) {
		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		conn.query('select * from pickup where id=' + pickupid + ' for update', function(errA, resultA) {
			if (errA) {
				_release(conn);
				callback({status: 1003, desc: errA});
				return;
			}
			var pickupInfo = resultA[0];
			// 订单不存在
			if (!pickupInfo) {
				_release(conn);
				callback({status: 3001});
				return;
			}
			// 当前操作用户与创建订单用户不匹配
			if (pickupInfo.user !== userid) {
				_release(conn);
				callback({status: 3002});
				return;
			}
			// 非等待处理状态
			if (pickupInfo.status !== '0') {
				_release(conn);
				callback({status: 3003});
				return;
			}
			// 删除订单
			conn.query('update pickup set status="2" where id=' + pickupid, function(errB, resultB) {
				if (errB) {
					_release(conn);
					callback({status: 1003, desc: errB});
					return;
				}
				// 返还余额
				var quota = pickupInfo.quota + pickupInfo.fees;
				conn.query('select balance from users where id=' + userid + ' for update', function(errC, resultC) {
					if (errC) {
						_release(conn);
						callback({status: 1003, desc: errC});
						return;
					}
					var userInfo = resultC[0];
					if (!userInfo) {
						_release(conn);
						callback({status: 2002});
						return;
					}
					var balance = userInfo.balance;
					conn.query('update users set balance=' + (balance + quota) + ' where id=' + userid, function(errD, resultD) {
						if (errD) {
							_release(conn);
							callback({status: 1003, desc: errD});
							return;
						}
						conn.commit(function(comerr) {
							if (comerr) {
								_release(conn);
								callback({status: 1003, desc: comerr});
								return;
							}
							conn.release();
							callback({status: 1000});
							return;
						});
					});
				});
			});
		});
	});
};

module.exports = {

	login: login,
	getUserInfo: getUserInfo,
	register: register,
	sendRegisterCode: sendRegisterCode,
	updatePassword: updatePassword,
	resetPassword: resetPassword,
	sendResetCode: sendResetCode,
	setAlipay: setAlipay,
	sendAlipayCode: sendAlipayCode,
	createRecharge: createRecharge,
	getRechargeHistoryByUser: getRechargeHistoryByUser,
	getRechargeInfo: getRechargeInfo,
	payRecharge: payRecharge,
	getLatestConfessedGame: getLatestConfessedGame,
	getConfessedGameHistory: getConfessedGameHistory,
	getOrderHistoryByUser: getOrderHistoryByUser,
	createConfessedOrder: createConfessedOrder,
	pickup: pickup,
	getPickupHistoryByUser: getPickupHistoryByUser,
	cancelPickup: cancelPickup
};
