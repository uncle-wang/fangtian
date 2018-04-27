/*
	状态码
	1000-成功
	1001-需要登陆
	1002-参数错误
	1003-服务器错误
	2001-用户已存在(注册)
	2002-用户不存在
	2003-用户余额不足
	2004-用户已登录(登录)
	2005-用户密码错误
	3001-订单不存在
	3002-订单已失效
	3003-订单发起人与响应人冲突
	4001-游戏不存在
	4002-游戏已不再接受下单
	4003-游戏已存在
	4004-游戏未封盘
	5001-更新余额错误
*/

module.exports = function(app) {

	// 用户端
	require('./webCtrl')(app);
	// 管理员端
	require('./adminCtrl')(app);
	// 定时任务
	require('./schedules');
};
