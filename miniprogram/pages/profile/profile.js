Page({
  data: {
    overview: null,
    loading: true,
    loginStatus: false,
    userInfo: { nickName: '', avatarUrl: '' },
    gotUserProfile: false,
    // 好友
    friends: [],
    inviteCode: '',
    showAddFriend: false,
    addFriendCode: ''
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
      // 并行获取用户资料 + 统计 + 好友列表 + 邀请码
      const [loginRes, statsRes, friendsRes, codeRes] = await Promise.all([
        wx.cloud.callFunction({
          name: 'login',
          data: { action: 'login' }
        }),
        wx.cloud.callFunction({
          name: 'stats',
          data: { action: 'overview' }
        }),
        wx.cloud.callFunction({
          name: 'friends',
          data: { action: 'list' }
        }),
        wx.cloud.callFunction({
          name: 'friends',
          data: { action: 'myCode' }
        })
      ])

      const user = loginRes.result.user || {}
      const hasAvatar = !!(user.avatarUrl || '')

      this.setData({
        overview: statsRes.result.data,
        loginStatus: true,
        loading: false,
        userInfo: {
          nickName: user.nickName || '戒瘾勇士',
          avatarUrl: user.avatarUrl || ''
        },
        gotUserProfile: hasAvatar,
        friends: friendsRes.result.data || [],
        inviteCode: codeRes.result.data ? codeRes.result.data.inviteCode : ''
      })
    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  // 使用微信头像选择组件
  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    if (!avatarUrl) {
      wx.showToast({ title: '获取头像失败', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })
      
      // 上传头像到云存储
      const cloudPath = `avatars/${Date.now()}.jpg`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: avatarUrl,
      })
      
      const fileId = uploadRes.fileID

      await wx.cloud.callFunction({
        name: 'login',
        data: {
          action: 'updateProfile',
          nickName: this.data.userInfo.nickName || '戒瘾勇士',
          avatarUrl: fileId
        }
      })

      this.setData({
        'userInfo.avatarUrl': fileId,
        gotUserProfile: true
      })
      wx.hideLoading()
      wx.showToast({ title: '✅ 头像已更新', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      console.error(err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 编辑昵称弹窗
  onEditNickName() {
    wx.showModal({
      title: '修改昵称',
      content: '',
      editable: true,
      placeholderText: '输入你的昵称',
      success: async (res) => {
        if (res.confirm && res.content.trim()) {
          const nickName = res.content.trim()
          try {
            wx.showLoading({ title: '保存中...' })
            await wx.cloud.callFunction({
              name: 'login',
              data: {
                action: 'updateProfile',
                nickName,
                avatarUrl: this.data.userInfo.avatarUrl || ''
              }
            })
            this.setData({
              'userInfo.nickName': nickName,
              gotUserProfile: true
            })
            wx.hideLoading()
            wx.showToast({ title: '✅ 昵称已更新', icon: 'success' })
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        }
      }
    })
  },

  // === 好友功能 ===

  // 打开添加好友弹窗
  onShowAddFriend() {
    this.setData({
      showAddFriend: true,
      addFriendCode: ''
    })
  },

  // 关闭添加好友弹窗
  onCloseAddFriend() {
    this.setData({ showAddFriend: false })
  },

  // 输入邀请码
  onAddCodeInput(e) {
    this.setData({ addFriendCode: e.detail.value })
  },

  // 确认添加好友
  async onConfirmAddFriend() {
    const code = this.data.addFriendCode.toUpperCase()
    if (code.length < 4) {
      wx.showToast({ title: '请输入4位邀请码', icon: 'none' })
      return
    }

    wx.showLoading({ title: '添加中...' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'friends',
        data: { action: 'add', inviteCode: code }
      })

      wx.hideLoading()

      if (res.result.code === 0) {
        wx.showToast({
          title: `✅ 已添加 ${res.result.data.nickName || '好友'}`,
          icon: 'success'
        })
        this.setData({ showAddFriend: false })
        this.loadProfile()
      } else {
        wx.showToast({
          title: res.result.msg || '添加失败',
          icon: 'none'
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '添加失败', icon: 'none' })
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
      content: '拜拜坏习惯拯救时间 v1.1\n帮你戒掉坏习惯，养成好习惯 💪\n\n用坚持改变自己，用打卡见证成长。',
      showCancel: false
    })
  }
})
