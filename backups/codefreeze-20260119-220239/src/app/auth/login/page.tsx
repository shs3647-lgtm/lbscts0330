/**
 * @file page.tsx
 * @description 로그인 페이지
 * @created 2026-01-19
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        // 로그인 성공 - 세션 저장
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/welcomeboard');
      } else {
        setError(data.error || '로그인에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">로그인</h1>
          <p className="text-gray-500 text-sm">FMEA On-Premise</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 이메일 */}
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="user@company.com"
            />
          </div>

          {/* 비밀번호 */}
          <div className="mb-6">
            <label className="block text-sm text-gray-600 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-400">
              최초 비밀번호는 본인 전화번호입니다.
            </p>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 링크 */}
        <div className="mt-6 flex justify-between text-sm">
          <Link href="/auth/change-password" className="text-gray-500 hover:text-gray-700">
            비밀번호 변경
          </Link>
          <Link href="/auth/register" className="text-blue-600 hover:underline font-medium">
            회원가입
          </Link>
        </div>

        {/* 돌아가기 */}
        <div className="mt-6 text-center">
          <Link
            href="/welcomeboard"
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← 메인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
