/**
 * @file aiag-vda-severity-mapping.ts
 * @description AIAG-VDA 심각도 매핑표 (Scope·C2·C3·FE·S·근거) — Public DB + 엑셀 Import/Export
 *
 * ★★★ CODEFREEZE L4 (2026-03-28) ★★★
 * S추천 Public DB 단일 루트 — localStorage 사용 금지
 * 수정 시 scripts/guard/protected-paths.config.json 확인 필수
 *
 * SSoT: SeverityUsageRecord (Public DB)
 * API:  /api/severity-recommend (GET/POST/PUT)
 */

export type AiagVdaSeverityField =
  | 'scope'
  | 'productFunction'
  | 'requirement'
  | 'failureEffect'
  | 'severity'
  | 'basis';

export interface AiagVdaSeverityMappingRow {
  id: string;
  scope: string;
  productFunction: string;
  requirement: string;
  failureEffect: string;
  severity: number;
  basis: string;
}

/** 표준 엑셀 헤더(1행) — 템플릿/Export 기준 */
export const AIAG_VDA_SEVERITY_TEMPLATE_HEADERS: readonly string[] = [
  'Scope',
  '제품기능(C2)',
  '요구사항(C3)',
  '고장영향(FE/C4)',
  '심각도(S)',
  'AIAG-VDA 근거',
] as const;

/**
 * YIELD(수율) 관련 고장영향 → S=6·7 추천 매핑 (SP=고객사, YP=자사)
 * 템플릿/일괄 추가용 — 현장 표준 문구 확장
 */
