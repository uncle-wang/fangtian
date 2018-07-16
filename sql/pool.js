// mysql
const mysql = require('mysql');
// config
const options = require('./../config').MYSQL;
// 连接池
const pool = mysql.createPool(options);

module.exports = pool;
