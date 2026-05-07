import { withSentryConfig } from '@sentry/nextjs';

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

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // 소스맵은 Sentry 업로드 후 자동 삭제 (번들에 포함 안 됨)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  silent: !process.env.CI,
});
