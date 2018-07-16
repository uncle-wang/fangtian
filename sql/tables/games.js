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
	// 获取最新一局游戏信息
	getLatestGameInfo: conn => {

		const selector = 'select * from confessed_games order by id desc';
		return query(conn, selector).then(result => {
			const [gameInfo] = result;
			if (gameInfo) {
				return Promise.resolve(gameInfo);
			}
			else {
				return Promise.reject({status: 4001});
			}
		});
	},
	// 获取往期游戏记录
	getHistory: conn => {

		const selector = 'select * from confessed_games where status="1" order by create_time desc';
		return query(conn, selector);
	},
};

module.exports = methods;
