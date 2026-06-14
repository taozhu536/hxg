const util = require('../../utils/util')

Page({
  data: {
    habits: [],
    todayChecked: 0,
    totalHabits: 0,
    greeting: '',
    showPopup: false,
    popupHabitId: '',
    popupNote: '',
    popupDate: '',
    loading: true,
    userStats: { totalCheckins: 0, currentStreak: 0 },
    touchStartY: 0,
    touchEndY: 0
  },

  onLoad() {
    this.setGreeting()
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  setGreeting() {
    const hour = new Date().getHours()
    let greeting = ''
    if (hour < 6) greeting = '🌙 夜深了，早点休息'
    else if (hour < 9) greeting = '🌅 早上好！新的一天开始啦'
    else if (hour < 12) greeting = '☀️ 上午好，继续坚持'
    else if (hour < 14) greeting = '🌤️ 午安，别忘了打卡'
    else if (hour < 18) greeting = '🌇 下午好，保持状态'
    else if (hour < 21) greeting = '🌆 傍晚好，今天真棒'
    else greeting = '🌙 晚上好，复盘一下今天'
    this.setData({ greeting })
  },

  async loadData() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      // 获取今日打卡状态
      const res = await wx.cloud.callFunction({
        name: 'checkin',
        data: { action: 'today' }
      })
      
      const habits = res.result.data || []
      
      // 获取总览统计
      const statsRes = await wx.cloud.callFunction({
        name: 'stats',
        data: { action: 'overview' }
      })
      
      const todayChecked = habits.filter(h => h.isCheckedToday).length
      
      this.setData({
        habits,
        todayChecked,
        totalHabits: habits.length,
        userStats: statsRes.result.data || { totalCheckins: 0 },
        loading: false
      })
      
      wx.hideLoading()
    } catch (err) {
      console.error(err)
      wx.hideLoading()
      this.setData({ loading: false })
    }
  },

  // 点击卡片打开打卡弹窗
  onCheckinTap(e) {
    const { id, name } = e.currentTarget.dataset
    const today = util.getToday()
    
    // 检查是否已经打过卡
    const habit = this.data.habits.find(h => h._id === id)
    if (habit && habit.isCheckedToday) {
      // 已打卡 — 显示祝贺信息
      wx.showToast({
        title: '✅ 今天已打卡！',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      showPopup: true,
      popupHabitId: id,
      popupDate: today,
      popupNote: ''
    })
  },

  // 关闭弹窗
  onClosePopup() {
    // 防误触检测：如果 touchStart 和 touchEnd 的 Y 轴偏移超过 30px，说明用户在滑动/键盘弹出导致的误触，不关闭
    const delta = Math.abs(this.data.touchEndY - this.data.touchStartY)
    if (delta > 30) return
    this.setData({ showPopup: false })
  },

  // 弹窗触摸开始
  onPopupTouchStart(e) {
    this.data.touchStartY = e.touches[0].clientY
  },

  // 弹窗触摸结束
  onPopupTouchEnd(e) {
    this.data.touchEndY = e.changedTouches[0].clientY
  },

  // 输入打卡备注
  onNoteInput(e) {
    this.setData({ popupNote: e.detail.value })
  },

  // 确认打卡
  async onConfirmCheckin() {
    wx.showLoading({ title: '打卡中...' })
    
    try {
      await wx.cloud.callFunction({
        name: 'checkin',
        data: {
          action: 'do',
          habitId: this.data.popupHabitId,
          date: this.data.popupDate,
          note: this.data.popupNote
        }
      })
      
      this.setData({ showPopup: false })
      wx.hideLoading()
      
      wx.showToast({
        title: '🎉 打卡成功！',
        icon: 'success',
        duration: 2000
      })
      
      // 刷新数据
      this.loadData()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '打卡失败',
        icon: 'none'
      })
    }
  },

  // 添加新习惯
  onAddHabit() {
    wx.navigateTo({ url: '/pages/add-habit/add-habit' })
  },

  // 查看统计
  onViewStats(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/stats/stats?habitId=${id}`
    })
  },

  // 查看更多
  onViewMore() {
    // 预留
  },

  // 获取激励语
  getMotivation(streak) {
    return util.getMotivation(streak)
  },

  // 消息提示的 helper
  showSuccessToast(msg) {
    wx.showToast({
      title: msg,
      icon: 'success',
      duration: 2000
    })
  }
})
