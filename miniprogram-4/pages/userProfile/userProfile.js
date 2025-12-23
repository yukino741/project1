Page({
    data: {
      userInfo: null,
      stand: null,
    },
  
    onLoad: function() {
      // 获取用户信息
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo) {
        wx.redirectTo({
          url: '/pages/index/index'
        });
        return;
      }
  
      // 获取替身数据
      const stands = wx.getStorageSync('userStands') || [];
      const stand = stands[0] || {
        power: 'None',
        speed: 'None',
        range: 'None',
        stamina: 'None',
        precision: 'None',
        potential: 'None',
      };
  
      this.setData({
        userInfo: userInfo,
        stand: stand,
      });

      // 可以在控制台查看获取到的数据
      console.log('用户信息:', userInfo);
    },
  
    onShow: function() {
      // 页面显示时刷新替身数据和用户信息
      const stands = wx.getStorageSync('userStands') || [];
      const userInfo = wx.getStorageSync('userInfo');

      if (stands[0]) {
        this.setData({
          stand: stands[0]
        });
      }

      if (userInfo) {
        this.setData({
          userInfo: userInfo,
        });
      }
    },
  
    editStand: function() {
      wx.navigateTo({
        url: '/pages/input/input'
      });
    }
});