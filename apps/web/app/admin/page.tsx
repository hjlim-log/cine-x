'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STAT_CARDS = [
  { label: '총 회원수', value: '-', sub: 'Phase 7-E' },
  { label: '이번 달 매출', value: '-', sub: 'Phase 7-E' },
  { label: '오늘 상영 편수', value: '-', sub: 'Phase 7-E' },
  { label: '미답변 문의', value: '-', sub: 'Phase 7-E' },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">대시보드</h1>
        <p className="text-slate-400 text-sm mt-1">관리자 메인 페이지입니다.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => (
          <Card key={card.label} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <p className="text-xs text-slate-600 mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-base text-slate-300">빠른 이동</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <a
            href="/admin/movies"
            className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
          >
            🎬 영화 관리
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
