/**
 * 应用程序配置文件，每个应用程序只有一个
 * 接口数据标准模式：{code:,data:,msg:}
 */
// //////////////////////////part1 app配置部分
var Config = {
	G_IMGTRUESRCATTR : 'data-isrc',
	G_AJAXTIMEOUT : 20,
	G_CACHETIMEOUT : 5*60,
	G_PAGETRANS :0,
	G_ERROR : function(e){
		sApp.UI.Dialog.show(e.message+'<br>'+e.filename+'<br>'+e.lineno,{type : sApp.UI.Dialog.BTN_CONFIRM,backcancle : true});
	},
	Tpls : ['../tpl/tpl.html'],
	Pages : {
		'page_main' : {
				units : {
					'part_main':{
						scroll:{},
						dataurl : '../dist/json/index.min.json',
						timeout : 2*60 
					}
				}
			},
		'page_list' :{
				units	: {
					'part_list' : {
						param : {orderby:5,page:1},
						dataurl : '../dist/json/list.min.json',	
						timeout : 60,
						scroll : {
							refresh : true,
							loadmore : true,
							// nextbtn : true,
							pagekey : 'page'
						}
					},
					'part_more' : {
						data : {code:0,data:[1,2,3,4,5,6,7,8],msg:'this is part_tech!'},
						scroll:{}
					}
				}
		}
	}
};

///////////////////////part2 命名规定的回调，这里的函数内，用户可以自己做一些页面操作
function __page_main(pageconfig){
	console.log('页面回调>>>>>>>>>>>>>>>>>:__page_main');
	console.log('模块回调>>>>>>>>>>>>>>>>>:__part_list');
	var slider  = new sApp.Plus.Slider('#slider_main',{
			'baroncolor': '#FF886A',	// 当前页码颜色
			'baroffcolor':'#d5d5d5',	// 非当前页码颜色
			'step'		: 3,			//滑动的敏感度,如2是总宽度的1/2
			'delay'		: 5000,			//自动轮播的事时间间隔（毫秒）
			'click'		: function(idx){
							console.log('当前点击的是第'+idx+'张幻灯',this);
						}
		});
}
function __part_main(rid,pageconfig){
	console.log('模块回调>>>>>>>>>>>>>>>>>:__part_main');
}
function __part_list(rid,pageconfig){
	console.log('模块回调>>>>>>>>>>>>>>>>>:__part_list');
}
function __page_list(rid,pageconfig){
	console.log('页面回调>>>>>>>>>>>>>>>>>:__page_list');
}
function __page_catelist(rid,pageconfig){
	
}