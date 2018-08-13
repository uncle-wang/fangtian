// promise封装
const _promise = (bool, errorcode) => {

	if (bool) {
		return Promise.resolve();
	}
	else {
		return Promise.reject({status: errorcode});
	}
};
// 正则表达式
const _regTest = (param, reg, errorcode) => {

	return _promise(reg.test(param), errorcode);
};
// 是否有值
const _hasSet = (p, errorcode) => {

	return _promise(p ? true : false, errorcode);
};

const methods = {

	// 密码(8-16位非空白字符)
	password: p => {

		return _regTest(p, /^\S{8,16}$/, 1201);
	},
	// 手机号
	phonenumber: p => {

		return _regTest(p, /^1\d{10}$/, 1202);
	},
	// 短信验证码
	smscode: p => {

		return _regTest(p, /^\d{6}$/, 1203);
	},
	// 支付方式
	payment: p => {

		const s = (p === '0' || p === '1');
		return _promise(s, 3005);
	},
	// 支付宝
	alipay: p => {

		const regA = /^1\d{10}$/;
		const regB = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
		return _promise(regA.test(param) || regB.test(param), 1204);
	},
	// 微信
	wechat: p => {

		const regA = /^1\d{10}$/;
		const regB = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
		return _promise(regA.test(param) || regB.test(param), 1204);
	},
	// 充值金额
	rechargequota: p => {

		const arr = ['10', '30', '100', '300', '1000', '2000', '5000', '10000'];
		p = p.toString();
		return _promise(arr.indexOf(p) > -1, 1205);
	},
	// 重定向url
	redirect: p => {

		return _hasSet(p, 1206);
	},
	// recharge id
	rechargeid: p => {

		return _regTest(p, /^\d{1,10}$/, 1207);
	},
	// 下单金额
	orderquota: p => {

		const arr = ['10', '30', '100', '300', '1000', '2000', '5000', '10000'];
		p = p.toString();
		return _promise(arr.indexOf(p) > -1, 1208);
	},
	// 提现金额
	pickupquota: p => {

		return _regTest(p, /^[1-9]\d{2,}$/, 1209);
	},
	// pickup id
	pickupid: p => {

		return _regTest(p, /^\d{1,10}$/, 1210);
	},
	// game id
	gameid: p => {

		return _regTest(p, /^\d{1,10}$/, 1211);
	},
	// order type
	ordertype: p => {

		return _promise((p === '0' || p === '1'), 1212);
	},
};

module.exports = methods;
