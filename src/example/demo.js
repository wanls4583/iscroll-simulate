import Scroll from '../scroll';


var wrapper = document.querySelector('#wrapper');
var scroller = document.querySelector('#scroller');
var topTip = document.querySelector('.top_tip');
var bottomTip = document.querySelector('.bottom_tip');

refresh();

var scroll = new Scroll({
    wrapper: wrapper,
    scroller: scroller,
    topTip: topTip,
    bottomTip: bottomTip,
    enableBar: true,
    barClassName: 'bar',
    enableFadeout: true,
    useNativeScroll: true,
    onMove: onMove,
    onRefresh: refresh,
    onLoad: onLoad
})

function refresh() {
	topTip.innerHTML = '刷新中...';
    setTimeout(function() {
	    var html = '';
	    for (var i = 0; i < 15; i++) {
	        html += '<div class="item"><img src="./img/head.jpg"><p><span class="title">无极剑圣▪易大师</span><br><span class="desc">易大师每攻击数次，就会同时对目标进行2次打击</span></p></div>'
	    }
	    document.querySelector('.content').innerHTML = html;
        scroll && scroll.refresh();
    }, 1000);
}

function onLoad() {
	bottomTip.innerHTML = '加载中...';
    setTimeout(function(){
	    for (var i = 0; i < 5; i++) {
	        var div = document.createElement('div');
	        div.innerHTML = '<img src="./img/head.jpg"><p><span class="title">无极剑圣▪易大师</span><br><span class="desc">易大师每攻击数次，就会同时对目标进行2次打击</span></p>';
	        div.className = 'item';
	        document.querySelector('.content').appendChild(div);
	    }
	    scroll && scroll.refresh();
    },1000);
}

/**
 * 滑动动时触发
 * @param  {Number} offsetY scroller相对wrapper的偏移量
 */
function onMove(offsetY, status) {
    if(status == Scroll.REFRESH_ABLE){
        topTip.innerHTML = '松开刷新...';
    }else{
        topTip.innerHTML = '下拉刷新...';
    }
    if(status == Scroll.LOAD_ABLE){
    	bottomTip.innerHTML = '松开加载...';
    }else{
    	bottomTip.innerHTML = '上拉加载...';
    }
}