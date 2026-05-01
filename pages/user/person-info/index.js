import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    personInfo: {
      avatarUrl: '',
      nickName: '',
      phoneNumber: '',
    },
    showUnbindConfirm: false,
  },

  onShow() {
    this.init();
  },

  init() {
    // 读取缓存
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({
      personInfo: {
        avatarUrl: userInfo.avatarUrl || '',
        nickName: userInfo.nickName || '',
        phoneNumber: userInfo.phoneNumber || '',
      }
    });
  },

  onClickCell({ currentTarget }) {
    const { dataset } = currentTarget;
    const { nickName } = this.data.personInfo;

    switch (dataset.type) {
      case 'name':
        wx.navigateTo({ url: `/pages/user/name-edit/index?name=${nickName}` });
        break;
      case 'avatarUrl':
        this.toModifyAvatar();
        break;
      default:
        break;
    }
  },

  // 修改头像
  async toModifyAvatar() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject,
        });
      });

      const tempFilePath = res.tempFiles[0].tempFilePath;
      wx.showLoading({ title: '上传中...' });

      const cloudPath = `avatars/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath,
      });
      const fileID = uploadRes.fileID;

      await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: { avatarUrl: fileID }
      });

      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.avatarUrl = fileID;
      wx.setStorageSync('userInfo', userInfo);

      this.setData({ 'personInfo.avatarUrl': fileID });

      wx.hideLoading();
      Toast({ context: this, selector: '#t-toast', message: '头像修改成功', theme: 'success' });

    } catch (error) {
      wx.hideLoading();
      if (error.errMsg && error.errMsg.includes('cancel')) return;
      Toast({ context: this, selector: '#t-toast', message: '上传失败', theme: 'error' });
    }
  },
});