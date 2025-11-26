# 품질관리팀 통합 관리 시스템 - 디자인 가이드라인

## 개요
품질관리팀 통합 관리 시스템의 디자인 시스템 및 UI/UX 가이드라인 문서입니다.

## Color System
**Primary Brand Color**: KD Red
- CMYK: C0 M90 Y100 K0
- RGB: #FF1A00 (255, 26, 0)
- HSL: hsl(8, 100%, 50%)
- Color Palette:
  - Light: #FF4D33, #FF837B, #FFA29C
  - Base: #FF1A00
  - Dark: #CC1500, #991000, #660B00
- Usage: Primary buttons, accents, highlights, gradients, and brand elements

## Typography
- **Font Family**: System fonts (sans-serif)
- **Headings**: 
  - H1: text-3xl md:text-5xl font-bold
  - H2: text-2xl font-semibold
  - H3: text-xl font-medium
- **Body**: text-base (16px)
- **Small**: text-sm (14px)

## Layout
- **Container**: max-w-7xl mx-auto
- **Spacing**: Consistent use of Tailwind spacing scale (p-6, gap-8, etc.)
- **Grid System**: Responsive grid with breakpoints (md, lg, xl)

## Component Library
### Cards
- Rounded corners: rounded-lg
- Shadow: shadow-sm (default), shadow-lg (hover)
- Border: border border-border

### Buttons
- Primary: KD Red gradient with hover effects
- Size variants: sm, default, lg
- Rounded: rounded-md or rounded-full

### Badges
- Status indicators with color coding
- Rounded: rounded-full

## Responsive Design
- Mobile First approach
- Breakpoints:
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
  - 2xl: 1400px

## Animations
- Fade in: animate-in fade-in-0
- Slide in: slide-in-from-bottom-4
- Hover effects: transition-all duration-300
- Pulse: animate-pulse (for loading states)

## Accessibility
- Semantic HTML elements
- ARIA labels where appropriate
- Keyboard navigation support
- Color contrast compliance (WCAG AA)

## Dark Mode
- Supported via Tailwind dark mode
- Uses CSS variables for theme switching
- Maintains brand colors in both modes

