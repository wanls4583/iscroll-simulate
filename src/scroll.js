/**
 * @Author   Lisong
 * @DateTime 2017-08-29
 */

import css from './style.css';

class Scroll {
    /* opt {
     * wrapper:外部容器DOM,
     * scroller:内容容器DOM,
     * topTip:顶部刷新提示DOM,
     * bottomTip:底部加载提示DOM,
     * onLoad:加载回调,
     * onRefresh:刷新回调,
     * onStart:开始触摸回调,
     * onMove:移动回调,
     * onEnd: 触摸结束,
     * onBottom:滚动到底部回调,
     * barClassName:滚动条样式类,
     * enableBar:是否使用自定义滚动条(仅当useNativeScroll为false时才有意义),
     * enableFadeout:是否允许自定义滚动条渐隐(仅当enableBar为true时才有意义),
     * useNativeScroll:是否使用浏览器自带滚动,
     * autoLoad: 到底部时候是否自动加载
     * }
     */
    constructor(opt) {
        this.startY; //开始的Y坐标
        this.startTime; //触摸开始的时间戳
        this.endTime; //触摸结束的时间戳
        this.preY = 0; //上一次touchmove的Y坐标偏移量
        this.disY; //两次touchmove的间隔Y坐标偏移量
        this.isOutTop = false; //下拉是否超过顶部
        this.isOutBottom = false; //上拉是否超过底部
        this.barFadeTimeoutId = null; //滚动条消失计时器
        this.baunceTimeoutId = null; //回弹计时器
        this.barOpacity = 1; //滚动条初始透明度
        /*滑动过程中是否有向上滑动，某些浏览器默认自带下拉回弹效果，
        如果scroll有向上滑动过，再向下滑动时将无法阻止浏览器默认下拉，
        而浏览器默认下拉将停止触发触摸事件，将引起刷新icon不能回弹的bug
        */
        this.hasSlideUp = false;
        this.allListener = [];
        this._init(opt);
    }
    //初始化
    _init(opt) {
        var self = this;
        var emptyCb = function() {};
        //滚动区域
        this.wrapper = opt.wrapper;
        //滚动的内容
        this.scroller = opt.scroller;
        this.bar = null;
        this.enableFadeout = opt.enableFadeout;
        this.useNativeScroll = opt.useNativeScroll;
        this.enableBar = opt.enableBar;
        this.onStart = opt.onStart || emptyCb;
        this.onMove = opt.onMove || emptyCb;
        this.onBottom = opt.onBottom || emptyCb;
        this.onEnd = opt.onEnd || emptyCb;
        this.onLoad = opt.onLoad || emptyCb;
        this.onRefresh = opt.onRefresh || emptyCb;
        this.autoLoad = opt.autoLoad;
        this.topTip = opt.topTip;
        this.bottomTip = opt.bottomTip;
        this.nomore = false;
        this.topTipHeight = 0;
        this.bottomTipHeight = 0;
        this.barClassName = 'bar';
        if (this.topTip) {
            this.topTip.style.display = 'block';
            this.topTipHeight = this.topTip.clientHeight;
        }
        if (this.bottomTip) {
            this.bottomTip.style.display = 'block';
            this.bottomTipHeight = this.bottomTip.clientHeight;
        }
        if (this.useNativeScroll) {
            this.wrapper.style.overflow = 'auto';
            this.wrapper.style.webkitOverflowScrolling = 'touch';
            this.scroller.style.marginBottom = '-' + this.topTipHeight + 'px';
        } else {
            this.barHeight = this.wrapper.clientHeight * (this.wrapper.clientHeight / this.wrapper.scrollHeight);
            this.enableBar && (this.bar = this._createScrollBar()) && (this.bar.style.display = 'none');
            this.scroller.style.overflow = 'visible';
            this.wrapper.style.overflow = 'hidden';
            this.wrapper.style.position = 'relative';
        }
        //最小偏移量
        this.minOffsetY = -this.topTipHeight;
        //设置最大偏移量
        this.maxOffsetY = this.wrapper.clientHeight - this.scroller.clientHeight;
        //当前的偏移量
        this.offsetY = this.minOffsetY;
        //初始化位置
        this._tranlate(this.scroller);
        this._bindEvent(this.wrapper, 'touchstart', function(e) {
            self._start(e);
        });
        this._bindEvent(this.wrapper, 'touchmove', function(e) {
            self._move(e);
        });
        this._bindEvent(this.wrapper, 'touchend', function(e) {
            self._end(e);
        });
        this._bindEvent(window, 'resize', function(e) {
            self.refresh();
        });
        this._bindEvent(this.wrapper, 'scroll', function(e) {
            //自动加载
            if (self.useNativeScroll) {
                if (Math.abs(self.wrapper.scrollTop - Math.abs(self.wrapper.clientHeight - self.wrapper.scrollHeight)) <= self.bottomTipHeight) {
                    self.onBottom();
                    if (self.autoLoad && !self.nomore) {
                        self.onLoad();
                    }
                }
            }
        });
    }
    //刷新容器
    refresh() {
        var self = this;
        if (!this.useNativeScroll) {
            if (this.offsetY >= this.minOffsetY) {
                this.offsetY = this.minOffsetY;
            } else if (this.offsetY <= this.maxOffsetY) {
                this.offsetY = this.maxOffsetY;
            }
            //设置最大偏移量
            this.maxOffsetY = this.wrapper.clientHeight - this.scroller.clientHeight;
            if (this.bar) {
                this.barHeight = this.wrapper.clientHeight * (this.wrapper.clientHeight / (this.wrapper.scrollHeight + this.bottomTipHeight));
                this.bar.style.height = this.barHeight + 'px';
            }
        } else {
            this.offsetY = this.minOffsetY;
        }
        this._tranlate(self.scroller, 500);
    }
    //设置偏移量
    setOffsetY(offsetY) {
        this.offsetY = offsetY;
    }
    scrollTop(offsetY) {
        if (!this.useNativeScroll) {
            //设置偏移量
            this.offsetY = offsetY;
            this._tranlate(this.scroller, 300);
        }
    }
    //加载是否完成
    setNomore(nomore) {
        this.nomore = nomore;
    }
    //销毁
    destroy() {
        this._removeAllEvent();
    }
    /**
     * [_tranlate 移动函数]
     * @param  {DOM} target [目标对象]
     * @param  {Number} transitionDuration [过渡时间，为0时不会触发transitionend事件]
     */
    _tranlate(target, transitionDuration, _offsetY) {
        var offsetY = _offsetY != undefined ? _offsetY : this.offsetY;
        if (!transitionDuration)
            transitionDuration = 0;
        if (transitionDuration) {
            target.style['transitionProperty'] = 'transform';
        } else {
            target.style['transitionProperty'] = 'none';
        }
        target.style['transformOrigin'] = '0px 0px 0px';
        target.style['transitionTimingFunction'] = 'cubic-bezier(0.33, 0.66, 0.66, 1)';
        target.style['transitionDuration'] = transitionDuration + 'ms';
        //translateZ(0)用来启动硬件加速
        target.style['transform'] = 'translateY(' + offsetY + 'px) translateZ(0)';

        if (this.bar && target == this.scroller) {
            var offsetY = 0;
            if (this.offsetY < this.minOffsetY && this.offsetY > this.maxOffsetY) {
                offsetY = (this.offsetY - this.minOffsetY) / this.maxOffsetY * (this.wrapper.clientHeight - this.barHeight);
            } else if (this.offsetY <= this.maxOffsetY) {
                offsetY = this.wrapper.clientHeight - this.barHeight;
            }

            this.bar.style['transformOrigin'] = '0px 0px 0px';
            this.bar.style['transitionTimingFunction'] = 'cubic-bezier(0.33, 0.66, 0.66, 1)';
            this.bar.style['transitionDuration'] = transitionDuration + 'ms';
            this.bar.style['transform'] = 'translateY(' + offsetY + 'px) translateZ(0)';
        }
    }
    /**
     * [_momentum 计算惯性滚动的终点偏移量和惯性滚动的时长]
     * @param  {Number} currentY     [当前的Y坐标]
     * @param  {Number} startY       [触摸开始的Y坐标]
     * @param  {Number} time         [触摸时长]
     * @param  {Number} deceleration [加速度]
     * @return {Object}              [{destOffsetY:终点偏移量，duration:滚动时长}]
     */
    _momentum(currentY, startY, time, deceleration) {
        var distance = currentY - startY,
            speed = Math.abs(distance) / time,
            destOffsetY,
            inertia,
            duration;

        deceleration = deceleration ? deceleration : 0.0006;
        //物理公式计算惯性滚动距离
        inertia = (speed * speed) / (2 * deceleration) * (distance < 0 ? -1 : 1);
        //惯性滚动终点偏移量
        destOffsetY = this.offsetY + inertia;
        //惯性滚动时长，速度/加速度
        duration = speed / deceleration;
        //如果惯性终点偏移量会超过顶部或者底部，需要减少时长，以免超出
        if (destOffsetY < this.maxOffsetY && this.maxOffsetY < this.minOffsetY) {
            destOffsetY = this.maxOffsetY;
            distance = Math.abs(this.offsetY - destOffsetY);
            duration = distance / speed;
        } else if (destOffsetY > this.minOffsetY) {
            destOffsetY = this.minOffsetY;
            distance = Math.abs(this.offsetY - destOffsetY);
            duration = distance / speed;
        } else if (this.maxOffsetY > this.minOffsetY && destOffsetY < this.minOffsetY) { //如果容器大于内容的高度
            destOffsetY = this.minOffsetY;
        }

        return {
            destOffsetY: Math.round(destOffsetY),
            duration: duration
        }
    }
    //触摸开始
    _start(e) {
        //获取transition过渡未结束的transform值
        var style = window.getComputedStyle ? window.getComputedStyle(this.scroller, null) : null || this.scroller.currentStyle;
        var matrix = style['transform'];
        if (matrix.indexOf('matrix') > -1) {
            if (this.bar) {
                //强制刷新
                window.getComputedStyle ? window.getComputedStyle(this.bar, null) : null || this.scroller.currentStyle;
            }
            this.offsetY = Number(matrix.replace(/matrix\(|\)/g, '').split(',')[5]);
            this._tranlate(this.scroller);
        }
        if (!this.useNativeScroll) {
            if (this.enableFadeout) {
                this.bar.style['transitionDuration'] = '0ms';
                window.getComputedStyle ? window.getComputedStyle(this.bar, null) : null || this.scroller.currentStyle;
                this.bar.style.opacity = this.barOpacity;
                this.bar.style.display = 'block';
            }
            this.startTime = new Date().getTime();
            this.preY = this.startY = e.touches[0].pageY;
            clearTimeout(this.barFadeTimeoutId);
        } else {
            clearTimeout(this.baunceTimeoutId);
            this.preY = this.startY = e.touches[0].pageY;
        }
        if (this.wrapper.scrollTop == 0) {
            this.hasSlideUp = false;
        }
        this.onStart(this.offsetY);
    }
    //触摸移动
    _move(e) {
        this.disY = e.touches[0].pageY - this.preY;
        this.preY = e.touches[0].pageY;
        var nowTime = new Date().getTime(),
            status = -1;
        //超过300ms，重置startTime，用于回弹和惯性滚动计算开始时间
        if (nowTime - this.startTime > 300) {
            this.startTime = nowTime;
            this.startY = e.touches[0].pageY;
        }
        //300ms以上的时间只滑动了10像素，则不移动
        if (this.disY < 10 && nowTime - this.startTime > 300)
            return;
        if (!this.useNativeScroll) { //自定义滚动
            e.preventDefault();
            e.stopPropagation();
            //上拉或者下拉超出后,降低两次touchmove之间Y的偏移量
            if (this.offsetY < this.maxOffsetY && this.maxOffsetY < 0) {
                this.isOutBottom = true;
                this.isOutTop = false;
                this.disY *= 0.25;
                this.offsetY += this.disY;
                this._tranlate(this.scroller);
                status = Scroll.OUT_BOTTOM;
                if (!this.nomore && this.offsetY < this.maxOffsetY - this.bottomTipHeight*0.5 && !this.autoLoad) {
                    status = Scroll.LOAD_ABLE;
                }
            } else if (this.offsetY > this.minOffsetY) {
                this.isOutTop = true;
                this.isOutBottom = false;
                this.disY *= 0.25;
                this.offsetY += this.disY;
                this._tranlate(this.scroller);
                status = Scroll.OUT_TOP;
                if (this.offsetY >= this.minOffsetY + this.topTipHeight) {
                    status = Scroll.REFRESH_ABLE;
                }
            } else {
                this.isOutTop = false;
                this.isOutBottom = false;
                this.offsetY += this.disY;
                this._tranlate(this.scroller);
            }
        } else { //浏览器自带滚动
            this.disY < 0 && (this.hasSlideUp = true);
            if (Math.abs(this.wrapper.scrollTop - Math.abs(this.wrapper.clientHeight - this.wrapper.scrollHeight)) < 2 && this.offsetY + this.disY < this.minOffsetY) {
                e.preventDefault();
                e.stopPropagation();
                this.isOutBottom = true;
                this.isOutTop = false;
                this.disY *= 0.25;
                this.offsetY += this.disY;
                this._tranlate(this.scroller);
                status = Scroll.OUT_BOTTOM;
                if (!this.nomore && this.offsetY < -this.bottomTipHeight*0.5 + this.minOffsetY && !this.autoLoad) {
                     status = Scroll.LOAD_ABLE;
                }
            } else if (this.wrapper.scrollTop == 0 && this.offsetY + this.disY > this.minOffsetY && (this.offsetY > this.minOffsetY || !this.hasSlideUp)) {
                e.preventDefault();
                e.stopPropagation();
                this.isOutTop = true;
                this.isOutBottom = false;
                this.disY *= 0.25;
                this.offsetY += this.disY;
                this._tranlate(this.scroller);
                status = Scroll.OUT_TOP;
                if (this.offsetY > this.minOffsetY + this.topTipHeight) {
                    status = Scroll.REFRESH_ABLE;
                }
            } else if (Math.abs(this.offsetY - this.minOffsetY) > 5) {
                e.preventDefault();
                e.stopPropagation();
                this.isOutTop = false;
                this.isOutBottom = false;
                this.offsetY = this.disY;
                this._tranlate(this.scroller);
            }
        }

        this.onMove(this.offsetY, status);
    }
    //触摸结束
    _end(e) {
        var self = this;
        var preOffsetY = this.offsetY;
        this.endTime = new Date().getTime();
        var duration = this.endTime - this.startTime;
        if (!this.useNativeScroll) { //translate滚动结束
            if (this.isOutBottom) {
                this.offsetY = this.maxOffsetY;
                //手动加载
                if (!this.nomore && preOffsetY < this.maxOffsetY - this.bottomTipHeight*0.5 && !this.autoLoad) {
                    this.onLoad();
                }
                duration = Math.abs(preOffsetY - this.offsetY) / this.wrapper.clientHeight * 1500;
                this._tranlate(this.scroller, duration);
                this.onBottom();
            } else if (this.isOutTop) {
                if (preOffsetY >= this.minOffsetY + this.topTipHeight) {
                    this.offsetY = this.minOffsetY + this.topTipHeight;
                    this._tranlate(this.scroller, 300);
                    this.onRefresh();
                } else {
                    this.offsetY = this.minOffsetY;
                    duration = Math.abs(preOffsetY - this.offsetY) / this.wrapper.clientHeight * 1500;
                    this._tranlate(this.scroller, duration);
                }
            } else {
                var obj = this._momentum(this.preY, this.startY, duration);
                this.offsetY = obj.destOffsetY;
                duration = obj.duration;
                this._tranlate(this.scroller, duration);
            }
            //自动加载
            if (this.autoLoad && !this.nomore) {
                if (this.offsetY <= this.maxOffsetY && this.maxOffsetY < 0) {
                    this.onLoad();
                }
            }
            clearTimeout(this.barFadeTimeoutId);
            //滚动条渐隐timer
            this.barFadeTimeoutId = setTimeout(function() {
                if (self.enableFadeout && self.bar.style.display != 'none') {
                    self.bar.style['transitionDuration'] = '1000ms';
                    window.getComputedStyle ? window.getComputedStyle(self.bar, null) : null || self.scroller.currentStyle;
                    self.bar.style.opacity = '0';
                }
            }, duration + 500);
        } else { //原生scroll滚动结束
            if (this.isOutBottom) {
                this.offsetY = this.minOffsetY;
                //手动加载
                if (!this.nomore && preOffsetY < -this.bottomTipHeight*0.5 + this.minOffsetY && !this.autoLoad) {
                    this.onLoad();
                }
                duration = Math.abs(preOffsetY - this.minOffsetY) / this.wrapper.clientHeight * 1500;
                this._tranlate(this.scroller, duration);
            } else if (this.isOutTop) {
                if (preOffsetY > this.minOffsetY + this.topTipHeight) {
                    this.offsetY = this.minOffsetY + this.topTipHeight;
                    this._tranlate(this.scroller, 300);
                    this.onRefresh();
                } else {
                    this.offsetY = this.minOffsetY;
                    duration = Math.abs(preOffsetY - this.offsetY) / this.wrapper.clientHeight * 1500;
                    this._tranlate(this.scroller, duration);
                }

            } else {
                this.offsetY = this.minOffsetY;
                this._tranlate(this.scroller, 0);
            }
        }
        this.onEnd(this.offsetY);
    }
    //创建滚动条
    _createScrollBar() {
        if (this.maxOffsetY >= 0)
            return false;
        var style = null;
        var div = document.createElement('div');
        div.setAttribute('style', 'position:absolute;top:0;right:0;height:' + this.barHeight + 'px');
        div.setAttribute('class', this.barClassName ? this.barClassName : '');
        this.wrapper.appendChild(div);
        style = window.getComputedStyle ? window.getComputedStyle(div, null) : null || this.scroller.currentStyle;
        this.barOpacity = style.opacity;
        return div;
    }
    //事件绑定函数
    _bindEvent(ele, event_name, func) {
        if (window.attachEvent) {
            ele.attachEvent('on' + event_name, func);
        } else {
            ele.addEventListener(event_name, func, false); //默认事件是冒泡
        }
        this.allListener[this.allListener.length] = {
            ele: ele,
            func: func,
            event: event_name
        }
    }
    _removeEvent(ele, event_name, func) {
        if (window.attachEvent) {
            ele.detachEvent('on' + event_name, func);
        } else {
            ele.removeEventListener(event_name, func, false);
        }
    }
    _removeAllEvent() {
        for (var i = 0; i < this.allListener.length; i++) {
            var listener = this.allListener[i];
            this._removeEvent(listener.ele, listener.event, listener.func);
        }
    }
}
Scroll.OUT_TOP = 1; //下拉超过顶部
Scroll.OUT_BOTTOM = 2; //上滑超过底部
Scroll.REFRESH_ABLE = 3; //可刷新
Scroll.LOAD_ABLE = 4; //可加载

export default Scroll;