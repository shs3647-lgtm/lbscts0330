/**
 * @file db-storage.ts
 * @description PostgreSQL DB 저장/로드 함수
 * 
 * localStorage 대신 PostgreSQL DB를 사용하는 저장/로드 함수
 * DB 저장 실패 시 localStorage로 폴백
 */

import type { FMEAWorksheetDB } from './schema';

/**
 * PostgreSQL DB에 원자성 DB 저장 (폴백 포함)
 */
export async function saveWorksheetDB(db: FMEAWorksheetDB): Promise<void> {
  try {
    const response = await fetch('/api/fmea', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(db),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save FMEA data');
    }

    const result = await response.json();
    console.log('[DB 저장] 원자성 DB 저장 완료:', result.fmeaId);
    
    // ✅ DB 저장 성공 시 localStorage에도 백업 저장 (폴백용)
    if (typeof window !== 'undefined') {
      try {
        const key = `dfmea_atomic_${db.fmeaId}`;
        localStorage.setItem(key, JSON.stringify(db));
        console.log('[DB 저장] localStorage 백업 완료');
      } catch (e) {
        console.warn('[DB 저장] localStorage 백업 실패 (무시):', e);
      }
    }
  } catch (error: any) {
    console.error('[DB 저장] 오류:', error);
    
    // ✅ DB 저장 실패 시 localStorage로 폴백
    if (typeof window !== 'undefined') {
      try {
        const key = `dfmea_atomic_${db.fmeaId}`;
        localStorage.setItem(key, JSON.stringify(db));
        console.warn('[DB 저장] DB 저장 실패, localStorage로 폴백 저장');
      } catch (e) {
        console.error('[DB 저장] localStorage 폴백도 실패:', e);
        throw error; // 둘 다 실패하면 원래 에러 throw
      }
    } else {
      throw error;
    }
  }
}

/**
 * PostgreSQL DB에서 데이터 로드 (폴백 포함)
 */
export async function loadWorksheetDB(fmeaId: string): Promise<FMEAWorksheetDB | null> {
  try {
    const response = await fetch(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);

    if (!response.ok) {
      if (response.status === 404) {
        // ✅ DB에 데이터 없으면 localStorage에서 로드 시도
        if (typeof window !== 'undefined') {
          const key = `dfmea_atomic_${fmeaId}`;
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const db = JSON.parse(stored) as FMEAWorksheetDB;
              console.log('[DB 로드] DB에 데이터 없음, localStorage에서 로드:', fmeaId);
              return db;
            } catch (e) {
              console.warn('[DB 로드] localStorage 파싱 실패:', e);
            }
          }
        }
        return null; // 데이터 없음
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to load FMEA data');
    }

    const db = await response.json();
    if (!db) {
      // ✅ DB에서 null이면 localStorage에서 로드 시도
      if (typeof window !== 'undefined') {
        const key = `dfmea_atomic_${fmeaId}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const localDB = JSON.parse(stored) as FMEAWorksheetDB;
            console.log('[DB 로드] DB가 null, localStorage에서 로드:', fmeaId);
            return localDB;
          } catch (e) {
            console.warn('[DB 로드] localStorage 파싱 실패:', e);
          }
        }
      }
      return null;
    }

    console.log('[DB 로드] 원자성 DB 로드 완료:', fmeaId);
    return db as FMEAWorksheetDB;
  } catch (error: any) {
    console.error('[DB 로드] 오류:', error);
    
    // ✅ DB 로드 실패 시 localStorage에서 로드 시도
    if (typeof window !== 'undefined') {
      try {
        const key = `dfmea_atomic_${fmeaId}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const db = JSON.parse(stored) as FMEAWorksheetDB;
          console.warn('[DB 로드] DB 로드 실패, localStorage에서 폴백 로드:', fmeaId);
          return db;
        }
      } catch (e) {
        console.error('[DB 로드] localStorage 폴백도 실패:', e);
      }
    }
    
    // 둘 다 실패하면 null 반환 (빈 DB로 초기화)
    return null;
  }
}


