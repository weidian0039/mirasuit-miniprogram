// pages/questionnaire/questionnaire.js
// M-6 Sprint 3 Delivery
const app = getApp();

// 8 questions covering MBTI personality + lifestyle + fashion preferences
const QUESTIONS = [
  {
    id: 1,
    category: '社交能量',
    text: '在社交场合中，你通常是怎样的状态？',
    options: [
      { letter: 'A', text: '主动发起对话，享受成为焦点的感觉', value: 'E' },
      { letter: 'B', text: '喜欢在熟悉的圈子里深度交流', value: 'I' },
      { letter: 'C', text: '根据场合灵活切换', value: 'N' },
      { letter: 'D', text: '倾听为主，但需要时能侃侃而谈', value: 'I' },
    ],
  },
  {
    id: 2,
    category: '决策方式',
    text: '买衣服时，你更看重什么？',
    options: [
      { letter: 'A', text: '上身效果和实际穿着体验', value: 'S' },
      { letter: 'B', text: '设计理念和品牌故事', value: 'N' },
      { letter: 'C', text: '面料质感和工艺细节', value: 'S' },
      { letter: 'D', text: '搭配可能性和长期价值', value: 'N' },
    ],
  },
  {
    id: 3,
    category: '生活方式',
    text: '你的日常生活节奏是？',
    options: [
      { letter: 'A', text: '规律高效，每天按计划行事', value: 'J' },
      { letter: 'B', text: '灵活自由，随性而为', value: 'P' },
      { letter: 'C', text: '工作日规律，周末随性', value: 'J' },
      { letter: 'D', text: '创意驱动，灵感来了通宵也行', value: 'P' },
    ],
  },
  {
    id: 4,
    category: '职场风格',
    text: '你的职场着装风格更接近？',
    options: [
      { letter: 'A', text: '西装革履，经典剪裁', value: 'S' },
      { letter: 'B', text: 'Smart Casual，精致但不刻板', value: 'N' },
      { letter: 'C', text: '个性化混搭，表达自我', value: 'P' },
      { letter: 'D', text: '低调质感，注重面料和版型', value: 'S' },
    ],
  },
  {
    id: 5,
    category: '个性表达',
    text: '你希望通过穿搭传达什么？',
    options: [
      { letter: 'A', text: '专业与可信度', value: 'J' },
      { letter: 'B', text: '独特品味与审美', value: 'N' },
      { letter: 'C', text: '舒适与自在', value: 'P' },
      { letter: 'D', text: '低调的精致感', value: 'S' },
    ],
  },
  {
    id: 6,
    category: '审美偏好',
    text: '你更倾向于哪种风格？',
    options: [
      { letter: 'A', text: '意式经典，结构感强', value: 'S' },
      { letter: 'B', text: '北欧极简，干净利落', value: 'N' },
      { letter: 'C', text: '日式urban，层次感强', value: 'N' },
      { letter: 'D', text: '法式effortless，不经意的精致', value: 'P' },
    ],
  },
  {
    id: 7,
    category: '购物习惯',
    text: '你通常在哪里购买男装？',
    options: [
      { letter: 'A', text: '专注几个经典品牌，长期复购', value: 'J' },
      { letter: 'B', text: '多渠道比价，追求性价比', value: 'S' },
      { letter: 'C', text: '设计师品牌和买手店', value: 'N' },
      { letter: 'D', text: '看到喜欢的就买，不限渠道', value: 'P' },
    ],
  },
  {
    id: 8,
    category: '终极选择',
    text: '如果只能留下一套搭配，你会选择？',
    options: [
      { letter: 'A', text: '深蓝色双排扣西装 + 白色衬衫', value: 'S' },
      { letter: 'B', text: '黑色高领 + 灰色大衣 + 白裤', value: 'N' },
      { letter: 'C', text: '针织 polo + 卡其裤 + 乐福鞋', value: 'P' },
      { letter: 'D', text: '白色T恤 + 原色牛仔 + 简约运动鞋', value: 'P' },
    ],
  },
];

