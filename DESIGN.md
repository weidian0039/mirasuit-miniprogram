# MIRASUIT — Miniprogram Design

**Tool:** Pencil (pencilapp.com) — design stored in Pencil app
**Format:** `.pen` files (JSON-based)
**Location:** Pencil app workspace

---

## Screens Designed

| Screen | File | Description |
|--------|------|-------------|
| Home | `KQPIl.png` | Hero + CTA + feature pills + tab bar |
| Questionnaire | `6rfNm.png` | Progress bar + question card + 3 option buttons + dots |
| Results | `mpFAz.png` | Style badge + profile card + recommendations + actions |
| Share | `AJzmu.png` | Template selector + live preview + share buttons |

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| brand-black | `#1a1a1a` | Primary text, nav, CTA |
| brand-accent | `#ff6b35` | Progress, active states, highlights |
| brand-bg | `#fafafa` | Page background |
| brand-gray | `#666666` | Secondary text |
| brand-light-gray | `#999999` | Tertiary text, inactive icons |

**Typography:** SF Pro (system font)
**Corner radius:** 28px (CTA), 16px (cards), 12px (buttons)
**Screen size:** 750×1334 (iPhone 8 standard)

---

## Color Usage

| Element | Color |
|---------|-------|
| Nav bar | `#1a1a1a` |
| Tab bar active | `#1a1a1a` fill |
| Tab bar inactive | `#999999` |
| Accent / progress | `#ff6b35` |
| Body text | `#1a1a1a` |
| Secondary text | `#666666` |
| Border / dividers | `#e8e8e8` |

---

## Component States

**Option buttons (questionnaire):**
- Default: white fill + `#e8e8e8` border
- Selected: `#1a1a1a` fill + white text + accent dot

**CTA button:**
- Primary: `#1a1a1a` fill + white text + full-width pill

**Tab bar:**
- Active: solid `#1a1a1a` pill + white icon/label
- Inactive: transparent + `#999999` icon/label
