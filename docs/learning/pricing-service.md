# PricingService 학습 노트

> 5단계 가격 계산 파이프라인 — 99% 단위 테스트 커버리지  
> 학습 + 면접 준비용 노트

---

## 📐 큰 그림

```
[입력]
├─ screeningId
├─ seatIds[]
├─ audienceCounts (ADULT/TEEN/SENIOR/DISABLED/CHILD)
├─ userCouponId?   (사용자 선택)
├─ partnerDiscountId? (사용자 선택)
└─ customerId

[5단계 파이프라인]
1단계: 정책가(baseTotal) + 좌석 추가금(seatBonus)  →  subtotal
2단계: 쿠폰 할인 (사용자 선택)                     →  afterCouponAmount
3단계: 멤버십 할인 (자동 적용)                     →  afterMembershipAmount
4단계: 제휴할인 (결제 수단 연계)                   →  totalAmount
5단계: 음수 방지 + PriceBreakdown 패키징

[출력: PriceBreakdown]
{
  baseTotal, seatBonus, subtotal,
  couponDiscount, afterCouponAmount,
  membershipDiscount, afterMembershipAmount,
  partnerDiscount, totalAmount,
  details, seatDetails, appliedCoupon, appliedMembership, appliedPartnerDiscount
}
```

---

## 🎯 설계 결정

### 1. 왜 PricingService를 분리했나?

가격 계산 로직이 여러 곳에서 호출된다:
- `POST /reservations` — 예매 생성 시
- `POST /payments/confirm` — 결제 confirm 시 서버 검증
- 어드민 가격 미리보기

분리하지 않으면 동일 로직이 3곳에 중복되고, 정책 변경 시 모두 수정해야 한다.  
Service로 분리해서 **SRP(단일 책임) + 테스트 용이성 + 재사용성**을 동시에 확보.

### 2. 왜 5단계 순서인가?

| 순서 | 할인 | 성격 | 결정 시점 |
|------|------|------|-----------|
| 1st | 쿠폰 | 사용자 명시 선택 | 예매 시작 시 |
| 2nd | 멤버십 | 자격 기반 자동 | 로그인 시 결정됨 |
| 3rd | 제휴할인 | 결제 수단 연계 | 결제 직전 카드 선택 |

원칙: **사용자 명시 선택 → 시스템 자동 → 결제 수단 의존** 순서.  
각 단계의 minPurchase 검증도 이 순서 덕분에 "이전 할인 후 실제 잔액" 기준으로 명확히 계산됨.

### 3. 왜 멤버십이 제휴할인 앞에 오나?

멤버십은 로그인한 순간 등급이 확정됨 → 예매 화면에서 이미 할인 적용됨을 보여줄 수 있음.  
제휴할인은 "어떤 카드로 결제할지"에 따라 달라짐 → 결제 직전에 선택.  

또한 제휴할인의 `minPurchase` 검증을 멤버십 할인 후 금액 기준으로 하는 편이 운영 안전:
- 멤버십으로 이미 줄어든 실제 결제 예정 금액이 최소 기준을 충족하는지 확인.

### 4. 왜 음수 방지가 각 단계마다 필요한가?

예시: 50,000원짜리 예매 + 100,000원짜리 FREE_TICKET 쿠폰 → 할인이 정가 초과.

각 단계에서:
```typescript
couponDiscount = Math.min(couponDiscount, subtotal);         // 쿠폰 단계
calculated     = Math.min(calculated, afterCouponAmount);    // 멤버십 단계
partnerDiscount = Math.min(partnerDiscount, afterMembershipAmount); // 제휴 단계
```

단계마다 잔액 초과 불가 invariant를 보장 → 최종 totalAmount 항상 0 이상.

### 5. 왜 트랜잭션을 안 썼나?

`PricingService`는 read-only. DB 변경 없음.  
실제 상태 변경(reservation 행 생성, 쿠폰 상태 `RESERVED`로 전환)은 `ReservationsService`에서 트랜잭션으로 처리.  
**관심사 분리**: 가격 계산은 순수 함수처럼 동작하도록 설계 → 어디서든 트랜잭션 없이 호출 가능.

---

## 🔧 핵심 패턴

### 파이프라인 패턴

