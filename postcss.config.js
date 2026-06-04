// PostCSS runs during the build to transform our CSS.
// - tailwindcss: expands all those utility classes into real CSS.
// - autoprefixer: adds vendor prefixes (-webkit-, etc.) for browser support.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
