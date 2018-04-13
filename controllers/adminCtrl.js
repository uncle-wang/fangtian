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

	// 统一中间件，用于验证登录信息
	app.use('/admin', function(req, res, next) {

		// 统一验证session，
		if (req.session.sadmin === true) {
			next();
		}
		else {
			res.send({status: 1001});
		}
	});

	// 注销
	app.get('/admin/logout', function(req, res) {

		req.session.destroy(function(err) {
			if (err) {
				res.send({status: 1003, desc: err});
			}
			else {
				res.send({status: 1000});
			}
		});
	});

	app.get('/admin/hehe', function(req, res) {

		res.send('/admin/hehe');
	});

	app.get('/admin/ff', function(req, res) {

		res.send('/admin/ff');
	});
};
