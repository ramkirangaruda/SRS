// The ROOT layout — wraps every page in the app. In the App Router, this file
// is required and must render the <html> and <body> tags. Anything here (fonts,
// providers, metadata) applies app-wide.
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

// `metadata` populates the <head>: page title, description, and the PWA
// manifest link that makes SchoolSync installable.
export const metadata: Metadata = {
  title: "SchoolSync",
  description: "School management for principals and parents",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "SchoolSync", statusBarStyle: "default" },
};

// `viewport` controls mobile rendering. themeColor tints the browser/OS chrome
// when installed as a PWA.
export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning avoids noisy warnings if a browser extension or
  // theme class tweaks the <html> before React hydrates.
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
