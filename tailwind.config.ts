// Tailwind CSS configuration.
//
// Tailwind is a "utility-first" CSS framework: instead of writing custom CSS,
// you compose small classes like `flex`, `p-4`, `text-lg` directly in your JSX.
// shadcn/ui builds on this and uses CSS variables (defined in globals.css) for
// theming, which is why the colors below reference `hsl(var(--...))`.
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"], // Dark mode toggled by adding a `class="dark"` to <html>.
  // `content` tells Tailwind which files to scan for class names so it can strip
  // out every unused style from the final CSS bundle (keeping it tiny).
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // These map semantic names (background, primary, etc.) to the CSS variables
      // defined in app/globals.css, so shadcn components stay themeable.
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Popover surface — used by Select/Dropdown menus. Without this mapping
        // `bg-popover` produced no color, so menus rendered transparent.
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  // Adds the animation utilities shadcn/ui relies on (e.g. for dialogs/menus).
  plugins: [require("tailwindcss-animate")],
};

export default config;
