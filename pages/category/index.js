Page({
  data: {
    list: [],
  },

  onLoad() {
    this.init();
  },

  onShow() {
    this.getTabBar().init();
  },

  async init() {
    try {
      const db = wx.cloud.database();
      // 获取分类表数据，并按 sort 排序
      const res = await db.collection('categories').orderBy('sort', 'asc').get();

      const categories = res.data.map(item => ({
        _id: item._id,
        name: item.name,
        children: []
      }));

      this.setData({
        list: categories,
      });

      if (categories.length > 0) {
        this.loadGoodsForCategory(0, categories[0]._id);
      }
    } catch (error) {
      console.error('初始化分类失败:', error);
    }
  },

  async loadGoodsForCategory(index, categoryId) {
    const db = wx.cloud.database();
    const MAX_LIMIT = 20; // 微信小程序端每次查询的限制数

    try {
      // 1. 先查询该分类下的商品总数
      const countResult = await db.collection('goods').where({
        categoryId: categoryId.trim()
      }).count();
      const total = countResult.total;

      if (total === 0) {
        console.warn('该分类下没有查询到商品');
        return;
      }

      // 2. 计算需要分几次来查询 (例如 38/20，向上取整需要查 2 次)
      const batchTimes = Math.ceil(total / MAX_LIMIT);
      const tasks = [];

      // 3. 循环组装所有的查询请求
      for (let i = 0; i < batchTimes; i++) {
        const promise = db.collection('goods').where({
          categoryId: categoryId.trim()
        })
            .skip(i * MAX_LIMIT) // 第一批跳过 0 条，第二批跳过 20 条
            .limit(MAX_LIMIT)
            .get();

        tasks.push(promise);
      }

      // 4. 发起所有查询并等待完成，然后拼接数据
      const results = await Promise.all(tasks);
      let allGoodsData = [];
      for (let i = 0; i < results.length; i++) {
        allGoodsData = allGoodsData.concat(results[i].data);
      }

      // 5. 将拼装后的所有数据格式化
      const goodsList = allGoodsData.map(item => ({
        _id: item._id,
        name: item.title,
        thumbnail: item.thumb,
        price: item.price
      }));

      // 6. 更新到当前分类的 children 数组中
      const updatePath = `list[${index}].children`;
      this.setData({ [updatePath]: goodsList });

    } catch (error) {
      console.error('获取分类商品失败:', error);
    }
  },

  onChange(e) {
    const index = e.detail.value !== undefined ? e.detail.value : e.detail[0];
    const category = this.data.list[index];

    this.setData({
      activeCategoryIndex: index
    });

    if (category && (!category.children || category.children.length === 0)) {
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