/**
 * 智能心跳包  build by awen  2013-11-5
 * author: awen
 * version: 1.0
 * descr:已经实现功能如下：
 *	1	定时器功能
 *  2	定时过程中可以改变心跳
 *  3	中断
 *  4	睡眠
 *  5	苏醒
 *  6	各种状态监听
 */
(function(O) {
	var T_stack = {}, //心跳机列表：key为name,value为{name:,id:timerid,start:(ms),step:(ms),_step:(ms初始step,请不要随便修改),sleepstep:(ms),ttl:(ms),progress:,callback:}
		create = function(name, cfg) {
			var st, ttl, step, progress, callback, auto, sleepstep;
			// 检查以前是否有该name的心跳机，有则取消
			if (name in T_stack) {
				console.log('Timer>>>>>>>>>>>>>>>>>>>心跳机已经存在:' + name);
				return false;
			}
			// Timer.stop(name);
			// 参数初始化
			cfg = cfg || {};
			step = 'step' in cfg ? cfg.step : 1;
			sleepstep = 'sleepstep' in cfg ? cfg.sleepstep : false;
			ttl = 'ttl' in cfg ? cfg.ttl : 0;
			callback = 'callback' in cfg ? cfg.callback : false;
			st = +new Date;
			// 加入心跳机列表
			T_stack[name] = {
				name: name,
				id: 0,
				counter: 0,
				step: step,
				sleepstep: sleepstep,
				_step: step * 1000,
				ttl: ttl,
				start: st,
				callback: callback
			};
			// 记时循环程序
			(function(n, stack) {
				var nt, fn, timer = stack[n];
				if (!timer) {
					return false;
				}
				fn = timer['callback'];
				nt = new Date - timer.start;
				if (timer.ttl && nt >= timer.ttl * 1000) {
					stop(n, true);
					fn && fn.call(O.Timer, 'timeout', timer);
				} else {
					// 第一次心跳应该在延时后发生，而不应该在创建的时候发生
					if (timer['id'] > 0) {
						timer.counter++;
						fn && fn.call(O.Timer, 'progress', timer);
					}
					// 重新判断一下，防止上面的用户回调中被stop，timer是不可靠的，因为stop删除的只是key，而值被timer保留了
					if (n in stack) {
						timer['id'] = setTimeout(arguments.callee, timer['_step'], n, stack);
					}
				}
			})(name, T_stack);
		},
		modify = function(name, cfg) {
			if (cfg && name in T_stack) {
				var timer = T_stack[name];
				for (var k in cfg) {
					switch (k) {
						case 'ttl':
						case '_step':
							timer[k] = cfg[k] ? cfg[k] : timer[k];
							break;
						case 'step':
						case 'sleepstep':
							if (cfg[k] > 0) {
								var step = cfg[k];
								// 判断没有睡眠
								if (timer[k] * 1000 == timer._step) {
									timer._step = step * 1000;
								}
								timer[k] = step;
							}
							break;
							timer[k] = cfg[k] > 0 ? cfg[k] : timer[k];
							break;
						default:
							timer[k] = cfg[k];
							break;
					}
				}
				// timer['callback'] && timer['callback'].call(Timer,'modify',timer);
			} else {
				console.log('Timer>>>>>>>>>>>>>>>>>>>心跳机不存在:' + name);
			}
		},
		sleep = function(name) {
			var step, timer = T_stack[name];
			if (name && timer) {
				step = timer['sleepstep'];
				if (step) {
					modify(name, {
						_step: step * 1000
					});
					timer['callback'] && timer['callback'].call(O.Timer, 'sleep', timer);
				}
			}
		},
		wakeup = function(name) {
			var step, timer = T_stack[name];
			if (name && timer) {
				step = timer['step'];
				if (timer['sleepstep']) {
					modify(name, {
						_step: step * 1000
					});
					timer['callback'] && timer['callback'].call(O.Timer, 'wakeup', timer);
				}
			}
		},
		stop = function(name, istimeout) {
			var timer = T_stack[name];
			if (timer) {
				clearTimeout(timer.id);
				delete T_stack[name];
				if (!istimeout) {
					timer['callback'] && timer['callback'].call(O.Timer, 'stop', timer);
				}
			}
		},
		stopall = function() {
			for (var k in T_stack) {
				stop(k);
			};
		};
	O.Timer = {
		/**
		 * 创建心跳机
		 * @param  {string} name :　心跳机名称
		 * @param  {json} cfg :　配置
		 *           {
		 *            step : {int} 心跳间隔（s）要求大于等于0，默认为1,
		 *            ttl :　{int} 超时时间（s）默认0代表永不超时
		 *            callback : {function(state,timercfg)} 状态改变回调(progress,stop,sleep,wakeup,timeout)
		 *            sleepstep : {int} 睡眠时的心跳间隔（s）要求大于等于0，如果不设置则sleep和wakeup接口无效
		 *           }
		 */
		create: create,
		/**
		 * 修改心跳时间，睡眠状态和正常状态不会互相影响.比如睡眠状态下你修改正常心跳，心跳机依然按照睡眠心跳来运作
		 * @param  {string} name :　心跳机名称
		 * @param  {json} cfg :　配置,请尽量值修改一下参数，不要修改其他的参数
		 *           {
		 *           step : {int} 心跳间隔（s）要求大于等于0，默认为1,
		 *           ttl :　{int} 超时时间（s）默认0代表永不超时
		 *           sleepstep : {int} 睡眠时的心跳间隔（s）要求大于等于0，如果不设置则sleep和wakeup接口无效
		 *           }
		 */
		modify: modify,
		/**
		 * 睡眠,注意只有心跳机的sleepstep设置了的情况下才会生效
		 */
		sleep: sleep,
		/**
		 * 唤醒,注意只有心跳机的sleepstep设置了的情况下才会生效
		 */
		wakeup: wakeup,
		/**
		 * 取消某心跳机的运行
		 * @param  {string} name 心跳机的名称
		 */
		stop: function(name) {
			stop(name);
		},
		/**
		 * 停止所有定时器
		 */
		stopAll: stopall
	};
})(sApp.Plus);