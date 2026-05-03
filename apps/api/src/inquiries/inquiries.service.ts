import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOneOnOneDto } from './dto/create-one-on-one.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateLostItemDto } from './dto/create-lost-item.dto';

@Injectable()
export class InquiriesService {
  constructor(private prisma: PrismaService) {}

  async createOneOnOne(customerId: number, dto: CreateOneOnOneDto) {
    return this.prisma.inquiry.create({
      data: {
        customerId,
        type: 'ONE_ON_ONE',
        category: dto.category,
        title: dto.title,
        content: dto.content,
        cinemaId: dto.cinemaId,
      },
    });
  }

  async createGroup(customerId: number, dto: CreateGroupDto) {
    return this.prisma.inquiry.create({
      data: {
        customerId,
        type: 'GROUP',
        title: dto.title,
        content: dto.content,
        cinemaId: dto.cinemaId,
        groupDetail: {
          create: {
            groupType: dto.groupType,
            expectedCount: dto.expectedCount,
            preferredDate: new Date(dto.preferredDate),
            preferredTime: dto.preferredTime,
            contactPhone: dto.contactPhone,
          },
        },
      },
      include: { groupDetail: true },
    });
  }

  async createLostItem(customerId: number, dto: CreateLostItemDto) {
    return this.prisma.inquiry.create({
      data: {
        customerId,
        type: 'LOST_ITEM',
        title: dto.title,
        content: dto.content,
        cinemaId: dto.cinemaId,
        lostItemDetail: {
          create: {
            lostDate: new Date(dto.lostDate),
            lostTime: dto.lostTime,
            itemCategory: dto.itemCategory,
            itemDescription: dto.itemDescription,
            lostPlace: dto.lostPlace,
          },
        },
      },
      include: { lostItemDetail: true },
    });
  }

  async getMyInquiries(customerId: number, type?: string, status?: string) {
    return this.prisma.inquiry.findMany({
      where: {
        customerId,
        ...(type && { type }),
        ...(status && { status }),
      },
      include: {
        groupDetail: true,
        lostItemDetail: true,
        cinema: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(customerId: number, id: number) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id },
      include: {
        groupDetail: true,
        lostItemDetail: true,
        cinema: true,
      },
    });
    if (!inquiry || inquiry.customerId !== customerId) {
      throw new NotFoundException('문의를 찾을 수 없습니다.');
    }
    return inquiry;
  }

  async markRead(customerId: number, id: number) {
    const inquiry = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry || inquiry.customerId !== customerId) {
      throw new ForbiddenException();
    }
    return this.prisma.inquiry.update({
      where: { id },
      data: { notificationRead: true },
    });
  }

  async delete(customerId: number, id: number) {
    const inquiry = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry || inquiry.customerId !== customerId) {
      throw new ForbiddenException();
    }
    if (inquiry.status === 'COMPLETED') {
      throw new BadRequestException('답변 완료된 문의는 삭제할 수 없습니다.');
    }
    return this.prisma.inquiry.delete({ where: { id } });
  }

  async getUnreadCount(customerId: number) {
    const count = await this.prisma.inquiry.count({
      where: {
        customerId,
        status: 'COMPLETED',
        notificationRead: false,
      },
    });
    return { count };
  }
}
