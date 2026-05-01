import { fetchCategories, fetchGoodsByCategory } from '../../services/good/fetchCategoryList';

Page({
  data: {
    list: [],
    activeCategoryIndex: 0,
    isLoading: false
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

    // 严查缓存的合法性，确保是带有 hasMore 字段的新版数据
    if (cachedCategories && cachedCategories.length > 0 && cachedCategories[0].hasMore !== undefined) {
      this.setData({ list: cachedCategories });
      this.loadGoodsForCategory(0, cachedCategories[0]._id);
      this.fetchCategoriesFromCloud(false);
      return;
    }

    wx.showLoading({ title: '加载中...', mask: true });
    await this.fetchCategoriesFromCloud(true);
  },

  // 获取分类列表
  async fetchCategoriesFromCloud(needLoadGoods = false) {
    try {
      // 核心修改：调用 Service 层接口，页面层不再感知 wx.cloud
      const result = await fetchCategories();

      if (result && result.success) {
        const categories = result.data.map(item => ({
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

  // 加载具体分类的商品（支持分页拉取）
  async loadGoodsForCategory(index, categoryId) {
    const category = this.data.list[index];

    if (this.data.isLoading || !category.hasMore) return;

    this.setData({ isLoading: true });
    if (category.page === 1) {
      wx.showLoading({ title: '加载商品...', mask: true });
    }

    try {
      // 核心修改：调用 Service 层接口，传入参数
      const result = await fetchGoodsByCategory(categoryId, category.page, 20);

      if (result && result.success) {
        const newGoodsList = result.data.map(item => ({
          _id: item._id,
          name: item.title,
          thumbnail: item.thumb,
          price: item.price
        }));

        const updateChildrenPath = `list[${index}].children`;
        const updatePagePath = `list[${index}].page`;
        const updateHasMorePath = `list[${index}].hasMore`;

        this.setData({
          [updateChildrenPath]: category.children.concat(newGoodsList),
          [updatePagePath]: category.page + 1,
          [updateHasMorePath]: result.hasMore
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
    this.loadGoodsForCategory(index, category._id);
  },

  onChange(e) {
    const index = e.detail.value !== undefined ? e.detail.value : e.detail[0];
    const category = this.data.list[index];

    this.setData({ activeCategoryIndex: index });

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