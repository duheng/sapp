/********************************************************************************************
 name ：	webkit浏览器locaStorage本地存储本页事件触发模块
 version：	1.0
 author：	awen
 email:：	71752352@qq.com
 descr：
*********************************************************************************************/
;
(function(O, W, undefined) {
	var storage = W.localStorage,
		iswebkit = /webkit/i.test(navigator.userAgent),
		url = W.location.href;

	function fire(key, oldval, newval) {
		var se = document.createEvent("StorageEvent");
		se.initStorageEvent('storage', false, false, key, oldval, newval, url, storage);
		W.dispatchEvent(se);
	}

	function clear() {
		if (storage.length > 0) {
			iswebkit && fire('', null, null);
			storage.clear();
		};
	}

	function add(key, v) {
		var oldv = storage[key];
		if (oldv != v) {
			oldv = (oldv == undefined) ? null : oldv;
			storage[key] = v;
			// 触发事件
			iswebkit && fire(key, oldv, v);
		}
	}

	function remove(key) {
		var oldv = storage[key];
		if (oldv != undefined) {
			storage.removeItem(key);
			// 触发事件
			iswebkit && fire(key, oldv, null);
		}
	}
	O.Storage = {
		clear: clear,
		setItem: add,
		removeItem: remove,
		getItem: function(k) {
			return storage.getItem(k);
		},
		length: function() {
			return storage.length;
		},
		key: storage.key
	}
})(sApp.Plus, window);