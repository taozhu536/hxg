// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * habits 云函数
 * 动作:
 *   create  - 创建新习惯
 *   list    - 获取用户的习惯列表 (active=true/false 默认true)
 *   update  - 更新习惯（名称、描述等）
 *   delete  - 删除习惯（软删除）
 *   get     - 获取单个习惯详情
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, ...data } = event

  try {
    switch (action) {
      case 'create':
        return await createHabit(openid, data)
      case 'list':
        return await listHabits(openid, data)
      case 'update':
        return await updateHabit(openid, data)
      case 'delete':
        return await deleteHabit(openid, data)
      case 'get':
        return await getHabit(openid, data)
      default:
        return { code: -1, msg: '未知动作' }
    }
  } catch (err) {
    console.error(err)
    return { code: -1, msg: err.message }
  }
}

// 创建习惯
async function createHabit(openid, data) {
  const { name, description, icon, category, target, reminderTime } = data
  
  if (!name) return { code: -1, msg: '习惯名称不能为空' }
  
  const habit = {
    openid,
    name,
    description: description || '',
    icon: icon || '🔥',
    category: category || 'other',
    target: target || '',
    reminderTime: reminderTime || null,
    isActive: true,
    streak: 0,        // 当前连胜
    maxStreak: 0,     // 最长连胜
    totalDays: 0,     // 总打卡天数
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }
  
  const res = await db.collection('habits').add({ data: habit })
  return { code: 0, msg: '创建成功', data: { _id: res._id, ...habit } }
}

// 获取习惯列表
async function listHabits(openid, data) {
  const { active = true } = data
  const res = await db.collection('habits')
    .where({
      openid,
      isActive: active
    })
    .orderBy('createdAt', 'desc')
    .get()
  
  return { code: 0, data: res.data }
}

// 更新习惯
async function updateHabit(openid, data) {
  const { _id, ...updateData } = data
  if (!_id) return { code: -1, msg: '缺少习惯ID' }
  
  const res = await db.collection('habits')
    .doc(_id)
    .update({
      data: {
        ...updateData,
        updatedAt: db.serverDate()
      }
    })
  
  return { code: 0, msg: '更新成功', data: res }
}

// 删除习惯（软删除）
async function deleteHabit(openid, data) {
  const { _id } = data
  if (!_id) return { code: -1, msg: '缺少习惯ID' }
  
  const res = await db.collection('habits')
    .doc(_id)
    .update({
      data: { isActive: false, updatedAt: db.serverDate() }
    })
  
  return { code: 0, msg: '删除成功', data: res }
}

// 获取单个习惯
async function getHabit(openid, data) {
  const { _id } = data
  if (!_id) return { code: -1, msg: '缺少习惯ID' }
  
  const res = await db.collection('habits').doc(_id).get()
  return { code: 0, data: res.data }
}
