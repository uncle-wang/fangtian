// 加载sql模块
var sql = require('./../services/sql');

var _release = function(connection) {

	connection.rollback && connection.rollback();
	connection.release && connection.release();
};

// 创建游戏局
var createGame = function(id, disabletime, closetime, callback) {

	sql.query('select id from confessed_games where status<>"1"', function(errA, resultA) {

		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		// 存在尚未结束的对局
		if (resultA.length > 0) {
			callback({status: 4003});
			return;
		}

		sql.query('insert into confessed_games(id,create_time,disable_time,close_time) values("' + id + '",' + Date.now() + ',' + disabletime + ',' + closetime + ')', function(errB, resultB) {
			if (errB) {
				callback({status: 1003, desc: errB});
				return;
			}
			callback({status: 1000});
		});
	});
};

// 封盘
var disableGame = function(id, callback) {

	sql.query('select * from confessed_games where id="' + id + '"', function(errA, resultA) {
		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		if (resultA.length <= 0) {
			callback({status: 4001});
			return;
		}
		var gameInfo = resultA[0];
		if (gameInfo.status !== '0') {
			callback({status: 4002});
			return;
		}
		sql.query('update confessed_games set status="2" where id="' + gameInfo.id + '"', function(errB, resultB) {
			if (errB) {
				callback({status: 1003, desc: errB});
				return;
			}
			callback({status: 1000});
		});
	});
};

// 增加用户余额
var _addUserBalance = function(userid, quota, callback) {

	sql.trans(function(transerr, conn) {
		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		conn.query('select balance from users where id=' + userid, function(errA, resultA) {
			if (errA) {
				_release(conn);
				callback({status: 1003, desc: errA});
				return;
			}
			var userInfo = resultA[0];
			if (!userInfo) {
				_release(conn);
				callback({status: 2002});
				return;
			}
			var newBalance = userInfo.balance + quota;
			conn.query('update users set balance=' + newBalance + ' where id=' + userid, function(errB, resultB) {
				if (errB) {
					_release(conn);
					callback({status: 1003, desc: errB});
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
};
// 更新用户余额(游戏产生结果时)
var updateUserBalance = function(gameid, callback) {

	sql.query('select * from confessed_orders where game_id="' + gameid + '" and status="1"', function(err, result) {

		if (err) {
			callback({status: 1003, desc: err});
			return;
		}

		// 订单列表
		var i = 0;
		var orderList = result;
		var errList = [];

		// 迭代更新
		var updateBalance = function() {

			if (i < orderList.length) {
				var orderInfo = orderList[i];
				var userId = orderInfo.user;
				var orderType = orderInfo.type;
				var orderQuoat = orderInfo.amount;
				var orderResult = orderInfo.result;
				var orderTimes = orderInfo.times;
				var amount = 0;
				// 胜或平
				if (orderResult === 2 || orderType === orderResult) {
					amount = orderQuoat * orderTimes;
					_addUserBalance(userId, amount, function(resultMap) {
						if (resultMap.status !== 1000) {
							errList.push({userId: userId, order: orderInfo, error: resultMap});
						}
						i ++;
						updateBalance();
					});
				}
				// 执行下一次
				else {
					i ++;
					updateBalance();
				}
			}
			else {
				if (errList.length > 0) {
					callback({status: 5001, desc: errList});
				}
				else {
					callback({status: 1000});
				}
			}
		};

		updateBalance();
	});
};

// 判断小数点后第一位的奇偶性
var __getParity = function(num) {

	var n = Math.floor(num * 10);
	return n % 2;
};
// 更新游戏、订单结果
var _updateGameAndOrders = function(id, resultno, callback) {

	sql.trans(function(transerr, conn) {

		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		// 查询游戏信息
		conn.query('select * from confessed_games where id="' + id + '" for update', function(errA, resultA) {

			if (errA) {
				_release(conn);
				callback({status: 1003, desc: transerr});
				return;
			}
			var gameInfo = resultA[0];
			if (!gameInfo) {
				_release(conn);
				callback({status: 4001});
				return;
			}
			if (gameInfo.status !== '2') {
				_release(conn);
				callback({status: 4004});
				return;
			}
			// 计算赔率
			var oddAmount = gameInfo.odd_amount;
			var evenAmount = gameInfo.even_amount;
			var total = 0.9 * oddAmount + 0.9 * evenAmount;
			var times, result;
			if (oddAmount <= 0 || evenAmount <= 0) {
				result = 2;
				times = 0.9;
			}
			else {
				result = __getParity(resultno);
				if (result === 0) {
					times = Math.floor(100 * total / evenAmount) / 100;
				}
				else {
					times = Math.floor(100 * total / oddAmount) / 100;
				}
			}
			// 更新游戏信息
			conn.query('update confessed_games set status="1",close_time=' + Date.now() + ',times=' + times + ',result=' + result + ',result_no=' + resultno + ' where id="' + id + '"', function(errB, resultB) {

				if (errB) {
					_release(conn);
					callback({status: 1003, desc: errB});
					return;
				}
				// 更新订单信息
				conn.query('update confessed_orders set status="1",result=' + result + ',times=' + times + ' where game_id="' + id + '"', function(errC, resultC) {

					if (errC) {
						_release(conn);
						callback({status: 1003, desc: errC});
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
};
// 更新游戏结果
var updateGameResult = function(id, resultno, callback) {

	_updateGameAndOrders(id, resultno, function(resultMapA) {
		if (resultMapA.status === 1000) {
			updateUserBalance(id, function(resultMapB) {
				callback(resultMapB);
			});
		}
		else {
			callback(resultMapA);
		}
	});
};

module.exports = {

	createGame: createGame,
	disableGame: disableGame,
	updateGameResult: updateGameResult,
	updateUserBalance: updateUserBalance
};
