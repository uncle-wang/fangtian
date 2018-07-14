module.exports = (conn, selector) => {

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