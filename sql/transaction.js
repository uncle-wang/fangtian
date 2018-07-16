const pool = require('./pool');

// 事务
module.exports = {

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
					reject({status: 1003, desc: err});
				}
				else {
					conn.release();
					resolve();
				}
			});
		});
	},
}
