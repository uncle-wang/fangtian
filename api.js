// md5
var md5 = require('md5');
// 加载sql模块
var sql = require('./sql');

// 验证用户名是否已存在
var userExist = function(username, callback) {

	sql.query('select id from USERS where name="' + username + '"', function(err, result) {
		if (err) {
			callback(err);
		}
		else {
			callback(null, result.length >= 1);
		}
	});
};

// 注册 1-成功 0-数据库异常
var createUser = function(username, password, nickname, callback) {

	// 创建新用户
	sql.query('insert into USERS(name,password,nick) values("' + username + '","' + md5(password) + '","' + nickname + '")', function(err, result) {
		if (err) {
			callback(err);
		}
		else {
			if (result.affectedRows === 1) {
				callback(null, {status: 1, userId: result.insertId});
			}
			else {
				callback(null, {status: 0});
			}
		}
	});
};

// 登陆 1-成功 0-用户名或密码错误
var login = function(username, password, callback) {

	sql.query('select * from USERS where name="' + username + '"', function(err, results) {
		if (err) {
			callback(err);
		}
		else {
			if (results.length < 1) {
				callback(null, {status: 0});
			}
			else {
				var result = results[0];
				if (result.password !== md5(password)) {
					callback(null, {status: 0});
				}
				else {
					callback(null, {status: 1, userInfo: result});
				}
			}
		}
	});
};

// 响应订单 0-sql错误 1-成功 2-订单不存在 3-订单已失效 4-用户不存在 5-用户余额不足
var responseOrder = function(userId, orderId, callback) {

	sql.trans(function(transerr, trans) {

		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		// 查询该订单并加排他锁
		trans.query('select * from RT_ORDERS where id=' + orderId + ' for update', function(ordererr, result) {
			if (ordererr) {
				trans.rollback();
				callback({status: 1003, desc: ordererr});
				return;
			}
			// 订单不存在
			if (result.length < 1) {
				trans.rollback();
				callback({status: 3001});
				return;
			}
			var orderInfo = result[0];
			// 订单已失效
			if (orderInfo.status !== '1') {
				trans.rollback();
				callback({status: 3002});
				return;
			}
			trans.commit();
			var quota = orderInfo.quota;
			// 查询用户余额并加排他锁
			trans.query('select blc_available,blc_frozen from USERS where id=' + userId + ' for update', function(usererr, result) {
				if (usererr) {
					trans.rollback();
					callback({status: 1003, desc: usererr});
					return;
				}
				// 用户不存在
				if (result.length < 1) {
					trans.rollback();
					callback({status: 2002});
					return;
				}
				var userInfo = result[0];
				// 用户余额不足
				if (userInfo.blc_available < quota) {
					trans.rollback();
					callback({status: 2003});
					return;
				}
				trans.commit();
				// 响应订单并扣除余额
				trans.query('update RT_ORDERS set status=\'' + 1 + '\' where id=' + orderId, function(statuserr, result) {
					if (statuserr) {
						trans.rollback();
						callback({status: 1003, desc: statuserr});
					}
					else {
						trans.commit();
						trans.query('update USERS set blc_available=' + (userInfo.blc_available - quota) + ',blc_frozen=' + userInfo.blc_frozen + quota + ' where id=' + userId, function(balanceerr, result) {
							if (balanceerr) {
								trans.rollback();
								callback({status: 1003, desc: balanceerr});
							}
							else {
								trans.commit();
								callback({status: 1000});
							}
						});
					}
				});
			});
		});

		trans.execute();
	});
};

// 获取用户可用余额 0-用户不存在 1-成功
var getAvailableBalance = function(userId, callback) {

	sql.query('select blc_available from USERS where id=' + userId, function(err, result) {
		if (err) {
			callback(err);
		}
		else {
			if (result.length >= 1) {
				callback(null, {status: 1, balance: result.blc_available});
			}
			else {
				callback(null, {status: 0});
			}
		}
	});
};

module.exports = {

	login: login,
	createUser: createUser,
	userExist: userExist,
	getOrder: getOrder,
	getAvailableBalance: getAvailableBalance
};