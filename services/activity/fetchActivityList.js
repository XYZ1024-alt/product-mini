import { config } from '../../config/index';

/** 获取活动列表 */
export function fetchActivityList(pageIndex = 1, pageSize = 20) {
  if (config.useMock) {
    return mockFetchActivityList(pageIndex, pageSize);
  }

  return new Promise((resolve) => {
    resolve('real api');
  });
}
