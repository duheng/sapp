/*
*图片加载优化，页面中的image请增加data-isrc属性标签设置真实图片地址
*src属性可以不设置也可以设置为占位图
*author : awen
*version: v3.0
*email  : 71752352@qq.com
*descr  : 支持原生滚动条和iscroll的第三方滚动条，请注意要在iscroll库加载完毕之后执行该初始化
    1   延迟加载，不展示的就不加载展示
    2   预加载，第一屏符合条件展示的图片将不在等待dom渲染，减少时间浪费。
    3   占位图片最好是data64编码直接传给js，增加体验。
    4   用到了getBoundingClientRect和firstElementChild所以老旧手机就算了包括iphone3gs
    5   请注意系统滚动条监控和iscroll监控最好不要同时打开，防止懒加载区域重叠计算（出于效率考虑未作排除，不影响效果）
*/
(function(O) {
    var _cfg = {}, D = document,
        ua = navigator.userAgent,
        prefix = '',
        trans = '-webkit-transition',
        transend = 'webkitTransitionEnd',
        each = Array.prototype.forEach,
        docroot = null,
        _winon = false,
        _iscrollon = false,
        _orginend = null,
        _orgintranend = null,
        _orginrefresh = null,

        loadImage = function(img) {
            var true_src = img.getAttribute(_cfg.attr);
            img.removeAttribute(_cfg.attr);
            if (true_src) {
                var t_img = new Image();
                t_img.onload = function() {
                    // console.log(this.src,img,'>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<');
                    switch (_cfg.effect) {
                        case 'none':
                            img.src = this.src;
                            img = null;
                            break;
                        case 'fade':
                            // var oldt = img.style.cssText;
                            // img.addEventListener(transend, function(e) {
                            //     this.style.cssText = oldt;
                            //     this.removeEventListener(e.type, arguments.callee, false);
                            // });
                            img.style['opacity'] = 0;
                            img.src = this.src;
                            setTimeout(function() {
                                img.style[trans] = '0.5s';
                                img.style['opacity'] = 1;
                                img = null;
                            }, 1);
                            break;
                    }
                };
                t_img.src = true_src;
            }
        },
        loadImages = function(imgs) {
            each.call(imgs, function(d) {
                loadImage(d);
            });
        },
        _lazyload = function(dom) {
            dom = dom && dom.nodeName ? dom : document;
            var imgs, mbox, bottom;
            if (dom == document) {
                bottom = window.innerHeight;
            } else {
                mbox = dom.getBoundingClientRect();
                bottom = mbox.bottom;
            }
            imgs = dom.querySelectorAll('img[' + _cfg.attr + ']');
            // console.log('lazyload>>>>>>>>>>>>>>检查监控区域:', dom, '\n\tbottom:' + bottom + ',images:' + imgs.length);
            Array.prototype.forEach.call(imgs, function(d) {
                var box = d.getBoundingClientRect();
                // 排除隐藏的image
                if ((box.bottom > 0 || box.top > 0) && box.top < bottom) {
                    // d.setAttribute('data-lazy-last',t);  //为window的scroll做处理，预留
                    loadImage(d);
                }
            });
        },
        // 唯一初始化接口
        init = function(cfg) {
            cfg = cfg || {};
            _cfg.placeImage = cfg.placeImage || false; //占位图，可以不传，用户自己在src中设定也可以
            _cfg.effect = cfg.effect || 'fade'; //显示效果，fade渐现  none无 
            _cfg.attr = cfg.attr || 'data-isrc'; //真实图片路径属性名称
            if ('iScroll' in window) {
                _orginend = iScroll.prototype['_end'];
                _orgintranend = iScroll.prototype['_transitionEnd'];
                _orginrefresh = iScroll.prototype['refresh'];
            }
            if (cfg.iscroll) {
                monitoriscroll();
            }
            if (cfg.winscroll) {
                window.addEventListener('load', _lazyload, false);
                monitorwin();
            }
        },
        monitorwin = function() {
            console.log('lazyload>>>>>>>>>>>>>>window scroll懒加载监听器工作中.......');
            if (!_winon) {
                window.addEventListener('scroll', _lazyload, false);
                // window.addEventListener('load',_lazyload,false);
                // document.addEventListener(transend,_lazyload,false);
                _winon = true;
                // 执行一次
                _lazyload();
            }
        },
        unwin = function() {
            console.log('lazyload>>>>>>>>>>>>>>window scroll懒加载监听器停止工作');
            if (_winon) {
                window.removeEventListener('scroll', _lazyload, false);
                // window.removeEventListener('load',_lazyload,false);
                _winon = false;
            }
        },
        monitoriscroll = function() {
            console.log('lazyload>>>>>>>>>>>>>>iscroll懒加载监听器工作中..........');
            if (!_iscrollon && _orginend) {
                //iscroll 兼容接口借助于aop思想after
                iScroll.prototype['_end'] = function() {
                    var cxt = this,
                        wrap = cxt.wrapper,
                        args = Array.prototype.slice.call(arguments),
                        ret = _orginend && _orginend.apply(cxt, args);
                    _lazyload(wrap);
                    return ret;
                };
                iScroll.prototype['_transitionEnd'] = function() {
                    var cxt = this,
                        wrap = cxt.wrapper,
                        args = Array.prototype.slice.call(arguments),
                        ret = _orgintranend && _orgintranend.apply(cxt, args);
                    _lazyload(wrap);
                    return ret;
                };
                iScroll.prototype['refresh'] = function() {
                    var cxt = this,
                        wrap = cxt.wrapper,
                        args = Array.prototype.slice.call(arguments),
                        ret = _orginrefresh && _orginrefresh.apply(cxt, args);
                    _lazyload(wrap);
                    return ret;
                };
                _iscrollon = true;
                // 执行一次
                _lazyload();
            }
        },
        uniscroll = function() {
            console.log('lazyload>>>>>>>>>>>>>>iscroll懒加载监听器停止工作');
            if (_iscrollon && _orginend) {
                iScroll.prototype['_end'] = _orginend;
                iScroll.prototype['_transitionEnd'] = _orgintranend;
                iScroll.prototype['refresh'] = _orginrefresh;
                _iscrollon = false;
            }
        };
    // 对外提供监控借口
    O.slazyload = {
        //初始化
        init: init,
        // 开始监控
        start: function(win, iscroll) {
            _lazyload();
            win !== false && monitorwin();
            iscroll !== false && monitoriscroll();
        },
        // 停止监控
        stop: function(win, iscroll) {
            win !== false && unwin();
            iscroll !== false && uniscroll();
        },
    };
})(sApp.Plus);