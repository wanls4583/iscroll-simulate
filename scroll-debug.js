// define(function(require, exports, module) {
    // 'use strict';
    /**
     * @Author   Lisong
     * @DateTime 2017-08-29
     * @TODO
     * @param    {[Object]}   
     * opt [{
     * wrapper:外部容器,
     * scroller:内容容器,
     * onLoad:加载回调,
     * onRefresh:刷新回调,
     * onStart:开始触摸回调,
     * onMove:移动回调,
     * onEnd: 触摸结束,
     * onBottom:滚动到底部回调,
     * barClassName:滚动条样式类,
     * enableBar:是否使用自定义滚动条(仅当useNativeScroll为false时才有意义),
     * enableFadeout:是否允许自定义滚动条渐隐(仅当enableBar为true时才有意义),
     * useNativeScroll:是否使用浏览器自带滚动
     * }]
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
            baunceTimeoutId = null,//回弹计时器
            barOpacity = 1,//滚动条初始透明度
            preScrollerHeight = 0,//记录内容高度
            /*滑动过程中是否有向上滑动,某些浏览器默认自带下拉回弹效果，
            如果scroll有向上滑动过，再向下滑动时将无法阻止浏览器默认下拉，
            而浏览器默认下拉将停止触发触摸事件，将引起刷新icon不能回弹的bug
            */
            hasSlideUp = false,
            allListener = [];
            
        var ScrollObj = {
            init: function(opt){
                var self = this;
                var emptyCb = function(){};
                //滚动区域
                this.wrapper = opt.wrapper;
                //滚动的内容
                this.scroller = opt.scroller;
                this.bar = null;
                this.barClassName = opt.barClassName;
                this.enableFadeout = opt.enableFadeout;
                this.useNativeScroll = opt.useNativeScroll;
                this.enableBar = opt.enableBar;
                this.onStart = opt.onStart||emptyCb;
                this.onMove = opt.onMove||emptyCb;
                this.onBottom = opt.onBottom||emptyCb;
                this.onEnd = opt.onEnd||emptyCb;
                this.onLoad = opt.onLoad||emptyCb;
                this.onRefresh = opt.onRefresh||emptyCb;
                this.autoLoad = opt.autoLoad;
                this.topTip = opt.topTip;
                this.bottomTip = opt.bottomTip;
                this.nomore = false;
                this.topTipHeight = 0;
                this.bottomTipHeight = 0;
                if(this.topTip){
                    this.topTip.style.display = 'block';
                    this.topTipHeight = this.topTip.clientHeight;
                }
                this.barHeight = this.wrapper.clientHeight*(this.wrapper.clientHeight/this.wrapper.scrollHeight);
                this.enableBar && (this.bar=this._createScrollBar()) && (this.bar.style.display = 'none');
                this.prefixStyle = Util.getPrefixStyle();
                if(this.useNativeScroll){
                    this.wrapper.style.overflow = 'auto';
                    this.scroller.style.marginBottom = '-'+ this.topTipHeight + 'px';
                }else{
                    this.barHeight = this.wrapper.clientHeight*(this.wrapper.clientHeight/this.wrapper.scrollHeight);
                    this.enableBar && (this.bar=this._createScrollBar()) && (this.bar.style.display = 'none');
                    this.scroller.style.overflow = 'visible';
                    this.wrapper.style.overflow = 'hidden';
                    this.wrapper.style.position = 'relative';
                }
                //最小偏移量
                this.topOffsetY = -this.topTipHeight;
                //设置最大偏移量
                this.maxOffsetY =  this.wrapper.clientHeight - this.scroller.clientHeight;
                //当前的偏移量
                this.offsetY = this.topOffsetY;
                //初始化位置
                this._tranlate(this.scroller);
                this._bindEvent(this.wrapper, 'touchstart', function(e){
                    self._start(e);
                });
                this._bindEvent(this.wrapper, 'touchmove', function(e){
                    self._move(e);
                });
                this._bindEvent(this.wrapper, 'touchend', function(e){
                    self._end(e);
                });
                this._bindEvent(window, 'resize', function(e){
                    self.refresh();
                });
                this._bindEvent(this.wrapper, 'scroll', function(e){
                    //自动加载
                    if(self.useNativeScroll){
                        if(Math.abs(self.wrapper.scrollTop-Math.abs(self.wrapper.clientHeight-self.wrapper.scrollHeight)) <= self.bottomTipHeight){
                            self.onBottom();
                            if(self.autoLoad && !self.nomore){
                                self.onLoad();
                            }
                        }
                    }
                });
                preScrollerHeight = this.wrapper.scrollHeight;
            },
            refresh: function(){
                var self = this;
                if(!this.useNativeScroll){
                    if(this.offsetY >= this.topOffsetY){
                        this.offsetY = this.topOffsetY;
                    }else if(this.offsetY <= this.maxOffsetY){
                        this.offsetY = this.maxOffsetY;
                    }
                    //设置最大偏移量
                    this.maxOffsetY =  this.wrapper.clientHeight - this.scroller.clientHeight;
                    if(this.bar){
                        this.barHeight = this.wrapper.clientHeight*(this.wrapper.clientHeight/(this.wrapper.scrollHeight+this.bottomTipHeight));
                        this.bar.style.height = this.barHeight+'px';
                    }
                }else{
                    this.offsetY = this.topOffsetY;
                }
                this._tranlate(self.scroller,500);
                preScrollerHeight = this.wrapper.scrollHeight;
            },
            setOffsetY: function(offsetY){
                //设置偏移量
                this.offsetY =  offsetY;
            },
            scrollTop: function(offsetY){
                if(!this.useNativeScroll){
                    //设置偏移量
                    this.offsetY =  offsetY;
                    this._tranlate(this.scroller,300);
                }
            },
            setNomore: function(nomore){
                this.nomore = nomore;
            },
            destroy: function(){
                this._removeAllEvent();
            },
            /**
             * [_tranlate 移动函数]
             * @param  {[DOM]} target [目标对象]
             * @param  {[Number]} transitionDuration [过渡时间，为0时不会触发transitionend事件]
             */
            _tranlate: function(target,transitionDuration,_offsetY){
                var offsetY = _offsetY!=undefined?_offsetY:this.offsetY;
                if(!transitionDuration)
                    transitionDuration = 0;
                if(transitionDuration){
                    target.style[this.prefixStyle.transitionProperty] = 'transform';
                }else{
                    target.style[this.prefixStyle.transitionProperty] = 'none';
                }
                target.style[this.prefixStyle.transformOrigin] = '0px 0px 0px';
                target.style[this.prefixStyle.transitionTimingFunction] = 'cubic-bezier(0.33, 0.66, 0.66, 1)';
                target.style[this.prefixStyle.transitionDuration] = transitionDuration+'ms';
                //translateZ(0)用来启动硬件加速
                target.style[this.prefixStyle.transform] = 'translateY('+offsetY+'px) translateZ(0)';

                if(this.bar && target == this.scroller){
                    var offsetY = 0;
                    if(this.offsetY<this.topOffsetY && this.offsetY>this.maxOffsetY){
                        offsetY = (this.offsetY-this.topOffsetY)/this.maxOffsetY*(this.wrapper.clientHeight-this.barHeight);
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
                if(destOffsetY < this.maxOffsetY && this.maxOffsetY < this.topOffsetY){
                    destOffsetY = this.maxOffsetY;
                    distance = Math.abs(this.offsetY - destOffsetY);
                    duration = distance / speed;
                }else if(destOffsetY > this.topOffsetY){
                    destOffsetY = this.topOffsetY;
                    distance = Math.abs(this.offsetY - destOffsetY);
                    duration = distance / speed;
                }else if(this.maxOffsetY >this.topOffsetY && destOffsetY<this.topOffsetY){ //如果容器大于内容的高度
                    destOffsetY = this.topOffsetY;
                }
                
                return{
                    destOffsetY: Math.round(destOffsetY),
                    duration: duration
                }
            },
            //触摸开始
            _start: function(e){
                //获取transition过渡未结束的transform值
                var style = window.getComputedStyle ?window.getComputedStyle(this.scroller, null) : null || this.scroller.currentStyle;
                var matrix = style[this.prefixStyle.transform];
                if(matrix.indexOf('matrix')>-1){
                    if(this.bar){
                        //强制刷新
                        window.getComputedStyle ?window.getComputedStyle(this.bar, null) : null || this.scroller.currentStyle;
                    }
                    this.offsetY = Number(matrix.replace(/matrix\(|\)/g,'').split(',')[5]);
                    this._tranlate(this.scroller);
                }
                if(!this.useNativeScroll){
                    if(this.enableFadeout){
                        this.bar.style[this.prefixStyle.transitionDuration] = '0ms';
                        window.getComputedStyle ?window.getComputedStyle(this.bar, null) : null || this.scroller.currentStyle;
                        this.bar.style.opacity = barOpacity;
                        this.bar.style.display = 'block';
                    }
                    startTime = new Date().getTime();
                    preY = startY = e.touches[0].pageY;
                    clearTimeout(barFadeTimeoutId);
                }else{
                    clearTimeout(baunceTimeoutId);
                    preY = startY = e.touches[0].pageY;
                }
                if(this.wrapper.scrollTop==0){
                    hasSlideUp = false;
                }
                this.onStart(this.offsetY);
            },
            //触摸移动
            _move: function(e){
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
                if(!this.useNativeScroll){//自定义滚动
                    e.preventDefault();
                    e.stopPropagation();
                    //上拉或者下拉超出后,降低两次touchmove之间Y的偏移量
                    if(this.offsetY < this.maxOffsetY && this.maxOffsetY<0){
                        isOutBottom = true;
                        isOutTop = false;
                        disY *= 0.25;
                        this.offsetY += disY;
                        this._tranlate(this.scroller);
                    }else if(this.offsetY > this.topOffsetY){
                        isOutTop = true;
                        isOutBottom = false;
                        disY *= 0.25;
                        this.offsetY += disY;
                        this._tranlate(this.scroller);
                    }else{
                        isOutTop = false;
                        isOutBottom = false;
                        this.offsetY += disY;
                        this._tranlate(this.scroller);
                    }
                }else{//浏览器自带滚动
                    disY<0 && (hasSlideUp=true);
                    if(Math.abs(this.wrapper.scrollTop-Math.abs(this.wrapper.clientHeight-this.wrapper.scrollHeight)) < 2 && this.offsetY+disY < this.topOffsetY){
                        e.preventDefault();
                        e.stopPropagation();
                        isOutBottom = true;
                        isOutTop = false;
                        disY *= 0.25;
                        this.offsetY += disY;
                        this._tranlate(this.scroller);
                    }else if(this.wrapper.scrollTop == 0 && this.offsetY+disY > this.topOffsetY && (this.offsetY > this.topOffsetY || !hasSlideUp)){
                        e.preventDefault();
                        e.stopPropagation();
                        isOutTop = true;
                        isOutBottom = false;
                        disY *= 0.25;
                        this.offsetY += disY;
                        this._tranlate(this.scroller);
                    }else if(Math.abs(this.offsetY-this.topOffsetY)>5){
                        e.preventDefault();
                        e.stopPropagation();
                        isOutTop = false;
                        isOutBottom = false;
                        this.offsetY = disY;
                        this._tranlate(this.scroller);
                    }
                }
                this.onMove(this.offsetY);
            },
            //触摸结束
            _end: function(e){
                var self = this;
                var preOffsetY = this.offsetY;
                endTime = new Date().getTime();
                var duration = endTime - startTime;
                if(!this.useNativeScroll){
                    if(isOutBottom){
                        this.offsetY = this.maxOffsetY;
                        //手动加载
                        if(!this.nomore && preOffsetY < this.maxOffsetY - this.bottomTipHeight && !this.autoLoad){
                            this.onLoad();
                        }
                        duration = Math.abs(preOffsetY - this.offsetY)/this.wrapper.clientHeight*1500;
                        this._tranlate(this.scroller,duration);
                        this.onBottom();
                    }else if(isOutTop){
                        if(preOffsetY >= this.topOffsetY+this.topTipHeight){
                            this.offsetY = this.topOffsetY+this.topTipHeight;
                            this._tranlate(this.scroller,500);
                            this.onRefresh();
                        }else{
                            this.offsetY = this.topOffsetY;
                            duration = Math.abs(preOffsetY - this.offsetY)/this.wrapper.clientHeight*1500;
                            this._tranlate(this.scroller,duration);
                        }
                    }else{
                        var obj = this._momentum(preY,startY,duration);
                        this.offsetY = obj.destOffsetY;
                        duration = obj.duration;
                        this._tranlate(this.scroller,duration);
                    }
                    //自动加载
                    if(this.autoLoad && !this.nomore){
                        if(this.offsetY <= this.maxOffsetY && this.maxOffsetY<0){
                            this.onLoad();
                        }
                    }
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
                        this.offsetY = this.topOffsetY;
                        //手动加载
                        if(!this.nomore && preOffsetY < -this.bottomTipHeight+this.topOffsetY && !this.autoLoad){
                            this.onLoad();
                        }
                        duration = Math.abs(preOffsetY-this.topOffsetY)/this.wrapper.clientHeight*1500;
                        this._tranlate(this.scroller,duration);
                    }else if(isOutTop){
                        if(preOffsetY > this.topOffsetY+this.topTipHeight){
                            this.offsetY = this.topOffsetY+this.topTipHeight;
                            this._tranlate(this.scroller,500);
                            this.onRefresh();
                        }else{
                            this.offsetY = this.topOffsetY;
                            duration = Math.abs(preOffsetY - this.offsetY)/this.wrapper.clientHeight*1500;
                            this._tranlate(this.scroller,duration);
                        }
                        
                    }else{
                        this.offsetY = this.topOffsetY;
                        this._tranlate(this.scroller,0);
                    }
                }
                this.onEnd(this.offsetY);
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
            //事件绑定函数
            _bindEvent: function(ele, event_name, func) {
                if (window.attachEvent) {
                    ele.attachEvent('on' + event_name, func);
                } else {
                    ele.addEventListener(event_name, func, false); //默认事件是冒泡
                }
                allListener[allListener.length] = {
                    ele: ele,
                    func: func,
                    event: event_name
                }
            },
            _removeEvent: function(ele, event_name, func){
                if (window.attachEvent) {
                    ele.detachEvent('on' + event_name, func);
                } else {
                    ele.removeEventListener(event_name, func, false);
                }
            },
            _removeAllEvent: function(){
                for(var i=0; i<allListener.length; i++){
                    var listener = allListener[i];
                    this._removeEvent(listener.ele,listener.event,listener.func);
                }
            }
        }

        typeof opt === 'object' && ScrollObj.init(opt);

        return ScrollObj;
    }
    var Util = {
        styleSheet: null,
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
        },
        insertRlue: function(selectorText,cssText){
            var style = document.createElement('style');
            style.type = 'text/css';
            if(!this.styleSheet){
                document.getElementsByTagName('head')[0].appendChild(style);
                this.styleSheet = document.styleSheets[document.styleSheets.length-1];
            }
            _insertRule(this.styleSheet, selectorText, cssText, 0);
            function _insertRule(sheet, selectorText, cssText, position) {
                //如果是非IE
                if (sheet.insertRule) {
                    sheet.insertRule(selectorText + "{" + cssText + "}", position);
                //如果是IE
                } else if (sheet.addRule) {
                    sheet.addRule(selectorText, cssText, position);
                }
            }
        }
    }
//     return Scroll;
// })