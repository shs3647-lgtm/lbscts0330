/**
 * @file global-error.tsx
 * @description 루트 레이아웃 에러 바운더리 — 최종 안전망
 * @created 2026-02-20
 *
 * layout.tsx 자체에서 발생하는 에러를 캐치합니다.
 * html/body 태그를 직접 포함해야 합니다 (layout이 사용 불가하므로).
 */

'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[글로벌 에러 바운더리] 치명적 오류:', error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
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
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚨</div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: 8,
            }}
          >
            시스템 오류가 발생했습니다
          </h2>
          <p
            style={{
              fontSize: 14,
              color: '#64748b',
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            시스템에 심각한 오류가 발생했습니다.
            <br />
            페이지를 새로고침하거나 관리자에게 문의하세요.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '10px 24px',
                backgroundColor: '#dc2626',
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
              onClick={() => window.location.reload()}
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
              새로고침
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
