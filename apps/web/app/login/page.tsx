'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { login } from '@/lib/api';
import { Suspense } from 'react';
import * as Sentry from '@sentry/nextjs';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(email, password);
      localStorage.setItem('token', token);
      Sentry.setUser({ id: user.id.toString(), email: user.email });
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 text-center">로그인</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@test.com"
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password123"
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <p className="text-center text-zinc-400 text-sm mt-6">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="text-red-400 hover:text-red-300">
          회원가입
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-zinc-400">로딩 중...</div>}>
      <LoginForm />
    </Suspense>
  );
}
