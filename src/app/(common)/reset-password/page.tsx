/**
 * @file page.tsx
 * @description 비밀번호 재설정 페이지 (토큰 기반)
 * @created 2026-01-26
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { KeyRound, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
    const [error, setError] = useState('');
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    // 토큰 검증
    useEffect(() => {
        if (!token) {
            setStatus('invalid');
            setError('재설정 토큰이 없습니다.');
            return;
        }

        async function verifyToken() {
            try {
                const res = await fetch(`/api/auth/reset-password?token=${token}`);
                const data = await res.json();

                if (data.valid) {
                    setStatus('valid');
                    setUserName(data.userName || '');
                    setEmail(data.email || '');
                } else {
                    setStatus('invalid');
                    setError(data.error || '유효하지 않은 링크입니다.');
                }
            } catch (err) {
                setStatus('invalid');
                setError('서버 연결 오류');
            }
        }

        verifyToken();
    }, [token]);

    // 비밀번호 변경 제출
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (newPassword.length < 4) {
            setFormError('비밀번호는 4자 이상이어야 합니다.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setFormError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await res.json();

            if (data.success) {
                setStatus('success');
            } else {
                setFormError(data.error || '변경 실패');
            }
        } catch (err) {
            setFormError('서버 연결 오류');
        } finally {
            setSubmitting(false);
        }
    };

    // 로딩 상태
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">링크를 확인하는 중...</p>
                </div>
            </div>
        );
    }

    // 유효하지 않은 토큰
    if (status === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">링크 오류</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        로그인 화면으로
                    </button>
                </div>
            </div>
        );
    }

    // 변경 완료
    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">비밀번호 변경 완료</h1>
                    <p className="text-gray-600 mb-6">
                        새 비밀번호로 로그인할 수 있습니다.
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        로그인하기
                    </button>
                </div>
            </div>
        );
    }

    // 비밀번호 입력 폼
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <KeyRound className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">비밀번호 재설정</h1>
                    <p className="text-gray-500 text-sm mt-2">
                        <strong>{userName}</strong>님 ({email})
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            새 비밀번호
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="새 비밀번호 입력 (4자 이상)"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            비밀번호 확인
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="비밀번호 다시 입력"
                        />
                    </div>

                    {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {formError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting ? '처리 중...' : '비밀번호 변경'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/login')}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        ← 로그인 화면으로
                    </button>
                </div>
            </div>
        </div>
    );
}

// 동적 렌더링 강제 (정적 생성 비활성화)
export const dynamic = 'force-dynamic';

// Suspense로 감싼 export 컴포넌트
export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">로딩 중...</p>
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
