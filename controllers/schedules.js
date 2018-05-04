var request = require('request');
var schedule = require('node-schedule');
var adminApi = require('./../apis/adminApi');

// 节假日
var holidays = [
	'20180429',
	'20180430',
	'20180501',
	'20180616',
	'20180617',
	'20180618',
	'20180924',
	'20181001',
	'20181002',
	'20181003',
	'20181004',
	'20181005'
];

// 时区偏移
var tzOffset = require('./../config').TIMEZONE;

// 个位数补0
var _zeroFixed = function(v) {

	if (v < 10) {
		return '0' + v;
	}
	return '' + v;
};

// 获取当前北京时间
var getBjTime = function() {

	var d = new Date();
	d.setHours(d.getHours() + 8 - tzOffset);
	return d;
};

// 获取最近的非假日时间
var getWorkDate = function() {

	var gameId, bjTime = getBjTime();
	do {
		bjTime.setDate(bjTime.getDate() + 1);
		gameId = bjTime.getFullYear() + _zeroFixed(bjTime.getMonth() + 1) + _zeroFixed(bjTime.getDate());
	}
	while (isWeekend(bjTime) || holidays.indexOf(gameId) > -1)
	return {gameId: gameId, timeStamp: bjTime.getTime()};
};

// 判断是否周末
var isWeekend = function(d) {

	var day = d.getDay();
	if (day === 0 || day === 6) {
		return true;
	}
	return false;
};

// 拉取上证指数收盘价格
var fetchResult = function(callback) {

	request({url: 'http://yunhq.sse.com.cn:32041/v1/sh1/list/self/000001?select=code%2Clast'}, function(err, response, data) {
		var d = getBjTime();
		if (err) {
			console.log(d, '[RESULT] fetch result error', err);
			return;
		}
		if (data) {
			try {
				data = JSON.parse(data);
				callback(data);
			}
			catch (e) {
				console.log(d, '[RESULT] json parse error', data);
			}
		}
		else {
			console.log(d, '[RESULT] fetch none of data');
		}
	});
};

// 北京时间每日14:30封盘
schedule.scheduleJob('0 30 ' + (6 + tzOffset) + ' * * *', function() {

	var d = getBjTime();
	if (isWeekend(d)) {
		console.log(d, '[DISABLE] weekend');
		return;
	}
	var gameId = d.getFullYear() + _zeroFixed(d.getMonth() + 1) + _zeroFixed(d.getDate());
	if (holidays.indexOf(gameId) > -1) {
		console.log(d, '[DISABLE] holiday');
		return;
	}
	adminApi.disableGame(gameId, function(resultMap) {
		if (resultMap.status === 1000) {
			console.log(d, '[DISABLE] ok');
		}
		else {
			console.log(d, '[DISABLE] error', resultMap);
		}
	});
});

// 北京时间每日15:20更新结果
schedule.scheduleJob('0 20 ' + (7 + tzOffset) + ' * * *', function() {

	var d = getBjTime();
	if (isWeekend(d)) {
		console.log(d, '[RESULT] weekend');
		return;
	}
	var gameId = d.getFullYear() + _zeroFixed(d.getMonth() + 1) + _zeroFixed(d.getDate());
	if (holidays.indexOf(gameId) > -1) {
		console.log(d, '[RESULT] holiday');
		return;
	}
	fetchResult(function(data) {
		if (data.date && data.date.toString() !== gameId) {
			console.log(d, '[RESULT] date not match', data);
			return;
		}
		var list = data.list;
		if (list) {
			var szData = list[0];
			if (szData) {
				var code = szData[0];
				var resultNumber = szData[1];
				if (code === '000001' && resultNumber) {
					adminApi.updateGameResult(gameId, resultNumber, function(resultMap) {
						if (resultMap.status === 1000) {
							console.log(d, '[RESULT] ok');
						}
						else {
							console.log(d, '[RESULT] error', resultMap);
						}
					});
					return;
				}
			}
		}
		console.log(d, '[RESULT] invalid data', data);
	});
});

// 北京时间每日16:00开盘
schedule.scheduleJob('0 0 ' + (8 + tzOffset) + ' * * *', function() {

	var current = new Date();
	var workDateObj = getWorkDate();
	// 封盘时间
	var disableTime = new Date(workDateObj.timeStamp);
	disableTime.setHours(14);
	disableTime.setMinutes(30);
	disableTime.setSeconds(0);
	disableTime.setHours(disableTime.getHours() - 8 + tzOffset);
	// 关闭时间
	var closeTime = new Date(workDateObj.timeStamp);
	closeTime.setHours(15);
	closeTime.setMinutes(20);
	closeTime.setSeconds(0);
	closeTime.setHours(closeTime.getHours() - 8 + tzOffset);
	adminApi.createGame(workDateObj.gameId, disableTime.getTime(), closeTime.getTime(), function(resultMap) {
		if (resultMap.status === 1000) {
			console.log(current, '[NEWGAME] ok');
		}
		else {
			console.log(current, '[NEWGAME] error', resultMap);
		}
	});
});
