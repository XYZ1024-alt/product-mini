import { fetchUserCenter } from '../../services/usercenter/fetchUsercenter';
import Toast from 'tdesign-miniprogram/toast/index';

const menuData = [
  [
    {
      title: '收货地址',
      tit: '',
      url: '',
      type: 'address',
    }
  ]
];

// 2. 修改订单状态栏：只保留待付款、待发货、待收货
const orderTagInfos = [
  {
    title: '待付款',
    iconName: 'wallet',
    orderNum: 0,
    tabType: 5,
    status: 1,
  },
  {
    title: '待发货',
    iconName: 'deliver',
    orderNum: 0,
    tabType: 10,
    status: 1,
  },
  {
    title: '待收货',
    iconName: 'package',
    orderNum: 0,
    tabType: 40,
    status: 1,
  }
];

const getDefaultData = () => ({
  showMakePhone: false,
  userInfo: {
    avatarUrl: '',
    nickName: '未登录',
    phoneNumber: '',
  },
  menuData,
  orderTagInfos,
  customerServiceInfo: {},
  currAuthStep: 1,
  showKefu: true,
  versionNo: '',
});

Page({
  data: getDefaultData(),

  onLoad() {
    this.getVersionInfo();
  },

  onShow() {
    this.getTabBar().init();
    this.init();
  },
  onPullDownRefresh() {
    this.init();
  },

  init() {
    this.fetUseriInfoHandle();
  },

  fetUseriInfoHandle() {
    // 1. 页面加载第一件事：读缓存
    const cachedUserInfo = wx.getStorageSync('userInfo');
    let currentStep = 1;
    let currentUserInfo = {
      avatarUrl: '',
      nickName: '未登录',
      phoneNumber: '',
    };

    // 2. 如果查到了缓存，直接把状态强制锁定为已登录 (Step 2)
    if (cachedUserInfo && cachedUserInfo._id) {
      currentStep = 2;
      currentUserInfo = cachedUserInfo;
    }

    // 3. 继续去请求底下的订单数量等数据
    fetchUserCenter().then(({ countsData, orderTagInfos: orderInfo, customerServiceInfo }) => {

      menuData?.[0]?.forEach((v) => {
        countsData?.forEach((counts) => {
          if (counts.type === v.type) {
            v.tit = counts.num;
          }
        });
      });

      const info = orderTagInfos.map((v, index) => ({
        ...v,
        ...(orderInfo && orderInfo[index] ? orderInfo[index] : {}),
      }));

      // 4. 统一渲染，此时 currentStep 和 currentUserInfo 绝对准确
      this.setData({
        userInfo: currentUserInfo,
        currAuthStep: currentStep,
        menuData,
        orderTagInfos: info,
        customerServiceInfo: customerServiceInfo || {},
      });

      wx.stopPullDownRefresh();
    });
  },

  onClickCell({ currentTarget }) {
    const { type } = currentTarget.dataset;

    switch (type) {
      case 'address': {
        wx.navigateTo({ url: '/pages/user/address/list/index' });
        break;
      }
      case 'service': {
        this.openMakePhone();
        break;
      }
      case 'help-center': {
        Toast({
          context: this,
          selector: '#t-toast',
          message: '你点击了帮助中心',
          icon: '',
          duration: 1000,
        });
        break;
      }
      case 'point': {
        Toast({
          context: this,
          selector: '#t-toast',
          message: '你点击了积分菜单',
          icon: '',
          duration: 1000,
        });
        break;
      }
      case 'coupon': {
        wx.navigateTo({ url: '/pages/coupon/coupon-list/index' });
        break;
      }
      default: {
        Toast({
          context: this,
          selector: '#t-toast',
          message: '未知跳转',
          icon: '',
          duration: 1000,
        });
        break;
      }
    }
  },

  jumpNav(e) {
    const status = e.detail.tabType;

    if (status === 0) {
      wx.navigateTo({ url: '/pages/order/after-service-list/index' });
    } else {
      wx.navigateTo({ url: `/pages/order/order-list/index?status=${status}` });
    }
  },

  jumpAllOrder() {
    wx.navigateTo({ url: '/pages/order/order-list/index' });
  },

  openMakePhone() {
    this.setData({ showMakePhone: true });
  },

  closeMakePhone() {
    this.setData({ showMakePhone: false });
  },

  call() {
    wx.makePhoneCall({
      phoneNumber: this.data.customerServiceInfo.servicePhone,
    });
  },

  gotoUserEditPage() {
    // 唯一真理：直接读取本地缓存
    const cachedUserInfo = wx.getStorageSync('userInfo');

    // 只要缓存里有 _id 或 openid，就说明 100% 已经登录了
    if (cachedUserInfo && cachedUserInfo._id) {
      wx.navigateTo({ url: '/pages/user/person-info/index' });
    } else {
      // 没查到缓存，老老实实走静默登录
      this.handleSimpleLogin();
    }
  },

  getVersionInfo() {
    const versionInfo = wx.getAccountInfoSync();
    const { version, envVersion = __wxConfig } = versionInfo.miniProgram;
    this.setData({
      versionNo: envVersion === 'release' ? version : envVersion,
    });
  },
  async handleSimpleLogin() {
    wx.showLoading({ title: '登录中...' });

    try {
      // 个人账号无需传入 phoneCode，直接调用云函数即可
      const res = await wx.cloud.callFunction({
        name: 'userLogin'
      });

      if (res.result && res.result.code === 0) {
        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success' });

        this.setData({
          userInfo: res.result.data.userInfo,
          currAuthStep: 2
        });

        wx.setStorageSync('userInfo', res.result.data.userInfo);
      } else {
        throw new Error(res.result.msg);
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
      console.error('登录异常:', error);
    }
  },

  // async handleGetPhoneNumber(e) {
  //   if (e.detail.errMsg !== "getPhoneNumber:ok") {
  //     console.log('获取手机号失败原因：', e.detail.errMsg);
  //     wx.showToast({ title: '已取消登录', icon: 'none' });
  //     return;
  //   }
  //
  //   wx.showLoading({ title: '登录中...' });
  //
  //   try {
  //     const phoneCode = e.detail.code;
  //
  //     // 调用云函数进行登录/注册
  //     const res = await wx.cloud.callFunction({
  //       name: 'userLogin',
  //       data: {
  //         phoneCode: phoneCode
  //       }
  //     });
  //
  //     if (res.result && res.result.code === 0) {
  //       wx.hideLoading();
  //       wx.showToast({ title: '登录成功', icon: 'success' });
  //
  //       // 更新本地 userInfo 数据并刷新页面状态
  //       this.setData({
  //         userInfo: res.result.data.userInfo,
  //         currAuthStep: 2
  //       });
  //
  //       wx.setStorageSync('userInfo', res.result.data.userInfo);
  //     } else {
  //       throw new Error(res.result.msg);
  //     }
  //   } catch (error) {
  //     wx.hideLoading();
  //     wx.showToast({ title: '登录失败，请重试', icon: 'none' });
  //     console.error('一键登录异常:', error);
  //   }
  // }
});