export const AIAG_VDA_YIELD_RECOMMENDATION_ROWS: readonly Omit<AiagVdaSeverityMappingRow, 'id'>[] = [
  // ── S=6 · 고객사(SP) ──
  {
    scope: 'SP',
    productFunction: '고객 생산 연동',
    requirement: 'Cust Yield / Capa',
    failureEffect: 'FT Yield 저하',
    severity: 6,
    basis: '고객 생산 편의기능 저하 (부분 수율 감소)',
  },
  {
    scope: 'SP',
    productFunction: '고객 생산 연동',
    requirement: 'Yield Spec',
    failureEffect: '수율 감소/저하',
    severity: 6,
    basis: '고객 생산 편의기능 저하',
  },
  {
    scope: 'SP',
    productFunction: '고객 생산 연동',
    requirement: 'Product Yield Spec',
    failureEffect: '제품 수율감소/저하',
    severity: 6,
    basis: '고객 생산 편의기능 저하',
  },
  {
    scope: 'SP',
    productFunction: '고객 조립 연동',
    requirement: 'Assembly Yield',
    failureEffect: '조립 수율 감소',
    severity: 6,
    basis: '고객 조립 편의기능 저하',
  },
  {
    scope: 'SP',
    productFunction: '고객 출하 검증',
    requirement: 'OQC Yield',
    failureEffect: 'OQC Yield 저하',
    severity: 6,
    basis: '고객 출하검사 수율 편의기능 저하 (부분)',
  },
  {
    scope: 'SP',
    productFunction: '고객 라인 연동',
    requirement: 'Line Yield',
    failureEffect: 'Lot Yield 저하',
    severity: 6,
    basis: '고객 생산 편의기능 저하 (부분 수율 감소)',
  },
  {
    scope: 'SP',
    productFunction: 'SMT/실장 연동',
    requirement: 'Panel Yield',
    failureEffect: 'Strip/Panel Yield 저하',
    severity: 6,
    basis: '고객 SMT·실장 편의기능 저하 (부분 수율)',
  },
  {
    scope: 'SP',
    productFunction: 'PKG/후공정 연동',
    requirement: 'Package Yield',
    failureEffect: 'Package Yield 저하',
    severity: 6,
    basis: '고객 조립·PKG 편의기능 저하',
  },
  {
    scope: 'SP',
    productFunction: '고객 생산 연동',
    requirement: 'DPPM / Yield',
    failureEffect: 'DPPM 증가(수율 연동)',
    severity: 6,
    basis: '고객 생산 편의기능 저하 (부분 수율 악화)',
  },
  {
    scope: 'SP',
    productFunction: '고객 생산 연동',
    requirement: 'RTP / Cycle',
    failureEffect: 'RTP Yield 저하',
    severity: 6,
    basis: '고객 생산 편의기능 저하 (부분 수율)',
  },
  {
    scope: 'SP',
    productFunction: '고객 생산 연동',
    requirement: 'EOL Yield',
    failureEffect: 'EOL Yield 저하',
    severity: 6,
    basis: '고객 최종검사 수율 편의기능 저하',
  },
  {
    scope: 'SP',
    productFunction: '고객 생산 연동',
    requirement: 'UPH 연동',
    failureEffect: 'Line Yield 저하(고객)',
    severity: 6,
    basis: '고객 라인 수율 편의기능 저하 (부분)',
  },
  // ── S=7 · 고객사(SP) ──
  {
    scope: 'SP',
    productFunction: '고객 Capa 연동',
    requirement: 'Capa / Throughput',
    failureEffect: 'Yield Drop→고객 Capa Drop',
    severity: 7,
    basis: '고객 생산능력 심각 저하',
  },
  {
    scope: 'SP',
    productFunction: '고객 Capa 연동',
    requirement: 'Capa Spec',
    failureEffect: '고객 Capa 심각 저하(수율 연동)',
    severity: 7,
    basis: '고객 생산능력 심각 저하',
  },
  {
    scope: 'SP',
    productFunction: '고객 생산 연동',
    requirement: 'FT / 수율',
    failureEffect: 'FT 수율 급락→라인 Stop 위험',
    severity: 7,
    basis: '고객 생산능력 심각 저하',
  },
  {
    scope: 'SP',
    productFunction: '고객 품질·수율',
    requirement: 'Yield+Defect',
    failureEffect: '수율+불량 복합(고객)',
    severity: 7,
    basis: '고객 생산·품질 복합 심각 저하',
  },
  {
    scope: 'SP',
    productFunction: '고객 생산 연동',
    requirement: 'UPH / Capa',
    failureEffect: '고객 UPH 심각 저하(수율 원인)',
    severity: 7,
    basis: '고객 생산능력 심각 저하',
  },
  {
    scope: 'SP',
    productFunction: '고객 생산 연동',
    requirement: 'Batch Capa',
    failureEffect: 'Batch Yield 급락→Capa 병목',
    severity: 7,
    basis: '고객 생산능력 심각 저하 (수율 병목)',
  },
  {
    scope: 'SP',
    productFunction: '고객 다공정',
    requirement: 'Multi-step Yield',
    failureEffect: '다공정 연쇄 Yield 저하(고객)',
    severity: 7,
    basis: '고객 생산·수율 연쇄 심각 저하',
  },
  // ── S=6 · 자사(YP) ──
  {
    scope: 'YP',
    productFunction: '자사 Wafer/전공정',
    requirement: 'Wafer Yield Spec',
    failureEffect: 'Wafer Yield 저하',
    severity: 6,
    basis: '자사 수율 부분 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 공정 수율',
    requirement: 'Process Yield',
    failureEffect: 'Yield Drop',
    severity: 6,
    basis: '자사 공정 수율 편의기능 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 공정 수율',
    requirement: 'Line Yield',
    failureEffect: '수율 감소/저하',
    severity: 6,
    basis: '자사 공정 수율 부분 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 공정 수율',
    requirement: 'In-line Yield',
    failureEffect: '공정 수율 저하',
    severity: 6,
    basis: '자사 공정 편의기능 저하 (부분 수율)',
  },
  {
    scope: 'YP',
    productFunction: '자사 중간검사',
    requirement: 'IPQC Yield',
    failureEffect: '중간검사 수율 저하',
    severity: 6,
    basis: '자사 공정 수율 부분 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 라인',
    requirement: 'Line OEE/Yield',
    failureEffect: '라인 Yield 저하',
    severity: 6,
    basis: '자사 라인 수율 편의기능 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 Batch 공정',
    requirement: 'Batch Consistency',
    failureEffect: 'Batch 수율 편차 확대',
    severity: 6,
    basis: '자사 공정 수율 부분 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 조립',
    requirement: 'Assy Yield',
    failureEffect: 'Assembly Yield 저하',
    severity: 6,
    basis: '자사 조립 수율 편의기능 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 검사',
    requirement: 'Test Yield',
    failureEffect: 'Test Yield 저하(수율 연동)',
    severity: 6,
    basis: '자사 검사·수율 편의기능 저하 (부분)',
  },
  {
    scope: 'YP',
    productFunction: '자사 공정 수율',
    requirement: 'Scrap / Rework',
    failureEffect: '스크랩 증가(수율 저하)',
    severity: 6,
    basis: '자사 공정 수율 부분 저하 (스크랩 연동)',
  },
  // ── S=7 · 자사(YP) ──
  {
    scope: 'YP',
    productFunction: '자사 수율·기능',
    requirement: 'Yield+Test',
    failureEffect: 'Yield Drop + Test Fail',
    severity: 7,
    basis: '자사 수율+기능 복합 심각 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 Capa',
    requirement: 'Capa / UPH',
    failureEffect: 'Yield Drop→Capa Drop',
    severity: 7,
    basis: '자사 생산능력 심각 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 공정 수율',
    requirement: 'Process Capa',
    failureEffect: '공정 수율 급락',
    severity: 7,
    basis: '자사 생산능력 심각 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 병목 공정',
    requirement: 'Bottleneck Yield',
    failureEffect: 'Capa Drop(수율 병목)',
    severity: 7,
    basis: '자사 생산능력 심각 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 다공정',
    requirement: 'Line Flow Yield',
    failureEffect: '다공정 연쇄 수율 저하',
    severity: 7,
    basis: '자사 생산능력 심각 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 공정 수율',
    requirement: 'Throughput',
    failureEffect: 'Throughput 급락(수율 연동)',
    severity: 7,
    basis: '자사 생산능력 심각 저하',
  },
  {
    scope: 'YP',
    productFunction: '자사 공정 수율',
    requirement: 'UPH Target',
    failureEffect: 'UPH 심각 저하(수율 원인)',
    severity: 7,
    basis: '자사 생산능력 심각 저하',
  },
];

