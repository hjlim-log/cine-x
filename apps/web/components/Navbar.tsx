'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getMyMembership, getMyApplications } from '@/lib/api';

const NAV_LINKS = [
  { label: '예매', href: '/movies' },
  { label: '영화', href: '/movies' },
  { label: '영화관', href: '/cinemas' },
  { label: '이벤트', href: '/events' },
];

const GRADE_BADGE: Record<string, string> = {
  VIP:  'bg-red-700 text-red-100',
  VVIP: 'bg-violet-700 text-violet-100',
  LVIP: 'bg-amber-500 text-amber-950',
};

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gradeName, setGradeName] = useState<string | null>(null);
  const [hasUnreadWin, setHasUnreadWin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoggedIn(!!token);
    if (!token) { setGradeName(null); return; }

    const cached = sessionStorage.getItem('membershipGrade');
    if (cached) { setGradeName(cached); return; }

    getMyMembership(token)
      .then((info) => {
        const name = info.currentGrade.name;
        sessionStorage.setItem('membershipGrade', name);
        setGradeName(name);
      })
      .catch(() => {});

    getMyApplications(token)
      .then((apps) => {
        setHasUnreadWin(apps.some((a) => a.status === 'WON' && !a.notificationRead));
      })
      .catch(() => {});
  }, [pathname]);

  // 모바일 메뉴 열린 상태에서 라우트 이동 시 닫기
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('membershipGrade');
    setLoggedIn(false);
    setGradeName(null);
    setHasUnreadWin(false);
    router.push('/');
  }

  function navLinkClass(href: string) {
    const active = pathname === href || (href !== '/' && pathname.startsWith(href));
    return active
      ? 'text-red-500 border-b-2 border-red-500 pb-0.5 font-medium transition-colors'
      : 'text-zinc-300 hover:text-white transition-colors';
  }

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="text-red-500 font-bold text-lg tracking-widest shrink-0">
          CINE-X
        </Link>

        {/* 데스크톱 메뉴 */}
        <div className="hidden md:flex items-center gap-8 text-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={navLinkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* 우측 인증 영역 (데스크톱) */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {loggedIn ? (
            <>
              <Link href="/my/reservations" className={`flex items-center gap-1.5 ${navLinkClass('/my')}`}>
                마이페이지
                {gradeName && GRADE_BADGE[gradeName] && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${GRADE_BADGE[gradeName]}`}>
                    {gradeName}
                  </span>
                )}
                {hasUnreadWin && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="새 당첨 알림" />
                )}
              </Link>
              <button
                onClick={logout}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors"
            >
              로그인
            </Link>
          )}
        </div>

        {/* 햄버거 버튼 (모바일) */}
        <button
          className="md:hidden text-zinc-300 hover:text-white p-1"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="메뉴 열기"
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* 모바일 드롭다운 */}
      {menuOpen && (
        <div className="md:hidden bg-zinc-900 border-t border-zinc-800 px-4 py-3 flex flex-col gap-4 text-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={navLinkClass(link.href)}>
              {link.label}
            </Link>
          ))}
          <div className="border-t border-zinc-800 pt-3 flex flex-col gap-3">
            {loggedIn ? (
              <>
                <Link href="/my/reservations" className={`flex items-center gap-1.5 ${navLinkClass('/my')}`}>
                  마이페이지
                  {gradeName && GRADE_BADGE[gradeName] && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${GRADE_BADGE[gradeName]}`}>
                      {gradeName}
                    </span>
                  )}
                  {hasUnreadWin && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="새 당첨 알림" />
                  )}
                </Link>
                <button onClick={logout} className="text-left text-zinc-400 hover:text-white transition-colors">
                  로그아웃
                </button>
              </>
            ) : (
              <Link href="/login" className="text-red-400 hover:text-red-300 transition-colors">
                로그인
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
