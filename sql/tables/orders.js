const query = require('./../query');

const methods = {

	insert: (conn, type, userid, gameid, quota) => {

		const selector = 'insert into confessed_orders(type,user,game_id,amount,create_time) values(' + type + ',' + userid + ',"' + gameid + '",' + quota + ',' + Date.now() + ')';
		return query(conn, selector);
	},
};

module.exports = methods;
