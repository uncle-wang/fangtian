/****************参数检查****************/
var inspect = function(param) {

	if (param instanceof Array) {
		this.params = param;
	}
	else {
		this.params = [param];
	}
};
// 长度大于0且不大于16
inspect.prototype.lessThan16 = function() {
	
	var params = this.params;
	for (var i = 0; i < params.length; i ++) {
		var v = params[i];
		if (!v || v.length <= 0 || v.length > 16) {
			return false;
		}
	}
	return true;
};

module.exports = inspect;
