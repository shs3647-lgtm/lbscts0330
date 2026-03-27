/**
 * atomicDB 뷰 어댑터
 *
 * atomicDB(flat relational) → 탭 렌더링용 데이터 변환 (read-only, memoized)
 * 편집은 atomicDB를 직접 수정 → 뷰가 자동 재계산
 *
 * 기존 atomicToLegacy 대체 — state(트리) 중간 단계 제거
 */
'use client';

import { useMemo } from 'react';
import { FMEAWorksheetDB } from '../schema';

// ── 뷰 타입 ──

/** 구조분석 탭용 행 */
export interface StructureRow {
  l2Id: string;
  l2No: string;
  l2Name: string;
  l2Order: number;
  l3Id: string;
  l3Name: string;
  l3M4: string;
  l3Order: number;
}

/** 공정 + 작업요소 트리 뷰 */
export interface ProcessView {
  id: string;
  no: string;
  name: string;
  order: number;
  workElements: WorkElementView[];
  functions: L2FunctionView[];
  failureModes: FailureModeView[];
}

export interface WorkElementView {
  id: string;
  name: string;
  m4: string;
  order: number;
  l2Id: string;
  functions: L3FunctionView[];
  failureCauses: FailureCauseView[];
}

export interface L2FunctionView {
  id: string;
  functionName: string;
  productChar: string;
  specialChar: string;
  l2StructId: string;
}

export interface L3FunctionView {
  id: string;
  functionName: string;
  processChar: string;
  specialChar: string;
  l3StructId: string;
}

export interface FailureModeView {
  id: string;
  mode: string;
  specialChar: string;
  l2StructId: string;
}

export interface FailureCauseView {
  id: string;
  cause: string;
  l3StructId: string;
  l2StructId: string;
}

// ── Index 빌더 (FK 기반 조인) ──

function buildIndex<T extends { id: string }>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

// ── 뷰 어댑터 Hook ──

/**
 * atomicDB → 공정/작업요소 트리 뷰
 * StructureTab, FunctionTab 등에서 사용
 */
export function useProcessView(db: FMEAWorksheetDB | null): ProcessView[] {
  return useMemo(() => {
    if (!db) return [];

    // FK 인덱스 구축
    const l3ByL2 = buildIndex(db.l3Structures || [], l3 => l3.l2Id);
    const l2FuncByL2 = buildIndex(db.l2Functions || [], f => (f as any).l2StructId);
    const l3FuncByL3 = buildIndex(db.l3Functions || [], f => (f as any).l3StructId);
    const fmByL2 = buildIndex(db.failureModes || [], fm => (fm as any).l2StructId);
    const fcByL3 = buildIndex(db.failureCauses || [], fc => (fc as any).l3StructId);

    return (db.l2Structures || [])
      .sort((a, b) => a.order - b.order)
      .map(l2 => ({
        id: l2.id,
        no: l2.no,
        name: l2.name,
        order: l2.order,
        workElements: (l3ByL2.get(l2.id) || [])
          .sort((a, b) => a.order - b.order)
          .map(l3 => ({
            id: l3.id,
            name: l3.name,
            m4: l3.m4,
            order: l3.order,
            l2Id: l2.id,
            functions: (l3FuncByL3.get(l3.id) || []).map(f => ({
              id: f.id,
              functionName: (f as any).functionName || '',
              processChar: (f as any).processChar || '',
              specialChar: (f as any).specialChar || '',
              l3StructId: l3.id,
            })),
            failureCauses: (fcByL3.get(l3.id) || []).map(fc => ({
              id: fc.id,
              cause: (fc as any).cause || '',
              l3StructId: l3.id,
              l2StructId: l2.id,
            })),
          })),
        functions: (l2FuncByL2.get(l2.id) || []).map(f => ({
          id: f.id,
          functionName: (f as any).functionName || '',
          productChar: (f as any).productChar || '',
          specialChar: (f as any).specialChar || '',
          l2StructId: l2.id,
        })),
        failureModes: (fmByL2.get(l2.id) || []).map(fm => ({
          id: fm.id,
          mode: (fm as any).mode || '',
          specialChar: (fm as any).specialChar || '',
          l2StructId: l2.id,
        })),
      }));
  }, [db]);
}

/**
 * atomicDB → 구조분석 행 배열 (flat)
 * StructureTab 테이블 렌더링용
 */
