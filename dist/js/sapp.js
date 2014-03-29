/*
 * name		:sApp html5应用框架
 * Version	:1.0
 * author	:build by awen ~ 71752352@qq.com ~ 2013-10-10
	结构	:sApp
				|__Core	*		(引擎内核，不对外开放)
				|__FSM			(有限循环状态机)
				|__Config		(配置文件)
				|__Langs		(语言包)
				|__Dao			(数据接口)
				|__Cache		(数据缓存)
				|__UI			(页面控件集合)
					|__Dialog	(对话框)
					|__Mask		(蒙版)
				|__Page			(页面控制)
				|__Util			(常用工具集)
					
				|__Env			(设备信息)
				|__Plus			(扩展以及插件集合)
					|__sImageLazyLoad	(图片懒加载）
					|__Slider			(无限循环幻灯)
					|__Scroll			(滚动条插件)
					|__Timer			(心跳机)
					|__Storage			(localStorage本页变化监控实现)
 * workes:	
1 页面间动画
2 内存管理，隐藏未显示页面算不算？
3 div的滚动条 懒加载未监控，
4 滚动条下一页按钮时  应该是div的滚动条还是win的滚动条？

descr : [[[只需要一个配置文件，配上模板和样式  一个app诞生了]]]
	1 资源加载在内核中自动执行，属于引擎初始化工作
	2 滚动条支持iscroll和下一页按钮，更好的兼容低端机
	3 数据请求支持缓存，和强刷
	4 页面切换多种动画
	5 图片懒加载更加智能，智能监控iscroll和window滚动条
	6 状态机机制 流程更加清晰，让写代码按流程来写
	7 实现aop，灵活的插件，log
	8 多语言实现，只需要 重写 sApp.Langs 语言对象就可以了
	9 localStorage实现本页面监控，暂时不做使用，预留
 */
(function() {
	var W, D, NG, stacks, ua, sApp, Config,
		IS_WEBKIT, OSs, os, support, appPath, dialog, tplcnt;
	W = window;
	D = document;
	NG = navigator;
	ua = NG.userAgent;
	/*********************************内核↓*********************************start***/
	Config = {
		G_IMGTRUESRCATTR: null, // 懒加载真实图片地址所在属性data-isrc默认
		G_AJAXTIMEOUT: 60, // 全局ajax超时时间（s）	
		// G_CACHE : true,				// 是否开启数据缓存   更改到渲染单元设置，目前已经费用， 通过G_CACHETIMEOUT来控制
		G_CACHETIMEOUT: 5 * 60, // 全局数据缓存过期时间（s）  ，各个渲染单元可以单独设置
		G_PAGETRANS: 3, // 页面切换特效  完成
	};
	sApp = {
		version: '1.0',
		sign: 'sapp_awen',
		// 默认全局配置区
		Config: Config,
		// 语言
		Langs: {
			// error
			'noconfig': '没有配置文件',
			'nomain': '请确定首页',
			'nopage': '没有页面',
			'offline': '应用需要连接网络，请检查您的网络设置。',
			'configerr': '缺少必要的配置信息，请检查',
			'codeerror': '发生代码错误，请检查',
			//ui
			'config': '解析配置文件...',
			'coreinit': '初始化引擎...',
			'coreok': '初始化引擎...success',
			'tplinit': '初始化模板...',
			'tplok': '初始化模板...success',
			'appok': 'app初始化成功...success',
			// 'init'	: '引擎初始化中，请稍后...',
			'loading': '努力加载中...请不要着急...',
			'ajaxtimeout': '网络数据请求超时，请重试',
			'btn_confirm': '确认',
			'btn_cancle': '取消',
			// data
			'data_error': '数据格式有误，请重试',
		},
		// 抛出错误
		throwError: function(m) {},
		// log
		log: function(m) {
			console.log(m);
		},
		// 插件集
		Plus: {}
	};
	// 应用唯一入口接口
	sApp.go = function(cfg) {
		if (cfg) {
			sApp.Util.extend(this.Config, cfg);
			// 初始化app状态机
			sApp.Plus.FSM.create('app', {
				states: ['coreok', 'tplinit', 'tplok', 'initapp', 'appok'],
				change: function(f, t) {
					// var info = sApp.Langs[t];
					// if (info) {
					//	// sApp.UI.Dialog.show(info,{type : dialog.BTN_NONE,backcancle : false});
					//	// console.log('sApp>>>'+info);
					// }
					switch (t) {
						case 'coreok':
							sApp.Plus.FSM.change('app', 'tplinit');
							break;
						case 'tplinit':
							// 下载模板,异步的，所以和前面的相反处理了
							var tpls = sApp.Config.Tpls;
							if (tpls) {
								tplcnt = tpls.length || 0;
								$.each(tpls, function(i, tpl) {
									$.get(tpl, function(html) {
										var tplwrap = D.createElement('div');
										tplwrap.className = 'sapp_tpl_wrap';
										tplwrap.innerHTML = html;
										D.body.appendChild(tplwrap);
										if (--tplcnt <= 0) {
											sApp.Plus.FSM.change('app', 'tplok');
										}
									});
								});
							} else {
								sApp.Plus.FSM.change('app', 'tplok');
							}
							break;
						case 'tplok':
							// 模板下载成功.
							sApp.Plus.FSM.change('app', 'initapp');
							break;
						case 'initapp':
							// 模板下载成功.初始化页面
							// 初始化懒加载
							sApp.Plus.slazyload.init({
								'attr': sApp.Config.G_IMGTRUESRCATTR
							});
							//页面
							sApp.Page.setTrans(sApp.Config.G_PAGETRANS);
							var pages = sApp.Config.Pages;
							if (pages) {
								for (var pid in pages) {
									// 默认第一个为主页
									if (!sApp.Config.G_MAIN) {
										sApp.Config.G_MAIN = pid;
									}
									var pcfg = pages[pid];
									sApp.Page.create(pid, pcfg);
								}
								this.change('appok');
							} else {
								sApp.throwError(sApp.Langs.nopage);
							}
							break;
						case 'appok':
							sApp.UI.Dialog.hide();
							sApp.Page.show(null, null, false);
							break;
					}
				}
			});
			sApp.Plus.FSM.change('app', 'coreok');
		} else {
			this.UI.Dialog.show(this.Langs.noconfig, {
				type: dialog.BTN_NONE,
				backcancle: false
			});
		}
	};
	/*********************************内核↑*********************************end*****/
	/*********************************设备信息汇总sApp.Env--↓***************start***/
	IS_WEBKIT = /WebKit\/([\d.]+)/i;
	appPath = location.pathname.replace(/\/[^\/]*$/, '') + '/';
	OSs = {
		Android: /(Android)[\s\/]+([\d.]+)/,
		ipad: /(iPad).*OS\s([\d_]+)/,
		iphone: /(iPhone\sOS)\s([\d_]+)/,
		Blackberry: /(BlackBerry|BB10|Playbook).*Version\/([\d.]+)/,
		FirefoxOS: /(Mozilla).*Mobile[^\/]*\/([\d\.]*)/,
		webOS: /(webOS|hpwOS)[\s\/]([\d.]+)/
	};
	sApp.Env = {
		platform: NG.platform,
		mobile: false,
		os: null,
		hasTouch: 'ontouchstart' in W,
		isWebkit: IS_WEBKIT.test(ua),
		screen: {
			width: W.innerWidth,
			height: W.innerHeight
		},
		appPath: appPath,
		// browser: null,
	};
	for (os in OSs) {
		support = ua.match(OSs[os]);
		if (support) {
			sApp.Env.os = {
				name: support[1],
				version: support[2]
			};
			break;
		}
	}
	if (sApp.Env.os) {
		sApp.Env.mobile = true;
	}
	/*********************************设备信息汇总sApp.Env--↑***************end*****/
	/*********************************基础UI类sApp.UI--↓********************start***/
	dialog = {
		// 静态常量
		BTN_CONFIRM: 1,
		BTN_ALERT: 2,
		BTN_NONE: 0,
		// 单例标识
		init: null,
		/**
		 * 显示对话框
		 * @param  {string} s    要显示的消息
		 * @param  {json}  cfg
		 *         {
		 *         type : 按钮类型，BTN_CONFIRM两个按钮，BTN_ALERT（默认） 一个按钮,BTN_NONE 没有按钮
		 *         confirm : 确定按钮回调（如果有确认按钮）
		 *         cancle : 取消按钮回调（如果有取消按钮）
		 *         backcancle : 点击对话框以外区域是否隐藏对话框 默认true
		 *         mask ：是否显示半透明蒙版  默认true
		 *         }
		 */
		show: function(s, cfg) {
			var boxs = this.init,
				btntype = this.BTN_ALERT,
				fn_confirm, fn_cancle;
			if (!boxs) {
				var df, wrap, dbox, content, btn_area, confirm, cancle, trigger;

				df = D.createDocumentFragment();
				wrap = df.appendChild(D.createElement('div'));
				wrap.className = 'sapp_dialog_wrap';

				dbox = wrap.appendChild(D.createElement('div'));
				dbox.className = 'sapp_dialog_box';

				content = dbox.appendChild(D.createElement('div'));
				btn_area = dbox.appendChild(D.createElement('div'));

				confirm = btn_area.appendChild(D.createElement('input'));
				confirm.className = 'sapp_btn_confirm';
				confirm.type = 'button';
				confirm.value = sApp.Langs.btn_confirm;
				cancle = btn_area.appendChild(D.createElement('input'));
				cancle.className = 'sapp_btn_cancle';
				cancle.type = 'button';
				cancle.value = sApp.Langs.btn_cancle;

				trigger = function(e) {
					var fn = false,
						hideDialog = false;
					if (this == e.target) {
						switch (e.target.className) {
							case 'sapp_btn_confirm':
								fn = sApp.UI.Dialog.init.fn_confirm;
								hideDialog = true;
								break;
							case 'sapp_btn_cancle':
								fn = sApp.UI.Dialog.init.fn_cancle;
								hideDialog = true;
								break;
							case 'sapp_dialog_box':
							case 'sapp_dialog_wrap':
								hideDialog = sApp.UI.Dialog.init.backcancle;
								break;
						}
						if (fn) {
							fn.call();
						}
						if (hideDialog) {
							sApp.UI.Dialog.hide();
						}
					}
				};

				// 基础内核中没有tap等事件，所以只简单监听up事件
				wrap.addEventListener(sApp.UI.EVENT_UP, trigger, false);
				confirm.addEventListener(sApp.UI.EVENT_UP, trigger, false);
				cancle.addEventListener(sApp.UI.EVENT_UP, trigger, false);

				D.body.appendChild(df);

				boxs = this.init = {
					box: dbox,
					content: content,
					confirm: confirm,
					cancle: cancle,
					fn_confirm: false,
					fn_cancle: false,
					backcancle: true,
				};
			}
			// 确认按钮类型
			if (cfg) {
				btntype = cfg.type !== undefined ? cfg.type : btntype;
				boxs.fn_confirm = cfg.confirm ? cfg.confirm : false;
				boxs.fn_cancle = cfg.cancle ? cfg.cancle : false;
			}
			switch (btntype) {
				case this.BTN_CONFIRM:
					boxs.confirm.style.display = 'block';
					boxs.cancle.style.display = 'block';
					break;
				case this.BTN_NONE:
					boxs.confirm.style.display = 'none';
					boxs.cancle.style.display = 'none';
					break;
				// case this.BTN_ALERT:
				default:
					boxs.confirm.style.display = 'block';
					boxs.cancle.style.display = 'none';
					break;
			}
			boxs.content.innerHTML = s;
			boxs.box.parentNode.style.display = '';
			// 对话框背景点击
			if (!cfg || cfg.backcancle) {
				boxs.backcancle = true;
			} else {
				boxs.backcancle = false;
			}
			// 蒙版判断
			if (!cfg || cfg.mask) {
				sApp.UI.Mask.show();
			}
		},
		hide: function() {
			sApp.UI.Mask.hide();
			var init = this.init;
			if (init) {
				init.box.parentNode.style.display = 'none';
			}
		}
	};
	sApp.UI = {
		// 事件名称
		EVENT_UP: sApp.Env.hasTouch ? 'touchend' : 'mouseup',
		EVENT_DOWN: sApp.Env.hasTouch ? 'touchstart' : 'mousedown',
		EVENT_MOVE: sApp.Env.hasTouch ? 'touchmove' : 'mousemove',
		EVENT_CANCLE: sApp.Env.hasTouch ? 'touchcancle' : 'mouseout',
		EVENT_TRANS: 'webkitTransition',
		EVENT_TRANSTIME: 'webkitTransitionDuration',
		EVENT_TRANSFROM: 'webkitTransform',
		EVENT_TRANSEND: 'webkitTransitionEnd',

		// 全局蒙版
		Mask: {
			init: null,
			show: function() {
				if (!this.init) {
					var mask = D.body.appendChild(D.createElement('div'));
					mask.className = 'sapp_mask';
					this.init = mask;
				}
				this.init.style.display = 'block';
			},
			hide: function() {
				if (this.init) {
					this.init.style.display = 'none';
				}
			}
		},
		// 全局的对话框
		Dialog: dialog
	};
	/*********************************基础UI类sApp.UI--↑********************end*****/
	/*********************************基础Util类sApp.Util--↓****************start***/
	// 以下为异步加载
	var canAsync = true,
		head = D.querySelector('head'),
		/* js管理列表:
		 *   {
		 *       scr:地址,
		 *       id:序列标志,
		 *       callback:js加载完成后的执行回调,
		 *       state:状态 (0正在请求，1请求完成，2已经执行)
		 *   }
		 */
		jsList = [];
	// 版本号判断,判断是够支持async==false
	if (sApp.Env.os && sApp.Env.os.name == 'Android') {
		var ma = ua.match(/Android[ |\/](\d)/),
			version = ma && ma[1] ? ma[1] : false;
		if (!version || version < 4) {
			canAsync = false;
		}
	} else {
		var sc = D.createElement('script');
		canAsync = typeof sc.async == 'boolean';
	}
	// 新增js,无则新增，有则判断执行,并返回新增的script dom 对象
	function addjs(url, callback) {
		var jsobj = false;
		// 判断重复
		for (var i = 0, l = jsList.length; i < l; i++) {
			if (jsList[i].src == url) {
				jsobj = jsList[i];
				break;
			}
		}
		if (!jsobj) {
			var id = jsList.length;
			jsobj = {
				src: url,
				id: id,
				state: 0,
				callback: callback
			};
			jsList[id] = jsobj;
			jsobj = null;

			var sc = D.createElement('script');
			sc.setAttribute('data-order', id);
			sc.type = canAsync ? "text/javascript" : "text/cache";
			sc.async = false;
			sc.src = url;
			sc.onload = trigger;
			head.appendChild(sc);
			return sc;
		} else if (jsobj.state == 2 && callback) {
			// 如果已经存在，并且已经执行，那么回调直接执行
			callback();
			return false;
		}
	}
	// 请求结束后的回调函数
	function trigger() {
		var id = this.getAttribute('data-order');
		// 状态变更
		jsList[id].state = 1;
		// 可执行遍历
		jsList.every(function(d, i, arr) {
			switch (d.state) {
				case 1:
					if (!canAsync) {
						var oldsc = D.querySelector('script[data-order="' + i + '"]');
						if (oldsc) {
							var newsc = oldsc.cloneNode();
							newsc.type = 'text/javascript';
							newsc.onload = function() {
								var id = this.getAttribute('data-order'),
									jsobj = jsList[id];
								jsobj.state = 2;
								if ('callback' in jsobj) {
									jsobj.callback();
								}
								delete jsList.id;
							};
							head.replaceChild(newsc, oldsc);
							oldsc = null;
						}
					} else {
						var jsobj = jsList[i];
						jsobj.state = 2;
						if ('callback' in jsobj) {
							jsobj.callback();
						}
						delete jsList[i];
					}
					break;
				case 0:
					return false;
			}
			return true;
		});
	}
	sApp.Util = {
		// 简单扩充已有对象
		extend: function(baseobj, extobj) {
			for (var k in extobj) {
				baseobj[k] = extobj[k];
			}
		},
		// js 异步加载模块
		loadJs: function(url, callback) {
			if (!url) {
				return this;
			}
			var sc = addjs(url, callback);
			return this;
		}
	};
	/*********************************基础Util类sApp.Util--↑****************end*****/
	/*********************************引擎初始化--↓*************************start***/
	// 实时更新窗口大小
	W.addEventListener('resize', function() {
		sApp.Env.screen = {
			width: W.innerWidth,
			height: W.innerHeight
		};
	}, false);
	// 实时监听localstorage变化,用于后期数据驱动vm模式，需要继承本页storage触发插件
	// W.addEventListener('storage',function(e){
	//	var keys = e.key.split('#'),pageid,rendid;
	//	if (keys.length>2) {
	//		pageid = keys[0];
	//		rendid = keys[1];
	//		//判断当前页
	//		if (pageid == sApp.Page.curPage) {
	//			console.log('sapp:storage>>>>>>>>>>>>>>>数据变了，刷新：'+rendid);
	//			sApp.page.render(rendid);
	//		}
	//	}else{
	//		console.log('sapp:storage>>>>>>>>>>>>>>>数据变了，但不是页面数据');
	//	}
	// },false);
	// 错误处理
	W.addEventListener('error', function(e) {
		// alert(e.message+'\n'+e.filename+'\n'+e.lineno);
		if (sApp.Config.G_ERROR) {
			sApp.Config.G_ERROR.call(W, e);
		}
	}, false);
	// 提供全局命名空间
	W.sApp = sApp;
	/*********************************引擎初始化--↑*************************end*****/
})();
/*
 *有限循环状态机  finite state machine
 *author	: awen
 *version: v1.0
 *email	: 71752352@qq.com
 */
