// services/cart/cart.js

// 封装获取购物车列表的服务
export async function fetchCartList() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'cartOperation',
      data: { action: 'getCartList' }
    });
    return res.result;
  } catch (err) {
    console.error('Service层请求购物车失败:', err);
    throw err; // 将错误抛给页面层处理
  }
}

// 封装清空购物车的服务
export async function clearCart(cartIds) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'cartOperation',
      data: { action: 'clearCart', payload: { cartIds } }
    });
    return res.result;
  } catch (err) {
    throw err;
  }
}