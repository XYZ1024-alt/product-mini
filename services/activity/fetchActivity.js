import { config } from '../../config/index';

/** 获取活动列表 */
export function fetchActivity(ID = 0) {
  if (config.useMock) {
    return mockFetchActivity(ID);
  }

  return new Promise((resolve) => {
    resolve('real api');
  });
}
