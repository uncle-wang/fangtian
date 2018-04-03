var nodeEnv = process.env.NODE_ENV;
var mysql, payment;
if (nodeEnv === 'production') {
	mysql = {
		host: 'localhost',
		user: 'root',
		password: '90opl;./OP',
		database: 'ft'
	};
}
else {
	mysql = {
		host: 'localhost',
		user: 'root',
		password: 'mysql',
		database: 'ft_test'
	};
}
payment = {
	APIKEY: '8fc01808-8650-4701-89d8-f3ba46afd2eb',
	APIUSER: 'a7026c0e',
	TYPE: 2
};

module.exports = {

	PAYMENT: payment,
	MYSQL: mysql
};
