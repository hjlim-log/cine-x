import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // TODO: 데모 확인 후 제거
  @Get('debug-sentry')
  debugSentry() {
    throw new Error('Sentry 테스트 에러 - 정상 동작');
  }
}
