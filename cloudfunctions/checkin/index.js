// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * checkin 云函数
 * 动作:
 *   do      - 执行打卡（支持补卡）
 *   today   - 获取今日打卡状态列表
 *   history - 获取打卡历史（按月份）
 *   streak  - 获取连续打卡统计
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, ...data } = event

  try {
    switch (action) {
      case 'do':
        return await doCheckin(openid, data)
      case 'today':
        return await getTodayCheckins(openid)
      case 'history':
        return await getCheckinHistory(openid, data)
      case 'streak':
        return await getStreakInfo(openid, data)
      case 'undo':
        return await undoCheckin(openid, data)
      default:
        return { code: -1, msg: '未知动作' }
    }
  } catch (err) {
    console.error(err)
    return { code: -1, msg: err.message }
  }
}

// 执行打卡
async function doCheckin(openid, data) {
  const { habitId, date, note } = data
  if (!habitId) return { code: -1, msg: '缺少习惯ID' }
  
  // 日期：如果没有传，用当前服务器日期
  const checkDate = date || getDateStr()
  
  // 检查是否已经打过卡
  const existing = await db.collection('checkins')
    .where({
      habitId,
      date: checkDate
    })
    .get()
  
  if (existing.data.length > 0) {
    return { code: -1, msg: '今天已经打过了，不能重复打卡' }
  }
  
  // 写入打卡记录
  await db.collection('checkins').add({
    data: {
      openid,
      habitId,
      date: checkDate,
      note: note || '',
      createdAt: db.serverDate()
    }
  })
  
  // 更新习惯统计
  await updateHabitStats(openid, habitId, checkDate)
  
  return { code: 0, msg: '打卡成功！继续坚持 💪' }
}

// 取消打卡
async function undoCheckin(openid, data) {
  const { habitId, date } = data
  if (!habitId && !date) return { code: -1, msg: '参数不足' }
  
  const checkDate = date || getDateStr()
  
  // 删除打卡记录
  await db.collection('checkins')
    .where({
      habitId,
      date: checkDate
    })
    .remove()
  
  return { code: 0, msg: '已取消打卡' }
}

// 获取今日打卡状态（所有习惯的今日打卡情况）
async function getTodayCheckins(openid) {
  const today = getDateStr()
  
  // 获取用户的所有活跃习惯
  const habitsRes = await db.collection('habits')
    .where({ openid, isActive: true })
    .get()
  
  // 获取今日打卡记录
  const checkinsRes = await db.collection('checkins')
    .where({
      openid,
      date: today
    })
    .get()
  
  const checkedHabitIds = checkinsRes.data.map(c => c.habitId)
  
  const result = habitsRes.data.map(h => ({
    ...h,
    isCheckedToday: checkedHabitIds.includes(h._id)
  }))
  
  return { code: 0, data: result }
}

// 获取打卡历史（按月）
async function getCheckinHistory(openid, data) {
  const { habitId, year, month } = data
  if (!habitId) return { code: -1, msg: '缺少习惯ID' }
  
  const y = year || new Date().getFullYear()
  const m = month ? String(month).padStart(2, '0') : '' 
  const prefix = `${y}-${m}`
  
  const res = await db.collection('checkins')
    .where({
      habitId,
      date: _.regexp(`^${prefix}`)
    })
    .get()
  
  return { code: 0, data: res.data }
}

// 获取连胜信息
async function getStreakInfo(openid, data) {
  const { habitId } = data
  if (!habitId) return { code: -1, msg: '缺少习惯ID' }
  
  // 获取该习惯的所有打卡日期
  const res = await db.collection('checkins')
    .where({ habitId })
    .orderBy('date', 'desc')
    .get()
  
  const dates = res.data.map(c => c.date).sort().reverse()
  
  // 计算当前连胜
  let currentStreak = 0
  let maxStreak = 0
  let tempStreak = 0
  const sorted = [...dates].sort()
  
  // 计算最长连胜
  if (sorted.length > 0) {
    tempStreak = 1
    let streakCount = 1
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i-1])
      const curr = new Date(sorted[i])
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24)
      if (diffDays === 1) {
        streakCount++
      } else if (diffDays > 1) {
        streakCount = 1
      }
      maxStreak = Math.max(maxStreak, streakCount)
    }
    maxStreak = Math.max(maxStreak, streakCount)
    
    // 计算当前连胜（从今天往前推）
    const today = getDateStr()
    if (sorted[sorted.length - 1] === today || sorted[sorted.length - 1] === getYesterday()) {
      currentStreak = 1
      for (let i = sorted.length - 2; i >= 0; i--) {
        const curr = new Date(sorted[i])
        const next = new Date(sorted[i+1])
        const diffDays = (next - curr) / (1000 * 60 * 60 * 24)
        if (diffDays === 1) {
          currentStreak++
        } else {
          break
        }
      }
    }
  }
  
  return {
    code: 0,
    data: {
      currentStreak,
      maxStreak,
      totalDays: dates.length,
      lastCheckinDate: dates[0] || null
    }
  }
}

// 更新习惯统计数据
async function updateHabitStats(openid, habitId, today) {
  // 获取该习惯的所有打卡数
  const countRes = await db.collection('checkins')
    .where({ habitId })
    .count()
  
  const totalDays = countRes.total
  
  // 获取连胜统计
  const streakRes = await getStreakInfo(openid, { habitId })
  const { currentStreak, maxStreak } = streakRes.data
  
  // 更新习惯文档
  await db.collection('habits').doc(habitId).update({
    data: {
      totalDays,
      streak: currentStreak,
      maxStreak: Math.max(maxStreak, currentStreak),
      updatedAt: db.serverDate()
    }
  })
}

// 工具函数
function getDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
