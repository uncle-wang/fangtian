// md5
var md5 = require('md5');
// 加载sql模块
var sql = require('./../services/sql');

var _release = function(connection) {

	connection.rollback && connection.rollback();
	connection.release && connection.release();
};

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

	sql.query('select name,nick,balance,last_login_time from users where id=' + userId, function(err, result) {
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
				_release(connection);
				callback({status: 1003, desc: usererr});
				return;
			}
			if (result.length >= 1) {
				_release(connection);
				callback({status: 2001});
				return;
			}
			connection.query('insert into users(name,password,nick,create_time) values("' + username + '","' + md5(password) + '","' + nickname + '", ' + Date.now() + ')', function(createerr, result) {
				if (createerr) {
					_release(connection);
					callback(createerr);
					return;
				}
				connection.commit(function(commiterr) {
					if (commiterr) {
						_release(connection);
						callback({status: 1003, desc: err});
					}
					else {
						connection.release();
						callback({status: 1000});
					}
				});
			});
		});
	});
};

// 修改密码
var updatePassword = function(userId, newpassword, callback) {

	sql.query('update users set password="' + md5(newpassword) + '" where id="' + userId + '"', function(err, result) {
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

// 创建充值订单
var createRecharge = function(userid, quota, callback) {

	sql.query('insert into recharge(user,quota,create_time) values(' + userid + ',' + (quota * 6000) + ',' + Date.now() + ')', function(err, result) {
		if (err) {
			callback({status: 0, error: err});
			return;
		}
		callback({status: 1, orderId: result.insertId});
	});
};

// 获取充值记录
var getRechargeHistoryByUser = function(userid, callback) {

	sql.query('select * from recharge where user=' + userid, function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		callback({status: 1000, rechargeList: result});
	});
};

// 查询充值订单信息
var getRechargeInfo = function(rechargeId, callback) {

	sql.query('select * from recharge where id=' + rechargeId, function(err, result) {
		if (err) {
			callback({status: 0, error: err});
			return;
		}
		if (result.length < 1) {
			callback({status: 2});
			return;
		}
		callback({status: 1, rechargeInfo: result[0]});
	});
};

// 支付充值订单
var payRecharge = function(rechargeId, callback) {

	sql.trans(function(transerr, conn) {

		if (transerr) {
			callback({status: 0, error: transerr});
			return;
		}
		conn.query('select * from recharge where id=' + rechargeId + ' for update', function(ordererr, orderresult) {
			if (ordererr) {
				_release(conn);
				callback({status: 0, error: ordererr});
				return;
			}
			if (orderresult.length <= 0) {
				_release(conn);
				callback({status: 2});
				return;
			}
			var rechargeInfo = orderresult[0];
			if (rechargeInfo.status !== '0') {
				_release(conn);
				callback({status: 3});
				return;
			}
			var userid = rechargeInfo.user;
			conn.query('select balance from users where id=' + userid + ' for update', function(usrerr, userresult) {
				if (usrerr) {
					_release(conn);
					callback({status: 0, error: usrerr});
					return;
				}
				var userInfo = userresult[0];
				if (userInfo) {
					var newBalance = userInfo.balance + rechargeInfo.quota;
					conn.query('update users set balance=' + newBalance + ' where id=' + userid, function(seterr) {
						if (seterr) {
							_release(conn);
							callback({status: 0, error: seterr});
							return;
						}
						conn.query('update recharge set status="1" where id=' + rechargeId, function(payerr) {
							if (payerr) {
								_release(conn);
								callback({status: 0, error: payerr});
								return;
							}
							conn.commit(function(comerr) {
								if (comerr) {
									_release(conn);
									callback({status: 0, error: comerr});
									return;
								}
								conn.release();
								callback({status: 1});
								return;
							});
						});
					});
				}
				else {
					_release(conn);
					callback({status: 4});
					return;
				}
			});
		});
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

// 查询历史订单
var getOrderHistoryByUser = function(userid, callback) {

	sql.query('select * from confessed_orders where user=' + userid + ' order by create_time desc', function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		callback({status: 1000, orderList: result});
	});
};

// 公开局下单 0-数据库错误,1-成功,2-游戏id不存在,3-已封盘,4-余额不足或账号异常
var createConfessedOrder = function(type, quota, userid, gameid, callback) {

	sql.trans(function(transerr, conn) {

		if (transerr) {
			callback({status: 0, error: transerr});
			return;
		}
		// 查询当期游戏状态
		conn.query('select * from confessed_games where id="' + gameid + '" for update', function(gameerr, gameResult) {

			if (gameerr) {
				_release(conn);
				callback({status: 0, error: gameerr});
				return;
			}
			// 期号不存在
			if (gameResult.length <= 0) {
				_release(conn);
				callback({status: 2});
				return;
			}
			// 当期游戏状态不匹配
			var gameInfo = gameResult[0];
			if (gameInfo.status !== '0') {
				_release(conn);
				callback({status: 3});
				return;
			}
			// 查询用户余额
			conn.query('select balance from users where id=' + userid + ' for update', function(usererr, userResult) {
				if (usererr) {
					_release(conn);
					callback({status: 0, error: usererr});
					return;
				}
				// 账号不存在
				if (userResult.length <= 0) {
					_release(conn);
					callback({status: 4});
					return;
				}
				// 余额不足
				var newBalance = userResult[0].balance - quota;
				if (newBalance < 0) {
					_release(conn);
					callback({status: 5});
					return;
				}
				// 扣款
				conn.query('update users set balance=' + newBalance + ' where id=' + userid, function(balerr, balResult) {
					if (balerr) {
						_release(conn);
						callback({status: 0, error: balerr});
						return;
					}
					// 创建订单
					conn.query('insert into confessed_orders(type,user,game_id,amount,create_time) values(' + type + ',' + userid + ',"' + gameid + '",' + quota + ',' + Date.now() + ')', function(ordererr, orderResult) {
						if (ordererr) {
							_release(conn);
							callback({status: 0, error: ordererr});
							return;
						}
						// 更新本场数据
						var columnName, value;
						if (type === '0') {
							columnName = 'even_amount';
						}
						else {
							columnName = 'odd_amount';
						}
						value = gameInfo[columnName] + quota;
						conn.query('update confessed_games set ' + columnName + '=' + value + ' where id=' + gameid, function(amounterr, amountResult) {
							if (amounterr) {
								_release(conn);
								callback({status: 0, error: amounterr});
								return;
							}
							conn.commit(function(commiterr) {
								if (commiterr) {
									_release(conn);
									callback({status: 0, error: commiterr});
								}
								else {
									conn.release();
									callback({status: 1});
								}
							});
						});
					});
				});
			});
		});
	});
};

// 提现
var pickup = function(userid, quota, callback) {

	sql.trans(function(transerr, conn) {
		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		conn.query('select balance from users where id=' + userid + ' for update', function(errA, resultA) {
			if (errA) {
				_release(conn);
				callback({status: 1003, desc: errA});
				return;
			}
			// 用户不存在
			if (resultA.length <= 0) {
				_release(conn);
				callback({status: 2002});
				return;
			}
			var balance = resultA[0].balance;
			// 手续费
			var fees = Math.ceil(quota * 5 / 100);
			var newBalance = balance - quota - fees;
			// 余额不足
			if (newBalance < 0) {
				_release(conn);
				callback({status: 2003});
				return;
			}
			// 扣款
			conn.query('update users set balance=' + newBalance + ' where id=' + userid, function(errB, resultB) {
				if (errB) {
					_release(conn);
					callback({status: 1003, desc: errB});
					return;
				}
				// 创建提现订单
				conn.query('insert into pickup(user,quota,fees,create_time) values(' + userid + ',' + quota + ',' + fees + ',' + Date.now() + ')', function(errC, resultC) {
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

module.exports = {

	login: login,
	updateLastLoginTime: updateLastLoginTime,
	getUserInfo: getUserInfo,
	register: register,
	updatePassword: updatePassword,
	createRecharge: createRecharge,
	getRechargeHistoryByUser: getRechargeHistoryByUser,
	getRechargeInfo: getRechargeInfo,
	payRecharge: payRecharge,
	checkUserExist: checkUserExist,
	getCurrentConfessedGame: getCurrentConfessedGame,
	getConfessedGameHistory: getConfessedGameHistory,
	getOrderHistoryByUser: getOrderHistoryByUser,
	createConfessedOrder: createConfessedOrder,
	pickup: pickup
};
