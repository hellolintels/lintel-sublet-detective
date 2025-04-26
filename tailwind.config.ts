
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(24, 97%, 50%)", // Bright orange border
        input: "hsl(24, 90%, 60%)", // Slightly lighter orange input
        ring: "hsl(24, 100%, 45%)", // Vibrant orange ring
        background: "hsl(0, 0%, 100%)", // Keeping white background
        foreground: "hsl(0, 0%, 10%)", // Dark text for contrast
        primary: {
          DEFAULT: "hsl(24, 94%, 50%)", // Bright orange primary
          foreground: "hsl(0, 0%, 100%)", // White text on primary
        },
        secondary: {
          DEFAULT: "hsl(24, 50%, 85%)", // Soft, pastel orange
          foreground: "hsl(0, 0%, 20%)", // Dark text on secondary
        },
        destructive: {
          DEFAULT: "hsl(0, 84.2%, 60.2%)", // Keeping red destructive
          foreground: "hsl(0, 0%, 98%)",
        },
        muted: {
          DEFAULT: "hsl(24, 30%, 90%)", // Very light orange
          foreground: "hsl(0, 0%, 45%)", // Muted text
        },
        accent: {
          DEFAULT: "hsl(24, 70%, 70%)", // Bright orange accent
          foreground: "hsl(0, 0%, 10%)", // Dark text on accent
        },
        popover: {
          DEFAULT: "hsl(24, 40%, 95%)", // Very light orange popover
          foreground: "hsl(0, 0%, 10%)",
        },
        card: {
          DEFAULT: "hsl(24, 30%, 98%)", // Almost white with orange tint
          foreground: "hsl(0, 0%, 10%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

