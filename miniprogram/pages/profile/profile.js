Page({
  data: {
    overview: null,
    loading: true,
    loginStatus: false
  },

  onLoad() {
    this.loadProfile()
  },

  onShow() {
    this.loadProfile()
  },

  async loadProfile() {
    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'stats',
        data: { action: 'overview' }
      })
      
      this.setData({
        overview: res.result.data,
        loginStatus: true,
        loading: false
      })
    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  onHabitTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/stats/stats?habitId=${id}`
    })
  },

  // 编辑习惯
  onEditHabit(e) {
    const { id } = e.currentTarget.dataset
    wx.showActionSheet({
      itemList: ['删除习惯'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '确认删除',
            content: '删除后打卡记录将保留，但习惯不再显示。确定要删除吗？',
            success: async (confirm) => {
              if (confirm.confirm) {
                try {
                  await wx.cloud.callFunction({
                    name: 'habits',
                    data: { action: 'delete', _id: id }
                  })
                  wx.showToast({ title: '已删除', icon: 'success' })
                  this.loadProfile()
                } catch (err) {
                  wx.showToast({ title: '删除失败', icon: 'none' })
                }
              }
            }
          })
        }
      }
    })
  },

  // 关于
  onAbout() {
    wx.showModal({
      title: '关于拜拜坏习惯拯救时间',
      content: '拜拜坏习惯拯救时间 v1.0\n帮你戒掉坏习惯，养成好习惯 💪\n\n用坚持改变自己，用打卡见证成长。',
      showCancel: false
    })
  }
})
