// md5
const md5 = require('md5');
// 加载sql模块
const sql = require('./../sql');
// 加载transaction模块
const transs = require('./../sql/transaction');
// 短信服务模块
const sms = require('./../services/sms');
// 时区
const timeZone = require('./../config').TIMEZONE;

const _release = connection => {

	connection.rollback && connection.rollback();
	connection.release && connection.release();
};

// 创建6位数字的验证码
const _createRandomCode = () => {

	var s = '';
	for (var i = 0; i < 6; i ++) {
		s = s + Math.floor(Math.random() * 10);
	}
	return s;
};

// 过滤userinfo
const _filterUserInfo = userInfo => {

	const {tel, balance, alipay, wechat} = userInfo;
	return {tel, balance, alipay, wechat};
};

const methods = {

	// 从session中获取userid
	getSessionUser: session => new Promise((resolve, reject) => {

		const userId = session.userid;
		if (userId) {
			resolve(userId);
		}
		else {
			reject({status: 1001});
		}
	}),

	// 登出
	logout: session => new Promise((resolve, reject) => {

		session.destroy(function(err) {
			if (err) {
				reject({status: 1003, desc: err});
			}
			else {
				resolve();
			}
		});
	}),

	// 登陆
	async login(tel, password, session) {

		const userInfo = await sql.users.getInfoByTel({tel});
		// 密码连续错误5次
		const tryTimes = userInfo.try_times;
		if (tryTimes >= 5) {
			return Promise.reject({status: 2009});
		}
		// 密码错误
		if (userInfo.password !== md5(password)) {
			const newTryTimes = tryTimes + 1;
			await sql.users.setTryTimes({id: userInfo.id, times: newTryTimes});
			return Promise.reject({status: 2005, wrongTimes: newTryTimes});
		}
		// 成功
		if (tryTimes > 0) {
			await sql.users.setTryTimes({id: userInfo.id, times: 0});
		}
		session.userid = userInfo.id;
		return _filterUserInfo(userInfo);
	},

	// 获取用户信息
	async getUserInfo(userId) {

		const userInfo = await sql.users.getInfoById({id: userId});
		return _filterUserInfo(userInfo);
	},

	// 注册
	async register(tel, code, password) {

		const conn = await transs.getConnection();
		try {
			const registered = await sql.users.telRegistered({conn, tel, forupdate: true});
			// 手机号已被注册
			if (registered) {
				await Promise.reject({status: 2001});
			}
			// 获取验证码id
			const codeId = await sql.code.getIdByValidCode({tel, type: '0', code, conn});
			// 将验证码置为已使用状态
			await sql.code.consumeCode({conn, id: codeId});
			// 添加新用户
			await sql.users.insert({conn, tel, password: md5(password)});
			// 提交
			await transs.commit(conn);
		}
		catch (e) {
			_release(conn);
			return Promise.reject(e);
		}
	},

	// 创建并发送注册所需的验证码
	async sendRegisterCode(tel) {

		const code = _createRandomCode();
		const registered = await sql.users.telRegistered({tel});
		if (registered) {
			return Promise.reject({status: 2001});
		}
		await sql.code.checkCanGet({tel, type: '0'});
		await sql.code.insert({tel, type: '0', code});
		await sms.sendVerifyCode(tel, code, '0');
	},

	// 修改密码
	async updatePassword(userId, oldpassword, newpassword) {

		const userInfo = await sql.users.getInfoById({id: userId});
		const tryTimes = userInfo.try_times;
		// 账号已被锁定
		if (tryTimes >= 5) {
			return Promise.reject({status: 2009});
		}
		// 密码错误
		if (md5(oldpassword) !== userInfo.password) {
			const newTryTimes = tryTimes + 1;
			await sql.users.setTryTimes({id: userId, times: newTryTimes});
			return Promise.reject({status: 2005, wrongTimes: newTryTimes});
		}
		// 修改密码
		await sql.users.updatePassword({id: userId, password: md5(newpassword)});
	},

	// 重置密码
	async resetPassword(tel, code, password) {

		const userInfo = await sql.users.getInfoByTel({tel});
		const conn = await transs.getConnection();
		try {
			// 获取验证码id
			const codeId = await sql.code.getIdByValidCode({conn, tel, type: '1', code});
			// 将验证码置为已使用状态
			await sql.code.consumeCode({conn, id: codeId});
			// 重置密码
			await sql.users.updatePassword({conn, id: userInfo.id, password: md5(password)});
			// 提交
			await transs.commit(conn);
		}
		catch(e) {
			_release(conn);
			return Promise.reject(e);
		}
	},

	// 创建并发送重置密码所需的验证码
	async sendResetCode(tel) {

		const code = _createRandomCode();
		const registered = await sql.users.telRegistered({tel});
		if (!registered) {
			await Promise.reject({status: 2002});
		}
		await sql.code.checkCanGet({tel, type: '1'});
		await sql.code.insert({tel, type: '1', code});
		await sms.sendVerifyCode(tel, code, '1');
	},

	// 设置支付宝
	async setAlipay(userid, alipay, realname, code) {

		// 获取用户手机号
		const {tel} = await sql.users.getInfoById({id: userid});
		const conn = await transs.getConnection();
		try {
			// 获取验证码id
			const codeId = await sql.code.getIdByValidCode({conn, tel, type: '2', code});
			// 将验证码置为已使用状态
			await sql.code.consumeCode({conn, id: codeId});
			// 设置支付宝
			await sql.users.setAlipay({conn, id: userid, alipay, realname});
			// 提交
			await transs.commit(conn);
		}
		catch(e) {
			_release(conn);
			return Promise.reject(e);
		}
	},

	// 创建并发送绑定支付宝所需的验证码
	async sendAlipayCode(tel) {

		const code = _createRandomCode();
		const registered = await sql.users.telRegistered({tel});
		if (!registered) {
			await Promise.reject({status: 2002});
		}
		await sql.code.checkCanGet({tel, type: '2'});
		await sql.code.insert({tel, type: '2', code});
		await sms.sendVerifyCode(tel, code, '2');
	},

	// 设置微信
	async setWechat(userid, wechat, realname, code) {

		// 获取用户手机号
		const {tel} = await sql.users.getInfoById({id: userid});
		const conn = await transs.getConnection();
		try {
			// 获取验证码id
			const codeId = await sql.code.getIdByValidCode({conn, tel, type: '3', code});
			// 将验证码置为已使用状态
			await sql.code.consumeCode({conn, id: codeId});
			// 设置微信
			await sql.users.setWechat({conn, id: userid, wechat, realname});
			// 提交
			await transs.commit(conn);
		}
		catch(e) {
			_release(conn);
			return Promise.reject(e);
		}
	},

	// 创建并发送绑定微信所需的验证码
	async sendWechatCode(tel) {

		const code = _createRandomCode();
		const registered = await sql.users.telRegistered({tel});
		if (!registered) {
			await Promise.reject({status: 2002});
		}
		await sql.code.checkCanGet({tel, type: '3'});
		await sql.code.insert({tel, type: '3', code});
		await sms.sendVerifyCode(tel, code, '3');
	},

	// 创建充值订单
	async createRecharge(userid, quota) {

		return sql.recharge.insert({userid, quota});
	},

	// 取消充值订单
	async cancelRecharge(id, userid) {

		const {user, status} = await sql.recharge.getInfo({id});
		// 状态不可取消
		if (status !== '0') {
			return Promise.reject({status: 9004});
		}
		// 用户不匹配
		if (user !== userid) {
			return Promise.reject({status: 9002});
		}
		return sql.recharge.cancel({id});
	},

	// 获取充值记录
	async getRechargeHistoryByUser(userid) {

		return sql.recharge.getListByUserid({userid});
	},

	// 查询充值订单信息
	async getRechargeInfo(rechargeid) {

		return sql.recharge.getInfo({id: rechargeid});
	},

	// 支付充值订单
	async payRecharge(rechargeId) {

		const conn = await transs.getConnection();
		try {
			// 获取充值订单信息
			const rechargeInfo = await sql.recharge.getInfo({conn, id: rechargeId, forupdate: true});
			// 订单为非待支付状态
			if (rechargeInfo.status !== '0') {
				await Promise.reject({status: 9003});
			}
			// 获取订单用户
			const userId = rechargeInfo.user;
			// 获取用户余额
			const {balance} = await sql.users.getInfoById({conn, id: userId, forupdate: true});
			// 计算用户最新余额
			const newBalance = balance + rechargeInfo.quota;
			// 更新用户余额
			await sql.users.setBalance({conn, id: userId, balance: newBalance});
			// 修改订单为已支付状态
			await sql.recharge.payed({conn, id: rechargeId});
			// 提交
			await transs.commit(conn);
		}
		catch(e) {
			_release(conn);
			return Promise.reject(e);
		}
	},

	// 获取最近一期公开游戏局
	async getLatestConfessedGame() {

		return sql.games.getLatestGameInfo();
	},

	// 获取往期记录
	async getConfessedGameHistory() {

		return sql.games.getHistory();
	},

	// 查询历史订单
	async getOrderHistoryByUser(userid) {

		return sql.orders.getHistory({userid});
	},

	// 公开局下单
	async createConfessedOrder(type, quota, userid, gameid) {

		const conn = await transs.getConnection();

		try {
			// 获取比赛信息及用户余额
			const [gameInfo, {balance}] = await Promise.all([
				sql.games.getOpenGameById({conn, id: gameid}),
				sql.users.getInfoById({conn, id: userid, forupdate: true})
			]);

			const newBalance = balance - quota;
			// 余额不足
			if (newBalance < 0) {
				await Promise.reject({status: 2003});
			}

			// 扣款
			await sql.users.setBalance({conn, id: userid, balance: newBalance});
			// 创建订单
			await sql.orders.insert({conn, type, userid, gameid, quota});
			// 更新游戏总投注金额
			let columnName, value;
			if (type === '0') {
				columnName = 'even_amount';
			}
			else {
				columnName = 'odd_amount';
			}
			value = gameInfo[columnName] + quota;
			await sql.games.updateAmount({conn, typename: columnName, amount: value, id: gameid});

			// 提交事务
			await transs.commit(conn);
		}
		catch (e) {
			_release(conn);
			return Promise.reject(e);
		}
	},

	// 提现
	async pickup(userid, quota, type) {

		const conn = await transs.getConnection();
		try {
			// 获取用户信息
			const userInfo = await sql.users.getInfoById({id: userid, forupdate: true, conn});
			// 验证今日提现次数是否已达上限(每日1次)
			const timeOffset = 8 - timeZone, today = new Date();
			// 北京时间
			today.setHours(today.getHours() + timeOffset);
			today.setHours(0);
			today.setMinutes(0);
			today.setSeconds(0);
			today.setHours(today.getHours() - timeOffset);
			if (userInfo.last_pickup_time >= today.getTime()) {
				await Promise.reject({status: 3004});
			}
			// 2%手续费
			const fees = Math.ceil(quota * 2 / 100);
			const newBalance = userInfo.balance - quota - fees;
			// 余额不足
			if (newBalance < 0) {
				await Promise.reject({status: 2003});
			}
			// 收款账号
			let pickupParams = {userid, quota, fees, conn};
			// 支付宝
			if (type === '0') {
				if (userInfo.alipay) {
					pickupParams.alipay = userInfo.alipay;
				}
				// 未绑定支付宝
				else {
					await Promise.reject({status: 6001});
				}
			}
			// 微信
			else {
				if (userInfo.wechat) {
					pickupParams.wechat = userInfo.wechat;
				}
				// 未绑定微信
				else {
					await Promise.reject({status: 6002});
				}
			}
			// 更新余额及提现时间
			await sql.users.setBalance({id: userid, balance: newBalance, pickup: true, conn});
			// 创建提现订单
			await sql.pickup.insert(pickupParams);
			// 提交
			await transs.commit(conn);
			// 返回最新余额
			return newBalance;
		}
		catch(e) {
			_release(conn);
			return Promise.reject(e);
		}
	},

	// 全部提现
	async pickupall(userid, type) {

		// 计算最大可提现数额
		const getMaxPickupValue = function(balance) {
			let max = Math.floor(balance * 98 / 100);
			while (max + Math.ceil(max * 2 / 100) <= balance) {
				max ++;
			}
			return -- max;
		};

		const conn = await transs.getConnection();
		try {
			// 获取用户信息
			const userInfo = await sql.users.getInfoById({id: userid, forupdate: true, conn});
			// 验证今日提现次数是否已达上限(每日1次)
			const timeOffset = 8 - timeZone, today = new Date();
			// 北京时间
			today.setHours(today.getHours() + timeOffset);
			today.setHours(0);
			today.setMinutes(0);
			today.setSeconds(0);
			today.setHours(today.getHours() - timeOffset);
			if (userInfo.last_pickup_time >= today.getTime()) {
				await Promise.reject({status: 3004});
			}
			// 余额不足
			const {balance} = userInfo;
			if (balance < 2) {
				await Promise.reject({status: 2003});
			}
			// 最大可提现金额
			const quota = getMaxPickupValue(balance);
			// 2%手续费
			const fees = Math.ceil(quota * 2 / 100);
			const newBalance = balance - quota - fees;
			// 收款账号
			let pickupParams = {userid, quota, fees, conn};
			// 支付宝
			if (type === '0') {
				if (userInfo.alipay) {
					pickupParams.alipay = userInfo.alipay;
				}
				// 未绑定支付宝
				else {
					await Promise.reject({status: 6001});
				}
			}
			// 微信
			else {
				if (userInfo.wechat) {
					pickupParams.wechat = userInfo.wechat;
				}
				// 未绑定微信
				else {
					await Promise.reject({status: 6002});
				}
			}
			// 更新余额及提现时间
			await sql.users.setBalance({id: userid, balance: newBalance, pickup: true, conn});
			// 创建提现订单
			await sql.pickup.insert(pickupParams);
			// 提交
			await transs.commit(conn);
			// 返回最新余额
			return newBalance;
		}
		catch(e) {
			_release(conn);
			return Promise.reject(e);
		}
	},

	// 获取提现记录
	async getPickupHistoryByUser(userid) {

		const pickupList = await sql.pickup.getListByUserid({userid});
		return pickupList;
	},

	// 取消提现订单
	async cancelPickup(userid, pickupid) {

		const conn = await transs.getConnection();
		try {
			const pickupInfo = await sql.pickup.getInfo({id: pickupid, conn});
			// 当前操作用户与订单用户不匹配
			if (pickupInfo.user !== userid) {
				await Promise.reject({status: 3002});
			}
			// 非等待处理状态
			if (pickupInfo.status !== '0') {
				await Promise.reject({status: 3003});
			}
			// 取消订单
			await sql.pickup.cancel({id: pickupid, conn});
			// 返还用户余额
			const {balance} = await sql.users.getInfoById({id: userid, forupdate: true, conn});
			const quota = pickupInfo.quota + pickupInfo.fees;
			const newBalance = balance + quota;
			await sql.users.setBalance({id: userid, balance: newBalance, conn});
			// 提交
			await transs.commit(conn);
			// 返回最新余额
			return newBalance;
		}
		catch(e) {
			_release(conn);
			return Promise.reject(e);
		}
	},

	// 删除提现订单
	async removePickup(userid, pickupid) {

		const pickupInfo = await sql.pickup.getInfo({id: pickupid});
		// 当前操作用户与订单用户不匹配
		if (pickupInfo.user !== userid) {
			return Promise.reject({status: 3002});
		}
		// 非已取消状态
		if (pickupInfo.status !== '2') {
			return Promise.reject({status: 3006});
		}
		// 取消订单
		return sql.pickup.remove({id: pickupid});
	},
};

module.exports = methods;