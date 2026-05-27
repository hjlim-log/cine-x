export type AudienceType = 'ADULT' | 'TEEN' | 'SENIOR' | 'DISABLED' | 'CHILD';
export type Format = '2D' | '3D';
export type DayType = 'WEEKDAY' | 'WEEKEND';

export interface AudienceCounts {
  ADULT?: number;
  TEEN?: number;
  SENIOR?: number;
  DISABLED?: number;
  CHILD?: number;
}

export interface PriceCalculationInput {
  screeningId: number;
  seatIds: number[];
  audienceCounts: AudienceCounts;
  /** 선택: 사용자가 명시적으로 적용한 쿠폰 */
  userCouponId?: number;
  customerId?: number;
  /** 선택: 결제 수단(카드사/통신사) 연계 제휴할인 */
  partnerDiscountId?: number;
}

/**
 * 5단계 파이프라인의 각 중간 결과값을 모두 포함.
 * 단순히 최종 금액만 반환하지 않는 이유:
 * 프론트에서 "쿠폰 -3,000원 / 멤버십 -900원" 같은 할인 내역 UI를 렌더링하기 위해.
 */
export interface PriceBreakdown {
  /** 관람 인원 × 정책가 합산. 좌석 추가금은 별도로 seatBonus에 */
  baseTotal: number;
  /** 좌석 타입별 추가금 합산 (커플석 +5,000 등). 일반 좌석이면 0 */
  seatBonus: number;
  /** baseTotal + seatBonus. 쿠폰/멤버십 적용 전 기준 금액 */
  subtotal: number;
  /** 쿠폰 할인액. 미사용 시 0. 항상 subtotal 이하 (음수 방지) */
  couponDiscount: number;
  /** subtotal - couponDiscount. 멤버십 할인 계산의 입력값 */
  afterCouponAmount: number;
  /** 멤버십 자동 할인액. 비회원 또는 할인 없는 등급이면 0 */
  membershipDiscount: number;
  /** afterCouponAmount - membershipDiscount. 제휴할인 계산의 입력값 */
  afterMembershipAmount: number;
  /** 제휴할인 적용 할인액. 미사용 시 0. 항상 afterMembershipAmount 이하 */
  partnerDiscount: number;
  /** 최종 결제 금액. afterMembershipAmount - partnerDiscount. 항상 0 이상 */
  totalAmount: number;
  details: {
    audienceType: AudienceType;
    count: number;
    unitPrice: number;
    subtotal: number;
  }[];
  seatDetails: {
    seatId: number;
    additionalPrice: number;
  }[];
  appliedCoupon?: {
    userCouponId: number;
    couponName: string;
    type: string;
    discountAmount: number;
  };
  appliedMembership?: {
    gradeName: string;
    discountPercent: number;
    discountAmount: number;
  };
  appliedPartnerDiscount?: {
    partnerDiscountId: number;
    name: string;
    partnerName: string;
    partnerType: string;
    discountMethod: string;
    discountAmount: number;
  };
}
