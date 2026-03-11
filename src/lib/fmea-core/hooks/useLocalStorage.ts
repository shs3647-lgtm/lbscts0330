/**
 * @file fmea-core/hooks/useLocalStorage.ts
 * @description localStorage 저장/불러오기 훅
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseLocalStorageOptions<T> {
  key: string;
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

export const useLocalStorage = <T>(
  options: UseLocalStorageOptions<T>
): [T, (value: T | ((prev: T) => T)) => void, () => void] => {
  const {
    key,
    defaultValue,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  const [storedValue, setStoredValue] = useState<T>(defaultValue);

  // 초기 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const item = localStorage.getItem(key);
      if (item) {
        setStoredValue(deserialize(item));
      }
    } catch (error) {
      console.error('[localStorage] 초기 로드 실패:', error);
    }
  }, [key, deserialize]);

  // 값 저장
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, serialize(valueToStore));
      }
    } catch (error) {
      console.error('[localStorage] 값 저장 실패:', error);
    }
  }, [key, serialize, storedValue]);

  // 값 삭제
  const removeValue = useCallback(() => {
    try {
      setStoredValue(defaultValue);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('[localStorage] 값 삭제 실패:', error);
    }
  }, [key, defaultValue]);

  return [storedValue, setValue, removeValue];
};


