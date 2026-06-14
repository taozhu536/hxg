/**
 * 一键部署脚本 v3 - 拜拜坏习惯拯救时间
 * 
 * 用法: node deploy.js
 */

const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const APPID = 'wxccc054cbe7251344';
const ENV_ID = 'cloud1-d8gshwhb5dc72723e';
const PROJECT_PATH = __dirname;
const PRIVATE_KEY_PATH = path.join(__dirname, 'private.key');
const FUNCTIONS = ['login', 'habits', 'checkin', 'stats'];

/**
 * 带重试的上传云函数
 * 创建函数后需要等状态变为 Active 才能更新代码
 */
async function uploadWithRetry(project, name, funcPath, maxRetries = 6) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await ci.cloud.uploadFunction({
        project,
        env: ENV_ID,
        name,
        path: funcPath,
        remoteNpmInstall: true,
      });
      console.log(`✅ ${name} 上传成功`);
      return true;
    } catch (err) {
      if (err.message && err.message.includes('Creating状态')) {
        console.log(`  ⏳ ${name} 正在创建中，等待5秒后重试 (${attempt}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (err.code === 'ResourceNotFound.Function') {
        console.log(`  ⏳ ${name} 还没创建好，等待5秒后重试 (${attempt}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`${name} 在创建后超时未能完成部署`);
}

async function main() {
  console.log('🚀 开始部署 拜拜坏习惯拯救时间...\n');

  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('❌ 未找到 private.key 文件！');
    process.exit(1);
  }

  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

  const project = new ci.Project({
    appid: APPID,
    type: 'miniProgram',
    projectPath: PROJECT_PATH,
    privateKey,
    ignores: ['node_modules/**/*'],
  });

  // === 1. 部署云函数 ===
  for (const name of FUNCTIONS) {
    console.log(`📦 处理云函数 ${name}...`);
    const funcPath = path.join(PROJECT_PATH, 'cloudfunctions', name);
    await uploadWithRetry(project, name, funcPath);
  }

  // === 2. 上传小程序体验版 ===
  console.log('\n📱 上传小程序体验版...');
  try {
    await ci.upload({
      project,
      version: '1.0.0',
      desc: '初始版本 - 拜拜坏习惯拯救时间',
      setting: { es6: true, minify: true },
      onProgressUpdate: (task) => {
        if (task.status === 'doing') process.stdout.write('.');
        if (task.status === 'done') process.stdout.write('✓');
      },
    });
    console.log('\n✅ 小程序上传成功（体验版）');
  } catch (err) {
    console.log('\n⚠️  小程序上传失败:', err.message);
    console.log('   可以在微信开发者工具中手动上传');
  }

  console.log('\n🎉 全部部署完成！');
  console.log('📱 打开微信开发者工具按 F5 刷新即可看到效果');
  console.log('📋 最后一步：云开发 → 数据库 → 创建集合 habits 和 checkins');
}

main().catch(err => {
  console.error('\n❌ 部署失败:', err.message);
  process.exit(1);
});
