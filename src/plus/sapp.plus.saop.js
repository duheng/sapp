/**
 * aop的javascript实现
 * author :	build by awen@2013-11-8
 * version :	1.0
 * 参数说明：
 * funcname:要处理的函数的名称（字符串）
 * context:要处理函数的命名空间,默认window（所属对象）
 * beforefunc:添加一次在监控对象的方法之前执行的函数，获得的参数与原参数相同，可以返回处理过的参数数组,如果不返回则原方法使用最初的参数。
 * afterfunc:添加一次在监控对象的防止之后执行的函数，获得的参数与原参数相同，并将原函数的返回值做为参数补后传入，如果有返回值将覆盖原来的返回值
 * roundfunc:func中使用this.yield()将执行一遍原方法。类似php中的yield，将执行权限交给原函数
 * */
sApp.Plus.SAop = {
	// 1添加一次在监控对象的方法之前执行的函数，beforefunc获得的参数与原参数相同。
	// 2可以返回处理过的参数数组,如果不返回则原方法使用最初的参数，
	// 3如果存在4个以上的参数，将传递个beforefunc参数使用，方式 补后
	before: function(funcname, beforefunc, context) {
		var orignfunc, _args = arguments;
		context = context ? context : window;
		orignfunc = context[funcname];
		context[funcname] = function() {
			var cxt = this,
				args = Array.prototype.slice.call(arguments),
				newargs,
				selfargs = Array.prototype.slice.call(_args, 3);
			selfargs = args.concat(selfargs);
			newargs = beforefunc.apply(cxt, selfargs) || args;
			return orignfunc && orignfunc.apply(cxt, newargs);
		};
	},
	// 1添加一次在监控对象的防止之后执行的函数，
	// 2afterfunc参数与原参数相同，并将原函数的返回值做为参数补后传入，如果有返回值将覆盖原来的返回值
	// 3如果存在4个以上的参数，将传递个beforefunc参数使用，方式 补后
	after: function(funcname, afterfunc, context) {
		var orignfunc, _args = arguments;
		context = context ? context : window;
		orignfunc = context[funcname];

		context[funcname] = function() {
			var cxt = this,
				args = Array.prototype.slice.call(arguments),
				selfargs = Array.prototype.slice.call(_args, 3),
				ret = orignfunc && orignfunc.apply(cxt, args);
			// 注意自定义参数和返回值的位置顺序
			if (ret) {
				args.push(ret);
			}
			selfargs = args.concat(selfargs);
			ret = afterfunc.apply(cxt, selfargs) || ret;
			return ret;
		};
	},
	// 1 yield 实现 func中使用this.yield()将执行一遍原方法。仿java
	// 2 如果存在4个以上的参数，将传递个beforefunc参数使用，方式 补后
	around: function(funcname, func, context) {
		var orignfunc, _args;
		context = context ? context : window;
		orignfunc = context[funcname];

		context[funcname] = function() {
			var args = Array.prototype.slice.call(arguments),
				selfargs = Array.prototype.slice.call(arguments, 3);
			this.yield = function(args) {
				return function() {
					return orignfunc && orignfunc.apply(this, args);
				};
			}(args);
			func.apply(this, selfargs);
		};
	}
};