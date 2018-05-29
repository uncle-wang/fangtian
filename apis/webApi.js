// md5
var md5 = require('md5');
// 加载sql模块
var sql = require('./../services/sql');
// 短信服务模块
var sms = require('./../services/sms');
// 时区
var timeZone = require('./../config').TIMEZONE;

var _release = function(connection) {

	connection.rollback && connection.rollback();
	connection.release && connection.release();
};

// 密码连续错误次数+1
var _setTryTimes = function(userid, times, callback) {

	sql.query('update users set try_times=' + times + ' where id=' + userid, function(errB, resultB) {
		if (errB) {
			callback({status: 1003, desc: errB});
			return;
		}
		callback({status: 2005, wrongTimes: times});
	});
};

// 创建6位数字的验证码
var _createRandomCode = function() {

	var s = '';
	for (var i = 0; i < 6; i ++) {
		s = s + Math.floor(Math.random() * 10);
	}
	return s;
};

// 登陆 1-成功 0-用户不存在 2-密码错误
var login = function(tel, password, callback) {

	sql.query('select * from users where tel="' + tel + '"', function(errA, resultA) {
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
		var tryTimes = userInfo.try_times;
		if (tryTimes >= 5) {
			callback({status: 2009});
			return;
		}
		if (userInfo.password !== md5(password)) {
			_setTryTimes(userInfo.id, tryTimes + 1, callback);
			return;
		}
		sql.query('update users set try_times=0 where id=' + userInfo.id, function(errB, resultB) {
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

	sql.query('select tel,balance,alipay from users where id=' + userId, function(err, result) {
		if (err) {
			callback({status: 1003, desc: err});
			return;
		}
		var userInfo = result[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		callback({status: 1000, userInfo: userInfo});
	});
};

// 注册 1-成功 0-数据库异常
var register = function(tel, code, password, callback) {

	var nowStamp = Date.now();
	sql.trans(function(transerr, connection) {
		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		// 判断手机号是否已被注册
		connection.query('select id from users where tel="' + tel + '" for update', function(usererr, result) {
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
			// 验证码校验
			connection.query('select id,code from code where tel="' + tel + '" and type="0" and consumed=0 and create_time>' + (nowStamp - 300000) + ' for update', function(codeerr, result) {
				if (codeerr) {
					_release(connection);
					callback({status: 1003, desc: codeerr});
					return;
				}
				var codeArr = [];
				for (var i = 0; i < result.length; i ++) {
					codeArr.push(result[i].code);
				}
				var codeIndex = codeArr.indexOf(code);
				if (codeIndex < 0) {
					_release(connection);
					callback({status: 8001});
					return;
				}
				var codeInfo = result[codeIndex];
				// 将该验证码置为已消费状态
				connection.query('update code set consumed=1 where id=' + codeInfo.id, function(conserr, result) {
					if (conserr) {
						_release(connection);
						callback({status: 1003, desc: conserr});
						return;
					}
					// 添加新用户
					connection.query('insert into users(tel,password,create_time) values("' + tel + '","' + md5(password) + '",' + nowStamp + ')', function(createerr, result) {
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
		});
	});
};

// 创建并发送注册所需的验证码
var sendRegisterCode = function(tel, callback) {

	var code = _createRandomCode(), nowStamp = Date.now();
	sql.query('select id from users where tel="' + tel + '"', function(errA, resultA) {
		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		var userInfo = resultA[0];
		if (userInfo) {
			callback({status: 2001});
			return;
		}
		sql.query('select * from code where tel="' + tel + '" and type="0" order by create_time desc', function(errB, resultB) {
			if (errB) {
				callback({status: 1003, desc: errB});
				return;
			}
			var latestCodeInfo = resultB[0];
			// 1分钟之内只能申请一次验证码
			if (latestCodeInfo && (nowStamp - latestCodeInfo.create_time < 60000)) {
				callback({status: 8002});
				return;
			}
			sql.query('insert into code(code,type,tel,create_time) values("' + code + '","0","' + tel + '",' + nowStamp + ')', function(errC, resultC) {
				if (errC) {
					callback({status: 1003, desc: errC});
				}
				else {
					callback({status: 1000});
					sms.sendVerifyCode(tel, code, 0);
				}
			});
		});
	});
};

// 修改密码
var updatePassword = function(userId, oldpassword, newpassword, callback) {

	sql.query('select password,try_times from users where id=' + userId, function(errA, resultA) {
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
		var tryTimes = userInfo.try_times;
		if (tryTimes >= 5) {
			callback({status: 2009});
			return;
		}
		var password = userInfo.password;
		if (md5(oldpassword) !== password) {
			_setTryTimes(userId, tryTimes + 1, callback);
			return;
		}
		sql.query('update users set password="' + md5(newpassword) + '",try_times=0 where id="' + userId + '"', function(errB, resultB) {
			if (errB) {
				callback({status: 1003, desc: errB});
				return;
			}
			callback({status: 1000});
		});
	});
};

// 重置密码
var resetPassword = function(tel, code, password, callback) {

	sql.query('select id from users where tel="' + tel + '"', function(errA, resultA) {
		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		var userInfo = resultA[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		var nowStamp = Date.now();
		sql.trans(function(transerr, conn) {
			if (transerr) {
				callback({status: 1003, desc: transerr});
				return;
			}
			conn.query('select id,code from code where tel="' + tel + '" and type="1" and consumed=0 and create_time>' + (nowStamp - 300000) + ' for update', function(errB, resultB) {
				if (errB) {
					_release(conn);
					callback({status: 1003, desc: errB});
					return;
				}
				var codeArr = [];
				for (var i = 0; i < resultB.length; i ++) {
					codeArr.push(resultB[i].code);
				}
				var codeIndex = codeArr.indexOf(code);
				if (codeIndex < 0) {
					_release(conn);
					callback({status: 8001});
					return;
				}
				var codeInfo = resultB[codeIndex];
				// 将该验证码置为已消费状态
				conn.query('update code set consumed=1 where id=' + codeInfo.id, function(errC, resultC) {
					if (errC) {
						_release(conn);
						callback({status: 1003, desc: errC});
						return;
					}
					// 重置密码
					conn.query('update users set password="' + md5(password) + '",try_times=0 where id=' + userInfo.id, function(errD, resultD) {
						if (errD) {
							_release(conn);
							callback({status: 1003, desc: errD});
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
};

// 创建并发送重置密码所需的验证码
var sendResetCode = function(tel, callback) {

	var code = _createRandomCode(), nowStamp = Date.now();
	sql.query('select id from users where tel="' + tel + '"', function(errA, resultA) {
		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		var userInfo = resultA[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		sql.query('select * from code where tel="' + tel + '" and type="1" order by create_time desc', function(errB, resultB) {
			if (errB) {
				callback({status: 1003, desc: errB});
				return;
			}
			var latestCodeInfo = resultB[0];
			// 1分钟之内只能申请一次验证码
			if (latestCodeInfo && (nowStamp - latestCodeInfo.create_time < 60000)) {
				callback({status: 8002});
				return;
			}
			sql.query('insert into code(code,type,tel,create_time) values("' + code + '","1","' + tel + '",' + nowStamp + ')', function(errC, resultC) {
				if (errC) {
					callback({status: 1003, desc: errC});
				}
				else {
					callback({status: 1000});
					sms.sendVerifyCode(tel, code, 1);
				}
			});
		});
	});
};

// 设置支付宝
var setAlipay = function(userid, alipay, code, callback) {

	sql.query('select tel from users where id=' + userid, function(errA, resultA) {
		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		var userInfo = resultA[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		var tel = userInfo.tel;
		var nowStamp = Date.now();
		sql.trans(function(transerr, conn) {
			if (transerr) {
				callback({status: 1003, desc: transerr});
				return;
			}
			conn.query('select id,code from code where tel="' + tel + '" and type="2" and consumed=0 and create_time>' + (nowStamp - 300000) + ' for update', function(errB, resultB) {
				if (errB) {
					_release(conn);
					callback({status: 1003, desc: errB});
					return;
				}
				var codeArr = [];
				for (var i = 0; i < resultB.length; i ++) {
					codeArr.push(resultB[i].code);
				}
				var codeIndex = codeArr.indexOf(code);
				if (codeIndex < 0) {
					_release(conn);
					callback({status: 8001});
					return;
				}
				var codeInfo = resultB[codeIndex];
				// 将该验证码置为已消费状态
				conn.query('update code set consumed=1 where id=' + codeInfo.id, function(errC, resultC) {
					if (errC) {
						_release(conn);
						callback({status: 1003, desc: errC});
						return;
					}
					// 设置支付宝
					conn.query('update users set alipay="' + alipay + '" where id=' + userid, function(errD, resultD) {
						if (errD) {
							_release(conn);
							callback({status: 1003, desc: errD});
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
};

// 创建并发送绑定支付宝所需的验证码
var sendAlipayCode = function(userid, callback) {

	var code = _createRandomCode(), nowStamp = Date.now();
	sql.query('select tel from users where id=' + userid, function(errA, resultA) {
		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		var userInfo = resultA[0];
		if (!userInfo) {
			callback({status: 2002});
			return;
		}
		var tel = userInfo.tel;
		sql.query('select * from code where tel="' + tel + '" and type="2" order by create_time desc', function(errB, resultB) {
			if (errB) {
				callback({status: 1003, desc: errB});
				return;
			}
			var latestCodeInfo = resultB[0];
			// 1分钟之内只能申请一次验证码
			if (latestCodeInfo && (nowStamp - latestCodeInfo.create_time < 60000)) {
				callback({status: 8002});
				return;
			}
			sql.query('insert into code(code,type,tel,create_time) values("' + code + '","2","' + tel + '",' + nowStamp + ')', function(errC, resultC) {
				if (errC) {
					callback({status: 1003, desc: errC});
				}
				else {
					callback({status: 1000});
					sms.sendVerifyCode(tel, code, 2);
				}
			});
		});
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
var pickup = function(userid, quota, alipay, callback) {

	sql.trans(function(transerr, conn) {
		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		conn.query('select balance,last_pickup_time from users where id=' + userid + ' for update', function(errA, resultA) {
			if (errA) {
				_release(conn);
				callback({status: 1003, desc: errA});
				return;
			}
			// 用户不存在
			var userInfo = resultA[0];
			if (!userInfo) {
				_release(conn);
				callback({status: 2002});
				return;
			}

			// 验证今日提现次数是否已达上限(每日1次)
			var lastPickupTime = userInfo.last_pickup_time;
			var timeOffset = 8 - timeZone, today = new Date();
			// 北京时间
			today.setHours(today.getHours() + timeOffset);
			// 今日0点
			today.setHours(0);
			today.setMinutes(0);
			today.setSeconds(0);
			today.setHours(today.getHours() - timeOffset);
			// 如果上次提现时间比北京时间今日0点晚，则不允许提现
			if (lastPickupTime >= today.getTime()) {
				_release(conn);
				callback({status: 3004});
				return;
			}

			var balance = userInfo.balance;
			// 手续费
			var fees = Math.ceil(quota * 2 / 100);
			var newBalance = balance - quota - fees;
			// 余额不足
			if (newBalance < 0) {
				_release(conn);
				callback({status: 2003});
				return;
			}
			// 扣款
			var newPickupTimeStr = _updatePickupTime(lastPickupStr);
			conn.query('update users set balance=' + newBalance + ',last_pickup_time="' + newPickupTimeStr + '" where id=' + userid, function(errB, resultB) {
				if (errB) {
					_release(conn);
					callback({status: 1003, desc: errB});
					return;
				}
				// 创建提现订单
				conn.query('insert into pickup(user,alipay,quota,fees,create_time) values(' + userid + ',"' + alipay + '",' + quota + ',' + fees + ',' + Date.now() + ')', function(errC, resultC) {
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

// 取消提现订单
var cancelPickup = function(userid, pickupid, callback) {

	sql.trans(function(transerr, conn) {
		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		conn.query('select * from pickup where id=' + pickupid + ' for update', function(errA, resultA) {
			if (errA) {
				_release(conn);
				callback({status: 1003, desc: errA});
				return;
			}
			var pickupInfo = resultA[0];
			// 订单不存在
			if (!pickupInfo) {
				_release(conn);
				callback({status: 3001});
				return;
			}
			// 当前操作用户与创建订单用户不匹配
			if (pickupInfo.user !== userid) {
				_release(conn);
				callback({status: 3002});
				return;
			}
			// 非等待处理状态
			if (pickupInfo.status !== '0') {
				_release(conn);
				callback({status: 3003});
				return;
			}
			// 删除订单
			conn.query('update pickup set status="2" where id=' + pickupid, function(errB, resultB) {
				if (errB) {
					_release(conn);
					callback({status: 1003, desc: errB});
					return;
				}
				// 返还余额
				var quota = pickupInfo.quota + pickupInfo.fees;
				conn.query('select balance from users where id=' + userid + ' for update', function(errC, resultC) {
					if (errC) {
						_release(conn);
						callback({status: 1003, desc: errC});
						return;
					}
					var userInfo = resultC[0];
					if (!userInfo) {
						_release(conn);
						callback({status: 2002});
						return;
					}
					var balance = userInfo.balance;
					conn.query('update users set balance=' + (balance + quota) + ' where id=' + userid, function(errD, resultD) {
						if (errD) {
							_release(conn);
							callback({status: 1003, desc: errD});
							return;
						}
						conn.commit(function(comerr) {
							if (comerr) {
								_release(conn);
								callback({status: 1003, desc: comerr});
								return;
							}
							conn.release();
							callback({status: 1000});
							return;
						});
					});
				});
			});
		});
	});
};

module.exports = {

	login: login,
	getUserInfo: getUserInfo,
	register: register,
	sendRegisterCode: sendRegisterCode,
	updatePassword: updatePassword,
	resetPassword: resetPassword,
	sendResetCode: sendResetCode,
	setAlipay: setAlipay,
	sendAlipayCode: sendAlipayCode,
	createRecharge: createRecharge,
	getRechargeHistoryByUser: getRechargeHistoryByUser,
	getRechargeInfo: getRechargeInfo,
	payRecharge: payRecharge,
	getLatestConfessedGame: getLatestConfessedGame,
	getConfessedGameHistory: getConfessedGameHistory,
	getOrderHistoryByUser: getOrderHistoryByUser,
	createConfessedOrder: createConfessedOrder,
	pickup: pickup,
	getPickupHistoryByUser: getPickupHistoryByUser,
	cancelPickup: cancelPickup
};
