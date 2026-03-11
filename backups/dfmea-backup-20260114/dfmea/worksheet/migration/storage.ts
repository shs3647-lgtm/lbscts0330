/**
 * @file storage.ts
 * @description 워크시트 DB 저장/로드 함수
 */

import { FMEAWorksheetDB } from '../schema';
import { LEGACY_KEYS } from './types';

/**
 * 워크시트 DB 로드
 */
export function loadWorksheetDB(fmeaId: string): FMEAWorksheetDB | null {
  if (typeof window === 'undefined') return null;
  
  // 1. 새 키 형식 시도
  const newKey = `${LEGACY_KEYS.ATOMIC}${fmeaId}`;
  const newData = localStorage.getItem(newKey);
  if (newData) {
    try {
      const parsed = JSON.parse(newData);
      console.log('[loadWorksheetDB] 원자성 DB 로드 성공:', newKey);
      return parsed as FMEAWorksheetDB;
    } catch (e) {
      console.error('[loadWorksheetDB] 파싱 오류:', e);
    }
  }
  
  // 2. 레거시 키 시도 (PFMEA)
  const legacyKeyPfmea = `${LEGACY_KEYS.PFMEA}${fmeaId}`;
  const legacyDataPfmea = localStorage.getItem(legacyKeyPfmea);
  if (legacyDataPfmea) {
    try {
      const parsed = JSON.parse(legacyDataPfmea);
      // 원자성 DB 형식인지 확인
      if (parsed.l1Structure || parsed.l2Structures) {
        console.log('[loadWorksheetDB] 레거시 키에서 원자성 DB 발견:', legacyKeyPfmea);
        return parsed as FMEAWorksheetDB;
      }
    } catch (e) {
      console.error('[loadWorksheetDB] 레거시 파싱 오류:', e);
    }
  }
  
  // 3. 레거시 키 시도 (DFMEA)
  const legacyKeyDfmea = `${LEGACY_KEYS.DFMEA}${fmeaId}`;
  const legacyDataDfmea = localStorage.getItem(legacyKeyDfmea);
  if (legacyDataDfmea) {
    try {
      const parsed = JSON.parse(legacyDataDfmea);
      if (parsed.l1Structure || parsed.l2Structures) {
        console.log('[loadWorksheetDB] DFMEA 키에서 원자성 DB 발견:', legacyKeyDfmea);
        return parsed as FMEAWorksheetDB;
      }
    } catch (e) {
      console.error('[loadWorksheetDB] DFMEA 파싱 오류:', e);
    }
  }
  
  console.log('[loadWorksheetDB] 원자성 DB 없음, null 반환');
  return null;
}

/**
 * 워크시트 DB 저장
 */
export function saveWorksheetDB(db: FMEAWorksheetDB): void;
export function saveWorksheetDB(fmeaId: string, db: FMEAWorksheetDB): void;
export function saveWorksheetDB(arg1: FMEAWorksheetDB | string, arg2?: FMEAWorksheetDB): void {
  if (typeof window === 'undefined') return;
  
  let fmeaId: string;
  let db: FMEAWorksheetDB;
  
  if (typeof arg1 === 'string') {
    fmeaId = arg1;
    db = arg2!;
  } else {
    db = arg1;
    fmeaId = db.fmeaId;
  }
  
  if (!fmeaId) {
    console.error('[saveWorksheetDB] fmeaId가 없습니다.');
    return;
  }
  
  try {
    // 새 키로 저장
    const newKey = `${LEGACY_KEYS.ATOMIC}${fmeaId}`;
    const dataStr = JSON.stringify({
      ...db,
      lastUpdated: new Date().toISOString(),
    });
    localStorage.setItem(newKey, dataStr);
    
    console.log('[saveWorksheetDB] 저장 완료:', newKey, `(${Math.round(dataStr.length / 1024)}KB)`);
  } catch (e) {
    console.error('[saveWorksheetDB] 저장 오류:', e);
  }
}



