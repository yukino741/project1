const app = getApp();

// ★★★ 这里的 IP 地址非常重要 ★★★
// 1. 如果是电脑模拟器：用 http://127.0.0.1:8000
// 2. 如果是真机预览：用电脑局域网 IP，如 http://192.168.1.x:8000 (确保手机电脑同WiFi)
const SERVER_URL = 'http://127.0.0.1:8000'; 

Page({
  data: {
    resultText: "",        // AI 的推荐语
    foodList: [],          // 推荐的菜品列表
    isLoading: false,      // 是否正在加载
    currentMeal: ""        // 当前选择的餐点 (breakfast/lunch/dinner)
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  // --- 按钮点击事件 ---
  onGetBreakfast() { this.fetchRecommendation('breakfast'); },
  onGetLunch() { this.fetchRecommendation('lunch'); },
  onGetDinner() { this.fetchRecommendation('dinner'); },

  // --- 核心请求逻辑 ---
  fetchRecommendation: function(timeOfDay) {
    // 1. 获取 ID (优先从 input 页面保存的 Storage 取)
    let userId = wx.getStorageSync('user_id');
    
    // 如果还没生成过 ID (即用户从没去过设置页)，尝试用 Guest
    if (!userId) {
       // 这里其实可以提示用户去设置，或者先用一个默认 Guest 试试
       userId = "Guest"; 
    }

    this.setData({ 
      isLoading: true, 
      resultText: "", // 清空上一次结果
      foodList: [],
      currentMeal: timeOfDay 
    });

    wx.request({
      url: `${SERVER_URL}/recommend`,
      method: 'POST',
      data: {
        user_id: userId,
        time_of_day: timeOfDay,
        top_k: 3 
      },
      success: (res) => {
        console.log("后端返回:", res.data);
        if (res.statusCode === 200) {
          const data = res.data;
          
          if (data.error === "User not found") {
             // 特殊处理：用户不存在
             wx.showModal({
               title: '请先设置口味',
               content: 'AI 需要先了解您的口味偏好才能推荐哦。请去“输入”页面保存一下设置。',
               showCancel: false,
               success: () => {
                   // 可选：跳转到设置页
                   // wx.switchTab({ url: '/pages/input/input' })
               }
             });
             this.setData({ resultText: "请先设置您的口味偏好..." });
          } else {
             // 正常显示结果
             this.setData({
               resultText: data.ai_recommendation_text, // 这里是 DeepSeek 生成的话
               foodList: data.details || []
             });
          }
        } else {
          this.setData({ resultText: "服务器累了，请稍后再试。" });
        }
      },
      fail: (err) => {
        console.error("请求失败", err);
        this.setData({ resultText: "网络连接失败，请检查服务器是否开启。" });
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  }
})