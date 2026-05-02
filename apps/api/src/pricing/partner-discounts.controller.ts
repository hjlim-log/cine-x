import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('partner-discounts')
export class PartnerDiscountsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    const now = new Date();
    return this.prisma.partnerDiscount.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      orderBy: { partnerName: 'asc' },
    });
  }

  @Get('applicable')
  @UseGuards(JwtAuthGuard)
  applicable(@Query('amount') amount: string) {
    const amountNum = parseInt(amount, 10);
    const now = new Date();
    return this.prisma.partnerDiscount.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
        minPurchase: { lte: amountNum },
      },
      orderBy: { partnerName: 'asc' },
    });
  }
}
