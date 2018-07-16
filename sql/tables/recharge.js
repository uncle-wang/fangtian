const query = require('./../query');

const methods = {

	// 创建充值订单
	async insert({userid, quota, conn}) {

		const nowStamp = Date.now();
		const selector = 'insert into recharge(user,quota,create_time) values(' + userid + ',' + quota + ',' + nowStamp + ')';
		const result = await query(selector, conn);
		return result.insertId;
	},
	// 获取指定用户的充值记录
	async getHistoryByUserid({userid, conn}) {

		const selector = 'select * from recharge where user=' + userid + ' order by create_time desc';
		return query(selector, conn);
	},
	// 获取充值订单详细信息
	async getInfo({id, forupdate, conn}) {

		const selector = 'select * from recharge where id=' + id + (forupdate ? ' for update' : '');
		const result = await query(selector, conn);
		const [rechargeInfo] = result;
		if (rechargeInfo) {
			return rechargeInfo;
		}
		else {
			return Promise.reject({status: 9001});
		}
	},
	// 修改充值订单为已支付状态
	async payed({id, conn}) {

		const selector = 'update recharge set status="1" where id=' + id;
		return query(selector, conn);
	},
};

module.exports = methods;
