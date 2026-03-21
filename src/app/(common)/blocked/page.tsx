'use client';

import { useEffect, useState } from 'react';

export default function BlockedPage() {
  const [info, setInfo] = useState<{ company?: string; expire?: string; error?: string } | null>(null);

  useEffect(() => {
    fetch('/api/license')
      .then(r => r.json())
      .then(setInfo)
      .catch(() => setInfo({ error: '라이선스 확인 불가' }));
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5', fontFamily: "'맑은 고딕', sans-serif" }}>
      <div style={{ background: 'white', borderRadius: 12, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 22, fontWeight: 'bold', color: '#dc2626', marginBottom: 12 }}>
          라이선스 만료
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.8, marginBottom: 24 }}>
          소프트웨어 사용 기간이 만료되었습니다.<br />
          라이선스 갱신이 필요합니다.
        </p>
        {info && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#991b1b', textAlign: 'left', marginBottom: 24 }}>
            {info.company && <div>회사: <strong>{info.company}</strong></div>}
            {info.expire && <div>만료일: <strong>{info.expire}</strong></div>}
            {info.error && <div>상태: {info.error}</div>}
          </div>
        )}
        <p style={{ fontSize: 13, color: '#9ca3af' }}>
          문의: AMP컨설팅<br />
          amp@ampbiz.co.kr
        </p>
      </div>
    </div>
  );
}
