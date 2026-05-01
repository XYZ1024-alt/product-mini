import Toast from 'tdesign-miniprogram/toast/index';
import { areaData } from '../../../../config/index'; // 保留级联选择器数据

const innerPhoneReg = '^1\\d{10}$';
const innerNameReg = '^[a-zA-Z\\d\\u4e00-\\u9fa5]+$'; //
const labelsOptions = [
  { id: 0, name: '家' },
  { id: 1, name: '公司' },
];

Page({
  data: {
    locationState: {
      _id: '',             // 云数据库记录ID
      name: '',
      phone: '',
      provinceName: '',
      cityName: '',
      districtName: '',
      detailAddress: '',
      isDefault: false,
      addressTag: '',
      labelIndex: null,    // 标签索引[cite: 3]
    },
    areaData: areaData,    //[cite: 3]
    labels: labelsOptions, //[cite: 3]
    areaPickerVisible: false,
    submitActive: false,
    visible: false,        // 新增标签弹窗控制[cite: 3]
    labelValue: '',        // 新增标签输入值[cite: 3]
  },

  privateData: {
    verifyTips: '',
  },

  onLoad(options) {
    const { id } = options; // 如果是编辑，会有 id 传过来[cite: 3]
    if (id) {
      this.fetchAddressDetail(id);
    }
  },

  // 1. 从云数据库获取地址详情（替换原来的 fetchDeliveryAddress）
  async fetchAddressDetail(id) {
    const db = wx.cloud.database();
    try {
      const res = await db.collection('user_addresses').doc(id).get();
      this.setData({ locationState: res.data }, () => {
        this.checkForm(); // 初始化校验
      });
    } catch (err) {
      console.error('获取详情失败', err);
    }
  },

  // 2. 核心：处理输入改变（去掉了 Code 的存储）
  onInputValue(e) {
    const { item } = e.currentTarget.dataset;
    if (item === 'address') {
      const { selectedOptions = [] } = e.detail;
      this.setData({
        'locationState.provinceName': selectedOptions[0].label,
        'locationState.cityName': selectedOptions[1].label,
        'locationState.districtName': selectedOptions[2].label,
        areaPickerVisible: false,
      }, () => this.checkForm());
    } else {
      const { value = '' } = e.detail;
      this.setData({ [`locationState.${item}`]: value }, () => this.checkForm());
    }
  },

  // 3. 提交保存（接入云函数 saveAddress）
  async formSubmit() {
    if (!this.data.submitActive) {
      Toast({ context: this, selector: '#t-toast', message: this.privateData.verifyTips });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'saveAddress',
        data: this.data.locationState
      });

      if (res.result.code === 0) {
        wx.hideLoading();
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // --- 保留原有的高级功能函数 ---

  // 表单校验[cite: 3]
  checkForm() {
    const { isLegal, tips } = this.onVerifyInputLegal();
    this.setData({ submitActive: isLegal });
    this.privateData.verifyTips = tips;
  },

  onVerifyInputLegal() {
    const { name, phone, detailAddress, provinceName } = this.data.locationState;

    // 打印一下，看看是不是哪个字段漏了导致校验不通过
    console.log('当前校验数据：', { name, phone, detailAddress, provinceName });

    if (!name || name.trim().length === 0) {
      return { isLegal: false, tips: '请填写收货人' };
    }

    // 手机号正则：确保你输入的确实是 11 位数字
    const phoneRegExp = new RegExp(innerPhoneReg);
    if (!phone || !phoneRegExp.test(phone)) {
      return { isLegal: false, tips: '请填写正确的手机号' };
    }

    if (!provinceName) {
      return { isLegal: false, tips: '请选择省市区' };
    }

    if (!detailAddress || detailAddress.trim().length === 0) {
      return { isLegal: false, tips: '请填写详细地址' };
    }

    return { isLegal: true, tips: '校验通过' };
  },

  // 标签选择[cite: 3]
  onPickLabels(e) {
    const { item } = e.currentTarget.dataset;
    const { labels } = this.data;
    const isSelected = this.data.locationState.labelIndex === item;

    this.setData({
      'locationState.labelIndex': isSelected ? null : item,
      'locationState.addressTag': isSelected ? '' : labels[item].name,
    });
  },

  // 地图选址功能（非常好用，建议保留）[cite: 3]
  onSearchAddress() {
    wx.chooseLocation({
      success: (res) => {
        if (res.name) {
          // 这里可以根据地图返回的地址进行解析，或者直接填入详细地址
          this.setData({ 'locationState.detailAddress': res.address + res.name });
        }
      },
    });
  },

  onPickArea() { this.setData({ areaPickerVisible: true }); },
  onCheckDefaultAddress({ detail }) { this.setData({ 'locationState.isDefault': detail.value }); },
  addLabels() { this.setData({ visible: true }); },
  confirmHandle() {
    const { labels, labelValue } = this.data;
    this.setData({
      visible: false,
      labels: [...labels, { id: labels.length, name: labelValue }],
      labelValue: '',
    });
  },
  cancelHandle() { this.setData({ visible: false, labelValue: '' }); },
});