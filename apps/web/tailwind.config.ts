import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        coral: {
          50: "#fff5f3",
          100: "#ffe8e3",
          200: "#ffd5cc",
          300: "#ffb8a8",
          400: "#fb9280",
          500: "#f47058",
          600: "#e15340",
          700: "#bd4132",
          800: "#9c382d",
          900: "#82332b",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "glow-teal": "radial-gradient(ellipse at center, rgba(20, 184, 166, 0.15) 0%, transparent 70%)",
        "glow-coral": "radial-gradient(ellipse at center, rgba(251, 146, 128, 0.15) 0%, transparent 70%)",
      },
      boxShadow: {
        "glow-sm": "0 0 15px rgba(20, 184, 166, 0.3)",
        "glow-md": "0 0 30px rgba(20, 184, 166, 0.3), 0 0 60px rgba(20, 184, 166, 0.15)",
        "glow-lg": "0 0 40px rgba(20, 184, 166, 0.4), 0 0 80px rgba(20, 184, 166, 0.2)",
        "glow-coral-sm": "0 0 15px rgba(251, 146, 128, 0.3)",
        "glow-coral-md": "0 0 30px rgba(251, 146, 128, 0.3), 0 0 60px rgba(251, 146, 128, 0.15)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
