import Toast from 'tdesign-miniprogram/toast/index';
import { cdnBase } from '../../../config/index';

const imgPrefix = `${cdnBase}/`;
const recLeftImg = `${imgPrefix}common/rec-left.png`;
const recRightImg = `${imgPrefix}common/rec-right.png`;

Page({
  data: {
    isShowPromotionPop: false,
    activityList: [],
    recLeftImg,
    recRightImg,
    details: {},
    isStock: true,
    cartNum: 0,
    soldout: false,
    buttonType: 1,
    buyNum: 1,
    selectedAttrStr: '',
    skuArray: [],
    primaryImage: '',
    specImg: '',
    isSpuSelectPopupShow: false,
    isAllSelectedSku: false,
    buyType: 0,
    outOperateStatus: false,
    operateType: 0,
    selectSkuSellsPrice: 0,
    maxLinePrice: 0,
    minSalePrice: 0,
    maxSalePrice: 0,
    list: [],
    spuId: '',
    navigation: { type: 'fraction' },
    current: 0,
    autoplay: true,
    duration: 500,
    interval: 5000,
    soldNum: 0,
    isLoading: true, // 新增：用于骨架屏或隐藏未加载完的白屏
  },

  handlePopupHide() {
    this.setData({ isSpuSelectPopupShow: false });
  },

  showSkuSelectPopup(type) {
    this.setData({
      buyType: type || 0,
      outOperateStatus: type >= 1,
      isSpuSelectPopupShow: true,
    });
  },

  buyItNow() {
    this.showSkuSelectPopup(1);
  },

  toAddCart() {
    this.showSkuSelectPopup(2);
  },

  toNav(e) {
    const { url } = e.detail;
    wx.switchTab({ url: url });
  },

  showCurImg(e) {
    const { index } = e.detail;
    const { images } = this.data.details;
    wx.previewImage({
      current: images[index],
      urls: images,
    });
  },

  chooseSpecItem(e) {
    const { specList } = this.data.details;
    const { selectedSku, isAllSelectedSku } = e.detail;
    if (!isAllSelectedSku) {
      this.setData({ selectSkuSellsPrice: 0 });
    }
    this.setData({ isAllSelectedSku });
    this.getSkuItem(specList, selectedSku);
  },

  getSkuItem(specList, selectedSku) {
    const { skuArray, primaryImage } = this.data;
    const selectedSkuValues = this.getSelectedSkuValues(specList, selectedSku);
    let selectedAttrStr = ` 件  `;
    selectedSkuValues.forEach((item) => {
      selectedAttrStr += `，${item.specValue}  `;
    });

    const skuItem = skuArray.filter((item) => {
      let status = true;
      (item.specInfo || []).forEach((subItem) => {
        if (!selectedSku[subItem.specId] || selectedSku[subItem.specId] !== subItem.specValueId) {
          status = false;
        }
      });
      if (status) return item;
    });

    this.selectSpecsName(selectedSkuValues.length > 0 ? selectedAttrStr : '');

    if (skuItem && skuItem.length > 0) {
      this.setData({
        selectItem: skuItem[0],
        selectSkuSellsPrice: skuItem[0].price || 0,
      });
    } else {
      this.setData({
        selectItem: null,
        selectSkuSellsPrice: 0,
      });
    }
    this.setData({
      specImg: skuItem && skuItem[0] && skuItem[0].skuImage ? skuItem[0].skuImage : primaryImage,
    });
  },

  getSelectedSkuValues(skuTree, selectedSku) {
    const normalizedTree = this.normalizeSkuTree(skuTree);
    return Object.keys(selectedSku).reduce((selectedValues, skuKeyStr) => {
      const skuValues = normalizedTree[skuKeyStr];
      const skuValueId = selectedSku[skuKeyStr];
      if (skuValueId !== '') {
        const skuValue = skuValues.filter((value) => {
          return value.specValueId === skuValueId;
        })[0];
        skuValue && selectedValues.push(skuValue);
      }
      return selectedValues;
    }, []);
  },

  normalizeSkuTree(skuTree) {
    const normalizedTree = {};
    if (!skuTree) return normalizedTree;
    skuTree.forEach((treeItem) => {
      normalizedTree[treeItem.specId] = treeItem.specValueList;
    });
    return normalizedTree;
  },

  selectSpecsName(selectSpecsName) {
    this.setData({
      selectedAttrStr: selectSpecsName || '',
    });
  },

  async addCart() {
    const { spuId, buyNum, isStock } = this.data;
    const db = wx.cloud.database();
    const _ = db.command;

    if (!isStock) {
      Toast({ context: this, selector: '#t-toast', message: '该商品暂时缺货', duration: 1500 });
      return;
    }

    wx.showLoading({ title: '正在加入购物车', mask: true });

    try {
      const cartRes = await db.collection('cart').where({ spuId: spuId }).get();

      if (cartRes.data.length > 0) {
        const recordId = cartRes.data[0]._id;
        await db.collection('cart').doc(recordId).update({
          data: {
            quantity: _.inc(buyNum),
            updatedAt: db.serverDate()
          }
        });
      } else {
        await db.collection('cart').add({
          data: {
            spuId: spuId,
            quantity: buyNum,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        });
      }

      wx.hideLoading();
      Toast({ context: this, selector: '#t-toast', message: '成功加入购物车', duration: 1000 });
      this.handlePopupHide();

    } catch (err) {
      wx.hideLoading();
      console.error('购物车存入失败：', err);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  gotoBuy() {
    const { details, buyNum, spuId } = this.data;
    this.handlePopupHide();

    const query = {
      quantity: buyNum,
      storeId: '1',
      spuId: spuId,
      goodsName: details.title,
      skuId: spuId,
      price: details.price,
      specInfo: [],
      primaryImage: this.data.primaryImage,
      thumb: this.data.primaryImage,
      title: details.title,
    };

    const urlQueryStr = `?goodsRequestList=${JSON.stringify([query])}`;
    wx.navigateTo({ url: `/pages/order/order-confirm/index${urlQueryStr}` });
  },

  specsConfirm() {
    if (this.data.buyType === 1) {
      this.gotoBuy();
    } else {
      this.addCart();
    }
  },

  changeNum(e) {
    const num = e.detail.buyNum || e.detail.value;
    if (num) {
      this.setData({
        buyNum: num,
        selectedAttrStr: `件`
      });
    }
  },

  closePromotionPopup() {
    this.setData({ isShowPromotionPop: false });
  },

  promotionChange(e) {
    const { index } = e.detail;
    wx.navigateTo({ url: `/pages/promotion/promotion-detail/index?promotion_id=${index}` });
  },

  showPromotionPopup() {
    this.setData({ isShowPromotionPop: true });
  },

  // ✨ 核心优化：增加 Loading 和 错误处理
  async getDetail(spuId) {
    wx.showLoading({ title: '加载中...', mask: true }); // 防止用户在白屏期间乱点
    const db = wx.cloud.database();
    try {
      const res = await db.collection('goods').doc(spuId).get();
      const details = res.data;

      if (!details.images || details.images.length === 0) {
        details.images = details.thumb ? [details.thumb] : [];
      }

      const virtualSku = {
        skuId: spuId,
        quantity: details.stock || 0,
        price: details.price,
        specInfo: [],
      };

      this.setData({
        details,
        spuId: spuId,
        isAllSelectedSku: true,
        selectItem: virtualSku,
        skuArray: [virtualSku],
        selectedAttrStr: '件',
        primaryImage: details.thumb || details.images[0],
        specImg: details.thumb || details.images[0],
        minSalePrice: details.price,
        maxSalePrice: details.price,
        isStock: (details.stock || 0) > 0,
        soldNum: details.soldNum || 0,
        isLoading: false // 数据加载完成
      });
    } catch (err) {
      console.error('获取详情失败', err);
      wx.showToast({ title: '商品已下架', icon: 'error' });
    } finally {
      wx.hideLoading(); // 无论成功失败，关闭 loading
    }
  },

  onShareAppMessage() {
    const { selectedAttrStr } = this.data;
    let shareSubTitle = '';
    if (selectedAttrStr.indexOf('件') > -1) {
      const count = selectedAttrStr.indexOf('件');
      shareSubTitle = selectedAttrStr.slice(count + 1, selectedAttrStr.length);
    }
    return {
      imageUrl: this.data.primaryImage,
      title: this.data.details.title + shareSubTitle,
      path: `/pages/goods/details/index?spuId=${this.data.spuId}`,
    };
  },

  onLoad(query) {
    const { spuId } = query;
    this.setData({ spuId: spuId });
    // 原来这里有 3 个请求导致卡顿，现在只保留了获取详情 1 个请求
    this.getDetail(spuId);
  },
});