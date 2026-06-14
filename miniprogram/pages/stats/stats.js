const util = require('../../utils/util')

Page({
  data: {
    habitId: '',
    habit: null,
    stats: {
      currentStreak: 0,
      maxStreak: 0,
      totalDays: 0
    },
    weekData: [],
    monthData: [],
    loading: true
  },

  onLoad(options) {
    this.setData({ habitId: options.habitId })
    this.loadStats()
  },

  async loadStats() {
    this.setData({ loading: true })
    try {
      const { habitId } = this.data
      
      // 获取习惯详情
      const habitRes = await wx.cloud.callFunction({
        name: 'habits',
        data: { action: 'get', _id: habitId }
      })
      
      // 获取连胜统计
      const streakRes = await wx.cloud.callFunction({
        name: 'checkin',
        data: { action: 'streak', habitId }
      })
      
      // 获取打卡历史
      const historyRes = await wx.cloud.callFunction({
        name: 'checkin',
        data: { action: 'history', habitId }
      })
      
      const habit = habitRes.result.data
      const streak = streakRes.result.data
      const history = historyRes.result.data || []
      
      // 生成周数据
      const weekData = this.generateWeekData(history.map(c => c.date))
      
      this.setData({
        habit,
        stats: streak || { currentStreak: 0, maxStreak: 0, totalDays: 0 },
        weekData,
        loading: false
      })
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  generateWeekData(dates) {
    const days = []
    const dateSet = new Set(dates)
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = util.formatDate(d)
      days.push({
        label: ['日','一','二','三','四','五','六'][d.getDay()],
        date: dateStr,
        checked: dateSet.has(dateStr)
      })
    }
    return days
  }
})
