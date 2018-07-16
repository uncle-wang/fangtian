const query = require('./../query');

const methods = {

	// 设置错误密码尝试登录次数
	async setTryTimes({id, times, conn}) {

		const selector = 'update users set try_times=' + times + ' where id=' + userid;
		return query(selector, conn);
	},
	// 判断手机号是否被注册
	async telRegistered({tel, forupdate, conn}) {

		const selector = 'select id from users where tel="' + tel + '"' + (forupdate ? ' for update' : '');
		const result = await query(selector, conn);
		const [userInfo] = result;
		return userInfo ? true : false;
	},
	// 根据id获取用户信息
	async getInfoById({id, forupdate, conn}) {

		const selector = 'select * from users where id=' + id + (forupdate ? ' for update' : '');
		const result = await query(selector, conn);
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

		const selector = 'select * from users where tel="' + tel + '"';
		const result = await query(selector, conn);
		const [userInfo] = result;
		if (userInfo) {
			return userInfo;
		}
		else {
			return Promise.reject({status: 2002});
		}
	},
	// 更新用户余额
	async setBalance({id, balance, conn}) {

		const selector = 'update users set balance=' + balance + ' where id=' + id;
		return query(selector, conn);
	},
	// 添加新用户
	async insert({tel, password, conn}) {

		const nowStamp = Date.now();
		const selector = 'insert into users(tel,password,create_time) values("' + tel + '","' + password + '",' + nowStamp + ')';
		return query(selector, conn);
	},
	// 修改密码
	async updatePassword({id, password, conn}) {

		const selector = 'update users set password="' + password + '",try_times=0 where id="' + id + '"';
		return query(selector, conn);
	},
	// 设置支付宝账号
	async setAlipay({id, alipay, conn}) {

		const selector = 'update users set alipay="' + alipay + '" where id=' + id;
		return query(selector, conn);
	},
};

module.exports = methods;
