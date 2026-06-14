// 初始化脚本：创建云数据库集合
// 在微信开发者工具中运行：右键此文件 → 在终端中打开 → node init-db.js
// 或者直接在微信开发者工具的"云开发"控制台中创建集合

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function main() {
  console.log('🚀 开始创建数据库集合...\n')

  const collections = ['users', 'habits', 'checkins', 'friends']
  
  for (const name of collections) {
    try {
      // 尝试创建集合
      await db.createCollection(name)
      console.log(`✅ 集合 ${name} 创建成功`)
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        console.log(`ℹ️  集合 ${name} 已存在，跳过`)
      } else {
        console.log(`❌ 集合 ${name} 创建失败:`, err.message)
      }
    }
  }

  console.log('\n🎉 初始化完成！')
}

main()