각 단계는 독립적이고, 이전 단계 출력이 다음 단계 입력으로 흘러간다:
```
subtotal → (쿠폰 적용) → afterCouponAmount → (멤버십 적용) → afterMembershipAmount → (제휴 적용) → totalAmount
```
새 할인 종류 추가 시 기존 단계 건드리지 않고 새 단계만 끼워 넣으면 됨.

### 영화관 특별 정책 오버라이드

```typescript
if (!existing || (p.cinemaId !== null && existing.cinemaId === null)) {
  policyMap.set(p.audienceType, p);
}
```
동일 audienceType에 영화관 특별 정책(cinemaId 있음)과 공통 정책(cinemaId null)이 함께 조회되면  
특별 정책이 공통을 덮어씀 → 본사 기본 요금 유지하면서 특정 영화관만 다른 요금 운영 가능.

### combinableWithCoupon으로 정책 관리

```typescript
if (input.userCouponId && !pd.combinableWithCoupon) {
  throw new BadRequestException('쿠폰과 함께 사용할 수 없는 제휴할인입니다.');
}
```
중복 할인 허용 여부를 코드가 아닌 DB 컬럼으로 관리 → 코드 배포 없이 정책 전환 가능.

### 화이트리스트 검증 (DTO 레벨)

`forbidNonWhitelisted: true` 설정으로 `totalAmount` 같은 필드를 클라이언트가 보내면 차단.  
가격은 서버에서만 결정 → 클라이언트 위변조 방어.

---

## 💼 면접 Q&A

### Q1: PricingService를 왜 분리했나요?

가격 계산 로직이 예매 생성, 결제 confirm, 어드민 검증 등 여러 곳에서 호출됩니다.  
분리하지 않으면 동일 로직이 중복되고, 정책 변경 시 모든 위치를 수정해야 합니다.  
Service로 분리해서 단일 책임 원칙(SRP)과 테스트 용이성을 모두 확보했고,  
실제로 99% 단위 테스트 커버리지를 달성한 모듈이기도 합니다.

### Q2: 5단계 가격 엔진의 순서는 어떻게 정했나요?

쿠폰 → 멤버십 → 제휴할인 순서입니다.  
쿠폰은 사용자가 명시적으로 선택하므로 우선순위가 높고,  
멤버십은 회원 등급에 따른 자동 적용이라 그 다음,  
제휴할인은 결제 직전 카드 선택에 따라 달라지므로 마지막입니다.  
이 순서 덕분에 각 단계의 minPurchase 검증이 "이전 할인 후 실제 잔액" 기준으로 일관되게 동작합니다.

### Q3: 가격 계산 시 동시성 문제는 어떻게 처리하셨나요?

PricingService 자체는 read-only라 동시성 이슈가 없습니다.  
실제 동시성 충돌은 좌석 점유에서 발생하는데,  
ReservationsService에서 PostgreSQL unique constraint와 트랜잭션으로 처리합니다.  
가격 계산은 순수 함수처럼 동작하도록 설계했기 때문에 어느 컨텍스트에서도 안전하게 호출됩니다.

### Q4: 쿠폰과 제휴할인 중복 적용은 어떻게 처리하셨나요?

`PartnerDiscount` 모델에 `combinableWithCoupon: boolean` 필드를 두었습니다.  
`false`면 쿠폰과 제휴할인 동시 적용 시 에러를 던지고, `true`면 둘 다 적용됩니다.  
코드가 아닌 DB 컬럼으로 정책을 관리하므로 코드 배포 없이 정책 변경이 가능합니다.

### Q5: PERCENT 쿠폰의 maxDiscount는 왜 필요한가요?

운영 안전 때문입니다.  
예를 들어 100,000원 결제에 50% 쿠폰을 무제한 적용하면 50,000원 손실이 발생합니다.  
`maxDiscount: 5000`으로 캡을 두면 쿠폰당 최대 할인액이 보장됩니다.  
멤버십 할인에도 같은 원리로 maxDiscount가 있습니다 (VIP 3% max 3,000원 등).

### Q6: FREE_TICKET을 가장 비싼 좌석부터 무료로 한 이유는?

두 가지 목적입니다.  
사용자 측면: 가장 비싼 좌석이 무료가 되므로 체감 혜택이 최대화됩니다.  
운영 측면: 발급 시 "이 쿠폰의 최대 손실은 N원" 계산이 명확해집니다.  
가장 싼 좌석이나 평균 기준으로 했을 때는 사용자와 운영 양쪽에 모호함이 생깁니다.

