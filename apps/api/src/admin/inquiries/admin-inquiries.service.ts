import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnswerInquiryDto } from './dto/answer-inquiry.dto';

@Injectable()
export class AdminInquiriesService {
  constructor(private prisma: PrismaService) {}

  async list(filter: { status?: string; type?: string }) {
    return this.prisma.inquiry.findMany({
      where: {
        ...(filter.status && { status: filter.status }),
        ...(filter.type && { type: filter.type }),
      },
      include: {
        customer: { select: { email: true, name: true } },
        cinema: { select: { name: true } },
        groupDetail: true,
        lostItemDetail: true,
      },
      // RECEIVED → PROCESSING → COMPLETED 순 (desc: R > P > C)
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(id: number) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id },
      include: {
        customer: { select: { email: true, name: true } },
        cinema: { select: { name: true } },
        groupDetail: true,
        lostItemDetail: true,
      },
    });
    if (!inquiry) throw new NotFoundException('문의를 찾을 수 없습니다.');
    return inquiry;
  }

  async answer(id: number, dto: AnswerInquiryDto) {
    await this.getOne(id);
    return this.prisma.inquiry.update({
      where: { id },
      data: {
        answer: dto.answer,
        status: dto.status ?? 'COMPLETED',
        answeredAt: new Date(),
        notificationRead: false,
      },
      include: {
        customer: { select: { email: true, name: true } },
        groupDetail: true,
        lostItemDetail: true,
        cinema: { select: { name: true } },
      },
    });
  }
}
