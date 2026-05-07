import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { CustomerServiceService } from './customer-service.service';

@Controller('cs')
export class CustomerServiceController {
  constructor(
    private readonly customerServiceService: CustomerServiceService,
  ) {}

  // GET /cs/faqs?category=CINEMA_USAGE
  @Get('faqs')
  getFaqs(@Query('category') category?: string) {
    return this.customerServiceService.getFaqs(category);
  }

  // GET /cs/notices?cinemaId=3
  @Get('notices')
  getNotices(@Query('cinemaId') cinemaId?: string) {
    return this.customerServiceService.getNotices(
      cinemaId ? parseInt(cinemaId, 10) : undefined,
    );
  }

  // GET /cs/notices/:id
  @Get('notices/:id')
  getNoticeOne(@Param('id', ParseIntPipe) id: number) {
    return this.customerServiceService.getNoticeOne(id);
  }
}
