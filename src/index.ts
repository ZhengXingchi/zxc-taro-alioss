// import Server from './Server'
// import { createMockMiddleware } from './utils'
import  * as OSS from 'ali-oss';
import  * as path from 'path';
import  * as fs from 'fs';
import  * as os from 'os';


const defaultOptions = {
  ossConfig: {
    region: '',
    bucket: '',
    secure: true,
  },
  configName: '.alioss',
  enabled: true, // 是否开启CDN上传
  cdnPrefix: '', // CDN前缀
  uploadPath: '', // 文件上传路径
  exclude: /.DS_Store/, // 排除文件
  ignoreHtml: false, // 不上传html
};

/**
 * 文件数量
 */
let count:number=0

/**
 * OSS配置
 */
export interface OssConfig {
  region: string /** 区域 */;
  bucket: string /** 桶名 */;
  secure: boolean;
}

/**
 * 插件配置
 */
export interface PluginOptions {
  ossConfig: OssConfig;
  configName?: string /** 配置文件名称 */;
  enabled: boolean; // 是否开启CDN上传
  cdnPrefix?: string; // CDN前缀
  uploadPath: string; // 文件上传路径
  exclude?: RegExp; // 排除文件
  ignoreHtml: boolean; // 不上传html
}

/**
 * 上传的文件集合
 */
const uploadFiles: any = [];

/**
 * 上传的oss文件集合
 */
const ossFiles: any = [];

/**
 * 判断是否是windows
 */
function isWindows() {
  const sysType = os.type();
  return sysType === 'Windows_NT';
}

/**
 * 换行
 */
function line() {
  return isWindows() ? '\r\n' : '\n';
}

/**
 *加载配置文件
 * @param {*} path 文件路径
 */
function loadConfig(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const temp = content.split(line()).map((text: string) => {
      const payload = text.split('=');
      return {
        [payload[0]]: payload[1],
      };
    });
    let result = {};
    temp.forEach((tmp: any) => {
      result = {
        ...result,
        ...tmp,
      };
    });
    return result;
  } catch (err) {
    console.log(`${filePath}不是一个正确的路径或文件`);
    return false;
  }
}


/**
 * 过滤文件
 */