/** YIELD 추천 행을 id 부여하여 매핑 행으로 변환 */
export function mapYieldRecommendationsToRows(newId: () => string): AiagVdaSeverityMappingRow[] {
  return AIAG_VDA_YIELD_RECOMMENDATION_ROWS.map((r) => ({ ...r, id: newId() }));
}

function normHeader(raw: string): string {
  return raw
    .replace(/\u00a0/g, ' ')
    .split('\n')[0]
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * 엑셀 1행 셀 값 → 필드 키 (한/영·별칭 허용)
 */
export function headerCellToField(cellText: string): AiagVdaSeverityField | null {
  const s = normHeader(cellText);
  if (!s) return null;

  if (s === 'scope' || s === '스코프' || s === '구분') return 'scope';
  if (
    s.includes('제품기능') ||
    s.includes('product function') ||
    (s.includes('c2') && !s.includes('c3'))
  ) {
    return 'productFunction';
  }
  if (s.includes('요구사항') || s.includes('requirement') || s.includes('c3')) {
    return 'requirement';
  }
  if (s.includes('고장영향') || s.includes('failure effect') || s.includes('c4')) {
    return 'failureEffect';
  }
  if (s === 'fe' || s.startsWith('fe(') || s.startsWith('fe/') || /^fe\b/.test(s)) {
    return 'failureEffect';
  }
  if (s.includes('심각도') || /^s$/.test(s) || s.includes('severity') || s.startsWith('s(')) {
    return 'severity';
  }
  if (s.includes('aiag') && s.includes('근거')) return 'basis';
  if (s.includes('aiag-vda') || s.includes('aiag vda')) return 'basis';
  if (s.includes('근거') || s.includes('basis') || s.includes('rationale')) return 'basis';

  return null;
}

/** 헤더 행 → { colIndex(1-based) : field } */
export function buildColumnMapFromHeaders(headerTexts: string[]): Map<number, AiagVdaSeverityField> {
  const map = new Map<number, AiagVdaSeverityField>();
  headerTexts.forEach((text, i) => {
    const field = headerCellToField(text);
    if (field) map.set(i + 1, field);
  });
  return map;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Public DB API — S추천 SSoT (SeverityUsageRecord)
//  localStorage 사용 금지 (2026-03-28 CODEFREEZE L4)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** DB SeverityUsageRecord → S추천 탭 MappingRow 변환 */
export function usageRecordToMappingRow(rec: {
  id: string; feText: string; severity: number;
  feCategory?: string; processName?: string; productChar?: string;
  usageCount?: number;
}): AiagVdaSeverityMappingRow {
  return {
    id: rec.id,
    scope: rec.feCategory || '',
    productFunction: rec.processName || '',
    requirement: rec.productChar || '',
    failureEffect: rec.feText,
    severity: rec.severity,
    basis: `사용 ${rec.usageCount || 1}회 (DB 이력)`,
  };
}

/** MappingRow → DB API 요청 body 변환 */
function mappingRowToApiBody(row: AiagVdaSeverityMappingRow, fmeaId?: string) {
  return {
    feText: row.failureEffect,
    severity: row.severity,
    feCategory: row.scope || '',
    processName: row.productFunction || '',
    productChar: row.requirement || '',
    fmeaId: fmeaId || undefined,
  };
}

/**
 * DB에서 S추천 전체 로드 (GET /api/severity-recommend)
 * 모든 프로젝트가 동일한 Public DB를 공유합니다.
 * ★ AIAG-VDA: S=1(영향없음) 제외 — 최소 유의미 심각도 = 2
 */
export async function loadSeverityFromDB(limit = 500): Promise<AiagVdaSeverityMappingRow[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch(`/api/severity-recommend?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) return [];
    // ★ S=1 제외: AIAG-VDA 기준 심각도 1은 "영향 없음"이므로 추천 의미 없음
    return data.data
      .filter((rec: { severity: number }) => rec.severity >= 2)
      .map(usageRecordToMappingRow);
  } catch (e) {
    console.error('[aiag-vda-severity-mapping] DB load 실패:', e);
    return [];
  }
}

/**
 * DB에 S추천 단건 저장 (POST /api/severity-recommend)
 * ★ S=1 거부: AIAG-VDA 기준 "영향 없음"은 저장하지 않음
 */
export async function saveSeverityToDB(row: AiagVdaSeverityMappingRow, fmeaId?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (row.severity < 2) return; // S=1 거부
  try {
    await fetch('/api/severity-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mappingRowToApiBody(row, fmeaId)),
    });
  } catch (e) {
    console.error('[aiag-vda-severity-mapping] DB save 실패:', e);
  }
}

/**
 * DB에 S추천 일괄 저장 (PUT /api/severity-recommend)
 */
export async function saveSeverityBulkToDB(rows: AiagVdaSeverityMappingRow[], fmeaId?: string): Promise<{ saved: number; skipped: number }> {
  if (typeof window === 'undefined') return { saved: 0, skipped: 0 };
  // ★ S=1 제외: AIAG-VDA 기준 "영향 없음"은 저장하지 않음
  const filtered = rows.filter(r => r.severity >= 2);
  try {
    const records = filtered.map(r => mappingRowToApiBody(r, fmeaId));
    const res = await fetch('/api/severity-recommend', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records, fmeaId }),
    });
    if (!res.ok) return { saved: 0, skipped: 0 };
    const data = await res.json();
    return { saved: data.saved || 0, skipped: data.skipped || 0 };
  } catch (e) {
    console.error('[aiag-vda-severity-mapping] DB bulk save 실패:', e);
    return { saved: 0, skipped: 0 };
  }
}

function isValidRow(x: unknown): x is AiagVdaSeverityMappingRow {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.scope === 'string' &&
    typeof r.productFunction === 'string' &&
    typeof r.requirement === 'string' &&
    typeof r.failureEffect === 'string' &&
    typeof r.severity === 'number' &&
    Number.isFinite(r.severity) &&
    typeof r.basis === 'string'
  );
}

function normCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return String(v).replace(/\u00a0/g, ' ').trim();
}

function parseSeverityCell(v: unknown): number {
  const s = normCell(v);
  if (!s) return NaN;
  const n = parseInt(s.replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : NaN;
}

/**
 * ExcelJS 시트 1행=헤더, 2행~ 데이터 → 행 배열 (id 자동 부여)
 */
type MinimalSheet = {
  rowCount: number;
  getRow: (n: number) => { cellCount: number; getCell: (c: number) => { value: unknown } };
};

export function rowsFromExcelSheet(sheet: MinimalSheet, newId: () => string): AiagVdaSeverityMappingRow[] {
  const headerRow = sheet.getRow(1);
  const lastCol = Math.max(1, headerRow.cellCount || 0);
  const headerTexts: string[] = [];
  for (let c = 1; c <= lastCol; c++) {
    headerTexts.push(normCell(headerRow.getCell(c).value));
  }
  const colMap = buildColumnMapFromHeaders(headerTexts);
  if (colMap.size === 0) return [];

  const need: AiagVdaSeverityField[] = ['scope', 'failureEffect', 'severity'];
  for (const f of need) {
    if (![...colMap.values()].includes(f)) return [];
  }

  const out: AiagVdaSeverityMappingRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells = {
      scope: '',
      productFunction: '',
      requirement: '',
      failureEffect: '',
      basis: '',
    };
    let sevNum = NaN;
    const rc = Math.max(1, row.cellCount || 0);
    for (let c = 1; c <= rc; c++) {
      const field = colMap.get(c);
      if (!field) continue;
      const val = row.getCell(c).value;
      if (field === 'severity') {
        sevNum = parseSeverityCell(val);
      } else {
        (cells as Record<string, string>)[field] = normCell(val);
      }
    }
    if (!cells.scope && !cells.failureEffect && !Number.isFinite(sevNum)) continue;
    if (!Number.isFinite(sevNum)) continue;
    out.push({
      id: newId(),
      scope: cells.scope,
      productFunction: cells.productFunction,
      requirement: cells.requirement,
      failureEffect: cells.failureEffect,
      severity: sevNum,
      basis: cells.basis,
    });
  }
  return out;
}

function normKey(s: string): string {
  return s.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** 완화 매칭: 공백·슬래시 등으로 토큰 분리 (2글자 이상만) */
function feTokenSet(norm: string): Set<string> {
  return new Set(
    norm
      .split(/[/\s,.·:;，]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2),
  );
}

/**
 * 표(FE) 쪽 핵심 토큰이 입력 문장에 얼마나 담겨 있는지 (완화 기준)
 * — 조사/어미로 토큰이 갈라져도 `feNorm.includes(tb)` 또는 입력 토큰과 부분포함으로 인정
 */
function rowCoreTokensCoveredCount(feNorm: string, rowFeNorm: string): number {
  const rowTok = [...feTokenSet(rowFeNorm)];
  const inputTok = [...feTokenSet(feNorm)];
  if (rowTok.length === 0) return 0;
  let covered = 0;
  for (const tb of rowTok) {
    if (tb.length < 2) continue;
    if (feNorm.includes(tb)) {
      covered++;
      continue;
    }
    let hit = false;
    for (const ta of inputTok) {
      if (ta.length < 2) continue;
      const short = tb.length <= ta.length ? tb : ta;
      const long = tb.length > ta.length ? tb : ta;
      if (short.length >= 2 && long.includes(short)) {
        hit = true;
        break;
      }
    }
    if (hit) covered++;
  }
  return covered;
}

/**
 * 매핑표에서 1건 조회 (참고용 — 엔지니어 판단 보조)
 * 우선순위: 전필드 일치 → scope+FE → FE 단독
 */
export function matchAiagVdaSeverityRow(
  rows: AiagVdaSeverityMappingRow[],
  input: {
    scope?: string;
    productFunction?: string;
    requirement?: string;
    failureEffect?: string;
  },
): AiagVdaSeverityMappingRow | null {
  const sc = normKey(input.scope || '');
  const pf = normKey(input.productFunction || '');
  const rq = normKey(input.requirement || '');
  const fe = normKey(input.failureEffect || '');
  if (!fe) return null;

  for (const r of rows) {
    if (
      normKey(r.scope) === sc &&
      normKey(r.productFunction) === pf &&
      normKey(r.requirement) === rq &&
      normKey(r.failureEffect) === fe
    ) {
      return r;
    }
  }
  for (const r of rows) {
    if (normKey(r.scope) === sc && normKey(r.failureEffect) === fe) return r;
  }
  for (const r of rows) {
    if (normKey(r.failureEffect) === fe) return r;
  }

  // --- 완화 기준 (2026-03-23): 사용자가 문구를 손으로 다듬을 것을 전제로 추천만 보조 ---
  const MIN_SUB = 3;

  // 4단계: 동일 Scope 내 부분문자열 (짧은 FE도 허용)
  if (sc) {
    for (const r of rows) {
      if (normKey(r.scope) !== sc) continue;
      const rfe = normKey(r.failureEffect);
      if (rfe.length < MIN_SUB || fe.length < MIN_SUB) continue;
      if (fe === rfe) continue;
      if (fe.includes(rfe) || rfe.includes(fe)) return r;
    }
  }

  // 5단계: 동일 Scope + 표 핵심어 2개 이상이 입력에 반영된 것으로 볼 것 (문구 자유 편집 전제)
  if (sc) {
    let best: AiagVdaSeverityMappingRow | null = null;
    let bestTok = 0;
    for (const r of rows) {
      if (normKey(r.scope) !== sc) continue;
      const rfe = normKey(r.failureEffect);
      const tok = rowCoreTokensCoveredCount(fe, rfe);
      if (tok >= 2 && tok > bestTok) {
        bestTok = tok;
        best = r;
      }
    }
    if (best) return best;
  }

  // 6단계: Scope 무관 부분문자열 — 가장 긴 표 FE와 겹칠 때 우선
  let fallback: AiagVdaSeverityMappingRow | null = null;
  let fallbackLen = 0;
  for (const r of rows) {
    const rfe = normKey(r.failureEffect);
    if (rfe.length < MIN_SUB || fe.length < MIN_SUB) continue;
    if (fe.includes(rfe) || rfe.includes(fe)) {
      const len = rfe.length;
      if (len > fallbackLen) {
        fallbackLen = len;
        fallback = r;
      }
    }
  }
  if (fallback) return fallback;

  // 7단계: ★ 2026-03-25 유사성 키워드 매칭 확대
  // 3단어 이상 일치 = 재작업/선별 (S=6), 2단어 일치 = 폐기/손실 (S=7~8)
  // 수율저하/Yield 키워드 포함 = S=7
  {
    let bestRow: AiagVdaSeverityMappingRow | null = null;
    let bestScore = 0;
    const feTokens = fe.replace(/[()\/,·\-]/g, ' ').split(/\s+/).filter(t => t.length >= 2);
    for (const r of rows) {
      const rfe = normKey(r.failureEffect);
      const rTokens = rfe.replace(/[()\/,·\-]/g, ' ').split(/\s+/).filter(t => t.length >= 2);
      const matched = feTokens.filter(t => rTokens.some(rt => rt.includes(t) || t.includes(rt)));
      if (matched.length >= 2 && matched.length > bestScore) {
        bestScore = matched.length;
        bestRow = r;
      }
    }
    if (bestRow) return bestRow;
  }

  // 8단계: 수율/Yield/재작업/폐기 키워드 자동 S 추정 (매핑표에 없어도)
  const YIELD_KEYWORDS: [RegExp, number, string][] = [
    [/수율\s*저하|yield\s*drop|yield\s*loss/i, 7, '수율 저하 → S=7 (AIAG-VDA 자동추정)'],
    [/재작업|rework|선별|sorting/i, 6, '재작업/선별 → S=6 (AIAG-VDA 자동추정)'],
    [/폐기|scrap|전수.*폐기/i, 8, '폐기 → S=8 (AIAG-VDA 자동추정)'],
    [/고객.*클레임|customer.*claim|라인\s*정지/i, 9, '고객 클레임/라인정지 → S=9 (AIAG-VDA 자동추정)'],
    [/capa\s*drop|생산.*감소/i, 7, '생산 Capa 감소 → S=7 (AIAG-VDA 자동추정)'],
    [/불량\s*유출|outgoing|유출/i, 8, '불량 유출 → S=8 (AIAG-VDA 자동추정)'],
    [/spec\s*out|규격\s*이탈/i, 7, 'Spec Out → S=7 (AIAG-VDA 자동추정)'],
    [/오염|particle|contamination/i, 6, '오염/Particle → S=6 (AIAG-VDA 자동추정)'],
    // ★ 2026-03-27: 반도체 공정 특화 키워드 확장 (Au Bump/Wafer 공정)
    [/open\s*[\/·]?\s*short|전기적\s*(open|short)|단락|단선/i, 8, '전기적 Open/Short → S=8 (AIAG-VDA 자동추정)'],
    [/lift[\s-]*off|리프트[\s-]*오프|박리/i, 7, 'Lift-off/박리 → S=7 (AIAG-VDA 자동추정)'],
    [/bridge|브릿지|bump\s*간\s*(bridge|단락)/i, 8, 'Bridge/단락 → S=8 (AIAG-VDA 자동추정)'],
    [/신뢰[도성]\s*(하락|저하|열화)|reliability\s*(degrad|drop|decreas)/i, 7, '신뢰도 하락 → S=7 (AIAG-VDA 자동추정)'],
    [/접합\s*부?\s*(열화|파괴|불량)|bonding\s*(fail|degrad)/i, 7, '접합부 열화 → S=7 (AIAG-VDA 자동추정)'],
    [/imc\s*(과성장|과도|열화)|intermetallic/i, 7, 'IMC 과성장 → S=7 (AIAG-VDA 자동추정)'],
    [/리콜|recall|법적\s*조치|legal/i, 9, '리콜/법적 조치 → S=9 (AIAG-VDA 자동추정)'],
    [/reject|납품\s*(reject|반려|거부)/i, 7, '납품 Reject → S=7 (AIAG-VDA 자동추정)'],
    [/부적합|non[\s-]*conform/i, 5, '부적합 → S=5 (AIAG-VDA 자동추정)'],
    [/패턴\s*불량|pattern\s*(defect|fail)/i, 7, '패턴 불량 → S=7 (AIAG-VDA 자동추정)'],
    [/혼입|mix[\s-]*up|lot\s*혼입/i, 7, 'Lot 혼입 → S=7 (AIAG-VDA 자동추정)'],
    [/형성\s*불량|formation\s*(defect|fail)/i, 7, '형성 불량 → S=7 (AIAG-VDA 자동추정)'],
  ];
  for (const [regex, sev, basis] of YIELD_KEYWORDS) {
    if (regex.test(fe) || regex.test(input.failureEffect || '')) {
      return { id: '__auto__', scope: sc, productFunction: '', requirement: '', failureEffect: fe, severity: sev, basis } as AiagVdaSeverityMappingRow;
    }
  }

  return null;
}

/** 심각도 셀 배경 (부드러운 톤) */
export function severityBackground(sev: number): string {
  if (sev >= 9) return '#ffebee';
  if (sev >= 8) return '#fce4ec';
  if (sev >= 7) return '#ffe0b2';
  if (sev >= 5) return '#fff9c4';
  if (sev >= 3) return '#e3f2fd';
  return '#fafafa';
}

export function severityTextColor(sev: number): string {
  if (sev >= 9) return '#880e4f';
  if (sev >= 8) return '#ad1457';
  if (sev >= 7) return '#e65100';
  if (sev >= 5) return '#f57f17';
  if (sev >= 3) return '#1565c0';
  return '#333';
}
