/**
 * @file import-excel-file/route.ts
 * @description 서버사이드 다중시트 엑셀 파싱 + DB 저장 API
 *
 * POST /api/fmea/import-excel-file
 * Body: {
 *   fmeaId, filePath, l1Name?,
 *   masterJsonPath?,   // 선택: data/... 상대경로 (없으면 data/master-fmea/{fmeaId}-golden.json → {fmeaId}.json 순 시도)
 *   registerProject?,  // true면 public fmea_projects 등록 (워크시트 목록용)
 *   projectName?,      // registerProject 시 표시명
 * }
 *
 * 엑셀 구조 (5시트):
 *   Sheet 0: L1 통합(C1-C4) — C1(구분), C2(제품기능), C3(요구사항), C4(고장영향)
 *   Sheet 1: L2 통합(A1-A6) — A1(공정번호), A2(공정명), A3(공정기능), A4(제품특성), A5(고장형태), A6(검출관리)
 *   Sheet 2: L3 통합(B1-B5) — B1(작업요소), B2(요소기능), B3(공정특성), B4(고장원인), B5(예방관리)
 *   Sheet 3: FC 고장사슬 — FE/FM/FC/PC/DC/SOD
 *   Sheet 4: FA 통합분석 — 전체 분석 (선택적)
 *
 * UUID 규칙: uuid-generator.ts의 결정론적 ID 사용 (Rule 1.7)
 * parentItemId FK 규칙: A5→A4, B4→B3, C3→C2, C4→L1Function (Rule 1.7.5)
 *
 * ★ 마스터 JSON: 프로젝트 스키마에 L2가 없을 때(최초 Import)만 체인 보강/골든 가지치기에 사용.
 *   재Import 시에는 엑셀 파싱 → buildAtomicFromFlat → save-from-import(PostgreSQL FK)만.
 */
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import {
  masterJsonMatchesFmeaId,
  normalizeFmeaId,
  resolveMasterJsonPath,
} from '@/lib/fmea-core/import-excel-master-resolve';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import {
  genA1, genA3, genA4, genA5, genA6,
  genB1, genB2, genB3, genB4,
  genC1, genC2, genC3, genC4,
} from '@/lib/uuid-generator';

interface MasterJSON {
  fmeaId?: string;
  chains?: Array<{
    processNo: string; m4?: string; workElement?: string;
    fmValue: string; fcValue: string; feValue: string;
    feScope?: string; pcValue?: string; dcValue?: string;
    s?: number | null; o?: number | null; d?: number | null;
    ap?: string;
    id?: string; fmId?: string; fcId?: string; feId?: string;
  }>;
  atomicDB?: {
    fmeaId?: string;
    l3Functions?: Array<{ id: string }>;
    failureCauses?: Array<{ id: string; l3FuncId?: string | null }>;
  };
}

export const runtime = 'nodejs';

/** ExcelJS 셀 값을 문자열로 변환 */
function cellStr(ws: ExcelJS.Worksheet, row: number, col: number): string {
  const cell = ws.getCell(row, col);
  if (!cell || cell.value === null || cell.value === undefined) return '';
  const val = cell.value;
  if (typeof val === 'object' && val !== null && 'richText' in val) {
    return ((val as { richText: Array<{ text: string }> }).richText || []).map(r => r.text).join('').trim();
  }
  return String(val).trim();
}

/** 공정번호를 정수로 변환 (01→1, 10→10 등) */
function pnoNum(pno: string): number {
  return parseInt(pno, 10) || 0;
}

interface ChainEntry {
  processNo: string;
  m4: string;
  workElement: string;
  fmValue: string;
  fcValue: string;
  feValue: string;
  feScope: string;
  pcValue: string;
  dcValue: string;
  s: number | null;
  o: number | null;
  d: number | null;
  ap: string;
  // UUID FK (골든 마스터 JSON에서 전달)
  id?: string;
  fmId?: string;
  fcId?: string;
  feId?: string;
}

/**
 * Sheet 0: L1 통합(C1-C4) → C1, C2, C3, C4 FlatData
 * Headers: 구분(C1) | 제품기능(C2) | 요구사항(C3) | 고장영향(C4)
 */
