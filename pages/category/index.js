Page({
  data: {
    list: [],
    activeCategoryIndex: 0,
    isLoading: false // 增加防抖锁，防止用户频繁上拉导致重复请求
  },

  onLoad() {
    this.init();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
  },

  async init() {
    if (wx.cloud) {
      wx.cloud.init();
    }

    const cachedCategories = wx.getStorageSync('categories_cache');
    if (cachedCategories && cachedCategories.length > 0 && cachedCategories[0].hasMore !== undefined) {
      this.setData({ list: cachedCategories });
      this.loadGoodsForCategory(0, cachedCategories[0]._id);
      this.fetchCategoriesFromCloud(false);
      return;
    }

    wx.showLoading({ title: '加载中...', mask: true });
    await this.fetchCategoriesFromCloud(true);
  },

  async fetchCategoriesFromCloud(needLoadGoods = false) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getCategoryData',
        data: { action: 'getCategories' }
      });

      if (res.result && res.result.success) {
        const categories = res.result.data.map(item => ({
          _id: item._id,
          name: item.name,
          children: [],
          page: 1,
          hasMore: true
        }));

        this.setData({ list: categories });
        wx.setStorageSync('categories_cache', categories);

        if (needLoadGoods && categories.length > 0) {
          await this.loadGoodsForCategory(0, categories[0]._id);
        }
      }
    } catch (error) {
      console.error('初始化分类失败:', error);
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 加载具体分类的商品
  async loadGoodsForCategory(index, categoryId) {
    const category = this.data.list[index];

    // 如果正在加载中，或者该分类已经没有更多数据了，直接 return
    if (this.data.isLoading || !category.hasMore) return;

    this.setData({ isLoading: true });
    // 如果是第一页显示大 loading 框，后续分页可以在底部显示小 loading 或静默拉取
    if (category.page === 1) {
      wx.showLoading({ title: '加载商品...', mask: true });
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'getCategoryData',
        data: {
          action: 'getGoodsByCategory',
          categoryId: categoryId,
          page: category.page, // 传入当前分类的页码
          pageSize: 20         // 每次拉取 20 条
        }
      });

      if (res.result && res.result.success) {
        const newGoodsList = res.result.data.map(item => ({
          _id: item._id,
          name: item.title,
          thumbnail: item.thumb,
          price: item.price
        }));

        // 拼接路径，准备局部更新数据
        const updateChildrenPath = `list[${index}].children`;
        const updatePagePath = `list[${index}].page`;
        const updateHasMorePath = `list[${index}].hasMore`;

        this.setData({
          // 将新数据 concat 追加到原有数组后面
          [updateChildrenPath]: category.children.concat(newGoodsList),
          [updatePagePath]: category.page + 1,        // 页码 +1
          [updateHasMorePath]: res.result.hasMore     // 更新是否还有更多的状态
        });
      }
    } catch (error) {
      console.error('获取分类商品失败:', error);
      wx.showToast({ title: '拉取失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
      wx.hideLoading();
    }
  },

  // 触底加载更多事件
  onLoadMore() {
    const index = this.data.activeCategoryIndex;
    const category = this.data.list[index];
    // 触发加载
    this.loadGoodsForCategory(index, category._id);
  },

  onChange(e) {
    const index = e.detail.value !== undefined ? e.detail.value : e.detail[0];
    const category = this.data.list[index];

    this.setData({ activeCategoryIndex: index });

    // 只有当该分类从来没有加载过数据，且允许加载时，才去云端拉取
    if (category && category.children.length === 0 && category.hasMore) {
      this.loadGoodsForCategory(index, category._id);
    }
  },

  onChangeCategory(e) {
    const item = e.detail.item;
    wx.navigateTo({
      url: `/pages/goods/details/index?spuId=${item._id}`
    });
  }
});