var crypto = require('crypto');
// 加载配置文件
var CONFIG = require('./../config');

module.exports = function(app) {

	// 管理员登录
	app.post('/slogin', function(req, res) {

		var password = req.body.password;
		if (password) {
			var md5 = crypto.createHash('md5');
			md5.update(password);
			var md5Password = md5.digest('hex');
			if (md5Password === CONFIG.SPASSWORD) {
				req.session.sadmin = true;
				res.send({status: 1000});
			}
			else {
				res.send({status: 2005});
			}
		}
		else {
			res.send({status: 1002, desc: 'password required'});
		}
	});

	// 管理员注销
	app.get('/slogout', function(req, res) {

		var sadmin = req.session.sadmin;
		if (sadmin === true) {
			delete req.session.sadmin;
			res.send({status: 1000});
		}
		else {
			res.send({status: 1001});
		}
	});

	// 管理员api
	app.use('/admin', function(req, res, next) {

		if (req.session.sadmin === true) {
			next();
		}
		else {
			res.send({status: 1001});
		}
	});
	app.get('/admin/hehe', function(req, res) {

		res.send('/admin/hehe');
	});
	app.get('/admin/ff', function(req, res) {

		res.send('/admin/ff');
	});
};
