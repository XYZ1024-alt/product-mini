import { areaData } from '../../../../config/index';
import Toast from 'tdesign-miniprogram/toast/index';
import { commitAddress } from '../../../../services/address/edit';

const innerPhoneReg = '^1\\d{10}$';
import { fetchDeliveryAddress } from '../../../../services/address/fetchAddress';
import { resolveAddress } from '../../../../services/address/list';

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

  async onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ addressId: id });
      this.loadDetail(id);
    }
  },

  async loadDetail(id) {
    wx.showLoading({ title: '加载中' });
    const detail = await fetchDeliveryAddress(id);
    if (detail) {
      this.setData({ addressInfo: detail });
    }
    wx.hideLoading();
  },

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
  async onDelete() {
    const { addressId } = this.data;
    wx.showModal({
      title: '提示',
      content: '确定删除吗？',
      success: async (res) => {
        if (res.confirm) {
          await deleteAddress(addressId);
          wx.showToast({ title: '已删除' });
          setTimeout(() => wx.navigateBack(), 1500);
        }
      }
    });
  },
  async formSubmit() {
    if (!this.data.submitActive) {
      Toast({ context: this, selector: '#t-toast', message: this.privateData.verifyTips });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      const { locationState } = this.data;
      const id = locationState._id || '';

      // 修复点：严格确保第一个参数传数据对象，第二个参数传 ID
      await commitAddress(locationState, id);

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      wx.hideLoading();
      console.error('提交失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

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