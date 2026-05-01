let addressPromise = [];

export const getAddressPromise = () => {
  let resolver;
  let rejecter;
  const nextPromise = new Promise((resolve, reject) => {
    resolver = resolve;
    rejecter = reject;
  });
  addressPromise.push({ resolver, rejecter });
  return nextPromise;
};

export const resolveAddress = (address) => {
  const allAddress = [...addressPromise];
  addressPromise = [];
  allAddress.forEach(({ resolver }) => resolver(address));
};

export const rejectAddress = () => {
  const allAddress = [...addressPromise];
  addressPromise = [];
  allAddress.forEach(({ rejecter }) => rejecter(new Error('cancel')));
};

export async function commitAddress(data, id) {
  try {
    const payload = {
      _id: id || '',
      name: data.name,
      phone: data.phone || data.phoneNumber, // 兼容处理：确保能拿到手机号
      provinceName: data.provinceName,
      cityName: data.cityName,
      districtName: data.districtName || data.countyName, // 兼容处理：确保能拿到区县
      detailAddress: data.detailAddress,
      isDefault: data.isDefault ? 1 : 0,
      addressTag: data.addressTag || ''
    };

    const res = await wx.cloud.callFunction({
      name: 'saveAddress',
      data: payload
    });

    if (res.result && res.result.code === 0) {
      return true;
    } else {
      throw new Error(res.result ? res.result.msg : '保存失败');
    }
  } catch (err) {
    console.error('提交地址失败：', err);
    throw err;
  }
}

export async function deleteAddress(id) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'deleteAddress',
      data: {
        _id: id
      }
    });

    if (res.result && res.result.code === 0) {
      return true;
    } else {
      throw new Error(res.result ? res.result.msg : '删除失败');
    }
  } catch (err) {
    console.error('删除地址失败：', err);
    throw err;
  }
}