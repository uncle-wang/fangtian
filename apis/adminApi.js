// 加载sql模块
var sql = require('./../services/sql');

// 个位数补0
var _zeroFixed = function(num) {

	if (num < 10) {
		return '0' + num;
	}
	return '' + num;
};

// 获取当前日期
var _getCurrentDateStr = function() {

	var dateTime = new Date();
	var period = '' + dateTime.getFullYear() + _zeroFixed(dateTime.getMonth() + 1) + _zeroFixed(dateTime.getDate());
	return period;
};

// 创建游戏局
var createGame = function(callback) {

	sql.query('select id from confessed_games where status<>"1"', function(err, result) {

		if (err) {
			callback(err);
			return;
		}
		// 存在尚未结束的对局
		if (result.length > 0) {
			callback(null, {status: 101});
			return;
		}

		var timeStamp = Date.now();
		var period = _getCurrentDateStr();
		sql.query('insert into confessed_games(id,create_time) values("' + period + '",' + timeStamp + ')', function(err, result) {
			if (err) {
				callback(err);
				return;
			}
			callback(null, {status: 100});
		});
	});
};

// 封盘
var disableGame = function(callback) {

	var period = _getCurrentDateStr();
	sql.query('select id from confessed_games where status="0" and id="' + period + '"', function(err, result) {
		if (err) {
			callback(err);
			return;
		}
		if (result.length <= 0) {
			callback(null, {status: 101});
			return;
		}
		var id = result[0].id;
		sql.query('update confessed_games set status="2"', function(err, result) {
			if (err) {
				callback(err);
				return;
			}
			callback(null, {status: 100});
		});
	});
};

module.exports = {

	createGame: createGame,
	disableGame: disableGame
};
