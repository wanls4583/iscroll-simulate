define(function(require, exports, module) {
    // 'use strict';
    /**
     * @Author   Lisong
     * @DateTime 2017-08-29
     * @TODO
     * @param    {[Object]}   opt [{wrapperId:外部容器id,scrollerId:内容容器id,onLoad:加载回调,onRefresh:刷新回调,onMove:移动回调}]
     */
    function Scroll(opt){
        var startY,//开始的Y坐标
            startTime,//触摸开始的时间戳
            endTime,//触摸结束的时间戳
            preY=0,//上一次touchmove的Y坐标偏移量
            disY,//两次touchmove的间隔Y坐标偏移量
            isOutTop = false,//下拉是否超过顶部
            isOutBottom = false,//上拉是否超过底部
            barFadeTimeoutId = null,//滚动条消失计时器
            barOpacity = 1;
            
        var ScrollObj = {
            init: function(opt){
                var self = this;
                //滚动区域
                this.wrapper = document.getElementById(opt.wrapperId);
                //滚动的内容
                this.scroller = document.getElementById(opt.scrollerId);
                this.bar = null;
                this.barClassName = opt.barClassName;
                this.topTipClassName = opt.topTipClassName;
                this.bottomTipClassName = opt.bottomTipClassName;
                this.enableFadeout = opt.enableFadeout;
                this.useNativeScroll = opt.useNativeScroll;
                this.enableBar = opt.enableBar;
                this.onMove = opt.onMove;
                this.onLoad = opt.onLoad;
                this.onRefresh = opt.onRefresh;

                this._createTip();
                if(this.useNativeScroll){
                    this.topTip.style.display = 'none'
                    this.bottomTip.style.display = 'none';
                    this.scroller.style.overflow = 'visible';
                    this.wrapper.style.overflow = 'auto';
                }else{
                    this.enableBar && (this.bar=this._createScrollBar()) && (this.bar.style.display = 'none');
                    this.scroller.style.overflow = 'visible';
                    this.wrapper.style.overflow = 'hidden';
                    this.wrapper.style.position = 'relative';
                }
                this.prefixStyle = Util.getPrefixStyle();
                //设置最大偏移量
                this.maxOffsetY =  wrapper.clientHeight - this.scroller.clientHeight;
                //当前的偏移量
                this.offsetY = 0;
                this.barHeight = wrapper.clientHeight*(wrapper.clientHeight/this.scroller.clientHeight);
                this._bindEvent(this.scroller, 'touchstart', function(e){
                    self._start(e);
                });
                this._bindEvent(this.scroller, 'touchmove', function(e){
                    self._move(e);
                });
                this._bindEvent(this.scroller, 'touchend', function(e){
                    self._end(e);
                });
            },
            refresh: function(){
                if(!this.useNativeScroll){
                    //设置最大偏移量
                    this.maxOffsetY =  this.wrapper.clientHeight - this.scroller.clientHeight;
                    if(this.bar){
                        this.barHeight = this.wrapper.clientHeight*(this.wrapper.clientHeight/this.scroller.clientHeight);
                        this.bar.style.height = this.barHeight+'px';
                    }
                }
            },
            setOffsetY: function(offsetY){
                //设置偏移量
                this.offsetY =  offsetY;
            },
            scrollTop: function(offsetY){
                if(!this.useNativeScroll){
                    //设置偏移量
                    this.offsetY =  offsetY;
                    this._tranlate(400);
                }
            },
            /**
             * [_tranlate 移动函数]
             * @param  {[Number]} transitionDuration [过渡时间，为0时不会触发transitionend事件]
             */
            _tranlate: function(transitionDuration){
                if(!transitionDuration)
                    transitionDuration = 0;
                if(transitionDuration){
                    this.scroller.style[this.prefixStyle.transitionProperty] = 'transform';
                }else{
                    this.scroller.style[this.prefixStyle.transitionProperty] = 'none';
                }
                this.scroller.style[this.prefixStyle.transformOrigin] = '0px 0px 0px';
                this.scroller.style[this.prefixStyle.transitionTimingFunction] = 'cubic-bezier(0.33, 0.66, 0.66, 1)';
                this.scroller.style[this.prefixStyle.transitionDuration] = transitionDuration+'ms';
                //translateZ(0)用来启动硬件加速
                this.scroller.style[this.prefixStyle.transform] = 'translateY('+this.offsetY+'px) translateZ(0)';

                if(this.bar){
                    var offsetY = 0;
                    if(this.offsetY<0 && this.offsetY>this.maxOffsetY){
                        offsetY = this.offsetY/this.maxOffsetY*(this.wrapper.clientHeight-this.barHeight);
                    }else if(this.offsetY <= this.maxOffsetY){
                        offsetY = this.wrapper.clientHeight-this.barHeight;
                    }
                    
                    this.bar.style[this.prefixStyle.transformOrigin] = '0px 0px 0px';
                    this.bar.style[this.prefixStyle.transitionTimingFunction] = 'cubic-bezier(0.33, 0.66, 0.66, 1)';
                    this.bar.style[this.prefixStyle.transitionDuration] = transitionDuration+'ms';
                    this.bar.style[this.prefixStyle.transform] = 'translateY('+offsetY+'px) translateZ(0)';
                }
            },
            /**
             * [_momentum 计算惯性滚动的终点偏移量和惯性滚动的时长]
             * @param  {[Number]} currentY     [当前的Y坐标]
             * @param  {[Number]} startY       [触摸开始的Y坐标]
             * @param  {[Number]} time         [触摸时长]
             * @param  {[Number]} deceleration [加速度]
             * @return {[Object]}              [{destOffsetY:终点偏移量，duration:滚动时长}]
             */
            _momentum: function(currentY,startY,time,deceleration){
                var distance = currentY - startY,
                speed = Math.abs(distance) / time,
                destOffsetY,
                inertia,
                duration;

                deceleration = deceleration ? deceleration : 0.0006;
                //物理公式计算惯性滚动距离
                inertia = ( speed * speed ) / ( 2 * deceleration ) * ( distance < 0 ? -1 : 1 );
                //惯性滚动终点偏移量
                destOffsetY = this.offsetY + inertia;
                //惯性滚动时长，速度/加速度
                duration = speed / deceleration;
                //如果惯性终点偏移量会超过顶部或者底部，需要减少时长，以免超出
                if(destOffsetY < this.maxOffsetY && this.maxOffsetY < 0){
                    destOffsetY = this.maxOffsetY;
                    distance = Math.abs(destOffsetY - this.offsetY);
                    duration = distance / speed;
                }else if(destOffsetY > 0){
                    destOffsetY = 0;
                    distance = Math.abs(this.offsetY) + destOffsetY;
                    duration = distance / speed;
                }else if(this.maxOffsetY >0 && destOffsetY<0){ //如果容器大于内容的高度
                    destOffsetY = 0;
                }

                return{
                    destOffsetY: Math.round(destOffsetY),
                    duration: duration
                }
            },
            //触摸开始
            _start: function(e){
                if(!this.useNativeScroll){
                    //获取transition过渡未结束的transform值
                    var style = window.getComputedStyle ?window.getComputedStyle(this.scroller, null) : null || this.scroller.currentStyle;
                    var matrix = style[this.prefixStyle.transform]
                    if(this.enableFadeout){
                        this.bar.style[this.prefixStyle.transitionDuration] = '0ms';
                        window.getComputedStyle ?window.getComputedStyle(this.bar, null) : null || this.scroller.currentStyle;
                        this.bar.style.opacity = barOpacity;
                        this.bar.style.display = 'block';
                    }
                    if(matrix.indexOf('matrix')>-1){
                        if(this.bar){
                            //强制刷新
                            window.getComputedStyle ?window.getComputedStyle(this.bar, null) : null || this.scroller.currentStyle;
                        }
                        this.offsetY = Number(matrix.replace(/matrix\(|\)/g,'').split(',')[5]);
                        this._tranlate();
                    }
                    startTime = new Date().getTime();
                    preY = startY = e.touches[0].pageY;
                    clearTimeout(barFadeTimeoutId);
                }else{
                    preY = startY = e.touches[0].pageY;
                }
            },
            //触摸移动
            _move: function(e){
                // e.preventDefault();
                // e.stopPropagation();
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
                if(!this.useNativeScroll){
                    //上拉或者下拉超出后,降低两次touchmove之间Y的偏移量
                    if(this.offsetY < this.maxOffsetY && this.maxOffsetY<0 && disY < 0){
                        isOutBottom = true;
                        disY *= 0.25;
                    }else if(this.offsetY > 0 && disY > 0){
                        isOutTop = true;
                        disY *= 0.25;
                    }
                    this.offsetY += disY;
                    this._tranlate();
                }else{
                    this.offsetY += disY;
                    if(this.wrapper.scrollTop == Math.abs(this.maxOffsetY) && this.offsetY < 0){
                        this.wrapper.style.overflow = 'hidden';
                        this.topTip.style.display = 'block';
                        isOutBottom = true;
                        disY *= 0.25;
                        this._tranlate();
                    }else if(this.wrapper.scrollTop == 0 && this.offsetY>0){
                        this.wrapper.style.overflow = 'hidden';
                        this.bottomTip.style.display = 'block';
                        isOutTop = true;
                        disY *= 0.25;
                        this._tranlate();
                    }else{
                        isOutTop = false;
                        isOutBottom = false;
                        this.wrapper.style.overflow = 'auto';
                        this.topTip.style.display = 'none';
                        this.bottomTip.style.display = 'none';
                        this.offsetY = 0;
                    }
                }
                typeof opt.onMove === 'function' && this.onMove(this.offsetY,this.maxOffsetY);
            },
            //触摸结束
            _end: function(e){
                var self = this;
                var duration = endTime - startTime;
                var preOffsetY = this.offsetY;
                endTime = new Date().getTime();
                if(!this.useNativeScroll){
                    if(isOutBottom){
                        this.offsetY = this.maxOffsetY;
                        if(typeof opt.onLoad === 'function')
                            this.onLoad(preOffsetY,this.maxOffsetY);
                        duration = Math.abs(preOffsetY - this.maxOffsetY)/wrapper.clientHeight*1500;
                    }else if(isOutTop){
                        this.offsetY = 0;
                        if(typeof opt.onRefresh === 'function')
                            this.onRefresh(preOffsetY);
                        duration = Math.abs(preOffsetY)/wrapper.clientHeight*1500;
                    }else{
                        var obj = this._momentum(preY,startY,duration);
                        this.offsetY = obj.destOffsetY;
                        duration = obj.duration;
                    }
                    this._tranlate(duration);
                    isOutTop = false;
                    isOutBottom = false;
                    clearTimeout(barFadeTimeoutId);
                    barFadeTimeoutId = setTimeout(function(){
                        if(self.enableFadeout && self.bar.style.display!='none'){
                            self.bar.style[self.prefixStyle.transitionDuration] = '1000ms';
                            window.getComputedStyle ?window.getComputedStyle(self.bar, null) : null || self.scroller.currentStyle;
                            self.bar.style.opacity = '0';
                        }
                    },duration+500);
                }else{
                    if(isOutBottom){
                        this.offsetY = 0;
                        if(typeof opt.onLoad === 'function')
                            this.onLoad(preOffsetY,this.maxOffsetY);
                        duration = Math.abs(preOffsetY - this.maxOffsetY)/wrapper.clientHeight*1500;
                        setTimeout(function(){
                            self.wrapper.style.overflow = 'auto';
                        },duration+100);
                    }else if(isOutTop){
                        this.offsetY = 0;
                        if(typeof opt.onRefresh === 'function')
                            this.onRefresh(preOffsetY);
                        duration = Math.abs(preOffsetY)/wrapper.clientHeight*1500;
                        setTimeout(function(){
                            self.wrapper.style.overflow = 'auto';
                        },duration+100);
                    }else{
                        this.offsetY = 0;
                    }
                }
            },
            //创建滚动条
            _createScrollBar: function(){
                if(this.maxOffsetY>=0)
                    return false;
                var style = null;
                var div = document.createElement('div');
                div.setAttribute('style', 'position:absolute;top:0;right:0;height:'+this.barHeight+'px');
                div.setAttribute('class', this.barClassName?this.barClassName:'');
                this.wrapper.appendChild(div);
                style = window.getComputedStyle ?window.getComputedStyle(div, null) : null || this.scroller.currentStyle;
                barOpacity = style.opacity;
                return div;
            },
            _createTip: function(){
                this.topTip = document.createElement('span');
                this.bottomTip = document.createElement('span');
                var css = 'position:absolute;width:100%;display:none;line-height:60px;max-height:60px;text-align:center';
                this.topTip.setAttribute('style',css+';top:-60px');
                this.topTip.setAttribute('class', this.topTipClassName?this.topTipClassName:'');
                this.bottomTip.setAttribute('style',css+';bottom:-60px');
                this.bottomTip.setAttribute('class', this.bottomTipClassName?this.bottomTipClassName:'');
                this.scroller.insertBefore(this.bottomTip,this.scroller.firstElementChild);
                this.scroller.insertBefore(this.topTip,this.scroller.firstElementChild);
            },
            /**
             * [_bindEvent 事件绑定函数]
             * @param  {[Object]}   target    [目标对象]
             * @param  {[String]}   eventType [事件类型]
             * @param  {Function} callback  [回调函数]
             */
            _bindEvent: function(target,eventType,callback){
                target.addEventListener(eventType,callback,false);
            },
        }

        typeof opt === 'object' && ScrollObj.init(opt);

        return ScrollObj;
    }
    var Util = {
        getPrefixStyle: function(){
            var _elementStyle = document.createElement('div').style;
            var _vendor = false
            var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
                transform,
                i = 0,
                l = vendors.length;
 
            for ( ; i < l; i++ ) {
                transform = vendors[i] + 'ransform';
                if ( transform in _elementStyle ){
                    _vendor = vendors[i].substr(0, vendors[i].length-1);
                    break;
                }
                _vendor = false;
            }
     
            function _prefixStyle (style) {
                if (_vendor === false) return false;
                if (_vendor === '') return style;
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
        }
    }
    return Scroll;
})