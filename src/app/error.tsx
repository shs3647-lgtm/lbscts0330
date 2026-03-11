/**
 * @file error.tsx
 * @description 전역 에러 바운더리 — 라우트 레벨 렌더링 에러 복구
 * @created 2026-02-20
 *
 * 모든 라우트에서 발생하는 렌더링 에러를 캐치하여
 * 화이트 스크린 대신 복구 가능한 에러 화면을 표시합니다.
 */

'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[에러 바운더리] 렌더링 오류:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f7fa',
        fontFamily: 'Malgun Gothic, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          padding: 40,
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: 8,
          }}
        >
          오류가 발생했습니다
        </h2>
        <p
          style={{
            fontSize: 14,
            color: '#64748b',
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          페이지를 표시하는 중 예기치 않은 오류가 발생했습니다.
          <br />
          아래 버튼을 클릭하여 다시 시도하거나, 문제가 지속되면 관리자에게 문의하세요.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details
            style={{
              marginBottom: 20,
              textAlign: 'left',
              padding: 12,
              backgroundColor: '#fef2f2',
              borderRadius: 8,
              border: '1px solid #fecaca',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#b91c1c',
              }}
            >
              개발 모드 — 에러 상세
            </summary>
            <pre
              style={{
                marginTop: 8,
                fontSize: 11,
                color: '#7f1d1d',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              padding: '10px 24px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
