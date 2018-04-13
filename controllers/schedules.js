var adminApi = require('./../apis/adminApi');
var schedule = require('node-schedule');

// 每日16点创建公开游戏局
schedule.scheduleJob('0 0 16 * * *', function() {

	adminApi.createGame(function(err, result) {

		console.log(err, result);
	});
});

// 每日14:30封盘
schedule.scheduleJob('0 30 14 * * *', function() {

	adminApi.disableGame(function(err, result) {

		console.log(err, result);
	});
});
