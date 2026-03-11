/**
 * @file useToast.ts
 * @description window.alert() 대체 — 전역 토스트 알림 시스템
 * 
 * ★ 근본 대책: window.alert() 금지 → toast.success/error/warn 사용
 * - Provider 불필요 — 전역 이벤트 기반
 * - import { toast } from '@/hooks/useToast' 만으로 사용 가능
 * 
 * @version 1.0.0
 * @created 2026-02-10
 */

export interface ToastItem {
    id: string;
    type: 'success' | 'error' | 'warn' | 'info';
    message: string;
    duration: number;
}

type ToastListener = (items: ToastItem[]) => void;

// 전역 상태 (싱글톤)
let toastItems: ToastItem[] = [];
let listeners: ToastListener[] = [];
let counter = 0;

function notify() {
    listeners.forEach(fn => fn([...toastItems]));
}

function addToast(type: ToastItem['type'], message: string, duration = 3000) {
    const id = `toast-${++counter}-${Date.now()}`;
    toastItems = [...toastItems, { id, type, message, duration }];
    notify();

    // 자동 제거
    setTimeout(() => {
        removeToast(id);
    }, duration);
}

function removeToast(id: string) {
    toastItems = toastItems.filter(t => t.id !== id);
    notify();
}

/** 전역 토스트 API — import { toast } from '@/hooks/useToast' */
export const toast = {
    success: (message: string, duration?: number) => addToast('success', message, duration),
    error: (message: string, duration?: number) => addToast('error', message, duration ?? 5000),
    warn: (message: string, duration?: number) => addToast('warn', message, duration),
    info: (message: string, duration?: number) => addToast('info', message, duration),
    dismiss: (id: string) => removeToast(id),
};

/** React 훅 — ToastContainer 내부에서 사용 */
export function useToastStore() {
    const [items, setItems] = useState<ToastItem[]>([]);

    useEffect(() => {
        listeners.push(setItems);
        return () => {
            listeners = listeners.filter(fn => fn !== setItems);
        };
    }, []);

    return { items, dismiss: removeToast };
}

// React imports (훅에서만 사용)
import { useState, useEffect } from 'react';