(function(O) {
	O.FSM = {
		// 状态栈列表,内部元素格式为{name:fsm}
		stacks: {},
		// 版本号
		version: '1.0',
		/**
		 * 创建状态机
		 * @param  {string} name  创建的状态机的名称,将以key的形式出现在stack中
		 * @param  {json} cfg 格式如下:
		 *         {
		 *          states :['on','off'],	//状态列表
		 *          beforeChange : function(from,to,用户自传...){},	//状态变更前回调
		 *          change : function(from,to,用户自传...){}	//状态变更后回调
		 *          },
		 */
		create: function(name, cfg) {
			// 判断栈中是否已经存在该名称
			if (this.stacks.name) {
				alert('fsm:状态机名称重复:' + name);
				return false;
			}
			if (!cfg) {
				alert('fsm:请检查配置文件');
				return false;
			}
			////////////////////// 参数初始化
			cfg = cfg || {};
			var states = cfg.states || [],
				from = '',
				to = 'none',
				beforeChange = cfg.beforeChange || null,
				change = cfg.change || cfg.change,
				fsm = {};
			////////////////////// 初始化状态机
			fsm.name = name;
			// 当前状态，只能查看，设置是无效的，不影响change方法
			fsm.current = from;
			// 状态转换,有参数则转换为state，
			// 否则自动转化为下一个状态（循环）
			// 如果存在第二个以上的参数，则会传给相应的回调函数
			fsm.change = function(state) {
				var args, uargs, len = arguments.length;
				// 确认状态
				if (state) {
					to = state;
				} else {
					var idx = from ? states.indexOf(from) : 0,
						maxi = states.length - 1;
					if (idx > -1 && maxi > 0) {
						idx = idx >= maxi ? 0 : idx + 1;
						to = states[idx];
					} else {
						to = from;
					}
				}
				// 参数整合
				args = [from, to];
				// 确认用户自定义参数
				if (len > 1) {
					args = args.concat(Array.prototype.slice.call(arguments, 1));
				}
				// 状态变更前回调
				beforeChange && beforeChange.apply(this, args);
				// 变更状态
				this.current = to;
				// 状态变更后回调
				change && change.apply(this, args);
				// 重置from
				from = to;
			};
			// 加入栈中
			this.stacks[name] = fsm;
			return fsm;
		},
		/**
		 * 全局的修改状态方法
		 */
		change: function(name, state) {
			var args = Array.prototype.slice.call(arguments),
				fsm = this.stacks[name];
			args.shift();
			fsm.change.apply(fsm, args);
		}
	};
})(sApp.Plus);
/**
 * sApp.Util   sApp框架的util工具集
 * build by awen ~ 71752352@qq.com ~ 2013-9-26
 */
