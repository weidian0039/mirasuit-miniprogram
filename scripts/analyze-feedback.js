#!/usr/bin/env node
/**
 * MIRASUIT M-17: Alpha Feedback Analysis Script
 * -----------------------------------------------
 * Analyzes feedback data collected via FeedbackService.
 *
 * Usage:
 *   node scripts/analyze-feedback.js [--source=local|cloud] [--format=table|json]
 *
 * Input: Array of feedback entries from FeedbackService.export()
 *   Each entry: { id, rating, comment, stage, contact, mbti, timestamp, version }
 *
 * Outputs:
 *   - Rating distribution (1-5 stars)
 *   - Average rating per funnel stage
 *   - Comment themes via keyword extraction
 *   - MBTI breakdown of respondents
 *   - Completion funnel from feedback data
 *   - Actionable improvement suggestions
 *
 * Brand voice: Sophisticated, understated. No hyperbole.
 * MIRA consultant framing for output.
 */

const fs = require('fs');
const path = require('path');

// ─── Argument Parsing ──────────────────────────────────────────

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, val] = arg.replace(/^--/, '').split('=');
  acc[key] = val || true;
  return acc;
}, { source: 'local', format: 'table' });

// ─── Data Loading ──────────────────────────────────────────────

/**
 * Load feedback entries.
 * local: reads from wx.getStorageSync('mira_feedback') equivalent (JSON file)
 *   Expected path: data/feedback-local.json (for manual testing)
 * cloud: reads from WeChat Cloud DB query (requires cloud env configured)
 */
function loadFeedback() {
  const localPath = path.join(__dirname, '../data/feedback-local.json');

  if (args.source === 'local') {
    if (!fs.existsSync(localPath)) {
      console.error('[MIRA] No local feedback data found.');
      console.error(`[MIRA] Place feedback JSON at: ${localPath}`);
      console.error('[MIRA] Export from FeedbackService: JSON.stringify(feedbackService.export())');
      process.exit(1);
    }
    const raw = fs.readFileSync(localPath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : (data.entries || data.feedback || []);
  }

  if (args.source === 'cloud') {
    console.error('[MIRA] Cloud source requires WeChat Cloud SDK.');
    console.error('[MIRA] Configure WECHAT_CLOUD_ENV_ID env var and use wx.cloud.database()');
    process.exit(1);
  }

  return [];
}

// ─── Analysis Functions ───────────────────────────────────────

/**
 * Rating distribution: count per star level
 */
function ratingDistribution(entries) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  entries.forEach(e => {
    if (dist[e.rating] !== undefined) dist[e.rating]++;
  });
  return dist;
}

/**
 * Average rating overall and per stage
 */
function averageRatings(entries) {
  const all = entries.filter(e => e.rating >= 1 && e.rating <= 5);
  const avg = all.length > 0
    ? (all.reduce((sum, e) => sum + e.rating, 0) / all.length).toFixed(2)
    : null;

  const byStage = {};
  const stageGroups = {};
  all.forEach(e => {
    const stage = e.stage || 'general';
    if (!stageGroups[stage]) stageGroups[stage] = [];
    stageGroups[stage].push(e.rating);
  });

  Object.entries(stageGroups).forEach(([stage, ratings]) => {
    byStage[stage] = {
      avg: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2),
      count: ratings.length,
    };
  });

  return { overall: avg, byStage };
}

/**
 * Comment themes — keyword extraction (no external NLP)
 * Maps common Chinese + English keywords to theme categories.
 */
const THEME_KEYWORDS = {
  '流程/体验': ['麻烦', '复杂', '太长', 'question', 'long', 'slow', '耗时', '填写', '问卷'],
  '界面/视觉': ['好看', '漂亮', '简约', '颜色', '配色', '字体', '界面', '设计', 'visual', 'design', 'color', 'clean'],
  '准确性': ['不准', '不准', '不对', '意外', 'wrong', 'incorrect', '惊讶', 'surprise'],
  '推荐质量': ['推荐', '合适', '喜欢', '满意', 'recommend', 'good', 'great', '喜欢'],
  '视频/图片': ['图片', '视频', 'video', 'image', '生成', '效果'],
  '速度': ['快', '慢', '快', 'fast', 'slow', '速度', '延迟', '等待'],
};

function commentThemes(entries) {
  const themed = { '流程/体验': 0, '界面/视觉': 0, '准确性': 0, '推荐质量': 0, '视频/图片': 0, '速度': 0 };
  const unthemed = [];

  entries.forEach(e => {
    const text = ((e.comment || '') + ' ' + (e.mbti || '')).toLowerCase();
    let matched = false;
    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
        themed[theme]++;
        matched = true;
      }
    }
    if (!matched && e.comment && e.comment.trim().length > 0) {
      unthemed.push(e.comment.trim().slice(0, 80));
    }
  });

  return { themed, unthemed: unthemed.slice(0, 10) }; // cap unthemed samples
}

/**
 * MBTI breakdown of respondents
 */
function mbtiBreakdown(entries) {
  const breakdown = {};
  entries.forEach(e => {
    if (e.mbti) {
      breakdown[e.mbti] = (breakdown[e.mbti] || 0) + 1;
    }
  });
  return breakdown;
}

/**
 * Feedback submission rate by stage
 * (proxy for engagement)
 */
