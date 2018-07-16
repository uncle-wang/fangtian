const query = require('./../query');

const methods = {

	// 添加订单
	async insert({type, userid, gameid, quota, conn}) {

		const selector = 'insert into confessed_orders(type,user,game_id,amount,create_time) values(' + type + ',' + userid + ',"' + gameid + '",' + quota + ',' + Date.now() + ')';
		return query(selector, conn);
	},
	// 查询历史订单
	async getHistory({conn, userid}) {

		const selector = 'select * from confessed_orders where user=' + userid + ' order by create_time desc';
		return query(selector, conn);
	},
};

module.exports = methods;
