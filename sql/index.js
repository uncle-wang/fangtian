// mysql
const mysql = require('mysql');
// config
const options = require('./../config').MYSQL;
// 连接池
const pool = mysql.createPool(options);
// 表操作
const tables = require('./tables');

// 事务
const trans = callback => {

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

// 事务
const transs = {

	getConnection: () => new Promise((resolve, reject) => {

		// 支持事务
		pool.getConnection((err, connection) => {
			if (err) {
				connection.release();
				reject({status: 1003, desc: err});
				return;
			}
			connection.beginTransaction(err => {
				if (err) {
					connection.release();
					reject({status: 1003, desc: err});
					return;
				}
				resolve(connection);
			});
		});
	}),

	// 提交事务
	commit: conn => {

		return new Promise((resolve, reject) => {
			conn.commit(err => {
				if (err) {
					conn.rollback();
					conn.release();
					reject({status: 1003, desc: err});
				}
				else {
					conn.release();
					resolve();
				}
			});
		});
	},
};
module.exports = {pool, trans, tables, transs};
