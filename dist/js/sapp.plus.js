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
/*!
 * artTemplate - Template Engine
 * https://github.com/aui/artTemplate
 * Released under the MIT, BSD, and GPL Licenses
 */
var template=function(e,t){return template[typeof t=="object"?"render":"compile"].apply(template,arguments)};(function(e,t){"use strict";e.version="2.0.1",e.openTag="<%",e.closeTag="%>",e.isEscape=!0,e.isCompress=!1,e.parser=null,e.render=function(e,t){var n=r(e);return n===undefined?i({id:e,name:"Render Error",message:"No Template"}):n(t)},e.compile=function(t,r){function c(n){try{return new f(n)+""}catch(s){return u?(s.id=t||r,s.name="Render Error",s.source=r,i(s)):e.compile(t,r,!0)(n)}}var o=arguments,u=o[2],a="anonymous";typeof r!="string"&&(u=o[1],r=o[0],t=a);try{var f=s(r,u)}catch(l){return l.id=t||r,l.name="Syntax Error",i(l)}return c.prototype=f.prototype,c.toString=function(){return f.toString()},t!==a&&(n[t]=c),c},e.helper=function(t,n){e.prototype[t]=n},e.onerror=function(e){var n="[template]:\n"+e.id+"\n\n[name]:\n"+e.name;e.message&&(n+="\n\n[message]:\n"+e.message),e.line&&(n+="\n\n[line]:\n"+e.line,n+="\n\n[source]:\n"+e.source.split(/\n/)[e.line-1].replace(/^[\s\t]+/,"")),e.temp&&(n+="\n\n[temp]:\n"+e.temp),t.console&&console.error(n)};var n={},r=function(r){var i=n[r];if(i===undefined&&"document"in t){var s=document.getElementById(r);if(s){var o=s.value||s.innerHTML;return e.compile(r,o.replace(/^\s*|\s*$/g,""))}}else if(n.hasOwnProperty(r))return i},i=function(t){function n(){return n+""}return e.onerror(t),n.toString=function(){return"{Template Error}"},n},s=function(){e.prototype={$render:e.render,$escape:function(e){return typeof e=="string"?e.replace(/&(?![\w#]+;)|[<>"']/g,function(e){return{"<":"&#60;",">":"&#62;",'"':"&#34;","'":"&#39;","&":"&#38;"}[e]}):e},$string:function(e){return typeof e=="string"||typeof e=="number"?e:typeof e=="function"?e():""}};var t=Array.prototype.forEach||function(e,t){var n=this.length>>>0;for(var r=0;r<n;r++)r in this&&e.call(t,this[r],r,this)},n=function(e,n){t.call(e,n)},r="break,case,catch,continue,debugger,default,delete,do,else,false,finally,for,function,if,in,instanceof,new,null,return,switch,this,throw,true,try,typeof,var,void,while,with,abstract,boolean,byte,char,class,const,double,enum,export,extends,final,float,goto,implements,import,int,interface,long,native,package,private,protected,public,short,static,super,synchronized,throws,transient,volatile,arguments,let,yield,undefined",i=/\/\*(?:.|\n)*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|'[^']*'|"[^"]*"|[\s\t\n]*\.[\s\t\n]*[$\w\.]+/g,s=/[^\w$]+/g,o=new RegExp(["\\b"+r.replace(/,/g,"\\b|\\b")+"\\b"].join("|"),"g"),u=/\b\d[^,]*/g,a=/^,+|,+$/g,f=function(e){return e=e.replace(i,"").replace(s,",").replace(o,"").replace(u,"").replace(a,""),e=e?e.split(/,+/):[],e};return function(t,r){function S(t){return l+=t.split(/\n/).length-1,e.isCompress&&(t=t.replace(/[\n\r\t\s]+/g," ")),t=t.replace(/('|\\)/g,"\\$1").replace(/\r/g,"\\r").replace(/\n/g,"\\n"),t=m[1]+"'"+t+"'"+m[2],t+"\n"}function x(t){var n=l;o?t=o(t):r&&(t=t.replace(/\n/g,function(){return l++,"$line="+l+";"}));if(t.indexOf("=")===0){var i=t.indexOf("==")!==0;t=t.replace(/^=*|[\s;]*$/g,"");if(i&&e.isEscape){var s=t.replace(/\s*\([^\)]+\)/,"");!h.hasOwnProperty(s)&&!/^(include|print)$/.test(s)&&(t="$escape($string("+t+"))")}else t="$string("+t+")";t=m[1]+t+m[2]}return r&&(t="$line="+n+";"+t),T(t),t+"\n"}function T(e){e=f(e),n(e,function(e){c.hasOwnProperty(e)||(N(e),c[e]=!0)})}function N(e){var t;e==="print"?t=y:e==="include"?(p.$render=h.$render,t=b):(t="$data."+e,h.hasOwnProperty(e)&&(p[e]=h[e],e.indexOf("$")===0?t="$helpers."+e:t=t+"===undefined?$helpers."+e+":"+t)),d+=e+"="+t+","}var i=e.openTag,s=e.closeTag,o=e.parser,u=t,a="",l=1,c={$data:!0,$helpers:!0,$out:!0,$line:!0},h=e.prototype,p={},d="var $helpers=this,"+(r?"$line=0,":""),v="".trim,m=v?["$out='';","$out+=",";","$out"]:["$out=[];","$out.push(",");","$out.join('')"],g=v?"if(content!==undefined){$out+=content;return content}":"$out.push(content);",y="function(content){"+g+"}",b="function(id,data){if(data===undefined){data=$data}var content=$helpers.$render(id,data);"+g+"}";n(u.split(i),function(e,t){e=e.split(s);var n=e[0],r=e[1];e.length===1?a+=S(n):(a+=x(n),r&&(a+=S(r)))}),u=a,r&&(u="try{"+u+"}catch(e){"+"e.line=$line;"+"throw e"+"}"),u="'use strict';"+d+m[0]+u+"return new String("+m[3]+")";try{var w=new Function("$data",u);return w.prototype=p,w}catch(E){throw E.temp="function anonymous($data) {"+u+"}",E}}}()})(template,this),typeof define=="function"?define(function(e,t,n){n.exports=template}):typeof exports!="undefined"&&(module.exports=template)
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
/*!
 * iScroll v4.2.5 ~ Copyright (c) 2012 Matteo Spinelli, http://cubiq.org
 * Released under MIT license, http://cubiq.org/license
 */
(function(i,E){var u=Math,n=E.createElement("div").style,z=(function(){var H="t,webkitT,MozT,msT,OT".split(","),G,F=0,m=H.length;
for(;F<m;F++){G=H[F]+"ransform";if(G in n){return H[F].substr(0,H[F].length-1);}}return false;})(),D=z?"-"+z.toLowerCase()+"-":"",l=s("transform"),x=s("transitionProperty"),k=s("transitionDuration"),o=s("transformOrigin"),B=s("transitionTimingFunction"),e=s("transitionDelay"),A=(/android/gi).test(navigator.appVersion),h=(/iphone|ipad/gi).test(navigator.appVersion),r=(/hp-tablet/gi).test(navigator.appVersion),j=true,y="ontouchstart" in i&&!r,d=z!==false,f=s("transition") in n,g="onorientationchange" in i?"orientationchange":"resize",b=y?"touchstart":"mousedown",t=y?"touchmove":"mousemove",c=y?"touchend":"mouseup",w=y?"touchcancel":"mouseup",a=(function(){if(z===false){return false;
}var m={"":"transitionend",webkit:"webkitTransitionEnd",Moz:"transitionend",O:"otransitionend",ms:"MSTransitionEnd"};return m[z];})(),q=(function(){return i.requestAnimationFrame||i.webkitRequestAnimationFrame||i.mozRequestAnimationFrame||i.oRequestAnimationFrame||i.msRequestAnimationFrame||function(m){return setTimeout(m,1);
};})(),p=(function(){return i.cancelRequestAnimationFrame||i.webkitCancelAnimationFrame||i.webkitCancelRequestAnimationFrame||i.mozCancelRequestAnimationFrame||i.oCancelRequestAnimationFrame||i.msCancelRequestAnimationFrame||clearTimeout;
})(),C=j?" translateZ(0)":"",v=function(G,m){var H=this,F;H.wrapper=typeof G=="object"?G:E.getElementById(G);H.wrapper.style.overflow="hidden";H.scroller=H.wrapper.children[0];
H.options={hScroll:true,vScroll:true,x:0,y:0,bounce:true,bounceLock:false,momentum:true,lockDirection:true,useTransform:true,useTransition:false,topOffset:0,checkDOMChanges:false,handleClick:true,hScrollbar:true,vScrollbar:true,fixedScrollbar:A,hideScrollbar:h,fadeScrollbar:h&&j,scrollbarClass:"",zoom:false,zoomMin:1,zoomMax:4,doubleTapZoom:2,wheelAction:"scroll",snap:false,snapThreshold:1,onRefresh:null,onBeforeScrollStart:function(I){I.preventDefault();
},onScrollStart:null,onBeforeScrollMove:null,onScrollMove:null,onBeforeScrollEnd:null,onScrollEnd:null,onTouchEnd:null,onDestroy:null,onZoomStart:null,onZoom:null,onZoomEnd:null};
for(F in m){H.options[F]=m[F];}H.x=H.options.x;H.y=H.options.y;H.options.useTransform=d&&H.options.useTransform;H.options.hScrollbar=H.options.hScroll&&H.options.hScrollbar;
H.options.vScrollbar=H.options.vScroll&&H.options.vScrollbar;H.options.zoom=H.options.useTransform&&H.options.zoom;H.options.useTransition=f&&H.options.useTransition;
if(H.options.zoom&&A){C="";}H.scroller.style[x]=H.options.useTransform?D+"transform":"top left";H.scroller.style[k]="0";H.scroller.style[o]="0 0";if(H.options.useTransition){H.scroller.style[B]="cubic-bezier(0.33,0.66,0.66,1)";
}if(H.options.useTransform){H.scroller.style[l]="translate("+H.x+"px,"+H.y+"px)"+C;}else{H.scroller.style.cssText+=";position:absolute;top:"+H.y+"px;left:"+H.x+"px";
}if(H.options.useTransition){H.options.fixedScrollbar=true;}H.refresh();H._bind(g,i);H._bind(b);if(!y){if(H.options.wheelAction!="none"){H._bind("DOMMouseScroll");
H._bind("mousewheel");}}if(H.options.checkDOMChanges){H.checkDOMTime=setInterval(function(){H._checkDOMChanges();},500);}};v.prototype={enabled:true,x:0,y:0,steps:[],scale:1,currPageX:0,currPageY:0,pagesX:[],pagesY:[],aniTime:null,wheelZoomCount:0,handleEvent:function(F){var m=this;
switch(F.type){case b:if(!y&&F.button!==0){return;}m._start(F);break;case t:m._move(F);break;case c:case w:m._end(F);break;case g:m._resize();break;case"DOMMouseScroll":case"mousewheel":m._wheel(F);
break;case a:m._transitionEnd(F);break;}},_checkDOMChanges:function(){if(this.moved||this.zoomed||this.animating||(this.scrollerW==this.scroller.offsetWidth*this.scale&&this.scrollerH==this.scroller.offsetHeight*this.scale)){return;
}this.refresh();},_scrollbar:function(m){var G=this,F;if(!G[m+"Scrollbar"]){if(G[m+"ScrollbarWrapper"]){if(d){G[m+"ScrollbarIndicator"].style[l]="";}G[m+"ScrollbarWrapper"].parentNode.removeChild(G[m+"ScrollbarWrapper"]);
G[m+"ScrollbarWrapper"]=null;G[m+"ScrollbarIndicator"]=null;}return;}if(!G[m+"ScrollbarWrapper"]){F=E.createElement("div");if(G.options.scrollbarClass){F.className=G.options.scrollbarClass+m.toUpperCase();
}else{F.style.cssText="position:absolute;z-index:100;"+(m=="h"?"height:7px;bottom:1px;left:2px;right:"+(G.vScrollbar?"7":"2")+"px":"width:7px;bottom:"+(G.hScrollbar?"7":"2")+"px;top:2px;right:1px");
}F.style.cssText+=";pointer-events:none;"+D+"transition-property:opacity;"+D+"transition-duration:"+(G.options.fadeScrollbar?"350ms":"0")+";overflow:hidden;opacity:"+(G.options.hideScrollbar?"0":"1");
G.wrapper.appendChild(F);G[m+"ScrollbarWrapper"]=F;F=E.createElement("div");if(!G.options.scrollbarClass){F.style.cssText="position:absolute;z-index:100;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.9);"+D+"background-clip:padding-box;"+D+"box-sizing:border-box;"+(m=="h"?"height:100%":"width:100%")+";"+D+"border-radius:3px;border-radius:3px";
}F.style.cssText+=";pointer-events:none;"+D+"transition-property:"+D+"transform;"+D+"transition-timing-function:cubic-bezier(0.33,0.66,0.66,1);"+D+"transition-duration:0;"+D+"transform: translate(0,0)"+C;
if(G.options.useTransition){F.style.cssText+=";"+D+"transition-timing-function:cubic-bezier(0.33,0.66,0.66,1)";}G[m+"ScrollbarWrapper"].appendChild(F);
G[m+"ScrollbarIndicator"]=F;}if(m=="h"){G.hScrollbarSize=G.hScrollbarWrapper.clientWidth;G.hScrollbarIndicatorSize=u.max(u.round(G.hScrollbarSize*G.hScrollbarSize/G.scrollerW),8);
G.hScrollbarIndicator.style.width=G.hScrollbarIndicatorSize+"px";G.hScrollbarMaxScroll=G.hScrollbarSize-G.hScrollbarIndicatorSize;G.hScrollbarProp=G.hScrollbarMaxScroll/G.maxScrollX;
}else{G.vScrollbarSize=G.vScrollbarWrapper.clientHeight;G.vScrollbarIndicatorSize=u.max(u.round(G.vScrollbarSize*G.vScrollbarSize/G.scrollerH),8);G.vScrollbarIndicator.style.height=G.vScrollbarIndicatorSize+"px";
G.vScrollbarMaxScroll=G.vScrollbarSize-G.vScrollbarIndicatorSize;G.vScrollbarProp=G.vScrollbarMaxScroll/G.maxScrollY;}G._scrollbarPos(m,true);},_resize:function(){var m=this;
setTimeout(function(){m.refresh();},A?200:0);},_pos:function(m,F){if(this.zoomed){return;}m=this.hScroll?m:0;F=this.vScroll?F:0;if(this.options.useTransform){this.scroller.style[l]="translate("+m+"px,"+F+"px) scale("+this.scale+")"+C;
}else{m=u.round(m);F=u.round(F);this.scroller.style.left=m+"px";this.scroller.style.top=F+"px";}this.x=m;this.y=F;this._scrollbarPos("h");this._scrollbarPos("v");
},_scrollbarPos:function(m,H){var G=this,I=m=="h"?G.x:G.y,F;if(!G[m+"Scrollbar"]){return;}I=G[m+"ScrollbarProp"]*I;if(I<0){if(!G.options.fixedScrollbar){F=G[m+"ScrollbarIndicatorSize"]+u.round(I*3);
if(F<8){F=8;}G[m+"ScrollbarIndicator"].style[m=="h"?"width":"height"]=F+"px";}I=0;}else{if(I>G[m+"ScrollbarMaxScroll"]){if(!G.options.fixedScrollbar){F=G[m+"ScrollbarIndicatorSize"]-u.round((I-G[m+"ScrollbarMaxScroll"])*3);
if(F<8){F=8;}G[m+"ScrollbarIndicator"].style[m=="h"?"width":"height"]=F+"px";I=G[m+"ScrollbarMaxScroll"]+(G[m+"ScrollbarIndicatorSize"]-F);}else{I=G[m+"ScrollbarMaxScroll"];
}}}G[m+"ScrollbarWrapper"].style[e]="0";G[m+"ScrollbarWrapper"].style.opacity=H&&G.options.hideScrollbar?"0":"1";G[m+"ScrollbarIndicator"].style[l]="translate("+(m=="h"?I+"px,0)":"0,"+I+"px)")+C;
},_start:function(K){var J=this,F=y?K.touches[0]:K,G,m,L,I,H;if(!J.enabled){return;}if(J.options.onBeforeScrollStart){J.options.onBeforeScrollStart.call(J,K);
}if(J.options.useTransition||J.options.zoom){J._transitionTime(0);}J.moved=false;J.animating=false;J.zoomed=false;J.distX=0;J.distY=0;J.absDistX=0;J.absDistY=0;
J.dirX=0;J.dirY=0;if(J.options.zoom&&y&&K.touches.length>1){I=u.abs(K.touches[0].pageX-K.touches[1].pageX);H=u.abs(K.touches[0].pageY-K.touches[1].pageY);
J.touchesDistStart=u.sqrt(I*I+H*H);J.originX=u.abs(K.touches[0].pageX+K.touches[1].pageX-J.wrapperOffsetLeft*2)/2-J.x;J.originY=u.abs(K.touches[0].pageY+K.touches[1].pageY-J.wrapperOffsetTop*2)/2-J.y;
if(J.options.onZoomStart){J.options.onZoomStart.call(J,K);}}if(J.options.momentum){if(J.options.useTransform){G=getComputedStyle(J.scroller,null)[l].replace(/[^0-9\-.,]/g,"").split(",");
m=+(G[12]||G[4]);L=+(G[13]||G[5]);}else{m=+getComputedStyle(J.scroller,null).left.replace(/[^0-9-]/g,"");L=+getComputedStyle(J.scroller,null).top.replace(/[^0-9-]/g,"");
}if(m!=J.x||L!=J.y){if(J.options.useTransition){J._unbind(a);}else{p(J.aniTime);}J.steps=[];J._pos(m,L);if(J.options.onScrollEnd){J.options.onScrollEnd.call(J);
}}}J.absStartX=J.x;J.absStartY=J.y;J.startX=J.x;J.startY=J.y;J.pointX=F.pageX;J.pointY=F.pageY;J.startTime=K.timeStamp||Date.now();if(J.options.onScrollStart){J.options.onScrollStart.call(J,K);
}J._bind(t,i);J._bind(c,i);J._bind(w,i);},_move:function(M){var K=this,N=y?M.touches[0]:M,I=N.pageX-K.pointX,G=N.pageY-K.pointY,m=K.x+I,O=K.y+G,J,H,F,L=M.timeStamp||Date.now();
if(K.options.onBeforeScrollMove){K.options.onBeforeScrollMove.call(K,M);}if(K.options.zoom&&y&&M.touches.length>1){J=u.abs(M.touches[0].pageX-M.touches[1].pageX);
H=u.abs(M.touches[0].pageY-M.touches[1].pageY);K.touchesDist=u.sqrt(J*J+H*H);K.zoomed=true;F=1/K.touchesDistStart*K.touchesDist*this.scale;if(F<K.options.zoomMin){F=0.5*K.options.zoomMin*Math.pow(2,F/K.options.zoomMin);
}else{if(F>K.options.zoomMax){F=2*K.options.zoomMax*Math.pow(0.5,K.options.zoomMax/F);}}K.lastScale=F/this.scale;m=this.originX-this.originX*K.lastScale+this.x;
O=this.originY-this.originY*K.lastScale+this.y;this.scroller.style[l]="translate("+m+"px,"+O+"px) scale("+F+")"+C;if(K.options.onZoom){K.options.onZoom.call(K,M);
}return;}K.pointX=N.pageX;K.pointY=N.pageY;if(m>0||m<K.maxScrollX){m=K.options.bounce?K.x+(I/2):m>=0||K.maxScrollX>=0?0:K.maxScrollX;}if(O>K.minScrollY||O<K.maxScrollY){O=K.options.bounce?K.y+(G/2):O>=K.minScrollY||K.maxScrollY>=0?K.minScrollY:K.maxScrollY;
}K.distX+=I;K.distY+=G;K.absDistX=u.abs(K.distX);K.absDistY=u.abs(K.distY);if(K.absDistX<6&&K.absDistY<6){return;}if(K.options.lockDirection){if(K.absDistX>K.absDistY+5){O=K.y;
G=0;}else{if(K.absDistY>K.absDistX+5){m=K.x;I=0;}}}K.moved=true;K._pos(m,O);K.dirX=I>0?-1:I<0?1:0;K.dirY=G>0?-1:G<0?1:0;if(L-K.startTime>300){K.startTime=L;
K.startX=K.x;K.startY=K.y;}if(K.options.onScrollMove){K.options.onScrollMove.call(K,M);}},_end:function(M){if(y&&M.touches.length!==0){return;}var K=this,S=y?M.changedTouches[0]:M,N,R,G={dist:0,time:0},m={dist:0,time:0},J=(M.timeStamp||Date.now())-K.startTime,O=K.x,L=K.y,Q,P,F,I,H;
K._unbind(t,i);K._unbind(c,i);K._unbind(w,i);if(K.options.onBeforeScrollEnd){K.options.onBeforeScrollEnd.call(K,M);}if(K.zoomed){H=K.scale*K.lastScale;
H=Math.max(K.options.zoomMin,H);H=Math.min(K.options.zoomMax,H);K.lastScale=H/K.scale;K.scale=H;K.x=K.originX-K.originX*K.lastScale+K.x;K.y=K.originY-K.originY*K.lastScale+K.y;
K.scroller.style[k]="200ms";K.scroller.style[l]="translate("+K.x+"px,"+K.y+"px) scale("+K.scale+")"+C;K.zoomed=false;K.refresh();if(K.options.onZoomEnd){K.options.onZoomEnd.call(K,M);
}return;}if(!K.moved){if(y){if(K.doubleTapTimer&&K.options.zoom){clearTimeout(K.doubleTapTimer);K.doubleTapTimer=null;if(K.options.onZoomStart){K.options.onZoomStart.call(K,M);
}K.zoom(K.pointX,K.pointY,K.scale==1?K.options.doubleTapZoom:1);if(K.options.onZoomEnd){setTimeout(function(){K.options.onZoomEnd.call(K,M);},200);}}else{if(this.options.handleClick){K.doubleTapTimer=setTimeout(function(){K.doubleTapTimer=null;
N=S.target;while(N.nodeType!=1){N=N.parentNode;}if(N.tagName!="SELECT"&&N.tagName!="INPUT"&&N.tagName!="TEXTAREA"){R=E.createEvent("MouseEvents");R.initMouseEvent("click",true,true,M.view,1,S.screenX,S.screenY,S.clientX,S.clientY,M.ctrlKey,M.altKey,M.shiftKey,M.metaKey,0,null);
R._fake=true;N.dispatchEvent(R);}},K.options.zoom?250:0);}}}K._resetPos(400);if(K.options.onTouchEnd){K.options.onTouchEnd.call(K,M);}return;}if(J<300&&K.options.momentum){G=O?K._momentum(O-K.startX,J,-K.x,K.scrollerW-K.wrapperW+K.x,K.options.bounce?K.wrapperW:0):G;
m=L?K._momentum(L-K.startY,J,-K.y,(K.maxScrollY<0?K.scrollerH-K.wrapperH+K.y-K.minScrollY:0),K.options.bounce?K.wrapperH:0):m;O=K.x+G.dist;L=K.y+m.dist;
if((K.x>0&&O>0)||(K.x<K.maxScrollX&&O<K.maxScrollX)){G={dist:0,time:0};}if((K.y>K.minScrollY&&L>K.minScrollY)||(K.y<K.maxScrollY&&L<K.maxScrollY)){m={dist:0,time:0};
}}if(G.dist||m.dist){F=u.max(u.max(G.time,m.time),10);if(K.options.snap){Q=O-K.absStartX;P=L-K.absStartY;if(u.abs(Q)<K.options.snapThreshold&&u.abs(P)<K.options.snapThreshold){K.scrollTo(K.absStartX,K.absStartY,200);
}else{I=K._snap(O,L);O=I.x;L=I.y;F=u.max(I.time,F);}}K.scrollTo(u.round(O),u.round(L),F);if(K.options.onTouchEnd){K.options.onTouchEnd.call(K,M);}return;
}if(K.options.snap){Q=O-K.absStartX;P=L-K.absStartY;if(u.abs(Q)<K.options.snapThreshold&&u.abs(P)<K.options.snapThreshold){K.scrollTo(K.absStartX,K.absStartY,200);
}else{I=K._snap(K.x,K.y);if(I.x!=K.x||I.y!=K.y){K.scrollTo(I.x,I.y,I.time);}}if(K.options.onTouchEnd){K.options.onTouchEnd.call(K,M);}return;}K._resetPos(200);
if(K.options.onTouchEnd){K.options.onTouchEnd.call(K,M);}},_resetPos:function(G){var m=this,H=m.x>=0?0:m.x<m.maxScrollX?m.maxScrollX:m.x,F=m.y>=m.minScrollY||m.maxScrollY>0?m.minScrollY:m.y<m.maxScrollY?m.maxScrollY:m.y;
if(H==m.x&&F==m.y){if(m.moved){m.moved=false;if(m.options.onScrollEnd){m.options.onScrollEnd.call(m);}}if(m.hScrollbar&&m.options.hideScrollbar){if(z=="webkit"){m.hScrollbarWrapper.style[e]="300ms";
}m.hScrollbarWrapper.style.opacity="0";}if(m.vScrollbar&&m.options.hideScrollbar){if(z=="webkit"){m.vScrollbarWrapper.style[e]="300ms";}m.vScrollbarWrapper.style.opacity="0";
}return;}m.scrollTo(H,F,G||0);},_wheel:function(J){var H=this,I,G,F,m,K;if("wheelDeltaX" in J){I=J.wheelDeltaX/12;G=J.wheelDeltaY/12;}else{if("wheelDelta" in J){I=G=J.wheelDelta/12;
}else{if("detail" in J){I=G=-J.detail*3;}else{return;}}}if(H.options.wheelAction=="zoom"){K=H.scale*Math.pow(2,1/3*(G?G/Math.abs(G):0));if(K<H.options.zoomMin){K=H.options.zoomMin;
}if(K>H.options.zoomMax){K=H.options.zoomMax;}if(K!=H.scale){if(!H.wheelZoomCount&&H.options.onZoomStart){H.options.onZoomStart.call(H,J);}H.wheelZoomCount++;
H.zoom(J.pageX,J.pageY,K,400);setTimeout(function(){H.wheelZoomCount--;if(!H.wheelZoomCount&&H.options.onZoomEnd){H.options.onZoomEnd.call(H,J);}},400);
}return;}F=H.x+I;m=H.y+G;if(F>0){F=0;}else{if(F<H.maxScrollX){F=H.maxScrollX;}}if(m>H.minScrollY){m=H.minScrollY;}else{if(m<H.maxScrollY){m=H.maxScrollY;
}}if(H.maxScrollY<0){H.scrollTo(F,m,0);}},_transitionEnd:function(F){var m=this;if(F.target!=m.scroller){return;}m._unbind(a);m._startAni();},_startAni:function(){var K=this,F=K.x,m=K.y,I=Date.now(),J,H,G;
if(K.animating){return;}if(!K.steps.length){K._resetPos(400);return;}J=K.steps.shift();if(J.x==F&&J.y==m){J.time=0;}K.animating=true;K.moved=true;if(K.options.useTransition){K._transitionTime(J.time);
K._pos(J.x,J.y);K.animating=false;if(J.time){K._bind(a);}else{K._resetPos(0);}return;}G=function(){var L=Date.now(),N,M;if(L>=I+J.time){K._pos(J.x,J.y);
K.animating=false;if(K.options.onAnimationEnd){K.options.onAnimationEnd.call(K);}K._startAni();return;}L=(L-I)/J.time-1;H=u.sqrt(1-L*L);N=(J.x-F)*H+F;M=(J.y-m)*H+m;
K._pos(N,M);if(K.animating){K.aniTime=q(G);}};G();},_transitionTime:function(m){m+="ms";this.scroller.style[k]=m;if(this.hScrollbar){this.hScrollbarIndicator.style[k]=m;
}if(this.vScrollbar){this.vScrollbarIndicator.style[k]=m;}},_momentum:function(L,F,J,m,N){var K=0.0006,G=u.abs(L)/F,H=(G*G)/(2*K),M=0,I=0;if(L>0&&H>J){I=N/(6/(H/G*K));
J=J+I;G=G*J/H;H=J;}else{if(L<0&&H>m){I=N/(6/(H/G*K));m=m+I;G=G*m/H;H=m;}}H=H*(L<0?-1:1);M=G/K;return{dist:H,time:u.round(M)};},_offset:function(m){var G=-m.offsetLeft,F=-m.offsetTop;
while(m=m.offsetParent){G-=m.offsetLeft;F-=m.offsetTop;}if(m!=this.wrapper){G*=this.scale;F*=this.scale;}return{left:G,top:F};},_snap:function(M,L){var J=this,I,H,K,G,F,m;
K=J.pagesX.length-1;for(I=0,H=J.pagesX.length;I<H;I++){if(M>=J.pagesX[I]){K=I;break;}}if(K==J.currPageX&&K>0&&J.dirX<0){K--;}M=J.pagesX[K];F=u.abs(M-J.pagesX[J.currPageX]);
F=F?u.abs(J.x-M)/F*500:0;J.currPageX=K;K=J.pagesY.length-1;for(I=0;I<K;I++){if(L>=J.pagesY[I]){K=I;break;}}if(K==J.currPageY&&K>0&&J.dirY<0){K--;}L=J.pagesY[K];
m=u.abs(L-J.pagesY[J.currPageY]);m=m?u.abs(J.y-L)/m*500:0;J.currPageY=K;G=u.round(u.max(F,m))||200;return{x:M,y:L,time:G};},_bind:function(G,F,m){(F||this.scroller).addEventListener(G,this,!!m);
},_unbind:function(G,F,m){(F||this.scroller).removeEventListener(G,this,!!m);},destroy:function(){var m=this;m.scroller.style[l]="";m.hScrollbar=false;
m.vScrollbar=false;m._scrollbar("h");m._unbind(g,i);m._unbind(b);m._unbind(t,i);m._unbind(c,i);m._unbind(w,i);if(!m.options.hasTouch){m._unbind("DOMMouseScroll");
m._unbind("mousewheel");}if(m.options.useTransition){m._unbind(a);}if(m.options.checkDOMChanges){clearInterval(m.checkDOMTime);}if(m.options.onDestroy){m.options.onDestroy.call(m);
}},refresh:function(){var H=this,J,G,m,F,K=0,I=0;if(H.scale<H.options.zoomMin){H.scale=H.options.zoomMin;}H.wrapperW=H.wrapper.clientWidth||1;H.wrapperH=H.wrapper.clientHeight||1;
H.minScrollY=-H.options.topOffset||0;H.scrollerW=u.round(H.scroller.offsetWidth*H.scale);H.scrollerH=u.round((H.scroller.offsetHeight+H.minScrollY)*H.scale);
H.maxScrollX=H.wrapperW-H.scrollerW;H.maxScrollY=H.wrapperH-H.scrollerH+H.minScrollY;H.dirX=0;H.dirY=0;if(H.options.onRefresh){H.options.onRefresh.call(H);
}H.hScroll=H.options.hScroll&&H.maxScrollX<0;H.vScroll=H.options.vScroll&&(!H.options.bounceLock&&!H.hScroll||H.scrollerH>H.wrapperH);H.hScrollbar=H.hScroll&&H.options.hScrollbar;
H.vScrollbar=H.vScroll&&H.options.vScrollbar&&H.scrollerH>H.wrapperH;J=H._offset(H.wrapper);H.wrapperOffsetLeft=-J.left;H.wrapperOffsetTop=-J.top;if(typeof H.options.snap=="string"){H.pagesX=[];
H.pagesY=[];F=H.scroller.querySelectorAll(H.options.snap);for(G=0,m=F.length;G<m;G++){K=H._offset(F[G]);K.left+=H.wrapperOffsetLeft;K.top+=H.wrapperOffsetTop;
H.pagesX[G]=K.left<H.maxScrollX?H.maxScrollX:K.left*H.scale;H.pagesY[G]=K.top<H.maxScrollY?H.maxScrollY:K.top*H.scale;}}else{if(H.options.snap){H.pagesX=[];
while(K>=H.maxScrollX){H.pagesX[I]=K;K=K-H.wrapperW;I++;}if(H.maxScrollX%H.wrapperW){H.pagesX[H.pagesX.length]=H.maxScrollX-H.pagesX[H.pagesX.length-1]+H.pagesX[H.pagesX.length-1];
}K=0;I=0;H.pagesY=[];while(K>=H.maxScrollY){H.pagesY[I]=K;K=K-H.wrapperH;I++;}if(H.maxScrollY%H.wrapperH){H.pagesY[H.pagesY.length]=H.maxScrollY-H.pagesY[H.pagesY.length-1]+H.pagesY[H.pagesY.length-1];
}}}H._scrollbar("h");H._scrollbar("v");if(!H.zoomed){H.scroller.style[k]="0";H._resetPos(400);}},refresh2:function(){var H=this,J,G,m,F,K=0,I=0;if(H.scale<H.options.zoomMin){H.scale=H.options.zoomMin;
}H.wrapperW=H.wrapper.clientWidth||1;H.wrapperH=H.wrapper.clientHeight||1;H.minScrollY=-H.options.topOffset||0;H.scrollerW=u.round(H.scroller.offsetWidth*H.scale);
H.scrollerH=u.round((H.scroller.offsetHeight+H.minScrollY)*H.scale);H.maxScrollX=H.wrapperW-H.scrollerW;H.maxScrollY=H.wrapperH-H.scrollerH+H.minScrollY;
H.dirX=0;H.dirY=0;H.hScroll=H.options.hScroll&&H.maxScrollX<0;H.vScroll=H.options.vScroll&&(!H.options.bounceLock&&!H.hScroll||H.scrollerH>H.wrapperH);
H.hScrollbar=H.hScroll&&H.options.hScrollbar;H.vScrollbar=H.vScroll&&H.options.vScrollbar&&H.scrollerH>H.wrapperH;J=H._offset(H.wrapper);H.wrapperOffsetLeft=-J.left;
H.wrapperOffsetTop=-J.top;if(typeof H.options.snap=="string"){H.pagesX=[];H.pagesY=[];F=H.scroller.querySelectorAll(H.options.snap);for(G=0,m=F.length;
G<m;G++){K=H._offset(F[G]);K.left+=H.wrapperOffsetLeft;K.top+=H.wrapperOffsetTop;H.pagesX[G]=K.left<H.maxScrollX?H.maxScrollX:K.left*H.scale;H.pagesY[G]=K.top<H.maxScrollY?H.maxScrollY:K.top*H.scale;
}}else{if(H.options.snap){H.pagesX=[];while(K>=H.maxScrollX){H.pagesX[I]=K;K=K-H.wrapperW;I++;}if(H.maxScrollX%H.wrapperW){H.pagesX[H.pagesX.length]=H.maxScrollX-H.pagesX[H.pagesX.length-1]+H.pagesX[H.pagesX.length-1];
}K=0;I=0;H.pagesY=[];while(K>=H.maxScrollY){H.pagesY[I]=K;K=K-H.wrapperH;I++;}if(H.maxScrollY%H.wrapperH){H.pagesY[H.pagesY.length]=H.maxScrollY-H.pagesY[H.pagesY.length-1]+H.pagesY[H.pagesY.length-1];
}}}H._scrollbar("h");H._scrollbar("v");if(!H.zoomed){H.scroller.style[k]="0";H._resetPos(400);}},scrollTo:function(m,L,K,J){var I=this,H=m,G,F;I.stop();
if(!H.length){H=[{x:m,y:L,time:K,relative:J}];}for(G=0,F=H.length;G<F;G++){if(H[G].relative){H[G].x=I.x-H[G].x;H[G].y=I.y-H[G].y;}I.steps.push({x:H[G].x,y:H[G].y,time:H[G].time||0});
}I._startAni();},scrollToElement:function(m,G){var F=this,H;m=m.nodeType?m:F.scroller.querySelector(m);if(!m){return;}H=F._offset(m);H.left+=F.wrapperOffsetLeft;
H.top+=F.wrapperOffsetTop;H.left=H.left>0?0:H.left<F.maxScrollX?F.maxScrollX:H.left;H.top=H.top>F.minScrollY?F.minScrollY:H.top<F.maxScrollY?F.maxScrollY:H.top;
G=G===undefined?u.max(u.abs(H.left)*2,u.abs(H.top)*2):G;F.scrollTo(H.left,H.top,G);},scrollToPage:function(G,F,I){var H=this,m,J;I=I===undefined?400:I;
if(H.options.onScrollStart){H.options.onScrollStart.call(H);}if(H.options.snap){G=G=="next"?H.currPageX+1:G=="prev"?H.currPageX-1:G;F=F=="next"?H.currPageY+1:F=="prev"?H.currPageY-1:F;
G=G<0?0:G>H.pagesX.length-1?H.pagesX.length-1:G;F=F<0?0:F>H.pagesY.length-1?H.pagesY.length-1:F;H.currPageX=G;H.currPageY=F;m=H.pagesX[G];J=H.pagesY[F];
}else{m=-H.wrapperW*G;J=-H.wrapperH*F;if(m<H.maxScrollX){m=H.maxScrollX;}if(J<H.maxScrollY){J=H.maxScrollY;}}H.scrollTo(m,J,I);},disable:function(){this.stop();
this._resetPos(0);this.enabled=false;this._unbind(t,i);this._unbind(c,i);this._unbind(w,i);},enable:function(){this.enabled=true;},stop:function(){if(this.options.useTransition){this._unbind(a);
}else{p(this.aniTime);}this.steps=[];this.moved=false;this.animating=false;},zoom:function(m,J,I,H){var F=this,G=I/F.scale;if(!F.options.useTransform){return;
}F.zoomed=true;H=H===undefined?200:H;m=m-F.wrapperOffsetLeft-F.x;J=J-F.wrapperOffsetTop-F.y;F.x=m-m*G+F.x;F.y=J-J*G+F.y;F.scale=I;F.refresh();F.x=F.x>0?0:F.x<F.maxScrollX?F.maxScrollX:F.x;
F.y=F.y>F.minScrollY?F.minScrollY:F.y<F.maxScrollY?F.maxScrollY:F.y;F.scroller.style[k]=H+"ms";F.scroller.style[l]="translate("+F.x+"px,"+F.y+"px) scale("+I+")"+C;
F.zoomed=false;},isReady:function(){return !this.moved&&!this.zoomed&&!this.animating;}};function s(m){if(z===""){return m;}m=m.charAt(0).toUpperCase()+m.substr(1);
return z+m;}n=null;if(typeof exports!=="undefined"){exports.iScroll=v;}else{i.iScroll=v;}})(window,document);
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