/**
 * @file useConfirmDialog.tsx
 * @description window.confirm() 대체 — React 기반 확인 다이얼로그 훅
 * 
 * ★ 근본 대책: window.confirm() 금지 → useConfirmDialog 사용
 * - Promise 기반으로 기존 if (!confirm(...)) return 패턴 유지 가능
 * - 브라우저 팝업 차단 영향 없음
 * 
 * @usage
 * const { confirmDialog, ConfirmDialogUI } = useConfirmDialog();
 * const ok = await confirmDialog({ title: '삭제', message: '삭제하시겠습니까?', variant: 'danger' });
 * if (!ok) return;
 * // ... 실행
 * return <><ConfirmDialogUI />{...}</>;
 * 
 * @version 1.0.0
 * @created 2026-02-10
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';

export interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger' | 'warn';
}

interface DialogState {
    open: boolean;
    options: ConfirmOptions;
}

const VARIANT_COLORS = {
    default: { bg: '#2563eb', hover: '#1d4ed8' },
    danger: { bg: '#dc2626', hover: '#b91c1c' },
    warn: { bg: '#d97706', hover: '#b45309' },
};

export function useConfirmDialog() {
    const [state, setState] = useState<DialogState>({
        open: false,
        options: { message: '' },
    });

    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirmDialog = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
            setState({ open: true, options });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setState({ open: false, options: { message: '' } });
        resolveRef.current?.(true);
        resolveRef.current = null;
    }, []);

    const handleCancel = useCallback(() => {
        setState({ open: false, options: { message: '' } });
        resolveRef.current?.(false);
        resolveRef.current = null;
    }, []);

    const ConfirmDialogUI = useCallback(() => {
        if (!state.open) return null;

        const { title, message, confirmText = '확인', cancelText = '취소', variant = 'default' } = state.options;
        const colors = VARIANT_COLORS[variant];

        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99998,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    animation: 'confirm-fade-in 0.15s ease-out',
                }}
                onClick={handleCancel}
            >
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 12,
                        padding: '24px 28px',
                        minWidth: 340,
                        maxWidth: 440,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                        fontFamily: 'Malgun Gothic, sans-serif',
                        animation: 'confirm-zoom-in 0.15s ease-out',
                    }}
                >
                    {title && (
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
                            {variant === 'danger' && '🗑️ '}{variant === 'warn' && '⚠️ '}{title}
                        </div>
                    )}
                    <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: 20 }}>
                        {message}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                            onClick={handleCancel}
                            style={{
                                padding: '8px 20px',
                                fontSize: 13,
                                fontWeight: 600,
                                borderRadius: 6,
                                border: '1px solid #d1d5db',
                                backgroundColor: '#f9fafb',
                                color: '#374151',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            style={{
                                padding: '8px 20px',
                                fontSize: 13,
                                fontWeight: 600,
                                borderRadius: 6,
                                border: 'none',
                                backgroundColor: colors.bg,
                                color: 'white',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.hover)}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.bg)}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
                <style>{`
          @keyframes confirm-fade-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes confirm-zoom-in {
            from { opacity: 0; transform: scale(0.95); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>
            </div>
        );
    }, [state, handleConfirm, handleCancel]);

    return { confirmDialog, ConfirmDialogUI };
}
