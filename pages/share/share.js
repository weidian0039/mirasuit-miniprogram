// pages/share/share.js
// M-8 Sprint 3 Delivery — 3-template share card generator
const app = getApp();

const TEMPLATES = [
  { name: 'classic', label: '经典', bg: '#1a1a1a', text: '#ffffff' },
  { name: 'minimal', label: '极简', bg: '#ffffff', text: '#1a1a1a' },
  { name: 'bold', label: '大胆', bg: '#000000', accent: '#FF6B35', text: '#ffffff' },
];

Page({
  data: {
    mbti: '',
    styleName: '',
    templates: TEMPLATES,
    selectedTemplate: 0,
    isGenerating: false,
    shareImagePath: '',
    shareLink: '',
  },

  onLoad(options) {
    const mbti = options.mbti || app.globalData.styleResult?.mbti || 'INTJ';
    const style = options.style || app.globalData.styleResult?.styleName || '智性优雅型';

    this.setData({
      mbti,
      styleName: decodeURIComponent(style),
      shareLink: `https://weidian0039.github.io/mirasuit-h5/?mbti=${mbti}&style=${encodeURIComponent(style)}`,
    });
  },

  selectTemplate(e) {
    this.setData({ selectedTemplate: e.currentTarget.dataset.index });
  },

  generateShareCard() {
    if (this.data.isGenerating) return;
    this.setData({ isGenerating: true });

    this._renderCard()
      .then(path => {
        this.setData({ shareImagePath: path, isGenerating: false });
      })
      .catch(err => {
        console.error('[MIRA] Share card generation failed:', err);
        this.setData({ isGenerating: false });
        wx.showToast({ title: '生成失败', icon: 'none' });
      });
  },

  _renderCard() {
    return new Promise((resolve, reject) => {
      const tpl = TEMPLATES[this.data.selectedTemplate];
      const W = 750;
      const H = 1334;

      const query = wx.createSelectorQuery();
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec(res => {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;

          canvas.width = W * dpr;
          canvas.height = H * dpr;
          ctx.scale(dpr, dpr);

          // Background
          ctx.fillStyle = tpl.bg;
          ctx.fillRect(0, 0, W, H);

          // Accent gradient for bold
          if (tpl.accent) {
            const grad = ctx.createLinearGradient(0, 0, W, H);
            grad.addColorStop(0, '#000000');
            grad.addColorStop(1, tpl.accent);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
          }

          // Top decoration
          ctx.fillStyle = tpl.name === 'minimal' ? '#f0f0f0' : 'rgba(255,255,255,0.05)';
          ctx.fillRect(0, 0, W, 200);

          // MBTI Letters
          ctx.setFillStyle(tpl.text);
          ctx.setTextAlign('center');
          ctx.font = '200 180rpx -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.letterSpacing = '20px';
          ctx.fillText(this.data.mbti, W / 2, 500);

          // Divider
          ctx.fillStyle = tpl.name === 'minimal' ? '#e0e0e0' : 'rgba(255,255,255,0.2)';
          ctx.fillRect(W / 2 - 60, 560, 120, 2);

          // Style Name
          ctx.setFillStyle(tpl.text);
          ctx.font = '500 52rpx -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillText(this.data.styleName, W / 2, 660);

          // Description
          ctx.setFillStyle(tpl.name === 'minimal' ? '#999' : 'rgba(255,255,255,0.6)');
          ctx.font = '300 28rpx -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillText('发现你的专属穿衣风格', W / 2, 720);

          // MBTI Type descriptions
          const typeDesc = this._getTypeDesc(this.data.mbti);
          ctx.fillText(typeDesc, W / 2, 770);

          // Brand
          ctx.setFillStyle(tpl.name === 'minimal' ? '#ccc' : 'rgba(255,255,255,0.3)');
          ctx.font = '300 22rpx -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillText('MIRASUIT · YOUR STYLE IDENTITY', W / 2, H - 120);

          // QR Code placeholder area
          ctx.fillStyle = tpl.name === 'minimal' ? '#f5f5f5' : 'rgba(255,255,255,0.1)';
          this._roundRect(ctx, W / 2 - 100, H - 360, 200, 200, 16);
          ctx.fill();

          ctx.setFillStyle(tpl.name === 'minimal' ? '#ddd' : 'rgba(255,255,255,0.3)');
          ctx.font = '200 24rpx -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillText('扫码测试', W / 2, H - 210);

          wx.canvasToTempFilePath({
            canvasId: 'shareCanvas',
            canvasType: '2d',
            success: res => resolve(res.tempFilePath),
            fail: reject,
          });
        });
    });
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  _getTypeDesc(mbti) {
    const descs = {
      'ISTJ': '经典实用 · 注重品质', 'ISFJ': '内敛精致 · 低调有质',
      'INFJ': '文艺质感 · 小众品味', 'INTJ': '智性优雅 · 极简大气',
      'ISTP': '都市机能 · 实用主义', 'ISFP': '艺术随性 · 个性混搭',
      'INFP': '诗意自在 · 自我表达', 'INTP': '解构理性 · 版型面料',
      'ESTP': '时尚活力 · 都市有型', 'ESFP': '张扬个性 · 色彩大胆',
      'ENFP': '创意灵动 · 多变有趣', 'ENTP': '先锋智趣 · 态度鲜明',
      'ESTJ': '商务精英 · 干练得体', 'ESFJ': '温暖得体 · 亲和精致',
      'ENFJ': '魅力领袖 · 气场十足', 'ENTJ': '权力质感 · 极简有力',
    };
    return descs[mbti] || '发现你的专属风格';
  },

  saveShareCard() {
    if (!this.data.shareImagePath) return;
    wx.saveImageToPhotosAlbum({
      filePath: this.data.shareImagePath,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
    });
  },

  copyShareLink() {
    wx.setClipboardData({
      data: this.data.shareLink,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
    });
  },

  shareToWeChat() {
    wx.showShareMenu({ withShareTicket: true });
  },

  onShareAppMessage() {
    return {
      title: `我的MIRASUIT风格是${this.data.mbti}——${this.data.styleName}`,
      path: `/pages/questionnaire/questionnaire?mbti=${this.data.mbti}`,
    };
  },

  onShareTimeline() {
    return {
      title: `MIRASUIT风格测试：${this.data.mbti} ${this.data.styleName}`,
      query: `mbti=${this.data.mbti}&style=${encodeURIComponent(this.data.styleName)}`,
    };
  },
});
