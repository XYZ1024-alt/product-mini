/** 获取收货地址列表 */
export async function fetchDeliveryAddressList() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'getAddressList'
    });

    if (res.result && res.result.code === 0) {
      // 格式化为前端组件渲染所需的结构
      return res.result.data.map((address) => ({
        ...address,
        phoneNumber: address.phone, // 映射到组件需要的字段
        countyName: address.districtName, // 映射区县字段
        address: `${address.provinceName}${address.cityName}${address.districtName || ''}${address.detailAddress}`,
      }));
    }
    return [];
  } catch (err) {
    console.error('获取地址列表失败：', err);
    throw err;
  }
}

/** 获取单个收货地址详情 */
export async function fetchDeliveryAddress(id) {
  if (!id) return null;

  try {
    // 因为目前没有单独的 getAddressDetail 云函数，直接拉取列表并在前端匹配
    const res = await wx.cloud.callFunction({
      name: 'getAddressList'
    });

    if (res.result && res.result.code === 0) {
      const target = res.result.data.find(item => item._id === id);
      if (target) {
        // 同样做一下字段映射
        target.phoneNumber = target.phone;
        target.countyName = target.districtName;
        return target;
      }
    }
    return null;
  } catch (err) {
    console.error('获取地址详情失败：', err);
    throw err;
  }
}