---
name: Fluent Productivity Workstation
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1c1c'
  surface-container: '#202020'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c0c7d4'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#303030'
  outline: '#8a919e'
  outline-variant: '#404752'
  surface-tint: '#a3c9ff'
  primary: '#a3c9ff'
  on-primary: '#00315c'
  primary-container: '#0078d4'
  on-primary-container: '#ffffff'
  inverse-primary: '#0060ab'
  secondary: '#7ada95'
  on-secondary: '#00391a'
  secondary-container: '#00753b'
  on-secondary-container: '#98f9b0'
  tertiary: '#ffb5a0'
  on-tertiary: '#601500'
  tertiary-container: '#da3c03'
  on-tertiary-container: '#ffffff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d3e3ff'
  primary-fixed-dim: '#a3c9ff'
  on-primary-fixed: '#001c39'
  on-primary-fixed-variant: '#004883'
  secondary-fixed: '#96f7af'
  secondary-fixed-dim: '#7ada95'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005228'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#ffb5a0'
  on-tertiary-fixed: '#3b0900'
  on-tertiary-fixed-variant: '#872100'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  badge-timer:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.5rem
  margin: 1.5rem
  margin-window: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system translates the principles of Windows 11 Fluent Design into a focused desktop productivity context centered on deadline management and personal scheduling. The visual posture balances systemic precision with immediate emotional clarity: it eliminates cognitive friction during high-stress workflows while maintaining a calm, luminous environment during standard work phases.

The aesthetic utilizes an authentic Material layering model—anchored by Mica and Acrylic translucency—with soft architectural slate tones. Surface clarity and depth replace heavy structural dividing lines. Typography is strictly prioritized for legible scanning, and an assertive tri-tier semantic urgency model directs user attention directly to time-critical tasks without inducing panic.

## Colors

The palette uses layered dark and light neutral tiers calibrated for translucent desktop surfaces, paired with high-salience temporal status tokens.

### Base Surface Architecture
- **Window Base (Mica Background):** `#202020` in dark mode, `#F3F3F3` in light mode. This layer interacts with window-level compositor blurs.
- **Surface Card / Acrylic Layer:** Dark mode uses `#2B2B2B` with 78% opacity; light mode uses `#FFFFFF` with 85% opacity.
- **Surface Elevated (Flyouts, Menus):** Dark mode `#323232` (90% opacity); light mode `#FFFFFF` (96% opacity).
- **Subtle Stroke / Inner Rim:** Dark mode `#FFFFFF0F` (6% white); light mode `#0000000F` (6% black).
- **Primary Text:** Dark mode `#FFFFFF` (100%); light mode `#1A1A1A` (90%).
- **Secondary / Subtitle Text:** Dark mode `#FFFFFF99` (60%); light mode `#00000099` (60%).

### Urgent Deadline Color-Coding Engine
- **Safe Tier (> 48 hours remaining):** Emerald Green (`#107C41` base, `#27AE60` dynamic dark-fill, `#D4EDDA` light-tint background, `#0D522C` dark-tint background). Denotes settled status, low anxiety.
- **Warning Tier (24h to 48h remaining):** Vivid Amber/Orange (`#D83B01` base, `#E67E22` dynamic dark-fill, `#FDEED9` light-tint background, `#5A1C00` dark-tint background). Signals required focus.
- **Urgent & Overdue Tier (< 6h remaining or past due):** Crimson Rose (`#D13438` base, `#FF4343` high-luminance accent, `#FDE7E9` light-tint background, `#4D0E11` dark-tint background). Triggers ambient priority alerts and badge highlighting.

## Typography

The type hierarchy is configured for high-density Windows desktop productivity. Body and headline layers use clean, proportional grotesque forms calibrated for UI rendering down to 11px, while deadline counters, timestamps, and urgency tags use a monospace font to prevent layout jitter during live-updating countdowns.

- **Display & Section Titles:** Emphasize window level hierarchy without dominating the canvas.
- **Body Rhythm:** `body-md` (13px/18px) serves as the primary system reading size, matching native desktop interaction scales.
- **Monospace Metadata:** Live countdowns (`hh:mm:ss`) and deadline tags utilize tabular numerical figures for optical vertical alignment inside cards and list rows.

## Layout & Spacing

