import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const sansFallback = [
  "ui-sans-serif",
  "system-ui",
  "-apple-system",
  "Segoe UI",
  "Roboto",
  "Helvetica Neue",
  "Arial",
  "sans-serif",
];
const serifFallback = [
  "ui-serif",
  "Georgia",
  "Cambria",
  "Times New Roman",
  "serif",
];

const inter = ["var(--font-inter)", ...sansFallback];
const playfair = ["var(--font-playfair)", ...serifFallback];

/**
 * Theme ported from the Stitch exports (wapike_home / wapike_restaurants).
 * Material-3-style token names are preserved so the Stitch HTML maps 1:1 onto
 * real components. Premium minimalist direction: near-black `primary`, warm
 * amber `secondary`, cool-white `surface`, Playfair display + Inter body.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        primary: "#050d08",
        "on-primary": "#ffffff",
        "primary-container": "#1b241e",
        "on-primary-container": "#828c83",
        "primary-fixed": "#dbe5db",
        "primary-fixed-dim": "#bfc9c0",
        "on-primary-fixed": "#151e18",
        "on-primary-fixed-variant": "#404942",
        "inverse-primary": "#bfc9c0",

        secondary: "#8b500a",
        "on-secondary": "#ffffff",
        "secondary-container": "#ffb065",
        "on-secondary-container": "#774200",
        "secondary-fixed": "#ffdcc0",
        "secondary-fixed-dim": "#ffb876",
        "on-secondary-fixed": "#2d1600",
        "on-secondary-fixed-variant": "#6b3b00",

        tertiary: "#0d0c09",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#23221e",
        "on-tertiary-container": "#8c8984",
        "tertiary-fixed": "#e6e2dc",
        "tertiary-fixed-dim": "#cac6c0",
        "on-tertiary-fixed": "#1d1b18",
        "on-tertiary-fixed-variant": "#494642",

        background: "#f9f9ff",
        "on-background": "#151c27",
        surface: "#f9f9ff",
        "on-surface": "#151c27",
        "surface-variant": "#dce2f3",
        "on-surface-variant": "#434844",
        "surface-tint": "#576159",
        "surface-bright": "#f9f9ff",
        "surface-dim": "#d3daea",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f0f3ff",
        "surface-container": "#e7eefe",
        "surface-container-high": "#e2e8f8",
        "surface-container-highest": "#dce2f3",
        "inverse-surface": "#2a313d",
        "inverse-on-surface": "#ebf1ff",

        outline: "#747874",
        "outline-variant": "#c4c8c2",

        // Warm accent used by the AI assistant surface (Stitch).
        "savannah-mist": "#f4efe9",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      maxWidth: {
        "container-max": "1280px",
      },
      spacing: {
        base: "8px",
        gutter: "24px",
        "margin-mobile": "16px",
        "margin-desktop": "40px",
        section: "120px",
        "section-mobile": "80px",
      },
      fontFamily: {
        sans: inter,
        serif: playfair,
        "display-lg": playfair,
        "display-lg-mobile": playfair,
        "headline-md": playfair,
        "headline-sm": playfair,
        "body-lg": inter,
        "body-md": inter,
        "label-md": inter,
        caption: inter,
      },
      fontSize: {
        "display-lg": [
          "48px",
          { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "display-lg-mobile": [
          "36px",
          { lineHeight: "44px", fontWeight: "700" },
        ],
        "headline-md": ["32px", { lineHeight: "40px", fontWeight: "600" }],
        "headline-sm": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": [
          "14px",
          { lineHeight: "20px", letterSpacing: "0.05em", fontWeight: "600" },
        ],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
      },
      boxShadow: {
        tonal: "0px 10px 30px rgba(27, 36, 30, 0.04)",
        "tonal-lg": "0px 20px 50px rgba(27, 36, 30, 0.08)",
      },
      transitionTimingFunction: {
        subtle: "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    },
  },
  plugins: [forms],
};

export default config;
