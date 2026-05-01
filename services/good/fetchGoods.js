import { config } from '../../config/index';

/** 获取商品列表 */
export function fetchGoodsList(pageIndex = 1, pageSize = 20) {
  if (config.useMock) {
    return mockFetchGoodsList(pageIndex, pageSize);
  }

  const db = wx.cloud.database();

  return new Promise((resolve) => {
    db.collection('goods')
        .where({ status: 1 })
        .get()
        .then(res => {
          const adaptedData = res.data.map(item => {
            return {
              spuId: item._id,
              title: item.title,
              thumb: item.thumb,
              price: item.price,
              originPrice: item.originPrice,
              tags: item.tags,
            };
          });

          resolve({
            spuList: adaptedData,
            totalCount: adaptedData.length
          });
        })
        .catch(err => {
          console.error('获取商品失败', err);
          reject(err);
        });
  });
}
