// @ts-nocheck
/**
 * @file db-storage.ts
 * @description PostgreSQL DB 저장/로드 함수
 * 
 * ★★★ 근본적인 해결책: 레거시 데이터 = Single Source of Truth ★★★
 * - 저장 시: 원자성 DB + 레거시 데이터 JSON 동시 저장
 * - 로드 시: API가 레거시 데이터 우선 반환 (역변환 없음!)
 * - 이를 통해 원자성 DB ↔ 레거시 변환 과정에서의 데이터 손실 문제 해결
 * 
 * DB 저장 실패 시 localStorage로 폴백
 */

import type { FMEAWorksheetDB } from './schema';

/**
 * PostgreSQL DB에 원자성 DB 저장 (레거시 데이터 포함, 폴백 포함)
 * 
 * @param db - 원자성 DB 데이터
 * @param legacyData - 레거시 WorksheetState 데이터 (Single Source of Truth)
 */
export async function saveWorksheetDB(db: FMEAWorksheetDB, legacyData?: any): Promise<void> {
  try {
    // ★★★ 레거시 데이터도 함께 전송 (Single Source of Truth) ★★★
    const requestBody = {
      ...db,
      legacyData: legacyData || null,
    };
    
    // 📊 전송 전 데이터 확인 로그
    console.log('[DB 저장] 📊 전송할 데이터:', {
      fmeaId: db.fmeaId,
      hasL1Structure: !!db.l1Structure,
      l1StructureName: db.l1Structure?.name,
      l2StructuresCount: db.l2Structures?.length || 0,
      l3StructuresCount: db.l3Structures?.length || 0,
      l1FunctionsCount: db.l1Functions?.length || 0,
      l2FunctionsCount: db.l2Functions?.length || 0,
      l3FunctionsCount: db.l3Functions?.length || 0,
      // ★★★ 리스크분석 관련 로그 추가 ★★★
      riskAnalysesCount: db.riskAnalyses?.length || 0,
      failureLinksCount: db.failureLinks?.length || 0,
      hasLegacyData: !!legacyData,
      legacyL1Name: legacyData?.l1?.name,
      legacyL2Count: legacyData?.l2?.length || 0,
      legacyRiskDataCount: Object.keys(legacyData?.riskData || {}).length,
      legacyRiskDataKeys: Object.keys(legacyData?.riskData || {}).slice(0, 5),
    });
    
    const response = await fetch('/api/fmea', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    
    // ✅ 응답이 fallback 플래그를 포함하면 localStorage로 폴백
    if (!response.ok || result.fallback || !result.success) {
      const errorMsg = result.message || result.error || 'API 오류';
      console.warn('[DB 저장] DB 저장 실패:', errorMsg);
      // ✅ 에러를 throw하지 않고 localStorage로 폴백
      if (typeof window !== 'undefined') {
        const key = `dfmea_atomic_${db.fmeaId}`;
        localStorage.setItem(key, JSON.stringify(db));
        console.warn('[DB 저장] localStorage로 폴백 저장 완료');
      }
      return; // 에러 throw 대신 조기 리턴
    }

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
    console.error('[DB 저장] 네트워크/기타 오류:', error.message || error);
    
    // ✅ DB 저장 실패 시 localStorage로 폴백 (에러 throw 안 함)
    if (typeof window !== 'undefined') {
      try {
        const key = `dfmea_atomic_${db.fmeaId}`;
        localStorage.setItem(key, JSON.stringify(db));
        console.warn('[DB 저장] DB 저장 실패, localStorage로 폴백 저장 완료');
      } catch (e) {
        console.error('[DB 저장] localStorage 폴백도 실패:', e);
        // ✅ 에러 throw 제거 - 사용자 작업 방해 방지
      }
    }
    // ✅ 에러 throw 제거 - localStorage에 저장되었으므로 사용자가 작업 계속 가능
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

/**
 * PostgreSQL DB에서 원자성(Atomic) 데이터를 강제로 로드
 * - 레거시 DB가 있어도 무조건 원자성 DB를 반환
 * - 복구/검증용
 */
export async function loadWorksheetDBAtomic(fmeaId: string): Promise<FMEAWorksheetDB | null> {
  try {
    const response = await fetch(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}&format=atomic`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to load atomic FMEA data');
    }
    const db = await response.json();
    if (!db) return null;
    console.log('[DB 로드] 원자성 DB(강제) 로드 완료:', fmeaId);
    return db as FMEAWorksheetDB;
  } catch (error: any) {
    console.error('[DB 로드] 원자성(강제) 로드 오류:', error);
    return null;
  }
}

