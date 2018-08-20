const md5 = require('md5');
const CONFIG = require('./../config').PAYMENT;

const gen = (orderId, priceInt, redirectUrl) => {
	// 参数
	const api_key = CONFIG.APIKEY;
	const api_user = CONFIG.APIUSER;
	const order_id = orderId;
	const order_info = CONFIG.CALLBACKKEY;
	const price = priceInt + '.00';
	const redirect = redirectUrl;

	const param_str = api_key + api_user + order_id + order_info + price + redirect;
	const signature_alipay = md5(param_str + '2');
	const signature_wechat = md5(param_str + '1');
	return {
		signature_alipay,
		signature_wechat,
		order_info,
	};
};

const check = data => {

	const apiKey = CONFIG.APIKEY;
	const orderId = data.order_id;
	const orderInfo = data.order_info;
	const ppzOrderId = data.ppz_order_id;
	const price = data.price;
	const realPrice = data.real_price;
	const signature = data.signature;
	// 校验
	if (signature === md5(apiKey + orderId + orderInfo + ppzOrderId + price + realPrice)) {
		// 实际支付允许0.1元的误差
		if (Number(price) - Number(realPrice) <= 0.1) {
			// 环境校验
			if (orderInfo === CONFIG.CALLBACKKEY) {
				return true;
			}
		}
	}
	return false;
};

module.exports = {gen, check};
