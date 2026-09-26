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
};

export default nextConfig;
