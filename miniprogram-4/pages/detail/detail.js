const app = getApp();

Page({
  data: {
    post: null,
    userInfo: null,  // 用户完整信息
    stands: null,    // 用户的口味偏好
    commentContent: '',
    focus: false,
    currentTime: '2025-06-11 19:59:18',
    currentUser: null  // 修改：不再硬编码，初始为 null
  },

  // --- 新增：统一获取用户身份（逻辑同 index.js） ---
  getEffectiveUser: function() {
    let user = wx.getStorageSync('userLogin') || (app.globalData ? app.globalData.userLogin : null);
    
    if (!user || user === 'null') {
      let visitorId = wx.getStorageSync('visitorId');
      if (!visitorId) {
        visitorId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        wx.setStorageSync('visitorId', visitorId);
      }
      return visitorId;
    }
    return user;
  },

  onLoad: function(options) {
    // 获取用户信息（头像昵称等），用于评论显示，如果未登录则可能为空
    const userInfo = wx.getStorageSync('userInfo');
    
    // --- 修改：移除了强制跳转代码。未登录也可以查看详情和点赞 ---
    
    // 获取用户口味偏好数据
    const stands = wx.getStorageSync('userStands') || [];
    const stand = stands[0] || null;

    // --- 修改：初始化当前用户 ID ---
    const currentUser = this.getEffectiveUser();

    console.log(stands)
    this.setData({
      userInfo: userInfo,
      stands: stand,
      currentUser: currentUser
    });

    // 获取并处理帖子数据
    if (options.post) {
      try {
        const postData = JSON.parse(decodeURIComponent(options.post));
        
        // 尝试从本地存储获取最新的帖子数据（以确保点赞数同步）
        const allPosts = wx.getStorageSync('posts') || [];
        const freshPost = allPosts.find(p => p.id === postData.id) || postData;

        const processedPost = {
          ...freshPost,
          likes: freshPost.likes || [],
          comments: freshPost.comments || [],
          // 使用动态获取的 currentUser 判断状态
          isPraised: (freshPost.likes || []).includes(currentUser),
          isCreator: freshPost.creator === currentUser,
          stands: freshPost.stands || null
        };

        this.setData({
          post: processedPost,
          focus: options.focus === 'comment'
        });
      } catch (e) {
        console.error('解析帖子数据失败:', e);
      }
    }

    wx.setNavigationBarTitle({
      title: '帖子详情'
    });
  },

  onShow: function() {
    // 页面显示时刷新数据
    const stands = wx.getStorageSync('userStands') || [];
    const userInfo = wx.getStorageSync('userInfo');
    
    // --- 修改：刷新当前用户 ID ---
    const currentUser = this.getEffectiveUser();
    this.setData({ currentUser: currentUser });

    if (stands[0]) {
      this.setData({
        stands: stands[0]
      });
    }

    if (userInfo) {
      this.setData({
        userInfo: userInfo
      });
    }

    // 刷新帖子状态
    if (this.data.post) {
      const allPosts = wx.getStorageSync('posts') || [];
      const freshPost = allPosts.find(p => p.id === this.data.post.id);
      
      if (freshPost) {
        this.setData({
          post: {
            ...freshPost,
            isPraised: (freshPost.likes || []).includes(currentUser),
            isCreator: freshPost.creator === currentUser
          }
        });
      }
    }
  },

  handleBack: function() {
    wx.navigateBack({
      delta: 1
    });
  },

  handlePraise: function() {
    // 直接使用当前 ID（可能是登录用户，也可能是访客）
    const currentUser = this.data.currentUser;
    let post = {...this.data.post};
    
    if (!post.likes) post.likes = [];
    
    const userIndex = post.likes.indexOf(currentUser);
    if (userIndex === -1) {
      post.likes.push(currentUser);
    } else {
      post.likes.splice(userIndex, 1);
    }
    
    post.isPraised = post.likes.includes(currentUser);
    
    this.setData({ post });
    
    // 更新存储中的帖子数据
    let posts = wx.getStorageSync('posts') || [];
    const postIndex = posts.findIndex(p => p.id === post.id);
    if (postIndex !== -1) {
      // 保持 Storage 中对象的原始结构，只更新 likes
      posts[postIndex].likes = post.likes; 
      wx.setStorageSync('posts', posts);
    }
  },

  handleCommentInput: function(e) {
    this.setData({
      commentContent: e.detail.value
    });
  },

  submitComment: function() {
    // --- 建议：评论依然建议检查正式登录，否则没有头像昵称 ---
    if (!this.data.userInfo) {
       wx.showToast({
        title: '登录后才能评论',
        icon: 'none'
      });
      return;
    }

    if (!this.data.commentContent?.trim()) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }

    let post = {...this.data.post};
    if (!post.comments) post.comments = [];

    const comment = {
      id: Date.now().toString(),
      content: this.data.commentContent,
      createTime: this.data.currentTime,
      creator: this.data.currentUser,
      userInfo: this.data.userInfo
    };

    post.comments.unshift(comment);
    
    this.setData({
      post: post,
      commentContent: ''
    });

    // 更新存储中的帖子数据
    let posts = wx.getStorageSync('posts') || [];
    const postIndex = posts.findIndex(p => p.id === post.id);
    if (postIndex !== -1) {
      posts[postIndex] = post;
      wx.setStorageSync('posts', posts);
    }

    wx.showToast({
      title: '评论成功',
      icon: 'success'
    });
  },

  previewImage: function(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({
      current,
      urls
    });
  },

  onShareAppMessage: function() {
    const { post } = this.data;
    return {
      title: `${post.cantin}-${post.foodName}`,
      path: `/pages/detail/detail?post=${encodeURIComponent(JSON.stringify(post))}`,
      imageUrl: post.images && post.images[0]
    };
  }
});