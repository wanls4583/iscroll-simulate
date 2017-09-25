define(function(require, exports, module) {
    // 'use strict';
    /**
     * @Author   Lisong
     * @DateTime 2017-08-29
     * @TODO
     * @param    {[Object]}   
     * opt [{
     * wrapperId:外部容器id,
     * scrollerId:内容容器id,
     * onLoad:加载回调,
     * onRefresh:刷新回调,
     * onMove:移动回调,
     * barClassName:滚动条样式类,
     * topTipClassName:拉提示样式类,
     * bottomTipClassName:上拉提示样式类,
     * enableBar:是否使用自定义滚动条(仅当useNativeScroll为false时才有意义),
     * enableFadeout:是否允许自定义滚动条渐隐(仅当enableBar为true时才有意义),
     * useNativeScroll:是否使用浏览器自带滚动,
     * topRefreshTxt:顶部刷新提示语,
     * topRefreshingTxt:顶部刷新中提示语,
     * topRefreshGoTxt:顶部松手提示语,
     * bottomLoadTxt:底部加载提示语,
     * bottomLoadingTxt:底部加载中提示语,
     * bottomNomoreTxt:底部没有了提示语，
     * bottomLoadGoTxt:底部松手提示语,
     * useRefreshIcon:是否使用刷新图标
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
            preScrollerHeight = 0;//记录内容高度
            
            
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
                this.topRefreshTxt = opt.topRefreshTxt||'';
                this.topRefreshingTxt = opt.topRefreshingTxt||'';
                this.topRefreshGoTxt = opt.topRefreshGoTxt||'';
                this.bottomLoadTxt = opt.bottomLoadTxt||'';
                this.bottomLoadingTxt = opt.bottomLoadingTxt||'';
                this.bottomLoadGoTxt = opt.bottomLoadGoTxt||'';
                this.bottomNomoreTxt = opt.bottomNomoreTxt||'';
                this.autoLoad = opt.autoLoad;
                this.useRefreshIcon = opt.useRefreshIcon!=undefined?opt.useRefreshIcon:true;

                this.nomore = false;//内容是否加载完成
                this.topTip = null; //下拉提示
                this.bottomTip = null; //上拉提示
                //创建提示语dom
                this._createTip();
                if(this.useNativeScroll){
                    this.scroller.style.overflow = 'visible';
                    this.wrapper.style.overflow = 'auto';
                }else{
                    this.barHeight = this.wrapper.clientHeight*(this.wrapper.clientHeight/this.wrapper.scrollHeight);
                    this.enableBar && (this.bar=this._createScrollBar()) && (this.bar.style.display = 'none');
                    this.scroller.style.overflow = 'visible';
                    this.wrapper.style.overflow = 'hidden';
                    this.wrapper.style.position = 'relative';
                }
                this.prefixStyle = Util.getPrefixStyle();
                //最小偏移量
                if(this.useNativeScroll || this.useRefreshIcon){
                    this.topOffsetY = 0;
                }else{
                    this.topOffsetY = -this.topTip.clientHeight;
                }
                //设置最大偏移量
                this.maxOffsetY =  this.wrapper.clientHeight - this.wrapper.scrollHeight;
                //当前的偏移量
                this.offsetY = this.topOffsetY;
                //初始化位置
                this._tranlate(this.scroller);
                this._bindEvent(this.scroller, 'touchstart', function(e){
                    self._start(e);
                });
                this._bindEvent(this.scroller, 'touchmove', function(e){
                    self._move(e);
                });
                this._bindEvent(this.scroller, 'touchend', function(e){
                    self._end(e);
                });
                preScrollerHeight = this.wrapper.scrollHeight;
                if(this.maxOffsetY > this.topOffsetY){
                    this.bottomTip.innerHTML = this.bottomLoadingTxt;
                    no = true;
                }
            },
            refresh: function(){
                var self = this;
                if(!this.useNativeScroll){
                    if(this.offsetY > this.topOffsetY){
                        this.offsetY = this.topOffsetY;
                    }else if(this.offsetY <= this.maxOffsetY){
                        this.offsetY = this.maxOffsetY;
                    }
                    //设置最大偏移量
                    this.maxOffsetY =  this.wrapper.clientHeight - this.wrapper.scrollHeight;
                    if(this.bar){
                        this.barHeight = this.wrapper.clientHeight*(this.wrapper.clientHeight/(this.wrapper.scrollHeight+this.bottomTip.clientHeight));
                        this.bar.style.height = this.barHeight+'px';
                    }
                }else{
                    this.offsetY = this.topOffsetY;
                }
                setTimeout(function(){
                    if(!self.useRefreshIcon){
                        self.topTip.innerHTML = self.topRefreshTxt;
                    }else{
                        self.refreshIcon.className = 'rf_rf_circle_w';
                        self._tranlate(self.topTip,500);
                    }
                    self._tranlate(self.scroller,500);
                },500);
                preScrollerHeight = this.wrapper.scrollHeight; 
                if(this.nomore){
                    this.bottomTip.innerHTML = this.bottomNomoreTxt;
                }else{
                    if(this.autoLoad){
                        this.bottomTip.innerHTML = self.bottomLoadingTxt;
                    }else{
                        this.bottomTip.innerHTML = self.bottomLoadTxt;
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
                    this._tranlate(this.scroller,300);
                }
            },
            setTopTip: function(txt){
                if(!this.useRefreshIcon){
                    this.topTip.innerHTML = txt;
                }
            },
            setBottomTip: function(){
                this.bottomTip.innerHTML = txt;
            },
            setNomore: function(nomore){
                this.nomore = nomore;
                if(this.nomore){
                    this.bottomTip.innerHTML = this.bottomNomoreTxt;
                }else if(this.autoLoad){
                    this.bottomTip.innerHTML = self.bottomLoadingTxt;
                }else{
                    this.bottomTip.innerHTML = self.bottomLoadTxt;
                }
            },
            /**
             * [_tranlate 移动函数]
             * @param  {[DOM]} target [目标对象]
             * @param  {[Number]} transitionDuration [过渡时间，为0时不会触发transitionend事件]
             */
            _tranlate: function(target,transitionDuration){
                if((target==this.scroller && this.offsetY>this.topOffsetY && this.useRefreshIcon) || 
                    (target==this.topTip && this.offsetY<this.topOffsetY && this.useRefreshIcon)){
                    return;
                }
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
                target.style[this.prefixStyle.transform] = 'translateY('+this.offsetY+'px) translateZ(0)';

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
                if(!this.useNativeScroll){//浏览器自带滚动
                    e.preventDefault();
                    e.stopPropagation();
                    //上拉或者下拉超出后,降低两次touchmove之间Y的偏移量
                    if(this.offsetY < this.maxOffsetY && this.maxOffsetY<0 && disY < 0){
                        isOutBottom = true;
                        disY *= 0.25;
                        if(!this.autoLoad){//手动加载
                            if(this.nomore){
                                this.bottomTip.innerHTML = this.bottomNomoreTxt;
                            }else if(this.offsetY < this.maxOffsetY - this.bottomTip.clientHeight){
                                this.bottomTip.innerHTML = this.bottomLoadGoTxt;
                            }else if(this.offsetY < this.maxOffsetY){
                                this.bottomTip.innerHTML = this.bottomLoadTxt;
                            }
                        }
                        this.offsetY += disY;
                        this._tranlate(this.scroller);
                    }else if(this.offsetY > this.topOffsetY && disY > 0){
                        isOutTop = true;
                        if(this.useRefreshIcon){
                            disY *= 0.5;
                            this.offsetY += disY;
                            this._rotateIcon();
                            this._tranlate(this.topTip);
                        }else{
                            disY *= 0.25;
                            if(this.offsetY > this.topOffsetY+this.topTip.clientHeight){
                                this.topTip.innerHTML = this.topRefreshGoTxt;
                            }else{
                               
                                this.topTip.innerHTML = this.topRefreshTxt;
                            }
                            this.offsetY += disY;
                            this._tranlate(this.scroller);
                        }
                    }else{
                        this.offsetY += disY;
                        this._tranlate(this.scroller);
                    }
                    //自动加载提示
                    if(this.autoLoad){
                        if(this.nomore){
                            this.bottomTip.innerHTML = this.bottomNomoreTxt;
                        }else if(this.offsetY <= this.maxOffsetY+this.bottomTip.clientHeight && this.maxOffsetY<0){
                            this.bottomTip.innerHTML = this.bottomLoadingTxt;
                        }
                    }
                }else{//自定义滚动
                    if(Math.abs(this.wrapper.scrollTop-Math.abs(this.wrapper.clientHeight-this.wrapper.scrollHeight)) < 2 && this.offsetY+disY < this.topOffsetY){
                        e.preventDefault();
                        e.stopPropagation();
                        isOutBottom = true;
                        disY *= 0.25;
                        this.offsetY += disY;
                        this._tranlate(this.scroller);
                        if(!this.autoLoad){//手动加载
                            if(this.nomore){
                                this.bottomTip.innerHTML = this.bottomNomoreTxt;
                            }else if(this.offsetY < this.topOffsetY - this.bottomTip.clientHeight){
                                this.bottomTip.innerHTML = this.bottomLoadGoTxt;
                            }else if(this.offsetY < this.topOffsetY){
                                this.bottomTip.innerHTML = this.bottomLoadTxt;
                            }
                        }
                    }else if(this.wrapper.scrollTop == 0 && this.offsetY+disY > this.topOffsetY){
                        e.preventDefault();
                        e.stopPropagation();
                        isOutTop = true;
                        if(this.useRefreshIcon){
                            disY *= 0.5;
                            this.offsetY += disY;
                            this._rotateIcon();
                            this._tranlate(this.topTip);
                        }else{
                            disY *= 0.25;
                            if(this.offsetY > this.topOffsetY+this.topTip.clientHeight){
                                this.topTip.innerHTML = this.topRefreshGoTxt;
                            }else{
                               
                                this.topTip.innerHTML = this.topRefreshTxt;
                            }
                            this.offsetY += disY;
                            this._tranlate(this.scroller);
                        }
                    }else{
                        isOutTop = false;
                        isOutBottom = false;
                        this.offsetY = this.topOffsetY;
                    }
                    //自动加载提示
                    if(this.autoLoad){
                        if(this.nomore){
                            this.bottomTip.innerHTML = this.bottomNomoreTxt;
                        }else if(this.wrapper.scrollTop-Math.abs(this.wrapper.clientHeight-this.wrapper.scrollHeight) <= this.bottomTip.clientHeight){
                            this.bottomTip.innerHTML = this.bottomLoadingTxt;
                        }
                    }
                }
                typeof this.onMove === 'function' && this.onMove();
            },
            //触摸结束
            _end: function(e){
                var self = this;
                var preOffsetY = this.offsetY;
                endTime = new Date().getTime();
                var duration = endTime - startTime;
                if(!this.useNativeScroll){
                    //自动加载
                    if(this.autoLoad && !this.nomore){
                        this.bottomTip.innerHTML = this.bottomLoadingTxt;
                        if(this.offsetY <= this.maxOffsetY+this.bottomTip.clientHeight && this.maxOffsetY<0 && typeof this.onLoad === 'function'){
                            this.onLoad();
                        }
                    }
                    if(isOutBottom){
                        this.offsetY = this.maxOffsetY;
                        //手动加载
                        if(!this.nomore && typeof this.onLoad === 'function' && preOffsetY < this.maxOffsetY - this.bottomTip.clientHeight && !this.autoLoad){
                            this.bottomTip.innerHTML = this.bottomLoadingTxt;
                            this.onLoad();
                        }
                        duration = Math.abs(preOffsetY - this.offsetY)/wrapper.clientHeight*1500;
                        this._tranlate(this.scroller,duration);
                    }else if(isOutTop){
                        this.offsetY = this.topOffsetY;
                        if(this.useRefreshIcon){
                            if(typeof this.onRefresh === 'function' && preOffsetY > this.topTip.clientHeight*2){
                                this.refreshIcon.className = 'rf_rf_circle_w rotate_circle';
                                this.offsetY = this.topTip.clientHeight*2;
                                this.onRefresh();
                            }
                            duration = Math.abs(preOffsetY - this.offsetY)/wrapper.clientHeight*1500;
                            this._tranlate(this.topTip,duration);
                        }else{
                            if(typeof this.onRefresh === 'function' && preOffsetY > this.topOffsetY+this.topTip.clientHeight){
                                this.topTip.innerHTML = this.topRefreshingTxt;
                                this.offsetY = this.topOffsetY+this.topTip.clientHeight;
                                this.onRefresh();
                            }
                            duration = Math.abs(preOffsetY - this.offsetY)/wrapper.clientHeight*1500;
                            this._tranlate(this.scroller,duration);
                        }
                    }else{
                        var obj = this._momentum(preY,startY,duration);
                        this.offsetY = obj.destOffsetY;
                        duration = obj.duration;
                        this._tranlate(this.scroller,duration);
                    }
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
                    //自动加载
                    if(this.autoLoad && !this.nomore){
                        this.bottomTip.innerHTML = this.bottomLoadingTxt;
                        if( typeof this.onLoad === 'function' && Math.abs(this.wrapper.scrollTop-Math.abs(this.wrapper.clientHeight-this.wrapper.scrollHeight)) < this.bottomTip.clientHeight){
                            this.onLoad();
                        }
                    }
                    if(isOutBottom){
                        this.offsetY = this.topOffsetY;
                        //手动加载
                        if(!this.nomore && typeof this.onLoad === 'function' && preOffsetY < -this.bottomTip.clientHeight+this.topOffsetY && !this.autoLoad){
                            this.bottomTip.innerHTML = this.bottomLoadingTxt;
                            this.onLoad();
                        }
                        duration = Math.abs(preOffsetY-this.topOffsetY)/wrapper.clientHeight*1500;
                        this._tranlate(this.scroller,duration);
                    }else if(isOutTop){
                        this.offsetY = this.topOffsetY;
                        if(this.useRefreshIcon){
                            if(typeof this.onRefresh === 'function' && preOffsetY > this.topTip.clientHeight*2){
                                this.refreshIcon.className = 'rf_rf_circle_w rotate_circle';
                                this.offsetY = this.topTip.clientHeight*2;
                                this.onRefresh();
                            }
                            duration = Math.abs(preOffsetY - this.offsetY)/wrapper.clientHeight*1500;
                            this._tranlate(this.topTip,duration);
                        }else{
                            if(typeof this.onRefresh === 'function' && preOffsetY > this.topOffsetY+this.topTip.clientHeight){
                                this.topTip.innerHTML = this.topRefreshingTxt;
                                this.offsetY = this.topOffsetY+this.topTip.clientHeight;
                                this.onRefresh();
                            }
                            duration = Math.abs(preOffsetY - this.offsetY)/wrapper.clientHeight*1500;
                            this._tranlate(this.scroller,duration);
                        }
                    }else{
                        this.offsetY = this.topOffsetY;
                        duration = 0;
                    }
                }
                if(this.nomore){
                    this.bottomTip.innerHTML = this.bottomNomoreTxt;
                }
            },
            _rotateIcon: function(){
                if(this.offsetY > this.topOffsetY){
                    var distance = Math.abs(this.offsetY-this.topOffsetY);
                    var deg = distance/this.topTip.clientHeight*180;
                    deg = deg>360?360:deg;
                    if(deg<180){
                        this.leftIconCover.style[this.prefixStyle.transform] = 'rotate(0deg)';
                        this.rightIconCover.style[this.prefixStyle.transformOrigin] = 'left center';
                        this.rightIconCover.style[this.prefixStyle.transform] = 'rotate('+deg+'deg)';
                    }else{
                        this.rightIconCover.style[this.prefixStyle.transformOrigin] = 'left center';
                        this.rightIconCover.style[this.prefixStyle.transform] = 'rotate('+180+'deg)';
                        this.leftIconCover.style[this.prefixStyle.transformOrigin] = 'right center';
                        this.leftIconCover.style[this.prefixStyle.transform] = 'rotate('+(deg-180)+'deg)';
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
            //创建提示语dom元素
            _createTip: function(){
                var topTipCss = 'width:100%;display:block;line-height:60px;height:60px;text-align:center';
                var bottomTipCss = 'width:100%;display:block;line-height:60px;height:60px;text-align:center';
                this.topTip = document.createElement('div');
                this.bottomTip = document.createElement('div');
                this.topTip.innerHTML = this.topRefreshTxt;
                this.topTip.setAttribute('class', 'my_top_tip '+(this.topTipClassName?this.topTipClassName:''));
                this.bottomTip.innerHTML = this.autoLoad?this.bottomLoadingTxt:this.bottomLoadTxt;
                this.bottomTip.setAttribute('class', 'my_bottom_tip '+(this.bottomTipClassName?this.bottomTipClassName:''));
                this.scroller.insertBefore(this.topTip,this.scroller.firstElementChild);
                this.scroller.appendChild(this.bottomTip);
                Util.insertRlue('.my_top_tip',topTipCss);
                Util.insertRlue('.my_bottom_tip',bottomTipCss);
                if(this.useNativeScroll){
                    this.topTip.style.position = 'absolute';
                    this.topTip.style.top = -this.topTip.clientHeight+'px';
                }
                //创建刷新图标
                if(this.useRefreshIcon){
                    var fixedTopTipCss = 'width:60px;position:absolute;top:-60px;left:50%;margin-left:-30px;z-index:99;background:#fff;border-radius:50%;box-shadow:1px 1px 5px rgba(0,0,0,0.1)';
                    Util.insertRlue('.my_top_tip',fixedTopTipCss);
                    this.topTip.style.fontSize = '0px';
                    this.topTip.style.width = '60px';
                    this.topTip.style.position = 'fixed';
                    this.topTip.innerHTML = '<div class="rf_rf_circle_w">\
                                                <div class="rf_cover_left_w"><div class="rf_cover_left"></div></div>\
                                                <div class="rf_cover_right_w"><div class="rf_cover_right"></div></div>\
                                                <div class="rf_circle"></div>\
                                            </div>';

                    var css_rf_rf_circle_w = 'position: relative; width: 40px; height: 40px; border-radius: 50%;display: inline-block; vertical-align: middle';
                    var css_rf_cover_left_w = 'position: absolute; width: 52%; height: 104%; overflow: hidden;left:-2%;top:-2%';
                    var css_rf_cover_right_w = 'position: absolute; width: 53%; height: 104%; overflow: hidden;right:-2%;top:-2%';
                    var css_rf_cover = 'display: block; width: 100%; height: 100%;background: #fff';
                    var css_rf_circle = 'width: 100%; height: 100%; box-sizing:border-box; border-radius: 50%; border: 4px solid red';

                    this.refreshIcon = this.topTip.getElementsByClassName('rf_rf_circle_w')[0];
                    this.leftIconCover = this.topTip.getElementsByClassName('rf_cover_left')[0];
                    this.rightIconCover = this.topTip.getElementsByClassName('rf_cover_right')[0];
                    this.iconCircle = this.topTip.getElementsByClassName('rf_circle')[0];

                    Util.insertRlue('.rf_rf_circle_w',css_rf_rf_circle_w);
                    Util.insertRlue('.rf_cover_left_w',css_rf_cover_left_w);
                    Util.insertRlue('.rf_cover_right_w',css_rf_cover_right_w);
                    Util.insertRlue('.rf_cover_left',css_rf_cover);
                    Util.insertRlue('.rf_cover_right',css_rf_cover);
                    Util.insertRlue('.rf_circle',css_rf_circle);

                    Util.insertRlue('.rotate_circle','animation:ani_rotate_circle 2s infinite;-webkit-animation:ani_rotate_circle 2s infinite');
                    Util.insertRlue('.rotate_circle .rf_cover_left','transform:rotate(60deg) !important;-webkit-transform:rotate(60deg) !important;');
                    Util.insertRlue('.rotate_circle .rf_cover_right','transform:rotate(180deg) !important;-webkit-transform:rotate(180deg) !important;');
                    Util.insertRlue('@keyframes ani_rotate_circle','0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)}');
                    Util.insertRlue('@-webkit-keyframes ani_rotate_circle','0%{-webkit-transform:rotate(0deg)} 100%{-webkit-transform:rotate(360deg)}');
                }
            },
            //事件绑定函数
            _bindEvent: function(target,eventType,callback){
                target.addEventListener(eventType,callback,false);
            },
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
    return Scroll;
})