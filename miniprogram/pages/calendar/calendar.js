const util = require('../../utils/util')

Page({
  data: {
    currentYear: 0,
    currentMonth: 0,
    calendarDays: [],
    weekdayLabels: ['日', '一', '二', '三', '四', '五', '六'],
    habits: [],
    selectedHabitId: 'all',
    selectedDay: null,
    dayDetail: null,
    monthStats: { totalDays: 0, checkedDays: 0 },
    loading: true
  },

  onLoad() {
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    })
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      // 获取所有习惯
      const habitsRes = await wx.cloud.callFunction({
        name: 'habits',
        data: { action: 'list' }
      })
      
      const habits = habitsRes.result.data || []
      
      // 生成日历
      this.generateCalendar()
      
      // 获取月度统计
      const statsRes = await wx.cloud.callFunction({
        name: 'stats',
        data: { action: 'monthly' }
      })
      
      const monthlyData = statsRes.result.data || { calendar: [], totalDays: 0 }
      
      // 合并打卡数据到日历
      const checkedDates = new Set()
      monthlyData.calendar.forEach(d => {
        if (d.hasCheckin) checkedDates.add(d.date)
      })
      
      const calendarDays = this.data.calendarDays.map(day => {
        if (day.date) {
          day.hasCheckin = checkedDates.has(day.date)
        }
        return day
      })
      
      const totalDays = monthlyData.calendar.length
      const checkedDays = monthlyData.totalDays
      const rate = totalDays > 0 ? Math.round(checkedDays / totalDays * 100) : 0
      
      this.setData({
        habits,
        calendarDays,
        monthStats: {
          totalDays: totalDays,
          checkedDays: checkedDays,
          rate: rate
        },
        loading: false
      })
    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  generateCalendar() {
    const { currentYear, currentMonth } = this.data
    const daysInMonth = util.getDaysInMonth(currentYear, currentMonth)
    const firstDay = util.getFirstDayOfMonth(currentYear, currentMonth)
    
    const days = []
    
    // 填充空白
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true })
    }
    
    // 填充日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isToday = dateStr === util.getToday()
      days.push({
        day: d,
        date: dateStr,
        isToday,
        hasCheckin: false,
        isFuture: new Date(dateStr) > new Date()
      })
    }
    
    this.setData({ calendarDays: days })
  },

  // 上个月
  onPrevMonth() {
    let { currentYear, currentMonth } = this.data
    if (currentMonth === 1) {
      currentYear--
      currentMonth = 12
    } else {
      currentMonth--
    }
    this.setData({ currentYear, currentMonth })
    this.generateCalendar()
    this.loadData()
  },

  // 下个月
  onNextMonth() {
    let { currentYear, currentMonth } = this.data
    const now = new Date()
    if (currentYear >= now.getFullYear() && currentMonth >= now.getMonth() + 1) {
      wx.showToast({ title: '不能穿越到未来', icon: 'none' })
      return
    }
    if (currentMonth === 12) {
      currentYear++
      currentMonth = 1
    } else {
      currentMonth++
    }
    this.setData({ currentYear, currentMonth })
    this.generateCalendar()
    this.loadData()
  },

  // 点击日期查看详情
  onDayTap(e) {
    const { date } = e.currentTarget.dataset
    if (!date) return
    
    const now = new Date()
    if (new Date(date) > now) return
    
    // 这里可以跳转到该日期的打卡详情页
    wx.showToast({
      title: `${date} 的打卡详情`,
      icon: 'none'
    })
  },

  onHabitFilter(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ selectedHabitId: id })
    this.loadData()
  }
})
