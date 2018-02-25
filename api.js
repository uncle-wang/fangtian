// md5
var md5 = require('md5');
// 加载sql模块
var sql = require('./sql');

// 登陆 1-成功 0-用户不存在 2-密码错误
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
					callback(null, {status: 2});
				}
				else {
					callback(null, {status: 1, userInfo: result});
				}
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
		connection.query('select id from USERS where name="' + username + '" for update', function(usererr, result) {
			if (usererr) {
				connection.rollback();
				callback({status: 1003, desc: usererr});
				return;
			}
			if (result.length >= 1) {
				connection.rollback();
				callback({status: 2001});
				return;
			}
			connection.query('insert into USERS(name,password,nick) values("' + username + '","' + md5(password) + '","' + nickname + '")', function(createerr, result) {
				if (createerr) {
					connection.rollback();
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
				});
			});
		});
	});
};

// 修改密码
var updatePassword = function(userId, newpassword, callback) {

	sql.query('update USERS set password="' + md5(newpassword) + '" where id=' + userId, function(err, result) {
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

	sql.query('select id from USERS where name="' + username + '"', function(err, result) {
		if (err) {
			callback(err);
		}
		else {
			callback(null, result.length >= 1);
		}
	});
};

// 查询待响应订单列表
var getOrderListToBeResponded = function(callback) {

	sql.query('select * from RT_ORDERS where status=\'' + 0 + '\'', function(err, result) {
		callback(err, result);
	});
};

// 查询用户订单列表
var getOrderListByUser = function(username, callback) {

	sql.query('select * from RT_ORDERS where initiator="' + username + '" or responder="' + username + '"', function(err, result) {
		callback(err, result);
	});
};

// 创建订单
var createOrder = function(userId, quota, type, callback) {

	sql.trans(function(transerr, connection) {

		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		// 查询用户账户余额并加排他锁
		connection.query('select name,blc_available,blc_frozen from USERS where id=' + userId + ' for update', function(usererr, result) {
			if (usererr) {
				connection.rollback();
				callback({status: 1003, desc: usererr});
				return;
			}
			// 用户不存在
			if (result.length < 1) {
				connection.rollback();
				callback({status: 2002});
				return;
			}
			var userInfo = result[0];
			// 用户余额不足
			if (userInfo.blc_available < quota) {
				connection.rollback();
				callback({status: 2003});
				return;
			}
			// 查询是否有匹配订单，若有，直接匹配，若没有，创建新订单
			var matchType = Math.abs(type - 1);
			// 匹配订单规则：type相反、等额、待处理、发起人与当前用户不冲突
			connection.query('select * from RT_ORDERS where type=' + matchType + ' and quota=' + quota + ' and status=\'' + 0 + '\' and initiator!="' + userInfo.name + '" order by create_time desc for update', function(matcherr, result) {
				if (matcherr) {
					connection.rollback();
					callback({status: 1003, desc: matcherr});
					return;
				}
				// 存在匹配订单
				if (result.length >= 1) {
					var orderInfo = result[0];
					// 响应订单并扣除余额
					connection.query('update RT_ORDERS set status=\'' + 1 + '\',responder="' + userInfo.name + '" where id="' + orderInfo.id + '"', function(statuserr, result) {
						if (statuserr) {
							connection.rollback();
							callback({status: 1003, desc: statuserr});
						}
						else {
							connection.query('update USERS set blc_available=' + (userInfo.blc_available - quota) + ',blc_frozen=' + (userInfo.blc_frozen + quota) + ' where id=' + userId, function(balanceerr, result) {
								if (balanceerr) {
									connection.rollback();
									callback({status: 1003, desc: balanceerr});
								}
								else {
									connection.commit(function(commiterr) {
										if (commiterr) {
											connection.rollback(function() {
												callback({status: 1003, desc: commiterr});
											});
										}
										else {
											// 响应创建
											callback({status: 1000, type: 1});
										}
									});
								}
							});
						}
					});
				}
				// 不存在匹配订单
				else {
					connection.query('insert into RT_ORDERS(initiator,quota,type) values("' + userInfo.name + '",' + quota + ',' + type + ')', function(createerr, result) {
						if (createerr) {
							connection.rollback();
							callback({status: 1003, desc: createerr});
							return;
						}
						connection.query('update USERS set blc_available=' + (userInfo.blc_available - quota) + ',blc_frozen=' + (userInfo.blc_frozen + quota) + ' where id=' + userId, function(balanceerr, result) {
							if (balanceerr) {
								connection.rollback();
								callback({status: 1003, desc: balanceerr});
							}
							else {
								connection.commit(function(commiterr) {
									if (commiterr) {
										connection.rollback(function() {
											callback({status: 1003, desc: commiterr});
										});
									}
									else {
										// 直接创建
										callback({status: 1000, type: 0});
									}
								});
							}
						});
					});
				}
			});
		});
	});
};

// 响应订单 0-sql错误 1-成功 2-订单不存在 3-订单已失效 4-用户不存在 5-用户余额不足
var responseOrder = function(userId, username, orderId, callback) {

	sql.trans(function(transerr, connection) {

		if (transerr) {
			callback({status: 1003, desc: transerr});
			return;
		}
		// 查询该订单并加排他锁
		connection.query('select * from RT_ORDERS where id="' + orderId + '" for update', function(ordererr, result) {
			if (ordererr) {
				connection.rollback();
				callback({status: 1003, desc: ordererr});
				return;
			}
			// 订单不存在
			if (result.length < 1) {
				connection.rollback();
				callback({status: 3001});
				return;
			}
			var orderInfo = result[0];
			// 订单已失效
			if (orderInfo.status !== '0') {
				connection.rollback();
				callback({status: 3002});
				return;
			}
			// 用户自己发起的订单
			if (orderInfo.initiator === username) {
				connection.rollback();
				callback({status: 3003});
				return;
			}
			var quota = orderInfo.quota;
			// 查询用户余额并加排他锁
			connection.query('select name,blc_available,blc_frozen from USERS where id=' + userId + ' for update', function(usererr, result) {
				if (usererr) {
					connection.rollback();
					callback({status: 1003, desc: usererr});
					return;
				}
				// 用户不存在
				if (result.length < 1) {
					connection.rollback();
					callback({status: 2002});
					return;
				}
				var userInfo = result[0];
				// 用户余额不足
				if (userInfo.blc_available < quota) {
					connection.rollback();
					callback({status: 2003});
					return;
				}
				// 响应订单并扣除余额
				connection.query('update RT_ORDERS set status=\'' + 1 + '\', responder="' + userInfo.name + '" where id="' + orderId + '"', function(statuserr, result) {
					if (statuserr) {
						connection.rollback();
						callback({status: 1003, desc: statuserr});
					}
					else {
						connection.query('update USERS set blc_available=' + (userInfo.blc_available - quota) + ',blc_frozen=' + (userInfo.blc_frozen + quota) + ' where id=' + userId, function(balanceerr, result) {
							if (balanceerr) {
								connection.rollback();
								callback({status: 1003, desc: balanceerr});
							}
							else {
								connection.commit(function(commiterr) {
									if (commiterr) {
										connection.rollback(function() {
											callback({status: 1003, desc: commiterr});
										});
									}
									else {
										callback({status: 1000});
									}
								});
							}
						});
					}
				});
			});
		});
	});
};

module.exports = {

	login: login,
	register: register,
	updatePassword: updatePassword,
	checkUserExist: checkUserExist,
	getOrderListToBeResponded: getOrderListToBeResponded,
	getOrderListByUser: getOrderListByUser,
	createOrder: createOrder,
	responseOrder: responseOrder
};