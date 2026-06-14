const util = require('../../utils/util')

Page({
  data: {
    name: '',
    description: '',
    icon: '🔥',
    category: 'digital',
    target: '',
    categories: util.getCategories(),
    icons: util.getHabitIcons(),
    showIconPicker: false,
    submitting: false
  },

  onLoad() {
    // 设置默认分类描述
    this.updateCategoryDesc()
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value })
  },

  onTargetInput(e) {
    this.setData({ target: e.detail.value })
  },

  // 选择分类
  onCategorySelect(e) {
    const { key } = e.currentTarget.dataset
    const cat = this.data.categories.find(c => c.key === key)
    if (cat) {
      this.setData({ 
        category: key,
        icon: cat.icon
      })
    }
  },

  // 打开图标选择器
  onShowIconPicker() {
    this.setData({ showIconPicker: true })
  },

  // 选择图标
  onIconSelect(e) {
    const { icon } = e.currentTarget.dataset
    this.setData({ 
      icon,
      showIconPicker: false
    })
  },

  // 关闭图标选择器
  onCloseIconPicker() {
    this.setData({ showIconPicker: false })
  },

  updateCategoryDesc() {
    const cat = this.data.categories.find(c => c.key === this.data.category)
    if (cat && !this.data.description) {
      this.setData({ description: cat.desc })
    }
  },

  // 提交
  async onSave() {
    const { name, description, icon, category, target } = this.data
    
    if (!name.trim()) {
      wx.showToast({ title: '请输入习惯名称', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '创建中...' })

    try {
      await wx.cloud.callFunction({
        name: 'habits',
        data: {
          action: 'create',
          name: name.trim(),
          description: description.trim(),
          icon,
          category,
          target: target.trim()
        }
      })

      wx.hideLoading()
      wx.showToast({ title: '🎉 创建成功！', icon: 'success' })
      
      // 返回首页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '创建失败', icon: 'none' })
      this.setData({ submitting: false })
    }
  }
})
