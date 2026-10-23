/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Segoe UI', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Consolas', 'Menlo', 'Courier New', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "#5A7362",
          light: "#EDF2ED",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "#B8C6AF",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          light: "#FDF2F1",
          border: "#F7C7C2",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Sage Garden specific tokens
        sage: {
          50: '#F9F9F7',   // Background Soft Off-White
          100: '#F4F4F1',  // Light surface / card sub-surface
          200: '#E8E7E3',  // Muted Warm Light Grey
          300: '#E5E5E0',  // Border Light Neutral Grey
          400: '#C8D4C0',  // Secondary Soft Sage / Light Olive
          500: '#B5C2B4',  // Accent Desaturated Grey-Green
          600: '#6F8A77',  // Primary Muted Sage Green
          700: '#5A7362',  // Primary Dark / Hover
          800: '#4D5950',  // Text Secondary / Muted Slate Grey
          900: '#1E2621',  // Text Primary / Deep Charcoal
          950: '#141A16',  // Deep Slate
        },
        // Harmonize all Tailwind utility shades to strictly follow Sage Garden with crisp contrast
        slate: {
          50: '#141A16',
          100: '#141A16',  // Deepest heading text
          200: '#1E2621',  // Primary heading text
          300: '#2A352E',  // Strong text
          400: '#4A574E',  // High-contrast muted supporting text
          500: '#606E64',  // Subtle captions
          600: '#B5C2B4',  // Accent
          700: '#D9D9D3',  // Input border
          800: '#E5E5E0',  // Card border / divider
          850: '#F4F4F1',  // Card sub-surface
          900: '#FFFFFF',  // Card clean white
          950: '#F9F9F7',  // Application background
        },
        // Re-route legacy accent names strictly to Sage Garden palette with crisp legibility
        cyan: {
          50: '#F4F7F4',
          100: '#EDF2ED',
          200: '#DCE5DC',
          300: '#445B4B',  // High contrast sage text
          400: '#3D5243',  // High contrast sage text
          500: '#6F8A77',  // Primary button fill
          600: '#5A7362',
          700: '#445B4B',
          800: '#304135',
          900: '#1E2621',
          950: '#F4F4F1',
        },
        emerald: {
          50: '#F4F7F4',
          100: '#EDF2ED',
          200: '#DCE5DC',
          300: '#445B4B',
          400: '#3D5243',
          500: '#6F8A77',
          600: '#5A7362',
          700: '#445B4B',
          800: '#304135',
          900: '#1E2621',
          950: '#F4F4F1',
        },
        indigo: {
          50: '#F4F7F4',
          100: '#EDF2ED',
          200: '#DCE5DC',
          300: '#445B4B',
          400: '#3D5243',
          500: '#6F8A77',
          600: '#5A7362',
          700: '#445B4B',
          800: '#304135',
          900: '#1E2621',
          950: '#F4F4F1',
        },
        amber: {
          50: '#FDFBF7',
          100: '#F9F5EC',
          200: '#F2E8D4',
          300: '#C8D4C0',
          400: '#52432D',
          500: '#52432D',
          600: '#423623',
          700: '#302618',
          800: '#1E2621',
          900: '#1E2621',
          950: '#F4F4F1',
        },
        rose: {
          50: '#FDF2F1',
          100: '#FBE4E2',
          200: '#F7C7C2',
          300: '#E87D72',
          400: '#C84B3D',
          500: '#C84B3D',
          600: '#B53C2E',
          700: '#992A1E',
          800: '#7D1F15',
          900: '#1E2621',
          950: '#FDF2F1',
        },
      },
      borderRadius: {
        DEFAULT: "0.35rem",
        sm: "0.25rem",
        md: "0.35rem",
        lg: "0.5rem",
        xl: "0.75rem",
        '2xl': "1rem",
        full: "9999px",
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(30, 38, 33, 0.04), 0 1px 3px 0 rgba(30, 38, 33, 0.02)',
        'card': '0 2px 4px 0 rgba(30, 38, 33, 0.04), 0 1px 2px 0 rgba(30, 38, 33, 0.02)',
        'elevated': '0 4px 12px -2px rgba(30, 38, 33, 0.08), 0 2px 6px -1px rgba(30, 38, 33, 0.04)',
      }
    },
  },
  plugins: [],
}
