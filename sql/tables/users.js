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
	// 查询用户余额并等待编辑
	getBalance: (conn, userid) => {

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
};

module.exports = methods;
