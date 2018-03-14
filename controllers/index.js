module.exports = function(app) {
	require('./webCtrl')(app);
	require('./adminCtrl')(app);
};