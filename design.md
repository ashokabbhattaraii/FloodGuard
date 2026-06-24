---
version: alpha
name: "Torivo Dark Indigo"
description: "Torivo is a dark-themed business/dashboard marketing site built on a deep navy-indigo canvas (#08081e). The hero section features a dramatic large-scale typographic treatment that pairs Geist (sans-serif) with Instrument Serif (italic) for expressive headline contrast. Navigation uses a frosted-glass pill container with a subtle border. CTAs are rendered as fully-rounded pill buttons. Depth is conveyed through a radial purple-blue gradient background and glowing box-shadows in the brand purple (#7c7cff). The overall aesthetic is confident, modern-dark, and brand-forward."
colors:
  pure-white: "#ffffff"
  brand-purple: "#7c7cff"
  background-deep-navy: "#08081e"
  off-white-text: "#f6f6f6"
  muted-gray: "#b5b5bb"
  indigo-border: "#474c84"
typography:
  display-hero:
    fontFamily: "Geist, sans-serif"
    fontSize: "100px"
    fontWeight: "400"
    lineHeight: "110px"
  heading-1:
    fontFamily: "Geist, sans-serif"
    fontSize: "72px"
    fontWeight: "400"
    lineHeight: "79.2px"
  heading-1-serif-accent:
    fontFamily: "Instrumentserif, Arial, sans-serif"
    fontSize: "72px"
    fontWeight: "400"
    lineHeight: "79.2px"
  heading-2:
    fontFamily: "Geist, sans-serif"
    fontSize: "52px"
    fontWeight: "400"
    lineHeight: "52px"
  heading-3:
    fontFamily: "Geist, sans-serif"
    fontSize: "40px"
    fontWeight: "400"
    lineHeight: "56px"
  heading-4:
    fontFamily: "Geist, sans-serif"
    fontSize: "36px"
    fontWeight: "400"
    lineHeight: "39.6px"
  heading-5:
    fontFamily: "Geist, sans-serif"
    fontSize: "28px"
    fontWeight: "400"
    lineHeight: "39.2px"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "20px"
    fontWeight: "400"
    lineHeight: "28px"
  body-small:
    fontFamily: "Geist, sans-serif"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "20.8px"
  label-light:
    fontFamily: "Geist, sans-serif"
    fontSize: "14px"
    fontWeight: "300"
    lineHeight: "19.6px"
rounded:
  radius-pill: "100px"
  radius-card: "14px"
  radius-input: "8px"
  radius-tag: "12px"
  radius-sm: "16px"
spacing:
  space-1: "1px"
  space-2: "2px"
  space-8: "8px"
  space-10: "10px"
  space-12: "12px"
  space-14: "14px"
  space-15: "15px"
  space-16: "16px"
  space-20: "20px"
  space-24: "24px"
  space-25: "25px"
  space-32: "32px"
  space-40: "40px"
  space-50: "50px"
  space-52: "52px"
  space-60: "60px"
components:
  button-pill-primary:
    textColor: "{colors.pure-white}"
    backgroundColor: "rgba(0, 0, 0, 0)"
    rounded: "{rounded.radius-pill}"
    padding: "{spacing.space-1}"
    fontSize: "20px"
    borderWidth: "0px"
  headline-display-h1:
    fontSize: "100px"
    fontFamily: "Geist, sans-serif"
    fontWeight: "400"
    lineHeight: "110px"
    textColor: "{colors.off-white-text}"
    rounded: "0px"
    padding: "0px"
  headline-serif-italic-accent:
    fontSize: "100px"
    fontFamily: "Instrumentserif, Arial, sans-serif"
    fontWeight: "400"
    fontStyle: "italic"
    lineHeight: "110px"
    textColor: "{colors.off-white-text}"
  hero:
    textColor: "{colors.off-white-text}"
    backgroundColor: "transparent"
    padding: "0px 15px"
    fontSize: "20px"
    backgroundGradient: "radial from #191960 to #08081e"
  nav-dropdown-toggle:
    textColor: "{colors.muted-gray}"
    backgroundColor: "transparent"
    borderWidth: "0px"
    rounded: "0px"
    padding: "0px 14px"
    fontSize: "20px"
  nav-menu:
    textColor: "{colors.off-white-text}"
    backgroundColor: "transparent"
    padding: "0px"
    fontSize: "20px"
  navbar-container:
    backgroundColor: "rgba(255, 255, 255, 0.15)"
    borderColor: "rgba(71, 76, 132, 0.15)"
    borderWidth: "{spacing.space-1}"
    rounded: "{rounded.radius-pill}"
    padding: "8px 8px 8px 24px"
    boxShadow: "none"
    textColor: "{colors.off-white-text}"
