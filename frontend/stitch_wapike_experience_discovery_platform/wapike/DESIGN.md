---
name: Wapike
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#434844'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#747874'
  outline-variant: '#c4c8c2'
  surface-tint: '#576159'
  primary: '#050d08'
  on-primary: '#ffffff'
  primary-container: '#1b241e'
  on-primary-container: '#828c83'
  inverse-primary: '#bfc9c0'
  secondary: '#8b500a'
  on-secondary: '#ffffff'
  secondary-container: '#ffb065'
  on-secondary-container: '#774200'
  tertiary: '#0d0c09'
  on-tertiary: '#ffffff'
  tertiary-container: '#23221e'
  on-tertiary-container: '#8c8984'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe5db'
  primary-fixed-dim: '#bfc9c0'
  on-primary-fixed: '#151e18'
  on-primary-fixed-variant: '#404942'
  secondary-fixed: '#ffdcc0'
  secondary-fixed-dim: '#ffb876'
  on-secondary-fixed: '#2d1600'
  on-secondary-fixed-variant: '#6b3b00'
  tertiary-fixed: '#e6e2dc'
  tertiary-fixed-dim: '#cac6c0'
  on-tertiary-fixed: '#1d1b18'
  on-tertiary-fixed-variant: '#494642'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is centered on "Modern Heritage"—a fusion of Kenya’s raw, natural beauty with a sophisticated, high-end digital experience. The platform targets discerning travelers seeking curated experiences, from luxury safaris to hidden urban culinary gems.

The visual style is **Premium Minimalism**. It leverages generous whitespace to let high-quality photography breathe, creating an "editorial" feel similar to a high-end travel magazine. The emotional response should be one of calm, professional curation, and effortless discovery. 

Key stylistic pillars include:
- **Breathable Layouts:** Prioritizing negative space to reduce cognitive load.
- **Natural Sophistication:** Moving away from "safari cliches" toward a contemporary African aesthetic.
- **Precision:** Thin-stroke iconography and rigorous alignment to convey reliability and trust.

## Colors

The palette is rooted in the Kenyan landscape but refined for a premium digital interface.

- **Primary (Earth Charcoal - #1B241E):** A deep, near-black green used for text, primary navigation, and heavy structural elements. It provides the "anchor" for the brand.
- **Accent (Terracotta Gold - #D48C45):** A warm, earthy highlight used sparingly for call-to-actions, active states, and price points. It evokes the warmth of the sun and the red soil of the highlands.
- **Background (Bone White - #FDFCFB):** An off-white base that prevents the sterile feel of pure white, providing a softer canvas for high-resolution imagery.
- **Surface (Savannah Mist - #F4EFE9):** A secondary background color used for cards, sections, and subtle depth transitions.

## Typography

This design system utilizes a classic Serif-Sans pairing to balance luxury with utility.

- **Headlines:** Use Playfair Display for all major headings. It introduces a sense of elegance and storytelling. Tighten letter-spacing slightly on larger displays to maintain a cohesive look.
- **Body & UI:** Use Inter for all functional text, including descriptions, inputs, and button labels. Its high x-height ensures readability even at smaller sizes on mobile devices.
- **Labels:** Use uppercase Inter with increased letter-spacing for category tags, small eyebrow headers, and metadata to create a distinct visual hierarchy between "content" and "information."

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid Hybrid** model. Content is contained within a maximum width of 1280px on desktop to ensure line lengths remain readable, while backgrounds and immersive imagery bleed to the edges of the screen.

- **Grid:** Use a 12-column grid for desktop and a 4-column grid for mobile.
- **Spacing Rhythm:** Based on an 8px scale. Use larger increments (64px, 80px, 120px) between major sections to maintain the premium, airy feel.
- **Mobile Adaption:** On mobile, margins reduce to 16px. Vertical spacing between cards and elements should remain generous to prevent the UI from feeling cramped.

## Elevation & Depth

This design system avoids heavy, traditional shadows in favor of **Tonal Layering** and **Minimal Ambient Depth**.

- **Surfaces:** Use the "Savannah Mist" (#F4EFE9) color to define card containers against the "Bone White" background. This creates depth without relying on drop shadows.
- **Shadows:** When necessary (e.g., for floating action buttons or hovered cards), use a very soft, highly diffused shadow: `0px 10px 30px rgba(27, 36, 30, 0.04)`. The shadow should have a slight tint of the Primary Earth Charcoal to keep it natural.
- **Outlines:** Active states for input fields and buttons should use a 1px solid border of the Primary color or Accent color, rather than a glow or heavy shadow.

## Shapes

The shape language is "Softly Architectural." It uses medium rounding to feel approachable but maintains enough structure to appear professional.

- **Standard Radius:** 8px for smaller components like inputs and buttons.
- **Large Radius:** 16px for primary experience cards and image containers.
- **Imagery:** Photos should always feature the standard corner radius; never use sharp corners for photography to maintain the "premium travel" aesthetic.

## Components

- **Buttons:** Primary buttons are solid "Earth Charcoal" with white Inter text (Medium weight). Secondary buttons use a "Terracotta" text link or a ghost style with a 1px border.
- **Cards:** Experience cards should feature a large image aspect ratio (3:2 or 4:5). Typography inside cards should be minimal—Display Title in Playfair, Price and Location in Inter.
- **Chips/Tags:** Use the "Savannah Mist" background with Primary text for category tags (e.g., "Safari", "Fine Dining"). Keep them small and pill-shaped.
- **Input Fields:** Minimalist design with a bottom-only border or a very light 1px surrounding border. Focus states are indicated by a color change to the Primary Earth Charcoal.
- **Icons:** 24px grid, 1.5px stroke weight. Avoid filled icons unless indicating an "active" or "saved" state (e.g., a filled heart for favorites).
- **Navigation:** A clean, sticky top-bar with plenty of height. The logo should be centered or left-aligned with ample clear space.