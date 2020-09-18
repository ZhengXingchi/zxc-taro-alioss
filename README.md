# zxc-taro-alioss

> Taro 自动上传alioss插件

## 安装

在 Taro 项目根目录下安装

```bash
$ yarn add zxc-taro-alioss --save
```

## 使用

### 引入插件

请确保 Taro CLI 已升级至 Taro 2/3 的最新版本。

修改项目 `config/index.js` 中的 plugins 配置为如下

```js
const config = {
  ...
  plugins: [
    ...其余插件

    [zxc-taro-alioss,{

    }]
  ]
  ...
}
```

这样在 `taro build` 编译完后就会自动上传alioss。


## 参考
1. 阿里云的使用参考了阿里官方文档
[对象存储 OSS ](https://help.aliyun.com/product/31815.html)



2. 将数组中指定元素移动到数组末端
```
//ES6箭头函数写法
const moveZero = (arr) => {
  let y = 0;//定义y用于控制循环结束
  for (let i = 0; y < arr.length; y++) {
    if (arr[i] === 0) arr.push(arr.splice(i, 1)[0]);//循环到是0的位置就删除该元素0并且在arr末尾push进这个元素0，由于splice删除了该位置元素，所以i不用+1，下次循环仍然检查i位置的元素
    else i++;//循环到不是0的位置就继续往后循环
  }
  return arr;//返回操作后的原数组
};
 
//运行如下：
moveZero([2,0,0,1,0,3]);//[2,1,3,0,0,0]
```

## 以后新增功能
node中输入用户选择来自定义编译效果