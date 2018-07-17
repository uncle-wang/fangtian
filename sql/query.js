const pool = require('./pool');

module.exports = ({selector, params, conn = pool}) => {

	return new Promise((resolve, reject) => {
		conn.query(selector, params, (err, result) => {
			if (err) {
				reject({status: 1003, desc: err});
			}
			else {
				resolve(result);
			}
		});
	});
}
