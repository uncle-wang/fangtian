const query = require('./../query');

const methods = {

	// 根据id获取正在接收投注的游戏信息并等待编辑
	getOpenGameById: (conn, id) => {

		const selector = 'select * from confessed_games where id="' + id + '" for update';
		return query(conn, selector).then(result => {
			return new Promise((resolve, reject) => {
				const [gameInfo] = result;
				if (gameInfo) {
					if (gameInfo.status !== '0') {
						reject({status: 4002});
					}
					else {
						resolve(gameInfo);
					}
				}
				else {
					reject({status: 4001});
				}
			});
		});
	},
	// 更新投注金额
	updateAmount: (conn, typeName, amount, id) => {

		const selector = 'update confessed_games set ' + typeName + '=' + amount + ' where id=' + id;
		return query(conn, selector);
	},
};

module.exports = methods;
