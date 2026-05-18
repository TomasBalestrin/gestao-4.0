import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          soft: "var(--success-soft)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          soft: "var(--warning-soft)",
        },
        danger: {
          DEFAULT: "var(--danger-color)",
          soft: "var(--danger-soft)",
        },
        navy: {
          DEFAULT: "var(--navy)",
          hover: "var(--navy-hover)",
          soft: "var(--accent-soft)",
          glow: "var(--accent-glow)",
          tint: "var(--accent-tint)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          solid: "var(--surface-solid)",
          elevated: "var(--surface-elevated)",
          glass: "var(--surface-glass)",
        },
        hairline: "var(--hairline)",
        "border-strong": "var(--border-strong)",
        "border-accent": "var(--border-accent)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          "on-accent": "var(--text-on-accent)",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "22px",
        pill: "999px",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      letterSpacing: {
        tight: "-0.01em",
        tighter: "-0.02em",
        tightest: "-0.04em",
        wider: "0.08em",
        widest: "0.18em",
      },
      transitionTimingFunction: {
        ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        spring: "cubic-bezier(0.34, 1.45, 0.6, 1)",
        "out-expo": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        DEFAULT: "200ms",
        slow: "320ms",
        spring: "420ms",
      },
      zIndex: {
        sticky: "50",
        dropdown: "200",
        overlay: "800",
        modal: "900",
        toast: "1000",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.92)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pet-nod": {
          "0%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-4px)" },
          "70%": { transform: "translateY(2px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 220ms cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 160ms cubic-bezier(0.22,1,0.36,1) both",
        "slide-up": "slide-up 200ms cubic-bezier(0.22,1,0.36,1) both",
        "slide-in-right":
          "slide-in-right 200ms cubic-bezier(0.22,1,0.36,1) both",
        "pet-nod": "pet-nod 700ms cubic-bezier(0.34, 1.45, 0.6, 1) both",
      },
    },
  },
  plugins: [animate],
};

export default config;
