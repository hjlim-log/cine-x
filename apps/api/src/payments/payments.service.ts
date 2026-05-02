import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async confirm(customerId: number, dto: ConfirmPaymentDto) {
    const { paymentKey, orderId, amount } = dto;

    const reservation = await this.prisma.reservation.findUnique({
      where: { orderId },
      include: { couponUsage: true },
    });
    if (!reservation) throw new NotFoundException('예매 내역을 찾을 수 없습니다.');
    if (reservation.customerId !== customerId) {
      throw new ForbiddenException('결제 권한이 없습니다.');
    }
    if (reservation.status !== 'PENDING') {
      throw new BadRequestException('이미 처리된 예매입니다.');
    }
    // 클라이언트가 보낸 amount가 서버 계산값과 다르면 즉시 거부
    if (reservation.totalAmount !== amount) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }

    const secretKey = process.env.TOSS_SECRET_KEY ?? '';
    const encoded = Buffer.from(`${secretKey}:`).toString('base64');

    // Toss에도 서버 저장값(reservation.totalAmount)을 사용 — 클라이언트 amount 미사용
    const tossRes = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount: reservation.totalAmount }),
    });

    if (!tossRes.ok) {
      const err = await tossRes.json().catch(() => ({ message: '토스 결제 승인 실패' }));
      await this.prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(err.message ?? '토스 결제 승인 실패');
    }

    // 결제 성공: reservation PAID + coupon USED 원자적 처리
    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'PAID', paymentKey, paidAt: new Date() },
      });
      if (reservation.couponUsage) {
        await tx.userCoupon.update({
          where: { id: reservation.couponUsage.userCouponId },
          data: { status: 'USED', usedAt: new Date() },
        });
      }
      return r;
    });

    return { reservationId: updated.id, status: 'PAID' };
  }
}