---

## Overview

Torivo is a dark-themed business/dashboard marketing site built on a deep navy-indigo canvas (#08081e). The hero section features a dramatic large-scale typographic treatment that pairs Geist (sans-serif) with Instrument Serif (italic) for expressive headline contrast. Navigation uses a frosted-glass pill container with a subtle border. CTAs are rendered as fully-rounded pill buttons. Depth is conveyed through a radial purple-blue gradient background and glowing box-shadows in the brand purple (#7c7cff). The overall aesthetic is confident, modern-dark, and brand-forward.

**Signature traits:**
- Dual typeface system: Pairs Geist, sans-serif and Instrumentserif, Arial, sans-serif across the type hierarchy.
- Soft, rounded geometry: Generous corner rounding up to 100px.
- Layered elevation: Depth comes from 2 validated shadow tokens.

## Colors

The palette uses 6 validated color tokens across 1 theme profile. Semantic roles stay attached to observed usage so generation agents can choose accents without inventing new color meaning.

**Semantic naming:**
- **surface-background** maps to `background-deep-navy`: Role "background" is grounded by usage context "Primary page background, hero section fill".
- **action-background** maps to `off-white-text`: Role "background" is grounded by usage context "Primary body text, headings, nav links on dark background".
- **action-primary** maps to `pure-white`: Role "primary" is grounded by usage context "CTA button text, logo mark, high-emphasis foreground elements".
- **content-accent** maps to `brand-purple`: Role "accent" is grounded by usage context "Glow shadows, brand accent highlights, primary color token".

### Primary Brand
- **Pure White** (#ffffff): CTA button text, logo mark, high-emphasis foreground elements. Role: primary.
- **Brand Purple** (#7c7cff): Glow shadows, brand accent highlights, primary color token. Role: accent.

### Text Scale
- **Muted Gray** (#b5b5bb): Secondary text, nav dropdown labels, subdued UI text. Role: text.

### Interactive
- **Indigo Border** (#474c84): Navbar container border (rgba 15% opacity), subtle dividers. Role: border.

### Surface & Shadows
- **Background Deep Navy** (#08081e): Primary page background, hero section fill. Role: background.
- **Off-White Text** (#f6f6f6): Primary body text, headings, nav links on dark background. Role: background.

## Typography

Typography uses Geist, sans-serif, Instrumentserif, Arial, sans-serif across extracted hierarchy roles. Keep hierarchy mapped to these token rows before adding decorative type styles.

Mixes Geist, sans-serif and Instrumentserif, Arial, sans-serif for visual contrast. Weight range spans regular, light. Sizes range from 14px to 100px.

### Font Roles
- **Headline Font**: Geist
- **Body Font**: Geist

### Type Scale Evidence
| Role | Font | Size | Weight | Line Height | Letter Spacing | Stack / Features | Notes |
|------|------|------|--------|-------------|----------------|------------------|-------|
| Largest hero headline, paired with Instrument Serif italic span | Geist, sans-serif | 100px | 400 | 110px | normal | Geist, sans-serif | Extracted token |
| Primary section headings | Geist, sans-serif | 72px | 400 | 79.2px | normal | Geist, sans-serif | Extracted token |
| Italic serif accent within hero headline for expressive contrast | Instrumentserif, Arial, sans-serif | 72px | 400 | 79.2px | normal | Instrumentserif, Arial, sans-serif | Extracted token |
| Secondary section headings | Geist, sans-serif | 52px | 400 | 52px | normal | Geist, sans-serif | Extracted token |
| Tertiary headings, feature titles | Geist, sans-serif | 40px | 400 | 56px | normal | Geist, sans-serif | Extracted token |
| Card headings, subsection titles | Geist, sans-serif | 36px | 400 | 39.6px | normal | Geist, sans-serif | Extracted token |
| Small section headings | Geist, sans-serif | 28px | 400 | 39.2px | normal | Geist, sans-serif | Extracted token |
| Primary body text, nav links, descriptions | Geist, sans-serif | 20px | 400 | 28px | normal | Geist, sans-serif | Extracted token |
| Small body text, captions | Geist, sans-serif | 16px | 400 | 20.8px | normal | Geist, sans-serif | Extracted token |
| Fine print, metadata labels | Geist, sans-serif | 14px | 300 | 19.6px | normal | Geist, sans-serif | Extracted token |

## Layout

Responsive system uses 2 breakpoint tier(s): mobile, tablet.

This system uses a 8px base grid with scale values 1, 2, 8, 10, 12, 14, 15, 16, 20, 24, 25, 32, 40, 50, 52, 60, 80, 100, 152, 250.

### Responsive Strategy
- **mobile (480-767px)**: Constrain layout for small viewports and prioritize vertical stacking.
- **tablet (768-991px)**: Increase spacing and column structure for medium-width viewports.

### Spacing System
| Token | Value | Px | Notes |
|------|-------|----|-------|
| space-1 | 1px | 1 | Extracted spacing token |
| space-2 | 2px | 2 | Extracted spacing token |
| space-8 | 8px | 8 | Extracted spacing token |
| space-10 | 10px | 10 | Extracted spacing token |
| space-12 | 12px | 12 | Extracted spacing token |
| space-14 | 14px | 14 | Extracted spacing token |
| space-15 | 15px | 15 | Extracted spacing token |
| space-16 | 16px | 16 | Extracted spacing token |
| space-20 | 20px | 20 | Extracted spacing token |
| space-24 | 24px | 24 | Extracted spacing token |
| space-25 | 25px | 25 | Extracted spacing token |
| space-32 | 32px | 32 | Extracted spacing token |
| space-40 | 40px | 40 | Extracted spacing token |
| space-50 | 50px | 50 | Extracted spacing token |
| space-52 | 52px | 52 | Extracted spacing token |
| space-60 | 60px | 60 | Extracted spacing token |
| space-80 | 80px | 80 | Extracted spacing token |
| space-100 | 100px | 100 | Extracted spacing token |
| space-152 | 152px | 152 | Extracted spacing token |
| space-250 | 250px | 250 | Extracted spacing token |

## Elevation & Depth

Keep depth flat unless validated shadow or interaction evidence appears in the extraction payload. Do not invent shadows beyond this evidence boundary.

### Shadow Evidence
| Shadow Token | Layers | Details |
|--------------|--------|---------|
| glow-primary | 1 | 0px 0px 18px 5px rgba(124, 124, 255, 0.5) |
| glow-inset-primary | 1 | inset 3px 3px 9px 0px rgba(99, 99, 255, 0.3) |

### Interaction Signals
| Theme | Signal | Evidence |
|-------|--------|----------|
| Light | backdrop-filter | blur(84px) ; blur(80px) ; blur(20px) |
| Light | outline-color | rgb(246, 246, 246) ; rgb(181, 181, 187) ; rgb(255, 255, 255) |
| Light | outline-width | 3px |
| Light | outline-offset | 0px |
| Light | transform | matrix(1, 0, 0, 1, 0, 0) ; matrix(1, 0, 0, 1, 0, 60) ; matrix(0.624448, 0.781067, -0.781067, 0.624448, 0, 0) |

## Shapes

Shape language maps directly to rounded tokens. Keep component corners consistent with the role mapping below before introducing bespoke geometry.

### Radius Roles
| Token | Value | Px | Role Mapping |
|------|-------|----|--------------|
| radius-input | 8px | 8 | Control corner |
| radius-tag | 12px | 12 | Control corner |
| radius-card | 14px | 14 | Card corner |
| radius-sm | 16px | 16 | Card corner |
| radius-pill | 100px | 100 | Large surface corner |

### Geometry Evidence
| Radius Token | Shape | Units |
|--------------|-------|-------|
| radius-pill | 100px | px |
| radius-card | 14px | px |
| radius-input | 8px | px |
| radius-tag | 12px | px |
| radius-sm | 16px | px |

## Components

Components should be recreated from token references first, then tuned with variant notes and probe-backed state guidance.
- **Navbar Container**: Floating pill-shaped navbar with frosted glass background (rgba white 15%), subtle indigo border, and pill border-radius. Contains logo, nav links, and CTA button.
- **Nav Dropdown Toggle**: Inline nav link with dropdown affordance. Transparent background, no border, muted gray text.
- **Primary CTA Button**: Fully-rounded pill CTA button. Appears in navbar and hero section. White text on semi-transparent background with pill radius.
- **Hero Section**: Full-viewport dark hero with radial indigo-purple gradient background, centered large headline mixing Geist and Instrument Serif italic, body copy, and a CTA button.
- **Hero Headline**: Display-scale heading at 100px using Geist for upright text and Instrument Serif italic for expressive accent words.
- **Nav Menu**: Horizontal unordered list of nav items rendered inline within the navbar pill.

### Button

**Pill Primary**
- textColor: #ffffff
- backgroundColor: rgba(0, 0, 0, 0)
- rounded: 100px
- padding: 1px
- fontSize: 20px
- borderWidth: 0px
- State guidance: Probe-confirmed via a.primary-button. Visually appears as a frosted/semi-opaque pill button in screenshots.

### Headline

**Display H1**
- fontSize: 100px
- fontFamily: Geist, sans-serif
- fontWeight: 400
- lineHeight: 110px
- textColor: #f6f6f6
- rounded: 0px
- padding: 0px
- State guidance: Probe-confirmed via h1.page-intro-text. Italic serif accent words use --font-family--highlight-font (Instrument Serif).

**Serif Italic Accent**
- fontSize: 100px
- fontFamily: Instrumentserif, Arial, sans-serif
- fontWeight: 400
- fontStyle: italic
- lineHeight: 110px
- textColor: #f6f6f6
- State guidance: Visually confirmed in screenshot — 'your business' rendered in italic serif within the headline.

### Hero

**Default**
- textColor: #f6f6f6
- backgroundColor: transparent
- padding: 0px 15px
- fontSize: 20px
- backgroundGradient: radial from #191960 to #08081e
- State guidance: Probe-confirmed via div.w-layout-blockcontainer. Background gradient uses --gradient-color--gradient-color-one (#191960) blending into --color--bg-color (#08081e).

### Nav Dropdown Toggle

**Default**
- textColor: #b5b5bb
- backgroundColor: transparent
- borderWidth: 0px
- rounded: 0px
- padding: 0px 14px
- fontSize: 20px
- State guidance: Probe-confirmed. Uses --color--gray-color for subdued nav link appearance.

### Nav Menu

**Default**
- textColor: #f6f6f6
- backgroundColor: transparent
- padding: 0px
- fontSize: 20px
- State guidance: Probe-confirmed via ul.nav-menu and nav.nav-menu-wrapper.

### Navbar Container

**Default**
- backgroundColor: rgba(255, 255, 255, 0.15)
- borderColor: rgba(71, 76, 132, 0.15)
- borderWidth: 1px
- rounded: 100px
- padding: 8px 8px 8px 24px
- boxShadow: none
- textColor: #f6f6f6
- State guidance: Probe-confirmed. Frosted glass pill nav floats over dark hero background.

## Do's and Don'ts

Guardrails protect Dual typeface system, Soft, rounded geometry, Layered elevation without adding unsupported visual claims.

| Do | Don't |
|----|---------|
| Do maintain consistent spacing using the base grid | Don't make unsupported claims about absent visual features |
| Do maintain WCAG AA contrast ratios (4.5:1 for normal text) | Don't mix rounded and sharp corners in the same view |
| Do use the primary color only for the single most important action per screen |  |
| Do verify evidence before writing new design-system guidance |  |

## Responsive Evidence

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <= 479px | (max-width: 479px) |
| Mobile | 480-767px | (max-width: 767px) and (min-width: 480px) |
| Tablet | 768-991px | (max-width: 991px) and (min-width: 768px) |
| Tablet | >= 992px | (min-width: 992px) |

## Agent Prompt Guide

### Example Component Prompts
- Create Hero Headline variant that preserves Display-scale heading at 100px using Geist for upright text and Instrument Serif italic for expressive accent words..
- Create Hero Section variant that preserves Full-viewport dark hero with radial indigo-purple gradient background, centered large headline mixing Geist and Instrument Serif italic, body copy, and a CTA button..
- Create Nav Dropdown Toggle variant that preserves Inline nav link with dropdown affordance. Transparent background, no border, muted gray text..

### Iteration Guide
1. Start with extracted palette and typography roles only.
2. Map spacing and radius directly from token tables before visual polish.
3. Apply component patterns one section at a time and compare against source intent.
4. Keep elevation claims tied to explicit evidence in output.
5. Iterate with smallest diffs and re-check section hierarchy after each change.






@theme {
  /* Colors */
  --color-background-deep-navy: #08081e;
  --color-off-white-text: #f6f6f6;
  --color-pure-white: #ffffff;
  --color-brand-purple: #7c7cff;
  --color-muted-gray: #b5b5bb;
  --color-indigo-border: #474c84;

  /* Spacing */
  --spacing-space-1: 1px;
  --spacing-space-2: 2px;
  --spacing-space-8: 8px;
  --spacing-space-10: 10px;
  --spacing-space-12: 12px;
  --spacing-space-14: 14px;
  --spacing-space-15: 15px;
  --spacing-space-16: 16px;
  --spacing-space-20: 20px;
  --spacing-space-24: 24px;
  --spacing-space-25: 25px;
  --spacing-space-32: 32px;
  --spacing-space-40: 40px;
  --spacing-space-50: 50px;
  --spacing-space-52: 52px;
  --spacing-space-60: 60px;
  --spacing-space-80: 80px;
  --spacing-space-100: 100px;
  --spacing-space-152: 152px;
  --spacing-space-250: 250px;

  /* Border Radius */
  --radius-radius-pill: 100px;
  --radius-radius-card: 14px;
  --radius-radius-input: 8px;
  --radius-radius-tag: 12px;
  --radius-radius-sm: 16px;

  /* Fonts */
  --font-geist: "Geist", sans-serif;
  --font-instrument-serif: "Instrument Serif", sans-serif;

}




:root {
  /* Colors */
  --color-background-deep-navy: #08081e;
  --color-off-white-text: #f6f6f6;
  --color-pure-white: #ffffff;
  --color-brand-purple: #7c7cff;
  --color-muted-gray: #b5b5bb;
  --color-indigo-border: #474c84;

  /* Typography */
  --font-display-hero-family: Geist, sans-serif;
  --font-display-hero-size: 100px;
  --font-display-hero-weight: 400;
  --font-display-hero-line-height: 110px;
  --font-heading-1-family: Geist, sans-serif;
  --font-heading-1-size: 72px;
  --font-heading-1-weight: 400;
  --font-heading-1-line-height: 79.2px;
  --font-heading-1-serif-accent-family: Instrumentserif, Arial, sans-serif;
  --font-heading-1-serif-accent-size: 72px;
  --font-heading-1-serif-accent-weight: 400;
  --font-heading-1-serif-accent-line-height: 79.2px;
  --font-heading-2-family: Geist, sans-serif;
  --font-heading-2-size: 52px;
  --font-heading-2-weight: 400;
  --font-heading-2-line-height: 52px;
  --font-heading-3-family: Geist, sans-serif;
  --font-heading-3-size: 40px;
  --font-heading-3-weight: 400;
  --font-heading-3-line-height: 56px;
  --font-heading-4-family: Geist, sans-serif;
  --font-heading-4-size: 36px;
  --font-heading-4-weight: 400;
  --font-heading-4-line-height: 39.6px;
  --font-heading-5-family: Geist, sans-serif;
  --font-heading-5-size: 28px;
  --font-heading-5-weight: 400;
  --font-heading-5-line-height: 39.2px;
  --font-body-family: Geist, sans-serif;
  --font-body-size: 20px;
  --font-body-weight: 400;
  --font-body-line-height: 28px;
  --font-body-small-family: Geist, sans-serif;
  --font-body-small-size: 16px;
  --font-body-small-weight: 400;
  --font-body-small-line-height: 20.8px;
  --font-label-light-family: Geist, sans-serif;
  --font-label-light-size: 14px;
  --font-label-light-weight: 300;
  --font-label-light-line-height: 19.6px;

  /* Spacing */
  --spacing-space-1: 1px;
  --spacing-space-2: 2px;
  --spacing-space-8: 8px;
  --spacing-space-10: 10px;
  --spacing-space-12: 12px;
  --spacing-space-14: 14px;
  --spacing-space-15: 15px;
  --spacing-space-16: 16px;
  --spacing-space-20: 20px;
  --spacing-space-24: 24px;
  --spacing-space-25: 25px;
  --spacing-space-32: 32px;
  --spacing-space-40: 40px;
  --spacing-space-50: 50px;
  --spacing-space-52: 52px;
  --spacing-space-60: 60px;
  --spacing-space-80: 80px;
  --spacing-space-100: 100px;
  --spacing-space-152: 152px;
  --spacing-space-250: 250px;

  /* Border Radius */
  --radius-radius-pill: 100px;
  --radius-radius-card: 14px;
  --radius-radius-input: 8px;
  --radius-radius-tag: 12px;
  --radius-radius-sm: 16px;

}



{
  "color": {
    "Background Deep Navy": {
      "$type": "color",
      "$value": "#08081e",
      "$description": "Primary page background, hero section fill"
    },
    "Off-White Text": {
      "$type": "color",
      "$value": "#f6f6f6",
      "$description": "Primary body text, headings, nav links on dark background"
    },
    "Pure White": {
      "$type": "color",
      "$value": "#ffffff",
      "$description": "CTA button text, logo mark, high-emphasis foreground elements"
    },
    "Brand Purple": {
      "$type": "color",
      "$value": "#7c7cff",
      "$description": "Glow shadows, brand accent highlights, primary color token"
    },
    "Muted Gray": {
      "$type": "color",
      "$value": "#b5b5bb",
      "$description": "Secondary text, nav dropdown labels, subdued UI text"
    },
    "Indigo Border": {
      "$type": "color",
      "$value": "#474c84",
      "$description": "Navbar container border (rgba 15% opacity), subtle dividers"
    }
  },
  "typography": {
    "Display Hero": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Geist, sans-serif",
        "fontSize": "100px",
        "fontWeight": 400,
        "lineHeight": "110px",
        "letterSpacing": "normal"
      },
      "$description": "Largest hero headline, paired with Instrument Serif italic span"
    },
    "Heading 1": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Geist, sans-serif",
        "fontSize": "72px",
        "fontWeight": 400,
        "lineHeight": "79.2px",
        "letterSpacing": "normal"
      },
      "$description": "Primary section headings"
    },
    "Heading 1 Serif Accent": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Instrumentserif, Arial, sans-serif",
        "fontSize": "72px",
        "fontWeight": 400,
        "lineHeight": "79.2px",
        "letterSpacing": "normal"
      },
      "$description": "Italic serif accent within hero headline for expressive contrast"
    },
    "Heading 2": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Geist, sans-serif",
        "fontSize": "52px",
        "fontWeight": 400,
        "lineHeight": "52px",
        "letterSpacing": "normal"
      },
      "$description": "Secondary section headings"
    },
    "Heading 3": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Geist, sans-serif",
        "fontSize": "40px",
        "fontWeight": 400,
        "lineHeight": "56px",
        "letterSpacing": "normal"
      },
      "$description": "Tertiary headings, feature titles"
    },
    "Heading 4": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Geist, sans-serif",
        "fontSize": "36px",
        "fontWeight": 400,
        "lineHeight": "39.6px",
        "letterSpacing": "normal"
      },
      "$description": "Card headings, subsection titles"
    },
    "Heading 5": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Geist, sans-serif",
        "fontSize": "28px",
        "fontWeight": 400,
        "lineHeight": "39.2px",
        "letterSpacing": "normal"
      },
      "$description": "Small section headings"
    },
    "Body": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Geist, sans-serif",
        "fontSize": "20px",
        "fontWeight": 400,
        "lineHeight": "28px",
        "letterSpacing": "normal"
      },
      "$description": "Primary body text, nav links, descriptions"
    },
    "Body Small": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Geist, sans-serif",
        "fontSize": "16px",
        "fontWeight": 400,
        "lineHeight": "20.8px",
        "letterSpacing": "normal"
      },
      "$description": "Small body text, captions"
    },
    "Label Light": {
      "$type": "typography",
      "$value": {
        "fontFamily": "Geist, sans-serif",
        "fontSize": "14px",
        "fontWeight": 300,
        "lineHeight": "19.6px",
        "letterSpacing": "normal"
      },
      "$description": "Fine print, metadata labels"
    }
  },
  "spacing": {
    "space-1": {
      "$type": "dimension",
      "$value": "1px"
    },
    "space-2": {
      "$type": "dimension",
      "$value": "2px"
    },
    "space-8": {
      "$type": "dimension",
      "$value": "8px"
    },
    "space-10": {
      "$type": "dimension",
      "$value": "10px"
    },
    "space-12": {
      "$type": "dimension",
      "$value": "12px"
    },
    "space-14": {
      "$type": "dimension",
      "$value": "14px"
    },
    "space-15": {
      "$type": "dimension",
      "$value": "15px"
    },
    "space-16": {
      "$type": "dimension",
      "$value": "16px"
    },
    "space-20": {
      "$type": "dimension",
      "$value": "20px"
    },
    "space-24": {
      "$type": "dimension",
      "$value": "24px"
    },
    "space-25": {
      "$type": "dimension",
      "$value": "25px"
    },
    "space-32": {
      "$type": "dimension",
      "$value": "32px"
    },
    "space-40": {
      "$type": "dimension",
      "$value": "40px"
    },
    "space-50": {
      "$type": "dimension",
      "$value": "50px"
    },
    "space-52": {
      "$type": "dimension",
      "$value": "52px"
    },
    "space-60": {
      "$type": "dimension",
      "$value": "60px"
    },
    "space-80": {
      "$type": "dimension",
      "$value": "80px"
    },
    "space-100": {
      "$type": "dimension",
      "$value": "100px"
    },
    "space-152": {
      "$type": "dimension",
      "$value": "152px"
    },
    "space-250": {
      "$type": "dimension",
      "$value": "250px"
    }
  },
  "borderRadius": {
    "radius-pill": {
      "$type": "dimension",
      "$value": "100px"
    },
    "radius-card": {
      "$type": "dimension",
      "$value": "14px"
    },
    "radius-input": {
      "$type": "dimension",
      "$value": "8px"
    },
    "radius-tag": {
      "$type": "dimension",
      "$value": "12px"
    },
    "radius-sm": {
      "$type": "dimension",
      "$value": "16px"
    }
  }
}

