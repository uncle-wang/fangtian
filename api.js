// md5
var md5 = require('md5');
// 加载sql模块
var sql = require('./../sql');

// 登陆 1-成功 0-用户不存在 2-密码错误
var login = function(username, password, callback) {

	sql.query('select * from users where name="' + username + '"', function(err, results) {
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
					callback(null, {status: 2});
				}
				else {
					callback(null, {status: 1, userInfo: result});
				}
			}
		}
	});
};

// 更新上次登录时间
var updateLastLoginTime = function(userid) {

	sql.query('update users set last_login_time=' + Date.now() + ' where id=' + userid);
};

// 获取用户信息
var getUserInfo = function(userId, callback) {

	sql.query('select name,nick,blc_available,blc_frozen,alipay,last_login_time from users where id=' + userId, function(err, result) {
		if (err) {
			callback({status: 0, err: err});
		}
		else {
			if (result.length >= 1) {
				callback({status: 1, info: result[0]});
			}
			else {
				callback({status: 2})
			}
		}
	});
};

// 注册 1-成功 0-数据库异常
var register = function(username, password, nickname, callback) {

	sql.trans(function(transerr, connection) {
		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		connection.query('select id from users where name="' + username + '" for update', function(usererr, result) {
			if (usererr) {
				connection.rollback();
				connection.release();
				callback({status: 1003, desc: usererr});
				return;
			}
			if (result.length >= 1) {
				connection.rollback();
				connection.release();
				callback({status: 2001});
				return;
			}
			connection.query('insert into users(name,password,nick,create_time) values("' + username + '","' + md5(password) + '","' + nickname + '", ' + Date.now() + ')', function(createerr, result) {
				if (createerr) {
					connection.rollback();
					connection.release();
					callback(createerr);
					return;
				}
				connection.commit(function(commiterr) {
					if (commiterr) {
						connection.rollback();
						callback({status: 1003, desc: err});
					}
					else {
						callback({status: 1000, userId: result.insertId});
					}
					connection.release();
				});
			});
		});
	});
};

// 修改密码
var updatePassword = function(userId, newpassword, callback) {

	sql.query('update users set password="' + md5(newpassword) + '" where id=' + userId, function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		if (result.effectRows >= 1) {
			callback({status: 1000});
		}
		else {
			callback({status: 2002});
		}
	});
};

// 验证用户名是否已存在
var checkUserExist = function(username, callback) {

	sql.query('select id from users where name="' + username + '"', function(err, result) {
		if (err) {
			callback(err);
		}
		else {
			callback(null, result.length >= 1);
		}
	});
};

// 获取当期公开游戏局
var getCurrentConfessedGame = function(callback) {

	sql.query('select * from confessed_games where status<>"1"', function(err, result) {

		if (err) {
			callback({status: 2, error: err});
		}
		else {
			if (result.length > 0) {
				callback({status: 1, result: result[0]});
			}
			// 查询不到
			else {
				callback({status: 0});
			}
		}
	});
};

// 获取往期记录
var getConfessedGameHistory = function(callback) {

	sql.query('select * from confessed_games where status="1"', function(err, result) {

		if (err) {
			callback({status: 2, error: err});
		}
		else {
			callback({status: 1, result: result});
		}
	});
};

// 公开局下单 0-数据库错误,1-成功,2-游戏id不存在,3-已封盘
var createConfessedOrder = function(type, quota, userid, gameid, callback) {

	sql.trans(function(transerr, connection) {

		if (transerr) {
			connection.release();
			callback({status: 0, error: transerr});
			return;
		}
		connection.query('select * from confessed_games where id=' + gameid + ' for update', function(gameerr, gameResult) {

			if (gameerr) {
				connection.rollback();
				connection.release();
				callback({status: 0, error: gameerr});
				return;
			}
			// 订单不存在
			if (gameResult.length <= 0) {
				connection.rollback();
				connection.release();
				callback({status: 2});
				return;
			}
			// 订单状态不匹配
			var gameInfo = gameResult[0];
			if (gameInfo.status !== '0') {
				connection.rollback();
				connection.release();
				callback({status: 3});
				return;
			}
			connection.query('insert into confessed_orders(type,game_id,amount,create_time) values(' + type + ',"' + gameid + '",' + quota + ',' + Date.now() + ')', function(ordererr, orderResult) {
				if (ordererr) {
					connection.rollback();
					connection.release();
					callback({status: 0, error: ordererr});
					return;
				}
				connection.commit(function(commiterr) {
					if (commiterr) {
						connection.rollback();
						callback({status: 0, error: commiterr});
					}
					else {
						callback({status: 1});
					}
					connection.release();
				});
			});
		});
	});
};

module.exports = {

	login: login,
	updateLastLoginTime: updateLastLoginTime,
	getUserInfo: getUserInfo,
	register: register,
	updatePassword: updatePassword,
	checkUserExist: checkUserExist,
	getCurrentConfessedGame: getCurrentConfessedGame,
	getConfessedGameHistory: getConfessedGameHistory,
	createConfessedOrder: createConfessedOrder
};
