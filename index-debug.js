define(function(require, exports, module){
	var $ = require('dom/1.0.x/');
    var Ajax = require('ajax/1.2.x/');
    var MD5 = require('crypto/md5/1.0.x/');
    var dataHelper = require('/common/datahelper/1.1.x/');
    var Share = require('./share');
    var Scroll = require('./scroll');
    var Tmpl = require('tmpl/2.1.x/');
    var dataHelper = require('/common/datahelper/1.1.x/');
    var Carousel = require('./carousel');
    var tpl = new Tmpl({
    	ITEM: 
    	'<%for(var i=0; i<data.length; i++){%>'+
    	'<div class="item" data-uid="<%-data[i].uid%>">'+
		'	<div class="item_w">'+
		'		<div class="head" style="background-image:url(<%-data[i].avatar%>)"></div>'+
		'		<div class="right">'+
		'			<div class="title_w"><span class="title"><%-(data[i].genname)%> </span><%if(data[i].quality==1){%><span class="renzheng"></span><%}%></div>'+
		'			<span class="desc_w"><span class="cont"><%-data[i].introduce%></span></span>'+
		'			<%if(data[i].orderNum>0){%><span class="bt"><%-data[i].orderNum%>人见过</span>'+
		'			<%}else{%><span class="bt">新导师</span><%}%>'+
		'		</div>'+
		'	</div>'+
		'</div>'+
		'<%}%>',
		BANNER:
		'<%for(var i=0;i<data.length;i++){%>'+
		'	<img data-url="<%-data[i].linkUrl%>" class="item_item banner_img" src="<%-data[i].picUrl%>">'+
		'<%}%>'
    });
    var urls = {
    	BANNER: window.location.protocol+'//qf.56.com/home/v5/getBanners.android?type=20',
    	LIST: window.location.protocol+'//qf.56.com/genius/v1/list.do'
    }
    var bannerClick = false;
	var util={
    	setStyleAttribute: function(elem, val) {
    		var vendorPrefix = (function() { //css3属性前缀
	        	var i = 0,
	            vendor = ["Moz", "Webkit", "Khtml", "O", "ms"];
		        while (i < vendor.length) {
		            if (typeof elem.style[vendor[i] + 'Transition'] === "string") {
		                return vendor[i];
		            }
		            i++;
		        }
		        return '';
	    	})();
	        if (Object.prototype.toString.call(val) === "[object Object]") {
	            for (var name in val) {
	                if (/^transition|animation|transform/.test(name)) {
	                    var styleName = name.charAt(0).toUpperCase() + name.substr(1);
	                    elem.style[vendorPrefix + styleName] = val[name];
	                } else {
	                    elem.style[name] = val[name];
	                }
	            }
	        }
	    },
		getCharWidth: function(){
			var html = '';
			var width = [];
			var $span = null;
			var $body = $('body');
			for(var i=0; i<10; i++){
				html+='x';
			}
			$body.append('<span class="w_char">'+html+'</span>');
			$span = $body.find('.w_char')
			width[0] = $span.width()/10;
			$span.remove();

			html = '';
			for(var i=0; i<10; i++){
				html+='X';
			}
			$body.append('<span class="w_char">'+html+'</span>');
			$span = $body.find('.w_char')
			width[1] = $span.width()/10;
			$span.remove();

			html = '';
			for(var i=0; i<10; i++){
				html+='啊';
			}
			$body.append('<span class="w_char">'+html+'</span>');
			$span = $body.find('.w_char')
			width[2] = $span.width()/10;
			$span.remove();
			return width;
		},
		getBriefTxt: function(content,width){
			var signReg = /[\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3008|\u3009|\u3010|\u3011|\u300e|\u300f|\u300c|\u300d|\ufe43|\ufe44|\u3014|\u3015|\u2026|\u2014|\uff5e|\ufe4f|\uffe5]/;
			var chineseReg = /[\u4e00-\u9fa5]/;
			var txt = '';
			var count = 0;
			for(var i=0; i<content.length; i++){
				var char = content.charAt(i);
				if(signReg.test(char) || chineseReg.test(char)){
					count+=charWidth[2];
				}else if(/[A-Z]/.test(char)){
					count+=charWidth[1];
				}else{
					count+=charWidth[0];
				}
				txt+=char;
				if(count>=2*width-3*charWidth[0]){
					txt+='...';
					break;
				}
			}
			return txt;
		}
	}
	var $wrap = $('#wrapper');
	var $banner = $wrap.find('.banner');
	var tipHeight = 0;
	var $topTip = $wrap.find('.top_tip');
	var $bottomTip = $wrap.find('.bottom_tip');
	var $list = $wrap.find('.p_list_c');
	var scroll = null;
	var currentPage = 1;
	var pageSize = 30;
	var pageTotal = null;
	var charWidth = 0;
	var itemWidth = 0;
	var nomore = false;
	var carousel = null;
	var OxListObj = {
		init: function(){
			charWidth = util.getCharWidth();
			this.getBanner();
			this.initShare();
		},
		initShare: function(data){
            var isWx = window.navigator.userAgent.toLowerCase().indexOf('micromessenger')!=-1;
            var isQQ = window.navigator.userAgent.toLowerCase().indexOf('qq/')!=-1;
            var data = {
            	title: '1对1倾诉咨询-千帆觅知',
            	desc: '有温度的解决情感问题，有深度的分享知识技能',
            	pic: 'http://file.qf.56.com/f/h5/style/special/ox_man/v1/img/share.png'
            }
            if(isWx){
                Share.wechatInit(data);
            }else if(isQQ){
                Share.qqInit(data);
            }
        },
		getBanner: function(){
			var self = this;
			Ajax.send(urls.BANNER, {
	            method: 'get',
	            dataType: 'json',
	            onsuccess: function(res){
	            	if(res.status!=200){
	            		$('.p_list').css({'margin-top':'0','padding-top':'0'});
	            		$banner.hide();
	            		self.getList(true);
	            		return;
	            	}
	            	var banners = res.message.banners;
	            	var bannerSize = res.message.banners.length;
	            	// for(var i=0; i<banners.length; i++){
	            	// 	banners[i].linkUrl = banners[i].linkUrl.indexOf('://') == -1 ? window.location.protocol+'//'+banners[i].linkUrl : banners[i].linkUrl;
	            	// }
	            	var html = tpl.render('BANNER',{data:banners});
	            	if(html){
	            		$banner.find('.wrap').append(html);
	            		// util.gallery($banner,$banner.find('.wrap'),$banner.find('.dots'));
	            		carousel = new Carousel({
	            			container: $banner[0],
					    	wrap: $banner.find('.wrap')[0],
					    	dotsWrap:  $banner.find('.dots')[0],
					    	dotClassName: 'dot',
					    	activeClassName: 'active'
	            		});
	            		$banner.find('.banner_img').on('click',function(){
            				var url = $(this).attr('data-url');
            				dataHelper.stat_h5('home_banner');
            				if(url && url.indexOf('javascript:void(0)')==-1){
            					location.href = url;
            				}
	            		})
	            	}
	            	if(!bannerSize){
	            		$('.p_list').css({'margin-top':'0','padding-top':'0'})
	            		$banner.hide();
	            	}
	            	self.getList(true);
	            }
	        })
		},
		getList: function(fresh,fn){
			var self = this;
			if(fresh){
				currentPage = 1;
				nomore = false;
			}else if(nomore){
				return;
			}
			Ajax.jsonp(urls.LIST, {
	            method: 'get',
	            data: {currentPage:currentPage,pageSize:pageSize},
	            onsuccess: function(res) {
	                if(res.status!=200)
	                    return;
	                var dataList = res.data;
	                if(itemWidth==0 && dataList.length>0){
			        	itemWidth = self.getItemWidth(dataList[0]);
			        }
			        for(var i=0; i<dataList.length; i++){
			        	dataList[i].introduce = util.getBriefTxt(dataList[i].introduce,itemWidth);
			        }
			        var html = tpl.render('ITEM',{data: dataList});
			        if(html){
			        	if(fresh)
			        		$list.find('.item').remove();
			    		$list.append(html);
			        	self.createScroll();
			        }
			        self.bindEventForItem();
					currentPage ++;
					if(typeof fn === 'function')
						fn();
					if(dataList.length<pageSize){
						nomore = true;
						$bottomTip.html('到底啦...');
					}
	            }
	        });
		},
		getItemWidth: function(data){
			var width = 0;
			var countWidth = 0;
			var content = data.introduce;
			$list.append(tpl.render('ITEM',{data: [data]}));
			width = $list.find('.item').first().find('.right').width();
			return width;
		},
		bindEventForItem: function(){
			$wrap.find('.p_list_c').find('.item').on('click',function(){
				var uid = $(this).attr('data-uid');
				dataHelper.stat_h5('home_content');
				window.location.href = 'detail.html?uid='+uid;
			})
		},
		createScroll: function(){
			var self = this;
			if(scroll)
				return;
			scroll = new Scroll({
				wrapperId:'p_list_w',
				scrollerId: 'p_list_c',
				enableBar: true,
				enableFadeout: true,
				barClassName: 'scrollbar',
				topRefreshTxt:'下拉刷新',
			    topRefreshingTxt:'努力刷新中',
			    bottomLoadTxt:'上拉加载',
			    bottomLoadingTxt:'努力加载中',
			    bottomNomoreTxt:'到底啦',
			    topRefreshGoTxt:'松开刷新',
			    bottomLoadGoTxt:'松开加载',
			    // autoLoad:true,
			    useNativeScroll: true,
				onLoad: function(offsetY,maxOffsetY){
					if(!nomore){
						setTimeout(function(){
							scroll.refresh();
						},0);
					}else{
						scroll.setNomore(true);
						scroll.refresh();
					}
				},
				onRefresh: function(offsetY){
					//刷新数据
					currentPage = 1;
					self.getList(true,function(){
						scroll.refresh();
					});
				},
				onMove: function(offsetY,maxOffsetY){
				}
			})
		}
	}
	OxListObj.init();
})