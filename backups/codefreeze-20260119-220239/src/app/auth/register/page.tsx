/**
 * @file page.tsx
 * @description 회원가입 페이지 - 사용자 가입 신청 (컴팩트 가로 레이아웃)
 * @created 2026-01-19
 * @updated 2026-01-19: 가로 테이블 형식으로 변경
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  factory: string;
  department: string;
  position: string;
  reqPfmea: boolean;
  reqDfmea: boolean;
  reqCp: boolean;
  reqPfd: boolean;
}

const INITIAL_FORM: RegisterForm = {
  name: '',
  email: '',
  phone: '',
  factory: '',
  department: '',
  position: '',
  reqPfmea: false,
  reqDfmea: false,
  reqCp: false,
  reqPfd: false,
};

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.email || !form.phone || !form.factory || !form.department) {
      setError('필수 항목(*)을 모두 입력해주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('올바른 전화번호를 입력해주세요.');
      return;
    }

    if (!form.reqPfmea && !form.reqDfmea && !form.reqCp && !form.reqPfd) {
      setError('사용할 모듈을 최소 1개 이상 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone: phoneDigits }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || '가입 신청에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full text-center">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-xl font-bold text-gray-800 mb-3">가입 신청 완료!</h1>
          <p className="text-gray-600 text-sm mb-4">
            관리자 승인 후 로그인이 가능합니다.<br />
            최초 비밀번호는 <strong>본인 전화번호</strong>입니다.
          </p>
          <Link href="/welcomeboard" className="inline-block px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            메인으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-4 rounded-t-xl">
          <h1 className="text-lg font-bold">📝 FMEA On-Premise 회원가입</h1>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-6 mt-4 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6">
          {/* 기본 정보 테이블 */}
          <table className="w-full text-sm border-collapse mb-4">
            <tbody>
              <tr className="border-b">
                <th className="py-2 px-3 bg-gray-50 text-left w-24 font-medium text-gray-700">성명 *</th>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                    placeholder="홍길동"
                  />
                </td>
                <th className="py-2 px-3 bg-gray-50 text-left w-24 font-medium text-gray-700">이메일 *</th>
                <td className="py-2 px-2">
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                    placeholder="user@company.com"
                  />
                </td>
              </tr>
              <tr className="border-b">
                <th className="py-2 px-3 bg-gray-50 text-left font-medium text-gray-700">전화번호 *</th>
                <td className="py-2 px-2">
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                    placeholder="010-1234-5678"
                  />
                </td>
                <th className="py-2 px-3 bg-gray-50 text-left font-medium text-gray-700">직급</th>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    name="position"
                    value={form.position}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                    placeholder="과장"
                  />
                </td>
              </tr>
              <tr className="border-b">
                <th className="py-2 px-3 bg-gray-50 text-left font-medium text-gray-700">공장 *</th>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    name="factory"
                    value={form.factory}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                    placeholder="평택공장"
                  />
                </td>
                <th className="py-2 px-3 bg-gray-50 text-left font-medium text-gray-700">부서 *</th>
                <td className="py-2 px-2">
                  <input
                    type="text"
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                    placeholder="품질관리"
                  />
                </td>
              </tr>
              <tr>
                <th className="py-3 px-3 bg-gray-50 text-left font-medium text-gray-700 align-middle">사용 모듈 *</th>
                <td colSpan={3} className="py-3 px-2">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-blue-50 px-3 py-1.5 rounded border transition-colors">
                      <input
                        type="checkbox"
                        name="reqPfmea"
                        checked={form.reqPfmea}
                        onChange={handleChange}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-medium">PFMEA</span>
                      <span className="text-xs text-gray-400">(공정)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-purple-50 px-3 py-1.5 rounded border transition-colors">
                      <input
                        type="checkbox"
                        name="reqDfmea"
                        checked={form.reqDfmea}
                        onChange={handleChange}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-medium">DFMEA</span>
                      <span className="text-xs text-gray-400">(설계)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-orange-50 px-3 py-1.5 rounded border transition-colors">
                      <input
                        type="checkbox"
                        name="reqCp"
                        checked={form.reqCp}
                        onChange={handleChange}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <span className="font-medium">CP</span>
                      <span className="text-xs text-gray-400">(관리계획)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-green-50 px-3 py-1.5 rounded border transition-colors">
                      <input
                        type="checkbox"
                        name="reqPfd"
                        checked={form.reqPfd}
                        onChange={handleChange}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="font-medium">PFD</span>
                      <span className="text-xs text-gray-400">(공정흐름)</span>
                    </label>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 안내 */}
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
            💡 최초 비밀번호는 <strong>본인 전화번호</strong>입니다. 관리자 승인 후 로그인이 가능합니다.
          </div>

          {/* 버튼 */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              이미 계정이 있으신가요?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">로그인</Link>
            </div>
            <div className="flex gap-2">
              <Link
                href="/welcomeboard"
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded hover:bg-gray-50 text-sm"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? '처리 중...' : '가입 신청'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
