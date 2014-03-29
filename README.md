#sApp

build by awen ~ 71752352@qq.com ~ 2013-10-10

##简介：

一个轻量级的webApp框架.一个简单的html入口页面,一个配置文件再加上相应的模板，app就自动生成了。你不需要考虑数据获取更新缓存，页面上拉下拉，页面切换等效果。解放更多的时间去做展现和用户体验吧。

提供了必要的基础模块供用户使用，当然用户也可以自己扩展。

##命名空间结构:

	sApp
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
		|__slazyload	(图片懒加载）
		|__Slider			(无限循环幻灯)
		|__Scroll			(滚动条插件)
		|__Timer			(心跳机)
		|__Storage			(localStorage本页变化监控实现)

##API：
这里只是简单的说明，源码中有详细的注释。

	1 sApp.go(config)   引擎入口
	2 sApp.Page.show(pageid,param) 显示某一页
	3 sApp.Page.render(rid,param,cover) 渲染当前页的某个渲染单元 
	....
	亲，详情去控制台打吧，就按照上面命名空间结构打印。正式发布会提供详细的api和示例文档

##特点：

	1 资源加载在内核中自动执行，属于引擎初始化工作
	2 滚动条支持iscroll和下一页按钮，更好的兼容低端机
	3 数据请求支持缓存，和强刷
	4 页面切换多种动画，预留接口，bug未调
	5 图片懒加载更加智能，智能监控iscroll和window滚动条
	6 状态机机制 流程更加清晰，让写代码按流程来写
	7 实现aop，灵活的插件，log
	8 多语言实现，只需要 重写 sApp.Langs 语言对象就可以了
	9 localStorage实现本页面监控，暂时不做使用，预留


##运行流程：
	
* 首先解析配置文件，生成各个页面的实例
* 根据hash判断当前页，进入当前页展示流程
* 解析当前页的配置
* 循环当前页渲染单元
	* 获取数据，分为静态数据，远程数据。远程数据可以配置缓存和过期
	* 找到约定好的模板用数据渲染他，并在页面上相应的位置渲染
	* 渲染完成后，如果有约定的回调函数存在就执行他
	* 所有渲染单元渲染完毕后页面也就渲染完了，如果有约定的回调函数存在就执行
* 回退或者前进操作也被监听，将不重绘页面只是显示，其他用户操作进入页面重复以上流程

##app的各个部分

一个简单的html入口页面,一个配置文件再加上相应的模板，

###1 页面入口
	<!doctype html>
	<html lang="en">
		<head>
			<meta charset="UTF-8">
			<title>app</title>
				<!--样式-->
				<link rel="stylesheet" href="dist/css/sapp.min.css">
				<!--载入引擎-->
 				<script src="dist/js/sapp.min.js"></script>
 				<script src="dist/js/sapp.plus.min.js"></script>
 				<!--载入应用配置文件和自定义函数-->
 				<script src="demo.js"></script>
				<!--入口-->
				<script>
					$(function(){
						sApp.go(Config);	//Config 在demo中
					});
				</script>
		</head>
		<body>
		<!--
		sApp页面设置区域，html设置区域
		1 每个class=sapp_page 为一个页面；
		2 每个class=sapp_render ,的dom元素，为一个渲染单元，他可以有自己的模板和数据接口
	包含关系为  sapp_page_wrap>sapp_page>sapp_render(其实sapp_render可以不在sapp_page内)
		-->
			<section id="page_main"> //id "page_main"  对应配置中设定的页面key
				<article id="part_slider"></article> //id "part_slider" 对应着page_main页面中的相应key的渲染单元
			</section>
		</body>
	</html>
	
</body>
</html>

###2 页面配置文件
这个配置文件就是配置页面用的，整个应用由，html的页面布局

* 每个应用程序只有一个配置文件
 
=============================
结构说明

	var Config = {
		<!--全局配置,以下展示的是默认值，不设置则使用默认值-->
		//懒加载真实图片地址所在属性
		G_IMGTRUESRCATTR : 'data-isrc',	
		// ajax超时时间（s）
		G_AJAXTIMEOUT : 20,
		// 数据缓存过期时间（s）,0表示永不过期,false不缓存
		G_CACHETIMEOUT : 5*60,
		// 页面切换特效,	0:无动画；1:页面动画 渐现渐隐；2:页面动画 中进中出；3:页面动画 横向动画	（默认）；4:页面动画 纵向动画；5:页面动画 仿win8
		G_PAGETRANS :0,
		// 错误处理，可以向服务器发送错误日志
		G_ERROR : function(e){
			sApp.UI.Dialog.show(e.message+'<br>'+e.filename+'<br>'+e.lineno,{type : sApp.UI.Dialog.BTN_CONFIRM,backcancle : true});
		},

		<!--模板文件地址,(因为tpl是通过ajax获取的，所以制约着模板地址必须是http协议的)-->
		Tpls : ['./tpl/tpl.html'],

		<!--页面配置部分-->
		Pages : {
			//page_main 对应着页面上的id为page_main的标签，对应模板中id为page_main_tpl的模板,对应的默认自定义回调函数是__page_main
 			"page_main":{
 				//是否开启图片懒加载
		 		lazyload :true,
		 		//本页内渲染单元配置，结构如下:
				units : {	
		 			//renderid代表着页面上page_main标签内部id为renderid的标签.对应模板:renderid_tpl,对应的页面回调函数为__renderid
		 			"renderid" :{
		 				//静态的数据，比dataurl优先级高,格式遵循接口定义的标准模式
						data: {},
						//页面数据请求接口，如果不设置或者为false,则不请求数据,格式遵循接口定义的标准模式：{code:,data:,msg:} code代表0表示错误，1代表正常
						dataurl: '...',
						//dataurl的初始参数列表
						param: {orderby:5,page:1},
						//确认每次刷新是附加操作还是覆盖操作,默认普通页面是覆盖，如果配置了scroll刷新加载则该项无效,默认true
						cover:true,
						//在dataurl生效,单独配置该页缓存数据过期时间(秒),0表示永不过期,false不缓存
						timeout	: 10,
						//用户自定义的渲染的模板，如果不自定义将使用约定的 id为 'renderid_Tpl'的模板
						tpl:"xxx_tpl",
						//渲染完成后自动执行的回调函数，用户可自定义，不自定义将执行约定的名为 __renderid的方法
						callback:xxxx,
						//上拉下拉刷新后将执行渲染单元的约定回调函数
						scroll: {
							//开启下拉刷新
							refresh : true,
							//开启上拉加载
							loadmore : true,
							//下一页按钮，与loadmore和refresh不共存，且优先级高，作为优化降级方案
							nextbtn : true,
							//如果列表分页的话，代表分页参数的名称
							pagekey : 'page',
							//上拉下拉区域的高度 默认40
							offsetHeight:40,
							//滚动条滚动时候自定义的回调函数句柄
							onmoving :　
						}
					},
					//本页另一个渲染单元
					"part_2":{..}
				}
			},
			//另一个页面
			"page_other":{...}

###3 模板
目前集成了artTemplate模板，可以去[artTemplate](http://aui.github.io/artTemplate/) 查看详情