function parseL1Sheet(ws: ExcelJS.Worksheet): ImportedFlatData[] {
  const flatData: ImportedFlatData[] = [];
  const now = new Date();

  // 구분별 카운터
  const c2SeqByDiv = new Map<string, number>();
  const c3SeqByC2 = new Map<string, number>();
  const c4SeqByDiv = new Map<string, number>();
  const c1Seen = new Set<string>();
  const c3Seen = new Set<string>(); // dedup: div|c2|c3
  const c4Seen = new Set<string>(); // dedup: div|c4

  let lastDiv = '';
  let lastC2 = '';
  let lastC2Id = '';

  for (let r = 2; r <= ws.rowCount; r++) {
    const div = cellStr(ws, r, 1) || lastDiv; // carry-forward
    const c2Val = cellStr(ws, r, 2) || lastC2;
    const c3Val = cellStr(ws, r, 3);
    const c4Val = cellStr(ws, r, 4);

    if (!div) continue;
    const divNorm = div === 'YP' || div === '자사' ? 'YP' :
                    div === 'SP' || div === '고객' ? 'SP' : 'USER';

    // C1 — 구분 (중복 제거)
    if (!c1Seen.has(divNorm)) {
      c1Seen.add(divNorm);
      flatData.push({
        id: genC1('PF', divNorm),
        processNo: divNorm,
        category: 'C',
        itemCode: 'C1',
        value: divNorm,
        createdAt: now,
      });
    }

    // C2 — 제품기능 (div별 seq)
    if (c2Val && c2Val !== lastC2) {
      const seq = (c2SeqByDiv.get(divNorm) || 0) + 1;
      c2SeqByDiv.set(divNorm, seq);
      lastC2Id = genC2('PF', divNorm, seq);
      flatData.push({
        id: lastC2Id,
        processNo: divNorm,
        category: 'C',
        itemCode: 'C2',
        value: c2Val,
        parentItemId: genC1('PF', divNorm),
        createdAt: now,
      });
    }

    // C3 — 요구사항 (dedup: div|c2|c3)
    if (c3Val) {
      const c3k = `${divNorm}|${c2Val}|${c3Val}`;
      if (!c3Seen.has(c3k)) {
        c3Seen.add(c3k);
        const c2Seq = c2SeqByDiv.get(divNorm) || 1;
        const c3Seq = (c3SeqByC2.get(lastC2Id) || 0) + 1;
        c3SeqByC2.set(lastC2Id, c3Seq);
        flatData.push({
          id: genC3('PF', divNorm, c2Seq, c3Seq),
          processNo: divNorm,
          category: 'C',
          itemCode: 'C3',
          value: c3Val,
          parentItemId: lastC2Id,
          createdAt: now,
        });
      }
    }

    // C4 — 고장영향 (dedup: div|c4)
    if (c4Val) {
      const c4k = `${divNorm}|${c4Val}`;
      if (!c4Seen.has(c4k)) {
        c4Seen.add(c4k);
        const c4Seq = (c4SeqByDiv.get(divNorm) || 0) + 1;
        c4SeqByDiv.set(divNorm, c4Seq);
        const c2Seq = c2SeqByDiv.get(divNorm) || 1;
        const c3Seq = c3SeqByC2.get(lastC2Id) || 1;
        flatData.push({
          id: genC4('PF', divNorm, c2Seq, c3Seq, c4Seq),
          processNo: divNorm,
          category: 'C',
          itemCode: 'C4',
          value: c4Val,
          parentItemId: lastC2Id,
          createdAt: now,
        });
      }
    }

    lastDiv = div;
    lastC2 = c2Val;
  }

  return flatData;
}

/**
 * Sheet 1: L2 통합(A1-A6) → A1~A6 FlatData
 * Headers: A1.공정번호 | A2.공정명 | A3.공정기능 | A4.제품특성 | 특별특성 | A5.고장형태 | A6.검출관리
 */
