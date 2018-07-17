const query = require('./../query');

const methods = {

	// 添加订单
	async insert({type, userid, gameid, quota, conn}) {

		const params = [type, userid, gameid, quota, Date.now()];
		const selector = 'insert into confessed_orders(type,user,game_id,amount,create_time) values(?,?,?,?,?)';
		return query({selector, params, conn});
	},
	// 查询历史订单
	async getHistory({conn, userid}) {

		const params = [userid];
		const selector = 'select * from confessed_orders where user=? order by create_time desc';
		return query({selector, params, conn});
	},
};

module.exports = methods;
