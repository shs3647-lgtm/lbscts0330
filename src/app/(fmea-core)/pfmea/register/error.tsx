'use client';

import { useEffect } from 'react';
import { toast } from '@/hooks/useToast';

export default function ModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[에러 바운더리] 모듈 오류:', error);
    toast.error('화면 표시 중 오류가 발생했습니다. 다시 시도해주세요.');
  }, [error]);

  return (
    <div style={{
      padding: 40,
      textAlign: 'center',
      fontFamily: 'Malgun Gothic, sans-serif',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        화면 로드 중 오류가 발생했습니다
      </h3>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
        일시적인 오류일 수 있습니다. 다시 시도하거나 홈으로 이동하세요.
      </p>
      <div style={{
        marginBottom: 16, textAlign: 'left', padding: 12,
        backgroundColor: '#fef2f2', borderRadius: 8, border: '2px solid #dc2626',
        maxWidth: 800, margin: '0 auto 16px',
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>
          ERROR: {error.name}
        </p>
        <pre style={{ fontSize: 12, color: '#7f1d1d', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6, background: '#fff', padding: 10, borderRadius: 4, border: '1px solid #fca5a5' }}>
{error.message}
        </pre>
        <pre style={{ fontSize: 10, color: '#991b1b', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.4, marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
{error.stack || 'no stack'}
        </pre>
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '8px 20px', backgroundColor: '#2563eb', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '8px 20px', backgroundColor: '#f1f5f9', color: '#475569',
            border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          홈으로 이동
        </button>
      </div>
    </div>
  );
}
