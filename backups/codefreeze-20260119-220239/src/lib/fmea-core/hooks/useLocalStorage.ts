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
      console.warn(`[useLocalStorage] Failed to load key "${key}":`, error);
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
      console.warn(`[useLocalStorage] Failed to save key "${key}":`, error);
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
      console.warn(`[useLocalStorage] Failed to remove key "${key}":`, error);
    }
  }, [key, defaultValue]);

  return [storedValue, setValue, removeValue];
};



