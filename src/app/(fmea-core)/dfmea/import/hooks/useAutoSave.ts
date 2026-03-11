/**
 * @file useAutoSave.ts
 * @description 자동 저장 및 백업 훅
 * @created 2026-01-18
 */

// CODEFREEZE: DB Only 정책 적용 완료 (2026-02-16) - localStorage dfmea_master_data 폴백 제거
import { useEffect, useRef, useCallback } from 'react';
import { ImportedFlatData } from '../types';

// 백업 최대 개수
const MAX_BACKUPS = 5;
const BACKUP_KEY_PREFIX = 'dfmea_backup_';
const BACKUP_INDEX_KEY = 'dfmea_backup_index';

export interface UseAutoSaveProps {
  flatData: ImportedFlatData[];
  isLoaded: boolean;
  debounceMs?: number; // 자동 저장 디바운스 시간 (기본: 3000ms)
  onAutoSave?: () => void; // 자동 저장 후 콜백
}

export interface BackupInfo {
  key: string;
  timestamp: string;
  count: number;
  label: string;
}

export function useAutoSave(props: UseAutoSaveProps) {
  const { flatData, isLoaded, debounceMs = 3000, onAutoSave } = props;
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  /**
   * ★★★ 2026-02-16: localStorage 자동 저장 제거 (DB Only 정책) ★★★
   * DB 저장은 usePreviewHandlers/useRelationHandlers에서 처리
   */
  const autoSaveToLocalStorage = useCallback(() => {
    // DB Only 정책: localStorage 자동 저장 비활성화
    // 함수 시그니처 유지 (호출부 호환)
  }, []);

  /**
   * 백업 생성 (수동 호출)
   */
  const createBackup = useCallback((label?: string) => {
    if (flatData.length === 0) {
      return null;
    }

    const validData = flatData.filter((d) => d.value && d.value.trim() !== '');
    const timestamp = new Date().toISOString();
    const backupKey = `${BACKUP_KEY_PREFIX}${Date.now()}`;

    try {
      // 현재 백업 인덱스 가져오기
      const indexStr = localStorage.getItem(BACKUP_INDEX_KEY);
      const backupIndex: string[] = indexStr ? JSON.parse(indexStr) : [];

      // 최대 개수 초과 시 가장 오래된 백업 삭제
      while (backupIndex.length >= MAX_BACKUPS) {
        const oldestKey = backupIndex.shift();
        if (oldestKey) {
          localStorage.removeItem(oldestKey);
          localStorage.removeItem(`${oldestKey}_meta`);
        }
      }

      // 새 백업 저장
      localStorage.setItem(backupKey, JSON.stringify(validData));
      localStorage.setItem(`${backupKey}_meta`, JSON.stringify({
        timestamp,
        count: validData.length,
        label: label || `백업 ${new Date(timestamp).toLocaleString('ko-KR')}`,
      }));

      // 인덱스 업데이트
      backupIndex.push(backupKey);
      localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(backupIndex));

      return backupKey;
    } catch (error) {
      console.error('백업 생성 오류:', error);
      return null;
    }
  }, [flatData]);

  /**
   * 백업 목록 조회
   */
  const getBackupList = useCallback((): BackupInfo[] => {
    try {
      const indexStr = localStorage.getItem(BACKUP_INDEX_KEY);
      const backupIndex: string[] = indexStr ? JSON.parse(indexStr) : [];

      return backupIndex
        .map((key) => {
          const metaStr = localStorage.getItem(`${key}_meta`);
          if (!metaStr) return null;
          const meta = JSON.parse(metaStr);
          return {
            key,
            timestamp: meta.timestamp,
            count: meta.count,
            label: meta.label,
          };
        })
        .filter((b): b is BackupInfo => b !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('백업 목록 조회 오류:', error);
      return [];
    }
  }, []);

  /**
   * 백업 복원
   */
  const restoreBackup = useCallback((backupKey: string): ImportedFlatData[] | null => {
    try {
      const dataStr = localStorage.getItem(backupKey);
      if (!dataStr) {
        console.error('백업 데이터를 찾을 수 없습니다:', backupKey);
        return null;
      }

      const data = JSON.parse(dataStr);
      if (!Array.isArray(data)) {
        console.error('백업 데이터 형식 오류:', backupKey);
        return null;
      }

      // Date 객체 복원
      const restored = data.map((d: any) => ({
        ...d,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
      }));

      return restored;
    } catch (error) {
      console.error('백업 복원 오류:', error);
      return null;
    }
  }, []);

  /**
   * 백업 삭제
   */
  const deleteBackup = useCallback((backupKey: string) => {
    try {
      const indexStr = localStorage.getItem(BACKUP_INDEX_KEY);
      const backupIndex: string[] = indexStr ? JSON.parse(indexStr) : [];

      const newIndex = backupIndex.filter((k) => k !== backupKey);
      localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(newIndex));
      localStorage.removeItem(backupKey);
      localStorage.removeItem(`${backupKey}_meta`);

    } catch (error) {
      console.error('백업 삭제 오류:', error);
    }
  }, []);

  /**
   * 모든 백업 삭제
   */
  const clearAllBackups = useCallback(() => {
    try {
      const indexStr = localStorage.getItem(BACKUP_INDEX_KEY);
      const backupIndex: string[] = indexStr ? JSON.parse(indexStr) : [];

      backupIndex.forEach((key) => {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_meta`);
      });
      localStorage.removeItem(BACKUP_INDEX_KEY);

    } catch (error) {
      console.error('백업 전체 삭제 오류:', error);
    }
  }, []);

  // 데이터 변경 시 자동 저장 (디바운싱)
  useEffect(() => {
    if (!isLoaded) return;

    // 기존 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 새 타이머 설정
    debounceTimerRef.current = setTimeout(() => {
      autoSaveToLocalStorage();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [flatData, isLoaded, debounceMs, autoSaveToLocalStorage]);

  // 페이지 언로드 시 즉시 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      autoSaveToLocalStorage();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [autoSaveToLocalStorage]);

  return {
    createBackup,
    getBackupList,
    restoreBackup,
    deleteBackup,
    clearAllBackups,
    autoSaveToLocalStorage,
  };
}
