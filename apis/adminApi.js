// 加载sql模块
var sql = require('./../services/sql');

// 创建游戏局
var createGame = function(id, createtime, disabletime, closetime, callback) {

	sql.query('select id from confessed_games where status<>"1"', function(errA, resultA) {

		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		// 存在尚未结束的对局
		if (resultA.length > 0) {
			callback({status: 4003});
			return;
		}

		sql.query('insert into confessed_games(id,create_time,disable_time,close_time) values("' + id + '",' + createtime + ',' + disabletime + ',' + closetime + ')', function(errB, resultB) {
			if (errB) {
				callback({status: 1003, desc: errB});
				return;
			}
			callback({status: 1000});
		});
	});
};

// 封盘
var disableGame = function(id, callback) {

	sql.query('select * from confessed_games where id="' + id + '"', function(errA, resultA) {
		if (errA) {
			callback({status: 1003, desc: errA});
			return;
		}
		if (resultA.length <= 0) {
			callback({status: 4001});
			return;
		}
		var gameInfo = resultA[0];
		if (gameInfo.status !== '0') {
			callback({status: 4002});
			return;
		}
		sql.query('update confessed_games set status="2" where id="' + gameInfo.id + '"', function(errB, resultB) {
			if (errB) {
				callback({status: 1003, desc: errB});
				return;
			}
			callback({status: 1000});
		});
	});
};

// 更新结果
var updateGameResult = function(id, result, callback) {

	callback({status: 1000});
};

module.exports = {

	createGame: createGame,
	disableGame: disableGame,
	updateGameResult: updateGameResult
};
