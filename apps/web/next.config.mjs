/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['react-big-calendar'],
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'admin.moviechart.co.kr' },
    ],
  },
};

export default nextConfig;
