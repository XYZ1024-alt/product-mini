import Dialog from 'tdesign-miniprogram/dialog/index';
import Toast from 'tdesign-miniprogram/toast/index';
import { fetchCartGroupData } from '../../services/cart/cart';

Page({
  data: {
    cartGroupData: null,
  },

  // 调用自定义tabbar的init函数，使页面与tabbar激活状态保持一致
  onShow() {
    this.getTabBar().init();
  },

  onLoad() {
    this.refreshData();
  },

  refreshData() {
    this.getCartGroupData().then((res) => {
      if (!res || !res.data) return;
      const cartGroupData = res.data;

      // 统计总金额和选中数量[cite: 1]
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
                isAllSelected = false;
              }
            });
          });
        });
      }

      cartGroupData.totalAmount = totalAmount;
      cartGroupData.selectedGoodsCount = selectedGoodsCount;
      cartGroupData.isAllSelected = isAllSelected;

      // 最终渲染[cite: 1]
      this.setData({ cartGroupData });
    });
  },

  findGoods(spuId, skuId) {
    let currentStore;
    let currentActivity;
    let currentGoods;
    const { storeGoods } = this.data.cartGroupData;
    for (const store of storeGoods) {
      for (const activity of store.promotionGoodsList) {
        for (const goods of activity.goodsPromotionList) {
          if (goods.spuId === spuId && goods.skuId === skuId) {
            currentStore = store;
            currentActivity = currentActivity;
            currentGoods = goods;
            return {
              currentStore,
              currentActivity,
              currentGoods,
            };
          }
        }
      }
    }
    return {
      currentStore,
      currentActivity,
      currentGoods,
    };
  },

  formatCartData(list) {
    const goodsList = list.map(item => {
      const detail = item.goodsDetail || {};
      return {
        _id: item._id,
        spuId: item.spuId,
        skuId: item.spuId,
        title: detail.title || '未知商品',
        thumb: detail.thumb || (detail.images ? detail.images[0] : ''), // 保证不是 null
        price: detail.price || 0,
        num: item.quantity || 1,        // 组件显示数量用 num
        quantity: item.quantity || 1,   // 逻辑计算用
        stockQuantity: detail.stock || 999, // 必须大于 0
        isSelected: item.isSelected !== undefined ? item.isSelected : true,
      };
    });

    return {
      isNotEmpty: goodsList.length > 0, // 触发 wxml 中的渲染条件[cite: 3]
      storeGoods: [{
        storeId: 'default_store',
        storeName: '全选',
        isSelected: true,
        promotionGoodsList: [{          // 必须叫这个名字
          goodsPromotionList: goodsList // 必须叫这个名字[cite: 10]
        }],
        shortageGoodsList: [],          // 必须初始化为空数组[cite: 1]
      }],
      invalidGoodItems: [],             // 必须初始化为空数组[cite: 1]
    };
  },

  async onClearCart() {
    const { storeGoods } = this.data.cartGroupData;

    // 1. 提取出当前页面显示的所有购物车记录 ID
    const allIds = [];
    storeGoods.forEach(store => {
      store.promotionGoodsList.forEach(promo => {
        promo.goodsPromotionList.forEach(goods => {
          if (goods._id) allIds.push(goods._id);
        });
      });
    });

    if (allIds.length === 0) return;

    // 2. 弹出确认框
    wx.showModal({
      title: '提示',
      content: '确定要清空购物车吗？',
      confirmColor: '#FA4126',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '正在清空...' });
            const db = wx.cloud.database();

            // 3. 批量删除（并发执行）
            const deleteTasks = allIds.map(id => {
              return db.collection('cart').doc(id).remove();
            });

            await Promise.all(deleteTasks);

            wx.hideLoading();
            wx.showToast({ title: '已清空', icon: 'success' });

            // 4. ✨ 关键：删除完成后刷新页面，页面会因为 isNotEmpty 为 false 进入空状态[cite: 1]
            this.refreshData();

          } catch (err) {
            wx.hideLoading();
            console.error('清空失败：', err);
            wx.showToast({ title: '清空失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 注：实际场景时应该调用接口获取购物车数据
  async getCartGroupData() {
    const db = wx.cloud.database();
    try {
      // 1. 读取购物车集合数据
      const cartRes = await db.collection('cart').get();
      const cartList = cartRes.data;

      if (cartList.length === 0) {
        return { data: { isNotEmpty: false, storeGoods: [] } };
      }

      // 2. 收集所有 spuId 去商品表查详情
      const spuIds = cartList.map(item => item.spuId);
      const goodsRes = await db.collection('goods').where({
        _id: db.command.in(spuIds)
      }).get();
      const goodsDetailList = goodsRes.data;

      // 3. 合并数据：将详情塞进对应的购物车项中
      const fullList = cartList.map(cartItem => {
        const detail = goodsDetailList.find(g => g._id === cartItem.spuId);
        return {
          ...cartItem,
          goodsDetail: detail
        };
      }).filter(item => item.goodsDetail); // 过滤无详情的异常数据

      // 4. 调用格式化函数转换结构[cite: 1]
      const formattedData = this.formatCartData(fullList);
      return { data: formattedData };

    } catch (err) {
      console.error('数据库读取失败:', err);
      return { data: { isNotEmpty: false, storeGoods: [] } };
    }
  },

  // 选择单个商品
  // 注：实际场景时应该调用接口更改选中状态
  selectGoodsService({ spuId, skuId, isSelected }) {
    this.findGoods(spuId, skuId).currentGoods.isSelected = isSelected;
    return Promise.resolve();
  },

  // 全选门店
  // 注：实际场景时应该调用接口更改选中状态
  selectStoreService({ storeId, isSelected }) {
    const currentStore = this.data.cartGroupData.storeGoods.find((s) => s.storeId === storeId);
    currentStore.isSelected = isSelected;
    currentStore.promotionGoodsList.forEach((activity) => {
      activity.goodsPromotionList.forEach((goods) => {
        goods.isSelected = isSelected;
      });
    });
    return Promise.resolve();
  },

  // 加购数量变更
  // 注：实际场景时应该调用接口
  changeQuantityService({ spuId, skuId, quantity }) {
    this.findGoods(spuId, skuId).currentGoods.quantity = quantity;
    return Promise.resolve();
  },

  // 删除加购商品
  // 注：实际场景时应该调用接口
  deleteGoodsService({ spuId, skuId }) {
    function deleteGoods(group) {
      for (const gindex in group) {
        const goods = group[gindex];
        if (goods.spuId === spuId && goods.skuId === skuId) {
          group.splice(gindex, 1);
          return gindex;
        }
      }
      return -1;
    }
    const { storeGoods, invalidGoodItems } = this.data.cartGroupData;
    for (const store of storeGoods) {
      for (const activity of store.promotionGoodsList) {
        if (deleteGoods(activity.goodsPromotionList) > -1) {
          return Promise.resolve();
        }
      }
      if (deleteGoods(store.shortageGoodsList) > -1) {
        return Promise.resolve();
      }
    }
    if (deleteGoods(invalidGoodItems) > -1) {
      return Promise.resolve();
    }
    return Promise.reject();
  },

  // 清空失效商品
  // 注：实际场景时应该调用接口
  clearInvalidGoodsService() {
    this.data.cartGroupData.invalidGoodItems = [];
    return Promise.resolve();
  },

  onGoodsSelect(e) {
    const {
      goods: { spuId, skuId },
      isSelected,
    } = e.detail;
    const { currentGoods } = this.findGoods(spuId, skuId);
    Toast({
      context: this,
      selector: '#t-toast',
      message: `${isSelected ? '选择' : '取消'}"${
        currentGoods.title.length > 5 ? `${currentGoods.title.slice(0, 5)}...` : currentGoods.title
      }"`,
      icon: '',
    });
    this.selectGoodsService({ spuId, skuId, isSelected }).then(() => this.refreshData());
  },

  onStoreSelect(e) {
    const {
      store: { storeId },
      isSelected,
    } = e.detail;
    this.selectStoreService({ storeId, isSelected }).then(() => this.refreshData());
  },

  onQuantityChange(e) {
    const {
      goods: { spuId, skuId },
      quantity,
    } = e.detail;
    const { currentGoods } = this.findGoods(spuId, skuId);
    const stockQuantity = currentGoods.stockQuantity > 0 ? currentGoods.stockQuantity : 0; // 避免后端返回的是-1
    // 加购数量超过库存数量
    if (quantity > stockQuantity) {
      // 加购数量等于库存数量的情况下继续加购
      if (currentGoods.quantity === stockQuantity && quantity - stockQuantity === 1) {
        Toast({
          context: this,
          selector: '#t-toast',
          message: '当前商品库存不足',
        });
        return;
      }
      Dialog.confirm({
        title: '商品库存不足',
        content: `当前商品库存不足，最大可购买数量为${stockQuantity}件`,
        confirmBtn: '修改为最大可购买数量',
        cancelBtn: '取消',
      })
        .then(() => {
          this.changeQuantityService({
            spuId,
            skuId,
            quantity: stockQuantity,
          }).then(() => this.refreshData());
        })
        .catch(() => {});
      return;
    }
    this.changeQuantityService({ spuId, skuId, quantity }).then(() => this.refreshData());
  },

  goCollect() {
    /** 活动肯定有一个活动ID，用来获取活动banner，活动商品列表等 */
    const promotionID = '123';
    wx.navigateTo({
      url: `/pages/promotion/promotion-detail/index?promotion_id=${promotionID}`,
    });
  },

  goGoodsDetail(e) {
    const { spuId, storeId } = e.detail.goods;
    wx.navigateTo({
      url: `/pages/goods/details/index?spuId=${spuId}&storeId=${storeId}`,
    });
  },

  clearInvalidGoods() {
    // 实际场景时应该调用接口清空失效商品
    this.clearInvalidGoodsService().then(() => this.refreshData());
  },

  async onGoodsDelete(e) {
    const { goods } = e.detail;

    // 调试：如果这里打印出 undefined，说明 formatCartData 还是没改对
    console.log('准备删除的商品数据:', goods);

    if (!goods._id) {
      wx.showToast({ title: '删除失败：未找到记录ID', icon: 'none' });
      return;
    }

    const db = wx.cloud.database();
    wx.showModal({
      title: '提示',
      content: '确认删除该商品吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '正在删除' });

            // 使用确定的 goods._id 进行删除[cite: 1]
            await db.collection('cart').doc(goods._id).remove();

            wx.hideLoading();
            this.refreshData(); // 刷新页面[cite: 1]

          } catch (err) {
            wx.hideLoading();
            console.error('删除操作报错:', err);
          }
        }
      }
    });
  },

  onSelectAll(event) {
    const { isAllSelected } = event?.detail ?? {};
    Toast({
      context: this,
      selector: '#t-toast',
      message: `${isAllSelected ? '取消' : '点击'}了全选按钮`,
    });
    // 调用接口改变全选
  },

  onToSettle() {
    const goodsRequestList = [];
    this.data.cartGroupData.storeGoods.forEach((store) => {
      store.promotionGoodsList.forEach((promotion) => {
        promotion.goodsPromotionList.forEach((m) => {
          if (m.isSelected == 1) {
            goodsRequestList.push(m);
          }
        });
      });
    });
    wx.setStorageSync('order.goodsRequestList', JSON.stringify(goodsRequestList));
    wx.navigateTo({ url: '/pages/order/order-confirm/index?type=cart' });
  },
  onGotoHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },
});
