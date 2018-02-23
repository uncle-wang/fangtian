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
var sql = function(query, callback) {

	pool.getConnection(function(err, connection) {

		if (err) {
			callback(err);
			connection.release();
			return;
		}

		connection.query(query, function(sqlerror, result) {

			connection.release();
			if (sqlerror) {
				callback(sqlerror);
				return;
			}
			callback(null, result);
		});
	});
};

// 模块导出
module.exports = sql;
