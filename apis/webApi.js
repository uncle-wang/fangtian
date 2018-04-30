// md5
var md5 = require('md5');
// 加载sql模块
var sql = require('./../services/sql');

var _release = function(connection) {

	connection.rollback && connection.rollback();
	connection.release && connection.release();
};

// 更新密码连续错误次数
var __setTryTimes = function(userid, time, callback) {

	sql.query('update users set try_times=' + time + ' where id=' + userid, function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		callback({status: 1000, time: time});
	});
};
// 密码连续错误次数+1
var _addTryTimes = function(userid, callback) {

	sql.query('select try_times from users where id=' + userid, function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		var userInfo = result[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		var currentTimes = userInfo.try_times;
		__setTryTimes(userid, currentTimes + 1, function(resultMap) {
			callback(resultMap);
		});
	});
};
// 重置密码错误次数
var _resetTryTimes = function(userid, callback) {

	__setTryTimes(userid, 0, callback);
};

// 登陆 1-成功 0-用户不存在 2-密码错误
var login = function(username, password, callback) {

	sql.query('select * from users where name="' + username + '"', function(errA, resultA) {
		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		var userInfo = resultA[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		// 密码连续错误5次
		if (userInfo.try_times >= 5) {
			callback({status: 2009});
			return;
		}
		if (userInfo.password !== md5(password)) {
			_addTryTimes(userInfo.id, function(resultMap) {
				if (resultMap.status === 1000) {
					callback({status: 2005, wrongTimes: resultMap.time});
				}
				else {
					callback(resultMap);
				}
			});
			return;
		}
		sql.query('update users set last_login_time=' + Date.now() + ',try_times=0 where id=' + userInfo.id, function(errB, resultB) {
			if (errB) {
				callback({status: 1003, desc: errB});
				return;
			}
			callback({status: 1000, userInfo: userInfo});
		});
	});
};

// 获取用户信息
var getUserInfo = function(userId, callback) {

	sql.query('select name,nick,balance,last_login_time,ques,answ from users where id=' + userId, function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		var userInfo = result[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		var obj = {};
		obj.name = userInfo.name;
		obj.nick = userInfo.nick;
		obj.balance = userInfo.balance;
		obj.last_login_time = userInfo.last_login_time;
		if (userInfo.ques && userInfo.answ) {
			obj.protection = true;
		}
		else {
			obj.protection = false;
		}
		callback({status: 1000, userInfo: obj});
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
						callback({status: 1003, desc: commiterr});
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
var updatePassword = function(userId, oldpassword, newpassword, callback) {

	sql.query('select password from users where id=' + userId, function(errA, resultA) {
		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		var userInfo = resultA[0];
		if (userInfo) {
			var password = userInfo.password;
			if (md5(oldpassword) !== password) {
				callback({status: 2005});
				return;
			}
			sql.query('update users set password="' + md5(newpassword) + '" where id="' + userId + '"', function(errB, resultB) {
				if (errB) {
					callback({status: 1003, desc: errB});
					return;
				}
				callback({status: 1000});
			});
		}
		else {
			callback({status: 2002});
		}
	});
};

// 获取密保问题(通过用户名)
var getQuestionsByName = function(username, callback) {

	sql.query('select ques from users where name="' + username + '"', function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		var userInfo = result[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		var ques = userInfo.ques;
		var quesArr = null;
		if (ques) {
			var arr = ques.split(',');
			quesArr = [];
			for (var i = 0; i < arr.length; i ++) {
				var str = arr[i];
				quesArr.push(decodeURIComponent(str));
			}
		}
		callback({status: 1000, ques: quesArr});
	});
};

// 获取密保问题(通过userid)
var getQuestionsById = function(userid, callback) {


	sql.query('select ques from users where id=' + userid, function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		var userInfo = result[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		var ques = userInfo.ques;
		var quesArr = null;
		if (ques) {
			var arr = ques.split(',');
			quesArr = [];
			for (var i = 0; i < arr.length; i ++) {
				var str = arr[i];
				quesArr.push(decodeURIComponent(str));
			}
		}
		callback({status: 1000, ques: quesArr});
	});
};

// 重置密码
var resetPasswordByProtection = function(username, password, answA, answB, answC, callback) {

	sql.query('select id,answ from users where name="' + username + '"', function(errA, resultA) {
		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		var userInfo = resultA[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		var answ = userInfo.answ;
		if (answ) {
			if (md5(answA) + ',' + md5(answB) + ',' + md5(answC) === answ) {
				sql.query('update users set password="' + md5(password) + '" where id=' + userInfo.id, function(errB, resultB) {
					if (errB) {
						callback({status: 1003, desc: errB});
					}
					else {
						callback({status: 1000});
					}
				});
			}
			else {
				callback({status: 2006});
			}
		}
		else {
			callback({status: 2007});
		}
	});
};

// 设置密保问题
var _setProtection = function(userid, ques, answ, callback) {

	sql.query('update users set ques="' + ques + '",answ="' + answ + '" where id=' + userid, function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
		}
		else {
			callback({status: 1000});
		}
	});
};
var setProtection = function(userid, params, callback) {

	var newQues = encodeURIComponent(params.new_ques_a) + ',' + encodeURIComponent(params.new_ques_b) + ',' + encodeURIComponent(params.new_ques_c);
	var newAnsw = md5(params.new_answ_a) + ',' + md5(params.new_answ_b) + ',' + md5(params.new_answ_c);
	sql.query('select password,ques,answ from users where id=' + userid, function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		var userInfo = result[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		// 首次设置
		if (params.type === '0') {
			// 验证密码
			if (userInfo.password !== md5(params.password)) {
				callback({status: 2005});
				return;
			}
			if (userInfo.ques && userInfo.answ) {
				// 已经设置过密保问题和答案
				callback({status: 2008});
			}
			else {
				_setProtection(userid, newQues, newAnsw, callback);
			}
		}
		// 非首次设置
		else {
			if (userInfo.ques && userInfo.answ) {
				var oldAnsw = md5(params.old_answ_a) + ',' + md5(params.old_answ_b) + ',' + md5(params.old_answ_c);
				// 验证原密保答案
				if (oldAnsw === userInfo.answ) {
					_setProtection(userid, newQues, newAnsw, callback);
				}
				else {
					callback({status: 2006});
				}
			}
			else {
				// 尚未设置过密保问题和答案
				callback({status: 2007});
			}
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

	sql.query('select * from recharge where user=' + userid + ' order by create_time desc', function(err, result) {
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

// 获取最近一期公开游戏局
var getLatestConfessedGame = function(callback) {

	sql.query('select * from confessed_games order by id desc', function(err, result) {

		if (err) {
			callback({status: 1003, desc: err});
		}
		else {
			if (result.length > 0) {
				callback({status: 1000, gameInfo: result[0]});
			}
			// 查询不到
			else {
				callback({status: 4001});
			}
		}
	});
};

// 获取往期记录
var getConfessedGameHistory = function(callback) {

	sql.query('select * from confessed_games where status="1" order by create_time desc', function(err, result) {

		if (err) {
			callback({status: 1003, desc: err});
		}
		else {
			callback({status: 1000, gameList: result});
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
			callback({status: 1003, desc: transerr});
			return;
		}
		// 查询当期游戏状态
		conn.query('select * from confessed_games where id="' + gameid + '" for update', function(gameerr, gameResult) {

			if (gameerr) {
				_release(conn);
				callback({status: 1003, desc: gameerr});
				return;
			}
			// 期号不存在
			if (gameResult.length <= 0) {
				_release(conn);
				callback({status: 4001});
				return;
			}
			// 当期游戏状态不匹配
			var gameInfo = gameResult[0];
			if (gameInfo.status !== '0') {
				_release(conn);
				callback({status: 4002});
				return;
			}
			// 查询用户余额
			conn.query('select balance from users where id=' + userid + ' for update', function(usererr, userResult) {
				if (usererr) {
					_release(conn);
					callback({status: 1003, desc: usererr});
					return;
				}
				// 账号不存在
				if (userResult.length <= 0) {
					_release(conn);
					callback({status: 2002});
					return;
				}
				// 余额不足
				var newBalance = userResult[0].balance - quota;
				if (newBalance < 0) {
					_release(conn);
					callback({status: 2003});
					return;
				}
				// 扣款
				conn.query('update users set balance=' + newBalance + ' where id=' + userid, function(balerr, balResult) {
					if (balerr) {
						_release(conn);
						callback({status: 1003, desc: balerr});
						return;
					}
					// 创建订单
					conn.query('insert into confessed_orders(type,user,game_id,amount,create_time) values(' + type + ',' + userid + ',"' + gameid + '",' + quota + ',' + Date.now() + ')', function(ordererr, orderResult) {
						if (ordererr) {
							_release(conn);
							callback({status: 1003, desc: ordererr});
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
								callback({status: 1003, desc: amounterr});
								return;
							}
							conn.commit(function(commiterr) {
								if (commiterr) {
									_release(conn);
									callback({status: 1003, desc: commiterr});
								}
								else {
									conn.release();
									callback({status: 1000});
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
			var fees = Math.ceil(quota * 6 / 100);
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

// 获取提现记录
var getPickupHistoryByUser = function(userid, callback) {

	sql.query('select * from pickup where user=' + userid + ' order by create_time desc', function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		callback({status: 1000, pickupList: result});
	});
};

module.exports = {

	login: login,
	getUserInfo: getUserInfo,
	register: register,
	updatePassword: updatePassword,
	getQuestionsByName: getQuestionsByName,
	getQuestionsById: getQuestionsById,
	resetPasswordByProtection: resetPasswordByProtection,
	setProtection: setProtection,
	createRecharge: createRecharge,
	getRechargeHistoryByUser: getRechargeHistoryByUser,
	getRechargeInfo: getRechargeInfo,
	payRecharge: payRecharge,
	getLatestConfessedGame: getLatestConfessedGame,
	getConfessedGameHistory: getConfessedGameHistory,
	getOrderHistoryByUser: getOrderHistoryByUser,
	createConfessedOrder: createConfessedOrder,
	pickup: pickup,
	getPickupHistoryByUser: getPickupHistoryByUser
};
