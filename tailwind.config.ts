import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        panel2: "rgb(var(--panel-2) / <alpha-value>)",
        content: "rgb(var(--content) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        lineStrong: "rgb(var(--line-strong) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
        brandSoft: "rgb(var(--brand-soft) / <alpha-value>)",
        brandContrast: "rgb(var(--brand-contrast) / <alpha-value>)",
        ink: {
          DEFAULT: "#0E1620",
          50: "#F4F1EA",
          100: "#E9E3D7",
          200: "#CFC6B6",
          300: "#A99E8C",
          400: "#6F685C",
          500: "#3D444C",
          600: "#26313B",
          700: "#1A2430",
          800: "#121B25",
          900: "#0E1620",
          950: "#080E15",
        },
        paper: {
          DEFAULT: "#F7F3EB",
          soft: "#FBF8F2",
          deep: "#EFE9DD",
        },
        evergreen: {
          50: "#EEF4F1",
          100: "#D7E6E0",
          200: "#ADCEC3",
          300: "#7FB0A2",
          400: "#568F80",
          500: "#3B7365",
          600: "#2E5E56",
          700: "#274C46",
          800: "#223D39",
          900: "#1D332F",
        },
        clay: {
          50: "#FBF0EC",
          100: "#F4DCD3",
          200: "#E6B7A6",
          300: "#D48E77",
          400: "#C16B51",
          500: "#A9523A",
          600: "#8C4230",
          700: "#713729",
          800: "#5C2F25",
          900: "#4C2922",
        },
        brass: {
          50: "#FBF6E9",
          100: "#F4E9C8",
          200: "#E8D294",
          300: "#D9B95C",
          400: "#C8A23B",
          500: "#B8902F",
          600: "#9A7527",
          700: "#7A5C23",
          800: "#5F4820",
          900: "#4D3B1E",
        },
        slateblue: {
          400: "#6E88A1",
          500: "#4E6E8E",
          600: "#3F5A76",
        },
        aubergine: {
          400: "#8A618F",
          500: "#6B4670",
          600: "#57375B",
        },
        olive: {
          400: "#969B62",
          500: "#7A7F45",
          600: "#626736",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Iowan Old Style",
          "Palatino Linotype",
          "Book Antiqua",
          "Palatino",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },
      letterSpacing: {
        widest: "0.18em",
        eyebrow: "0.16em",
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,22,32,0.04), 0 8px 24px -12px rgba(14,22,32,0.12)",
        lift: "0 2px 4px rgba(14,22,32,0.05), 0 24px 48px -24px rgba(14,22,32,0.28)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      borderRadius: {
        xs: "0.25rem",
        xl2: "1.125rem",
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.5s ease both",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