The structural layout strictly adheres to native desktop multi-pane ergonomics:
- **Title Bar Canvas:** 32px height fixed at window top, integrating app drag region, quick search, and native window control accommodations (minimize, maximize, close) with right-side safety padding.
- **Left Navigation Rail / Sidebar:** Two states: collapsed (48px rail displaying iconic triggers) and expanded (260px pane housing project trees and date filters).
- **Master-Detail Workspace:** A responsive fluid split-view. The task board/list pane occupies 40-50% width minimum, opening an expansive detail/inspector flyout on selection.
- **Content Density:** Component padding scales down in table/list density modes via `space-xs` and `space-sm` increments, ensuring data-heavy deadline matrices remain completely readable on 1080p and 4K displays.

## Elevation & Depth

Visual depth combines physical material simulation and directional light rather than heavy dark shadows.

- **Window Canvas (Mica):** The foundation layer. It samples desktop wallpaper tones through a static blur, producing a subtle contextual tint.
- **Floating Panels & Cards (Acrylic):** Use a compound style consisting of:
  - Background: `rgba(43, 43, 43, 0.75)`
  - Backdrop Filter: `blur(30px) saturate(125%)`
  - Top highlight stroke: 1px solid `rgba(255, 255, 255, 0.08)`
  - Bottom shadow: `0 4px 12px rgba(0, 0, 0, 0.14)`
- **Overdue Task Pulse Elevation:** Cards tagged `< 6h` or `Overdue` project a tinted ambient red cast: `box-shadow: 0 0 16px rgba(209, 52, 56, 0.25)`.
- **Flyouts & Command Palettes:** High-elevation popovers use `0 12px 32px rgba(0, 0, 0, 0.32)` paired with a continuous 1px outline of `rgba(255, 255, 255, 0.12)`.

## Shapes

The shape vocabulary uses the rounded corner geometry standard in modern Windows desktop environments.
- Outer container cards, canvas dialogs, and detail inspectors use `rounded-xl` (1.5rem / 24px) or `rounded-lg` (1rem / 16px) depending on surface nesting.
- Interactive elements (buttons, inputs, status tags, list selection backdrops) use `rounded` (0.5rem / 8px).
- Status dots, priority pills, and window control buttons follow strict circle or full-radius pill forms.
- Inner elements inside a container maintain concentric alignment by keeping their radius equal to the outer radius minus the intervening padding.

## Components

### Window Title Bar
- A seamless, interactive 32px top strip.
- Includes navigation breadcrumbs, centered search bar with Acrylic background, and preserved native control hit targets on the top right.

### Navigation Rail
- Left-aligned surface using subtle Mica material.
- Nav items: 36px tall, 4px left-indicator accent pill (in primary blue) activated on focus/selection.
- Includes badge counters for total overdue tasks displayed in high-contrast red.

### Task & Deadline Cards
- Multi-tier surface architecture: 1px perimeter border (`rgba(255, 255, 255, 0.06)`), 12px interior padding.
- Left edge features a 3px vertical accent bar corresponding to the task's urgency tier (Emerald, Amber, or Crimson).
- Includes embedded countdown chip: monospace timer format, dynamic pill border, and urgency icon.

### Urgency Micro-Badges
- Small, readable status chips for task rows.
- **Safe (>48h):** Green background (`rgba(16, 124, 65, 0.15)`), green border (`#107C41`), text `#27AE60`.
- **Warning (24h-48h):** Amber background (`rgba(216, 59, 1, 0.15)`), amber border (`#D83B01`), text `#E67E22`.
- **Urgent (<6h):** Crimson background (`rgba(209, 52, 56, 0.2)`), crimson border (`#D13438`), text `#FF4343`. Supports a CSS keyframe opacity pulse animation (`1.0` to `0.4` over a 2s cycle).

### Form Controls & Inputs
- **Inputs:** Height 32px, `rounded` (8px), background `rgba(255, 255, 255, 0.04)`, bottom border accent 2px that animates on focus from neutral to primary `#0078D4`.
- **Checkboxes:** 18x18px rounded square (4px radius). When completing a deadline, transitions through an emerald fill checkmark before fading card opacity to 0.5.
- **Buttons:**
  - *Standard:* Subtle grey Acrylic with top rim highlight.
  - *Accent (Primary):* `#0078D4` fill with subtle hover brightening and active scale transform (`0.98`).
  - *Urgent Action:* `#D13438` fill for destructive or critical deadline escalation actions.