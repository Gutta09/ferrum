import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        card: "var(--card)",
        line: "var(--border)",
        "line-hover": "var(--border-hover)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
        success: "var(--success)",
        gold: "var(--gold)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        display: ["48px", { lineHeight: "56px", letterSpacing: "-0.03em", fontWeight: "600" }],
        h1: ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }],
        h2: ["22px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        label: ["13px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
        body: ["15px", { lineHeight: "24px" }],
      },
      borderRadius: {
        card: "18px",
        input: "12px",
      },
      boxShadow: {
        ambient: "0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.24)",
      },
      transitionTimingFunction: {
        swift: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
