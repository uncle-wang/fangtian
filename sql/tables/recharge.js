const query = require('./../query');

const methods = {

	// 创建充值订单
	insert: (conn, userid, quota) => {

		const nowStamp = Date.now();
		const selector = 'insert into recharge(user,quota,create_time) values(' + userid + ',' + quota + ',' + nowStamp + ')';
		return query(conn, selector).then(result => {
			return Promise.resolve(result.insertId);
		});
	},
	// 获取指定用户的充值记录
	getHistoryByUserid: (conn, userid) => {

		const selector = 'select * from recharge where user=' + userid + ' order by create_time desc';
		return query(conn, selector);
	},
	// 获取充值订单详细信息
	getInfo: (conn, id, update) => {

		const selector = 'select * from recharge where id=' + id + (update ? ' for update' : '');
		return query(conn, selector).then(result => {
			const [rechargeInfo] = result;
			if (rechargeInfo) {
				return Promise.resolve(rechargeInfo);
			}
			else {
				return Promise.reject({status: 9001});
			}
		});
	},
	// 修改充值订单为已支付状态
	payed: (conn, id) => {

		const selector = 'update recharge set status="1" where id=' + id;
		return query(conn, selector);
	},
};

module.exports = methods;