function filterFile(filePath: string, options: PluginOptions) {
  let { exclude } = options;
  const { ignoreHtml } = options;

  if (ignoreHtml) {
    exclude = /\/*.html/;
  }

  if (exclude && exclude.test(filePath)) {
    return false;
  }

  return true;
}

/**
 * 将html放到末尾
 *
 */
function tailhtml() {
  if (uploadFiles.length == 0) {
      return;
  }
  else {
      let len = uploadFiles.length;
      for (let i = 0; i < len; i++) {
          if (/\/*.html/.test(uploadFiles[i])) {
             console.log(`将文件${uploadFiles[i]}移动到最后进行上传`);
              uploadFiles.push(uploadFiles.splice(i, 1)[0]);
              len--;
              i--;
            
          }
      }
  }
}

/**
 * 读取所有文件
 * @param {*} fPath 构建完成之后的文件夹
 */
function readDirSync(fPath: string, option: PluginOptions) {
  const allFiles = fs.readdirSync(fPath);
  allFiles.forEach((item: any) => {
    const filePath = `${fPath}/${item}`;
    const info = fs.statSync(filePath);
    if (info.isDirectory()) {
      readDirSync(filePath, option);
    } else if (filterFile(filePath, option)) {
      uploadFiles.push(filePath);
    }
  });
}


  

/**
 *删除多余的文件
 *
 */
async function delDir(ossConfig: OssConfig, options: PluginOptions, pre:string='') {
  // 实例化oss客户端
  const ossClient = new OSS(ossConfig);
  const { uploadPath } = options;
  let prefix = pre || uploadPath.slice(1) + '/'
  const result = await ossClient.list({
      prefix,
      delimiter: '/'
  });
  
  if (result.prefixes && result.prefixes.length > 0) {
      for (let h = 0; h < result.prefixes.length; h++) {
          // console.log('SubDir: %s', result.prefixes[h]);
          await delDir(ossConfig, options, result.prefixes[h])
      }
  }

  if (result.objects && result.objects.length > 0) {
      for (let k = 0; k < result.objects.length; k++) {
          let item = result.objects[k]
          // console.log('Object:', item.name, typeof item.name);
          try {
              
              if (!ossFiles.includes('/' + item.name)) {
                console.log(`${item.name}为以前版本文件，故删除`)
                  await ossClient.delete(item.name);
              }
              //    console.log(result)
          } catch (e) {
              console.log(e);
          }
      }
  }
}


/**
 *获取uploadPath下面的所有文件数量
 *
 */
async function countFile(ossConfig, options, pre = '') {
  // 实例化oss客户端
  const ossClient = new OSS(ossConfig);
  const { uploadPath } = options;
  let prefix = pre || uploadPath.slice(1) + '/';
  const result = await ossClient.list({
      prefix,
      delimiter: '/'
  });
  if (result.prefixes && result.prefixes.length > 0) {
      for (let h = 0; h < result.prefixes.length; h++) {
          // console.log('SubDir: %s', result.prefixes[h]);
          await countFile(ossConfig, options, result.prefixes[h]);
      }
  }
  if (result.objects && result.objects.length > 0) {
      for (let k = 0; k < result.objects.length; k++) {
          // console.log('Object:', item.name, typeof item.name);
          count++;
        
          
         
      }
  }
}


/**
 * 上传文件
 * @param {*} fils 要上传的列表
 */
async function uploadFile(fils: any, ossConfig: OssConfig, options: PluginOptions,outputPath:string) {
  // 实例化oss客户端
  const ossClient = new OSS(ossConfig);
  const globalStartTime = Date.now();
  const { uploadPath, cdnPrefix } = options;
 
  
  for (const file of fils) {
    const result = await ossClient.put(`${file}`.replace(outputPath, uploadPath), file);
    ossFiles.push(`${file}`.replace(outputPath, uploadPath))
    const { name, url } = result;
    if (cdnPrefix) {
      console.log(`上传成功 => ${cdnPrefix}${name}`);
    } else {
      console.log(`上传成功 => ${url}`);
    }
  }
  return new Promise((resolve) => resolve(Date.now() - globalStartTime));
}


export default (ctx, pluginOpts) => {
  // ctx.addPluginOptsSchema(joi => {
  //   return joi.object().keys({
  //     mocks: joi.object().pattern(
  //       joi.string(), joi.object()
  //     ),
  //     port: joi.number(),
  //     host: joi.string()
  //   })
  // })
  // let isFirstWatch = true
  const options = { ...defaultOptions, ...pluginOpts};
  let ossSecret: any 
  const { ossConfig, uploadPath, configName } = options;
  ctx.onBuildStart(() => {
    console.log('编译开始！')
    // const aliossConfigPath = path.join(`${os.homedir()}/${configName}`);
    // const aliossConfigPath = path.resolve(__dirname , "../../../" , configName);
    const aliossConfigPath = path.resolve( ctx.paths.appPath, configName);
    console.log(`😊 当前配置文件路径${aliossConfigPath}`);
    ossSecret= loadConfig(aliossConfigPath);
    if (!ossSecret) {
      console.log(`🍉 请正确配置${configName}文件\n`);
      return process.exit(-1);
    }
    if (!ossSecret.accessKeyId) {
      console.log('🍉 请正确配置accessKeyId\n');
      return process.exit(-1);
    }
    if (!ossSecret.accessKeySecret) {
      console.log('🍉 请正确配置accessKeySecret\n');
      return process.exit(-1);
    }
    if (!uploadPath) {
      console.log('🍉 请正确配置的uploadPath\n');
      return process.exit(-1);
    }
  })
  ctx.onBuildFinish(async () => {
  
    const newOssConfig = { ...ossConfig, ...ossSecret };
    console.log('🤗 应用构建完成 准备上传至OSS\n');
    readDirSync(ctx.paths.outputPath, options);
    tailhtml();
    console.log(`⏰ 待上传文件总数：${uploadFiles.length}\n`);
    if (uploadFiles.length === 0) {
      return console.log('🍉 没有需要上传的文件\n');
    }
    (async function () {
      try {
        const res: any = await uploadFile(uploadFiles, newOssConfig, options,ctx.paths.outputPath);
        console.log(`🎉 上传文件耗时： ${res / 1000}s\n`);
        console.log(`🎉 已上传文件数： ${uploadFiles.length}\n`);
        await delDir(newOssConfig,options)
        await countFile(newOssConfig, options)
        console.log(`https://${options.ossConfig.bucket}.${options.ossConfig.region}.aliyuncs.com/${options.uploadPath}下面共有文件${count}个`)
      } catch (e) {
        return console.log(`${e}\n`);
      }
    })();
  
  })
}