export function useStructureRows(db: FMEAWorksheetDB | null): StructureRow[] {
  return useMemo(() => {
    if (!db) return [];

    const l3ByL2 = buildIndex(db.l3Structures || [], l3 => l3.l2Id);
    const rows: StructureRow[] = [];

    const sorted = [...(db.l2Structures || [])].sort((a, b) => a.order - b.order);

    for (const l2 of sorted) {
      const l3s = (l3ByL2.get(l2.id) || []).sort((a, b) => a.order - b.order);
      if (l3s.length === 0) {
        rows.push({
          l2Id: l2.id, l2No: l2.no, l2Name: l2.name, l2Order: l2.order,
          l3Id: '', l3Name: '', l3M4: '', l3Order: 0,
        });
      } else {
        for (const l3 of l3s) {
          rows.push({
            l2Id: l2.id, l2No: l2.no, l2Name: l2.name, l2Order: l2.order,
            l3Id: l3.id, l3Name: l3.name, l3M4: l3.m4, l3Order: l3.order,
          });
        }
      }
    }

    return rows;
  }, [db]);
}

// ── atomicDB 편집 헬퍼 ──

/** L2 Structure 추가 */
export function addL2Structure(db: FMEAWorksheetDB, newL2: { id: string; no: string; name: string; order: number }): FMEAWorksheetDB {
  return {
    ...db,
    l2Structures: [...db.l2Structures, {
      ...newL2,
      fmeaId: db.fmeaId,
      l1Id: db.l1Structure?.id || '',
    } as any],
  };
}

/** L2 Structure 수정 */
export function updateL2Structure(db: FMEAWorksheetDB, id: string, updates: Partial<{ no: string; name: string; order: number }>): FMEAWorksheetDB {
  return {
    ...db,
    l2Structures: db.l2Structures.map(l2 => l2.id === id ? { ...l2, ...updates } : l2),
  };
}

/** L2 Structure 삭제 (+ 하위 L3, L3Function, FailureCause cascade) */
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

/** L3 Structure 추가 */
export function addL3Structure(db: FMEAWorksheetDB, l2Id: string, newL3: { id: string; name: string; m4: string; order: number }): FMEAWorksheetDB {
  return {
    ...db,
    l3Structures: [...db.l3Structures, {
      ...newL3,
      fmeaId: db.fmeaId,
      l1Id: db.l1Structure?.id || '',
      l2Id,
    } as any],
  };
}

/** L3 Structure 수정 */
export function updateL3Structure(db: FMEAWorksheetDB, id: string, updates: Partial<{ name: string; m4: string; order: number }>): FMEAWorksheetDB {
  return {
    ...db,
    l3Structures: db.l3Structures.map(l3 => l3.id === id ? { ...l3, ...updates } : l3),
  };
}

/** L3 Structure 삭제 (+ 하위 L3Function, FailureCause cascade) */
export function deleteL3Structure(db: FMEAWorksheetDB, id: string): FMEAWorksheetDB {
  return {
    ...db,
    l3Structures: db.l3Structures.filter(l3 => l3.id !== id),
    l3Functions: db.l3Functions.filter(f => (f as any).l3StructId !== id),
    failureCauses: db.failureCauses.filter(fc => (fc as any).l3StructId !== id),
  };
}

/** L3 Structures 일괄 교체 (특정 L2의 작업요소 전체 교체) */
export function replaceL3Structures(db: FMEAWorksheetDB, l2Id: string, newL3s: Array<{ id: string; name: string; m4: string; order: number }>): FMEAWorksheetDB {
  const oldL3Ids = new Set(db.l3Structures.filter(l3 => l3.l2Id === l2Id).map(l3 => l3.id));
  const kept = db.l3Structures.filter(l3 => l3.l2Id !== l2Id);
  const added = newL3s.map(l3 => ({
    ...l3,
    fmeaId: db.fmeaId,
    l1Id: db.l1Structure?.id || '',
    l2Id,
  } as any));
  // 삭제된 L3의 하위 데이터도 제거
  const newL3Ids = new Set(newL3s.map(l3 => l3.id));
  const removedL3Ids = new Set([...oldL3Ids].filter(id => !newL3Ids.has(id)));
  return {
    ...db,
    l3Structures: [...kept, ...added],
    l3Functions: db.l3Functions.filter(f => !removedL3Ids.has((f as any).l3StructId)),
    failureCauses: db.failureCauses.filter(fc => !removedL3Ids.has((fc as any).l3StructId)),
  };
}
