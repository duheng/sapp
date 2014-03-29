var prefix = 'sapp::debug:>>>>>>>>';

// 监控状态机
sApp.Plus.SAop.before('change', function(n, s) {
	var args = Array.prototype.slice.call(arguments, 2);
	console.log(prefix + n + ':' + s);
	args.length > 0 && console.log('\t\t>', args);
}, sApp.Plus.FSM);

// 监控错误
sApp.Plus.SAop.after('throwError', function(m, obj) {
	console.log(prefix + 'error:%c' + m, 'color:red');
	if (obj) {
		console.log(obj);
	}
}, sApp);
// 监控log
// sApp.Plus.SAop.after('log',function(m){
//	console.log(prefix+'log:'+m);
// },sApp);

// iscroll 监控
// sApp.Plus.SAop.before('_end',function(){
// 	console.log(prefix+'iscroll:%c _end','color:red');
// },iScroll.prototype);
// sApp.Plus.SAop.before('_move',function(){
// 	console.log(prefix+'iscroll:%c _move','color:red');
// },iScroll.prototype);
// sApp.Plus.SAop.before('_resize',function(){
// 	console.log(prefix+'iscroll:%c _resize','color:red');
// },iScroll.prototype);
// sApp.Plus.SAop.before('_transitionEnd',function(){
// 	console.log(prefix+'iscroll:%c _transitionEnd','color:red');
// },iScroll.prototype);
// sApp.Plus.SAop.before('_wheel',function(){
// 	console.log(prefix+'iscroll:%c _wheel','color:red');
// },iScroll.prototype);
// sApp.Plus.SAop.before('handleEvent',function(){
// 	console.log(prefix+'iscroll:%c handleEvent','color:red');
// },iScroll.prototype);
// sApp.Plus.SAop.before('_snap',function(){
// 	console.log(prefix+'iscroll:%c _snap','color:red');
// },iScroll.prototype);
// sApp.Plus.SAop.before('_pos',function(){
// 	console.log(prefix+'iscroll:%c _pos','color:red');
// },iScroll.prototype);
// sApp.Plus.SAop.before('refresh',function(){
// 	console.log(prefix+'iscroll:%c refresh','color:red');
// },iScroll.prototype);
// sApp.Plus.SAop.before('destroy',function(){
// 	console.log(prefix+'iscroll:%c destroy','color:red');
// },iScroll.prototype);
console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>sop debug<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');