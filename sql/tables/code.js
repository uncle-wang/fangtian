const query = require('./../query');

const methods = {

	// 验证码有效并返回验证码id
	async getIdByValidCode({tel, type, code, conn}) {

		const params = [tel, type, Date.now() - 300000];
		const selector = 'select id,code from code where tel=? and type=? and consumed=0 and create_time>? for update';
		const result = await query({selector, params, conn});
		for (let i = 0; i < result.length; i ++) {
			const codeInfo = result[i];
			if (codeInfo.code === code) {
				return codeInfo.id;
			}
		}
		return Promise.reject({status: 8001});
	},
	// 将验证码置为已使用状态
	async consumeCode({id, conn}) {

		const params = [id];
		const selector = 'update code set consumed=1 where id=?';
		return query({selector, params, conn});
	},
	// 验证是否可以申请验证码
	async checkCanGet({tel, type, conn}) {

		const nowStamp = Date.now();
		const params = [tel, type];
		const selector = 'select * from code where tel=? and type=? order by create_time desc';
		const result = await query({selector, params, conn});
		const [latestCodeInfo] = result;
		// 1分钟之内只能申请一次验证码
		if (latestCodeInfo && (nowStamp - latestCodeInfo.create_time < 60000)) {
			return Promise.reject({status: 8002});
		}
		return;
	},
	// 生成验证码
	async insert({tel, type, code, conn}) {

		const params = [code, type, tel, Date.now()];
		const selector = 'insert into code(code,type,tel,create_time) values(?,?,?,?)';
		return query({selector, params, conn});
	},
};

module.exports = methods;
