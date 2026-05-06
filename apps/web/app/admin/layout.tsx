'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드', icon: '📊' },
  { href: '/admin/movies', label: '영화 관리', icon: '🎬' },
  { href: '/admin/screenings', label: '상영 스케줄', icon: '🎫' },
  { href: '/admin/events', label: '이벤트 관리', icon: '🎁' },
  { href: '/admin/coupons', label: '쿠폰 관리', icon: '🎟️', disabled: true },
  { href: '/admin/inquiries', label: '문의 답변', icon: '💬', disabled: true },
  { href: '/admin/customers', label: '회원 관리', icon: '👥', disabled: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login?next=' + pathname);
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'ADMIN') {
        router.replace('/');
        return;
      }
      setUser({ email: payload.email, role: payload.role });
      setChecking(false);
    } catch {
      router.replace('/login');
    }
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-sm">권한 확인 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* 사이드바 */}
      <aside className="w-60 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* 로고 */}
        <div className="px-6 py-5 border-b border-slate-800">
          <Link href="/" className="text-xl font-bold text-red-500 tracking-wider">
            CINE-X
          </Link>
          <div className="mt-0.5 text-xs text-slate-500">관리자 페이지</div>
        </div>

        {/* 네비게이션 */}
        <nav className="p-3 space-y-0.5 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.disabled ? '#' : item.href}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
                  item.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : '',
                ].join(' ')}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {item.disabled && (
                  <span className="ml-auto text-[10px] text-slate-600 font-mono">soon</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* 하단 유저 정보 */}
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-1 truncate">{user?.email}</div>
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← 메인 사이트로
          </Link>
        </div>
      </aside>

      {/* 콘텐츠 영역 */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
