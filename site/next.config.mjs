/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: `npm run build` emits ./out — deploy that folder to
  // Cloudflare Pages directly (no adapter, no server runtime needed).
  output: "export",
  images: {
    // Required for static export. Placeholders are local SVGs anyway;
    // swap real client photos in /public and they'll be served as-is.
    unoptimized: true,
  },
  trailingSlash: true,
  eslint: {
    // Next lints app/, components/ and lib/ by default. content/ is
    // typed modules every page imports, so it gets the same rules —
    // both in `npm run lint` and in the lint step of `next build`.
    dirs: ["app", "components", "lib", "content"],
  },
};

export default nextConfig;
