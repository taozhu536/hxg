/**
 * 工具函数集合
 */

// 获取今天日期 YYYY-MM-DD
function getToday() {
  const d = new Date()
  return formatDate(d)
}

// 格式化日期
function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 获取本周开始日期
function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return formatDate(monday)
}

// 获取本月第一天
function getMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// 获取某个月的天数
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

// 获取某个月第一天是星期几
function getFirstDayOfMonth(year, month) {
  return new Date(year, month - 1, 1).getDay()
}

// 日期比较（是否同一天）
function isSameDay(date1, date2) {
  return formatDate(date1) === formatDate(date2)
}

// 获取日期描述
function getDateLabel(dateStr) {
  const today = getToday()
  const yesterday = formatDate(new Date(new Date().setDate(new Date().getDate() - 1)))
  
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  
  const d = new Date(dateStr)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[d.getDay()] + ' ' + dateStr.slice(5)
}

// 计算连续天数
function calculateStreak(dates) {
  if (!dates || dates.length === 0) return { current: 0, max: 0 }
  
  const sorted = [...new Set(dates)].sort().reverse()
  let current = 0
  const today = getToday()
  
  // 计算当前连胜
  if (sorted[0] === today || sorted[0] === getYesterday()) {
    current = 1
    for (let i = 1; i < sorted.length; i++) {
      const curr = new Date(sorted[i - 1])
      const prev = new Date(sorted[i])
      const diff = (curr - prev) / (86400000)
      if (diff === 1) current++
      else break
    }
  }
  
  // 计算最长连胜
  let max = 1
  let temp = 1
  const asc = [...sorted].reverse()
  for (let i = 1; i < asc.length; i++) {
    const prev = new Date(asc[i - 1])
    const curr = new Date(asc[i])
    const diff = (curr - prev) / (86400000)
    if (diff === 1) {
      temp++
      max = Math.max(max, temp)
    } else {
      temp = 1
    }
  }
  
  return { current, max: max || (sorted.length > 0 ? 1 : 0) }
}

// 获取激励语句
function getMotivation(streak) {
  const quotes = {
    0: '从今天开始改变 💪',
    1: '好的开始是成功的一半！🌟',
    3: '三天了，你正在养成习惯！🔥',
    7: '坚持一周，你已经战胜了70%的人！🎯',
    14: '两星期！习惯正在形成 ✨',
    21: '21天法则！新习惯即将养成 🏆',
    30: '一个月！你已经脱胎换骨了！🦋',
    60: '两个月！这已经成为你的一部分了 💎',
    90: '90天！你是真正的自律达人！👑',
    100: '100天！传奇正在书写中 📜',
    365: '一年！你是自己的英雄！🎉'
  }
  
  let quote = `连续 ${streak} 天，继续加油！`
  for (const [days, msg] of Object.entries(quotes).sort((a, b) => b - a)) {
    if (streak >= parseInt(days)) {
      quote = msg
      break
    }
  }
  return quote
}

// 获取习惯图标
function getHabitIcons() {
  return ['🔥', '💪', '🌱', '🎯', '🏆', '🧠', '❤️', '📵', '🛌', '🚭', '🍷', '🍰', '🎮', '📱', '💻', '☕', '🥤', '🍟']
}

// 获取习惯分类
function getCategories() {
  return [
    { key: 'digital', label: '数字戒断', icon: '📱', desc: '少刷手机/少玩游戏' },
    { key: 'food', label: '饮食控制', icon: '🍰', desc: '戒糖/戒奶茶/戒零食' },
    { key: 'health', label: '健康生活', icon: '💪', desc: '早睡/运动/戒烟酒' },
    { key: 'mental', label: '心灵成长', icon: '🧠', desc: '冥想/阅读/写作' },
    { key: 'social', label: '社交管理', icon: '❤️', desc: '控制社交媒体/无效社交' },
    { key: 'other', label: '其他', icon: '🎯', desc: '自定义戒断习惯' }
  ]
}

module.exports = {
  getToday,
  formatDate,
  getWeekStart,
  getMonthStart,
  getDaysInMonth,
  getFirstDayOfMonth,
  isSameDay,
  getDateLabel,
  calculateStreak,
  getMotivation,
  getHabitIcons,
  getCategories
}
