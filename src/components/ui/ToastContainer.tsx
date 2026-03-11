/**
 * @file ToastContainer.tsx
 * @description 전역 토스트 렌더링 컨테이너
 * 
 * ★ 루트 layout.tsx에 1회만 배치
 * <ToastContainer /> 
 * 
 * @version 1.0.0
 * @created 2026-02-10
 */

'use client';

import React, { useEffect } from 'react';
import { useToastStore, type ToastItem } from '@/hooks/useToast';
import { toast } from '@/hooks/useToast';

const ICON: Record<ToastItem['type'], string> = {
    success: '✅',
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
};

const BG_COLOR: Record<ToastItem['type'], string> = {
    success: '#059669',
    error: '#dc2626',
    warn: '#d97706',
    info: '#2563eb',
};

export default function ToastContainer() {
    const { items, dismiss } = useToastStore();

    // 글로벌 미처리 Promise 거부 핸들러 — 화면에 토스트로 알림
    useEffect(() => {
        const handler = (event: PromiseRejectionEvent) => {
            console.error('[Unhandled Rejection]', event.reason);
            const msg = event.reason instanceof Error
                ? event.reason.message
                : String(event.reason || '알 수 없는 오류');
            toast.error(`처리되지 않은 오류: ${msg.slice(0, 100)}`);
        };
        window.addEventListener('unhandledrejection', handler);
        return () => window.removeEventListener('unhandledrejection', handler);
    }, []);

    if (items.length === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 16,
                right: 16,
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                pointerEvents: 'none',
            }}
        >
            {items.map(item => (
                <div
                    key={item.id}
                    onClick={() => dismiss(item.id)}
                    style={{
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        borderRadius: 8,
                        backgroundColor: BG_COLOR[item.type],
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: 'Malgun Gothic, sans-serif',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        animation: 'toast-slide-in 0.25s ease-out',
                        maxWidth: 400,
                        wordBreak: 'keep-all' as const,
                    }}
                >
                    <span style={{ fontSize: 16 }}>{ICON[item.type]}</span>
                    <span>{item.message}</span>
                </div>
            ))}
            <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
        </div>
    );
}
