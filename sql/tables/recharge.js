const query = require('./../query');

const methods = {

	// 创建充值订单
	async insert({userid, quota, conn}) {

		const params = [userid, quota, Date.now()];
		const selector = 'insert into recharge(user,quota,create_time) values(?,?,?)';
		const result = await query({selector, params, conn});
		return result.insertId;
	},
	// 获取指定用户的充值记录
	async getListByUserid({userid, conn}) {

		const params = [userid];
		const selector = 'select * from recharge where user=? order by create_time desc';
		return query({selector, params, conn});
	},
	// 获取充值订单详细信息
	async getInfo({id, forupdate, conn}) {

		const params = [id];
		const selector = 'select * from recharge where id=?' + (forupdate ? ' for update' : '');
		const result = await query({selector, params, conn});
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

		const params = [id];
		const selector = 'update recharge set status="1" where id=?';
		return query({selector, params, conn});
	},
	// 删除订单
	async cancel({id, conn}) {

		const params = [id];
		const selector = 'delete from recharge where id=?';
		return query({selector, params, conn});
	},
};

module.exports = methods;
