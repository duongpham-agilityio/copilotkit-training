---
name: Lumina AI Dashboard
colors:
  surface: '#fcf8fb'
  surface-dim: '#dcd9dc'
  surface-bright: '#fcf8fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f2f5'
  surface-container: '#f0edf0'
  surface-container-high: '#eae7ea'
  surface-container-highest: '#e5e1e4'
  on-surface: '#1c1b1d'
  on-surface-variant: '#4a4455'
  inverse-surface: '#313032'
  inverse-on-surface: '#f3f0f2'
  outline: '#7b7487'
  outline-variant: '#ccc3d8'
  surface-tint: '#732ee4'
  primary: '#630ed4'
  on-primary: '#ffffff'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#d2bbff'
  secondary: '#712edd'
  on-secondary: '#ffffff'
  secondary-container: '#8b4ef7'
  on-secondary-container: '#fffbff'
  tertiary: '#4e4e57'
  on-tertiary: '#ffffff'
  tertiary-container: '#66666f'
  on-tertiary-container: '#e7e5f0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#ebddff'
  secondary-fixed-dim: '#d3bbff'
  on-secondary-fixed: '#250059'
  on-secondary-fixed-variant: '#5b00c5'
  tertiary-fixed: '#e3e1ec'
  tertiary-fixed-dim: '#c7c5d0'
  on-tertiary-fixed: '#1a1b23'
  on-tertiary-fixed-variant: '#46464f'
  background: '#fcf8fb'
  on-background: '#1c1b1d'
  surface-variant: '#e5e1e4'
  surface-bg: '#fcf8fb'
  border-subtle: '#e2e8f0'
  success-emerald: '#059669'
  error-rose: '#e11d48'
  warning-purple: '#9333ea'
  ai-gradient-start: '#7c3aed'
  ai-gradient-end: '#4f46e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-mono-xs:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  gutter: 16px
  margin: 24px
---

## Brand & Style

The brand identity is built on a "Sophisticated Utility" concept, blending developer-centric efficiency with high-end SaaS aesthetics. It evokes a sense of intelligence, precision, and clarity. 

The design style is **Modern Corporate with Glassmorphism accents**. It utilizes a clean, systematic layout punctuated by soft, layered surfaces and subtle backdrop blurs to differentiate workspace zones. The interface feels lightweight and responsive, prioritizing content readability while maintaining a premium feel through the use of soft shadows and a refined violet-centric palette.

## Colors

The palette is anchored by a deep **Violet** primary, used sparingly for brand presence and key actions to maintain a high signal-to-noise ratio. 

- **Primary & Secondary:** A range of purples and violets are used for interactive states, progress indicators, and the AI "Copilot" brand identity.
- **Surface & Background:** The UI utilizes a very light "off-white" with a slight violet tint (`#fcf8fb`) to reduce eye strain compared to pure white.
- **Semantic Colors:** Emerald is used for feature additions (FEAT), Rose for bug fixes (FIX), and Purple for architectural changes (CHORE).
- **Gradients:** A vibrant violet-to-indigo gradient is reserved exclusively for user-originated chat bubbles, creating a clear visual distinction from AI-generated content.

## Typography

The typography system is highly functional, using **Inter** for all UI and prose elements to ensure maximum legibility across densities. 

**JetBrains Mono** is employed for technical metadata, commit hashes, and code blocks, reinforcing the developer-focused nature of the tool.

- **Headlines:** Use tight letter-spacing and semi-bold weights to create a strong visual hierarchy.
- **Body:** Standardized at 14px for general UI and 16px for long-form reading (release notes preview).
- **Labels:** Uppercase or small-caps styling with tracked-out letter spacing is used for semantic tags (e.g., "FEAT").

## Layout & Spacing

The system follows a **Fixed-Fluid Hybrid Grid**. On desktop, the layout is split into two primary regions:
1. **Workspace (65%)**: A fluid area containing data tables and document previews.
2. **Copilot Sidebar (35%)**: A fixed-width-capable sidebar for AI interaction.

**Spacing Principles:**
- A **4px baseline grid** governs all internal component spacing.
- **Section Margins:** A consistent 24px (lg) padding is applied to major container edges.
- **Vertical Rhythm:** 16px (md) gaps are used between cards and distinct functional blocks.
- **Responsive Behavior:** On mobile devices, the sidebar stacks below the workspace, and horizontal margins reduce to 16px.

## Elevation & Depth

Depth is established through a hierarchy of **Tonal Layers** and **Ambient Shadows** rather than heavy borders.

- **Level 0 (Background):** A subtle tint (`#fcf8fb`) with a slight texture or gradient.
- **Level 1 (Navigation/Sidebars):** Semi-transparent surfaces (`white/80`) with `backdrop-blur-md` and 1px subtle borders.
- **Level 2 (Cards):** Solid white containers with `shadow-xl` (diffused, low-opacity) to draw attention to interactive zones like the commit table and preview window.
- **Level 3 (Floating Elements):** Action buttons and tooltips utilize `shadow-md` for immediate tactile feedback.

## Shapes

The shape language is **Generously Rounded**, projecting a modern and approachable feel.

- **Primary Containers:** Large sections (cards, main panels) use `rounded-3xl` (approx 24px) to soften the density of technical data.
- **Components:** Buttons and input fields use `rounded-xl` (12px).
- **Semantic Pills:** Status tags and small action chips use `rounded-full` for high contrast against rectilinear text blocks.
- **Checkboxes:** Utilize a slightly rounded `xl` corner rather than sharp squares.

## Components

### Buttons
- **Primary:** Violet background, white text, `rounded-xl`, with a slight border for definition.
- **Secondary/Ghost:** `bg-violet-50` with violet text and a `violet-100` border.
- **Icon Buttons:** Fixed-size squares (e.g., 32x32px) with centered Material Symbols.

### Chips & Tags
- High-contrast, low-saturation backgrounds (e.g., `emerald-100`) paired with high-saturation text (`emerald-600`) for accessibility.
- Commit hashes use a neutral `zinc-100` with mono fonts.

### Cards
- White background, `rounded-3xl`, subtle 1px slate borders, and diffused shadows.
- Headers are separated by a 1px border and often use a 50% opacity background to distinguish metadata from content.

### Chat Bubbles
- **AI:** Neutral white/border-only style, aligned left.
- **User:** Gradient background (Violet-to-Indigo), white text, aligned right.
- Both use asymmetrical rounding (e.g., `rounded-2xl` with one sharp corner indicating the speaker).

### Inputs
- Textareas and text fields feature 1px slate borders that transition to violet on focus.
- Placeholder text is a soft `zinc-400`.