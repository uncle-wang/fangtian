// mysql
var mysql = require('mysql');

// 连接配置
var options = {

	host: 'localhost',
	user: 'root',
	password: 'mysql',
	database: 'ft_test'
};

// 连接池
var pool = mysql.createPool(options);

// 创建连接并执行语句
var _query = function(query, callback) {

	pool.query(query, function(sqlerror, result) {

		if (sqlerror) {
			callback(sqlerror);
			return;
		}
		callback(null, result);
	});
};

// 事务
var _trans = function(callback) {

	// 支持事务
	var queues = require('mysql-queues');
	pool.getConnection(function(err, connection) {
		if (err) {
			callback(err);
			return;
		}
		connection.connect();
		queues(connection, true);
		var trans = connection.startTransaction();
		callback(null, trans);
	});
};

// 模块导出
module.exports = {query: _query, trans: _trans};
