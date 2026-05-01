Page({
  data: {
    nameValue: '',
  },

  onLoad(options) {
    const { name } = options;
    this.setData({ nameValue: name || '' });
  },

  async onSubmit() {
    const { nameValue } = this.data;
    if (!nameValue.trim()) return; // 防止提交空名字

    wx.showLoading({ title: '保存中...' });

    try {
      // 1. 提交新名字到数据库
      await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: { nickName: nameValue }
      });

      // 2. 更新本地缓存
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.nickName = nameValue;
      wx.setStorageSync('userInfo', userInfo);

      wx.hideLoading();
      wx.showToast({ title: '修改成功', icon: 'success' });

      // 3. 延迟一下返回上一页，体验更好
      setTimeout(() => {
        wx.navigateBack();
      }, 800);

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  clearContent() {
    this.setData({ nameValue: '' });
  },
});