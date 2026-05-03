import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PricingPolicy } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AudienceType,
  DayType,
  Format,
  PriceBreakdown,
  PriceCalculationInput,
} from './pricing.types';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(input: PriceCalculationInput): Promise<PriceBreakdown> {
    // 1. screening + screen + screenType 조회
    const screening = await this.prisma.screening.findUnique({
      where: { id: input.screeningId },
      include: {
        screen: { include: { screenType: true, cinema: true } },
      },
    });
    if (!screening) throw new NotFoundException('상영 정보가 없습니다.');

    const format = screening.screenType as Format;
    const dayType = this.getDayType(screening.startTime);
    const screenTypeId = screening.screen.screenTypeId;
    const cinemaId = screening.screen.cinemaId;

    // 2. 인원수 = 좌석 수 검증
    const totalAudience = Object.values(input.audienceCounts).reduce(
      (s, n) => s + (n ?? 0),
      0,
    );
    if (totalAudience === 0) {
      throw new BadRequestException('관람 인원을 1명 이상 선택해주세요.');
    }
    if (totalAudience !== input.seatIds.length) {
      throw new BadRequestException(
        `인원 수(${totalAudience})와 좌석 수(${input.seatIds.length})가 일치하지 않습니다.`,
      );
    }

    // 3. 요청된 관람객 유형
    const audienceTypes = Object.entries(input.audienceCounts)
      .filter(([, count]) => (count ?? 0) > 0)
      .map(([type]) => type) as AudienceType[];

    // 4. 정책 조회 (영화관별 + 공통, validTo null = 무기한)
    const now = new Date();
    const rawPolicies = await this.prisma.pricingPolicy.findMany({
      where: {
        screenTypeId,
        format,
        dayType,
        isActive: true,
        audienceType: { in: audienceTypes },
        OR: [{ cinemaId }, { cinemaId: null }],
        validFrom: { lte: now },
      },
    });
    const policies = rawPolicies.filter(
      (p) => p.validTo === null || p.validTo >= now,
    );

    // 5. 영화관별 정책 우선 적용
    const policyMap = new Map<string, PricingPolicy>();
    for (const p of policies) {
      const existing = policyMap.get(p.audienceType);
      if (!existing || (p.cinemaId !== null && existing.cinemaId === null)) {
        policyMap.set(p.audienceType, p);
      }
    }

    // 6. 정책 누락 검사
    for (const audienceType of audienceTypes) {
      if (!policyMap.has(audienceType)) {
        throw new BadRequestException(
          `해당 상영의 ${audienceType} 요금 정책이 없습니다.`,
        );
      }
    }

    // 7. 기본료 계산
    let baseTotal = 0;
    const details: PriceBreakdown['details'] = [];
    for (const [type, count] of Object.entries(input.audienceCounts)) {
      if (!count || count <= 0) continue;
      const policy = policyMap.get(type)!;
      const lineTotal = policy.basePrice * count;
      baseTotal += lineTotal;
      details.push({
        audienceType: type as AudienceType,
        count,
        unitPrice: policy.basePrice,
        subtotal: lineTotal,
      });
    }

    // 8. 좌석 추가금 계산
    const seats = await this.prisma.seat.findMany({
      where: { id: { in: input.seatIds } },
      include: { seatType: true },
    });
    if (seats.length !== input.seatIds.length) {
      throw new BadRequestException('유효하지 않은 좌석이 포함되어 있습니다.');
    }

    let seatBonus = 0;
    const seatDetails = seats.map((s) => {
      seatBonus += s.seatType.additionalPrice;
      return { seatId: s.id, additionalPrice: s.seatType.additionalPrice };
    });

    const subtotal = baseTotal + seatBonus;

    // 9. 쿠폰 적용
    let couponDiscount = 0;
    let appliedCoupon: PriceBreakdown['appliedCoupon'];

    if (input.userCouponId && input.customerId) {
      const userCoupon = await this.prisma.userCoupon.findUnique({
        where: { id: input.userCouponId },
        include: { coupon: true },
      });

      if (!userCoupon || userCoupon.customerId !== input.customerId) {
        throw new ForbiddenException('보유하지 않은 쿠폰입니다.');
      }
      if (userCoupon.status !== 'AVAILABLE' && userCoupon.status !== 'RESERVED') {
        throw new BadRequestException(
          `사용할 수 없는 쿠폰입니다 (${userCoupon.status}).`,
        );
      }
      if (userCoupon.expiresAt < new Date()) {
        throw new BadRequestException('만료된 쿠폰입니다.');
      }

      const coupon = userCoupon.coupon;

      if (subtotal < coupon.minPurchase) {
        throw new BadRequestException(
          `최소 ${coupon.minPurchase.toLocaleString()}원 이상 결제 시 사용 가능합니다.`,
        );
      }

      if (coupon.type === 'AMOUNT_DISCOUNT') {
        couponDiscount = coupon.value;
      } else if (coupon.type === 'PERCENT_DISCOUNT') {
        let calculated = Math.floor((subtotal * coupon.value) / 100);
        if (coupon.maxDiscount && calculated > coupon.maxDiscount) {
          calculated = coupon.maxDiscount;
        }
        couponDiscount = calculated;
      } else if (coupon.type === 'FREE_TICKET') {
        // 가장 비싼 좌석부터 N석 무료: 인원 기본가 내림차순 + 좌석 추가금 내림차순으로 매핑
        const sortedAudiencePrices = Object.entries(input.audienceCounts)
          .filter(([, n]) => (n ?? 0) > 0)
          .flatMap(([type, count]) =>
            Array(count ?? 0).fill(policyMap.get(type)!.basePrice),
          )
          .sort((a: number, b: number) => b - a);

        const sortedSeatBonuses = [...seatDetails]
          .map((s) => s.additionalPrice)
          .sort((a, b) => b - a);

        const numFree = Math.min(coupon.value, input.seatIds.length);
        let freeAmount = 0;
        for (let i = 0; i < numFree; i++) {
          freeAmount += sortedAudiencePrices[i] ?? 0;
          freeAmount += sortedSeatBonuses[i] ?? 0;
        }
        couponDiscount = freeAmount;
      }

      // 음수 방지
      couponDiscount = Math.min(couponDiscount, subtotal);

      appliedCoupon = {
        userCouponId: userCoupon.id,
        couponName: coupon.name,
        type: coupon.type,
        discountAmount: couponDiscount,
      };
    }

    const afterCouponAmount = subtotal - couponDiscount;

    // 10. 멤버십 할인 (자동 적용)
    let membershipDiscount = 0;
    let appliedMembership: PriceBreakdown['appliedMembership'];

    if (input.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: input.customerId },
        include: { membershipGrade: true },
      });

      const grade = customer?.membershipGrade;
      if (grade && grade.discountPercent > 0) {
        let calculated = Math.floor((afterCouponAmount * grade.discountPercent) / 100);
        if (grade.maxDiscount && calculated > grade.maxDiscount) {
          calculated = grade.maxDiscount;
        }
        calculated = Math.min(calculated, afterCouponAmount);

        if (calculated > 0) {
          membershipDiscount = calculated;
          appliedMembership = {
            gradeName: grade.displayName,
            discountPercent: grade.discountPercent,
            discountAmount: membershipDiscount,
          };
        }
      }
    }

    const afterMembershipAmount = afterCouponAmount - membershipDiscount;

    // 11. 제휴할인 적용 (minPurchase 기준: afterMembershipAmount)
    let partnerDiscount = 0;
    let appliedPartnerDiscount: PriceBreakdown['appliedPartnerDiscount'];

    if (input.partnerDiscountId) {
      const pd = await this.prisma.partnerDiscount.findUnique({
        where: { id: input.partnerDiscountId },
      });

      if (!pd || !pd.isActive) {
        throw new BadRequestException('사용할 수 없는 제휴할인입니다.');
      }

      if (pd.validFrom > now || (pd.validTo && pd.validTo < now)) {
        throw new BadRequestException('유효 기간이 아닌 제휴할인입니다.');
      }

      if (input.userCouponId && !pd.combinableWithCoupon) {
        throw new BadRequestException('쿠폰과 함께 사용할 수 없는 제휴할인입니다.');
      }

      if (afterMembershipAmount < pd.minPurchase) {
        throw new BadRequestException(
          `최소 ${pd.minPurchase.toLocaleString()}원 이상 결제 시 사용 가능합니다. (멤버십 할인 후 ${afterMembershipAmount.toLocaleString()}원)`,
        );
      }

      if (pd.discountMethod === 'AMOUNT') {
        partnerDiscount = pd.discountValue;
      } else if (pd.discountMethod === 'PERCENT') {
        let calculated = Math.floor((afterMembershipAmount * pd.discountValue) / 100);
        if (pd.maxDiscount && calculated > pd.maxDiscount) {
          calculated = pd.maxDiscount;
        }
        partnerDiscount = calculated;
      }

      partnerDiscount = Math.min(partnerDiscount, afterMembershipAmount);

      appliedPartnerDiscount = {
        partnerDiscountId: pd.id,
        name: pd.name,
        partnerName: pd.partnerName,
        partnerType: pd.partnerType,
        discountMethod: pd.discountMethod,
        discountAmount: partnerDiscount,
      };
    }

    return {
      baseTotal,
      seatBonus,
      subtotal,
      couponDiscount,
      afterCouponAmount,
      membershipDiscount,
      afterMembershipAmount,
      partnerDiscount,
      totalAmount: afterMembershipAmount - partnerDiscount,
      details,
      seatDetails,
      appliedCoupon,
      appliedMembership,
      appliedPartnerDiscount,
    };
  }

  private getDayType(date: Date): DayType {
    const day = date.getDay(); // 0=일, 6=토
    return day === 0 || day === 6 ? 'WEEKEND' : 'WEEKDAY';
  }
}
