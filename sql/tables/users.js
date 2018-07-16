const query = require('./../query');

const methods = {

	// 设置错误密码尝试登录次数
	setTryTimes: (conn, userid, times) => {

		const selector = 'update users set try_times=' + times + ' where id=' + userid;
		return query(conn, selector);
	},
	// 根据手机号获取用户信息
	getUserByTel: (conn, tel) => {

		const selector = 'select * from users where tel="' + tel + '"';
		return query(conn, selector).then(result => {
			return new Promise((resolve, reject) => {
				const [userInfo] = result;
				if (userInfo) {
					resolve(userInfo);
				}
				else {
					reject({status: 2002});
				}
			});
		});
	},
	// 根据userid获取手机号
	getTelById: (conn, id) => {

		const selector = 'select tel from users where id=' + id;
		return query(conn, selector).then(result => {
			return Promise((resolve, reject) => {
				const [userInfo] = result;
				if (userInfo) {
					resolve(userInfo.tel);
				}
				else {
					reject({status: 2002});
				}
			});
		});
	},
	// 判断手机号是否被注册
	telRegistered: (conn, tel) => {

		const selector = 'select id from users where tel="' + tel + '"';
		return query(conn, selector).then(result => {
			return new Promise((resolve, reject) => {
				const [userInfo] = result;
				if (userInfo) {
					resolve(true);
				}
				else {
					resolve(false);
				}
			});
		});
	},
	// 手机号可以被注册
	telRegisterAvailable: (conn, tel) => {

		const selector = 'select id from users where tel="' + tel + '" for update';
		return query(conn, selector).then(result => {
			return new Promise((resolve, reject) => {
				const [userInfo] = result;
				if (userInfo) {
					resolve(false);
				}
				else {
					resolve(true);
				}
			});
		});
	},
	// 根据id获取用户信息
	getUserById: (conn, id) => {

		const selector = 'select tel,balance,alipay from users where id=' + id;
		return query(conn, selector).then(result => {
			return new Promise((resolve, reject) => {
				const [userInfo] = result;
				if (userInfo) {
					resolve(userInfo);
				}
				else {
					reject({status: 2002});
				}
			});
		});
	},
	// 查询用户余额并等待编辑
	getBalanceForUpdate: (conn, userid) => {

		const selector = 'select balance from users where id=' + userid + ' for update';
		return query(conn, selector).then(result => {
			return new Promise((resolve, reject) => {
				const [userInfo] = result;
				if (userInfo) {
					resolve(userInfo.balance);
				}
				else {
					reject({status: 2002});
				}
			});
		});
	},
	// 更新用户余额
	setBalance: (conn, userid, balance) => {

		const selector = 'update users set balance=' + balance + ' where id=' + userid;
		return query(conn, selector);
	},
	// 添加新用户
	insert: (conn, tel, password) => {

		const nowStamp = Date.now();
		const selector = 'insert into users(tel,password,create_time) values("' + tel + '","' + password + '",' + nowStamp + ')';
		return query(conn, selector);
	},
	// 根据id获取用户密码和try_times
	getPwdAndTrytimesById: (conn, id) => {

		const selector = 'select password,try_times from users where id=' + id;
		return query(conn, selector).then(result => {
			return new Promise((resolve, reject) => {
				const [userInfo] = result;
				if (userInfo) {
					resolve(userInfo);
				}
				else {
					reject({status: 2002});
				}
			});
		});
	},
	// 修改密码
	updatePassword: (conn, id, password) => {

		const selector = 'update users set password="' + password + '",try_times=0 where id="' + id + '"';
		return query(conn, selector);
	},
	// 设置支付宝账号
	setAlipay: (conn, id, alipay) => {

		const selector = 'update users set alipay="' + alipay + '" where id=' + id;
		return query(conn, selector);
	},
};

module.exports = methods;
