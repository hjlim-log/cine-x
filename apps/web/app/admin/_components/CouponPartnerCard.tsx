'use client';

type CouponUsage = {
  total: number;
  used: number;
  available: number;
  expired: number;
  usageRate: number;
};

type PartnerItem = {
  partner: {
    id: number;
    name: string;
    partnerName: string;
    partnerType: string;
    bgColor?: string | null;
  };
  count: number;
  totalDiscount: number;
};

export default function CouponPartnerCard({
  coupon,
  partners,
}: {
  coupon: CouponUsage | null;
  partners: PartnerItem[];
}) {
  const maxCount = partners.length > 0 ? Math.max(...partners.map((p) => p.count)) : 1;

  return (
    <div className="space-y-5">
      {/* 쿠폰 사용률 */}
      {coupon && (
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <span className="text-sm text-slate-400">쿠폰 사용률</span>
            <span className="text-xl font-bold text-white">{coupon.usageRate}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-600 rounded-full transition-all duration-500"
              style={{ width: `${coupon.usageRate}%` }}
            />
          </div>
          <div className="flex gap-4 mt-1.5 text-xs text-slate-500">
            <span>발급 {coupon.total.toLocaleString()}</span>
            <span className="text-emerald-500">사용 {coupon.used.toLocaleString()}</span>
            <span>가용 {coupon.available.toLocaleString()}</span>
            <span className="text-slate-600">만료 {coupon.expired.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 제휴 할인 통계 */}
      {partners.length > 0 && (
        <div>
          <div className="text-sm text-slate-400 mb-2">제휴 할인 통계</div>
          <div className="space-y-2">
            {partners.slice(0, 6).map((p) => (
              <div key={p.partner.id} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-20 truncate shrink-0">
                  {p.partner.partnerName}
                </span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((p.count / maxCount) * 100)}%`,
                      backgroundColor: p.partner.bgColor?.startsWith('#')
                        ? p.partner.bgColor
                        : '#dc2626',
                    }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-8 text-right shrink-0">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!coupon && partners.length === 0 && (
        <div className="text-sm text-slate-600 text-center py-4">데이터 없음</div>
      )}
    </div>
  );
}
