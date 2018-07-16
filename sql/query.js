const pool = require('./pool');

module.exports = (selector, conn = pool) => {

	return new Promise((resolve, reject) => {

		conn.query(selector, (err, result) => {
			if (err) {
				reject({status: 1003, desc: err});
			}
			else {
				resolve(result);
			}
		});
	});
}
