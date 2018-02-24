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

// 注册 1000-成功 1001-数据库异常
var createUser = function(username, password, nickname, callback) {

	// 创建新用户
	sql('insert into USERS(name,password,nick) values("' + username + '","' + md5(password) + '","' + nickname + '")', function(err, result) {
		if (err) {
			callback(err);
		}
		else {
			if (result.affectedRows === 1) {
				callback(null, {status: 1000, userId: result.insertId});
			}
			else {
				callback('db error');
			}
		}
	});
};

// 登陆 1000-成功 1001-用户名或密码错误
var login = function(username, password, callback) {

	sql('select * from USERS where name="' + username + '"', function(err, results) {
		if (err) {
			callback(err);
		}
		else {
			if (results.length < 1) {
				callback(null, {status: 1001});
			}
			else {
				var result = results[0];
				if (result.password !== md5(password)) {
					callback(null, {status: 1001});
				}
				else {
					callback(null, {status: 1000, userInfo: result});
				}
			}
		}
	});
};

module.exports = {

	login: login,
	createUser: createUser,
	userExist: userExist
};