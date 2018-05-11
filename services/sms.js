var SMSCONFIG = require('./../config').SMS;
var SMSClient = require('@alicloud/sms-sdk');

//初始化sms_client
var client = new SMSClient({accessKeyId: SMSCONFIG.ACCESSKEYID, secretAccessKey: SMSCONFIG.ACCESSKEY});

// 发送短信
var _sendMessage = function(phone, template, param) {

	var options = {
		PhoneNumbers: phone.toString(),
		SignName: SMSCONFIG.SIGNNAME,
		TemplateCode: template,
		TemplateParam: JSON.stringify(param)
	};

	client
	.sendSMS(options)
	.then(
		// 成功
		function(res) {
			console.log(res);
		},
		// 失败
		function (err) {
			console.log(err);
		}
	);
};

// 注册验证码
var sendRegisterCode = function(phone, code) {

	_sendMessage(phone, 'SMS_134775129', {code: code.toString()});
};

module.exports = {

	sendRegisterCode: sendRegisterCode
};
