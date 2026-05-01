'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signup } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await signup({
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone || undefined,
      });
      localStorage.setItem('token', token);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 text-center">회원가입</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">이름</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="홍길동"
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">이메일</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="example@email.com"
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">비밀번호</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="6자 이상"
            required
            minLength={6}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">전화번호 (선택)</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="010-0000-0000"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {loading ? '처리 중...' : '회원가입'}
        </button>
      </form>
      <p className="text-center text-zinc-400 text-sm mt-6">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-red-400 hover:text-red-300">
          로그인
        </Link>
      </p>
    </div>
  );
}
