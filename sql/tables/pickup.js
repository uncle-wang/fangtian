const query = require('./../query');

const methods = {

	// 创建提现订单
	async insert({conn, userid, alipay, wechat, quota, fees}) {

		let payment, account;
		if (alipay) {
			payment = 'alipay';
			account = alipay;
		}
		else {
			payment = 'wechat';
			account = wechat;
		}
		const params = [userid, account, quota, fees, Date.now()];
		const selector = 'insert into pickup(user,' + payment + ',quota,fees,create_time) values(?,?,?,?,?)';
		return query({selector, params, conn});
	},
	// 获取指定用户的提现记录
	async getListByUserid({conn, userid}) {

		const params = [userid];
		const selector = 'select * from pickup where user=? order by create_time desc';
		return query({selector, params, conn});
	},
	// 获取订单信息
	async getInfo({conn, id}) {

		const params = [id];
		const selector = 'select * from pickup where id=? for update';
		const result = await query({selector, params, conn});
		const [pickupInfo] = result;
		if (pickupInfo) {
			return pickupInfo;
		}
		else {
			return Promise.reject({status: 3001});
		}
	},
	// 取消提现操作
	async cancel({conn, id}) {

		const params = [id];
		const selector = 'update pickup set status="2" where id=?';
		return query({selector, params, conn});
	},
	// 删除
	async remove({conn, id}) {

		const selector = 'delete from pickup where id=?';
		return query({selector, params: [id], conn});
	},
};

module.exports = methods;
