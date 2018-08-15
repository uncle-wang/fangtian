const query = require('./../query');

const methods = {

	// 根据id获取正在接收投注的游戏信息并等待编辑
	async getOpenGameById({id, conn}) {

		const params = [id];
		const selector = 'select * from confessed_games where id=? for update';
		const result = await query({selector, params, conn});
		const [gameInfo] = result;
		if (gameInfo) {
			if (gameInfo.status !== '0') {
				return Promise.reject({status: 4002});
			}
			else {
				return gameInfo;
			}
		}
		else {
			return Promise.reject({status: 4001});
		}
	},
	// 创建
	async insert({id, disabletime, closetime, conn}) {

		const params = [id, Date.now(), disabletime, closetime];
		const selector = 'insert into confessed_games(id,create_time,disable_time,close_time) values(?,?,?,?)';
		return query({selector, params, conn});
	},
	// 删除
	async remove({id, conn}) {

		const selector = 'delete from confessed_games where id=?';
		return query({selector, params: [id], conn});
	},
	// 结束游戏
	async end({id, conn}) {

		const selector = 'update confessed_games set status="1" where id=?';
		return query({selector, params: [id], conn});
	},
	// 封盘
	async disable({id, conn}) {

		const selector = 'update confessed_games set status="2" where id=?';
		return query({selector, params: [id], conn});
	},
	// 更新投注金额
	async updateAmount({typename, amount, id, conn}) {

		const params = [amount, id];
		const selector = 'update confessed_games set ' + typename + '=? where id=?';
		return query({selector, params, conn});
	},
	// 获取最新一局游戏信息
	async getLatestGameInfo(conn) {

		const selector = 'select * from confessed_games order by id desc';
		const result = await query({selector, conn});
		const [gameInfo] = result;
		if (gameInfo) {
			return gameInfo;
		}
		else {
			return Promise.reject({status: 4001});
		}
	},
	// 获取往期游戏记录
	async getHistory(conn) {

		const selector = 'select * from confessed_games order by create_time desc';
		return query({selector, params, conn});
	},
};

module.exports = methods;