function parseL2Sheet(ws: ExcelJS.Worksheet): ImportedFlatData[] {
  const flatData: ImportedFlatData[] = [];
  const now = new Date();

  // dedup 추적
  const a1Seen = new Set<string>();
  const a3SeqByPno = new Map<string, number>();
  const a4Key = new Set<string>(); // pno|char
  const a4SeqByPno = new Map<string, number>();
  const a5Key = new Set<string>(); // pno|fm
  const a5SeqByPno = new Map<string, number>();
  const a6Key = new Set<string>();
  const a6SeqByPno = new Map<string, number>();

  // A4 ID 추적 (A5.parentItemId 설정용)
  const lastA4ByPno = new Map<string, string>(); // pno → last A4.id

  let lastPno = '';
  let lastPname = '';
  let lastA3 = '';

  for (let r = 2; r <= ws.rowCount; r++) {
    const pno = cellStr(ws, r, 1) || lastPno;
    const pname = cellStr(ws, r, 2) || lastPname;
    const a3val = cellStr(ws, r, 3) || lastA3;
    const a4val = cellStr(ws, r, 4);
    const sc = cellStr(ws, r, 5); // 특별특성
    const a5val = cellStr(ws, r, 6);
    const a6val = cellStr(ws, r, 7);

    if (!pno) continue;
    const pn = pnoNum(pno);

    // A1 — 공정번호 (중복 제거)
    if (!a1Seen.has(pno)) {
      a1Seen.add(pno);
      flatData.push({
        id: genA1('PF', pn),
        processNo: pno,
        category: 'A',
        itemCode: 'A1',
        value: pno,
        createdAt: now,
      });
      // A2 — 공정명
      flatData.push({
        id: `${genA1('PF', pn)}-N`,
        processNo: pno,
        category: 'A',
        itemCode: 'A2',
        value: pname,
        parentItemId: genA1('PF', pn),
        createdAt: now,
      });
      // A3 — 공정기능
      if (a3val) {
        const a3Seq = (a3SeqByPno.get(pno) || 0) + 1;
        a3SeqByPno.set(pno, a3Seq);
        flatData.push({
          id: genA3('PF', pn, a3Seq),
          processNo: pno,
          category: 'A',
          itemCode: 'A3',
          value: a3val,
          parentItemId: genA1('PF', pn),
          createdAt: now,
        });
      }
    }

    // A4 — 제품특성 (dedup: pno|char)
    if (a4val) {
      const key = `${pno}|${a4val}`;
      if (!a4Key.has(key)) {
        a4Key.add(key);
        const seq = (a4SeqByPno.get(pno) || 0) + 1;
        a4SeqByPno.set(pno, seq);
        const a4Id = genA4('PF', pn, seq);
        flatData.push({
          id: a4Id,
          processNo: pno,
          category: 'A',
          itemCode: 'A4',
          value: a4val,
          specialChar: sc || undefined,
          parentItemId: genA3('PF', pn, a3SeqByPno.get(pno) || 1),
          createdAt: now,
        });
        lastA4ByPno.set(pno, a4Id);
      }
    }

    // A5 — 고장형태 (dedup: pno|fm, parentItemId→A4)
    if (a5val) {
      const key = `${pno}|${a5val}`;
      if (!a5Key.has(key)) {
        a5Key.add(key);
        const seq = (a5SeqByPno.get(pno) || 0) + 1;
        a5SeqByPno.set(pno, seq);
        flatData.push({
          id: genA5('PF', pn, seq),
          processNo: pno,
          category: 'A',
          itemCode: 'A5',
          value: a5val,
          parentItemId: lastA4ByPno.get(pno) || genA4('PF', pn, 1),
          createdAt: now,
        });
      }
    }

    // A6 — 검출관리 (dedup: pno|dc)
    if (a6val) {
      const key = `${pno}|${a6val}`;
      if (!a6Key.has(key)) {
        a6Key.add(key);
        const seq = (a6SeqByPno.get(pno) || 0) + 1;
        a6SeqByPno.set(pno, seq);
        flatData.push({
          id: genA6('PF', pn, seq),
          processNo: pno,
          category: 'A',
          itemCode: 'A6',
          value: a6val,
          parentItemId: genA1('PF', pn),
          createdAt: now,
        });
      }
    }

    lastPno = pno;
    lastPname = pname;
    lastA3 = a3val;
  }

  return flatData;
}

/**
 * Sheet 2: L3 통합(B1-B5) → B1~B5 FlatData
 * Headers: 공정번호 | 4M | 작업요소(B1) | 요소기능(B2) | 공정특성(B3) | 특별특성 | 고장원인(B4) | 예방관리(B5)
 */