### Q7: 음수 결제 금액은 어떻게 방지하셨나요?

각 단계에서 `Math.min(할인액, 현재잔액)`을 적용합니다.  
즉 "할인이 잔액 초과 시 잔액만큼만 할인, 차액 환급 없음"이라는 invariant를 코드 레벨에서 보장합니다.  
이 케이스는 단위 테스트로도 명시적으로 검증되어 있습니다.

---

## 🔬 코드 깊이 분석

### calculate() 핵심 코드 인용

**정책 4차원 매트릭스 조회**
```typescript
await this.prisma.pricingPolicy.findMany({
  where: {
    screenTypeId, format, dayType, isActive: true,
    audienceType: { in: audienceTypes },
    OR: [{ cinemaId }, { cinemaId: null }],  // 영화관 특별 + 공통 동시 조회
    validFrom: { lte: now },
  },
});
```
`validTo: null`은 Prisma WHERE로 걸러내기 어려워 코드에서 후처리. Prisma의 OR null 처리 한계.

**영화관 특별 정책 우선 적용**
```typescript
if (!existing || (p.cinemaId !== null && existing.cinemaId === null)) {
  policyMap.set(p.audienceType, p);
}
```
cinemaId 있음 = 특별, null = 공통. 특별이 공통을 덮어씀.

**PERCENT + maxDiscount 캡**
```typescript
let calculated = Math.floor((subtotal * coupon.value) / 100);
if (coupon.maxDiscount && calculated > coupon.maxDiscount) {
  calculated = coupon.maxDiscount;
}
```
`Math.floor`: 할인 계산에서 소수점 이하 버림 → 항상 정수 원화.

**FREE_TICKET 내림차순 정렬**
```typescript
const sortedAudiencePrices = Object.entries(input.audienceCounts)
  .flatMap(([type, count]) => Array(count).fill(policyMap.get(type)!.basePrice))
  .sort((a, b) => b - a);  // 내림차순
```
`flatMap`으로 "성인 2명 → [14000, 14000]" 형태로 펼친 뒤 정렬. 가장 비싼 좌석이 index 0.

**음수 방지 (쿠폰 단계)**
```typescript
couponDiscount = Math.min(couponDiscount, subtotal);
```
같은 패턴이 멤버십, 제휴할인 단계에도 반복됨. 각 단계 독립적으로 불변식 보장.

**멤버십 자동 적용 vs 쿠폰 선택 적용**
```typescript
// 쿠폰: input.userCouponId 있을 때만
if (input.userCouponId && input.customerId) { ... }

// 멤버십: customerId만 있으면 자동 (별도 요청 파라미터 없음)
if (input.customerId) {
  const customer = await this.prisma.customer.findUnique(...);
  if (grade && grade.discountPercent > 0) { ... }  // gradeId 있으면 자동
}
```

---

## 🎓 더 학습할 거리

- **DDD 도메인 서비스 패턴** — PricingService가 도메인 서비스의 교과서적 예시
- **파이프라인 패턴 vs Chain of Responsibility** — 유사하지만 책임 구조가 다름
- **가격 정책 엔진의 다른 구현** — Drools, Easy Rules, JSON 규칙 엔진 비교
- **jest-mock-extended** — 99% 커버리지를 만들기 위한 mock 전략
- **Prisma의 OR + null 조건** — `OR [{ cinemaId }, { cinemaId: null }]` 패턴의 SQL 변환 확인

---

## 📖 학습 추천 순서

처음 공부할 때 이 순서로 보면 흐름 파악이 쉽다:

1. **`pricing.types.ts`** — PriceCalculationInput(입력)과 PriceBreakdown(출력) 형태 파악
2. **`pricing.service.ts` 상단 JSDoc** — 5단계 파이프라인 전체 흐름 개요 읽기
3. **`pricing.service.ts` 1~4단계** — 정책 조회 + 기본료 + 좌석 추가금 (비교적 단순)
4. **5단계 쿠폰 로직** — AMOUNT / PERCENT / FREE_TICKET 3갈래 + 음수 방지
5. **6단계 멤버십** — 자동 적용 패턴, maxDiscount 캡 구조
6. **7단계 제휴할인** — combinableWithCoupon, minPurchase 기준 이해
7. **이 노트의 면접 Q&A** — 각 결정을 언어로 설명하는 연습
