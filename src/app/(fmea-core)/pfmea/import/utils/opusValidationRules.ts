/**
 * @file opusValidationRules.ts
 * @description Opus 검증규칙 v1 — 6개 규칙 구현
 *
 * V_FC_01: FC carry-forward 실패 — 공정번호 None/빈 행
 * V_FC_02: FC carry-forward 실패 — FE구분 None/빈 행
 * V_FC_03: FC↔B4 키 매핑 — B4에만 존재 (FC 미매칭)
 * V_FC_04: FC↔B4 키 매핑 — FC에만 존재 (B4 미매칭)
 * V_L2_01: 공통공정(01/00/공통) A4(제품특성) ≥1 필수
 * V_L2_02: 공통공정(01/00/공통) A5(고장형태) ≥1 필수
 * V_FE_01: C4 FE → FC 미참조 (고아 FE)
 * V_FE_02: FC FE → C4 미등록
 * V_B4_02: 고아 B4 — B1에 없는 m4의 B4
 *
 * @created 2026-03-10
 */

// ─── 공통 타입 ───

export interface OpusIssue {
  rule: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
}

export interface FCRow {
  processNo: string;
  feCategory: string;
  fm: string;
  fc: string;
}

export interface OpusValidationInput {
  fcKeys: Set<string>;   // "processNo|fcText"
  b4Keys: Set<string>;   // "processNo|fcText"
}

export interface ProcessA4A5Info {
  processNo: string;
  a4Count: number;
  a5Count: number;
}

// ─── 공통공정 판별 ───

const COMMON_PROCESS_PATTERNS = ['01', '00', '0', '공통', '공통공정'];

function isCommonProcess(processNo: string): boolean {
  const normalized = (processNo || '').trim().toLowerCase();
  return COMMON_PROCESS_PATTERNS.includes(normalized);
}

// ─── V_FC_01/02: FC carry-forward 실패 감지 ───

export function validateFC_CarryForward(fcRows: FCRow[]): OpusIssue[] {
  const issues: OpusIssue[] = [];

  fcRows.forEach((row, idx) => {
    // V_FC_01: 공정번호 빈/None
    if (!row.processNo || row.processNo.trim() === '' || row.processNo === 'None') {
      issues.push({
        rule: 'V_FC_01',
        severity: 'ERROR',
        message: `FC ${idx + 1}행: 공정번호가 없습니다 (carry-forward 실패). FM="${row.fm}", FC="${row.fc}"`,
      });
    }

    // V_FC_02: FE구분 빈/None
    if (!row.feCategory || row.feCategory.trim() === '' || row.feCategory === 'None') {
      issues.push({
        rule: 'V_FC_02',
        severity: 'ERROR',
        message: `FC ${idx + 1}행: FE구분이 없습니다 (carry-forward 실패). 공정="${row.processNo}", FM="${row.fm}"`,
      });
    }
  });

  return issues;
}

// ─── V_FC_03/04: FC↔B4 키 매핑 양방향 검증 ───

export function validateFC_B4KeyMapping(input: OpusValidationInput): OpusIssue[] {
  const issues: OpusIssue[] = [];

  // V_FC_03: B4에 있는데 FC에 없음
  const b4Only: string[] = [];
  for (const key of input.b4Keys) {
    if (!input.fcKeys.has(key)) {
      b4Only.push(key);
    }
  }
  if (b4Only.length > 0) {
    issues.push({
      rule: 'V_FC_03',
      severity: 'ERROR',
      message: `B4→FC 미매칭 ${b4Only.length}건: ${b4Only.slice(0, 5).join(', ')}${b4Only.length > 5 ? ` 외 ${b4Only.length - 5}건` : ''}`,
    });
  }

  // V_FC_04: FC에 있는데 B4에 없음
  const fcOnly: string[] = [];
  for (const key of input.fcKeys) {
    if (!input.b4Keys.has(key)) {
      fcOnly.push(key);
    }
  }
  if (fcOnly.length > 0) {
    issues.push({
      rule: 'V_FC_04',
      severity: 'WARNING',
      message: `FC→B4 미매칭 ${fcOnly.length}건: ${fcOnly.slice(0, 5).join(', ')}${fcOnly.length > 5 ? ` 외 ${fcOnly.length - 5}건` : ''}`,
    });
  }

  return issues;
}

// ─── V_L2_01/02: 공통공정(01) A4/A5 필수 검증 ───

export function validateL2_CommonProcess(processes: ProcessA4A5Info[]): OpusIssue[] {
  const issues: OpusIssue[] = [];

  for (const proc of processes) {
    if (!isCommonProcess(proc.processNo)) continue;

    // V_L2_01: 공통공정 A4(제품특성) ≥1
    if (proc.a4Count === 0) {
      issues.push({
        rule: 'V_L2_01',
        severity: 'ERROR',
        message: `공정 "${proc.processNo}"(공통): A4(제품특성)=0건 — 공통공정은 ≥1건 필수`,
      });
    }

    // V_L2_02: 공통공정 A5(고장형태) ≥1
    if (proc.a5Count === 0) {
      issues.push({
        rule: 'V_L2_02',
        severity: 'ERROR',
        message: `공정 "${proc.processNo}"(공통): A5(고장형태)=0건 — 모든 공정 필수`,
      });
    }
  }

  return issues;
}

// ─── V_FE_01/02: FE 정합성 (고아 FE / 미등록 FE) ───

export function validateFE_Orphan(
  c4FeTexts: string[],
  fcFeTexts: string[],
): OpusIssue[] {
  const issues: OpusIssue[] = [];
  const c4Set = new Set(c4FeTexts.map(t => t.trim()));
  const fcSet = new Set(fcFeTexts.map(t => t.trim()));

  // V_FE_01: C4 FE → FC 미참조 (고아 FE)
  const orphanFE: string[] = [];
  for (const fe of c4Set) {
    if (!fcSet.has(fe)) {
      orphanFE.push(fe);
    }
  }
  if (orphanFE.length > 0) {
    issues.push({
      rule: 'V_FE_01',
      severity: 'ERROR',
      message: `C4 FE ${orphanFE.length}건이 FC에서 미참조 (고아 FE): ${orphanFE.slice(0, 3).join(', ')}${orphanFE.length > 3 ? ` 외 ${orphanFE.length - 3}건` : ''}`,
    });
  }

  // V_FE_02: FC FE → C4 미등록
  const unregisteredFE: string[] = [];
  for (const fe of fcSet) {
    if (!c4Set.has(fe)) {
      unregisteredFE.push(fe);
    }
  }
  if (unregisteredFE.length > 0) {
    issues.push({
      rule: 'V_FE_02',
      severity: 'WARNING',
      message: `FC FE ${unregisteredFE.length}건이 C4에 미등록: ${unregisteredFE.slice(0, 3).join(', ')}${unregisteredFE.length > 3 ? ` 외 ${unregisteredFE.length - 3}건` : ''}`,
    });
  }

  return issues;
}

// ─── V_B4_02: 고아 B4 — B1에 없는 m4 ───

export function validateB4_Orphan(
  processNo: string,
  b1M4Set: Set<string>,
  b4M4Set: Set<string>,
): OpusIssue[] {
  const issues: OpusIssue[] = [];

  for (const m4 of b4M4Set) {
    if (!b1M4Set.has(m4)) {
      issues.push({
        rule: 'V_B4_02',
        severity: 'WARNING',
        message: `공정 "${processNo}" B4(${m4}): 대응 B1이 없습니다 (고아 B4)`,
      });
    }
  }

  return issues;
}