(function(O) {
	var script_filter, sql_filter;
	/**
	 * javascript攻击检测
	 * @param  {string} str	要检测的字符串
	 * @return {boolean}     是否通过检测
	 */
	script_filter = function(str) {
		if (str) {
			str = decodeURIComponent(str);
		} else {
			return true;
		}
		var re = /(script|unescape|decodeURIComponent|decodeURI|eval|appendChild|alert|innerHTML|outerHTML|function)/gi;
		return !re.test(str);
	};
	/**
	 * sql攻击检测
	 * @param  {string} str	要检测的字符串
	 * @return {boolean}     是否通过检测
	 */
	sql_filter = function(str) {
		var re = /^\?(.*)(select%20|insert%20|delete%20from%20|count\(|drop%20table|update%20truncate%20|asc\(|mid\(|char\(|xp_cmdshell|exec%20master|net%20localgroup%20administrators|\"|:|net%20user|\|%20or%20)(.*)$/gi;
		return re.test(str);
	};

	O.script_filter = script_filter;
	O.sql_filter = sql_filter;
})(sApp.Util);
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
/**
 * build by awen  71752352@qq.com
 * version 1.2
 * 1 重构event事件
 * 2 sjs对象的each方法中函数接收的参数顺序调整为调整为与jquery相同
 */
(function(W, undefined) {
	var D = W.document,
		_$$ = W.$ ? W.$ : undefined,
		wn = W.navigator,
		wl = W.location,
		ua = wn.userAgent.toLowerCase(),
		av = wn.appVersion,
		AP = Array.prototype,
		sh = /^[^<]*(<[\w\W]+>)[^>]*$|^#([\w-]+)$/,
		DS = {},
		type = function(o) {
			return o != undefined ? (Object.prototype.toString.call(o)).slice(8, -1) : 'undefined';
		};
	/*基础工具类*/
	var UT = {
		noConflict: function() {
			if (_$$) {
				W.$ = _$$;
			}
		},
		uniqueId: function() {
			var t = new Date - 0,
				r = parseInt(Math.random() * 10000);
			return t * 10000 + r;
		},
		type: type,
		isArray: function(o) {
			return type(o) === 'Array';
		},
		isBoolean: function(o) {
			return type(o) === 'Boolean';
		},
		isString: function(o) {
			return type(o) === 'String';
		},
		isFunction: function(o) {
			return type(o) === 'Function';
		},
		isNumeric: function(o) {
			return !isNaN(parseFloat(o)) && isFinite(o);
		},
		isXML: function(el) {
			var doc = el.ownerDocument || el;
			return doc.createElement("p").nodeName !== doc.createElement("P").nodeName;
		},
		isPlainObject: function(o) {
			return type(o) === 'Object';
		},
		isEmptyObject: function(o) {
			var ret = false;
			if (UT.isPlainObject(o)) {
				var name;
				for (name in o) {
					return false;
				}
				ret = true;
			}
			return ret;
		},
		/**正则*/
		isEmptyString: function(s) {
			return (/^\s*$/ig).test(s);
		},
		trim: function(s) {
			return s.replace(/(^\s*)|(\s*$)/g, "");
		},
		each: function(o, f) {
			if (o.forEach) {
				o.some(function(d, i, o) {
					return f.call(o, i, d);
				});
			} else {
				for (var k in o) {
					if (o[k] != undefined) {
						if (f.call(o, k, o[k]) === false) {
							break;
						}
					}
				}
			}
		},
		clone: function(obj) {
			if (typeof obj != 'object' || obj == null) {
				return obj;
			}
			var newObj = {};
			for (var i in obj) {
				newObj[i] = clone(obj[i]);
			}
			return newObj;
		},
		grep: function(o, c, s) {
			var ret = new o.constructor,
				rs = s === true ? false : true;
			if (o && c) {
				UT.each(o, function(i, n) {
					if (c.call(o, n, i) === rs) {
						ret.push(n);
					}
				});
			}
			return ret;
		},
		merge: function(f, s) {
			var args = [f.length, 0].concat(s);
			AP.splice.apply(f, args);
			return f;
		},
		map: function(o, f) {
			if (o && f) {
				var t = [];
				for (var i = 0, l = o.length; i < l; i++) {
					var v = f.call(o, o[i], i);
					if (v == null) {
						return true;
					}
					if (UT.isArray(v)) {
						UT.merge(t, v);
					} else {
						t.push(v);
					}
				}
				o = t;
			}
			return o;
		},
		inArray: function(v, o) {
			if (AP.indexOf) {
				return AP.indexOf.call(o, v);
			} else {
				for (var i = 0, l = o.length; i < l; i++) {
					if (o[i] == v) {
						return i;
					}
				}
			}
			return -1;
		},
		unique: uniqd,
		/**从数组或者对象中移除*/
		remove: function(o, k, isv) {
			var ik = k;
			if (isv === true) {
				ik = null;
				for (var i in o) {
					if (o[i] == k) {
						ik = i;
						break;
					}
				}
			}
			if (ik !== undefined && ik !== null) {
				if (UT.isArray(o)) {
					o.splice(ik, 1);
				}
				if (UT.isPlainObject(o)) {
					delete o[ik];
				}
			}
			return o;
		},
		data: function(d, k, v) {
			return M(d).data(k, v);
		},
		/**json*/
		JSON: {
			parse: function(d) {
				if (typeof d !== "string" || !d) {
					return null;
				}
				d = UT.trim(d);
				return W.JSON ? JSON.parse(d) : eval(d);
			},
			stringify: function(O) {
				if (!O) {
					return '';
				}
				if (W.JSON) {
					return W.JSON.stringify(O);
				}
				var S = [],
					J = "";
				switch (type(O)) {
					case 'Array':
						for (var i = 0; i < O.length; i++) {
							S.push(this.stringify(O[i]));
						}
						J = '[' + S.join(',') + ']';
						break;
					case 'Date':
						J = "new Date(" + O.getTime() + ")";
						break;
					case 'RegExp':
					case 'Function':
						J = O.toString();
						break;
					case 'Object':
						for (var i in O) {
							O[i] = typeof(O[i]) == 'string' ? '"' + O[i] + '"' : (typeof(O[i]) === 'object' ? this.stringify(O[i]) : O[i]);
							S.push(i + ':' + O[i]);
						}
						J = '{' + S.join(',') + '}';
						break;
				}
				return J;
			},
			parseQuery: function(s) {
				s = decodeURIComponent(s);
				var o = {};
				var os = s.split("&");
				for (var i = 0, len = os.length; i < len; i++) {
					if (os[i].indexOf("=") > -1) {
						var oi = os[i].split("=");
						if (!((/^\s*$/ig).test(o[0]))) {
							var v = oi[1].trim();
							if (v == "null" || v == "undefined") {
								v = "";
							}
							if (v && /(\[|\]|{|})/ig.test(v)) {
								v = UT.JSON.parse(v);
							}
							o[oi[0]] = v;
						}
					}
				}
				return o;
			},
			toQuery: function(t) {
				var k, v, s = [];
				if (typeof t == 'object') {
					for (k in t) {
						v = t[k];
						switch (typeof v) {
							case 'object':
								v = UT.JSON.stringify(v);
								break;
							default:
								break;
						}
						s[s.length] = k + '=' + encodeURIComponent(v);
					}
				}
				return s.join('&');
			},
			count: function(o) {
				var n = 0;
				for (var k in o) {
					n++;
				}
				return n;
			}
		},
		/**帧动画对象*/
		raf: function(frame, fn) {
			//run 动画状态  0初始 1运动 2暂停 3停止
			var _f = Math.ceil(1000 / frame),
				run = 0,
				cnt = 0,
				args = AP.slice.call(arguments, 2),
				instance = this,
				rid = 0;
			args.unshift(cnt);

			function go() {
				if (run < 2) {
					cnt++;
					args[0] = cnt;
					if (fn.apply(instance, args) === false) {
						return;
					}
					rid = setTimeout(go, _f);
				}
			}
			this.start = function() {
				if (run == 0) {
					run = 1;
					rid = setTimeout(go, _f);
				}
			};
			this.pause = function() {
				if (run == 1) {
					run = 2;
				}
			};
			this.resume = function() {
				if (run == 2) {
					run = 1;
					rid = setTimeout(go, _f);
					// console.log("resume>>"+rid);
				}
			};
			this.stop = function() {
				run = 0;
				W.clearTimeout(rid);
			};
		}
	},
		//构建sjs对象
		M = function(s, cxt) {
			return new M.fn.init(s, cxt);
		};
	//对象原型
	M.fn = M.prototype = {
		constructor: M,
		selector: '',
		sjs: 'sjs',
		length: 0,
		init: function(s, cxt) {
			if (W == this) {
				return new M(s, cxt)
			};

			this.context = cxt ? cxt : D;
			if (s) {
				//是sjs对象则返回原sjs对象
				if (isS(s)) {
					return s;
				};
				/**如果是函数则为ready*/
				if (UT.isFunction(s)) {
					if (/complete|loaded|interactive/.test(D.readyState)) {
						s.call(W, M);
					} else {
						D.addEventListener("DOMContentLoaded", function(e) {
							s.call(W, M);
						}, false);
					}
				}
				// M(DOMElement)
				if (s.nodeType || s == W) {
					this[0] = s;
					this.length = 1;
					//dom对象的唯一标志
					id(s);
				}
				//doms数组
				if (UT.isArray(s)) {
					UT.merge(this, s);
				}
				// M(string)
				if (typeof s === "string") {
					var ds;
					if ((ds = sh.exec(s)) && ds[1]) {
						return M(cds(ds[1]));
					} else {
						ds = this.context.querySelectorAll(s);
						this.length = ds.length;
						for (var i = 0, len = this.length; i < len; i++) {
							id(ds[i]);
							this[i] = ds[i];
						}
						this.selector = s;
					}
				}
			}
		},
		size: function() {
			return this.length;
		},
		get: function(i) {
			return i == undefined ? this : this[i];
		},
		index: function() {
			var d = this[0],
				cs = d.parentNode.children;
			return M.inArray(d, cs);
		}
	}
	M.fn.init.prototype = M.fn;
	//主要扩展方法
	M.extend = M.fn.extend = function() {
		var to = arguments[0] || {}, options, len = arguments.length,
			deep = false,
			ci = 0,
			src, copy;
		//第一个参数如果是boolean型的话，则代表是否深度复制，扩充对象为第二个参数
		if (typeof to === "boolean") {
			ci++;
			deep = true;
			to = arguments[ci] || {};
		}
		//to类型检测
		if (typeof to != 'object') {
			to = {};
		}
		//如果只有一个object对象则扩充对象为本身
		if (len == ci + 1) {
			to = this;
		}
		//循环所有要继承的对象
		for (; ci < len; ci++) {
			if ((options = arguments[ci]) != null) {
				for (var key in options) {
					src = to[key];
					copy = options[key];
					//防止两个对象互相包含，造成无休止循环
					if (to == copy) {
						continue;
					}
					//深度复制
					if (deep && copy && (UT.isArray(copy) || UT.isPlainObject(copy))) {
						if (UT.isPlainObject(copy)) {
							src = src && UT.isArray(src) ? src : {};
						}
						if (UT.isArray(copy)) {
							src = src && UT.isPlainObject(src) ? src : [];
						}
						to[key] = M.extend(deep, src, copy);
					} else {
						to[key] = copy;
					}
				};
			};
		}
		return to;
	}
	///////////////////////////////////常用函数
	//ajax回调函数绑定
	function ajaxcall(xhr, s) {
		if (!s || !xhr) {
			return false;
		};
		if (s.success) {
			xhr.onload = function(e) {
				var res = null;
				switch (s.dataType) {
					case 'json':
						res = M.JSON.parse(this.responseText);
						break;
					case 'script':
						res = eval('(' + this.responseText + ')');
						break;
					case 'xml':
						res = this.responseXML;
					default:
						res = this.response || this.responseText;
						break;
				}
				s.success.call(s.context, res, this);
			}
		}
		if (s.abort) {
			xhr.onabort = function(e) {
				s.abort.call(s.context, this);
			}
		}
		if (s.error) {
			xhr.onerror = function(e) {
				s.error.call(s.context, this);
			}
		}
		if (s.beforeSend) {
			xhr.onloadstart = function(e) {
				s.beforeSend.call(s.context, this);
			}
		}
		if (s.complete) {
			xhr.onloadend = function(e) {
				s.complete.call(s.context, this);
			}
		}
		if (s.progress) {
			xhr.onprogress = function(e) {
				s.progress.call(s.context, e);
			}
		}
		if (s.upProgress) {
			xhr.upload.onprogress = function(e) {
				s.upProgress.call(s.context, e);
			}
		}
	}
	//将数组或者字符串 统一成数组
	function ba(s, b) {
		b = b ? b : ' ';
		return s == undefined ? s : M.isArray(s) ? s : s.split(b);
	}
	//根据字符串创建dom数组,f=true的话 返回documentfragment对象
	function cds(s, f) {
		var tmp = D.createElement('div');
		tmp.innerHTML = s;
		if (f === true) {
			var doc = D.createDocumentFragment(),
				c = tmp.firstChild;
			while (c) {
				var d = c,
					c = c.nextSibling;
				doc.appendChild(d);
			}
			return doc;
		} else {
			return AP.slice.call(tmp.children, 0);
		}
	}
	//将CSS驼峰属性名转换为原本属性名
	function cnes(s) {
		s.replace(/([A-Z])/g, "-$1").toLowerCase();
		return s.replace(/^(webkit-|moz-|o-|ms-)/, '-$1');
	}
	//将CSS属性名改为驼峰
	function cne(s) {
		return s.replace(/-[a-z]/gi, function(c) {
			return c.charAt(1).toUpperCase();
		});
	}
	//获取class值
	function gc(d, n) {
		return W.getComputedStyle(d).getPropertyValue(cnes(n)) || '';
	}
	//检测是否含有className
	function hc(d, c) {
		if ('classList' in d) {
			return d.classList.contains(c);
		} else {
			var r = new RegExp('(\\s|^)' + c + '(\\s|$)');
			return r.test(d.className);
		}
	}
	//删除classname
	function dc(d, c) {
		if (c) {
			if ('classList' in d) {
				d.classList.remove(c);
			} else if (hc(d, c)) {
				var r = new RegExp('(\\s|^)' + c);
				d.className = d.className.replace(r, '');
			}
		}
	}
	// 增加classname
	function ac(d, c) {
		if ('classList' in d) {
			d.classList.add(c);
		} else if (hc(d, c)) {
			var cname = d.className;
			cname += ' ' + c;
			d.className = cname;
		}
	}
	/**借用jquery的，挺精简的
	 * 从一个元素出发，迭代检索某个方向上的所有元素并记录，直到与遇到document对象或遇到until匹配的元素
	 * 迭代条件（简化）：cur.nodeType !== 9 && !M( cur ).is( until )
	 * elem		起始元素
	 * dir		迭代方向，可选值（Node 对象的属性）：如parentNode nextSibling previousSibling
	 * until	选择器表达式，如果遇到until匹配的元素，迭代终止
	 * only 	是否只返回第一个符合要求的
	 */
	function dir(elem, dir, until, only) {
		var matched = [],
			cur = elem[dir];
		while (cur && cur.nodeType !== 9 && (!until || cur.nodeType !== 1 || !M(cur).is(until))) {
			if (cur.nodeType === 1) {
				if (only) {
					return cur;
				}
				matched.push(cur);
			}
			cur = cur[dir];
		}
		return matched;
	}
	/*~parentsUntil,nextUntil,prevUntil*/
	function diru(type, o, s, f) {
		var ps = [],
			i = 0,
			l = o.length,
			r;
		for (; i < l; i++) {
			M.merge(ps, dir(o[i], type, s));
		}
		r = M(uniqd(ps));
		return f ? r.filter(f) : r;
	}
	/*~parent,next,prev*/
	function dirs(type, o, s) {
		var ps = [],
			i = 0,
			l = o.length,
			r;
		for (; i < l; i++) {
			var p = o[i][type];
			p && ps.push(p);
		}
		r = M(uniqd(ps));
		return s ? r.filter(s) : r;
	}
	//获取dom的outhtml代码
	function gh(d) {
		if (d.outerHTML) {
			return d.outerHTML
		};
		var t = D.createElement('div');
		t.appendChild(d.cloneNode(true));
		return t.innerHTML;
	}
	//获取dom对象的唯一标志,e强制重新获取
	function id(d, e) {
		return (e || !d._hash) ? (d._hash = UT.uniqueId()) : d._hash;
	}
	// 判断是否sjs对象
	function isS(o) {
		return o && o != W && o.sjs != undefined;
	}
	//sjs对象整合到documentFragment对象中病返回
	function stodf(o) {
		var d = D.createDocumentFragment();
		for (var i = 0; i < o.length; i++) {
			o[i]
		};
		return d;
	}
	//parent child操作  r是操作的类型 0,append（默认）,1perpend,2after,3before,4 replaceWith
	function dom(o, s, r) {
		if (s && o.length > 0) {
			var isf = M.isFunction(s),
				isstr = M.isString(s),
				iss = isS(s),
				_s = (!isstr && !isf) ? M(s) : null,
				rs = [];
			o.each(function(i,d) {
				var p = r > 1 ? d.parentNode : null,
					df = D.createDocumentFragment();
				if (_s) {
					//dom,sjs会保留事件
					var cs = i > 0 ? _s.clone(true) : _s;
					cs.each(function(j,m) {
						df.appendChild(m)
					});

					((r == 1) && (d.insertBefore(df, d.firstChild))) ||
						((r == 2) && p && (((p.lastChild == d) && p.appendChild(df)) || p.insertBefore(df, d.nextSibling))) ||
						((r == 3) && p && p.insertBefore(df, d)) ||
						((r == 4) && p && p.replaceChild(df, d)) ||
						d.appendChild(df);
					iss && (i > 0) && rs.push(cs);
				} else {
					var h = isf ? s.call(d, i, d.innerHTML) : s,
						h = isstr ? cds(s, true) : h;
					((r == 1) && (d.insertBefore(h, d.firstChild))) ||
						((r == 2) && p && (((p.lastChild == d) && p.appendChild(h)) || p.insertBefore(h, d.nextSibling))) ||
						((r == 3) && p && p.insertBefore(h, d)) ||
						((r == 4) && p && p.replaceChild(h, d)) ||
						(d.appendChild(h));
				}
			});
			if (iss) {
				for (var i = 0; i < rs.length; i++) {
					s.add(rs[i]);
				}
			}
		}
		return o;
	}
	//获取元素数据
	function gd(d, k) {
		var hash = id(d),
			ds = DS[hash] || undefined;
		return k == undefined ? ds : (ds && (ds[k] != undefined)) ? ds[k] : undefined;
	}
	//设置元素数据
	function sd(d, k, v) {
		var hash = id(d);
		if (!DS[hash]) {
			DS[hash] = {};
		}
		DS[hash][k] = v;
	}
	//删除数据
	function dd(d, k) {
		var hash = id(d),
			ds = DS[hash] || undefined;
		if (ds) {
			if (k) {
				if (DS[hash][k]) {
					delete DS[hash][k];
				}
			} else {
				delete DS[hash];
			}
		}
	}
	//常规数组去重
	function uniq(o) {
		var j = {}, r = [];
		for (var i = 0; i < o.length; i++) {
			j[o[i]] = o[i];
		}
		M.each(j, function(n, i) {
			r.push(i);
		});
		return r;
	}
	//dom数组去重
	function uniqd(o) {
		var ret = [],
			done = {}, i = 0,
			l = o.length;
		for (; i < l; i++) {
			var d = o[i],
				j = id(d);
			if (!done[j]) {
				done[j] = true;
				ret.push(d);
			};
		}
		return ret;
	}
	//dom扩展
	var DOMS = {
		data: function(k, v) {
			if (this.length > 0) {
				return v ? this.each(function(i,d) {
					sd(d, k, v)
				}) : gd(this[0], k);
			}
			return this;
		},
		/**删除数据,k可以使某个key，也可以使key数组，或者空格分开的key串*/
		removeData: function(k) {
			if (M.isString(k) && !M.isEmptyString(k)) {
				k = k.split(" ");
			}
			return this.each(function(j,d) {
				if (M.isArray(k)) {
					M.each(k, function(i, n) {
						dd(d, n)
					});
				} else {
					dd(d);
				}
			});
		},
		outerHTML: function() {
			return gh(this[0]);
		},
		html: function(s) {
			if (this.length == 0) {
				return this;
			}
			if (s == undefined) {
				return this[0].innerHTML;
			}
			var h = M.isString(s) ? s : null,
				isfunc = M.isFunction(s);
			return this.each(function(i,d) {
				if (isfunc) {
					h = s.call(this, i, this.innerHTML);
					if (!h) {
						return true;
					};
				};
				this.innerHTML = h;
			});
		},
		//获取所有匹配元素的整合html代码字符串
		htmls: function() {
			var h = '';
			this.each(function(i,d) {
				h += gh(d);
			});
			return h;
		},
		val: function(s) {
			return this.length == 0 ? undefined : s == undefined ? ((this[0].value) || '') : this.each(function(i,d) {
				if (M.isFunction(s)) {
					var r = s.call(d, i, d.value);
					if (r != undefined) {
						d.value = r;
					}
				} else {
					d.value = s;
				}
			});
		},
		text: function(s) {
			if (s) {
				return this.each(function(i,d) {
					if (M.isFunction(s)) {
						var r = s.call(d, i, d.textContent);
						if (r != undefined) {
							d.textContent = r;
						}
					} else {
						d.textContent = s;
					}
				});
			} else {
				var ret = '';
				this.each(function(i,d) {
					ret += d.textContent;
				});
				return ret;
			}
		},
		css: function(a, b) {
			if (a == undefined) {
				return undefined
			}
			if (this.length == 0) {
				return this;
			}
			if (M.isString(a)) {
				var isf = M.isFunction(b);
				return b == undefined ? gc(this[0], a) : this.each(function(i,d) {
					var v = isf ? (b.call(this, i, gc(this, a))) : b;
					v = ((/height|width|left|right|top|bottom|size/i).test(a) && M.isNumeric(v)) ? (v + 'px') : v;
					a = cne(a);
					d.style[a] = v;
				});
			}
			if (M.isPlainObject(a)) {
				var ins = this;
				M.each(a, function(k, v) {
					ins.css(k, v);
				});
			}
			return this;
		},
		/*css状态保存*/
		save: function() {
			return this.each(function(i,d) {
				var s = gd(d, 'cstack') || [];
				s.push({
					ct: d.style.cssText,
					cn: d.className
				});
				sd(d, 'cstack', s);
			});
		},
		/*css状态回滚
		 **/
		restore: function() {
			return this.each(function(i,d) {
				var s = gd(d, 'cstack') || [];
				if (s.length > 0) {
					var item = s.pop();
					d.style.cssText = item.ct;
					d.className = item.cn;
					sd(d, 'cstack', s);
				}
			});
		},
		/*name|properties|key,value|fn*/
		attr: function(a, b) {
			if (a) {
				if (b) {
					//两个参数
					if (M.isFunction(b)) {
						this.each(function(i,d) {
							var v = d.getAttribute(a),
								r = b.call(d, i, v);
							if (r != undefined) {
								d.setAttribute(a, r);
							};
						});
					} else {
						this.each(function(i,d) {
							d.setAttribute(a, b);
						});
					}
				} else {
					//一个参数
					if (M.isString(a)) {
						return this[0].getAttribute(a);
					} else if (M.isPlainObject(a)) {
						this.each(function(i,d) {
							M.each(a, function(k, v) {
								d.setAttribute(k, v);
							})
						})
					}
				}
			};
			return this;
		},
		removeAttr: function(n) {
			return this.each(function(i,d) {
				d.removeAttribute(n);
			});
		},
		getBox: function() {
			//safari3.2没有getBoundingClientRect
			if ('getBoundingClientRect' in D.body) {
				var box = this[0].getBoundingClientRect();
				return {
					left: box.left,
					right: box.right,
					top: box.top,
					bottom: box.bottom,
					width: box.right - box.left,
					height: box.bottom - box.top
				}
			} else {
				var st = D.documentElement.scrollTop,
					sl = D.documentElement.scrollLeft,
					al = this[0].offsetLeft,
					at = this[0].offsetTop,
					cp = this[0].offsetParent;
				while (cp != null) {
					al += cp.offsetLeft;
					at += cp.offsetTop;
					cp = cp.offsetParent;
				}
				return {
					left: al - sl,
					right: al + this[0].offsetWidth - sl,
					top: at - st,
					bottom: at + this[0].offsetHeight - st,
					width: this[0].offsetWidth,
					height: this[0].offsetHeight
				}
			}
		},
		inBox: function(x, y) { /**x，y均相对于浏览器窗口，event可用clientX,clientY*/
			var r = false,
				x = parseInt(x),
				y = parseInt(y);
			this.each(function(i,dom) {
				var b = M(this).getBox();
				r = b.left <= x && b.right >= x && b.top <= y && b.bottom >= y;
				if (r == true) {
					return false
				};
			});
			return r;
		},
		/**
		 * r参数判断是否反向遍历
		 * v1.2 调整each函数参数的顺序
		*/
		each: function(fn, r) {
			if (r === true) {
				for (var i = this.length - 1; i >= 0; i--) {
					if (fn.call(this[i], i, this[i]) === false) {
						return this;
					}
				}
			} else {
				for (var i = 0; i < this.length; i++) {
					if (fn.call(this[i], i, this[i]) === false) {
						return this;
					}
				}
			}
			return this;
		},
		addClass: function(c) {
			if (c == undefined || this.length == 0) {
				return this
			};
			var cs = M.isFunction(c) ? null : ba(c);
			return this.each(function(i,d) {
				var sc = M.trim(d.className);
				if (cs == null) {
					var cn = c.call(d, i, sc);
					if (cn) {
						ac(d, cn);
					}
				} else {
					M.each(cs, function(i, cn) {
						sc = M.trim(d.className);
						if (cn) {
							ac(d, cn);
						}
					});
				}
			});
		},
		removeClass: function(c) {
			if (this.length == 0) {
				return this
			};
			var cs = M.isFunction(c) ? null : ba(c);
			return this.each(function(i,d) {
				if (c == undefined) {
					return (d.className = '');
				};
				if (cs == null) {
					var cn = c.call(d, i, d.className);
					if (cn) {
						dc(d, cn);
					}
				} else {
					M.each(cs, function(i, cn) {
						dc(d, cn);
					});
				}
			});
		},
		toggleClass: function(c) {
			if (c == undefined || this.length == 0) {
				return this
			};
			var cs = M.isFunction(c) ? null : ba(c);
			return this.each(function(i,d) {
				var sc = M.trim(d.className),
					cn = '';
				if (cs == null) {
					if (cn = c.call(d, i, sc)) {
						if (hc(d, cn)) {
							dc(d, cn)
						} else {
							ac(d, cn);
						}
					}
				} else {
					M.each(cs, function(i, ci) {
						if (hc(d, ci)) {
							dc(d, ci)
						} else {
							ac(d, ci);
						}
					});
				}
			});
		},
		//筛选
		eq: function(i) {
			i = i < 0 ? this.length + i : i;
			return M(this.get(i));
		},
		hasClass: function(c) {
			var r = false;
			this.each(function(i,d) {
				return !(r = hc(d, c));
			});
			return r;
		},
		//w如果为true的话，那么将返回不符合条件的元素，（默认返回符合条件的）
		filter: function(p, w) {
			var isf = M.isFunction(p),
				ls = !isf ? M(p) : null;
			for (var i = this.length - 1; i >= 0; i--) {
				if ((isf && ((!w && !p.call(this[0], i)) || (w && p.call(this[0], i)))) || (ls && ((!w && M.inArray(this[i], ls) < 0) || (w && M.inArray(this[i], ls) > -1)))) {
					AP.splice.call(this, i, 1);
				}
			}
			return this;
		},
		//filter的反操作
		not: function(p) {
			return this.filter(p, true);
		},
		slice: function(s, e) {
			var _s = s == undefined ? 0 : s < 0 ? this.length + s : s,
				_e = e == undefined ? this.length : e;
			for (var i = this.length - 1; i >= 0; i--) {
				if (i >= e && i <= s) {
					AP.splice.call(this, i, 1);
				}
			}
			return this;
		},
		is: function(p) {
			return this.filter(p).length > 0;
		},
		has: function(p) {
			var ins = this;
			if (M.isString(p)) {
				return this.filter(function(i) {
					return M(p, ins[i]).length > 0;
				});
			} else {
				if (p.sjs) {
					p = p[0];
				}
				return this.filter(function(i) {
					var ds = M('*', ins[i]).get();
					return M.inArray(p, ds) > -1;
				});
			}
		},
		//查找 c是否只查找child
		find: function(s, c) {
			var r = [];
			this.each(function(j,d) {
				var cs = d.querySelectorAll(s);
				for (var i = 0; i < cs.length; i++) {
					(!c || cs[i].parentNode == d) && r.push(cs[i]);
				};
			});
			return M(uniqd(r));
		},
		children: function(s) {
			var _s = !s ? '*' : s;
			return this.find(_s, true);
		},
		parentsUntil: function(s, f) {
			return diru('parentNode', this, s, f);
		},
		parent: function(s) {
			return dirs('parentNode', this, s);
		},
		parents: function(s) {
			return this.parentsUntil(null, s);
		},
		closest: function(s) {
			var ps = [],
				r;
			for (var i = this.length - 1; i >= 0; i--) {
				var d = this[i],
					p;
				if (M(d).is(s)) {
					ps.push(d);
				} else {
					p = dir(this[i], 'parentNode', null, true);
					p.nodeType && ps.push(p);
				}
			}
			r = M(uniqd(ps));
			return s ? r.filter(s) : r;
		},
		nextUntil: function(s, f) {
			return diru('nextElementSibling', this, s, f);
		},
		next: function(s) {
			return dirs('nextElementSibling', this, s);
		},
		nextAll: function(s) {
			return this.nextUntil(null, s);
		},
		prevUntil: function(s, f) {
			return diru('previousElementSibling', this, s, f);
		},
		prev: function(s) {
			return dirs('previousElementSibling', this, s);
		},
		prevAll: function(s) {
			return this.prevUntil(null, s);
		},
		siblings: function(s) {
			return this.nextAll(s).add(this.prevAll(s));
		},
		// 串联
		add: function(s) {
			var ins = this;
			M(s).each(function(i,d) {
				AP.push.call(ins, d);
			});
			return M(uniqd(this));
		},
		//文档处理
		append: function(s) {
			return dom(this, s);
		},
		appendTo: function(s) {
			dom(M(s), this);
			return this;
		},
		prepend: function(s) {
			return dom(this, s, 1);
		},
		prependTo: function(s) {
			dom(M(s), this, 1);
			return this;
		},
		after: function(s) {
			return dom(this, s, 2);
		},
		before: function(s) {
			return dom(this, s, 3);
		},
		insertBefore: function(s) {
			dom(M(s), this, 3);
			return this;
		},
		insertAfter: function(s) {
			dom(M(s), this, 2);
			return this;
		},
		//替换
		replaceWith: function(s) {
			return dom(this, s, 4);
		},
		replaceAll: function(s) {
			dom(M(s), this, 4);
			return this;
		},
		clone: function(e) {
			var ins = this,
				n = M(this.htmls()),
				D = ES.data;
			return n.each(function(i,d) {
				var o = M(d);
				for (var k in D) {
					var s = id(ins[i]),
						e = D[k] ? D[k][s] : null;
					if (/swipe|tap/i.test(k)) {
						e && (D[k][id(d)] = e);
					} else {
						e && e.forEach(function(m) {
							o.on(k, m.data, m.fn);
						});
					}
				}
			});
		},
		empty: function() {
			return this.html('');
		},
		remove: function(s) {
			return this.each(function(i,d) {
				var o = M(d),
					D = ES.data;
				if ((!s || o.is(s)) && d.parentNode) {
					for (var k in D) {
						D[k][id(d)] && o.off(k);
					}
					d.parentNode.removeChild(d);
				}
			});
		}
	},
		//ajax
		AJAXS = {
			ajax: function(url, s) {
				var _s = {
					async: true, // 异步
					cache: false, // 是否读取缓存
					type: 'GET', // 请求方式
					dataType: 'html', // 返回数据类型,xml|html|css|script|json|blod|arraybuffer
					mime: 'text/html',
					data: {}, // 要随请求发送的键值对
					charset: 'utf-8', // 编码
					contentType: 'application/x-www-form-urlencoded',
					// 事件函数句柄
					context: s, // 回调函数的上下文，默认为传递的参数对象
					progress: null, // 下载进度，参数为当前事件对象
					upProgress: null, // 上传进度，参数为当前事件对象
					beforeSend: null, // 请求开始前的函数句柄
					success: null, // 请求成功函数句柄，有两个参数，第一个是返回的数据，第二个是XMLHttpRequest对象
					abort: null, // 请求被取消时的回调句柄，并且传入一个XMLHttpRequest作为参数		
					error: null, // 请求失败似的函数句柄，并且传入一个XMLHttpRequest作为参数
					complete: null // 请求结束后的函数句柄,不管成功或者失败，并且传入一个XMLHttpRequest作为参数
				};
				if (!M.isString(url)) {
					return false
				}
				var _t = new Date - 0,
					xhr = null,
					postd;
				_s = s ? M.extend(_s, s) : _s;
				postd = M.JSON.toQuery(_s.data);
				url += url.indexOf('?') > -1 ? '&' : '?';
				url += _s.cache ? '' : '_t=' + _t;
				if ((_s.type).toLowerCase() == 'get') {
					url += '&' + postd;
					postd = null;
					// jsonp
					if (_s.dataType == 'jsonp') {
						var _fname = 'sjs_' + sjs.uniqueId(),
							_kv = 'callback=' + _fname;
						if (/callback=\?/i.test(url)) {
							url = url.replace(/callback=\?/i, _kv);
						} else {
							url += '&callback=' + _fname;
						}
						W[_fname] = function(v) {
							// console.log(_s.succes);
							_s.success && _s.success.call(null, v);
							delete W[_fname];
						}
						var s = D.createElement('script');
						s.type = 'text/javascript';
						s.async = _s.async;
						s.src = url;
						D.body.appendChild(s);
						return {
							abort: function() {
								_s.success = null;
							}
						};
					}
				}
				xhr = new XMLHttpRequest;
				if (xhr) {
					if (_s.dataType == 'blod' || _s.dataType == 'arraybuffer') {
						xhr.responseType = _s.dataType;
					}
					ajaxcall(xhr, _s);
					xhr.open(_s.type, url, _s.async);
					xhr.setRequestHeader("Accept", _s.mime);
					xhr.setRequestHeader("Content-Type", _s.contentType + "; charset=" + _s.charset + "");
					xhr.send(postd);
				} else {
					if (M.isFunction(_s.error)) {
						_s.error('ajax不被支持！')
					}
				}
				return xhr;
			},
			ajaxForm: function(sel, s) {
				M(sel).each(function(i,d) {
					if (d.nodeName.toLowerCase() == 'form') {
						var fd = new FormData(d),
							xhr = new XMLHttpRequest();
						if (s && s.data) {
							for (var k in s.data) {
								fd.append(k, s.data[k]);
							}
						}
						ajaxcall(xhr, s);
						xhr.open(d.method, d.action);
						xhr.send(fd);
					}
				});
			},
			get: function(u, d, f, t) {
				if (!u) {
					return false;
				}
				var _d = d,
					_f = f,
					_t = t;
				if (M.isFunction(_d)) {
					_t = _f;
					_f = _d;
					_d = null;
				}
				return M.ajax(u, {
					success: _f,
					data: _d,
					dataType: _t || 'html'
				});
			},
			getJSON: function(u, d, f) {
				if (!u) {
					return false;
				}
				var _d = d,
					_f = f,
					_ty = /callback=?/i.test(u) ? 'jsonp' : 'json';
				if (M.isFunction(_d)) {
					_f = _d;
					_d = null;
				}
				// console.log(u,_f,_d,_ty);
				return M.ajax(u, {
					success: _f,
					data: _d,
					dataType: _ty
				});
			},
			getScript: function(u, f) {
				if (!u) {
					return false;
				}
				var script = document.createElement('script');
				script.async = true;
				script.src = u;
				script.onload = f;
				document.body.appendChild(script);
			},
			post: function(u, d, f, t) {
				if (!u) {
					return false;
				}
				var _d = d,
					_f = f,
					_t = t;
				if (M.isFunction(_d)) {
					_t = _f;
					_f = _d;
					_d = null;
				}
				return M.ajax(u, {
					type: 'post',
					success: _f,
					data: _d,
					dataType: _t
				});
			}
		},
		/**浏览器扩展*/
		gwe = function(p) {
			try {
				if (W.external && W.external[p]) {
					var f = W.external[p];
					return UT.isFunction(f) ? f() : f;
				}
			} catch (e) {}
			return '';
		},
		bs = {
			isAndroid: (/Android/i).test(ua),
			isIPad: (/ipad/i).test(ua),
			isIPhone: (/iphone os/i).test(ua),
			isWMobile: (/Windows mobile/i).test(ua),
			isMobile: (/mobile|wap/).test(ua),

			isIECore: (/Trident/i).test(ua),
			isWebkitCore: (/webkit/i).test(ua),
			isGeckosCore: (/Gecko/i).test(ua) && !(/khtml/i).test(ua),
			se360: (function() {
				var ret = /360se/i.test(ua) || /360ee/i.test(ua);
				return ret ? ret : (/360se/i).test(gwe('twGetRunPath'));
			})(),
			sougou: (/MetaSr/i).test(ua),
			qq: (/QQBrowser/i).test(ua),
			maxthon: (function() {
				return gwe('max_version').substr(0, 1) > 0;
			})(),
			opera: W.opera ? true : false,
			firefox: (/Firefox/i).test(ua),
			uc: (/ucweb/i).test(ua),
			liebao: (/LBBROWSER/i).test(ua),
			baidu: (/BIDUBrowser/i).test(ua) || gwe('GetVersion') == 'baidubrowser'
		},
		nogc = !bs.sougou && !bs.maxthon && !bs.qq && !bs.uc && !bs.liebao && !bs.baidu && !bs.se360;
	bs.ie = (bs.isIECore && nogc);
	// '__proto__' in {}  isIE
	bs.chrome = (/Chrome/i).test(ua) && W.chrome && nogc;
	bs.safari = (/Safari/.test(ua)) && !bs.chrome && nogc;
	bs.prefix = bs.isWebkitCore ? 'webkit' : bs.isGeckosCore ? 'Moz' : bs.opera ? 'O' : bs.isIECore ? 'ms' : '';
	bs.hasTouch = 'ontouchstart' in W;
	/**事件管理栈*/
	var SET = {
		'vmousecancel': (bs.hasTouch ? 'touchcancel' : 'mouseout'),
		'vmousedown': (bs.hasTouch ? 'touchstart' : 'mousedown'),
		'vmousemove': (bs.hasTouch ? 'touchmove' : 'mousemove'),
		'vmouseup': (bs.hasTouch ? 'touchend' : 'mouseup'),
		'vmouseout': (bs.hasTouch ? 'touchleave' : 'mouseout'),
	},
		// swipe tap 扩展    不支持live
		tap, sx, sy, px, py, target, //手势相关
		lto = 800,
		lt = null,
		st, //长点击监控相关
		// 全局down监控
		gtapdown = function(e) {
			tap = true;
			var touch = e.touches ? e.touches[0] : e;
			sx = px = touch.pageX;
			sy = py = touch.pageY;
			// 长连接监控，缺点不支持终止冒泡，有点，不用每个元素单独监控，增加效率
			st = new Date - 0;
			lt = setInterval(function() {
				if (lt && (new Date - st) > lto) {
					clearInterval(lt);
					lt = null;
					e.stopPropagation = function() {
						this._sbunble = true;
					};
					ES.touchs.forEach(function(d, i) {
						!e._sbunble && M.Event.trigger.call(d, e, 'longTap');
					});
				};
			}, 200);
			M(document).on('vmousemove', gtapmove);
		},
		// 全局move监控
		gtapmove = function(e) {
			if (lt) {
				clearInterval(lt);
				lt = null
			};
			//屏蔽多点触控
			if (tap) {
				var touch = e.touches ? e.touches[0] : e,
					x = touch.pageX,
					y = touch.pageY,
					dx = Math.abs(x - px),
					dy = Math.abs(y - py);
				// 优化执行  如果位移小于限制值则不进行任何操作
				if (dx < ES.swipeStep && dy < ES.swipeStep) {
					return
				};
				// 判断方向
				target = dx > dy ? (x > sx ? 'right' : 'left') : (y > sy ? 'down' : 'up');
				px = x;
				py = y;
				// trigger当前处于监控列表的元素,1.1版本开始过程函数只会处理swipe绑定，没有了swipeleft,Right，Top,Down
				ES.touchs.forEach(function(d, i) {
					e.movement = {
						startx: sx,
						starty: sy,
						x: x,
						y: y,
						mx: dx,
						my: dy,
						target: target
					};
					M.Event.trigger.call(d, e, 'swipe');
				});
			}
		},
		// 全局up监控
		gtapup = function(e) {
			e.stopPropagation = function() {
				this._sbunble = true;
			};
			if (lt) {
				clearInterval(lt);
				lt = null;
				ES.touchs.forEach(function(d, i) {
					!e._sbunble && M.Event.trigger.call(d, e, 'tap');
				});
			} else if (target) {
				e.movement = {
					startx: sx,
					starty: sy,
					x: px,
					y: py,
					target: target
				};
				ES.touchs.forEach(function(d, i) {
					!e._sbunble && M.Event.trigger.call(d, e, 'swipeEnd');
				});
			}
			ES.touchs = [];
			tap = false;
			M(document).off('vmousemove', gtapmove)
		},
		//初始化全局手势操作
		initTouch = function() {
			M(document).on('vmousedown', gtapdown).on('vmouseup', gtapup);
		},
		// dom的down操作
		tapdown = function(e) {
			// bs.isAndroid&&e.preventDefault();
			ES.touchs.push(this);
		},
		// dom的out操作
		tapout = function(e) {
			if (tap && M(e.relatedTarget).parents(this).length == 0) {
				e.movement = {
					startx: sx,
					starty: sy,
					x: px,
					y: py,
					target: target
				};
				M.Event.trigger.call(this, e, 'swipeEnd');
				UT.remove(ES.touchs, this);
			}
		},
		//ES[type][domid]=[ES_item,ES_item....] || ES[type][selector]=[ES_item,ES_item....]; 
		//ES_item={cnt:0,fn:,data:}; cnt 当前执行的次数
		ES = {
			// swipe出发的精度，默认为2
			swipeStep: 2,
			//是否监控swipe时间的mouseout
			swipeCheckOut: false,
			//记录当前点击开始的监控对象列表,touch监控事件初始化时才会初始化为数组
			touchs: null,
			//已经live绑定的事件列表（一个事件类型只绑定一个代理函数）
			lives: {},
			// dom事件列表，每个事件，每个dom绑定一个事件类型
			data: {},
			// dom代理函数事件,每个dom每个事件类型只会绑定一个func函数来代理。由于在事件中回调，所以this代表的是dom
			// e 为event,et自定义的触发事件，不设置的话则为e自身的type，k自定义的触发对象（dom或者selector），默认为dom对象本身
			trigger: function(e, et, k) {
				et = et ? et : e.type;
				var s = k ? k : id(this),
					d = (k && k.nodeType) ? k : this,
					D = k ? ES.lives : ES.data,
					el = D[et] ? D[et][s] : null;
				if (el) {
					for (var i = 0, l = el.length; i < l; i++) {
						var n = el[i];
						e.firecnt = ++n.cnt;
						e.data = n.data;
						if (n.fn.call(this, e) === false) {
							ES.remove(et, d, n.fn);
							i--;
							l--;
						}
					}
				};
			},
			// selector的代理函数事件，根据选择器来匹配元素从而确认函数是否执行。
			live: function(e) {
				var et = e.type,
					d = e.target,
					o = M(d),
					os = o.add(o.parentsUntil(document.body)),
					ss = ES.lives[et] || [],
					dss = {};
				e.stopPropagation = function() {
					this._sbunble = true;
				}
				// 先检索出所有该事件类型的live绑定dom列表
				for (var s in ss) {
					dss[s] = M(s);
				}
				// 如此繁琐的循环，是为了保障冒泡的顺序
				os.each(function(i,d) {
					if (e._sbunble) {
						return false;
					}
					M.each(dss, function(s, n) {
						M(d).is(n) && ES.trigger.call(d, e, null, s);
					});
				});
			},
			// 事件列表中增加某事件类型某dom绑定的事件
			// d可能是dom也可能是selector
			add: function(et, d, da, f) {
				var s = d,
					D = ES.lives;
				if (typeof d != 'string') {
					s = id(d);
					D = ES.data;
					// 增加swipe，tap判断
					if (/swipe|tap/i.test(et)) {
						if (ES.touchs == null) {
							ES.touchs = [];
							initTouch();
						}
						var o = M(d);
						if (!o.data('tapinit')) {
							o.on('vmousedown', tapdown).data('tapinit', true);
							ES.swipeCheckOut && o.on('vmouseout', tapout);
						}
					} else {
						d.addEventListener(et, ES.trigger, false);
					}
				} else {
					// 如果该event.type下没有元素，则初始化live监听列表
					if (!D[et]) {
						document.addEventListener(et, ES.live, false);
					}
				}!D[et] && (D[et] = {});
				!D[et][s] && (D[et][s] = []);
				D[et][s].push({
					cnt: 0,
					data: da,
					fn: f
				});
			},
			// 事件列表中删除某事件类型[某dom]绑定的事件,暂时没有根据事件列表的为空时删除代理事件绑定
			// d可能是dom也可能是selector
			// isDie  是否die操作
			remove: function(et, d, f, isDie) {
				if (!et || !d) {
					return;
				}
				var s = isDie ? d : id(d),
					D = isDie ? this.lives : this.data;
				if (f == undefined) {
					D[et] && D[et][s] && (delete D[et][s]);
				} else {
					if (D[et] && D[et][s]) {
						var el = D[et][s];
						for (var i = 0, l = el.length; i < l; i++) {
							if (el[i]['fn'] == f) {
								D[et][s].splice(i, 1);
								i--;
								l--; //这里没有直接return 因为有可能同一个函数绑定两次。。
							}
						}
						(D[et][s].length == 0) && (delete D[et][s]);
					}
				}
				D[et] && (M.JSON.count(D[et]) == 0) && (delete D[et]);
				// 解除事件绑定
				if (isDie) {
					if (!D[et]) {
						document.removeEventListener(et, this.live, false);
						return;
					};
				} else {
					if (/swipe|tap/i.test(et)) {
						if (!D['tap'] && !D['longTap'] && !D['swipe']) {
							M(d).off('vmousedown', tapdown).off('vmouseout', tapout).data('tapinit', false);
						};
					} else {
						if (!D[et] || !D[et][s]) {
							d.removeEventListener(et, this.trigger, false);
						}
					}
				}
			}
		};

	UT.each(['live', 'die', 'bind', 'unbind', 'on', 'off', 'delegate', 'undelegate', 'one', 'trigger'], function(i, n) {
		M.fn[n] = function(evs, da, f) {
			if (!evs) {
				return this;
			}
			da && !f && (f = da) && (da = undefined);
			//兼容多事件类型同时操作
			var es = evs.split(' '),
				s = this.selector;
			for (var i = 0, l = es.length; i < l; i++) {
				var et = es[i];
				et = SET[et] ? SET[et] : et;
				switch (n) {
					case 'live':
						if (!s) {
							return this;
						}
						ES.add(et, s, da, f);
						break;
					case 'die':
						if (!s) {
							return this;
						}
						ES.remove(et, s, f, true);
						break;
					default:
						for (var i = 0, l = this.length; i < l; i++) {
							s = this[i];
							switch (n) {
								case 'bind':
								case 'on':
								case 'delegate':
									if (!f) {
										return this;
									}
									ES.add(et, s, da, f);
									break;
								case 'unbind':
								case 'off':
								case 'undelegate':
									ES.remove(et, s, f);
									break;
								case 'one':
									ES.add(et, s, da, function() {
										f.call(this, arguments[0]);
										return false;
									});
									break;
								case 'trigger':
									// 模拟触发绑定事件 ，兼容touch
									var ev = document.createEvent("Events"); //MouseEvents<UIEvents<Events
									ev.initEvent(et, true, true);
									s.dispatchEvent(ev);
									break;
							}
						}
						break;
				}
			};
			return this;
		}
	});

	M.Event = ES;
	/**动画*/
	var atimer = null,
		_AS = {}, _apre = bs.prefix ? bs.prefix + 'Transition' : 'transition',
		ntdelay = _apre + 'Delay',
		ntp = _apre + 'Property',
		ntd = _apre + 'Duration',
		nttf = _apre + 'TimingFunction',
		speed = {
			'slow': 1000,
			'normal': 600,
			'fast': 300
		},
		gfx = function(d) {
			var i = id(d),
				q = _AS[i];
			if (q == undefined) {
				var ds = d.style,
					ot = {};
				ot[ntp] = ds[ntp];
				ot[ntd] = ds[ntd];
				ot[nttf] = ds[nttf];
				ot[ntdelay] = ds[ntdelay];
				return {
					dom: d,
					oldt: ot,
					t: 0,
					stacks: []
				};
			}
			return _AS[i];
		},
		ANIMS = {
			isAnimate: function() {
				var r = false;
				this.each(function(i,d) {
					if (_AS[id(d)]) {
						r = true;
						return false;
					}
				});
				return r;
			},
			delay: function(t) {
				if (M.isNumeric(t)) {
					this.each(function(i,d) {
						var q = gfx(d);
						q.stacks.push({
							'dur': t
						});
						_AS[id(d)] = q;
					});
				}
				this._run();
				return this;
			},
			/**stop([clearQueue])
		停止所有在指定元素上正在运行的动画。
		如果队列中有等待执行的动画(并且clearQueue没有设为true)，他们将被马上执行
		*/
			stop: function(cq) {
				cq = cq === false ? false : true;
				this.each(function(j,d) {
					var idx = id(d);
					if (!_AS[idx]) {
						return false;
					};
					if (cq) {
						//中断
						var s = d.style;
						for (var i = s.length - 1; i >= 0; i--) {
							d.style[s[i]] = gc(d, s[i]);
						}
					} else {
						var as = _AS[idx],
							l = as ? as.stacks.length : 0,
							p = {};
						for (var i = 0; i < l; i++) {
							if (as.stacks[i].tran) {
								M.extend(p, as.stacks[i].tran)
							}
						}
						M(d).css(p);
					}
					M(d).css(_apre, '');
					_AS[idx].stacks = [];
				});
				return this;
			},
			/**animate(params,[speed],[easing],[fn])*/
			animate: function(p, s, e, f) {
				if (!M.isPlainObject(p) || M.isEmptyObject(p)) {
					return this;
				};
				var a = type(s),
					b = type(e),
					_s = 'normal',
					_e = 'linear',
					_f = null,
					argl = arguments.length;
				if (a == 'Object') {
					_s = s.speed ? s.speed : _s;
					_e = s.easing ? s.easing : _e;
					_f = s.callback ? s.callback : _f;
				} else {
					var timfunc = /^(ease|cubic-bezier|linear).*/;
					switch (argl) {
						case 2:
							if (a == 'Function') {
								_f = s;
							} else if (a == 'String') {
								if (timfunc.test(s)) {
									_e = s;
								} else {
									_s = s;
								}
							} else {
								_s = s;
							}
							break;
						case 3:
							if (b == 'Function') {
								_f = e;
								if (a == 'String' && timfunc.test(s)) {
									_e = s;
								} else {
									_s = s;
								}
							} else {
								_s = s;
								_e = e;
							}
							break;
						case 4:
							_s = s;
							_e = e;
							_f = f;
							break;
					}
				}
				// console.log(_s,_e,a,b);
				_s = UT.isString(_s) ? (speed[_s] || speed['normal']) : _s;
				_e = _e == 'swing' ? 'ease-in-out' : _e;
				//更新动画队列
				this.each(function(i,d) {
					var queue = gfx(d),
						tran = {};
					tran[ntp] = 'all';
					tran[ntd] = _s / 1000 + 's';
					tran[nttf] = _e;
					M.extend(tran, p);
					queue.stacks.push({
						dur: _s,
						tran: tran,
						fn: _f
					});
					_AS[id(d)] = queue;
				});
				this._run();
				return this;
			},
			/**启动全局动画队列*/
			_run: function() {
				if (atimer == null) {
					atimer = new UT.raf(20, function() {
						var n = 0;
						M.each(_AS, function(i, q) {
							if (q.stacks.length == 0) {
								//本对象的动画序列为空，还原并删除队列中的该对象
								M(q.dom).css(q.oldt);
								delete _AS[i]
							} else {
								var stack = q.stacks[0];
								//本dom的计数器开始
								if (q.t == 0) {
									q.t = new Date - 0;
									if (stack.tran != undefined) {
										M(q.dom).css(stack.tran);
									}
								} else {
									//判断结束
									if (new Date - q.t >= stack.dur) {
										if (stack.fn) {
											stack.fn.call(q.dom);
										}
										q.t = 0;
										_AS[i].stacks.shift();
									}
								}
							}
							n++;
						});
						if (n == 0) {
							this.stop();
							atimer = null
						};
					});
					atimer && atimer.start();
				}
			}
		},
		/**动画扩展包*/
		animExt = function(oo, t, s, e, f) {
			if (oo.isAnimate()) {
				return false
			};
			oo.each(function(i,d) {
				var o = M(d),
					ds = o.data('sjs_aext'),
					dis = o.css('display'),
					oc = {
						'overflow': 'hidden'
					}, /*动画初始css属性*/
					ac = {}, /*动画css属性*/
					ed = 'none'; /*动画结束后的显示状态*/
				if (!ds) {
					o.save();
					o.css({
						'display': 'block'
					});
					ds = o.getBox();
					ds.dis = (dis == 'none') ? 'block' : dis;
					o.restore();
					o.data('sjs_aext', ds);
				}
				t = (t == 'slideToggle') ? ((dis == 'none') ? 'slideDown' : 'slideUp') : ((t == 'fadeToggle') ? ((dis == 'none') ? 'fadeIn' : 'fadeOut') : ((t == 'spreadToggle') ? ((dis == 'none') ? 'spreadRight' : 'spreadLeft') : t));
				switch (t) {
					case 'slideUp':
						oc.height = ds.height;
						ac.height = 0;
						break;
					case 'slideDown':
						if (dis != 'none') {
							return oo;
						}
						oc.height = 0;
						oc.display = ed = ds.dis;
						ac.height = ds.height;
						break;
					case 'spreadLeft':
						oc.width = ds.width;
						ac.width = 0;
						break;
					case 'spreadRight':
						if (dis != 'none') {
							return oo;
						}
						oc.width = 0;
						oc.display = ed = ds.dis;
						ac.width = ds.width;
						break;
					case 'fadeIn':
						if (dis != 'none') {
							return oo;
						}
						oc.opacity = 0;
						oc.display = ed = ds.dis;
						ac.opacity = 1;
						break;
					case 'fadeOut':
						oc.opacity = 1;
						ac.opacity = 0;
						break;
				}
				o.save();
				o.css(oc).animate(ac, s, e, function() {
					o.restore();
					o.css('display', ed);
					if (f) {
						f.call(d)
					};
				});
			});
			return oo;
		};
	UT.each(['slideDown', 'slideUp', 'slideToggle', 'spreadRight', 'spreadLeft', 'spreadToggle', 'fadeIn', 'fadeOut', 'fadeToggle'], function(i, d) {
		M.fn[d] = function(s, e, f) {
			return animExt(this, d, s, e, f);
		}
	});
	/**
	 * 扩展所有工具包
	 */
	var SED = M.extend({}, UT, {
		browser: bs
	}, AJAXS),
		ED = M.extend(DOMS, ANIMS);
	M.extend(SED);
	M.fn.extend(ED);
	//全局提供
	W.sjs = W.$ = M;
})(window);
/**
 * sApp.Dao   sApp数据获取类和数据缓存类
 * build by awen ~ 71752352@qq.com ~ 2013-9-26
 */
(function(O, $, storage) {
	var Cache, Dao, Timer = O.Plus.Timer,
		storage = O.Plus.Storage || localStorage;
	// 缓存接口 build by awen  2013-9-26
	Cache = {
		/**
		 * 缓存数据
		 * @param {string} k	唯一的键
		 * @param {string|json} v   要缓存的数据
		 * @param {int} ttl 过期时间 秒  0为永不过期
		 */
		set: function(k, v, ttl) {
			var t = new Date() - 0,
				val = {
					st: t,
					val: v
				};
			if (typeof ttl != 'undefined') {
				val.ttl = ttl;
			}
			try {
				storage.setItem(k, JSON.stringify(val));
			} catch (e) {
				sApp.log('Cache缓存空间上限，清空缓存，重新存取');
				storage.clear();
				storage.setItem(k, JSON.stringify(val));
			}
		},
		/**
		 * 获取缓存的数据
		 * @param {string} k 唯一的键
		 * @param {boolean} nocheck 是否不检查过期，默认检查
		 * @param {int}	ttl 如果传入ttl则按照新的ttl来判断过期，(!不更新存储数据中的缓存过期时间，只做判断用)
		 * @return {string|json|false}   返回的数据
		 */
		get: function(k, nocheck,ttl) {
			var val = storage.getItem(k);
			// 检查过期
			if (val) {
				val = JSON.parse(val);
				// 如果传入了新的ttl,否则过期时间用老的
				if (ttl!==undefined) {
					val.ttl=ttl;
				}else{
					ttl = val.ttl;
				}
				// 不检查过期
				if (nocheck) {
					return val.val;
				}
				// 检查过期,0也不叫过期
				if (ttl) {
					var nttl = (new Date() - val.st) / 1000; //秒
					if (nttl >ttl) {
						storage.removeItem(k);
						return false;
					}
				}
				return val.val;
			}
			return false;
		},
		// 清空数据
		clear: function() {
			storage.clear();
		}
	};
	// 数据接口 build by awen  2013-9-26
	Dao = {
		// 管理ajax请求，key为渲染单元id，val为xhr对象
		stacks: {},
		// // 取消页面所有的异步请求
		// cancle : function(){
		//	location.href = 'sjs://cancle';
		//	O.UI.Dialog.hide();
		// },
		/**
		 * 数据获取接口，可以缓存，！该请求会取消相同渲染单元的ajax请求，同时也会取消内部渲染单元的请求（如果存在）
		 * @param  {string} url 接口地址
		 * @param  {string} rid 数据唯一标识，作为缓存中的key，这里是每个渲染单元的id
		 * @param  {json} param 页面参数
		 * @param  {int} ttl 数据缓存时间，0 永不过期，false不缓存
		 * @param  {boolean} refresh 是否强制刷新缓存
		 * @param  {function} callback 获取数据后的回调处理函数,callback接受 data,rid,param参数
		 * return void;
		 * modi by awen 2013-11-2  没有网络时，如果有缓存直接去缓存，而不再判断过期
		 */
		getData: function(cfg) {
			var rid, param, ttl, callback, data, cachekey, url, xhr, stacks, nocheck;
			rid = cfg.rid;
			param = cfg.param;
			//过期 0代表永不过期，false代表不缓存
			ttl = cfg.ttl===undefined?O.Config.G_CACHETIMEOUT:cfg.ttl;
			callback = cfg.callback;
			loading = cfg.loading === false ? false : true;
			if (!rid) {
				sApp.throwError('Dao %c缺少必要参数：渲染单元id');
				return false;
			}
			// 防止多次渲染检测
			stacks = this.stacks;
			xhr = stacks[rid];
			nocheck = !navigator.onLine ? true : false; //没网的时候不检查缓存过期
			cachekey = sApp.Page.curPage + '#' + rid + '#' + encodeURIComponent(JSON.stringify(param));
			// 当不是强制刷新和过期时间不为空或0的时候  ||  没网的时候 取缓存,
			if (nocheck || (!cfg.refresh && ttl!==false)) {
				data = Cache.get(cachekey, nocheck,ttl);
			}
			if (data) {
				sApp.log('sApp>>>Dao页面存在缓存，取缓存...' + rid, param);
				callback && callback.call(null, data, rid, param);
				return false;
			}
			sApp.log('Dao缓存不存在，或者已经过期，请求网络:' + rid, param);

			// 判断网络
			if (navigator.onLine) {
				if (xhr) {
					sApp.log('Dao %c取消该渲染单元的上次请求:' + rid, 'color:red');
					xhr.abort();
				}
				// 超时监听
				Timer.create(rid, {
					ttl: O.Config.G_AJAXTIMEOUT,
					callback: function(state, timercfg) {
						switch (state) {
							case 'timeout':
								sApp.UI.Dialog.show(sApp.Langs['ajaxtimeout']);
								sApp.log('Dao数据请求超时:' + rid);
								xhr.abort();
								break;
							case 'progress':
								sApp.log('Timer>定时器工作中:' + rid + '....' + timercfg.counter + '/' + timercfg.ttl);
								break;
						}
					}
				});
				//for sjs jquery
				xhr = $.ajax(cfg.url, {
					//for zepto
					// xhr = $.ajax({url:cfg.url,
					data: param,
					dataType: 'json',
					success: function(data) {
						// sApp.log('%c>>>>>>>>>>>>>>>>>xhrsunccess>>>>>>>>>'+rid,'color:red');
						Timer.stop(rid);
						sApp.log('Dao请求网络数据成功:' + rid, data);
						if (ttl !== false) {
							sApp.log('Dao存入缓存:' + cachekey + ';过期时间：' + ttl);
							sApp.Cache.set(cachekey, data, ttl);
						}
						callback && callback.call(null, data, rid, param);
					},
					error: function(xhr) {
						sApp.UI.Dialog.show(sApp.Langs['ajaxtimeout']);
						sApp.throwError('Dao请求网络数据失败...', xhr);
					}
				});
				stacks[rid] = xhr;

			} else {
				// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!，没网的时候，是不是应该继续启用过期的缓存？
				O.UI.Dialog.show(O.Langs['offline']);
			}
		}
	};

	O.Dao = Dao;
	O.Cache = Cache;
})(sApp, $, localStorage);
/*
 * sApp.Page页面管理类
 * build by awen ~ 71752352@qq.com ~ 2013-9-26
 * next : 增加页面区域定义，默认是body
 *
 * bugs:1  @2013-10-31  back 操作暂时取消，重新规划。导致页面间返回操作的时候动画会出现问题。
 *
 *
 * questions: 1  是否应该在页面隐藏的时候直接干掉页面中的数据？因为页面显示的时候会重绘？目前没有干掉。
 *				惊喜的是，滚动条位置居然保留了。因为滚动条不会再重绘。如果要干掉的话，需要考虑滚动条问题
 *
 */
(function(O, $) {
	var W = window,
		D = document,
		PC = null,
		_pindex_cur = 50,
		_pindex_prev = 49,
		_pw, //页面宽度
		_ph, //页面高度
		_animType = null, //默认动画
		_pageList = {}, //页面汇总 name:sPage
		_curPage = null, //当前页
		_pcnt = 0, //计数器
		_isback = null;
	/*************sPage 页面类 内部类*********************/
	/**
	 * [page 构造器生成page对象]
	 * @param  {string} pageid  页面id
	 * @param  {json} config  页面配置参数
	 * @param  {boolean} unique  是否单例，整个app生命周期中只有一个该页面
	 * @return {object sPage]}
	 */
	function sPage(pageid, config, unique) {
		_pcnt++;
		var dom = D.getElementById(pageid);
		// 如果没有就建立一个 modify by awen @2013-11-13
		if (!dom) {
			dom = D.appendChild(D.createElement('section'));
		};
		dom.className = 'sapp_page';
		this.dom = dom;
		this.config = config || {};
		this.unique = unique || false;
		this.name = pageid;
	}
	/**
	 * [sPage的原型]
	 */
	sPage.prototype = {
		// 生命周期开始,显示页面
		show: function() {
			var dom = this.dom,
				obj = $(dom),
				prefix = 1, //判断前后页的重要逻辑！！！！待实现
				k, v, end = null;
			PC.curPage = this.name;
			_curPage = this;

			// 初始化dom样式,页面大小
			_initPageSize(dom);
			obj.css('opacity', 1);
			obj.css(sApp.UI.EVENT_TRANSTIME, '0s');
			obj.css(sApp.UI.EVENT_TRANSFROM, 'translate(0px,0px) scale(1,1)');
			switch (_animType) {
				case PC.TRANS_NONE:
					break;
				case PC.TRANS_FADE:
					k = 'opacity';
					v = 1;
					obj.css(k, 0);
					break;
				case PC.TRANS_CENTER:
					k = sApp.UI.EVENT_TRANSFROM;
					v = 'scale(1,1)';
					obj.css(k, 'translate(0px,0px) scale(0.5,0.5)');
					break;
				case PC.TRANS_SLIDE:
					k = sApp.UI.EVENT_TRANSFROM;
					v = 'translate(0px,0px)';
					obj.css(k, 'translate(0px,' + prefix * _ph + 'px)');
					break;
				case PC.TRANS_SPREAD:
					k = sApp.UI.EVENT_TRANSFROM;
					v = 'translate(0px,0px)';
					obj.css(k, 'translate(0px,' + prefix * _pw + 'px)');
					break;
				case PC.TRANS_WIN8:
					k = sApp.UI.EVENT_TRANSFROM;
					v = 'translate(0px,0px)';
					obj.css(k, 'translate(' + prefix * _pw / 10 + 'px,0px)');
					break;
			}
			dom.style['z-index'] = _pindex_cur;
			dom.style['display'] = 'block';

			_asyncAnim(dom, k, v);
		},
		// 生命周期结束,隐藏页面
		hide: function() {
			var dom = this.dom,
				prefix = 1; //判断前后页的重要逻辑！！！！待实现
			_initPageSize(dom);
			dom.style['z-index'] = _pindex_prev;
			switch (_animType) {
				case PC.TRANS_NONE:
					dom.style['display'] = 'none';
					break;
				case PC.TRANS_FADE:
					_asyncAnim(dom, 'opacity', 0);
					break;
				case PC.TRANS_CENTER:
					_asyncAnim(dom, sApp.UI.EVENT_TRANSFROM, 'scale(0.5,0.5)');
					break;
				case PC.TRANS_SLIDE:
					_asyncAnim(dom, sApp.UI.EVENT_TRANSFROM, 'translate(0px,' + -(_ph) * prefix + 'px)');
					break;
				case PC.TRANS_SPREAD:
					_asyncAnim(dom, sApp.UI.EVENT_TRANSFROM, 'translate(' + (-_pw) * prefix + 'px,0px)');
					break;
				case PC.TRANS_WIN8:
					_asyncAnim(dom, sApp.UI.EVENT_TRANSFROM, 'translate(' + (-_pw / 10) * prefix + 'px,0px)');
					break;
			}
			$(dom).one(sApp.UI.EVENT_TRANSEND, function(e) {
				// 这里有可能会造成冲突，快速操作时！很有可能会多次动画回调冲突，这里加了判断
				if (sApp.Page.curPage != this.id) {
					this.style['display'] = 'none';
				}
			}, false);
		},
	};
	/*************页面动画库***********************/
	//异步自行动画，防止阻塞，
	function _asyncAnim(d, k, v) {
		W.setTimeout(function() {
			d.style[sApp.UI.EVENT_TRANSTIME] = '0.5s';
			d.style[k] = v;
		}, 0);
	}

	function _initPageSize(dom) {
		if (dom) {
			_pw = dom.parentNode.clientWidth;
			_ph = dom.parentNode.clientHeight;
		} else {
			_pw = W.innerWidth;
			_ph = W.innerHeight;
		}
	}
	/**
	 * 创建hash
	 * return 是否与当前页相同
	 */
	function hashBuilder(pageid, param) {
		param = param ? ('#' + JSON.stringify(param)) : '';
		return encodeURIComponent(pageid + param);
	}
	// 解析hash
	function hashResolve() {
		// 解析 hash
		var hash = decodeURIComponent(location.hash.replace("#", ''));
		hash = hash.split('#');
		pageid = hash[0] || '';
		if (!pageid) {
			pageid = sApp.Config.G_MAIN || 'index';
		}
		param = hash[1] ? JSON.parse(hash[1]) : '';
		return {
			pid: pageid,
			param: param
		};
	}
	// 判断显示页面
	function showPage(page) {
		// 如果当前页不为空,则隐藏当前页
		if (sApp.Page.curPage != page.name) {
			// 停止所有心跳机
			sApp.Plus.Timer.stopAll();
			curpage = sApp.Page.getPage(sApp.Page.curPage);
			if (curpage) {
				curpage.hide();
			}
			page.show();
		}
	}
	/*********************声明命名空间****************/
	PC = {
		///////////////常量
		TRANS_NONE: 0, //无动画
		TRANS_FADE: 1, //页面动画 渐现渐隐
		TRANS_CENTER: 2, //页面动画 中进中出
		TRANS_SPREAD: 3, //页面动画 横向动画	（默认）
		TRANS_SLIDE: 4, //页面动画 纵向动画
		TRANS_WIN8: 5, //页面动画 仿win8
		///////////////全局配置部分
		DEAFULT_TRANS: 2, //默认页面转换动画TRANS_SPREAD

		///////////////开放接口
		/**
		 * 动态设置页面控制器的动画方式
		 * @param {int} transtype [动画方式，查看对象的常量]
		 */
		setTrans: function(trantype) {
			var k = parseInt(trantype);
			if (!isNaN(k)) {
				_animType = k;
			}
		},
		/**
		 * [getPage 根据已有的页面名称获得页面]
		 * @param  {string} pageid
		 * @return {object sPae]}
		 */
		getPage: function(pageid) {
			return _pageList[pageid];
		},
		// 当前页id
		curPage: 　null,
		// 是否回退
		_isback: null,
		// 对外提供的页面入口,如果不传参数，默认根据hash来判断，如果hash也判断不出来，则取默认主页
		show: function(pageid, param) {
			// 如果是传参的pageid则使用当前pageid改变hash，从而触发hash变化，调用页面入口
			this._isback = false;
			if (pageid) {
				var hash = hashBuilder(pageid, param);
				// 相同页面点击是否应该刷新呢？
				if ('#' + hash == window.location.hash) {
					sApp.Plus.FSM.change(pageid, 'pageinit', param);
				} else {
					location.hash = hash;
				}
			} else {
				var rets = hashResolve();
				// 解析 hash
				sApp.Plus.FSM.change(rets.pid, 'pageinit', rets.param);
			}
		},
		// 渲染某个渲染区域，注意！！！为当前页操作，不会引起hash变化从而刷新页面，是否合理，有待辩证
		// param 要传入的参数，可以只是部分改变的参数
		// cover 是覆盖还是附加，给用户一个自操作的空间
		render: function(rid, param, cover) {
			sApp.Plus.FSM.change(sApp.Page.curPage, 'rendinit', rid, param, cover);
		},
		/**
		 * [create 创建页面实例]
		 * @param  {string} pageid
		 * @param  {json} cfg 页面配置参数
		 * @return {object sPage}
		 */
		create: function(pageid, cfg) {
			if (!pageid) {
				return false;
			}
			var dom = D.getElementById(pageid);
			if (!dom) {
				return false;
			}
			var page = new sPage(pageid, cfg);
			_pageList[page.name] = page;
			// 生成该页面的状态机
			var fsm = sApp.Plus.FSM.create(pageid, {
				states: ['pageinit', 'rendinit', 'renddatainit', 'rending', 'rendok', 'pageok'],
				change: function(f, t) {
					var pageid = this.name,
						param,
						page = sApp.Page.getPage(pageid),
						curpage,
						pcfg,
						rid,
						rcfg;
					switch (t) {
						case 'pageinit':
							// 如果没有传入param将使用配置文件中的参数 modi by awen @2013-10-30
							if (page) {
								pcfg = page.config;
								// add by awen @2013-11-1 将当前页的hash参数赋值当前页配置文件
								pcfg.hashparam = arguments[2];

								// 判断是否回退前进操作
								if (sApp.Page._isback == null) {
									sApp.log('\t\t>是回退或者前进操作，不再绘制');
									showPage(page);
									return false;
								} else {
									sApp.log('\t\t>非回退或者前进操作,清空渲染区域?');
									//回退初始化
									sApp.Page._isback = null;
									// page.dom.innerHTML='';
									showPage(page);
								}
								// 渲染本页渲染单元
								if (pcfg.units) {
									for (var rid in pcfg.units) {
										// console.log('sApp.Page>>>>>>>>初始化渲染区域:'+rid);
										// 显示页面的时候是首次渲染，全部都是覆盖操作
										// 清空滚动条内的内容
										var scroll = sApp.Plus.Scroll.stacks[rid];
										if (scroll) {
											// setTimeout(function(){
											//	scroll.dom_more.innerHTML = '';
											//	scroll.destroy();
											// },0);
											// delete  sApp.Plus.Scroll.stacks[rid];
											scroll.scrollTo(0, 0);
										}
										sApp.Plus.FSM.change(pageid, 'rendinit', rid, null, true);
									}
								}
								// 判断页面配置中是否存在滚动条,不可能存在上下拉刷新，因为只有渲染单元才有可能存在数据接口
								if (pcfg.scroll && sApp.Plus.Scroll) {
									sApp.Plus.Scroll.init(pageid);
								}
								// 判断页面是否存在懒加载
								if (pcfg.lazyload) {
									sApp.Plus.slazyload.start(true, true);
								} else {
									sApp.Plus.slazyload.stop(true, true);
								}
							} else {
								sApp.UI.Dialog.show(sApp.Langs['nopage'] + ':' + pageid);
							}
							break;
						case 'rendinit': //初始化渲染区域，（滚动条，取数据）
							var dom, tmpparam;
							rid = arguments[2];
							param = arguments[3];
							pcfg = page.config;
							rcfg = pcfg.units[rid];
							dom = D.getElementById(rid);
							// 如果dom不存在自动创建
							if (!dom) {
								dom = D.createElement('div');
								dom.id = rid;
								page.dom.appendChild(dom);
							}
							// 将实际cover赋值在新的key中
							rcfg._cover = typeof arguments[4] == 'undefined' ? (rcfg.cover === false ? false : true) : arguments[4];
							// console.log("%c>>>>>>>>"+rcfg._cover+':'+arguments[4]+':'+rcfg.cover,'color:blue');
							//// 合并当前页的hash参数到本渲染单元中用到的参数,得出出真实的参数，之所以克隆是为了防止污染初始配置
							//// 参数优先级：传入的参数>hash参数>默认参数
							//// 之所以写这么复杂是为了保证同样的结果发送的参数是一样的。
							tmpparam = $.extend({}, rcfg.param);
							if (pcfg.hashparam) {
								for (var k in tmpparam) {
									//hash参数只有在传入的param中不存在时才会生效
									if (typeof pcfg.hashparam[k] != 'undefined') {
										tmpparam[k] = pcfg.hashparam[k];
									}
								}
							}
							param && $.extend(tmpparam, param);
							param = tmpparam;
							if (!dom) {
								sApp.throwError('Page %c渲染单元的dom不存在:' + rid);
								return false;
							}
							if (!rcfg) {
								sApp.throwError('Page %c当前页不存在该渲染单元:' + rid);
								break;
							}

							sApp.Plus.FSM.change(pageid, 'renddatainit', rid, param);
							break;
						case 'renddatainit': //初始化渲染区数据refresh代表强制刷新
							var ttl = sApp.Config.G_CACHETIMEOUT,
								refresh = arguments[4] || false;
							rid = arguments[2];
							param = arguments[3];
							rcfg = page.config.units[rid];

							if (!rcfg.data && rcfg.dataurl) {
								// 接口数据
								sApp.UI.Dialog.show(sApp.Langs['loading'], {
									type: sApp.UI.Dialog.BTN_NONE
								});
								// 只通过timeout来控制缓存，取缔cache
								// if (!rcfg.cache) {//可能是undifind可能是false
								// 	ttl = false;
								// } else if (rcfg.dataurl && rcfg.timeout != undefined) {
								// 	ttl = rcfg.timeout;
								// }
								sApp.Dao.getData({
									refresh: refresh,
									rid: rid,
									url: rcfg.dataurl,
									param: param,
									ttl: rcfg.timeout,
									callback: function(data, rid, param) {
										sApp.UI.Dialog.hide();
										if (data) {
											// 待优化》》》callback貌似不是很友好，用到了外部变量，！！！！！！！！
											sApp.Plus.FSM.change(sApp.Page.curPage, 'rending', rid, data);
										} else {
											sApp.UI.Dialog.show(sApp.Langs['data_error']);
											sApp.throwError('Page%c 渲染区域接口返回数据错误:' + rid);
										}
									}
								});
							} else {
								// 静态数据或者无数据
								var data = rcfg.data ? rcfg.data : null;
								sApp.log('该渲染单元没有发现任何数据:' + rid)
								sApp.Plus.FSM.change(sApp.Page.curPage, 'rending', rid, data);
							}
							break;
						case 'rending': // 渲染区数据ok，渲染
							var data,
								scroller,
								tplid,
								dom_more,
								html;
							rid = arguments[2];
							data = arguments[3];
							rcfg = page.config.units[rid];
							tplid = rcfg.tpl || rid + '_tpl';
							// 判断渲染单元配置中是否存在滚动条,阻塞ui，考虑异步,rid?局部变量会否被污染
							if (rcfg.scroll && sApp.Plus.Scroll && !sApp.Plus.Scroll.stacks[rid]) {
								rcfg.scroll.onending = function(t) {
									// console.log(rid,rcfg,t);
									// 刷新和load more逻辑
									var pagekey = rcfg.scroll.pagekey,
										pageno = rcfg.param[pagekey] || 1;
									if (t == 'refresh') {
										rcfg.param[pagekey] = 1;
										rcfg._cover = true;
										sApp.Plus.FSM.change(pageid, 'renddatainit', rid, rcfg.param, true);
									} else if (t == 'more') {
										rcfg.param[pagekey] = pageno + 1;
										rcfg._cover = false;
										sApp.Plus.FSM.change(pageid, 'renddatainit', rid, rcfg.param);
									}
								};
								sApp.Plus.Scroll.init(rid, rcfg.scroll);
							}
							scroller = sApp.Plus.Scroll && sApp.Plus.Scroll.stacks[rid];
							dom_more = scroller ? scroller.dom_more : $('#' + rid);
							// console.log(dom_more);
							if (!dom_more || !dom_more.length || !tplid) {
								sApp.throwError('Page %c渲染单元的模板不存在:' + tplid);
								break;
							}
							html = template.render(tplid, data);

							if (rcfg._cover) {
								dom_more.html(html);
							} else {
								dom_more.append(html);
							}
							sApp.Plus.FSM.change(pageid, 'rendok', rid);
							break;
						case 'rendok':
							var rid = arguments[2],
								fn = '__' + rid;
							W[fn] && W[fn].call(null, page.config);
							//本页所有模块渲染总数加1
							this.rendernow++;
							// 是否存在滚动条,存在的话刷新一下
							if (sApp.Plus.Scroll && sApp.Plus.Scroll.stacks[rid]) {
								// console.log(">>>>>>>>>>>>>>>>>>>>>>>刷新滚动条>>"+rid);
								sApp.Plus.Scroll.stacks[rid].refresh();
							}
							// 判断是否所有渲染单元都渲染了
							if (this.rendernow == this.rendercount) {
								sApp.Plus.FSM.change(pageid, 'pageok');
							}
							break;
						case 'pageok':
							var fn = '__' + pageid;
							// 执行约定好的页面回调
							W[fn] && W[fn].call(null, pageid, page.config);
							break;
					}
				}
			});
			// 在虚拟机对象上保存当前页渲染区域数量，并初始化当前渲染个数为0
			fsm.rendercount = 0;
			for (var k in cfg.units) {
				fsm.rendercount++;
			}
			fsm.rendernow = 0;
			return page;
		},
		//创建页面
		back: function() {
			history.go(-1);
		},
	};
	_animType = PC.DEAFULT_TRANS;
	// 命名空间
	O.Page = PC;

	/************************************ 实时监听hash变化 */
	W.addEventListener('hashchange', function() {
		// console.log('hash 发生变化');
		// hash发生变化时根据hash来显示页面
		var rets = hashResolve();
		sApp.Plus.FSM.change(rets.pid, 'pageinit', rets.param);
	}, false);
})(sApp, $);