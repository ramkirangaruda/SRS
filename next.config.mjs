// Next.js configuration, wrapped to add PWA (Progressive Web App) support.
//
// A PWA can be "installed" to a phone's home screen and work offline. The
// @ducanh2912/next-pwa plugin generates a service worker (a background script
// the browser runs) that caches our assets so the app loads without a network.
import withPWAInit from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

// Points next-intl at our request config (cookie-based locale).
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public", // Where the generated service worker files are written.
  // Disable the service worker in development so it doesn't aggressively cache
  // and hide our code changes. It only activates in production builds.
  disable: process.env.NODE_ENV === "development",
  register: true, // Auto-register the service worker on page load.
  cacheOnFrontEndNav: true, // Cache pages as the user navigates, for offline use.
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Surfaces potential bugs by double-invoking render in dev.
};

export default withPWA(withNextIntl(nextConfig));