function parseL3Sheet(ws: ExcelJS.Worksheet): ImportedFlatData[] {
  const flatData: ImportedFlatData[] = [];
  const now = new Date();

  // dedup 추적
  const b1Key = new Set<string>(); // pno|m4|we
  const b1SeqByPnoM4 = new Map<string, number>();
  const b3Key = new Set<string>(); // pno|m4|we|b3val — B3 dedup
  const b4Key = new Set<string>(); // pno|m4|we|fc
  const b4SeqByB1 = new Map<string, number>();
  const b5Key = new Set<string>();

  // B1 ID 추적 (B2/B3/B4 parentItemId용)
  const b1IdMap = new Map<string, string>(); // pno|m4|we → B1.id
  const b3IdMap = new Map<string, string>(); // pno|m4|we → B3.id (마지막)
  const b3SeqByB1 = new Map<string, number>();

  let lastPno = '';
  let lastM4 = '';
  let lastWe = '';

  for (let r = 2; r <= ws.rowCount; r++) {
    const pno = cellStr(ws, r, 1) || lastPno;
    const m4 = (cellStr(ws, r, 2) || lastM4).toUpperCase();
    const we = cellStr(ws, r, 3) || lastWe;
    const b2val = cellStr(ws, r, 4);
    const b3val = cellStr(ws, r, 5);
    const sc = cellStr(ws, r, 6);
    const b4val = cellStr(ws, r, 7);
    const b5val = cellStr(ws, r, 8);

    if (!pno || !we) continue;
    const pn = pnoNum(pno);
    const m4Norm = ['MN', 'MC', 'IM', 'EN'].includes(m4) ? m4 : 'MN';

    // B1 — 작업요소 (dedup: pno|m4|we)
    const b1k = `${pno}|${m4Norm}|${we}`;
    if (!b1Key.has(b1k)) {
      b1Key.add(b1k);
      const m4Key = `${pno}|${m4Norm}`;
      const seq = (b1SeqByPnoM4.get(m4Key) || 0) + 1;
      b1SeqByPnoM4.set(m4Key, seq);
      const b1Id = genB1('PF', pn, m4Norm, seq);
      b1IdMap.set(b1k, b1Id);

      flatData.push({
        id: b1Id,
        processNo: pno,
        category: 'B',
        itemCode: 'B1',
        value: we,
        m4: m4Norm,
        parentItemId: genA1('PF', pn),
        createdAt: now,
      });

      // B2 — 요소기능 (B1마다 1건, parentItemId→B1)
      if (b2val) {
        flatData.push({
          id: genB2('PF', pn, m4Norm, seq),
          processNo: pno,
          category: 'B',
          itemCode: 'B2',
          value: b2val,
          m4: m4Norm,
          parentItemId: b1Id,
          createdAt: now,
        });
      }
    }

    const b1Id = b1IdMap.get(b1k) || '';
    const m4Key = `${pno}|${m4Norm}`;
    const b1Seq = b1SeqByPnoM4.get(m4Key) || 1;

    // B3 — 공정특성 (dedup: pno|m4|we|b3val, parentItemId→B1)
    if (b3val) {
      const b3k = `${b1k}|${b3val}`;
      if (!b3Key.has(b3k)) {
        b3Key.add(b3k);
        const cSeq = (b3SeqByB1.get(b1Id) || 0) + 1;
        b3SeqByB1.set(b1Id, cSeq);
        const b3Id = genB3('PF', pn, m4Norm, b1Seq, cSeq);
        b3IdMap.set(b1k, b3Id);
        flatData.push({
          id: b3Id,
          processNo: pno,
          category: 'B',
          itemCode: 'B3',
          value: b3val,
          specialChar: sc || undefined,
          m4: m4Norm,
          parentItemId: b1Id,
          createdAt: now,
        });
      } else {
        // B3 중복이지만 b3IdMap 업데이트 (B4.parentItemId용)
        // b3IdMap은 이미 설정됨 — 갱신 불필요
      }
    }

    // B4 — 고장원인 (dedup: pno|m4|we|fc, parentItemId→B3)
    if (b4val) {
      const b4k = `${b1k}|${b4val}`;
      if (!b4Key.has(b4k)) {
        b4Key.add(b4k);
        const kSeq = (b4SeqByB1.get(b1Id) || 0) + 1;
        b4SeqByB1.set(b1Id, kSeq);
        const b3Id = b3IdMap.get(b1k) || genB3('PF', pn, m4Norm, b1Seq, 1);
        flatData.push({
          id: genB4('PF', pn, m4Norm, b1Seq, kSeq),
          processNo: pno,
          category: 'B',
          itemCode: 'B4',
          value: b4val,
          m4: m4Norm,
          parentItemId: b3Id, // B4→B3 (NOT B1!)
          belongsTo: we,
          createdAt: now,
        });
      }
    }

    // B5 — 예방관리 (dedup: pno|m4|we|b5)
    if (b5val) {
      const b5k = `${b1k}|${b5val}`;
      if (!b5Key.has(b5k)) {
        b5Key.add(b5k);
        const vSeq = b5Key.size;
        flatData.push({
          id: `PF-L3-${String(pn).padStart(3, '0')}-${m4Norm}-${String(b1Seq).padStart(3, '0')}-V-${String(vSeq).padStart(3, '0')}`,
          processNo: pno,
          category: 'B',
          itemCode: 'B5',
          value: b5val,
          m4: m4Norm,
          parentItemId: b1IdMap.get(b1k) || '',
          createdAt: now,
        });
      }
    }

    lastPno = pno;
    lastM4 = m4;
    lastWe = we;
  }

  return flatData;
}

/**
 * Sheet 3: FC 고장사슬 → chains
 * Headers: FE구분 | FE(고장영향) | L2-1.공정번호 | FM(고장형태) | 4M | 작업요소(WE) | FC(고장원인) | B5.예방관리 | A6.검출관리 | O | D | AP
 */
