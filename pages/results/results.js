// pages/results/results.js
// M-7 Sprint 3 Delivery — Style report + AI image generation
const app = getApp();

const STYLE_DETAILS = {
  'ISTJ': '你是经典实用型人格，注重品质与功能，倾向于投资高性价比的基本款。你的衣橱不需要很多衣服，但每件都经得起时间考验。',
  'ISFJ': '你是内敛精致型，在乎穿着的舒适度与得体感。低调有质感是你的关键词，不会过分张扬但绝不敷衍。',
  'INFJ': '你有独特的小众品味，不跟随主流，有自己的审美体系。设计感和故事性是你选择单品的核心标准。',
  'INTJ': '你是智性优雅型，极简大气，注重剪裁与线条。黑色、灰色、海军蓝是你的主色调。',
  'ISTP': '都市机能型是你的标签，实用主义，讲究面料和版型，工装与urban风格信手拈来。',
  'ISFP': '你是艺术随性型，个性化的混搭是你的强项，有独特的审美直觉。',
  'INFP': '你有诗意的自在感，穿着有自己的故事和美学体系，舒适与自我表达同等重要。',
  'INTP': '你是解构理性型，极简主义，版型和面料是挑选单品的关键，不太在意流行趋势。',
  'ESTP': '都市时尚活力型，注重第一眼效果，有型是核心诉求，善于运用配饰提升整体造型。',
  'ESFP': '张扬有个性，色彩运用大胆，有存在感，愿意尝试新风格。',
  'ENFP': '创意灵动多变，不拘泥于一种风格，每天的穿着都可以是一种自我表达。',
  'ENTP': '先锋智趣，有自己独特的穿搭语言，注重设计感和有态度的单品。',
  'ESTJ': '商务精英，干练得体，适合正式与半正式场合，注重专业形象。',
  'ESFJ': '温暖得体，有亲和力的精致，不过分张扬，注重场合的得体度。',
  'ENFJ': '魅力领袖型，有感染力的穿着，气场十足，善于通过形象传递影响力。',
  'ENTJ': '权力质感，极简有力，黑色系为主，给人以领导力和决策力的印象。',
};

const RECOMMENDATIONS = [
  {
    icon: '👔',
    title: '核心单品',
    desc: '投资高品质基本款：白色衬衫、深蓝西装、黑色高领针织衫、原色牛仔',
  },
  {
    icon: '🎯',
    title: '风格边界',
    desc: '保持一个明确的风格主线，在这个框架内做变化，而非随意混搭',
  },
  {
    icon: '✨',
    title: '质感升级',
    desc: '减少数量，提升质量。好的面料和版型，比logo更有说服力',
  },
  {
    icon: '📐',
    title: '场合适配',
    desc: '确保基础款能满足工作、约会、休闲三个基本场景的切换',
  },
];

const COLOR_PALETTES = {
  'ISTJ': [
    { name: '深蓝', hex: '#1B3A5C' },
    { name: '炭灰', hex: '#4A4A4A' },
    { name: '米白', hex: '#F5F0E8' },
    { name: '棕色', hex: '#8B6914' },
  ],
  'ISFJ': [
    { name: '驼色', hex: '#C19A6B' },
    { name: '浅灰', hex: '#B8B8B8' },
    { name: '藏蓝', hex: '#2C3E50' },
    { name: '象牙', hex: '#FFFFF0' },
  ],
  'INFJ': [
    { name: '墨绿', hex: '#2D4A3E' },
    { name: '酒红', hex: '#722F37' },
    { name: '深咖', hex: '#3E2723' },
    { name: '米灰', hex: '#E8E4E1' },
  ],
  'INTJ': [
    { name: '纯黑', hex: '#1a1a1a' },
    { name: '石墨', hex: '#363636' },
    { name: '银灰', hex: '#9E9E9E' },
    { name: '白', hex: '#FFFFFF' },
  ],
  'default': [
    { name: '深灰', hex: '#333333' },
    { name: '中灰', hex: '#666666' },
    { name: '浅灰', hex: '#E0E0E0' },
    { name: '黑', hex: '#1a1a1a' },
  ],
};

