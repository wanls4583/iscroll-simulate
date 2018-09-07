# light-scroller

> 一个使用原生 JavaScript 实现的移动端上拉下滑组件

## 内容

- [**`功能特性`**](#功能特性)
- [**`安装`**](#安装)
- [**`使用`**](#使用)
- [**`案例`**](#案例)
- [**`config`**](#config)   
- [**`贡献`**](#贡献)


## 功能特性
* [x] 使用原生 JavaScript
* [x] 支持原生 scroll 滚动和 css3-translate 滚动
* [x] 持续维护迭代

## 安装

```bash
npm install light-scroller --save
```

OR

```html
<script src="./dist/scroll.min.js"></script>
<script>
	scroll = new Scroll({
	    wrapper: document.querySelector('#wrapper'),
	    scroller: document.querySelector('#content')
	})
</script>

```

## 使用

### 开发

```bash
npm run dev
```

### 编译案例

```bash
npm run build:example
```

### 编译生产环境

```bash
npm run build:prod
```

## 案例

请查看[**`example`**](https://github.com/wanls4583/light-scroller/tree/master/src/example)

[**`oline demo`**](https://blog.lisong.hn.cn/code/example/light-scroller/index.html)

## config

|option|description|default|val|
|:---|---|---|---|
|`wrapper`|外部容器[必选]|`null`|`DOM`|
|`scroller`|滚动区域容器[必选]|`null`|`DOM`|
|`topTip`|刷新提示容器[可选]|`null`|`DOM`|
|`bottomTip`|加载提示容器[可选]|`null`|`DOM`|
|`autoLoad`|到底部时是否自动加载[可选]|`false`|`Boolean`|
|`useNativeScroll`|是否使用浏览器自带滚动[可选]|`false`|`Boolean`|
|`enableBar`|是否使用自定义滚动条(仅当useNativeScroll为false时才有意义)[可选]|`false`|`Boolean`|
|`enableFadeout`|是否允许自定义滚动条渐隐(仅当enableBar为true时才有意义)|`false`|`Boolean`|
|`onRefresh`|刷新回调[可选]|`function(){}`|`Function`|
|`onLoad`|加载回调[可选]|`function(){}`|`Function`|
|`onStart`|开始触摸回调[可选]|`function(){}`|`Function`|
|`onMove`|滑动回调[可选]|`function(){}`|`Function`|
|`onEnd`|触摸结束回调[可选]|`function(){}`|`Function`|
|`onBottom`|滚动到底部回调[可选]|`function(){}`|`Function`|

## 贡献 

欢迎给出一些意见和优化，期待你的 `Pull Request`