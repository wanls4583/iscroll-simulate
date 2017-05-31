define(function(require, exports, module) {
	'use strict';

	function Scroll(wrapperId,scrollerId){
		var that = this,
            startY,//开始的Y坐标
			startTime,//触摸开始的时间戳
			endTime,//触摸结束的时间戳
			preY=0,//上一次touchmove的Y坐标偏移量
			offsetY=0,//当前的偏移量
			maxOffsetY,//最大的偏移量
			disY,//两次touchmove的间隔Y坐标偏移量
			isOutTop = false,//下拉是否超过顶部
			isOutBottom = false,//上拉是否超过底部
			lockMove = false;//是否锁定touchmove

		/*var rAF = window.requestAnimationFrame  ||
        window.webkitRequestAnimationFrame  ||
        window.mozRequestAnimationFrame     ||
        window.oRequestAnimationFrame       ||
        window.msRequestAnimationFrame      ||
        function (callback) { window.setTimeout(callback, 1000 / 60); };*/

        //滚动区域
        var wrapper = document.getElementById(wrapperId);
        //滚动的内容
        var scroller = document.getElementById(scrollerId);
        //设置最大偏移量
        maxOffsetY =  wrapper.clientHeight - scroller.scrollHeight;

        /**
         * [tranlate 移动函数]
         * @param  {[Number]} transitionDuration [过渡时间，为0时不会触发transitionend事件]
         */
        function tranlate(transitionDuration){
        	if(!transitionDuration)
        		transitionDuration = 0;
            
            scroller.style[that.style.transitionProperty] = 'transform';
            scroller.style[that.style.transformOrigin] = '0px 0px 0px';
            scroller.style[that.style.transitionTimingFunction] = 'cubic-bezier(0.33, 0.66, 0.66, 1)';
            scroller.style[that.style.transitionDuration] = transitionDuration+'ms';
            scroller.style[that.style.transformOrigin] = '0px 0px 0px';

        	//translateZ(0)用来启动硬件加速
        	scroller.style[that.style.transform] = 'translateY('+offsetY+'px) translateZ(0)';
            document.getElementById('test').innerHTML = that.style.transform;
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
        	destOffsetY = offsetY + inertia;
            //惯性滚动时长，速度/加速度
            duration = speed / deceleration;
            //如果惯性终点偏移量会超过顶部或者底部，需要减少时长，以免超出
            if(destOffsetY < maxOffsetY){
            	destOffsetY = maxOffsetY;
            	distance = Math.abs(destOffsetY - offsetY);
                duration = distance / speed;
            }else if(destOffsetY > 0){
            	destOffsetY = 0;
            	distance = Math.abs(offsetY) + destOffsetY;
                duration = distance / speed;
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
            startTime = new Date().getTime();
            preY = startY = e.touches[0].pageY;
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
            //如果是回弹过程或者300ms以上的时间只滑动了10像素，则不移动
            if(lockMove || (disY < 10 && nowTime - startTime > 300) )
                return;
            //上拉或者下拉超出后,降低两次touchmove之间Y的偏移量
            if(offsetY < maxOffsetY && disY < 0){
                isOutBottom = true;
                disY *= 0.25;
            }else if(offsetY > 0 && disY > 0){
                isOutTop = true;
                disY *= 0.25;
            }
            offsetY += disY;
            tranlate();
        }

        //触摸结束
        function end(e){
            endTime = new Date().getTime();
            var duration = endTime - startTime;
            if(isOutBottom){
                //回弹时锁定touchmove
                lockMove = true;
                offsetY = maxOffsetY;
            }else if(isOutTop){
                //回弹时锁定touchmove
                lockMove = true;
                offsetY = 0;
            }else{
                var obj = momentum(preY,startY,duration);
                offsetY = obj.destOffsetY;
                duration = obj.duration;
            }
            tranlate(duration);
        }

        //动画过渡结束
        function transitionEnd(e){
            lockMove = false;
            isOutBottom = false;
            isOutTop = false;
        }
        bindEvent(scroller, 'touchstart', start);
        bindEvent(scroller, 'touchmove', move);
        bindEvent(scroller, 'touchend', end);

        bindEvent(scroller, 'transitionend', transitionEnd);
        bindEvent(scroller, 'webkitTransitionEnd', transitionEnd);
        bindEvent(scroller, 'oTransitionEnd' , transitionEnd);
        bindEvent(scroller, 'MSTransitionEnd', transitionEnd);
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
	return Scroll;
})