import { config } from '../../../config/index';

/** 获取评价详情 */
export function getCommentDetail(params) {
  if (config.useMock) {
    return mockQueryCommentDetail(params);
  }
  return new Promise((resolve) => {
    resolve('real api');
  });
}
