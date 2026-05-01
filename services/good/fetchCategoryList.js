/**
 * 获取分类左侧的菜单列表
 */
export async function fetchCategories() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'getCategoryData',
      data: { action: 'getCategories' }
    });
    return res.result;
  } catch (err) {
    console.error('Service层获取分类失败:', err);
    throw err; // 抛出异常让页面层捕获
  }
}

/**
 * 分页获取某个分类下的商品列表
 * @param {String} categoryId 分类ID
 * @param {Number} page 当前页码
 * @param {Number} pageSize 每页拉取数量
 */
export async function fetchGoodsByCategory(categoryId, page = 1, pageSize = 20) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'getCategoryData',
      data: {
        action: 'getGoodsByCategory',
        categoryId: categoryId,
        page: page,
        pageSize: pageSize
      }
    });
    return res.result;
  } catch (err) {
    console.error('Service层获取分类商品失败:', err);
    throw err;
  }
}