# MIRA App - Claude API Integration

## 📋 Overview

This module provides Claude API integration for the MIRASUIT WeChat Mini-Program, enabling:
- **Personality Analysis**: MBTI and Enneagram inference from questionnaire responses
- **Style Recommendations**: Personalized suit recommendations based on personality
- **Brand Voice Alignment**: All responses maintain MIRASUIT's sophisticated, understated tone

## 🏗️ Architecture

```
mirasuit-miniprogram/
├── services/
│   └── claude.js              # Claude API integration service
├── utils/
│   ├── questionnaire.js       # Personality questionnaire
│   └── userProfile.js         # User profile management
├── __tests__/
│   └── claude.test.js         # Integration tests
└── README.md                  # This file
```

## 🚀 Quick Start

### 1. Initialize Services

```javascript
const ClaudeService = require('../../services/claude');
const UserProfileManager = require('../../utils/userProfile');

// Initialize with your Anthropic API key
const claudeService = new ClaudeService('your-api-key-here');
const profileManager = new UserProfileManager();
```

### 2. Process Questionnaire

```javascript
const { QuestionnaireManager } = require('../../utils/questionnaire');

const qm = new QuestionnaireManager();

// Save user responses
qm.saveResponse('social', { value: 'I', weight: 8 });
qm.saveResponse('information', { value: 'N', weight: 8 });
// ... more responses

// Check completion
if (qm.isComplete()) {
  const responses = qm.getResponses();
}
```

### 3. Analyze Personality

```javascript
const analysis = await claudeService.analyzePersonality(responses);

// Returns:
// {
//   mbti: { type: 'INTJ', confidence: 85, breakdown: {...} },
//   enneagram: { type: 5, wing: '6w5', confidence: 80 },
//   traits: ['analytical', 'independent', 'quality-conscious'],
//   styleIndicators: {
//     preference: 'minimalist',
//     attentionToDetail: 'high',
//     colorPalette: 'neutral',
//     riskTolerance: 'conservative'
//   }
// }

// Save to profile
profileManager.savePersonalityAnalysis(analysis);
```

### 4. Get Style Recommendations

```javascript
const recommendations = await claudeService.getStyleRecommendations(
  profileManager.getProfile().personality
);

// Returns:
// {
//   recommendedStyles: ['minimalist', 'architectural'],
//   colorSuggestions: ['navy', 'charcoal', 'black'],
//   fabricPreferences: ['super 120s wool', 'cashmere blend'],
//   fitRecommendation: 'slim',
//   detailLevel: 'minimal',
//   styleAdvice: 'Clean lines...',
//   avoid: ['bold patterns', 'excessive accessories']
// }

// Save to profile
profileManager.saveStylePreferences(recommendations);
```

### 5. Generate Personalized Advice

```javascript
const advice = await claudeService.getPersonalizedAdvice(
  profileManager.getProfile(),
  'business meeting'
);

// Returns:
// {
//   recommendation: 'Charcoal navy suit...',
//   rationale: 'Based on your INTJ personality...',
//   keyConsiderations: ['Fit', 'Fabric', 'Details'],
//   alternatives: ['Navy pinstripe', 'Black tie'],
//   nextSteps: 'Schedule a consultation'
// }
```

## 📊 Questionnaire Structure

The questionnaire consists of 8 dimensions:

1. **Social Interaction** → Extroversion/Introversion (E/I)
2. **Information Processing** → Sensing/Intuition (S/N)
3. **Decision Making** → Thinking/Feeling (T/F)
4. **Lifestyle** → Judging/Perceiving (J/P)
5. **Core Motivation** → Enneagram type (1-9)
6. **Style Preference** → Minimalist/Bold/Classic/Experimental
7. **Detail Level** → High/Medium/Low
8. **Risk Tolerance** → Conservative/Moderate/Adventurous

## 🔒 Privacy & Data Handling

### Local-First Approach
- All user data stored locally using WeChat's `wx.getStorageSync()`
- No data transmitted to MIRASUIT servers
- Claude API calls include only questionnaire responses, not PII

### Data Retention
- Style history: Last 20 items
- Profile data: Persistent until user clears it
- Export/import functionality for backup/transfer

### Compliance
- Privacy-first design aligned with MIRASUIT values
- User can clear all data with `profileManager.clearProfile()`
- No tracking or analytics without explicit consent

## 🧪 Testing

Run the test suite:

```bash
node __tests__/claude.test.js
```

**Test Coverage:**
- ✅ Claude Service: API integration, response parsing, error handling
- ✅ Questionnaire Manager: Response handling, MBTI calculation, completion detection
- ✅ User Profile Manager: Data persistence, history tracking, import/export

## 🎨 Brand Voice Alignment

All Claude API prompts are engineered to maintain MIRASUIT's brand voice:

- **Sophisticated**: Expert menswear knowledge
- **Understated**: Avoid hyperbole, focus on quality
- **Personalized**: Tailored to individual personality
- **Premium**: Emphasize craftsmanship and materials

## 🔧 Configuration

### Environment Variables

```javascript
// In production, load from secure config
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
```

### API Configuration

```javascript
const claudeService = new ClaudeService(apiKey);
// Model: claude-sonnet-4-6 (balance of capability + cost)
// Max tokens: 1024-1536 (varies by task)
// Timeout: 30 seconds
```

## 📈 Performance Considerations

1. **Caching**: Personality analysis results cached locally
2. **Rate Limiting**: Implement client-side rate limiting for API calls
3. **Fallbacks**: Graceful degradation with default recommendations
4. **Optimization**: Use `claude-sonnet-4-6` for cost efficiency

## 🚨 Error Handling

All service methods include:

```javascript
try {
  const result = await claudeService.analyzePersonality(responses);
} catch (error) {
  // Fallback responses provided
  console.error('Analysis failed:', error);
}
```

Fallback responses ensure app functionality even when API is unavailable.

## 📝 API Reference

### ClaudeService

#### `analyzePersonality(responses)`
Analyzes questionnaire responses to determine personality type.

- **Parameters**: `responses` (Object) - User's questionnaire responses
- **Returns**: `Promise<Object>` - Personality analysis results
- **Throws**: Error if API call fails

#### `getStyleRecommendations(personality)`
Generates style recommendations based on personality.

- **Parameters**: `personality` (Object) - Personality analysis results
- **Returns**: `Promise<Object>` - Style recommendations

#### `getPersonalizedAdvice(userProfile, occasion)`
Provides personalized style advice.

- **Parameters**:
  - `userProfile` (Object) - Complete user profile
  - `occasion` (String, optional) - Special occasion context
- **Returns**: `Promise<Object>` - Personalized advice

### UserProfileManager

#### `savePersonalityAnalysis(analysis)`
Saves personality analysis to local profile.

#### `saveStylePreferences(preferences)`
Saves style preferences to local profile.

#### `getStyleHistory(limit)`
Retrieves style history.

- **Parameters**: `limit` (Number) - Max items to return
- **Returns**: Array of style history items

#### `exportProfile()`
Exports profile data as JSON string.

#### `clearProfile()`
Clears all profile data (privacy reset).

## 🎯 Success Metrics

- ✅ API integration: Complete
- ✅ MBTI/Enneagram inference: Functional
- ✅ Style recommendations: Brand-aligned
- ✅ Error handling: Robust with fallbacks
- ✅ Testing: Comprehensive test coverage
- ✅ Documentation: Complete API reference

## 📞 Support

For issues or questions:
- Create task in MIRA App project
- Tag: `app-tech-lead`
- Priority: High (M-3)

---

**MIRASUIT** - Democratizing bespoke menswear through AI-powered personalization.
