const query = require('./../query');

const methods = {

	// 创建提现订单
	async insert({conn, userid, alipay, quota, fees}) {

		const nowStamp = Date.now();
		const selector = 'insert into pickup(user,alipay,quota,fees,create_time) values(' + userid + ',"' + alipay + '",' + quota + ',' + fees + ',' + nowStamp + ')';
		return query(selector, conn);
	},
	// 获取指定用户的提现记录
	async getListByUserid({conn, userid}) {

		const selector = 'select * from pickup where user=' + userid + ' order by create_time desc';
		return query(selector, conn);
	},
	// 获取订单信息
	async getInfo({conn, id}) {

		const selector = 'select * from pickup where id=' + id + ' for update';
		const result = await query(selector, conn);
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

		const selector = 'update pickup set status="2" where id=' + id;
		return query(selector, conn);
	},
};

module.exports = methods;
