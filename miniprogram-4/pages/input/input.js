const app = getApp();

// --- 新增: 服务器地址配置 ---
// 在真机调试时，请将 http://127.0.0.1:8000 换成您电脑的局域网 IP (如 http://192.168.1.5:8000)
// 部署上线后，换成您的云服务器域名
const SERVER_URL = 'http://127.0.0.1:8000'; 

Page({
    data: {
      grades: ['None', 'E', 'D', 'C', 'B', 'A'],  // 等级选项
      power: 'None',      // 酸味
      speed: 'None',      // 甜味
      range: 'None',      // 辣味
      stamina: 'None',    // 咸味
      precision: 'None',  // 麻
      potential: 'None',  // 接受
      userInfo: null      // 用户信息
    },
  
    // 页面加载时获取已保存的数据
    onLoad: function() {
      // 获取全局用户信息
      this.setData({
        userInfo: app.globalData.userInfo || null
      });

      const stands = wx.getStorageSync('userStands') || [];
      if (stands[0]) {
        const stand = stands[0];
        this.setData({
          power: stand.power,
          speed: stand.speed,
          range: stand.range,
          stamina: stand.stamina,
          precision: stand.precision,
          potential: stand.potential
        });
      }
    },
  
    // --- 各种口味变化处理 ---
    onPowerChange: function(e) { this.setData({ power: this.data.grades[e.detail.value] }); },
    onSpeedChange: function(e) { this.setData({ speed: this.data.grades[e.detail.value] }); },
    onRangeChange: function(e) { this.setData({ range: this.data.grades[e.detail.value] }); },
    onStaminaChange: function(e) { this.setData({ stamina: this.data.grades[e.detail.value] }); },
    onPrecisionChange: function(e) { this.setData({ precision: this.data.grades[e.detail.value] }); },
    onPotentialChange: function(e) { this.setData({ potential: this.data.grades[e.detail.value] }); },
  
    // --- 新增: 辅助函数，将等级转换为 0-1 的小数 ---
    gradeToScore: function(grade) {
        const mapping = { 'None': 0.0, 'E': 0.2, 'D': 0.4, 'C': 0.6, 'B': 0.8, 'A': 1.0 };
        return mapping[grade] || 0.0;
    },

    // 提交表单
    submitForm: function() {
      // 1. 准备基础数据
      const creatorName = (this.data.userInfo && this.data.userInfo.loginUser)
                          || (app.globalData && app.globalData.userInfo && app.globalData.userInfo.loginUser)
                          || 'Guest';

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      // 2. 本地存储用的数据对象
      const standData = {
        power: this.data.power,
        speed: this.data.speed,
        range: this.data.range,
        stamina: this.data.stamina,
        precision: this.data.precision,
        potential: this.data.potential,
        creator: creatorName,
        createTime: timeStr
      };

      // 3. --- 新增: 准备发送给 AI 后端的数据 ---
      // 必须按照后端模型定义的顺序: [酸, 甜, 辣, 咸, 麻, 接受]
      const preferenceVector = [
          this.gradeToScore(this.data.power),
          this.gradeToScore(this.data.speed),
          this.gradeToScore(this.data.range),
          this.gradeToScore(this.data.stamina),
          this.gradeToScore(this.data.precision),
          this.gradeToScore(this.data.potential)
      ];
  
      // 显示加载提示
      wx.showLoading({ title: '同步云端数据...', mask: true });

      // 4. 执行逻辑
      try {
        // A. 本地存储 (保留原有逻辑作为备份)
        let stands = wx.getStorageSync('userStands') || [];
        stands.unshift(standData);
        wx.setStorageSync('userStands', stands);
  
        // B. 发送给后端 API
        wx.request({
            url: `${SERVER_URL}/update_profile`,
            method: 'POST',
            data: {
                user_id: creatorName, // 使用用户名作为 ID
                preferences: preferenceVector
            },
            success: (res) => {
                wx.hideLoading();
                console.log("云端同步成功:", res.data);
                
                if (res.statusCode === 200) {
                    // C. 成功后跳转
                    wx.showToast({
                        title: '保存成功',
                        icon: 'success',
                        duration: 1000,
                        success: () => {
                            setTimeout(() => {
                                wx.switchTab({ url: '/pages/index/index' });
                            }, 1000);
                        }
                    });
                } else {
                    wx.showToast({ title: '云端异常', icon: 'error' });
                }
            },
            fail: (err) => {
                wx.hideLoading();
                console.error("连接服务器失败:", err);
                // 即使联网失败，本地也保存了，提示用户但允许继续
                wx.showModal({
                    title: '离线模式',
                    content: '连接 AI 服务器失败，仅保存到本地。无法使用推荐功能。',
                    showCancel: false,
                    success: () => {
                        wx.switchTab({ url: '/pages/index/index' });
                    }
                });
            }
        });
  
      } catch (e) {
        wx.hideLoading();
        console.error('本地保存失败:', e);
        wx.showToast({ title: '保存错误', icon: 'error' });
      }
    }
});