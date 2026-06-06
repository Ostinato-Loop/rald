/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        rald: {
          green:  "#2EB67D",
          navy:   "#004D85",
          dark:   "#0B0F14",
          card:   "#111827",
          border: "#1F2937",
          text:   "#F9FAFB",
          muted:  "#6B7280",
          subtle: "#9CA3AF",
        },
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },
      typography: {
        DEFAULT: {
          css: {
            color: "#D1D5DB",
            a:     { color: "#2EB67D" },
            h1:    { color: "#F9FAFB" },
            h2:    { color: "#F9FAFB" },
            h3:    { color: "#F9FAFB" },
            h4:    { color: "#F9FAFB" },
            code:  { color: "#2EB67D", backgroundColor: "#1F2937", padding: "2px 6px", borderRadius: "4px" },
            "code::before": { content: '""' },
            "code::after":  { content: '""' },
          },
        },
      },
    },
  },
  plugins: [],
};
