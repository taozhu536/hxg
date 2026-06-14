// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * stats 云函数
 * 获取用户的整体统计数据
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  try {
    switch (action) {
      case 'overview':
        return await getOverview(openid)
      case 'weekly':
        return await getWeeklyReport(openid)
      case 'monthly':
        return await getMonthlyReport(openid)
      default:
        return getOverview(openid)
    }
  } catch (err) {
    console.error(err)
    return { code: -1, msg: err.message }
  }
}

// 总览统计
async function getOverview(openid) {
  // 活跃习惯数
  const habitsRes = await db.collection('habits')
    .where({ openid, isActive: true })
    .count()
  
  // 总打卡次数
  const checkinRes = await db.collection('checkins')
    .where({ openid })
    .count()
  
  // 本月打卡次数
  const monthStart = getMonthStart()
  const monthCheckins = await db.collection('checkins')
    .where({
      openid,
      date: db.command.gte(monthStart)
    })
    .count()
  
  // 累计天数最长的习惯
  const topHabits = await db.collection('habits')
    .where({ openid, isActive: true })
    .orderBy('totalDays', 'desc')
    .limit(3)
    .get()
  
  return {
    code: 0,
    data: {
      activeHabits: habitsRes.total,
      totalCheckins: checkinRes.total,
      monthlyCheckins: monthCheckins.total,
      topHabits: topHabits.data
    }
  }
}

// 周报
async function getWeeklyReport(openid) {
  const weekStart = getWeekStart()
  const res = await db.collection('checkins')
    .where({
      openid,
      date: db.command.gte(weekStart)
    })
    .get()
  
  // 按习惯分组
  const grouped = {}
  res.data.forEach(c => {
    if (!grouped[c.habitId]) grouped[c.habitId] = []
    grouped[c.habitId].push(c.date)
  })
  
  return { code: 0, data: grouped }
}

// 月报
async function getMonthlyReport(openid) {
  const monthStart = getMonthStart()
  const res = await db.collection('checkins')
    .where({
      openid,
      date: db.command.gte(monthStart)
    })
    .get()
  
  const dailyMap = {}
  res.data.forEach(c => {
    if (!dailyMap[c.date]) dailyMap[c.date] = 0
    dailyMap[c.date]++
  })
  
  // 生成一个月的日历标记
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const calendar = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    calendar.push({
      date: dateStr,
      day: d,
      count: dailyMap[dateStr] || 0,
      hasCheckin: !!dailyMap[dateStr]
    })
  }
  
  return { code: 0, data: { calendar, totalDays: res.data.length } }
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`
}

function getMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
}
