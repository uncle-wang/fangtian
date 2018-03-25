var confessed = require('./confessed');
var schedule = require('node-schedule');

// 每日16点创建公开游戏局
schedule.scheduleJob('0 0 16 * * *', function() {

	confessed.createGame(function(err, result) {

		console.log(err, result);
	});
});

// 每日14:30封盘
schedule.scheduleJob('0 30 14 * * *', function() {

	confessed.disableGame(function(err, result) {

		console.log(err, result);
	});
});
