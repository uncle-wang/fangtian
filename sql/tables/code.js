const query = require('./../query');

const methods = {

	// 验证码有效并返回验证码id
	getIdByValidCode: (conn, tel, type, code) => {

		const nowStamp = Date.now();
		const selector = 'select id,code from code where tel="' + tel + '" and type="' + type + '" and consumed=0 and create_time>' + (nowStamp - 300000) + ' for update';
		return query(conn, selector).then(result => {
			return new Promise((resolve, reject) => {
				for (let i = 0; i < result.length; i ++) {
					const codeInfo = result[i];
					if (codeInfo.code === code) {
						resolve(codeInfo.id);
						return;
					}
				}
				reject({status: 8001});
			});
		});
	},
	// 将验证码置为已使用状态
	consumeCode: (conn, id) => {

		const selector = 'update code set consumed=1 where id=' + id;
		return query(conn, selector);
	},
	// 验证是否可以申请验证码
	checkCanGet: (conn, tel, type) => {

		const nowStamp = Date.now();
		const selector = 'select * from code where tel="' + tel + '" and type="' + type + '" order by create_time desc';
		return query(conn, selector).then(result => {
			return new Promise((resolve, reject) => {
				const [latestCodeInfo] = result;
				// 1分钟之内只能申请一次验证码
				if (latestCodeInfo && (nowStamp - latestCodeInfo.create_time < 60000)) {
					reject({status: 8002});
					return;
				}
				resolve();
			});
		});
	},
	// 生成验证码
	insert: (conn, tel, type, code) => {

		const nowStamp = Date.now();
		const selector = 'insert into code(code,type,tel,create_time) values("' + code + '","' + type + '","' + tel + '",' + nowStamp + ')';
		return query(conn, selector);
	},
};

module.exports = methods;
