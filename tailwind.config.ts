import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
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
          positive: "hsl(var(--accent-positive))",
          info: "hsl(var(--accent-info))",
          warning: "hsl(var(--accent-warning))",
          negative: "hsl(var(--accent-negative))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          elevated: "hsl(var(--surface-elevated))",
          muted: "hsl(var(--surface-muted))",
        },
        chart: {
          grid: "hsl(var(--chart-grid))",
          axis: "hsl(var(--chart-axis))",
          tick: "hsl(var(--chart-tick))",
          label: "hsl(var(--chart-label))",
          primary: "hsl(var(--chart-primary))",
          secondary: "hsl(var(--chart-secondary))",
          negative: "hsl(var(--chart-negative))",
        },
        /* Legacy aliases — prefer semantic tokens above */
        pitch: {
          50: "#eafbf1",
          100: "#c9f3dc",
          300: "#6ee7a0",
          400: "#3ddc84",
          500: "hsl(var(--accent-positive))",
          600: "#16a34a",
          900: "#0b3d24",
        },
        graphite: {
          50: "#f0f3f7",
          100: "#e2e8f0",
          200: "#c2ccd6",
          300: "hsl(var(--chart-label))",
          400: "hsl(var(--chart-tick))",
          500: "#475569",
          600: "hsl(var(--chart-axis))",
          700: "hsl(var(--border))",
          800: "hsl(var(--surface-muted))",
          900: "hsl(var(--card))",
          950: "hsl(var(--background))",
        },
        signal: {
          amber: "hsl(var(--accent-warning))",
          rose: "hsl(var(--accent-negative))",
          azure: "hsl(var(--accent-info))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        panel:
          "0 1px 0 0 hsl(var(--foreground) / 0.03) inset, 0 8px 24px -12px hsl(var(--background) / 0.6)",
        "sport-glow": "0 0 24px -6px hsl(var(--sport-glow) / 0.55)",
      },
      transitionDuration: {
        350: "350ms",
      },
      keyframes: {
        "skeleton-shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "skeleton-shimmer": "skeleton-shimmer 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
