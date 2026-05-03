# CINE-X 🎬

> NestJS + Next.js로 만든 영화관 예매 풀스택 데모 사이트

## 📸 Demo

> 스크린샷은 `docs/screenshots/` 폴더를 참조하세요.

| 홈 화면 | 영화 상세 + 트레일러 |
|---|---|
| ![홈](docs/screenshots/home.png) | ![영화 상세](docs/screenshots/movie-detail.png) |

| 좌석 선택 | 토스 결제 위젯 | 내 예매 내역 |
|---|---|---|
| ![좌석](docs/screenshots/seat-select.png) | ![결제](docs/screenshots/payment.png) | ![예매내역](docs/screenshots/my-reservations.png) |

## ✨ 주요 기능

### 사용자 흐름
- JWT 기반 회원가입 / 로그인
- 영화 목록 / 상세 (장르, 감독, 출연진, 예고편 임베드)
- 영화관/상영관 정보 (영화관별 상영 일정)
- 좌석 선택 (등급별 가격 차등)
- 토스 페이먼츠 결제 위젯 통합
- 내 예매 내역 / 예매 취소 / 결제 재진입

### 멤버십 시스템
- **4단계 등급** — WELCOME / VIP(5만원~) / VVIP(20만원~) / LVIP(50만원~)
- **누적 결제금액 자동 추적** — 결제 시 즉시 반영, 취소 시 차감 및 강등 처리
- **등급 달성 시 쿠폰 자동 발급** — 각 등급 도달 시 해당 등급 보상만 지급 (중간 등급 스킵 시 최종 등급 쿠폰만)
- **결제 시 등급별 자동 할인** — VIP 3%(최대 3,000원) / VVIP 5%(최대 5,000원) / LVIP 7%(최대 8,000원)
- **마이페이지 멤버십 카드** — 등급별 컬러 그라디언트, 진행 바, 등급 비교표, 변동 이력

### 가격 계산 엔진 (5단계 순차 적용)
1. **정책가** — 상영관 유형·관람객 유형·평일/주말·2D/3D 매트릭스 요금
2. **좌석 등급** — 커플석 +5,000원 / 리클라이너석 +8,000원
3. **쿠폰** — 정액 할인 / 정률 할인 / 무료 티켓 3가지 타입
4. **멤버십** — 쿠폰 적용 후 금액 기준 자동 할인 (등급별 상한액 적용)
5. **제휴할인** — 신용카드 5종, 멤버십 적용 후 금액 기준, `combinableWithCoupon` 플래그로 제어

### 기술적 디테일
- 좌석 등급별 가격 (일반석 / 커플석 / 장애인석 / 리클라이너석)
- 상영관 등급 (일반관 / 샤롯데 / 수퍼플렉스 / 수퍼4D)
- 동시성 좌석 충돌 방지 (DB 트랜잭션)
- PENDING 예매 자동 만료 (10분 TTL)
- 결제 금액 위변조 **4중 방어**
  - DTO 화이트리스트로 차단
  - 서버 사이드 가격 재계산 (클라이언트 금액 미신뢰)
  - 결제 승인 시 DB 값과 비교 검증
  - 토스 응답의 카드사 코드로 제휴할인 결제수단 검증
- **제휴할인 결제수단 검증**
  - 카드사 할인 선택 후 다른 카드/간편결제로 결제 시 자동 환불
  - 토스 `card.issuerCode` → `TOSS_CARD_CODES` 매핑 → `partnerName` 일치 여부 확인
  - 환불 성공: reservation PENDING 유지 → 사용자 재결제 안내 (올바른 카드 / 다른 할인 / 할인 없이)
  - 환불 실패: reservation FAILED → 고객센터 연결 안내

## 🛠 기술 스택

### Backend
- NestJS (TypeScript)
- Prisma ORM
- PostgreSQL 16
- JWT 인증
- Toss Payments API

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Toss Payments Widget SDK

### Infra
- Docker Compose
- pnpm workspace (모노레포)

## 📁 폴더 구조

```
movie/
├── apps/
│   ├── api/                  # NestJS 백엔드
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── auth/         # 회원가입/로그인
│   │       ├── movies/       # 영화 CRUD
│   │       ├── cinemas/      # 영화관/상영관
│   │       ├── screenings/   # 상영 스케줄 + 좌석
│   │       ├── reservations/ # 예매 생성/취소
│   │       └── payments/     # 토스 결제 승인
│   └── web/                  # Next.js 프론트엔드
│       ├── app/
│       │   ├── movies/       # 영화 목록/상세
│       │   ├── cinemas/      # 영화관 찾기
│       │   ├── screenings/   # 좌석 선택
│       │   ├── reservations/ # 결제/완료
│       │   ├── my/           # 예매내역 / 쿠폰함 / 멤버십
│       │   ├── login/
│       │   └── signup/
│       ├── components/       # 공통 컴포넌트
│       └── lib/              # API 클라이언트/타입
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

## 🚀 실행 방법

```bash
# 1. PostgreSQL 컨테이너 시작
docker compose up -d

# 2. 의존성 설치
pnpm install

# 3. DB 마이그레이션
pnpm --filter api prisma migrate deploy

# 4. 시드 데이터 삽입
pnpm --filter api db:seed

# 5. 개발 서버 실행
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## 🔑 데모 계정

| Email | Password | 등급 | 누적 금액 |
|---|---|---|---|
| test@test.com | password123 | WELCOME | 0원 |
| vip@test.com | password123 | VIP | 75,000원 |
| vvip@test.com | password123 | VVIP | 250,000원 |

## 💳 토스 결제 테스트

테스트 환경이라 실제 결제는 일어나지 않습니다.  
카드번호는 아무거나 입력하셔도 됩니다 (예: 4330-0000-0000-0000).

## 🗂 ERD

> `docs/erd.png` 참조

33개 엔티티로 설계, 그 중 핵심 12개 구현 (좌석/상영관/영화/예매/결제/메타데이터).  
나머지 영역은 [향후 개발 계획](#-향후-개발-계획)에 명시.

## 🔮 향후 개발 계획

- [x] 요금정책 (상영관 유형·관람객 유형·평일/주말·2D/3D 매트릭스)
- [x] 쿠폰 시스템 (발급/사용/이력)
- [x] 제휴할인 (신용카드 5종)
- [x] 멤버십 등급 (WELCOME/VIP/VVIP/LVIP, 등급 쿠폰 자동 발급, 강등 처리)
- [ ] 통신사/포인트 제휴할인
- [ ] 이벤트 시스템 (응모/경품)
- [ ] 1:1 문의 / 고객센터
- [ ] 배포 (Vercel + Railway)

## 📄 라이선스

이 프로젝트는 학습용 데모입니다.  
실제 영화관 서비스와 무관하며, 영화 데이터는 무비차트(moviechart.co.kr) 차트 정보를 참고하여 더미 데이터로 사용했습니다.
