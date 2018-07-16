const query = require('./../query');

const methods = {

	// 验证码有效并返回验证码id
	async getIdByValidCode({tel, type, code, conn}) {

		const nowStamp = Date.now();
		const selector = 'select id,code from code where tel="' + tel + '" and type="' + type + '" and consumed=0 and create_time>' + (nowStamp - 300000) + ' for update';
		const result = await query(selector, conn);
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

		const selector = 'update code set consumed=1 where id=' + id;
		return query(selector, conn);
	},
	// 验证是否可以申请验证码
	async checkCanGet({tel, type, conn}) {

		const nowStamp = Date.now();
		const selector = 'select * from code where tel="' + tel + '" and type="' + type + '" order by create_time desc';
		const result = await query(selector, conn);
		const [latestCodeInfo] = result;
		// 1分钟之内只能申请一次验证码
		if (latestCodeInfo && (nowStamp - latestCodeInfo.create_time < 60000)) {
			return Promise.reject({status: 8002});
		}
		return;
	},
	// 生成验证码
	async insert({tel, type, code, conn}) {

		const nowStamp = Date.now();
		const selector = 'insert into code(code,type,tel,create_time) values("' + code + '","' + type + '","' + tel + '",' + nowStamp + ')';
		return query(selector, conn);
	},
};

module.exports = methods;
