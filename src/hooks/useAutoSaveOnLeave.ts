/**
 * @file useAutoSaveOnLeave.ts
 * @description 페이지 이탈 시 자동 저장 Hook (beforeunload + visibilitychange)
 * @created 2026-02-02
 * 
 * 사용법:
 * useAutoSaveOnLeave({
 *   onSave: () => { // 저장 로직 },
 *   enabled: true, // 저장 활성화 여부
 *   debounceMs: 0, // 디바운스 (기본: 즉시)
 * });
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOnLeaveOptions {
    /** 저장 함수 (동기 또는 비동기) */
    onSave: () => void | Promise<void>;
    /** 저장 활성화 여부 (기본: true) */
    enabled?: boolean;
    /** 디버그 로그 활성화 (기본: false) */
    debug?: boolean;
    /** 모듈명 (로그용) */
    moduleName?: string;
}

/**
 * 페이지 이탈 시 자동 저장 Hook
 * - beforeunload: 브라우저/탭 닫기
 * - visibilitychange: 탭 전환, 다른 앱으로 이동
 */
export function useAutoSaveOnLeave({
    onSave,
    enabled = true,
    debug = false,
    moduleName = 'Unknown',
}: UseAutoSaveOnLeaveOptions): void {
    const onSaveRef = useRef(onSave);
    const savedRef = useRef(false);

    // onSave 함수가 변경될 때마다 ref 업데이트
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    const handleSave = useCallback(() => {
        if (!enabled || savedRef.current) return;

        try {
            savedRef.current = true;  // 중복 저장 방지
            onSaveRef.current();
            if (debug) {
            }
        } catch (e) {
            console.error('[autoSave] 자동 저장 실패:', e);
        } finally {
            // 300ms 후 다시 저장 가능하도록 (같은 페이지에서 다시 돌아올 수 있으므로)
            setTimeout(() => {
                savedRef.current = false;
            }, 300);
        }
    }, [enabled, debug, moduleName]);

    useEffect(() => {
        if (typeof window === 'undefined' || !enabled) return;

        // beforeunload - 브라우저/탭 닫기
        const handleBeforeUnload = () => {
            handleSave();
        };

        // visibilitychange - 탭 전환, 다른 앱으로 이동
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                handleSave();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled, handleSave]);
}

export default useAutoSaveOnLeave;
