import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  tracesSampleRate: 0.1,

  // 에러 발생 시 세션 리플레이 100%, 일반 세션 10%
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  beforeSend(event) {
    if (event.user?.email) {
      const [local, domain] = event.user.email.split('@');
      event.user.email = `${local.slice(0, 2)}***@${domain}`;
    }
    return event;
  },

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
  ],
});
