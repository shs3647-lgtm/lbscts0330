/**
 * @file CompanyLogo.tsx
 * @description 회사 로고 컴포넌트 - 클릭 시 웰컴보드 이동, 더블클릭 시 로고 변경
 * @author AI Assistant
 * @created 2025-12-26
 * @version 2.0.0
 * 
 * 기능:
 * - 기본 로고 표시 (/logo.png)
 * - 단일 클릭: 웰컴보드(/) 화면으로 이동
 * - 더블 클릭: 파일 선택 다이얼로그 (로고 변경)
 * - 선택한 이미지를 LocalStorage에 저장
 * - 새로고침 시에도 저장된 로고 유지
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CompanyLogoProps {
  /** 로고 너비 (기본: 120px) */
  width?: number;
  /** 로고 높이 (기본: 40px) */
  height?: number;
  /** 추가 CSS 클래스 */
  className?: string;
}

// LocalStorage 키
const LOGO_STORAGE_KEY = 'fmea_company_logo';

/**
 * 회사 로고 컴포넌트
 * 
 * @description
 * 클릭 시 새 로고를 업로드할 수 있습니다.
 * 업로드된 로고는 LocalStorage에 Base64로 저장됩니다.
 */
export function CompanyLogo({ 
  width = 120, 
  height = 40, 
  className = '' 
}: CompanyLogoProps) {
  const router = useRouter();
  
  // 현재 로고 URL (Base64 또는 기본 경로)
  const [logoSrc, setLogoSrc] = useState<string>('/logo.png');
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);
  // 파일 입력 참조
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 클릭 타이머 (단일/더블 클릭 구분)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 컴포넌트 마운트 시 저장된 로고 불러오기
   */
  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem(LOGO_STORAGE_KEY);
      if (savedLogo) {
        setLogoSrc(savedLogo);
      }
    } catch (error) {
      console.warn('로고 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 로고 단일 클릭 핸들러 - 웰컴보드로 이동
   */
  const handleLogoClick = useCallback(() => {
    // 더블클릭 대기 시간 내에 클릭이 또 발생하면 취소
    if (clickTimerRef.current) {
      return; // 더블클릭 처리 중이므로 무시
    }
    
    // 250ms 후에 단일 클릭으로 처리
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      router.push('/welcomeboard');
    }, 250);
  }, [router]);

  /**
   * 로고 더블 클릭 핸들러 - 파일 선택 다이얼로그 열기
   */
  const handleLogoDoubleClick = useCallback(() => {
    // 단일 클릭 타이머 취소
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    // 파일 선택 다이얼로그 열기
    fileInputRef.current?.click();
  }, []);

  /**
   * 파일 선택 핸들러
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 제한 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('파일 크기는 2MB 이하여야 합니다.');
      return;
    }

    // FileReader로 Base64 변환
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      
      // LocalStorage에 저장
      try {
        localStorage.setItem(LOGO_STORAGE_KEY, base64);
        setLogoSrc(base64);
        console.log('✅ 로고가 localStorage에 저장되었습니다.');
        
        // 서버에도 저장 (모든 브라우저에서 동일하게 표시)
        const response = await fetch('/api/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logoBase64: base64 }),
        });
        
        if (response.ok) {
          console.log('✅ 로고가 서버에도 저장되었습니다.');
        }
      } catch (error) {
        console.error('로고 저장 실패:', error);
        alert('로고 저장에 실패했습니다. 파일 크기를 줄여주세요.');
      }
    };
    reader.readAsDataURL(file);

    // 입력 초기화 (같은 파일 재선택 가능하도록)
    event.target.value = '';
  };

  /**
   * 로고 초기화 (기본 로고로 복원) - 우클릭 시
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // 커스텀 로고가 있을 때만 우클릭 메뉴 처리
    if (logoSrc.startsWith('data:')) {
      e.preventDefault();
      if (confirm('기본 로고로 복원하시겠습니까?')) {
        try {
          localStorage.removeItem(LOGO_STORAGE_KEY);
          setLogoSrc('/logo.png');
          console.log('✅ 로고가 초기화되었습니다.');
        } catch (error) {
          console.error('로고 초기화 실패:', error);
        }
      }
    }
  }, [logoSrc]);

  if (isLoading) {
    return (
      <div 
        className={`bg-[#1d2a48] rounded animate-pulse ${className}`}
        style={{ width, height }}
      />
    );
  }

  return (
    <div 
      className={`relative cursor-pointer ${className}`}
      onClick={handleLogoClick}
      onDoubleClick={handleLogoDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 로고 이미지 - 연한 파란색 배경, 패딩 최소화 */}
      <div 
        className="relative overflow-hidden rounded-lg border border-[#5ba9ff]/30 bg-[#e0f2fb] shadow-md p-0.5 flex items-center justify-center"
        style={{ width, height }}
      >
        {logoSrc.startsWith('data:') ? (
          // Base64 이미지 (업로드된 로고)
          <img
            src={logoSrc}
            alt="Company Logo"
            className="w-full h-full object-contain"
          />
        ) : (
          // 기본 AMP 로고 (SVG)
          <svg viewBox="0 0 120 40" className="w-full h-full">
            {/* 배경 그라데이션 */}
            <defs>
              <linearGradient id="ampGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF6B35" />
                <stop offset="100%" stopColor="#FF4444" />
              </linearGradient>
            </defs>
            {/* AMP 원형 로고 */}
            <circle cx="20" cy="20" r="14" fill="url(#ampGradient)" />
            <text x="20" y="25" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">A</text>
            {/* AMP 텍스트 */}
            <text x="45" y="26" fill="#1a237e" fontSize="16" fontWeight="bold" fontFamily="Arial, sans-serif">
              AMP
            </text>
            <text x="75" y="26" fill="#5ba9ff" fontSize="10" fontFamily="Arial, sans-serif">
              SYSTEM
            </text>
          </svg>
        )}
      </div>

    </div>
  );
}

export default CompanyLogo;

