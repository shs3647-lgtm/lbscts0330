/**
 * @file raw-quality-checker.ts
 * @description Raw Import 데이터 품질 판정 — EX-46~52
 *
 * Import된 PositionAtomicData의 FK/parentId 검증 결과를 바탕으로
 * raw-complete / raw-partial / raw-ambiguous / raw-invalid 4단계 품질 상태를 판정한다.
 *
 * EX-46: raw-complete 판정 기준
 * EX-47: raw-partial 판정 기준
 * EX-48: raw-ambiguous 판정 기준
 * EX-49: raw-invalid 판정 기준
 * EX-52: userActions 생성
 *
 * @version 1.0.0
 * @created 2026-03-23
 */

import type { DatasetQualityReport } from './fk-chain-validator';
import type { PositionAtomicData } from '@/types/position-import';

// ══════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════

export type RawStatus = 'raw-complete' | 'raw-partial' | 'raw-ambiguous' | 'raw-invalid';

export interface RawQualityResult {
  status: RawStatus;
  report: DatasetQualityReport;
  /** 유효 FailureLink 수 / 전체 FC 행 수 (0~1) */
  completenessRate: number;
  /** report.parentIdCoverage (0~1) */
  parentIdCoverage: number;
  /** report.fkCoverage (0~1) */
  fkCoverage: number;
  /** 사용자가 해야 할 작업 목록 (EX-52) */
  userActions: string[];
  /** raw-complete일 때만 true */
  canProceedToAtomic: boolean;
  summary: string;
}

// ══════════════════════════════════════════════
// 내부 헬퍼: ambiguous 검출
// ══════════════════════════════════════════════

/**
 * 동일 fmId+feId 조합이 반복되는 FailureLink 중복 체인 가능성을 검출한다.
 * OR feRefs가 비어있는 FM이 30% 초과하는 경우도 ambiguous로 판정한다.
 */
function isAmbiguous(data: PositionAtomicData): boolean {
  // 1. 동일 fmId+feId 반복 체인 검출
  const fmFeKey = new Set<string>();
  let duplicateChain = false;
  for (const fl of data.failureLinks) {
    const key = `${fl.fmId}|${fl.feId}`;
    if (fmFeKey.has(key)) {
      duplicateChain = true;
      break;
    }
    fmFeKey.add(key);
  }
  if (duplicateChain) return true;

  // 2. feRefs가 비어있는 FM 비율 > 30%
  if (data.failureModes.length > 0) {
    const emptyFeRefCount = data.failureModes.filter(
      (fm) => !fm.feRefs || fm.feRefs.length === 0,
    ).length;
    const emptyRatio = emptyFeRefCount / data.failureModes.length;
    if (emptyRatio > 0.3) return true;
  }

  return false;
}

// ══════════════════════════════════════════════
// 판정 기준 (EX-46~49)
// ══════════════════════════════════════════════

function determineStatus(
  data: PositionAtomicData,
  report: DatasetQualityReport,
  fkCoverage: number,
  parentIdCoverage: number,
): RawStatus {
  const flCount = data.failureLinks.length;
  const validFL = data.failureLinks.filter(
    (fl) => fl.fmId && fl.feId && fl.fcId,
  ).length;

  // EX-49: raw-invalid
  if (
    data.l2Structures.length === 0 ||
    flCount === 0 ||
    fkCoverage < 0.2
  ) {
    return 'raw-invalid';
  }

  // EX-46: raw-complete
  if (
    fkCoverage >= 0.95 &&
    parentIdCoverage >= 0.95 &&
    report.errors.length === 0 &&
    validFL > 0
  ) {
    return 'raw-complete';
  }

  // EX-48: raw-ambiguous (50% 이상이면서 ambiguous 조건 충족)
  if (fkCoverage >= 0.5 && isAmbiguous(data)) {
    return 'raw-ambiguous';
  }

  // EX-47: raw-partial
  if (fkCoverage >= 0.5) {
    return 'raw-partial';
  }

  // fkCoverage 0.2~0.5 구간: raw-invalid
  return 'raw-invalid';
}

// ══════════════════════════════════════════════
// userActions 생성 (EX-52)
// ══════════════════════════════════════════════

function buildUserActions(status: RawStatus): string[] {
  switch (status) {
    case 'raw-invalid':
      return ['Excel Import 재실행 필요', 'L1/L2/L3/FC 시트 구조 확인'];
    case 'raw-partial':
      return ['깨진 FC 연결 수동 확인', 'repair-fk API 실행 권장'];
    case 'raw-ambiguous':
      return ['중복 고장사슬 검토 필요', 'FC 시트 원본행 컬럼 확인'];
    case 'raw-complete':
      return ['DB 저장 가능 (raw-to-atomic 실행)'];
  }
}

// ══════════════════════════════════════════════
// 메인 함수
// ══════════════════════════════════════════════

/**
 * PositionAtomicData와 DatasetQualityReport를 입력받아 RawQualityResult를 반환한다.
 *
 * completenessRate = 유효 FailureLink 수 / 전체 FC 행 수 (failureCauses.length)
 * parentIdCoverage = report.parentIdCoverage
 * fkCoverage       = report.fkCoverage
 *
 * @param data   parsePositionBasedExcel() 또는 DB 재구성 PositionAtomicData
 * @param report validateFKChain(data) 결과
 * @returns RawQualityResult
 */
export function checkRawQuality(
  data: PositionAtomicData,
  report: DatasetQualityReport,
): RawQualityResult {
  const fcCount = data.failureCauses.length;
  const validFL = data.failureLinks.filter(
    (fl) => fl.fmId && fl.feId && fl.fcId,
  ).length;

  const completenessRate = fcCount > 0 ? validFL / fcCount : 0;
  const parentIdCoverage = report.parentIdCoverage;
  const fkCoverage = report.fkCoverage;

  const status = determineStatus(data, report, fkCoverage, parentIdCoverage);
  const userActions = buildUserActions(status);
  const canProceedToAtomic = status === 'raw-complete';

  const summary =
    `[${status}] completeness=${(completenessRate * 100).toFixed(1)}% ` +
    `parentId=${(parentIdCoverage * 100).toFixed(1)}% ` +
    `fk=${(fkCoverage * 100).toFixed(1)}% ` +
    `errors=${report.errors.length} FL=${data.failureLinks.length} FC=${fcCount}`;

  return {
    status,
    report,
    completenessRate,
    parentIdCoverage,
    fkCoverage,
    userActions,
    canProceedToAtomic,
    summary,
  };
}
