import { config } from '../../config/index';

/** 获取商品评论 */
export function fetchComments(params) {
  if (config.useMock) {
    return mockFetchComments(params);
  }
  return new Promise((resolve) => {
    resolve('real api');
  });
}
