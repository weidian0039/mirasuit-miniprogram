// pages/share/share.js
// M-10: Social Sharing Page — generates brand-aligned share cards
// M-15 Performance: Analytics lazy-loaded — not on module load critical path
const UserProfileManager = require('../../utils/userProfile');
const logger = require('../../services/logger');

Page({
  data: {
    loading: false,
    generating: false,
    generatedCardUrl: null,
    personality: null,
    recommendations: null,
    styleImage: null,
    selectedTemplate: 'classic',
    includeMbti: true,
    includeStyle: true,
    includeImage: true,
    shareLink: ''
  },

  onLoad(options) {
    logger.userAction('page-load', { page: 'share' });
    this._trackFunnelLazy(); // M-15: lazy analytics — not on critical path
    this.loadProfile();

    // Handle deep link query params
    if (options.mbti || options.style) {
      logger.info('Share page opened via deep link', options);
    }
  },

  onShow() {
    // Refresh profile data in case it changed
    this.loadProfile();
  },

  // M-15: Lazy analytics — require + instantiate only when needed (non-blocking)
  _trackFunnelLazy() {
    try {
      const Analytics = require('../../services/analytics');
      const analytics = new Analytics({ useCloudFunction: true });
      analytics.trackFunnel('share_view');
    } catch (e) {
      // Analytics failure must not block page render
    }
  },

  loadProfile() {
    const profileManager = new UserProfileManager();
    const profile = profileManager.getProfile();
    const { personality, stylePreferences, styleHistory } = profile;

    if (!personality) {
      logger.warn('Share page: no profile data found');
      return;
    }

    const mbtiType = personality.mbti?.type || '';
    const style = stylePreferences?.preferredStyles?.[0] || stylePreferences?.preference || 'Classic';

    this.setData({
      personality,
      recommendations: { recommendedStyles: [style] },
      styleImage: profile.styleImage || null,
      shareLink: this.buildShareLink(mbtiType, style)
    });

    // Auto-generate card on load
    this.generateCard();
  },

  buildShareLink(mbtiType, style) {
    const base = 'pages/share/share';
    const query = `mbti=${encodeURIComponent(mbtiType)}&style=${encodeURIComponent(style)}`;
    return `${base}?${query}`;
  },

  selectTemplate(e) {
    const template = e.currentTarget.dataset.template;
    this.setData({ selectedTemplate: template });
    if (this.data.generatedCardUrl) {
      this.generateCard();
    }
  },

  toggleElement(e) {
    const element = e.currentTarget.dataset.element;
    const key = `include${element.charAt(0).toUpperCase() + element.slice(1)}`;
    this.setData({ [key]: e.detail.value });
    if (this.data.generatedCardUrl) {
      this.generateCard();
    }
  },

  generateCard() {
    if (this.data.generating) return;
    this.setData({ generating: true, generatedCardUrl: null });

    try {
      const { personality, recommendations, styleImage, selectedTemplate } = this.data;
      const ctx = wx.createCanvasContext('shareCardCanvas');

      // Card dimensions: 690rpx x 960rpx → px
      const DPR = wx.getSystemInfoSync().pixelRatio || 2;
      const cardW = 690 * DPR;
      const cardH = 960 * DPR;

      // Template-based theming
      const templates = {
        classic: { bg: '#ffffff', accent: '#1a1a1a', text: '#1a1a1a', subtext: '#666666' },
        minimal: { bg: '#fafafa', accent: '#888888', text: '#333333', subtext: '#999999' },
        bold: { bg: '#1a1a1a', accent: '#ffffff', text: '#ffffff', subtext: 'rgba(255,255,255,0.6)' }
      };
      const tpl = templates[selectedTemplate] || templates.classic;

      // Background
      ctx.setFillStyle(tpl.bg);
      ctx.fillRect(0, 0, cardW, cardH);

      // Top decorative line
      ctx.setStrokeStyle(tpl.accent);
      ctx.setLineWidth(4 * DPR);
      ctx.beginPath();
      ctx.moveTo(40 * DPR, 0);
      ctx.lineTo(40 * DPR, 60 * DPR);
      ctx.stroke();

      // Brand name
      ctx.setFontSize(24 * DPR);
      ctx.setFillStyle(tpl.subtext);
      ctx.setTextAlign('left');
      ctx.fillText('MIRASUIT', 40 * DPR, 100 * DPR);

      // MBTI Section
      if (this.data.includeMbti && personality?.mbti) {
        ctx.setFontSize(72 * DPR);
        ctx.setFillStyle(tpl.text);
        ctx.setTextAlign('left');
        ctx.fillText(personality.mbti.type || '', 40 * DPR, 220 * DPR);

        const desc = personality.mbti.description || '';
        if (desc) {
          ctx.setFontSize(22 * DPR);
          ctx.setFillStyle(tpl.subtext);
          const lines = this.wrapText(ctx, desc, 580 * DPR);
          lines.forEach((line, i) => {
            ctx.fillText(line, 40 * DPR, 270 * DPR + i * 34 * DPR);
          });
        }
      }

      // Style Section
      if (this.data.includeStyle && recommendations?.recommendedStyles?.length) {
        const styleY = personality?.mbti ? 420 * DPR : 220 * DPR;
        ctx.setFontSize(20 * DPR);
        ctx.setFillStyle(tpl.subtext);
        ctx.setTextAlign('left');
        ctx.fillText('STYLE FOUNDATION', 40 * DPR, styleY);

        const styles = recommendations.recommendedStyles;
        ctx.setFontSize(28 * DPR);
        ctx.setFillStyle(tpl.text);
        ctx.fillText(styles.join(' · '), 40 * DPR, styleY + 40 * DPR);

        // Decorative separator
        ctx.setStrokeStyle(tpl.subtext);
        ctx.setLineWidth(1 * DPR);
        ctx.setLineDash([8 * DPR, 8 * DPR]);
        ctx.beginPath();
        ctx.moveTo(40 * DPR, styleY + 70 * DPR);
        ctx.lineTo(650 * DPR, styleY + 70 * DPR);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Image Section
      if (this.data.includeImage && styleImage?.imageUrl) {
        const imgY = 540 * DPR;
        ctx.save();
        // Rounded rect via path (roundRect not supported in all WeChat versions)
        const rx = 8 * DPR, ry = 8 * DPR;
        const w = cardW - 80 * DPR, h = 200 * DPR;
        const x = 40 * DPR;
        ctx.beginPath();
        ctx.moveTo(x + rx, imgY);
        ctx.lineTo(x + w - rx, imgY);
        ctx.quadraticCurveTo(x + w, imgY, x + w, imgY + rx);
        ctx.lineTo(x + w, imgY + h - ry);
        ctx.quadraticCurveTo(x + w, imgY + h, x + w - rx, imgY + h);
        ctx.lineTo(x + rx, imgY + h);
        ctx.quadraticCurveTo(x, imgY + h, x, imgY + h - ry);
        ctx.lineTo(x, imgY + rx);
        ctx.quadraticCurveTo(x, imgY, x + rx, imgY);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(styleImage.imageUrl, x, imgY, w, h);
        ctx.restore();
      }

      // Bottom CTA
      const ctaY = cardH - 120 * DPR;
      ctx.setFontSize(20 * DPR);
      ctx.setFillStyle(tpl.subtext);
      ctx.setTextAlign('center');
      ctx.fillText('Discover your style at MIRASUIT', cardW / 2, ctaY);

      // Watermark (brand-aligned: extremely subtle)
      ctx.setFontSize(16 * DPR);
      ctx.setFillStyle(tpl.subtext === '#666666' || tpl.subtext === '#999999' || tpl.subtext === 'rgba(255,255,255,0.6)' ? tpl.subtext : tpl.subtext);
      ctx.globalAlpha = 0.3;
      ctx.fillText('MIRASUIT', cardW / 2, ctaY + 40 * DPR);
      ctx.globalAlpha = 1;

      ctx.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId: 'shareCardCanvas',
          quality: 0.9,
          success: (res) => {
            this.setData({
              generatedCardUrl: res.tempFilePath,
              generating: false
            });
            logger.info('Share card generated', {
              template: selectedTemplate,
              hasImage: !!styleImage?.imageUrl
            });
          },
          fail: (err) => {
            logger.captureError(err, { context: 'generateCard' });
            this.setData({ generating: false });
            wx.showToast({ title: 'Failed to generate card', icon: 'none' });
          }
        });
      });
    } catch (error) {
      logger.captureError(error, { context: 'generateCard' });
      this.setData({ generating: false });
      wx.showToast({ title: 'Failed to generate card', icon: 'none' });
    }
  },

  wrapText(ctx, text, maxWidth) {
    const chars = text.split('');
    const lines = [];
    let current = '';
    for (const char of chars) {
      const test = current + char;
      if (ctx.measureText(test).width > maxWidth) {
        lines.push(current);
        current = char;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, 4); // max 4 lines
  },

  saveToAlbum() {
    if (!this.data.generatedCardUrl) return;

    wx.saveImageToPhotosAlbum({
      filePath: this.data.generatedCardUrl,
      success: () => {
        wx.showToast({ title: 'Saved to album', icon: 'success' });
        logger.userAction('share_card_save', {});
      },
      fail: (error) => {
        if (error.errMsg && error.errMsg.includes('auth deny')) {
          wx.showModal({
            title: 'Permission Required',
            content: 'Please allow photo album access in Settings.',
            confirmText: 'Open Settings',
            success: (res) => {
              if (res.confirm) wx.openSetting();
            }
          });
        } else {
          wx.showToast({ title: 'Save failed', icon: 'none' });
        }
      }
    });
  },

  shareToWeChat() {
    if (!this.data.generatedCardUrl) return;

    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareTimeline', 'shareAppMessage']
    });

    const { personality, recommendations } = this.data;
    this.setData({
      shareData: {
        title: `My Style: ${personality?.mbti?.type || ''} — ${recommendations?.recommendedStyles?.[0] || 'Classic'}`,
        path: '/pages/share/share',
        imageUrl: this.data.generatedCardUrl,
        query: `mbti=${personality?.mbti?.type || ''}`
      }
    });

    wx.showToast({ title: 'Share menu opened', icon: 'success' });
    logger.userAction('share_card_wechat', { template: this.data.selectedTemplate });
  },

  copyShareText() {
    const { personality, recommendations } = this.data;
    if (!personality) return;

    const mbtiType = personality.mbti?.type || 'Unknown';
    const style = recommendations?.recommendedStyles?.[0] || 'Classic';
    const insight = personality.mbti?.description || 'A refined approach to menswear.';

    const shareText = `My Style Identity\n\nMBTI: ${mbtiType}\n${insight}\n\nStyle Foundation: ${style}\n\nThis is not a prescription — it's a starting point.\n\nDiscover your style at MIRASUIT.`;

    wx.setClipboardData({
      data: shareText,
      success: () => {
        wx.showToast({ title: 'Copied to clipboard', icon: 'success' });
        logger.userAction('share_text_copy', { mbti: mbtiType });
      }
    });
  },

  copyLink() {
    const link = `weixin://dl/business/?t=${encodeURIComponent(this.data.shareLink)}`;
    wx.setClipboardData({
      data: this.data.shareLink,
      success: () => {
        wx.showToast({ title: 'Link copied', icon: 'success' });
        logger.userAction('share_link_copy', {});
      }
    });
  },

  onShareAppMessage() {
    const { personality, recommendations } = this.data;
    return {
      title: `My MIRASUIT Style: ${personality?.mbti?.type || ''}`,
      path: '/pages/share/share',
      imageUrl: this.data.generatedCardUrl || ''
    };
  },

  onShareTimeline() {
    const { personality, recommendations } = this.data;
    return {
      title: `My Style: ${personality?.mbti?.type || ''} — ${recommendations?.recommendedStyles?.[0] || 'Classic'}`,
      query: `mbti=${personality?.mbti?.type || ''}`
    };
  }
});
