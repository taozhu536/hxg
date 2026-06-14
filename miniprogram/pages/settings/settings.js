Page({
  data: {
    reminderTime: '',
    reminderEnabled: false,
    showTimePicker: false
  },

  onLoad() {
    this.loadSettings()
  },

  loadSettings() {
    const settings = wx.getStorageSync('settings') || {}
    this.setData({
      reminderEnabled: settings.reminderEnabled || false,
      reminderTime: settings.reminderTime || '21:00'
    })
  },

  onReminderSwitch(e) {
    this.setData({ reminderEnabled: e.detail.value })
    this.saveSettings()
  },

  onShowTimePicker() {
    this.setData({ showTimePicker: true })
  },

  onTimeChange(e) {
    this.setData({
      reminderTime: e.detail.value,
      showTimePicker: false
    })
    this.saveSettings()
  },

  saveSettings() {
    wx.setStorageSync('settings', {
      reminderEnabled: this.data.reminderEnabled,
      reminderTime: this.data.reminderTime
    })
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  onAbout() {
    wx.showModal({
      title: '关于拜拜坏习惯拯救时间',
      content: '拜拜坏习惯拯救时间 v1.0\n\n用打卡管理帮助自己戒掉坏习惯，养成好习惯💪\n\n「每一次打卡，都是向更好的自己迈进」',
      showCancel: false
    })
  },

  onClearData() {
    wx.showModal({
      title: '确认清除',
      content: '此操作将清除所有本地设置，不影响云端数据。确定吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.showToast({ title: '已清除', icon: 'success' })
          this.onLoad()
        }
      }
    })
  }
})
