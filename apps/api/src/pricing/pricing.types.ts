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
  userCouponId?: number;
  customerId?: number;
}

export interface PriceBreakdown {
  baseTotal: number;
  seatBonus: number;
  subtotal: number;
  couponDiscount: number;
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
}
