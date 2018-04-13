// mysql
var mysql = require('mysql');
// config
var options = require('./../config').MYSQL;

// 连接池
var pool = mysql.createPool(options);

// 创建连接并执行语句
var _query = function(query, callback) {

	pool.query(query, function(sqlerror, result) {

		if (sqlerror) {
			callback && callback(sqlerror);
			return;
		}
		callback && callback(null, result);
	});
};

// 事务
var _trans = function(callback) {

	// 支持事务
	pool.getConnection(function(err, connection) {
		if (err) {
			connection.release();
			callback(err);
			return;
		}
		connection.beginTransaction(function(errb) {
			if (errb) {
				connection.release();
				callback(errb);
				return;
			}
			callback(null, connection);
		});
	});
};

// 模块导出
module.exports = {query: _query, trans: _trans};
