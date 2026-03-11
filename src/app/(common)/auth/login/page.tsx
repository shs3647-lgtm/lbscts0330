// CODEFREEZE
/**
 * @file page.tsx
 * @description 로그인 페이지 (사진 등록 기능 포함)
 * @created 2026-01-19
 * @updated 2026-02-02 - 프로필 사진 업로드 기능 추가
 */

'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 프로필 사진 업로드 상태
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 비밀번호 찾기 모달 상태
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Floating window hook
  const { pos: resetPos, size: resetSize, onDragStart: resetDragStart, onResizeStart: resetResizeStart } = useFloatingWindow({ isOpen: showResetModal, width: 440, height: 380 });

  // 이미지 리사이즈 함수
  const resizeImage = (file: File, maxWidth: number = 150, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context 생성 실패'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsDataURL(file);
    });
  };

  // 프로필 사진 업로드 핸들러
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await resizeImage(file, 150, 0.6);
        setProfilePhoto(base64);
        localStorage.setItem('pending_profile_photo', base64);
      } catch (err) {
        console.error('사진 리사이즈 실패:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: email, password }),
      });

      const data = await response.json();

      if (data.success) {
        if (typeof window !== 'undefined') {
          // 로그인 페이지에서 업로드한 사진이 있으면 서버에 저장
          const pendingPhoto = profilePhoto || localStorage.getItem('pending_profile_photo');
          if (pendingPhoto && data.user) {
            try {
              const saveRes = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user: { ...data.user, photoUrl: pendingPhoto }
                }),
              });
              const saveData = await saveRes.json();
              if (saveData.success) {
                data.user.photoUrl = pendingPhoto;
              }
              localStorage.removeItem('pending_profile_photo');
            } catch (e) {
            }
          }

          // 세션 저장 (여러 키로 호환성 유지)
          localStorage.setItem('user_session', JSON.stringify(data.user));
          localStorage.setItem('USER', JSON.stringify(data.user));
          localStorage.setItem('fmea-user', JSON.stringify(data.user));

          // 프로필 사진 저장
          if (data.user.photoUrl) {
            localStorage.setItem('fmea_user_photo', data.user.photoUrl);
          }
        }
        router.push('/');
      } else {
        setError(data.error || '로그인 실패');
      }
    } catch (error: any) {
      setError('로그인 중 오류가 발생했습니다.');
      console.error('[로그인] 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 비밀번호 재설정 이메일 발송
  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setResetResult({ success: false, message: '이메일을 입력해주세요.' });
      return;
    }

    setResetLoading(true);
    setResetResult(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();
      setResetResult({
        success: data.success,
        message: data.message || '처리 완료'
      });
    } catch (error: any) {
      setResetResult({ success: false, message: '오류가 발생했습니다.' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* 프로필 사진 업로드 영역 */}
        <div className="flex flex-col items-center mb-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform overflow-hidden border-4 border-white"
            title="클릭하여 프로필 사진 등록"
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt="프로필" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <span className="text-3xl">📷</span>
                <p className="text-white text-[8px] mt-1">사진 등록</p>
              </div>
            )}
          </div>
          {profilePhoto && (
            <button
              type="button"
              onClick={() => { setProfilePhoto(null); localStorage.removeItem('pending_profile_photo'); }}
              className="mt-2 text-xs text-red-500 hover:underline"
            >
              사진 제거
            </button>
          )}
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">로그인</h1>
          <p className="text-gray-600 text-sm">FMEA Smart System에 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          <div>
            <label htmlFor="login-id" className="block text-sm font-medium text-gray-700 mb-2">
              이메일 / ID
            </label>
            <input
              id="login-id"
              name={`login_id_${Date.now()}`}
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <div className="relative">
              <input
                id="login-password"
                name={`login_pwd_${Date.now()}`}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">초기 비밀번호는 핸드폰번호입니다.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setShowResetModal(true); setResetResult(null); setResetEmail(''); }}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            🔑 비밀번호를 잊으셨나요?
          </button>
        </div>

        {/* 링크 */}
        <div className="mt-4 flex justify-between text-sm">
          <Link href="/auth/change-password" className="text-gray-500 hover:text-gray-700">
            비밀번호 변경
          </Link>
          <Link href="/auth/register" className="text-blue-600 hover:underline font-medium">
            회원가입
          </Link>
        </div>
      </div>

      {/* 비밀번호 재설정 모달 */}
      {showResetModal && (
        <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
          style={{ left: resetPos.x, top: resetPos.y, width: resetSize.w, height: resetSize.h }}>
          <div className="bg-gray-700 text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move" onMouseDown={resetDragStart}>
            <h2 className="text-lg font-bold">🔐 비밀번호 찾기</h2>
            <button onClick={() => setShowResetModal(false)} className="text-white/70 hover:text-white text-xl">✕</button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <p className="text-sm text-gray-600 mb-4">
              이메일을 입력하시면 비밀번호 재설정 링크를 발송해드립니다.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="등록된 이메일 주소 입력"
                />
              </div>

              {resetResult && (
                <div className={`p-3 rounded-lg text-sm ${resetResult.success
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                  {resetResult.success ? '✅ ' : '❌ '}{resetResult.message}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {resetLoading ? '발송 중...' : '📧 이메일 발송'}
              </button>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={resetResizeStart} title="크기 조절">
            <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
              <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
