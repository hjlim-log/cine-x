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

  /**
   * 가격 계산 5단계 파이프라인.
   *
   * [흐름]
   *   1단계: 정책가(baseTotal) + 좌석 추가금(seatBonus) → subtotal
   *   2단계: 쿠폰 할인 (사용자 선택)   → afterCouponAmount
   *   3단계: 멤버십 할인 (자동 적용)    → afterMembershipAmount
   *   4단계: 제휴할인 (결제 수단 연계)  → totalAmount
   *   5단계: 음수 방지 + PriceBreakdown 패키징
   *
   * [단계 순서 근거]
   *   쿠폰 먼저: 사용자가 명시적으로 선택 → 우선순위 높음
   *   멤버십 그 다음: 자격 기반 자동 적용 (사용자 선택 불필요)
   *   제휴할인 마지막: 결제 수단(카드사/통신사) 의존 → 가장 늦게 결정
   *
   * read-only 조회만 수행하므로 트랜잭션 불필요.
   * 실제 상태 변경(reservation 생성, 쿠폰 RESERVED)은 ReservationsService 담당.
   */
  async calculate(input: PriceCalculationInput): Promise<PriceBreakdown> {
    // 1단계: 상영 정보 조회 — screenType으로 2D/3D, cinema로 영화관 특별 정책 판별
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

    // 인원 수 = 좌석 수 강제: 좌석 없는 인원, 인원 없는 좌석 모두 차단
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

    const audienceTypes = Object.entries(input.audienceCounts)
      .filter(([, count]) => (count ?? 0) > 0)
      .map(([type]) => type) as AudienceType[];

    // 2단계: 가격 정책 조회 — (screenType × format × dayType × audienceType) 4차원 매트릭스
    // OR [cinemaId, null]: 영화관 특별 정책과 공통 정책을 한 번에 조회해 오버라이드 처리
    // validTo null = 무기한 유효이므로 Prisma WHERE에서 제외 후 코드에서 필터
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

    // 영화관 특별 정책 우선 적용: cinemaId 있는 정책이 공통(cinemaId null)을 덮어씀
    // 덕분에 본사 기본 요금 유지하면서 특정 영화관만 다른 요금 운영 가능
    const policyMap = new Map<string, PricingPolicy>();
    for (const p of policies) {
      const existing = policyMap.get(p.audienceType);
      if (!existing || (p.cinemaId !== null && existing.cinemaId === null)) {
        policyMap.set(p.audienceType, p);
      }
    }

    // 정책 누락 시 silently 0원 처리 대신 명시적 에러 — 운영 설정 실수를 조기에 발견
    for (const audienceType of audienceTypes) {
      if (!policyMap.has(audienceType)) {
        throw new BadRequestException(
          `해당 상영의 ${audienceType} 요금 정책이 없습니다.`,
        );
      }
    }

    // 3단계: 기본료 계산 — details 배열은 프론트 "성인 2명 × 14,000원" 내역 표시용
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

    // 4단계: 좌석 추가금 — 커플석/샤롯데석 등 특수 좌석 프리미엄. seatDetails는 프론트 표시용
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

    // 5단계: 쿠폰 적용
    let couponDiscount = 0;
    let appliedCoupon: PriceBreakdown['appliedCoupon'];

    if (input.userCouponId && input.customerId) {
      const userCoupon = await this.prisma.userCoupon.findUnique({
        where: { id: input.userCouponId },
        include: { coupon: true },
      });

      // customerId 불일치 = 타인 쿠폰 대입 시도 → ForbiddenException (403, not 400)
      if (!userCoupon || userCoupon.customerId !== input.customerId) {
        throw new ForbiddenException('보유하지 않은 쿠폰입니다.');
      }
      // RESERVED도 허용: 결제 직전 재계산 시 자신이 이미 RESERVED한 쿠폰이 막히는 문제 방지
      if (
        userCoupon.status !== 'AVAILABLE' &&
        userCoupon.status !== 'RESERVED'
      ) {
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
        // maxDiscount 캡: 50% 쿠폰이 고가 결제에 무제한 적용되면 운영 손실 — 상한으로 리스크 통제
        if (coupon.maxDiscount && calculated > coupon.maxDiscount) {
          calculated = coupon.maxDiscount;
        }
        couponDiscount = calculated;
      } else if (coupon.type === 'FREE_TICKET') {
        // 가장 비싼 좌석부터 무료: 사용자 혜택 최대화 + 운영자 "최대 N원 손실" 예측 가능
        // 관람객 정책가와 좌석 추가금을 각각 내림차순 정렬 후 i번째 총비용 합산
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

      // 음수 방지 invariant: 할인이 정가 초과 시 차액 환급 대신 0원 결제로 처리
      couponDiscount = Math.min(couponDiscount, subtotal);

      appliedCoupon = {
        userCouponId: userCoupon.id,
        couponName: coupon.name,
        type: coupon.type,
        discountAmount: couponDiscount,
      };
    }

    const afterCouponAmount = subtotal - couponDiscount;

    // 6단계: 멤버십 자동 할인 — 사용자 요청 없이 gradeId만 있으면 적용
    // 쿠폰(명시적 선택)과 달리 회원 등급이 있는 한 항상 자동 반영
    let membershipDiscount = 0;
    let appliedMembership: PriceBreakdown['appliedMembership'];

    if (input.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: input.customerId },
        include: { membershipGrade: true },
      });

      const grade = customer?.membershipGrade;
      if (grade && grade.discountPercent > 0) {
        let calculated = Math.floor(
          (afterCouponAmount * grade.discountPercent) / 100,
        );
        // maxDiscount 캡: 쿠폰과 동일 원리 — 고등급 회원의 할인 상한 보장
        if (grade.maxDiscount && calculated > grade.maxDiscount) {
          calculated = grade.maxDiscount;
        }
        // afterCouponAmount가 maxDiscount보다 이미 작을 때 추가 음수 방지
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

    // 7단계: 제휴할인 — 결제 수단(카드사/통신사) 의존 → 파이프라인 마지막에 위치
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

      // combinableWithCoupon: 데이터 모델로 중복 허용 여부 관리 → 코드 변경 없이 정책 전환 가능
      if (input.userCouponId && !pd.combinableWithCoupon) {
        throw new BadRequestException(
          '쿠폰과 함께 사용할 수 없는 제휴할인입니다.',
        );
      }

      // minPurchase는 멤버십 할인 후 금액 기준: 실제 결제 예정 금액이 최소 조건 충족인지 검증
      if (afterMembershipAmount < pd.minPurchase) {
        throw new BadRequestException(
          `최소 ${pd.minPurchase.toLocaleString()}원 이상 결제 시 사용 가능합니다. (멤버십 할인 후 ${afterMembershipAmount.toLocaleString()}원)`,
        );
      }

      if (pd.discountMethod === 'AMOUNT') {
        partnerDiscount = pd.discountValue;
      } else if (pd.discountMethod === 'PERCENT') {
        let calculated = Math.floor(
          (afterMembershipAmount * pd.discountValue) / 100,
        );
        if (pd.maxDiscount && calculated > pd.maxDiscount) {
          calculated = pd.maxDiscount;
        }
        partnerDiscount = calculated;
      }

      // 음수 방지: 제휴할인도 잔액 초과 불가
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
