import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipService } from '../membership/membership.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { TOSS_CARD_CODES, matchCardIssuer } from './card-codes';

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipService: MembershipService,
  ) {}

  async confirm(customerId: number, dto: ConfirmPaymentDto) {
    const { paymentKey, orderId, amount } = dto;

    const reservation = await this.prisma.reservation.findUnique({
      where: { orderId },
      include: {
        couponUsage: true,
        partnerDiscountUsage: { include: { partnerDiscount: true } },
      },
    });
    if (!reservation)
      throw new NotFoundException('예매 내역을 찾을 수 없습니다.');
    if (reservation.customerId !== customerId) {
      throw new ForbiddenException('결제 권한이 없습니다.');
    }
    if (reservation.status !== 'PENDING') {
      throw new BadRequestException('이미 처리된 예매입니다.');
    }
    if (reservation.totalAmount !== amount) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }

    const secretKey = process.env.TOSS_SECRET_KEY ?? '';
    const encoded = Buffer.from(`${secretKey}:`).toString('base64');

    const tossRes = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: reservation.totalAmount,
      }),
    });

    const tossData = await tossRes.json().catch(() => null);

    if (!tossRes.ok) {
      await this.prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(tossData?.message ?? '토스 결제 승인 실패');
    }

    console.log('=== TOSS RESPONSE ===');
    console.log(JSON.stringify(tossData, null, 2));
    console.log('=== END ===');

    // 제휴할인 카드사 검증
    const partnerUsage = reservation.partnerDiscountUsage;
    if (partnerUsage?.partnerDiscount?.partnerType === 'CARD') {
      const partner = partnerUsage.partnerDiscount;
      const issuerCode = tossData?.card?.issuerCode as string | undefined;
      const matched =
        tossData?.method === '카드' &&
        !!issuerCode &&
        matchCardIssuer(issuerCode, partner.partnerName);

      console.log('[Payment Validation]', {
        partnerDiscountName: partner.partnerName,
        tossMethod: tossData?.method,
        tossIssuerCode: issuerCode,
        tossIssuerName: issuerCode
          ? (TOSS_CARD_CODES[issuerCode] ?? '알 수 없음')
          : null,
        matched,
      });

      if (!matched) {
        const cancelled = await this.cancelTossPayment(
          tossData.paymentKey,
          '제휴할인 카드사 불일치',
        );

        if (!cancelled) {
          // 환불 실패 — 결제는 됐지만 취소 불가, FAILED로 표시 후 고객센터 안내
          await this.prisma.reservation.update({
            where: { id: reservation.id },
            data: { status: 'FAILED' },
          });
          throw new BadRequestException(
            '결제 처리 중 문제가 발생했습니다. 고객센터에 문의해주세요.',
          );
        }

        // 환불 성공 — reservation은 PENDING 유지, 사용자가 재결제 가능
        if (tossData?.method !== '카드') {
          throw new BadRequestException(
            `${partner.partnerName} 할인이 적용되었으나 카드 외 결제수단으로 결제되었습니다. 결제가 자동 취소되었습니다.`,
          );
        }
        const usedCard = issuerCode
          ? (TOSS_CARD_CODES[issuerCode] ?? '알 수 없는 카드')
          : '알 수 없는 카드';
        throw new BadRequestException(
          `${partner.partnerName} 할인이 적용되었으나 ${usedCard}로 결제되었습니다. ` +
            `결제가 자동 취소되었으니 ${partner.partnerName}로 다시 결제해주세요.`,
        );
      }
    }

    // 결제 성공: reservation PAID + coupon USED + 멤버십 누적 원자적 처리
    const { updated, membershipResult } = await this.prisma.$transaction(
      async (tx) => {
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
        const membership = await this.membershipService.addToTotalAmount(
          tx,
          reservation.customerId,
          reservation.totalAmount,
        );
        return { updated: r, membershipResult: membership };
      },
    );

    return { reservationId: updated.id, status: 'PAID', membershipResult };
  }

  private async cancelTossPayment(
    paymentKey: string,
    reason: string,
  ): Promise<boolean> {
    const secretKey = process.env.TOSS_SECRET_KEY ?? '';
    const encoded = Buffer.from(`${secretKey}:`).toString('base64');

    const res = await fetch(
      `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${encoded}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancelReason: reason }),
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[토스 환불 실패]', { paymentKey, reason, error: err });
      return false;
    }

    console.log('[토스 환불 성공]', { paymentKey, reason });
    return true;
  }

  // 카드사 불일치 감지 시점에서는 쿠폰이 아직 USED 처리 전이므로 실질적 복구 불필요.
  // 향후 플로우 변경 대비용으로 유지.
  private async restoreCouponIfUsed(reservationId: number) {
    const usage = await this.prisma.couponUsage.findUnique({
      where: { reservationId },
    });
    if (!usage) return;

    await this.prisma.userCoupon.update({
      where: { id: usage.userCouponId },
      data: { status: 'AVAILABLE', usedAt: null },
    });
    await this.prisma.couponUsage.delete({ where: { id: usage.id } });
  }
}