Page({
  data: {
    hasResult: false,
    mbti: '',
    mbtiArray: [],
    styleName: '',
    styleDesc: '',
    styleColor: '#1a1a1a',
    styleColorLight: '#3a3a3a',
    detailText: '',
    recommendations: RECOMMENDATIONS,
    colorPalette: [],
    styleImagePath: '',
    isGeneratingImage: false,
  },

  onLoad(options) {
    if (options.mbti) {
      this.setMBTIData(options.mbti, options.style);
    } else {
      this.loadFromStorage();
    }
  },

  onShow() {
    if (!this.data.hasResult) {
      this.loadFromStorage();
    }
  },

  loadFromStorage() {
    const result = app.globalData.styleResult;
    if (result) {
      this.setMBTIData(result.mbti, result.styleName);
    }
  },

  setMBTIData(mbti, styleName) {
    const palette = COLOR_PALETTES[mbti] || COLOR_PALETTES['default'];
    const mbtiChars = mbti ? mbti.split('') : [];
    const style = COLOR_PALETTES[mbti] ? {} : { name: styleName || '', desc: '' };

    this.setData({
      hasResult: true,
      mbti: mbti || '',
      mbtiArray: mbtiChars,
      styleName: styleName || '',
      styleDesc: STYLE_DETAILS[mbti] || '',
      styleColor: '#1a1a1a',
      styleColorLight: '#3a3a3a',
      detailText: STYLE_DETAILS[mbti] || '',
      colorPalette: palette,
    });
  },

  startTest() {
    wx.navigateTo({ url: '/pages/questionnaire/questionnaire' });
  },

  generateStyleImage() {
    if (this.data.isGeneratingImage) return;
    this.setData({ isGeneratingImage: true });

    // Generate style card image using canvas
    this._generateStyleCard()
      .then(imagePath => {
        this.setData({ styleImagePath: imagePath, isGeneratingImage: false });
      })
      .catch(err => {
        console.error('[MIRA] Style image generation failed:', err);
        this.setData({ isGeneratingImage: false });
        wx.showToast({ title: '生成失败，请重试', icon: 'none' });
      });
  },

  _generateStyleCard() {
    return new Promise((resolve, reject) => {
      const ctx = wx.createCanvasContext('styleCardCanvas');
      const W = 600;
      const H = 900;

      // Background gradient simulation
      ctx.setFillStyle('#1a1a1a');
      ctx.fillRect(0, 0, W, H);

      // MBTI letters
      ctx.setFillStyle('rgba(255,255,255,0.9)');
      ctx.setFontSize(120);
      ctx.setTextAlign('center');
      ctx.fillText(this.data.mbti, W / 2, 280);

      // Style name
      ctx.setFillStyle('#ffffff');
      ctx.setFontSize(52);
      ctx.fillText(this.data.styleName, W / 2, 380);

      // Description
      ctx.setFillStyle('rgba(255,255,255,0.6)');
      ctx.setFontSize(28);
      const lines = this._wrapText(ctx, this.data.detailText, W - 80);
      lines.forEach((line, i) => {
        ctx.fillText(line, W / 2, 460 + i * 42);
      });

      // Brand
      ctx.setFillStyle('rgba(255,255,255,0.3)');
      ctx.setFontSize(24);
      ctx.fillText('MIRASUIT · YOUR STYLE IDENTITY', W / 2, H - 80);

      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'styleCardCanvas',
          success: res => resolve(res.tempFilePath),
          fail: reject,
        });
      });
    });
  },

  _wrapText(ctx, text, maxWidth) {
    const words = text.split('');
    const lines = [];
    let line = '';
    words.forEach(char => {
      const testLine = line + char;
      if (ctx.measureText(testLine).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = testLine;
      }
    });
    if (line) lines.push(line);
    return lines.slice(0, 5); // max 5 lines
  },

  saveStyleImage() {
    if (!this.data.styleImagePath) return;
    wx.saveImageToPhotosAlbum({
      filePath: this.data.styleImagePath,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
    });
  },

  goToShare() {
    if (!this.data.hasResult) return;
    const result = app.globalData.styleResult;
    wx.navigateTo({
      url: `/pages/share/share?mbti=${result.mbti}&style=${encodeURIComponent(result.styleName)}`,
    });
  },

  shareResult() {
    const result = app.globalData.styleResult;
    if (!result) return;
    wx.showShareMenu({ withShareTicket: true });
  },

  onShareAppMessage() {
    const result = app.globalData.styleResult || {};
    return {
      title: `我的MIRASUIT风格是${result.mbti || 'INTJ'}——${result.styleName || '经典优雅型'}`,
      path: `/pages/questionnaire/questionnaire?mbti=${result.mbti || ''}&style=${encodeURIComponent(result.styleName || '')}`,
      imageUrl: this.data.styleImagePath || '',
    };
  },
});
