/**
 * atomicDB 편집 헬퍼 함수
 * immutable 업데이트 — 원본 불변, 새 객체 반환
 */
'use client';

import { FMEAWorksheetDB } from '../schema';
import { normalize4M } from '../tabs/all/hooks/preventionKeywordMap';

type M4Type = 'MN' | 'MC' | 'IM' | 'EN' | '';

// ── L2 Structure (공정) ──

/** L2 추가 */
export function addL2Structure(db: FMEAWorksheetDB, newL2: { id: string; no: string; name: string; order: number }): FMEAWorksheetDB {
  return {
    ...db,
    l2Structures: [...db.l2Structures, {
      ...newL2, fmeaId: db.fmeaId, l1Id: db.l1Structure?.id || '',
    } as any],
  };
}

/** L2 수정 */
export function updateL2Structure(db: FMEAWorksheetDB, id: string, updates: Partial<{ no: string; name: string; order: number }>): FMEAWorksheetDB {
  return { ...db, l2Structures: db.l2Structures.map(l2 => l2.id === id ? { ...l2, ...updates } : l2) };
}

/** L2 삭제 (+ 하위 cascade) */
export function deleteL2Structure(db: FMEAWorksheetDB, id: string): FMEAWorksheetDB {
  const l3Ids = new Set(db.l3Structures.filter(l3 => l3.l2Id === id).map(l3 => l3.id));
  return {
    ...db,
    l2Structures: db.l2Structures.filter(l2 => l2.id !== id),
    l3Structures: db.l3Structures.filter(l3 => l3.l2Id !== id),
    l2Functions: db.l2Functions.filter(f => (f as any).l2StructId !== id),
    l3Functions: db.l3Functions.filter(f => !l3Ids.has((f as any).l3StructId)),
    failureModes: db.failureModes.filter(fm => (fm as any).l2StructId !== id),
    failureCauses: db.failureCauses.filter(fc => !l3Ids.has((fc as any).l3StructId)),
  };
}

/** 빈 L2 일괄 제거 (no와 name 모두 빈값) */
export function removeEmptyL2Structures(db: FMEAWorksheetDB): FMEAWorksheetDB {
  const emptyIds = db.l2Structures
    .filter(l2 => !l2.no?.trim() && !l2.name?.trim())
    .map(l2 => l2.id);
  let result = db;
  for (const id of emptyIds) {
    result = deleteL2Structure(result, id);
  }
  return result;
}

// ── L3 Structure (작업요소) ──

/** L3 추가 */
export function addL3Structure(db: FMEAWorksheetDB, l2Id: string, newL3: { id: string; name: string; m4: string; order: number }): FMEAWorksheetDB {
  return {
    ...db,
    l3Structures: [...db.l3Structures, {
      id: newL3.id, fmeaId: db.fmeaId, l1Id: db.l1Structure?.id || '', l2Id,
      m4: normalize4M(newL3.m4), name: newL3.name, order: newL3.order,
    }],
  };
}

/** L3 수정 */
export function updateL3Structure(db: FMEAWorksheetDB, id: string, updates: Partial<{ name: string; m4: string; order: number }>): FMEAWorksheetDB {
  return { ...db, l3Structures: db.l3Structures.map(l3 => {
    if (l3.id !== id) return l3;
    return {
      ...l3,
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.order !== undefined && { order: updates.order }),
      ...(updates.m4 !== undefined && { m4: normalize4M(updates.m4) }),
    };
  }) };
}

/** L3 삭제 (+ 하위 cascade) */
export function deleteL3Structure(db: FMEAWorksheetDB, id: string): FMEAWorksheetDB {
  return {
    ...db,
    l3Structures: db.l3Structures.filter(l3 => l3.id !== id),
    l3Functions: db.l3Functions.filter(f => (f as any).l3StructId !== id),
    failureCauses: db.failureCauses.filter(fc => (fc as any).l3StructId !== id),
  };
}

/** 특정 L2의 L3 일괄 교체 */
export function replaceL3Structures(db: FMEAWorksheetDB, l2Id: string, newL3s: Array<{ id: string; name: string; m4: string; order: number }>): FMEAWorksheetDB {
  const oldL3Ids = new Set(db.l3Structures.filter(l3 => l3.l2Id === l2Id).map(l3 => l3.id));
  const kept = db.l3Structures.filter(l3 => l3.l2Id !== l2Id);
  const added = newL3s.map(l3 => ({
    id: l3.id, name: l3.name, order: l3.order,
    m4: normalize4M(l3.m4),
    fmeaId: db.fmeaId, l1Id: db.l1Structure?.id || '', l2Id,
  } as any));
  const newL3Ids = new Set(newL3s.map(l3 => l3.id));
  const removedL3Ids = new Set([...oldL3Ids].filter(id => !newL3Ids.has(id)));
  return {
    ...db,
    l3Structures: [...kept, ...added],
    l3Functions: db.l3Functions.filter(f => !removedL3Ids.has((f as any).l3StructId)),
    failureCauses: db.failureCauses.filter(fc => !removedL3Ids.has((fc as any).l3StructId)),
  };
}
