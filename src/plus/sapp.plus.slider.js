/*
*name		: slider
*descr		: 不基与任何框架的可拖动循环滚动幻灯展示
*author		: awen
*email		: 71752352@qq.com
*version	: 1.0
*demo		:
var slider  = new sApp.Plus.Slider('.slider',{
	'fill'		：false			//是否固定高度（默认false）
	'showbar'	: true,			// 是否显示bar，默认true
	'bartype'	: 'line',		// 页码条样式，circle，line（默认）
	'baroncolor': '#FF886A',	// 当前页码颜色
	'baroffcolor':'#d5d5d5',	// 非当前页码颜色
	'callback'	: false,		// 滑动结束回调函数
	'idx'		: 0,			//当前页码 从0开始
	'step'		: 3,			//滑动的敏感度,如2是总宽度的1/2
	'delay'		: 5000,			//自动轮播的事时间间隔（毫秒）
	'click'		: function(idx){
					console.log('当前点击的是第'+idx+'页',this);
				}				//点击事件,传入当前页码索引作为参数，this指向当前展示的对象
});
slider.scroll([-1|1],[anim]);
*/
window.SAPP_SLIDER_CNT = 0; //全局计数器
sApp.Plus.Slider = function(sel, s) {
	var W = window,
		D = document,
		oWrap = D.querySelector(sel);
	if (!oWrap || !oWrap.nodeName) {
		return false;
	}

	// 初始化参数
	var _s = {
		'fill': (s && s.fill === true) ? true : false,
		'idx': s && s.idx ? s.idx : 0,
		'step': (s && s.step) || 3,
		'showbar': (s && s.showbar === false) ? false : true,
		'bartype': s && s.bartype ? s.bartype : 'line',
		'baroncolor': s && s.baroncolor ? s.baroncolor : 'rgb(219, 53, 53)',
		'baroffcolor': s && s.baroffcolor ? s.baroffcolor : 'rgba(0,0,0,0.2)',
		'delay': (!s || s.delay == undefined) ? 5000 : s.delay,
		'callback': s && s.callback,
		'click': s && s.click
	},
		O = this,
		ot = null,
		tt = null,
		oScroll = null,
		pages = null,
		oBar = null,
		istap = null,
		sstep = 10,
		idx = _s.idx,
		plen = 0,
		pw = 0,
		ph = 0,
		startX = 0,
		mouseX = 0,
		key_slider = 'data_slider',
		// 参数
		hasTouch = ('ontouchstart' in W),
		$S = {
			start: hasTouch ? 'touchstart' : 'mousedown',
			move: hasTouch ? 'touchmove' : 'mousemove',
			end: hasTouch ? 'touchend' : 'mouseup',
			cancle: hasTouch ? 'touchcancle' : 'mouseout',
			transform: '-webkit-transform',
			transition: '-webkit-transition',
			// duration : '-webkit-transitionDuration',
			anim: '0.5s cubic-bezier(0.33, 0.66, 0.66, 1)'
		};
	// 获取第一个ElementChild 防止某些
	function gFirstElementChild(d) {
		var child = d.firstElementChild || false;
		if (!child) {
			var childs = d.childNodes,
				l = childs.length;
			for (var i = 0; i < l; i++) {
				child = childs[i];
				if (child.nodeType == 1) {
					return child;
				}
			}
		}
		return child;
	}
	// 获取样式
	function gc(d, k) {
		return W.getComputedStyle(d).getPropertyValue(k) || '';
	}
	// 获取trans数组
	function gtrans(css) {
		var reg = /\-?[0-9]+\.?[0-9]*/g; //reg=/\-?[0-9]+/g
		return css.match(reg);
	}

	function setbar() {
		if (oBar) {
			var dots = oBar.querySelectorAll('span'),
				nextid = getid(idx + 1),
				previd = getid(idx - 1);
			if (nextid != idx) {
				dots[nextid].style['background-color'] = _s.baroffcolor;
			}
			if (previd != idx) {
				dots[previd].style['background-color'] = _s.baroffcolor;
			}
			dots[idx].style['background-color'] = _s.baroncolor;
		}
		// 滚动结束后的回调
		_s.callback && 　_s.callback(idx);
	}
	//启动动画
	function animStart() {
		if (!ot && _s.delay) {
			ot = setInterval(function() {
				O.scroll(1, true);
			}, _s.delay);
		}
	}
	//停止动画
	function animStop() {
		if (ot) {
			clearInterval(ot);
			ot = null;
		}
	}
	// 设置位置
	function setPos() {
		// console.log(idx);
		oScroll.style[$S.transform] = 'translate3d(' + O.transX + 'px,0px,0px)';
		// oScroll.style[$S.transform] = 'translate('+O.transX+'px,0px)';
	}
	// 处理idx，防止越界，循环处理
	function getid(idx) {
		return idx < 0 ? plen - 1 : idx >= plen ? 0 : idx;
	}
	// 滑动开始事件
	function start(e) {
		// android的webview在touchmove过程中会有触发不了事件的bug
		e.preventDefault();
		// 停止动画,保存当前状态
		animStop();

		var _e = (e.touches && e.touches[0]) ? e.touches[0] : e;
		startX = mouseX = _e.pageX;
		oScroll.style[$S.transition] = 'none';
		istap = true;

		oWrap.addEventListener($S.move, move, false);
	}
	// 滑动事件
	function move(e) {
		var _e = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : e,
			nowx = _e.pageX,
			mx = nowx - mouseX;
		// 点击敏感率
		if (istap) {
			var totalmx = Math.abs(nowx - startX);
			if (totalmx > 5) {
				istap = false;
			}
		}
		O.transX += mx;
		mouseX = nowx;
		setPos();
	}
	// 滑动结束事件
	function end(e) {
		oWrap.removeEventListener($S.move, move, false);
		// 执行回调函数
		if (istap) {
			_s.click && _s.click.call(pages[idx], idx);
			animStart();
		} else if (istap === false) {
			// 判断当前页码
			var mx = mouseX - startX,
				pstep = mx >= sstep ? -1 : mx <= -sstep ? 1 : 0;
			O.scroll(pstep, true);
		}
		istap = null;
	}
	// 初始化大小
	function initSize(cache) {
		// 初始化宽高
		pw = oWrap.clientWidth;
		ph = oWrap.clientHeight;
		sstep = pw / _s.step;

		// 重新设置样式
		var ps = oScroll.querySelectorAll('li');
		for (var i = 0, l = ps.length; i < l; i++) {
			ps[i].style['width'] = pw + 'px';
			if (_s.fill) {
				ps[i].style['height'] = ph + 'px';
			}
		}
		// console.log(pw);
		_s.showbar && (oBar.style['width'] = pw + 'px');
		// 设置当前位置
		O.transX = (-2 - idx) * pw;
		setPos();
	}
	O.getIndex = function() {
		return idx;
	}
	// 滚动
	O.scroll = function(pstep, anim) {
		var index = idx + pstep;
		idx = getid(index);
		// 回溯
		if (index != idx) {
			oScroll.style[$S.transition] = 'none';
			O.transX += pstep * plen * pw;
			setPos();
		}
		// 设置位置,估计就算不使用动画设置transfrom同样会占用时间的，下面做了个小延迟，否则会冲突。
		tt = setTimeout(function() {
			O.transX = (-2 - idx) * pw;
			oScroll.style[$S.transition] = anim ? $S.anim : 'none';
			setPos();
		}, 0);
		// 设置滚动条
		setbar();
		// 启动动画
		animStart();
	};
	/***************************初始化 modity by awen 2013-9-17 兼容页面缓存机制*************************************/
	oScroll = gFirstElementChild(oWrap);
	if (!oScroll) {
		return false;
	}
	// oScroll.style.cssText+=';display:-webkit-box;-webkit-backface-visibility:hidden;-webkit-font-smoothing:subpixel-antialiased;margin:0;padding:0;list-style-type:none;';
	oScroll.style.cssText += ';display:-webkit-box;height:100%;-webkit-backface-visibility:hidden;-webkit-font-smoothing:subpixel-antialiased;margin:0;padding:0;list-style-type:none;';
	// 判断是否缓存
	if (oWrap.hasAttribute(key_slider)) {
		var counter = oWrap.getAttribute(key_slider);
		W.SAPP_SLIDER_CNT = parseInt(counter);

		pages = oScroll.querySelectorAll('li');
		plen = pages.length;
		if (plen == 0) {
			return false;
		}
		// 取出附加项目
		pages = Array.prototype.slice.call(pages, 2, plen - 2);
		plen -= 4;
		if (_s.showbar) {
			oBar = oWrap.querySelector('div');
		}
	} else {
		var counter = ++W.SAPP_SLIDER_CNT; //当前计数器
		oWrap.setAttribute(key_slider, counter);
		oWrap.style['overflow'] = 'hidden';
		pages = oScroll.querySelectorAll('li');
		plen = pages.length;
		if (plen == 0) {
			return false;
		}
		// 为了能够无限循环,前后各补两页
		var html = oScroll.innerHTML,
			pre1 = getid(plen - 2),
			pre2 = getid(plen - 1),
			last1 = getid(0),
			last2 = getid(1);
		oScroll.innerHTML = pages[pre1].outerHTML + pages[pre2].outerHTML + html + pages[last1].outerHTML + pages[last2].outerHTML;
		//初始化滚动条
		if (_s.showbar && !oBar) {
			var barcss = 'position: absolute;z-index:10px;display:-webkit-box;-webkit-box-pack:center;text-align:center;',
				dotcss = 'background-color:' + _s.baroffcolor + ';';
			barcss += (_s.bartype == 'line') ? 'margin-top:-5px;height:5px;' : 'margin-top:-30px;line-height:30px;';
			dotcss += (_s.bartype == 'line') ? 'display:block;-webkit-box-flex:1;height:5px;' : 'margin:auto 3px;display:inline-block;width:10px;height:10px;border-radius:10px;';

			oBar = D.createElement('div');
			oBar.style.cssText = barcss;
			for (var i = 0; i < plen; i++) {
				var dot = D.createElement('span');
				dot.style.cssText = dotcss;
				oBar.appendChild(dot);
			}
			oWrap.appendChild(oBar);
		}
	}

	setbar();
	// 初始化事件绑
	oWrap.addEventListener($S.start, start, false);
	oWrap.addEventListener($S.cancle, end, false);
	D.addEventListener($S.end, end, false);
	/**事件绑定，防止抖动，防止多次resize*/
	W.addEventListener('resize', function(e) {
		initSize();
	}, false);
	initSize();
	animStart();
};