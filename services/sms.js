var SMSCONFIG = require('./../config').SMS;
var SMSClient = require('@alicloud/sms-sdk');

//初始化sms_client
var client = new SMSClient({accessKeyId: SMSCONFIG.ACCESSKEYID, secretAccessKey: SMSCONFIG.ACCESSKEY});

// 发送短信
var _sendMessage = function(tel, template, param) {

	var options = {
		PhoneNumbers: tel.toString(),
		SignName: SMSCONFIG.SIGNNAME,
		TemplateCode: template,
		TemplateParam: JSON.stringify(param)
	};

	return client.sendSMS(options).then(res => {
		return new Promise((resolve, reject) => {
			if (res.Code === 'OK') {
				resolve();
			}
			else {
				reject({status: 7002, desc: res});
			}
		});
	}).catch(err => {
		return Promise.reject({status: 7001, desc: err});
	});
};

// 短信模板列表
var templates = [
	// 注册
	'SMS_136165203',
	// 重置密码
	'SMS_136160213',
	// 绑定支付宝
	'SMS_136170250',
	// 绑定微信
	''
];

// 发送验证码
var sendVerifyCode = function(tel, code, type) {

	var templateId = templates[type];
	return _sendMessage(tel, templateId, {code: code.toString()});
};

module.exports = {

	sendVerifyCode: sendVerifyCode
};
