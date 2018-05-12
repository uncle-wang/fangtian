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

	client
	.sendSMS(options)
	.then(
		// 成功
		function(res) {
			if (res.Code !== 'OK') {
				console.log({status: 7002, desc: res});
			}
		},
		// 失败
		function(err) {
			console.log({status: 7001, desc: err});
		}
	);
};

// 验证码
var sendVerifyCode = function(tel, code) {

	_sendMessage(tel, 'SMS_134775129', {code: code.toString()});
};

module.exports = {

	sendVerifyCode: sendVerifyCode
};
