const app = getApp();

// ★★★ 请根据环境修改这里 ★★★
// 1. 电脑模拟器调试: 'http://127.0.0.1:8000'
// 2. 真机调试: 'http://192.168.x.x:8000' (电脑局域网IP)
// 3. 生产发布: 'https://你的域名.com'
const SERVER_URL = 'http://127.0.0.1:8000'; 

Page({
  data: {
    cantin: '',           
    foodName: '',         
    content: '',          
    imageList: [],        
    canSubmit: false,     
    stands: null,
    currentUser: '',      // 当前登录用户
  },

  onLoad: function() {
    // 1. 获取六维图数据 (如果有)
    const stands = wx.getStorageSync('userStands') || [];
    if (stands[0]) {
      this.setData({ stands: stands[0] });
    }

    // 2. 尝试获取用户信息/用户名
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (userInfo && userInfo.loginUser) {
        this.setData({ currentUser: userInfo.loginUser });
    } else {
        // 尝试从 user_id 获取
        const uid = wx.getStorageSync('user_id');
        this.setData({ currentUser: uid || 'Guest' });
    }
  },

  // 获取当前格式化时间
  getCurrentTime() {
    const now = new Date();
    const pad = (n) => n < 10 ? '0' + n : n;
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  },

  // --- 输入监听 ---
  onCantinInput(e) {
    this.setData({ cantin: e.detail.value });
    this.checkSubmitStatus();
  },
  onFoodInput(e) {
    this.setData({ foodName: e.detail.value });
    this.checkSubmitStatus();
  },
  onContentInput(e) {
    this.setData({ content: e.detail.value });
    this.checkSubmitStatus();
  },

  checkSubmitStatus() {
    const { cantin, foodName, content } = this.data;
    // 简单的非空校验
    const canSubmit = cantin.trim() && foodName.trim() && content.trim();
    this.setData({ canSubmit });
  },

  chooseImage() {
    const { imageList } = this.data;
    const remaining = 9 - imageList.length;
    wx.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ imageList: [...imageList, ...res.tempFilePaths] });
      }
    });
  },

  // --- 核心修改: 提交发布 ---
  submitPost() {
    if (!this.data.canSubmit) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    // 1. 准备本地数据对象 (保持原有逻辑)
    const userInfo = wx.getStorageSync('userInfo') || {};
    const creatorName = this.data.currentUser || userInfo.nickName || 'Guest';

    const postData = {
      id: Date.now().toString(),
      cantin: this.data.cantin,
      foodName: this.data.foodName,
      content: this.data.content,
      images: this.data.imageList,
      creator: creatorName,
      userInfo: {
        nickName: userInfo.nickName || '匿名用户',
        avatarUrl: userInfo.avatarUrl || '/images/default-avatar.png'
      },
      createTime: this.getCurrentTime(),
      stands: this.data.stands,
      likes: [],
      comments: [],
      shareCount: 0
    };

    wx.showLoading({ title: '发布中...', mask: true });

    // 2. 执行保存
    try {
      // Step A: 存入本地 Storage (离线可用)
      let posts = wx.getStorageSync('posts') || [];
      posts.unshift(postData);
      wx.setStorageSync('posts', posts);

      // Step B: 发送给 AI 后端 (构建向量库)
      const aiCommentData = {
          user_id: creatorName,
          food_name: this.data.foodName,
          comment_text: `${this.data.foodName} ${this.data.content}` // 将菜名和评论拼接，增加向量检索准确度
      };

      wx.request({
          url: `${SERVER_URL}/upload_comment`,
          method: 'POST',
          data: aiCommentData,
          header: { 'content-type': 'application/json' },
          success: (res) => {
              console.log('AI 向量库同步成功:', res.data);
          },
          fail: (err) => {
              console.error('AI 向量库同步失败:', err);
              // 这里不阻断用户，因为本地已经保存成功了
          },
          complete: () => {
              // 无论后端成功失败，只要本地存了就算发布成功
              wx.hideLoading();
              wx.showToast({
                title: '发布成功',
                icon: 'success',
                duration: 1500,
                success: () => {
                  setTimeout(() => {
                    wx.navigateBack({ delta: 1 });
                  }, 1500);
                }
              });
          }
      });

    } catch (e) {
      wx.hideLoading();
      console.error('发布流程异常:', e);
      wx.showToast({ title: '发布出错', icon: 'error' });
    }
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const imageList = this.data.imageList;
    imageList.splice(index, 1);
    this.setData({ imageList });
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.url;
    wx.previewImage({
      current,
      urls: this.data.imageList
    });
  }
});