/**
 * 滚动条统一处理插件，对外提供标准的滚动条接口，目前用到了iscroll.
 * 1 iscroll要求滚动区域内部所有元素必须仅有一个容器（这个容器内部可以有多个渲染单元）
 * 2 如果有上拉下拉刷新将破坏原有的内部结构（为了使用户不再需要自己写上拉下拉的样式），所以写样式的时候请不要使用id>选择器
 * 3 如果区域内有不定高度的图片，那么无疑对滚动条时毁灭性的灾难，因为初始化滚动条时，可能图片高度并没有吧诶计算出来，导致滚动条计算出现问题
 * 4 滚动条对象中对外增加了，上滚动区域，下滚动区域，列表区域的对象，方便用户调用
 * 5 增加了显示隐藏加载更多功能接口，销毁滚动条接口
 * 6 增加了降级解决方案，及不显示iscroll而是用nextbtn
 * build by awen @2013-10-30
 */
(function(O, $) {
	var counter = 0; //计数器

	O.Scroll = {
		//滚动条管理栈，key为传入的id
		stacks: [],
		/**
		 * 初始化滚动条插件
		 * @param  {string} id  要使用滚动条的id
		 * @param  {json} cfg 配置文件：
		 *                {
		 *                  refresh : true,	//下拉刷新
		 *                  loadmore : true,//上拉加载
		 *                  nextbtn : false, //由于iscroll过于消耗资源，android力不从心，
		 *                  				所以增加了降级方案，下一页按钮,比iscroll优先级高
		 *                  offsetHeight:40,//上拉下拉区域的高度 默认40
		 *                  onmoving :　	//滚动条滚动时候的回调
		 *                  onrefresh : fn	//刷新的时候的回调
		 *                  onending :	//滚动结束时候的回调
		 *                  pagekey:'page',	//分页的页码key
		 *                  protection:true,//是否开启分页保护
		 *                }
		 * @return {string} 当前内容区域的id（如果存在上拉下拉会被重构）
		 */
		init: function(id, cfg) {
			var icfg, dom, listid, scroller, postype, listid, htmls;
			if (O.Scroll.stacks[id]) {
				// console.log('sApp.Plus.Scroll>>>>>>>>>>>>>>>>滚动条已经初始化过.');
				return;
			}

			counter++;
			dom = $('#' + id);
			listid = id + '_more';
			htmls = [];

			if (cfg && cfg.nextbtn) {
				// 不允许overflow隐藏
				// dom.css('overflow','auto');
				//重新组织dom结构
				htmls.push('<div id=' + listid + '>');
				htmls.push(dom.html());
				htmls.push('</div>');
				// 下一页按钮
				htmls.push('<div class="sapp_scroll_nextbtn">加载下一页</div>');
				dom.html(htmls.join(''));
				scroller = {
					'wrapper': dom[0],
					'netbtn': true,
					'scrollTo': function(x, y) {
						x = x || 0;
						y = y || 0;
						this.wrapper.scrollTop = x;
						this.wrapper.scrollLeft = y;
						window.scrollTo(x, y);
					},
					'refresh': function() {
						this.pullUp.html('加载下一页');
					},
					'destroy': function() {}
				};
				console.log(">>>>>>>>>>>>>>>>>>>>>>>nextbtn创建:" + id, listid);
			} else {
				postype = dom.css('position');
				if (postype != 'absolute' && postype != 'relative') {
					dom.css('position', 'relative');
				}
				//重新组织dom结构
				htmls.push('<div>');
				// 顶部dom
				if (cfg && cfg.refresh) {
					htmls.push('<div class="sapp_scroll_pullDown"><span class="sapp_pullDownIcon"></span><span class="sapp_pullDownLabel">下拉刷新...</span></div>');
				}
				htmls.push('<div id=' + listid + '>');
				htmls.push(dom.html());
				htmls.push('</div>');
				// 底部dom
				if (cfg && cfg.loadmore) {
					htmls.push('<div class="sapp_scroll_pullUp"><span class="sapp_pullUpIcon"></span><span class="sapp_pullUpLabel">上拉加载...</span></div>');
				}
				htmls.push('</div>');
				dom.html(htmls.join(''));
				// 创建iscroll
				if (cfg) {
					icfg = {
						useTransition: true
					};
					// 上拉下拉，要求固定的格式，外面包裹两层，上下拉bar与元素同级
					icfg.topOffset = cfg.offsetHeight ? cfg.offsetHeight : cfg.refresh ? 40 : 0;
					//刷新dom
					icfg.onRefresh = function() {
						var pullDown = this.pullDown,
							pullUp = this.pullUp;
						if (pullDown) {
							pullDown.removeClass('sapp_scroll_loading');
							pullDown.find('.sapp_pullDownLabel').text('下拉刷新...');
						}
						if (this.canPullUp && pullUp) {
							pullUp.removeClass('sapp_scroll_loading');
							pullUp.find('.sapp_pullUpLabel').text('上拉加载...');
						}
					};
					// 滚动中
					icfg.onScrollMove = function() {
						var pullDown = this.pullDown,
							pullUp = this.pullUp;
						if (pullDown && this.y > 5 && !pullDown.hasClass('sapp_flip')) {
							pullDown.addClass('sapp_flip');
							pullDown.find('.sapp_pullDownLabel').text('松开刷新...');
							this.minScrollY = 0;
						} else if (pullDown && this.y < 5 && pullDown.hasClass('sapp_flip')) {
							pullDown.removeClass('sapp_flip');
							pullDown.find('.sapp_pullDownLabel').text('下拉刷新...');
							this.minScrollY = -this.options.topOffset;
						} else if (this.canPullUp && pullUp && this.y < (this.maxScrollY - 5) && !pullUp.hasClass('sapp_flip')) {
							pullUp.addClass('sapp_flip');
							pullUp.find('.sapp_pullUpLabel').text('松开加载...');
							this.maxScrollY = this.maxScrollY;
						} else if (this.canPullUp && pullUp && this.y > (this.maxScrollY + 5) && pullUp.hasClass('sapp_flip')) {
							pullUp.removeClass('sapp_flip');
							pullUp.find('.sapp_pullUpLabel').text('上拉加载...');
							this.maxScrollY = this.options.topOffset;
						}
						cfg.onmoving && cfg.onmoving.call(this);
					};
					// 结束滚动
					icfg.onScrollEnd = function() {
						var types, pullDown = this.pullDown,
							pullUp = this.pullUp;
						if (pullDown && pullDown.hasClass('sapp_flip')) {
							pullDown.removeClass('sapp_flip').addClass('sapp_scroll_loading');
							pullDown.find('.sapp_pullDownLabel').text('Loading...');
							types = 'refresh';
						} else if (this.canPullUp && pullUp && pullUp.hasClass('sapp_flip')) {
							pullUp.removeClass('sapp_flip').addClass('sapp_scroll_loading');
							pullUp.find('.sapp_pullUpLabel').text('Loading...');
							types = 'more';
						}
						//一些刷新数据请求，渲染数据页面什么的，请写在这里
						if (types && cfg.onending) {
							console.log('sApp.scroll>>>>>>>>>>>>滚动条拖拽事件:' + types);
							cfg.onending.call(this, types);
						}
					};
				}
				console.log(">>>>>>>>>>>>>>>>>>>>>>>iscroll创建:" + id, listid);
				// 将滚动条加入栈中方便统一管理
				scroller = new iScroll(id, icfg);
			}
			// 记录一些重要标记到scroll对象中!!!!!!!!!!
			scroller.sign = counter;
			scroller.dom_more = dom.find('#' + listid);
			if (cfg) {
				if (cfg.nextbtn) {
					scroller.pullUp = dom.find('.sapp_scroll_nextbtn');
					if (cfg.onending) {
						scroller.pullUp.on('click', function() {
							this.innerHTML = 'loading...';
							cfg.onending.call(scroller, 'more');
						}, false);
					}
				} else {
					scroller.pullUp = cfg.loadmore ? dom.find('.sapp_scroll_pullUp') : false;
				}
				scroller.pullDown = cfg.refresh ? dom.find('.sapp_scroll_pullDown') : false;
				// 标记pullup加载更多可用不可用
				scroller.canPullUp = cfg.nextbtn || cfg.loadmore;
			}

			O.Scroll.stacks[id] = scroller;

			// 分页保护
			if (cfg && cfg.protection) {

			}

			// 返回当前滚动条
			return scroller;
		},
		// 显示上拉刷新部分，并开启功能,注意前提是初始化页面时有滚动条
		enablePullUp: function(id) {
			var scroller = this.stacks[id];
			if (scroller && scroller.pullUp) {
				// 取消显示
				scroller.pullUp.css('visibility', 'visible');
				// 取消功能
				scroller.canPullUp = true;
			}
		},
		// 隐藏上拉刷新部分，并取消功能
		disablePullUp: function(id) {
			var scroller = this.stacks[id];
			if (scroller && scroller.pullUp) {
				scroller.pullUp.css('visibility', 'hidden');
				scroller.canPullUp = false;
			}
		},
		// 销毁滚动条
		destroy: function(id) {
			var scroller = this.stacks[id];
			if (!scroller) {
				return;
			}

			if (scroller.pullUp) {
				scroller.pullUp.remove();
			}
			if (scroller.pullDwon) {
				scroller.pullDwon.remove();
			}
			if (!scroller.nextbtn) {
				scroller.destroy();
			}
			var dom_more = scroller.dom_more;
			scroller.wrapper.innerHTML = dom_more[0].innerHTML;
			delete this.stacks[id];
		},
		// 销毁所有滚动条
		destroyAll: function() {
			for (var k in this.stacks) {
				this.destroy(k);
			}
		}
	};
})(sApp.Plus, $);