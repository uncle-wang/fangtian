const query = require('./../query');

const methods = {

	// 设置错误密码尝试登录次数
	async setTryTimes({id, times, conn}) {

		const params = [times, id];
		const selector = 'update users set try_times=? where id=?';
		return query({selector, params, conn});
	},
	// 判断手机号是否被注册
	async telRegistered({tel, forupdate, conn}) {

		const params = [tel];
		const selector = 'select id from users where tel=?' + (forupdate ? ' for update' : '');
		const result = await query({selector, params, conn});
		const [userInfo] = result;
		return userInfo ? true : false;
	},
	// 根据id获取用户信息
	async getInfoById({id, forupdate, conn}) {

		const params = [id];
		const selector = 'select * from users where id=?' + (forupdate ? ' for update' : '');
		const result = await query({selector, params, conn});
		const [userInfo] = result;
		if (userInfo) {
			return userInfo;
		}
		else {
			return Promise.reject({status: 2002});
		}
	},
	// 根据手机号获取用户信息
	async getInfoByTel({tel, conn}) {

		const params = [tel];
		const selector = 'select * from users where tel=?';
		const result = await query({selector, params, conn});
		const [userInfo] = result;
		if (userInfo) {
			return userInfo;
		}
		else {
			return Promise.reject({status: 2002});
		}
	},
	// 更新用户余额(如果是提现操作，则同时更新提现时间)
	async setBalance({id, balance, pickup, conn}) {

		let params, selector;
		if (pickup) {
			params = [Date.now(), balance, id];
			selector = 'update users set last_pickup_time=?,balance=? where id=?';
		}
		else {
			params = [balance, id];
			selector = 'update users set balance=? where id=?';
		}
		return query({selector, params, conn});
	},
	// 添加新用户
	async insert({tel, password, conn}) {

		const params = [tel, password, Date.now()];
		const selector = 'insert into users(tel,password,create_time) values(?,?,?)';
		return query({selector, params, conn});
	},
	// 修改密码
	async updatePassword({id, password, conn}) {

		const params = [password, id];
		const selector = 'update users set password=?,try_times=0 where id=?';
		return query({selector, params, conn});
	},
	// 设置支付宝账号
	async setAlipay({id, alipay, conn}) {

		const params = [alipay, id];
		const selector = 'update users set alipay=? where id=?';
		return query({selector, params, conn});
	},
	// 设置微信账号
	async setWechat({id, wechat, conn}) {

		const params = [wechat, id];
		const selector = 'update users set wechat=? where id=?';
		return query({selector, params, conn});
	},
};

module.exports = methods;
