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