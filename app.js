import updateManager from './common/updateManager';

App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'store-d6guuubbx591f1bc3',
        traceUser: true,
      });
    }
  },
  onShow: function () {
    updateManager();
  },
});