// Style mapping based on MBTI patterns
const STYLE_MAP = {
  'ISTJ': { name: '经典实用型', color: '#2C3E50', desc: '注重品质与功能，经典款式为核心' },
  'ISFJ': { name: '内敛精致型', color: '#34495E', desc: '低调有质感，注重穿着舒适度' },
  'INFJ': { name: '文艺质感型', color: '#4A4A4A', desc: '有深度的小众品味，不跟随主流' },
  'INTJ': { name: '智性优雅型', color: '#1a1a1a', desc: '简约大气，注重剪裁与线条' },
  'ISTP': { name: '都市机能型', color: '#3d3d3d', desc: '实用主义，工装与urban风格' },
  'ISFP': { name: '艺术随性型', color: '#5a5a5a', desc: '不拘一格，有艺术感的混搭' },
  'INFP': { name: '诗意自在型', color: '#4a4a4a', desc: '有故事的穿着，有自己的美学体系' },
  'INTP': { name: '解构理性型', color: '#2c2c2c', desc: '极简主义，版型和面料是重点' },
  'ESTP': { name: '时尚活力型', color: '#1a1a1a', desc: '有型的都市风格，注重第一眼效果' },
  'ESFP': { name: '张扬个性型', color: '#3a3a3a', desc: '有存在感，色彩运用大胆' },
  'ENFP': { name: '创意灵动型', color: '#4a4a4a', desc: '多变有趣，不拘泥于一种风格' },
  'ENTP': { name: '先锋智趣型', color: '#1a1a1a', desc: '有态度，有自己独特的穿搭语言' },
  'ESTJ': { name: '商务精英型', color: '#2c3e50', desc: '干练得体，适合正式与半正式场合' },
  'ESFJ': { name: '温暖得体型', color: '#34495E', desc: '有亲和力的精致，不过分张扬' },
  'ENFJ': { name: '魅力领袖型', color: '#1a1a1a', desc: '有感染力的穿着，气场十足' },
  'ENTJ': { name: '权力质感型', color: '#1a1a1a', desc: '极简有力，黑色系为主，有领导力' },
};

Page({
  data: {
    questions: QUESTIONS,
    currentIndex: 0,
    answers: [],
    selectedIndex: -1,
    isLoading: false,
    isComplete: false,
    isGenerating: false,
  },

  onLoad(options) {
    // Check if retaking
    if (options.retake === 'true') {
      this.setData({
        currentIndex: 0,
        answers: [],
        selectedIndex: -1,
      });
    }
  },

  get currentQuestion() {
    return this.data.questions[this.data.currentIndex];
  },

  get progressPercent() {
    return ((this.data.currentIndex) / this.data.questions.length) * 100;
  },

  selectOption(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedIndex: index });
  },

  prevQuestion() {
    if (this.data.currentIndex > 0) {
      const prevIndex = this.data.currentIndex - 1;
      const prevAnswer = this.data.answers[prevIndex];
      this.setData({
        currentIndex: prevIndex,
        selectedIndex: prevAnswer ? prevAnswer.selectedOption : -1,
      });
    }
  },

  nextQuestion() {
    if (this.data.selectedIndex === -1) return;

    const question = this.data.questions[this.data.currentIndex];
    const selectedOption = question.options[this.data.selectedIndex];

    // Save answer
    const answers = [...this.data.answers];
    answers[this.data.currentIndex] = {
      questionId: question.id,
      value: selectedOption.value,
      selectedOption: this.data.selectedIndex,
    };

    if (this.data.currentIndex < this.data.questions.length - 1) {
      // Next question
      this.setData({
        currentIndex: this.data.currentIndex + 1,
        answers,
        selectedIndex: -1,
        progressPercent: ((this.data.currentIndex + 1) / this.data.questions.length) * 100,
      });
    } else {
      // Last question — generate result
      this.setData({ answers, isComplete: true, isGenerating: true });
      this.generateStyleResult(answers);
    }
  },

  generateStyleResult(answers) {
    // Calculate MBTI from answers
    const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    answers.forEach(a => {
      if (counts[a.value] !== undefined) counts[a.value]++;
    });

    // Default splits where tied
    const mbti =
      (counts.E >= counts.I ? 'E' : 'I') +
      (counts.S >= counts.N ? 'S' : 'N') +
      (counts.T >= counts.F ? 'T' : 'F') +
      (counts.J >= counts.P ? 'J' : 'P');

    const style = STYLE_MAP[mbti] || STYLE_MAP['INTJ'];

    const result = {
      mbti,
      styleName: style.name,
      styleDesc: style.desc,
      styleColor: style.color,
      answers,
      createdAt: Date.now(),
    };

    const profile = {
      mbti,
      answers,
      createdAt: Date.now(),
    };

    // Save to app global
    app.globalData.styleResult = result;
    app.globalData.userProfile = profile;
    app.globalData.questionnaireAnswers = answers;
    app.saveProgress();

    setTimeout(() => {
      this.setData({ isGenerating: false });
      wx.redirectTo({
        url: `/pages/results/results?mbti=${mbti}&style=${encodeURIComponent(style.name)}`,
      });
    }, 1500);
  },
});
