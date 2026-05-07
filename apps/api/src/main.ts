import 'dotenv/config';

// Sentry는 다른 모듈보다 먼저 초기화해야 함
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',

  integrations: [nodeProfilingIntegration()],

  // 무료 티어 보호: 트랜잭션/프로파일 10%만 샘플링
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,

  beforeSend(event) {
    if (event.user?.email) {
      event.user.email = maskEmail(event.user.email);
    }
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      if (typeof data === 'object') {
        if (data.password) data.password = '[REDACTED]';
        if (data.token) data.token = '[REDACTED]';
        if (data.cardNumber) data.cardNumber = '[REDACTED]';
      }
    }
    return event;
  },

  // 흔한 4xx는 노이즈 제거
  ignoreErrors: ['NotFoundException', 'UnauthorizedException'],
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './common/sentry.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: 'http://localhost:3000', credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.useGlobalFilters(new SentryExceptionFilter());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API 서버 실행 중: http://localhost:${port}`);
}
bootstrap();
