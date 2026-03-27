/**
 * 워크시트 저장 — 직접 호출 방식
 *
 * 기존 이벤트/debounce/ref 제거. 데이터를 인자로 직접 전달해서 저장.
 * emitSave(db) → 즉시 POST /api/fmea
 */
'use client';

import { useEffect, useRef } from 'react';
import type { FMEAWorksheetDB } from '../schema';
import { saveAtomicDB as saveAtomicDBDirect } from './atomicDbSaver';

/** atomicDB를 직접 DB에 저장 */
export async function saveNow(db: FMEAWorksheetDB): Promise<boolean> {
  if (!db || !db.fmeaId) return false;
  try {
    const result = await saveAtomicDBDirect({ ...db, forceOverwrite: true } as any, false);
    return result.success;
  } catch (e) {
    console.error('[saveNow] 저장 오류:', e);
    return false;
  }
}

const SAVE_EVENT = 'worksheet-save';
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** 셀 편집 등 atomicDB를 직접 전달 못 하는 곳에서 사용 */
export function emitSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    window.dispatchEvent(new CustomEvent(SAVE_EVENT));
  }, 300);
}

/** page.tsx에서 1회 등록. emitSave → useWorksheetSave.save(true) 호출 */
export function useSaveListener(
  saveAtomicDB?: (force?: boolean) => Promise<void>,
) {
  const ref = useRef(saveAtomicDB);
  ref.current = saveAtomicDB;

  useEffect(() => {
    const handler = async () => {
      try { if (ref.current) await ref.current(true); } catch (e) { console.error('[emitSave] 오류:', e); }
    };
    window.addEventListener(SAVE_EVENT, handler);
    return () => {
      window.removeEventListener(SAVE_EVENT, handler);
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    };
  }, []);
}