function parseFCSheet(ws: ExcelJS.Worksheet): ChainEntry[] {
  const chains: ChainEntry[] = [];

  let lastScope = '';
  let lastFe = '';

  for (let r = 2; r <= ws.rowCount; r++) {
    const scope = cellStr(ws, r, 1) || lastScope;
    const fe = cellStr(ws, r, 2) || lastFe;
    const pno = cellStr(ws, r, 3);
    const fm = cellStr(ws, r, 4);
    const m4 = cellStr(ws, r, 5);
    const we = cellStr(ws, r, 6);
    const fc = cellStr(ws, r, 7);
    const pc = cellStr(ws, r, 8);
    const dc = cellStr(ws, r, 9);
    const o = cellStr(ws, r, 10);
    const d = cellStr(ws, r, 11);
    const ap = cellStr(ws, r, 12);

    if (!pno || !fc) continue;

    chains.push({
      processNo: pno,
      m4: m4.toUpperCase() || 'MN',
      workElement: we,
      fmValue: fm,
      fcValue: fc,
      feValue: fe,
      feScope: scope === 'YP' || scope === '자사' ? 'YP' :
               scope === 'SP' || scope === '고객' ? 'SP' : 'USER',
      pcValue: pc,
      dcValue: dc,
      s: null, // S is in L1 sheet (per FE)
      o: parseInt(o, 10) || null,
      d: parseInt(d, 10) || null,
      ap,
    });

    lastScope = scope;
    lastFe = fe;
  }

  return chains;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fmeaId,
      filePath,
      l1Name,
      masterJsonPath: bodyMasterJsonPath,
      registerProject,
      projectName,
    } = body as {
      fmeaId?: string;
      filePath?: string;
      l1Name?: string;
      masterJsonPath?: string;
      registerProject?: boolean;
      projectName?: string;
    };

    // 1. 입력 검증
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'fmeaId가 없거나 유효하지 않습니다' },
        { status: 400 }
      );
    }

    const resolvedPath = path.resolve(process.cwd(), filePath || '');
    const projectRoot = process.cwd();
    if (!resolvedPath.startsWith(projectRoot)) {
      return NextResponse.json(
        { success: false, error: '프로젝트 외부 파일은 접근할 수 없습니다' },
        { status: 400 }
      );
    }
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { success: false, error: `파일이 존재하지 않습니다: ${filePath}` },
        { status: 400 }
      );
    }

    const normalizedFmeaId = normalizeFmeaId(fmeaId);

    /** 프로젝트 스키마에 L2가 없으면 최초 Import → 마스터 JSON(체인 보강)만 허용 */
    const baseUrl = getBaseDatabaseUrl();
    let isFirstAtomicImport = !baseUrl;
    if (baseUrl) {
      try {
        const schema = getProjectSchemaName(normalizedFmeaId);
        await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
        const prisma = getPrismaForSchema(schema);
        if (prisma && /^[a-z][a-z0-9_]*$/.test(schema)) {
          await prisma.$executeRawUnsafe(`SET search_path TO ${schema}, public`);
          const l2Count = await prisma.l2Structure.count({ where: { fmeaId: normalizedFmeaId } });
          isFirstAtomicImport = l2Count === 0;
        } else {
          isFirstAtomicImport = true;
        }
      } catch (e) {
        console.warn('[import-excel-file] L2 카운트 실패 — 마스터 JSON 생략(엑셀+FK-only):', e);
        isFirstAtomicImport = false;
      }
    }

    const bodyMasterJsonPathTrim =
      typeof bodyMasterJsonPath === 'string' ? bodyMasterJsonPath.trim() : '';
    /** 최초 Import 또는 masterJsonPath 명시 시 마스터 체인·골든 가지치기 허용 */
    const shouldLoadMasterJson = isFirstAtomicImport || Boolean(bodyMasterJsonPathTrim);

    if (registerProject === true) {
      try {
        const { createOrUpdateProject } = await import('@/lib/services/fmea-project-service');
        await createOrUpdateProject({
          fmeaId: normalizedFmeaId,
          fmeaType: 'P',
          project: projectName ? { projectName } : undefined,
        });
        console.info(`[import-excel-file] fmea_projects 등록: ${normalizedFmeaId}`);
      } catch (regErr) {
        console.error('[import-excel-file] registerProject 실패:', regErr);
        return NextResponse.json(
          { success: false, error: regErr instanceof Error ? regErr.message : '프로젝트 등록 실패' },
          { status: 500 }
        );
      }
    }

    console.info(`[import-excel-file] 시작: fmeaId=${normalizedFmeaId}, file=${resolvedPath}`);

    // 2. ExcelJS 로드
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(resolvedPath);

    const sheets = workbook.worksheets;
    console.info(`[import-excel-file] 시트: ${sheets.map(s => s.name).join(', ')}`);

    if (sheets.length < 4) {
      return NextResponse.json({
        success: false,
        error: `시트가 4개 미만입니다 (${sheets.length}개). L1/L2/L3/FC 시트가 필요합니다.`,
      });
    }

    // 3. 시트별 파싱
    const l1Flat = parseL1Sheet(sheets[0]); // C1~C4
    const l2Flat = parseL2Sheet(sheets[1]); // A1~A6
    const l3Flat = parseL3Sheet(sheets[2]); // B1~B5
    const fcSheetChains = parseFCSheet(sheets[3]); // FC sheet chains (보조)

    const flatData: ImportedFlatData[] = [...l1Flat, ...l2Flat, ...l3Flat];

    // 4. ★ 체인 생성: B4×A5→C4 조합 + FC시트 보충 + 마스터 JSON 보충
    //    FC시트는 58건만 제공 (골든=111), 마스터 JSON에서 완전한 체인 로드
    let masterChains: ChainEntry[] = [];

    // 4-1. FC시트 체인 (PC/DC/SOD 보유)
    const fcSheetLookup = new Map<string, ChainEntry>();
    for (const ch of fcSheetChains) {
      const key = `${ch.processNo}|${ch.fmValue}|${ch.fcValue}`;
      fcSheetLookup.set(key, ch);
    }

    // 4-2. B4×A5 매칭으로 체인 생성
    const a5Items = l2Flat.filter(d => d.itemCode === 'A5');
    const b4Items = l3Flat.filter(d => d.itemCode === 'B4');
    const c4Items = l1Flat.filter(d => d.itemCode === 'C4');

    // A5 by processNo
    const a5ByPno = new Map<string, ImportedFlatData[]>();
    for (const a5 of a5Items) {
      const list = a5ByPno.get(a5.processNo) || [];
      list.push(a5);
      a5ByPno.set(a5.processNo, list);
    }

    // B4 → chains: each B4 × each A5 in same processNo
    const chainSet = new Set<string>();
    for (const b4 of b4Items) {
      const fms = a5ByPno.get(b4.processNo) || [];
      if (fms.length === 0) continue;

      for (const fm of fms) {
        const key = `${b4.processNo}|${fm.value}|${b4.value}`;
        if (chainSet.has(key)) continue;
        chainSet.add(key);

        // FC시트에서 PC/DC/SOD 보충
        const fcInfo = fcSheetLookup.get(key);
        // FE 매칭: FC시트에서 찾거나 첫 번째 C4 사용
        const feValue = fcInfo?.feValue || (c4Items.length > 0 ? c4Items[0].value : '');
        const feScope = fcInfo?.feScope || 'YP';

        masterChains.push({
          processNo: b4.processNo,
          m4: b4.m4 || 'MN',
          workElement: b4.belongsTo || '',
          fmValue: fm.value,
          fcValue: b4.value,
          feValue,
          feScope,
          pcValue: fcInfo?.pcValue || '',
          dcValue: fcInfo?.dcValue || '',
          s: fcInfo?.s || null,
          o: fcInfo?.o || null,
          d: fcInfo?.d || null,
          ap: fcInfo?.ap || '',
        });
      }
    }

    console.info(`[import-excel-file] B4×A5 체인: ${masterChains.length}건 (FC시트 보충: ${fcSheetChains.length}건)`);

    let resolvedMasterJsonPath: string | null = null;
    let masterJsonTried: string[] = [];
    let loadedMasterJson: MasterJSON | null = null;
    let jsonMatchesProject = false;
    let useGoldenPruning = false;

    if (shouldLoadMasterJson) {
    // 4-3. 프로젝트별 마스터 JSON (data/master-fmea/{fmeaId}-golden.json → {fmeaId}.json)
    // ★ 타 fmeaId(pfm26-m066 등) 자동 폴백 금지 — DB/체인 오염 방지 (Rule 0.8.1)
    const resolved = resolveMasterJsonPath(
      projectRoot,
      normalizedFmeaId,
      bodyMasterJsonPathTrim || undefined
    );
    resolvedMasterJsonPath = resolved.path;
    masterJsonTried = resolved.tried;

    if (resolvedMasterJsonPath) {
      try {
        loadedMasterJson = JSON.parse(fs.readFileSync(resolvedMasterJsonPath, 'utf-8')) as MasterJSON;
      } catch (e) {
        console.warn('[import-excel-file] 마스터 JSON 파싱 실패:', e);
      }
    }

    jsonMatchesProject = masterJsonMatchesFmeaId(loadedMasterJson, normalizedFmeaId);

    if (
      loadedMasterJson?.chains &&
      loadedMasterJson.chains.length > 0 &&
      jsonMatchesProject
    ) {
      console.info(
        `[import-excel-file] 마스터 체인 ${loadedMasterJson.chains.length}건 사용 (파일: ${resolvedMasterJsonPath}, B4×A5 ${masterChains.length}건 대체)`
      );
      const enrichedChains: ChainEntry[] = loadedMasterJson.chains.map(ch => {
        const key = `${ch.processNo}|${ch.fmValue}|${ch.fcValue}`;
        const fcInfo = fcSheetLookup.get(key);
        return {
          processNo: ch.processNo,
          m4: ch.m4 || 'MN',
          workElement: ch.workElement || '',
          fmValue: ch.fmValue,
          fcValue: ch.fcValue,
          feValue: ch.feValue,
          feScope: ch.feScope || 'YP',
          pcValue: fcInfo?.pcValue || ch.pcValue || '',
          dcValue: fcInfo?.dcValue || ch.dcValue || '',
          s: ch.s || null,
          o: fcInfo?.o || ch.o || null,
          d: fcInfo?.d || ch.d || null,
          ap: fcInfo?.ap || ch.ap || '',
          id: ch.id,
          fmId: ch.fmId,
          fcId: ch.fcId,
          feId: ch.feId,
        };
      });
      masterChains = enrichedChains;
    } else {
      if (loadedMasterJson?.chains?.length && !jsonMatchesProject) {
        console.warn(
          `[import-excel-file] 마스터 JSON의 fmeaId가 ${normalizedFmeaId}와 불일치 — 골든 체인 미적용 (B4×A5 유지)`
        );
      } else if (!resolvedMasterJsonPath) {
        console.info(
          `[import-excel-file] 프로젝트 마스터 JSON 없음 — B4×A5+FC시트만 사용. 시도 경로: ${masterJsonTried.join(' | ')}`
        );
      }
    }

    useGoldenPruning = jsonMatchesProject && !!resolvedMasterJsonPath && !!loadedMasterJson?.atomicDB;

    // 5-0. ★ 동일 fmeaId 마스터 JSON이 있을 때만 B4/B3 가지치기 (엑셀 과잉 행 정리)
    if (masterChains.length > 0 && useGoldenPruning) {
      // 방법 1: fcId UUID 직접 매칭 (가장 정확)
      const chainFcIds = new Set<string>();
      for (const ch of masterChains) {
        if (ch.fcId) chainFcIds.add(ch.fcId);
      }

      // 방법 2: processNo|m4|workElement|fcValue 키 매칭 (fcId 없는 체인용 폴백)
      const chainFcTextKeys = new Set<string>();
      for (const ch of masterChains) {
        const fc = (ch.fcValue || '').trim();
        const we = (ch.workElement || '').trim();
        chainFcTextKeys.add(`${ch.processNo}|${ch.m4}|${we}|${fc}`);
        chainFcTextKeys.add(`${String(parseInt(ch.processNo, 10) || 0)}|${ch.m4}|${we}|${fc}`);
      }

      const strictB4Prune =
        chainFcIds.size > 0 &&
        jsonMatchesProject &&
        masterChains.every((ch) => Boolean((ch as ChainEntry).fcId));

      const beforeB4 = flatData.filter(d => d.itemCode === 'B4').length;
      let removed = 0;
      if (strictB4Prune) {
        for (let i = flatData.length - 1; i >= 0; i--) {
          const d = flatData[i];
          if (d.itemCode !== 'B4') continue;
          if (chainFcIds.has(d.id)) continue;
          flatData.splice(i, 1);
          removed++;
        }
        if (removed > 0) {
          console.info(
            `[import-excel-file] B4 strict 가지치기(fcId 전부 보유 체인): ${beforeB4}→${beforeB4 - removed} (-${removed}건)`
          );
        }
      } else {
        for (let i = flatData.length - 1; i >= 0; i--) {
          const d = flatData[i];
          if (d.itemCode !== 'B4') continue;
          if (chainFcIds.has(d.id)) continue;
          const val = (d.value || '').trim();
          const we = (d.belongsTo || '').trim();
          const key1 = `${d.processNo}|${d.m4 || ''}|${we}|${val}`;
          const key2 = `${String(parseInt(d.processNo, 10) || 0)}|${d.m4 || ''}|${we}|${val}`;
          if (chainFcTextKeys.has(key1) || chainFcTextKeys.has(key2)) continue;
          flatData.splice(i, 1);
          removed++;
        }
        if (removed > 0) {
          console.info(`[import-excel-file] B4 가지치기: ${beforeB4}→${beforeB4 - removed} (-${removed}건, 골든 체인 미참조 FC 제거)`);
        }
      }

      // B3 가지치기: 마스터 L3Function ID + FC→L3F 매핑으로 정밀 재할당
      try {
        if (!loadedMasterJson?.atomicDB) {
          throw new Error('B3 가지치기: atomicDB 없음');
        }
        const goldenJsonForB3 = loadedMasterJson;
        const goldenL3FIds = new Set<string>();
        if (goldenJsonForB3.atomicDB?.l3Functions) {
          for (const f of goldenJsonForB3.atomicDB.l3Functions) {
            goldenL3FIds.add(f.id);
          }
        }
        const goldenFcToL3F = new Map<string, string>();
        if (goldenJsonForB3.atomicDB?.failureCauses) {
          for (const fc of goldenJsonForB3.atomicDB.failureCauses) {
            if (fc.l3FuncId) goldenFcToL3F.set(fc.id, fc.l3FuncId);
          }
        }

        if (goldenL3FIds.size > 0) {
          const b3ToRemoveIds = new Set<string>();
          for (const d of flatData) {
            if (d.itemCode === 'B3' && !goldenL3FIds.has(d.id)) {
              b3ToRemoveIds.add(d.id);
            }
          }

          if (b3ToRemoveIds.size > 0) {
            // B3→B1 매핑 (폴백용)
            const b3ParentMap = new Map<string, string>(); // b3Id → b1Id
            const b3sByB1 = new Map<string, string[]>(); // b1Id → [valid b3Ids]
            for (const d of flatData) {
              if (d.itemCode === 'B3') {
                b3ParentMap.set(d.id, d.parentItemId || '');
                if (!b3ToRemoveIds.has(d.id)) {
                  const b1Id = d.parentItemId || '';
                  const list = b3sByB1.get(b1Id) || [];
                  list.push(d.id);
                  b3sByB1.set(b1Id, list);
                }
              }
            }

            // orphan B4의 parentItemId 재할당
            let reassigned = 0;
            for (const d of flatData) {
              if (d.itemCode !== 'B4') continue;
              if (!d.parentItemId || !b3ToRemoveIds.has(d.parentItemId)) continue;
              // 방법 1: 골든 FC→L3F 정밀 매핑
              const goldenL3FId = goldenFcToL3F.get(d.id);
              if (goldenL3FId && goldenL3FIds.has(goldenL3FId)) {
                d.parentItemId = goldenL3FId;
                reassigned++;
                continue;
              }
              // 방법 2: 같은 B1 내 살아남은 B3 중 첫번째 (dedup 충돌 가능성 있지만 FC 보존 우선)
              const oldB3 = d.parentItemId;
              const b1Id = b3ParentMap.get(oldB3) || '';
              const siblings = b3sByB1.get(b1Id) || [];
              if (siblings.length > 0) {
                d.parentItemId = siblings[0];
                reassigned++;
              }
            }

            const beforeB3 = flatData.filter(d => d.itemCode === 'B3').length;
            for (let i = flatData.length - 1; i >= 0; i--) {
              if (flatData[i].itemCode === 'B3' && b3ToRemoveIds.has(flatData[i].id)) {
                flatData.splice(i, 1);
              }
            }
            const afterB3 = flatData.filter(d => d.itemCode === 'B3').length;
            console.info(`[import-excel-file] B3 가지치기: ${beforeB3}→${afterB3} (-${b3ToRemoveIds.size}건), B4 부모 재할당: ${reassigned}건`);
          }
        }
      } catch (e) {
        console.warn('[import-excel-file] B3 가지치기 실패:', e);
      }
    }

    } else {
      console.info(
        '[import-excel-file] 재Import — 마스터 JSON·골든 가지치기 생략(L2 존재·masterJsonPath 없음). 엑셀→buildAtomicFromFlat→save-from-import'
      );
    }

    // 항목별 카운트
    const itemCounts: Record<string, number> = {};
    for (const item of flatData) {
      const code = item.itemCode || '?';
      itemCounts[code] = (itemCounts[code] || 0) + 1;
    }

    console.info(`[import-excel-file] 파싱 완료:`);
    console.info(`  L1(C): ${l1Flat.length}건 — C1=${itemCounts['C1']||0} C2=${itemCounts['C2']||0} C3=${itemCounts['C3']||0} C4=${itemCounts['C4']||0}`);
    console.info(`  L2(A): ${l2Flat.length}건 — A1=${itemCounts['A1']||0} A2=${itemCounts['A2']||0} A3=${itemCounts['A3']||0} A4=${itemCounts['A4']||0} A5=${itemCounts['A5']||0} A6=${itemCounts['A6']||0}`);
    console.info(`  L3(B): ${l3Flat.length}건 — B1=${itemCounts['B1']||0} B2=${itemCounts['B2']||0} B3=${itemCounts['B3']||0} B4=${itemCounts['B4']||0} B5=${itemCounts['B5']||0}`);
    console.info(`  Chains: ${masterChains.length}건`);
    console.info(`  Total flatData: ${flatData.length}건`);

    // 5. save-from-import에 전달
    const saveUrl = `${request.nextUrl.origin}/api/fmea/save-from-import`;
    const saveResp = await fetch(saveUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fmeaId: normalizedFmeaId,
        flatData,
        l1Name: l1Name || 'au bump',
        failureChains: masterChains,
      }),
    });
    const saveResult = await saveResp.json();

    // 6. 결과 반환
    return NextResponse.json({
      success: saveResult.success,
      fmeaId: normalizedFmeaId,
      parsing: {
        sheets: sheets.map(s => s.name),
        flatDataTotal: flatData.length,
        chainsTotal: masterChains.length,
        itemCounts,
        masterJsonPath: resolvedMasterJsonPath,
        masterJsonTried,
        masterJsonUsedChains: Boolean(
          shouldLoadMasterJson && loadedMasterJson?.chains?.length && jsonMatchesProject
        ),
        goldenPruningApplied: useGoldenPruning,
        isFirstAtomicImport,
        shouldLoadMasterJson,
      },
      saveResult: {
        success: saveResult.success,
        error: saveResult.error,
        diagnostics: saveResult.buildResult?.diagnostics,
        atomicCounts: saveResult.atomicCounts,
        verified: saveResult.verified,
      },
    });

  } catch (e: unknown) {
    console.error('[import-excel-file] error:', e);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(e) },
      { status: 500 }
    );
  }
}
