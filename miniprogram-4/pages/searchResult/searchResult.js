Page({
    data: {
      status: '',         // 'found' 或 'not_found'
      keyword: '',        // 搜索词
      matchedComments: [] // 匹配到的评论/帖子列表
    },
  
    onLoad(options) {
      // 1. 接收上一页传来的参数
      const status = options.status;
      const keyword = options.keyword;
  
      this.setData({
        status: status,
        keyword: keyword
      });
  
      // 2. 如果状态是 found，开始查找本地数据
      if (status === 'found') {
        this.findComments(keyword);
      }
    },
  
    findComments(searchName) {
      // A. 获取本地存储的所有帖子/评论
      // 根据您之前的 index.js，数据存在 'posts' 里
      const allPosts = wx.getStorageSync('posts') || [];
      
      // B. 筛选逻辑：完全匹配菜品名
      // 假设您的帖子数据结构里，'foodName' 字段代表菜品名
      // 或者您需要在 'content' 里找。这里按您的要求：匹配菜品名
      const results = allPosts.filter(post => {
        // 这里的 post.foodName 需要对应您实际存储的菜名字段
        // 如果您的字段叫 dishName，请改成 post.dishName
        return post.foodName === searchName; 
      });
  
      this.setData({
        matchedComments: results
      });
    },
  
    // 返回首页的功能
    goBack() {
      wx.navigateBack();
    }
  })