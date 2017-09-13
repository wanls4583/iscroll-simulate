// define(function(require, exports, module) {
	// 'use strict';
    /**
     * @Author   Lisong
     * @DateTime 2017-08-29
     * @TODO
     * @param    {[Object]}   opt [{wrapperId:外部容器id,scrollerId:内容容器id,onLoad:加载回调,onRefresh:刷新回调,onMove:移动回调}]
     */
	function Scroll(opt){
		var self = this,
            startY,//开始的Y坐标
			startTime,//触摸开始的时间戳
			endTime,//触摸结束的时间戳
			preY=0,//上一次touchmove的Y坐标偏移量
			disY,//两次touchmove的间隔Y坐标偏移量
			isOutTop = false,//下拉是否超过顶部
			isOutBottom = false,//上拉是否超过底部
			lockMove = false,//是否锁定touchmove
			enableBar = false,
			barFadeTimeoutId = null,
			barOpacity = 1;
			
		/*var rAF = window.requestAnimationFrame  ||
        window.webkitRequestAnimationFrame  ||
        window.mozRequestAnimationFrame     ||
        window.oRequestAnimationFrame       ||
        window.msRequestAnimationFrame      ||
        function (callback) { window.setTimeout(callback, 1000 / 60); };*/
        //滚动区域
        var wrapper = document.getElementById(opt.wrapperId);
        //滚动的内容
        var scroller = document.getElementById(opt.scrollerId);
        this.wrapper = wrapper;
        this.scroller = scroller;
        this.bar = null;
        this.barClassName = opt.barClassName;
        this.enableFadeout = opt.enableFadeout;
        //设置最大偏移量
        this.maxOffsetY =  wrapper.clientHeight - scroller.clientHeight;
        this.barHeight = wrapper.clientHeight*(wrapper.clientHeight/scroller.clientHeight);
        this.tranlate = tranlate;
        //当前的偏移量
        this.offsetY = 0;
        enableBar = opt.enableBar;
        enableBar && (this.bar=createScrollBar());
        /**
         * [tranlate 移动函数]
         * @param  {[Number]} transitionDuration [过渡时间，为0时不会触发transitionend事件]
         */
        function tranlate(transitionDuration){
        	if(!transitionDuration)
        		transitionDuration = 0;
            if(transitionDuration){
                scroller.style[self.style.transitionProperty] = 'transform';
            }else{
                scroller.style[self.style.transitionProperty] = 'none';
            }
            scroller.style[self.style.transformOrigin] = '0px 0px 0px';
            scroller.style[self.style.transitionTimingFunction] = 'cubic-bezier(0.33, 0.66, 0.66, 1)';
            scroller.style[self.style.transitionDuration] = transitionDuration+'ms';
        	//translateZ(0)用来启动硬件加速
        	scroller.style[self.style.transform] = 'translateY('+self.offsetY+'px) translateZ(0)';

        	if(self.bar){
        		var offsetY = 0;
        		if(self.offsetY<0 && self.offsetY>self.maxOffsetY){
        			offsetY = self.offsetY/self.maxOffsetY*(self.wrapper.clientHeight-self.barHeight);
        		}else if(self.offsetY <= self.maxOffsetY){
        			offsetY = self.wrapper.clientHeight-self.barHeight;
        		}
    			
        		self.bar.style[self.style.transformOrigin] = '0px 0px 0px';
	            self.bar.style[self.style.transitionTimingFunction] = 'cubic-bezier(0.33, 0.66, 0.66, 1)';
	            self.bar.style[self.style.transitionDuration] = transitionDuration+'ms';
	        	self.bar.style[self.style.transform] = 'translateY('+offsetY+'px) translateZ(0)';
        	}
        }

        /**
         * [momentum 计算惯性滚动的终点偏移量和惯性滚动的时长]
         * @param  {[Number]} currentY     [当前的Y坐标]
         * @param  {[Number]} startY       [触摸开始的Y坐标]
         * @param  {[Number]} time         [触摸时长]
         * @param  {[Number]} deceleration [加速度]
         * @return {[Object]}              [{destOffsetY:终点偏移量，duration:滚动时长}]
         */
        function momentum(currentY,startY,time,deceleration){
        	var distance = currentY - startY,
            speed = Math.abs(distance) / time,
            destOffsetY,
            inertia,
            duration;

        	deceleration = deceleration ? deceleration : 0.0006;
            //物理公式计算惯性滚动距离
            inertia = ( speed * speed ) / ( 2 * deceleration ) * ( distance < 0 ? -1 : 1 );
            //惯性滚动终点偏移量
        	destOffsetY = self.offsetY + inertia;
            //惯性滚动时长，速度/加速度
            duration = speed / deceleration;
            //如果惯性终点偏移量会超过顶部或者底部，需要减少时长，以免超出
            if(destOffsetY < self.maxOffsetY && self.maxOffsetY < 0){
            	destOffsetY = self.maxOffsetY;
            	distance = Math.abs(destOffsetY - self.offsetY);
                duration = distance / speed;
            }else if(destOffsetY > 0){
            	destOffsetY = 0;
            	distance = Math.abs(self.offsetY) + destOffsetY;
                duration = distance / speed;
            }else if(self.maxOffsetY >0 && destOffsetY<0){ //如果容器大于内容的高度
                destOffsetY = 0;
            }

            return{
            	destOffsetY: Math.round(destOffsetY),
                duration: duration
            }
        }

        /**
         * [bindEvent 事件绑定函数]
         * @param  {[Object]}   target    [目标对象]
         * @param  {[String]}   eventType [事件类型]
         * @param  {Function} callback  [回调函数]
         */
        function bindEvent(target,eventType,callback){
            target.addEventListener(eventType,callback,false);
        }

        //触摸开始
        function start(e){
            //获取transition过渡未结束的transform值
            var style = window.getComputedStyle ?window.getComputedStyle(scroller, null) : null || scroller.currentStyle;
            var matrix = style[self.style.transform]
            if(self.enableFadeout){
            	self.bar.style[self.style.transitionDuration] = '0ms';
            	window.getComputedStyle ?window.getComputedStyle(self.bar, null) : null || scroller.currentStyle;
            	self.bar.style.opacity = barOpacity;
            	self.bar.style.display = 'block';
            }
            if(matrix.indexOf('matrix')>-1){
            	if(self.bar){
            		//强制刷新
            		window.getComputedStyle ?window.getComputedStyle(self.bar, null) : null || scroller.currentStyle;
            	}
                self.offsetY = Number(matrix.replace(/matrix\(|\)/g,'').split(',')[5]);
                tranlate();
            }
            startTime = new Date().getTime();
            preY = startY = e.touches[0].pageY;
            clearTimeout(barFadeTimeoutId);
        }

        //触摸移动
        function move(e){
            event.preventDefault();
            event.stopPropagation();
            disY = e.touches[0].pageY - preY;
            preY = e.touches[0].pageY;
            var nowTime = new Date().getTime();
            //超过300ms，重置startTime，用于回弹和惯性滚动计算开始时间
            if(nowTime - startTime > 300){
                startTime = nowTime;
                startY = e.touches[0].pageY;
            }
            //300ms以上的时间只滑动了10像素，则不移动
            if(disY < 10 && nowTime - startTime > 300)
                return;
            //上拉或者下拉超出后,降低两次touchmove之间Y的偏移量
            if(self.offsetY < self.maxOffsetY && self.maxOffsetY<0 && disY < 0){
                isOutBottom = true;
                disY *= 0.25;
            }else if(self.offsetY > 0 && disY > 0){
                isOutTop = true;
                disY *= 0.25;
            }
            self.offsetY += disY;
            tranlate();
            if(typeof opt.onMove === 'function')
                opt.onMove(self.offsetY,self.maxOffsetY);
        }

        //触摸结束
        function end(e){
            endTime = new Date().getTime();
            var duration = endTime - startTime;
            var preOffsetY = self.offsetY;
            if(isOutBottom){
                self.offsetY = self.maxOffsetY;
                if(typeof opt.onLoad === 'function')
                    opt.onLoad(preOffsetY,self.maxOffsetY);
                duration = Math.abs(preOffsetY - self.maxOffsetY)/wrapper.clientHeight*1500;
            }else if(isOutTop){
                self.offsetY = 0;
                if(typeof opt.onRefresh === 'function')
                    opt.onRefresh(preOffsetY);
                duration = Math.abs(preOffsetY)/wrapper.clientHeight*1500;
            }else{
                var obj = momentum(preY,startY,duration);
                self.offsetY = obj.destOffsetY;
                duration = obj.duration;
            }
            tranlate(duration);
            isOutTop = false;
            isOutBottom = false;
            clearTimeout(barFadeTimeoutId);
    		barFadeTimeoutId = setTimeout(function(){
    			if(self.enableFadeout && self.bar.style.display!='none'){
	            	self.bar.style[self.style.transitionDuration] = '1000ms';
	            	window.getComputedStyle ?window.getComputedStyle(self.bar, null) : null || scroller.currentStyle;
	            	self.bar.style.opacity = '0';
	            }
    		},duration+500);
        }

        //创建滚动条
        function createScrollBar(){
        	if(self.maxOffsetY>=0)
        		return false;
        	var style = null;
        	var div = document.createElement('div');
    		div.setAttribute('style', 'position:absolute;top:0;right:0;height:'+self.barHeight+'px');
        	div.setAttribute('class', self.barClassName?self.barClassName:'');
        	self.wrapper.appendChild(div);
        	style = window.getComputedStyle ?window.getComputedStyle(div, null) : null || scroller.currentStyle;
        	barOpacity = style.opacity;
        	return div
        }
        bindEvent(scroller, 'touchstart', start);
        bindEvent(scroller, 'touchmove', move);
        bindEvent(scroller, 'touchend', end);

        // bindEvent(scroller, 'transitionend', transitionEnd);
        // bindEvent(scroller, 'webkitTransitionEnd', transitionEnd);
        // bindEvent(scroller, 'oTransitionEnd' , transitionEnd);
        // bindEvent(scroller, 'MSTransitionEnd', transitionEnd);
	}
    Scroll.prototype.refresh = function(){
        //设置最大偏移量
        this.maxOffsetY =  this.wrapper.clientHeight - this.scroller.clientHeight;
        if(this.bar){
        	this.barHeight = this.wrapper.clientHeight*(this.wrapper.clientHeight/this.scroller.clientHeight);
        	this.bar.style.height = this.barHeight+'px';
        }
    }
    Scroll.prototype.setOffsetY = function(offsetY){
        //设置偏移量
        this.offsetY =  offsetY;
    }
    Scroll.prototype.scrollTop = function(offsetY){
        //设置偏移量
        this.offsetY =  offsetY;
        this.tranlate(400);
    }
    Scroll.prototype.style = (function(){
        var _elementStyle = document.createElement('div').style;
        /**
         * 判断CSS 属性样式前缀
         */
        var _vendor = (function () {
            var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
                transform,
                i = 0,
                l = vendors.length;
 
            for ( ; i < l; i++ ) {
                transform = vendors[i] + 'ransform';
                if ( transform in _elementStyle ) return vendors[i].substr(0, vendors[i].length-1);
            }
 
            return false;
        })();
 
        /**
         * 获取CSS 前缀
         * @param style
         * @returns {*} 返回CSS3兼容性前缀
         * @private
         */
        function _prefixStyle (style) {
            if ( _vendor === false ) return false;
            if ( _vendor === '' ) return style;
            return _vendor + style.charAt(0).toUpperCase() + style.substr(1);
        }
        var _transform = _prefixStyle('transform');
        var style = {
            transform: _transform,
            transitionProperty: _prefixStyle('transitionProperty'),
            transitionTimingFunction: _prefixStyle('transitionTimingFunction'),
            transitionDuration: _prefixStyle('transitionDuration'),
            transitionDelay: _prefixStyle('transitionDelay'),
            transformOrigin: _prefixStyle('transformOrigin'),
        };
        return style;
    })();
	// return Scroll;
// })