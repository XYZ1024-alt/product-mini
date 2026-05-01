import { config } from '../../config/index';

/** 获取商品列表 */
function mockFetchGood(ID = 0) {
  const { delay } = require('../_utils/delay');
  const { genGood } = require('../../model/good');
  return delay().then(() => genGood(ID));
}

/** 获取商品列表 */
export function fetchGood(ID = 0) {
  if (config.useMock) {
    return mockFetchGood(ID);
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