function submissionByStage(entries) {
  const byStage = {};
  entries.forEach(e => {
    const stage = e.stage || 'general';
    if (!byStage[stage]) byStage[stage] = { count: 0, withComment: 0 };
    byStage[stage].count++;
    if (e.comment && e.comment.trim().length > 10) {
      byStage[stage].withComment++;
    }
  });
  return byStage;
}

// ─── Output Formatters ─────────────────────────────────────────

function formatTable(data) {
  const lines = [];
  const divider = '─'.repeat(60);

  lines.push('');
  lines.push('  MIRASUIT — Alpha Feedback Analysis');
  lines.push(`  Generated: ${new Date().toISOString()}`);
  lines.push(divider);

  // Rating distribution
  const dist = data.ratingDistribution;
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  lines.push(`\n  Rating Distribution  (n=${total})`);
  [5, 4, 3, 2, 1].forEach(star => {
    const count = dist[star];
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
    const bar = '█'.repeat(Math.round(count / Math.max(total, 1) * 20));
    lines.push(`  ${star}★ ${bar} ${count} (${pct}%)`);
  });

  // Average
  lines.push(`\n  Average Rating: ${data.averages.overall || 'N/A'} / 5.0`);

  // By stage
  lines.push('\n  Average by Stage:');
  Object.entries(data.averages.byStage).forEach(([stage, info]) => {
    lines.push(`    ${stage.padEnd(16)} avg ${info.avg}  (n=${info.count})`);
  });

  // Themes
  lines.push('\n  Comment Themes:');
  const themed = Object.entries(data.themes.themed).sort((a, b) => b[1] - a[1]);
  themed.forEach(([theme, count]) => {
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
    lines.push(`    ${theme.padEnd(16)} ${String(count).padStart(3)} mentions  (${pct}%)`);
  });

  // MBTI
  const mbtis = Object.entries(data.mbtiBreakdown).sort((a, b) => b[1] - a[1]);
  if (mbtis.length > 0) {
    lines.push('\n  MBTI Respondents:');
    mbtis.forEach(([mbti, count]) => {
      lines.push(`    ${mbti.padEnd(6)} ${String(count).padStart(3)} users`);
    });
  }

  // Submission by stage
  lines.push('\n  Feedback by Stage:');
  Object.entries(data.submissionByStage).forEach(([stage, info]) => {
    const pct = info.count > 0 ? ((info.withComment / info.count) * 100).toFixed(0) : 0;
    lines.push(`    ${stage.padEnd(16)} ${String(info.count).padStart(3)} submitted  ${info.withComment} with comment (${pct}%)`);
  });

  // Sample comments
  if (data.themes.unthemed.length > 0) {
    lines.push('\n  Unclassified Comments (sample):');
    data.themes.unthemed.slice(0, 5).forEach(c => {
      lines.push(`    "${c.slice(0, 60)}${c.length > 60 ? '…' : ''}"`);
    });
  }

  // Recommendations
  lines.push('\n' + divider);
  lines.push('  MIRASUIT Consultant Assessment:');
  const recs = generateRecommendations(data);
  recs.forEach((r, i) => lines.push(`  ${i + 1}. ${r}`));

  lines.push('');
  return lines.join('\n');
}

function generateRecommendations(data) {
  const recs = [];
  const dist = data.ratingDistribution;
  const total = Object.entries(dist).reduce((a, [, v]) => a + v, 0);

  // Low rating signal
  const lowRatingPct = total > 0 ? ((dist[1] + dist[2]) / total) * 100 : 0;
  if (lowRatingPct > 20) {
    recs.push(`${lowRatingPct.toFixed(0)}% of ratings are 1-2 stars. Priority: review negative comments for patterns.`);
  }

  // Missing comments
  const noComment = total - data.themes.unthemed.length;
  if (total > 3 && noComment / total < 0.3) {
    recs.push('Low comment-to-rating ratio. Consider adding a required comment field for ratings below 3 stars.');
  }

  // MBTI coverage
  const mbtiCount = Object.keys(data.mbtiBreakdown).length;
  if (mbtiCount < 4) {
    recs.push(`Only ${mbtiCount} MBTI types represented. Encourage wider distribution for balanced analysis.`);
  }

  // Stage coverage
  const stages = Object.keys(data.submissionByStage);
  if (!stages.includes('questionnaire') && !stages.includes('results')) {
    recs.push('No feedback from questionnaire or results stages. Consider in-context feedback prompts.');
  }

  if (recs.length === 0) {
    recs.push('Feedback signals are healthy. No immediate action required.');
  }

  return recs;
}

function formatJSON(data) {
  return JSON.stringify(data, null, 2);
}

// ─── Main ─────────────────────────────────────────────────────

function main() {
  const entries = loadFeedback();

  if (entries.length === 0) {
    console.error('[MIRA] No feedback entries found.');
    process.exit(0);
  }

  const analysis = {
    generatedAt: new Date().toISOString(),
    source: args.source,
    totalEntries: entries.length,
    ratingDistribution: ratingDistribution(entries),
    averages: averageRatings(entries),
    themes: commentThemes(entries),
    mbtiBreakdown: mbtiBreakdown(entries),
    submissionByStage: submissionByStage(entries),
  };

  const output = args.format === 'json'
    ? formatJSON(analysis)
    : formatTable(analysis);

  console.log(output);
}

main();
