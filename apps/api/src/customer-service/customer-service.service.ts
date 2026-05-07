import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerServiceService {
  constructor(private prisma: PrismaService) {}

  async getFaqs(category?: string) {
    return this.prisma.customerService.findMany({
      where: {
        type: 'FAQ',
        isActive: true,
        ...(category && { faqCategory: category }),
      },
      orderBy: [{ faqCategory: 'asc' }, { order: 'asc' }],
    });
  }

  async getNotices(cinemaId?: number) {
    return this.prisma.customerService.findMany({
      where: {
        type: 'NOTICE',
        isActive: true,
        OR: [{ noticeScope: 'GLOBAL' }, { noticeScope: 'CINEMA', cinemaId }],
      },
      include: { cinema: { select: { id: true, name: true } } },
      orderBy: [
        { isImportant: 'desc' },
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getNoticeOne(id: number) {
    return this.prisma.customerService.findFirst({
      where: { id, type: 'NOTICE' },
      include: { cinema: true },
    });
  }
}
