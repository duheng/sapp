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