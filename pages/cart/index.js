import { fetchCartList, clearCart } from '../../services/cart/cart';
import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    isLogin: false,
    cartGroupData: null,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    const cachedUserInfo = wx.getStorageSync('userInfo');

    if (cachedUserInfo && cachedUserInfo._id) {
      this.setData({ isLogin: true });
      this.fetchData(); // 已登录才去云端拉取购物车数据
    } else {
      // 未登录
      this.setData({
        isLogin: false,
        cartGroupData: null // 清空可能残留的数据
      });
    }
  },

  onGotoLogin() {
    wx.switchTab({
      url: '/pages/usercenter/index'
    });
  },

  onLoad() {},

  // 从云端拉取数据
  fetchData() {
    wx.showNavigationBarLoading();
    this.getCartGroupData().then((res) => {
      wx.hideNavigationBarLoading();
      if (!res || !res.data) return;

      this.setData({ cartGroupData: res.data }, () => {
        this.calculateTotals(); // 数据拉取后，执行一次总价计算
      });
    });
  },

  // 纯本地计算总金额和选中数量，不发网络请求
  calculateTotals() {
    const cartGroupData = this.data.cartGroupData;
    if (!cartGroupData) return;

    let totalAmount = 0;
    let selectedGoodsCount = 0;
    let isAllSelected = cartGroupData.isNotEmpty;

    if (cartGroupData.storeGoods) {
      cartGroupData.storeGoods.forEach(store => {
        store.promotionGoodsList.forEach(activity => {
          activity.goodsPromotionList.forEach(goods => {
            if (goods.isSelected) {
              totalAmount += (Number(goods.price) * Number(goods.quantity));
              selectedGoodsCount += Number(goods.quantity);
            } else {
              isAllSelected = false; // 只要有一个没选中，全选状态就为 false
            }
          });
        });
      });
    }

    cartGroupData.totalAmount = totalAmount;
    cartGroupData.selectedGoodsCount = selectedGoodsCount;
    cartGroupData.isAllSelected = cartGroupData.isNotEmpty ? isAllSelected : false;

    // 触发页面渲染
    this.setData({ cartGroupData });
  },

  async getCartGroupData() {
    const result = await fetchCartList();
    if (result && result.success) {
      const formattedData = this.formatCartData(result.data);
      return { data: formattedData };
    }
    return { data: { isNotEmpty: false, storeGoods: [] } };
  },

  formatCartData(list) {
    const goodsList = list.map(item => {
      const detail = item.goodsDetail || {};
      return {
        _id: item._id,
        spuId: item.spuId,
        skuId: item.spuId,
        title: detail.title || '未知商品',
        thumb: detail.thumb || (detail.images ? detail.images[0] : ''),
        price: detail.price || 0,
        num: item.quantity || 1,
        quantity: item.quantity || 1,
        stockQuantity: detail.stock || 999,
        isSelected: item.isSelected !== undefined ? item.isSelected : true,
      };
    });

    return {
      isNotEmpty: goodsList.length > 0,
      storeGoods: [{
        storeId: 'default_store',
        storeName: '自营商城',
        isSelected: goodsList.every(g => g.isSelected),
        promotionGoodsList: [{
          goodsPromotionList: goodsList
        }],
        shortageGoodsList: [],
      }],
      invalidGoodItems: [],
    };
  },

  findGoods(spuId, skuId) {
    const { storeGoods } = this.data.cartGroupData;
    for (const store of storeGoods) {
      for (const activity of store.promotionGoodsList) {
        for (const goods of activity.goodsPromotionList) {
          if (goods.spuId === spuId && goods.skuId === skuId) {
            return { currentStore: store, currentGoods: goods };
          }
        }
      }
    }
    return {};
  },

  // 单独勾选商品
  onGoodsSelect(e) {
    const { goods: { spuId, skuId, _id }, isSelected } = e.detail;

    // 1. 本地更新状态并重新计算总价
    const { currentGoods } = this.findGoods(spuId, skuId);
    if (currentGoods) {
      currentGoods.isSelected = isSelected;
      this.calculateTotals(); // 这里的关键修改：不请求网络，仅本地重算
    }

    // 2. 静默同步到云端
    wx.cloud.callFunction({
      name: 'cartOperation',
      data: {
        action: 'updateSelectStatus',
        payload: { cartIds: [_id], isSelected }
      }
    }).catch(err => console.error('同步选中状态失败', err));
  },

  // 全选/取消全选
  onSelectAll(event) {
    const { isAllSelected } = event?.detail ?? {};
    const { storeGoods } = this.data.cartGroupData;
    const allCartIds = [];

    storeGoods.forEach(store => {
      store.promotionGoodsList.forEach(activity => {
        activity.goodsPromotionList.forEach(goods => {
          goods.isSelected = !isAllSelected;
          allCartIds.push(goods._id);
        });
      });
    });

    this.calculateTotals();

    if (allCartIds.length > 0) {
      wx.cloud.callFunction({
        name: 'cartOperation',
        data: {
          action: 'updateSelectStatus',
          payload: { cartIds: allCartIds, isSelected: !isAllSelected }
        }
      });
    }
  },

  // 修改数量
  onQuantityChange(e) {
    const { goods: { spuId, skuId, _id }, quantity } = e.detail;
    const { currentGoods } = this.findGoods(spuId, skuId);
    const stockQuantity = currentGoods.stockQuantity || 0;

    if (quantity > stockQuantity) {
      Toast({ context: this, selector: '#t-toast', message: '库存不足' });
      return;
    }

    currentGoods.quantity = quantity;
    currentGoods.num = quantity;
    this.calculateTotals();

    wx.cloud.callFunction({
      name: 'cartOperation',
      data: {
        action: 'updateQuantity',
        payload: { cartId: _id, quantity }
      }
    });
  },

  onClearCart() {
    const { storeGoods } = this.data.cartGroupData;
    const allIds = [];
    storeGoods.forEach(store => {
      store.promotionGoodsList.forEach(promo => {
        promo.goodsPromotionList.forEach(goods => {
          if (goods._id) allIds.push(goods._id);
        });
      });
    });

    if (allIds.length === 0) return;

    wx.showModal({
      title: '提示',
      content: '确定要清空购物车吗？',
      confirmColor: '#FA4126',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '正在清空...' });
          try {
            await wx.cloud.callFunction({
              name: 'cartOperation',
              data: { action: 'clearCart', payload: { cartIds: allIds } }
            });
            wx.hideLoading();
            wx.showToast({ title: '已清空', icon: 'success' });
            this.fetchData(); // 数据库被清空，重新拉取以显示空页面
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '清空失败', icon: 'none' });
          }
        }
      }
    });
  },

  async onGoodsDelete(e) {
    const { goods } = e.detail;
    if (!goods._id) return;

    wx.showModal({
      title: '提示',
      content: '确认删除该商品吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '正在删除' });
          try {
            await wx.cloud.callFunction({
              name: 'cartOperation',
              data: { action: 'deleteGoods', payload: { cartId: goods._id } }
            });
            wx.hideLoading();
            this.fetchData(); // 数据库删除了节点，重新拉取同步
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  goGoodsDetail(e) {
    const { spuId, storeId } = e.detail.goods;
    wx.navigateTo({
      url: `/pages/goods/details/index?spuId=${spuId}&storeId=${storeId}`,
    });
  },

  onToSettle() {
    const goodsRequestList = [];
    this.data.cartGroupData.storeGoods.forEach((store) => {
      store.promotionGoodsList.forEach((promotion) => {
        promotion.goodsPromotionList.forEach((m) => {
          if (m.isSelected) goodsRequestList.push(m);
        });
      });
    });

    if (goodsRequestList.length === 0) {
      Toast({ context: this, selector: '#t-toast', message: '请先选择商品' });
      return;
    }

    wx.setStorageSync('order.goodsRequestList', JSON.stringify(goodsRequestList));
    wx.navigateTo({ url: '/pages/order/order-confirm/index?type=cart' });
  },

  onGotoHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },
});