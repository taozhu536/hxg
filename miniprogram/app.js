App({
  globalData: {
    userInfo: null,
    openid: null
  },

  onLaunch() {
    // 初始化云开发环境
    wx.cloud.init({
      env: 'cloud1-d8gshwhb5dc72723e',
      traceUser: true
    });

    // 获取用户openid
    this.getOpenId();
  },

  getOpenId() {
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        this.globalData.openid = res.result.openid;
      },
      fail: err => {
        console.error('获取openid失败', err);
      }
    });
  }
});
