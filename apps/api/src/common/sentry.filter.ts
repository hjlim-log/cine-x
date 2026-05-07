import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    // 5xx 에러만 Sentry에 보고 (4xx는 클라이언트 잘못)
    if (status >= 500) {
      Sentry.captureException(exception, {
        contexts: {
          request: {
            url: request.url,
            method: request.method,
          },
        },
        user: request.user
          ? {
              id: request.user.id,
              email: request.user.email,
            }
          : undefined,
      });
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
