export type Cinema = {
  id: number;
  name: string;
  address: string;
  region: string;
  createdAt: string;
};

export type ScreenType = {
  id: number;
  name: string;
  grade: string;
  description: string | null;
};

export type SeatType = {
  id: number;
  name: string;
  additionalPrice: number;
};

export type Screen = {
  id: number;
  name: string;
  totalSeats: number;
  cinemaId: number;
  cinema: Cinema;
  type?: ScreenType;
};

export type Seat = {
  id: number;
  row: string;
  number: number;
  screenId: number;
  type?: SeatType;
};

export type Person = {
  id: number;
  name: string;
  originalName: string | null;
  profileUrl: string | null;
  nationality: string | null;
  birthDate: string | null;
};

export type Movie = {
  id: number;
  title: string;
  runtime: number;
  rating: string;
  genre?: string;
  genres?: string[];
  synopsis: string;
  posterUrl: string | null;
  releaseDate: string;
};

export type Screening = {
  id: number;
  startTime: string;
  endTime: string;
  screenType: string;
  movieId: number;
  screenId: number;
};

export type MovieDetail = Omit<Movie, 'genres'> & {
  genres: string[];
  director: Person | null;
  cast: (Person & { order: number })[];
  trailer: { url: string } | null;
  stills: { url: string }[];
  screenings: (Screening & { screen: Screen })[];
};

export type ScreeningDetail = Screening & {
  movie: Movie;
  screen: Screen & { seats: Seat[] };
  bookedSeatIds: number[];
};

export type Ticket = {
  id: number;
  price: number;
  reservationId: number;
  seatId: number;
  seat: Seat;
};

export type Reservation = {
  id: number;
  orderId: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
  paymentKey?: string | null;
  paidAt?: string | null;
  audienceCounts?: AudienceCounts | null;
  customerId: number;
  screeningId: number;
  createdAt: string;
  canResumePayment?: boolean;
  customer?: { email: string; name: string };
  tickets: Ticket[];
  screening: Screening & {
    movie: Movie;
    screen: Screen & { cinema: Cinema };
  };
  couponUsage?: {
    discountAmount: number;
    userCoupon?: {
      id: number;
      coupon: { name: string; type: string };
    };
  } | null;
  partnerDiscountUsage?: {
    discountAmount: number;
    partnerDiscount?: { name: string; partnerName: string };
  } | null;
};

export type AudienceCounts = {
  ADULT?: number;
  TEEN?: number;
  SENIOR?: number;
  DISABLED?: number;
  CHILD?: number;
};

export type PriceBreakdown = {
  baseTotal: number;
  seatBonus: number;
  subtotal: number;
  couponDiscount: number;
  afterCouponAmount: number;
  membershipDiscount: number;
  afterMembershipAmount: number;
  partnerDiscount: number;
  totalAmount: number;
  details: {
    audienceType: string;
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
};

export type MembershipGrade = {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  minAmount: number;
  maxAmount: number | null;
  discountPercent: number;
  maxDiscount: number | null;
  bgColor: string | null;
  rewards: {
    id: number;
    quantity: number;
    coupon: {
      name: string;
      type: string;
      value: number;
      maxDiscount: number | null;
    };
  }[];
};

export type MembershipHistory = {
  id: number;
  fromGrade: string | null;
  toGrade: string;
  changeType: 'UPGRADE' | 'DOWNGRADE' | 'INITIAL';
  totalAmount: number;
  changedAt: string;
};

export type MembershipInfo = {
  currentGrade: MembershipGrade;
  totalAmount: number;
  nextGrade: MembershipGrade | null;
  amountToNext: number | null;
  history: MembershipHistory[];
};

export type MembershipResult = {
  oldGrade: string;
  newGrade: string;
  upgraded: boolean;
  totalAmount: number;
};

export type PartnerDiscount = {
  id: number;
  name: string;
  partnerType: string;
  partnerName: string;
  description: string | null;
  discountMethod: 'AMOUNT' | 'PERCENT';
  discountValue: number;
  maxDiscount: number | null;
  minPurchase: number;
  combinableWithCoupon: boolean;
  imageUrl: string | null;
  bgColor: string | null;
};

export type Coupon = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  type: 'AMOUNT_DISCOUNT' | 'PERCENT_DISCOUNT' | 'FREE_TICKET';
  value: number;
  minPurchase: number;
  maxDiscount: number | null;
  validDays: number;
  imageUrl: string | null;
  bgColor: string | null;
  isActive: boolean;
};

export type UserCoupon = {
  id: number;
  customerId: number;
  couponId: number;
  status: 'AVAILABLE' | 'USED' | 'EXPIRED' | 'RESERVED';
  issuedAt: string;
  expiresAt: string;
  usedAt: string | null;
  coupon: Coupon;
  usage?: {
    id: number;
    discountAmount: number;
    usedAt: string;
  } | null;
};

export type CinemaListItem = Cinema & { screenCount: number };

export type CinemaScreening = Screening & {
  movie: Movie;
  screen: { id: number; name: string; totalSeats: number; cinemaId: number };
};

export type CinemaDetail = Cinema & {
  screens: { id: number; name: string; totalSeats: number }[];
  screenings: CinemaScreening[];
};
