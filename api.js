// md5
var md5 = require('md5');
// 加载sql模块
var sql = require('./sql');

// 验证用户名是否已存在
var userExist = function(username, callback) {

	sql('select id from USERS where name="' + username + '"', function(err, result) {
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
	sql('insert into USERS(name,password,nick) values("' + username + '","' + md5(password) + '","' + nickname + '")', function(err, result) {
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

	sql('select * from USERS where name="' + username + '"', function(err, results) {
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

// 获取订单
var getOrder = function(orderId, callback) {

	sql('select * from RT_ORDER where id=' + orderId, function(err, result) {
		if (err) {
			callback(err);
		}
		else {
			callback(null, result[0]);
		}
	});
};

// 响应订单
var responseOrder = function(userId) {};

// 更新余额

// 获取用户可用余额 0-用户不存在 1-成功
var getAvailableBalance = function(userId, callback) {

	sql('select blc_available from USERS where id=' + userId, function(err, result) {
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