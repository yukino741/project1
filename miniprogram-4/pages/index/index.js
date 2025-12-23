const app = getApp();

Page({
    data: {
      // --- 新增：搜索功能相关 ---
      searchKeyword: '', // 绑定搜索框输入值
      // -----------------------

      posts: [],
      currentPage: 1,
      pageSize: 10,
      hasMore: true,
      isLoading: false,
      currentUser: null,  // 初始为 null
      currentTime: '2025-06-11 19:18:54'  // 当前系统时间
    },
  
    // --- 新增：监听搜索输入 ---
    handleInput: function(e) {
      this.setData({
        searchKeyword: e.detail.value
      });
    },

    // --- 新增：处理搜索点击 ---
    handleSearch: function() {
      const keyword = this.data.searchKeyword.trim(); // 获取输入并去除首尾空格
  
      // 1. 校验输入是否为空
      if (!keyword) {
        wx.showToast({
          title: '请输入菜名',
          icon: 'none'
        });
        return;
      }
  
      // 2. 获取全局菜品库 (确保 app.globalData.dishDatabase 已在 app.js 定义)
      const db = app.globalData.dishDatabase || [];
      
      // 3. 检查菜品是否存在 (完全匹配)
      const isExist = db.includes(keyword);
  
      if (isExist) {
        // --- 情况 A: 菜品存在 ---
        console.log(`搜索成功：${keyword} 存在于库中`);
        wx.navigateTo({
          url: `/pages/searchResult/searchResult?status=found&keyword=${keyword}`
        });
  
      } else {
        // --- 情况 B: 菜品不存在 ---
        console.log(`搜索失败：${keyword} 不存在`);
        wx.navigateTo({
          url: `/pages/searchResult/searchResult?status=not_found&keyword=${keyword}`
        });
      }
    },
    // -----------------------

    // --- 核心修改：统一获取用户身份（登录用户 或 访客） ---
    getEffectiveUser: function() {
      // 1. 尝试获取登录用户
      let user = null;
      if (app.globalData && app.globalData.userLogin) {
        user = app.globalData.userLogin;
      } else {
        user = wx.getStorageSync('userLogin');
      }

      // 2. 如果没登录，获取或生成访客ID
      if (!user || user === 'null') {
        let visitorId = wx.getStorageSync('visitorId');
        if (!visitorId) {
          // 生成一个唯一的访客ID
          visitorId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          wx.setStorageSync('visitorId', visitorId);
        }
        return visitorId;
      }

      return user;
    },

    onLoad: function() {
      // 初始化用户身份（包含访客逻辑）
      this.setData({
        currentUser: this.getEffectiveUser()
      });
      this.loadPosts();
    },
  
    onShow: function() {
      // 刷新用户身份
      this.setData({
        currentUser: this.getEffectiveUser()
      });
      this.loadPosts();
    },
  
    // 加载帖子列表
    loadPosts: function() {
      try {
        let posts = wx.getStorageSync('posts') || [];
        const currentUser = this.data.currentUser;
        
        // 处理每个帖子的数据
        posts = posts.map(post => ({
          ...post,
          author: {
            id: post.creator,
            nickName: post.userInfo?.nickName || 'Unknown',
            avatarUrl: post.userInfo?.avatarUrl || '/images/default-avatar.png'
          },
          createTime: post.createTime,
          commentCount: post.comments?.length || 0,
          praiseCount: post.likes?.length || 0,
          isPraised: currentUser ? (post.likes?.includes(currentUser) || false) : false,
          isCreator: currentUser ? (post.creator === currentUser) : false
        }));

        this.setData({ posts });
      } catch (e) {
        console.error('加载帖子失败:', e);
      }
    },

    // 处理点赞
    handlePraise: function(e) {
      // --- 修改：允许未登录（访客）点赞，只需 currentUser 有值即可（getEffectiveUser 保证了这点） ---
      if (!this.data.currentUser) {
         // 理论上不会走到这，因为有访客ID兜底
         return; 
      }

      const postId = e.currentTarget.dataset.id;
      const currentUser = this.data.currentUser;

      // 读写分离，处理原始数据
      let storagePosts = wx.getStorageSync('posts') || [];
      const storagePostIndex = storagePosts.findIndex(p => p.id === postId);
      
      if (storagePostIndex === -1) return;

      let storagePost = storagePosts[storagePostIndex];
      if (!storagePost.likes) storagePost.likes = [];
      
      const userIndex = storagePost.likes.indexOf(currentUser);
      if (userIndex === -1) {
        storagePost.likes.push(currentUser);
      } else {
        storagePost.likes.splice(userIndex, 1);
      }
      
      // 保存回 Storage
      storagePosts[storagePostIndex] = storagePost;
      wx.setStorageSync('posts', storagePosts);

      // 更新 UI
      let uiPosts = [...this.data.posts];
      const uiPostIndex = uiPosts.findIndex(p => p.id === postId);
      
      if (uiPostIndex !== -1) {
        let uiPost = uiPosts[uiPostIndex];
        uiPost.likes = storagePost.likes;
        uiPost.praiseCount = storagePost.likes.length;
        uiPost.isPraised = storagePost.likes.includes(currentUser);
        
        this.setData({ posts: uiPosts });
      }
    },

    // 删除帖子
    deletePost: function(e) {
      // --- 修改：删除功能依然需要正式登录，不能是访客 ---
      if (!this.data.currentUser || this.data.currentUser.startsWith('guest_')) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      const postId = e.currentTarget.dataset.id;
      const post = this.data.posts.find(p => p.id === postId);
      
      if (post.creator !== this.data.currentUser) {
        wx.showToast({
          title: '只能删除自己的帖子',
          icon: 'none'
        });
        return;
      }

      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条帖子吗？',
        success: (res) => {
          if (res.confirm) {
            let posts = this.data.posts.filter(p => p.id !== postId);
            this.setData({ posts });
            wx.setStorageSync('posts', posts);
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          }
        }
      });
    },

    // 处理评论
    handleComment: function(e) {
        const postId = e.currentTarget.dataset.id;
        const post = this.data.posts.find(p => p.id === postId);
        if (post) {
            const postData = {
            ...post,
            stands: post.stands || {}, // 确保 stands 数据存在
            };
  
            wx.navigateTo({
                url: `/pages/detail/detail?post=${encodeURIComponent(JSON.stringify(postData))}`
            });
    }
  },

    // 创建新帖子
    createPost: function() {
      // --- 修改：发帖功能依然需要正式登录 ---
      if (!this.data.currentUser || this.data.currentUser.startsWith('guest_')) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      wx.navigateTo({
        url: '/pages/creat/creat'
      });
    },

    // 预览图片
    previewImage: function(e) {
      const { urls, current } = e.currentTarget.dataset;
      wx.previewImage({
        current,
        urls
      });
    },

    // 下拉刷新
    onPullDownRefresh: function() {
      // 刷新时重新获取身份
      this.setData({
        currentUser: this.getEffectiveUser()
      });
      this.loadPosts();
      wx.stopPullDownRefresh();
    },

    // 分享
    onShareAppMessage: function(res) {
      if (res.from === 'button') {
        const postId = res.target.dataset.id;
        const post = this.data.posts.find(p => p.id === postId);
        return {
          title: `${post.cantin}-${post.foodName}`,
          path: `/pages/detail/detail?post=${encodeURIComponent(JSON.stringify(post))}`,
          imageUrl: post.images && post.images[0]
        };
      }
      return {
        title: '校园食堂点评',
        path: '/pages/forum/forum'
      };
    },
    gotoDetail:function(e) {
        const postId = e.currentTarget.dataset.id;
        const post = this.data.posts.find(p => p.id === postId);
        if (post) {
            const postData = {
            ...post,
            stands: post.stands || {}, // 确保 stands 数据存在
            };
  
            wx.navigateTo({
                url: `/pages/detail/detail?post=${encodeURIComponent(JSON.stringify(postData))}`
            });
    }
  },
});