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