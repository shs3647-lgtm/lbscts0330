/**
 * @file route.ts — Atomic Cell Save API
 * @description 셀 단위 즉시 DB 저장 / 행 추가 / 행 삭제 + FK CASCADE
 *
 * PATCH  /api/fmea/atom-cell — 셀 단위 수정 (SOD→AP 자동 재계산)
 * POST   /api/fmea/atom-cell — 새 행 추가 (FC/FM/FE 동적 생성 + FailureLink)
 * DELETE /api/fmea/atom-cell — 행 삭제 + FK CASCADE (FailureLink → RiskAnalysis)
 *
 * ★ Rule 0: 프로젝트 스키마 SSoT
 * ★ Rule 1.7: ID 기반 FK만 허용
 * ★ Rule 16: snake_case 테이블명 사용
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

// ═══════════════════════════════════════════════════════
// 허용 테이블 화이트리스트 (SQL Injection 방지)
// ═══════════════════════════════════════════════════════
const ALLOWED_TABLES: Record<string, { columns: string[]; parentFk?: string }> = {
  l1_structures:          { columns: ['name'] },
  l2_structures:          { columns: ['name', '"processNo"'] },
  l3_structures:          { columns: ['name', 'm4'] },
  l1_functions:           { columns: ['category', '"functionName"', 'requirement'] },
  l2_functions:           { columns: ['"functionName"', '"productChar"', '"specialChar"'] },
  l3_functions:           { columns: ['"functionName"', '"processChar"', '"specialChar"', '"processCharName"'] },
  process_product_chars:  { columns: ['name', '"specialChar"'] },
  failure_modes:          { columns: ['mode'], parentFk: '"l2StructId"' },
  failure_effects:        { columns: ['effect', 'severity'], parentFk: '"l1FuncId"' },
  failure_causes:         { columns: ['cause', 'occurrence'], parentFk: '"l3FuncId"' },
  failure_links:          { columns: ['"fmId"', '"feId"', '"fcId"'] },
  risk_analyses:          { columns: ['severity', 'occurrence', 'detection', 'ap', '"preventionControl"', '"detectionControl"', '"dcSourceType"', '"dcSourceId"', '"pcSourceType"', '"pcSourceId"'], parentFk: '"linkId"' },
  optimizations:          { columns: ['"recommendedAction"', 'responsible', '"targetDate"', '"actionTaken"', '"completionDate"', '"newSeverity"', '"newOccurrence"', '"newDetection"', '"newAp"'] },
};

// SOD 필드 — AP 자동 재계산 트리거
const SOD_FIELDS = ['severity', 'occurrence', 'detection'];

// ═══════════════════════════════════════════════════════
// AP 계산 (AIAG-VDA 1st Edition)
// ═══════════════════════════════════════════════════════
const AP_TABLE: { s: string; o: string; d: ('H' | 'M' | 'L')[] }[] = [
  { s: '9-10', o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '6-7',  d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '4-5',  d: ['H', 'H', 'H', 'M'] },
  { s: '9-10', o: '2-3',  d: ['H', 'M', 'L', 'L'] },
  { s: '9-10', o: '1',    d: ['L', 'L', 'L', 'L'] },
  { s: '7-8',  o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '7-8',  o: '6-7',  d: ['H', 'H', 'H', 'M'] },
  { s: '7-8',  o: '4-5',  d: ['H', 'M', 'M', 'M'] },
  { s: '7-8',  o: '2-3',  d: ['M', 'M', 'L', 'L'] },
  { s: '7-8',  o: '1',    d: ['L', 'L', 'L', 'L'] },
  { s: '4-6',  o: '8-10', d: ['H', 'H', 'M', 'M'] },
  { s: '4-6',  o: '6-7',  d: ['M', 'M', 'M', 'L'] },
  { s: '4-6',  o: '4-5',  d: ['M', 'L', 'L', 'L'] },
  { s: '4-6',  o: '2-3',  d: ['L', 'L', 'L', 'L'] },
  { s: '4-6',  o: '1',    d: ['L', 'L', 'L', 'L'] },
  { s: '2-3',  o: '8-10', d: ['M', 'M', 'L', 'L'] },
  { s: '2-3',  o: '6-7',  d: ['L', 'L', 'L', 'L'] },
  { s: '2-3',  o: '4-5',  d: ['L', 'L', 'L', 'L'] },
  { s: '2-3',  o: '2-3',  d: ['L', 'L', 'L', 'L'] },
  { s: '2-3',  o: '1',    d: ['L', 'L', 'L', 'L'] },
];

function calculateAP(s: number, o: number, d: number): 'H' | 'M' | 'L' | '' {
  if (s === 0 || o === 0 || d === 0) return '';
  if (s === 1) return 'L';

  const sRange = s >= 9 ? '9-10' : s >= 7 ? '7-8' : s >= 4 ? '4-6' : '2-3';
  const oRange = o >= 8 ? '8-10' : o >= 6 ? '6-7' : o >= 4 ? '4-5' : o >= 2 ? '2-3' : '1';
  const dIdx = d >= 7 ? 0 : d >= 5 ? 1 : d >= 2 ? 2 : 3;

  const row = AP_TABLE.find(r => r.s === sRange && r.o === oRange);
  return row ? row.d[dIdx] : 'L';
}

// ═══════════════════════════════════════════════════════
// 공통 유틸
// ═══════════════════════════════════════════════════════

/** 컬럼명 안전화 — 이미 따옴표면 그대로, 아니면 따옴표 감싸기 */
function safeCol(col: string): string {
  return col.startsWith('"') ? col : `"${col}"`;
}

/** 입력 검증 */
function validateBase(body: Record<string, unknown>): { error?: string; fmeaId?: string; table?: string } {
  const fmeaId = String(body.fmeaId || '');
  const table = String(body.table || '');

  if (!fmeaId) return { error: 'fmeaId is required' };
  if (!isValidFmeaId(fmeaId)) return { error: 'Invalid fmeaId format' };
  if (!table) return { error: 'table is required' };
  if (!ALLOWED_TABLES[table]) return { error: `허용되지 않은 테이블: ${table}` };

  return { fmeaId, table };
}

/** 프로젝트 스키마 Prisma 클라이언트 획득 */
async function getProjectPrisma(fmeaId: string) {
  const schema = getProjectSchemaName(fmeaId);
  const baseUrl = getBaseDatabaseUrl();
  await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
  const prisma = getPrismaForSchema(schema);
  if (!prisma) return { error: 'DB 연결 실패', schema: '', prisma: null as never };

  // search_path 설정
  await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`);
  return { prisma, schema, error: null };
}

// ═══════════════════════════════════════════════════════
// PATCH — 셀 단위 수정
// ═══════════════════════════════════════════════════════
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, fmeaId, table } = validateBase(body);
    if (error || !fmeaId || !table) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const recordId = String(body.recordId || '');
    const field = String(body.field || '');
    const value = body.value;

    if (!recordId) return NextResponse.json({ success: false, error: 'recordId is required' }, { status: 400 });
    if (!field) return NextResponse.json({ success: false, error: 'field is required' }, { status: 400 });

    // 필드 화이트리스트 검증
    const allowed = ALLOWED_TABLES[table];
    const normalizedField = field.startsWith('"') ? field : `"${field}"`;
    if (!allowed.columns.includes(field) && !allowed.columns.includes(normalizedField)) {
      return NextResponse.json(
        { success: false, error: `허용되지 않은 필드: ${table}.${field}` },
        { status: 400 },
      );
    }

    const db = await getProjectPrisma(fmeaId);
    if (db.error) return NextResponse.json({ success: false, error: db.error }, { status: 500 });
    const { prisma, schema } = db;

    // 레코드 존재 확인
    const exists = await prisma.$queryRawUnsafe(
      `SELECT id FROM "${schema}".${table} WHERE id = $1 AND "fmeaId" = $2 LIMIT 1`,
      recordId, fmeaId,
    ) as { id: string }[];
    if (exists.length === 0) {
      return NextResponse.json({ success: false, error: '레코드를 찾을 수 없습니다' }, { status: 404 });
    }

    // UPDATE 실행
    const colRef = safeCol(field);
    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".${table} SET ${colRef} = $1, "updatedAt" = NOW() WHERE id = $2`,
      value, recordId,
    );

    // ─── SOD 변경 시 AP 자동 재계산 ─────────────────────
    let ap: string | undefined;
    if (table === 'risk_analyses' && SOD_FIELDS.includes(field)) {
      const ra = await prisma.$queryRawUnsafe(
        `SELECT severity, occurrence, detection FROM "${schema}".risk_analyses WHERE id = $1`,
        recordId,
      ) as { severity: number; occurrence: number; detection: number }[];
      if (ra.length > 0) {
        const { severity, occurrence, detection } = ra[0];
        ap = calculateAP(
          field === 'severity' ? Number(value) : severity,
          field === 'occurrence' ? Number(value) : occurrence,
          field === 'detection' ? Number(value) : detection,
        );
        await prisma.$executeRawUnsafe(
          `UPDATE "${schema}".risk_analyses SET ap = $1, "updatedAt" = NOW() WHERE id = $2`,
          ap, recordId,
        );
      }
    }

    // Optimization newS/O/D 변경 시 newAp 자동 재계산
    if (table === 'optimizations' && ['"newSeverity"', '"newOccurrence"', '"newDetection"'].includes(normalizedField)) {
      const opt = await prisma.$queryRawUnsafe(
        `SELECT "newSeverity", "newOccurrence", "newDetection" FROM "${schema}".optimizations WHERE id = $1`,
        recordId,
      ) as { newSeverity: number | null; newOccurrence: number | null; newDetection: number | null }[];
      if (opt.length > 0) {
        const ns = normalizedField === '"newSeverity"' ? Number(value) : (opt[0].newSeverity ?? 0);
        const no = normalizedField === '"newOccurrence"' ? Number(value) : (opt[0].newOccurrence ?? 0);
        const nd = normalizedField === '"newDetection"' ? Number(value) : (opt[0].newDetection ?? 0);
        const newAp = calculateAP(ns, no, nd);
        await prisma.$executeRawUnsafe(
          `UPDATE "${schema}".optimizations SET "newAp" = $1, "updatedAt" = NOW() WHERE id = $2`,
          newAp, recordId,
        );
      }
    }

    return NextResponse.json({
      success: true,
      updatedAt: new Date().toISOString(),
      ...(ap !== undefined ? { ap } : {}),
    });

  } catch (error) {
    console.error('[atom-cell] PATCH error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════
// POST — 새 행 추가
// ═══════════════════════════════════════════════════════

/** 테이블별 다음 순번 조회 후 결정론적 ID 생성 */
async function generateNextId(
  prisma: { $queryRawUnsafe: (q: string, ...a: unknown[]) => Promise<unknown> },
  schema: string,
  table: string,
  fmeaId: string,
  prefix: string,
): Promise<string> {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::bigint as cnt FROM "${schema}".${table} WHERE "fmeaId" = $1`,
    fmeaId,
  ) as { cnt: bigint }[];
  const count = Number(rows[0]?.cnt ?? 0) + 1;
  return `${prefix}-${String(count).padStart(3, '0')}`;
}

// 행 추가 가능한 테이블
const CREATABLE_TABLES: Record<string, {
  idPrefix: string;
  requiredFks: string[];
  defaultFields: Record<string, unknown>;
}> = {
  failure_causes: {
    idPrefix: 'PF-FC',
    requiredFks: ['"l3FuncId"', '"l3StructId"', '"l2StructId"'],
    defaultFields: { cause: '', occurrence: 0 },
  },
  failure_modes: {
    idPrefix: 'PF-FM',
    requiredFks: ['"l2StructId"'],
    defaultFields: { mode: '' },
  },
  failure_effects: {
    idPrefix: 'PF-FE',
    requiredFks: ['"l1FuncId"'],
    defaultFields: { effect: '', severity: 0 },
  },
  failure_links: {
    idPrefix: 'PF-FL',
    requiredFks: ['"fmId"', '"feId"', '"fcId"'],
    defaultFields: {},
  },
  risk_analyses: {
    idPrefix: 'PF-RA',
    requiredFks: ['"linkId"'],
    defaultFields: { severity: 0, occurrence: 0, detection: 0, ap: '' },
  },
  optimizations: {
    idPrefix: 'PF-OPT',
    requiredFks: ['"riskId"'],
    defaultFields: {},
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, fmeaId, table } = validateBase(body);
    if (error || !fmeaId || !table) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const config = CREATABLE_TABLES[table];
    if (!config) {
      return NextResponse.json(
        { success: false, error: `행 추가가 허용되지 않은 테이블: ${table}` },
        { status: 400 },
      );
    }

    const parentId = String(body.parentId || '');
    const data = (body.data || {}) as Record<string, unknown>;

    const db = await getProjectPrisma(fmeaId);
    if (db.error) return NextResponse.json({ success: false, error: db.error }, { status: 500 });
    const { prisma, schema } = db;

    // 새 ID 생성 (결정론적)
    const newId = await generateNextId(prisma, schema, table, fmeaId, config.idPrefix);

    // FK 필드 구성
    const fkFields: Record<string, unknown> = {};
    if (parentId && config.requiredFks.length > 0) {
      // 첫 번째 FK에 parentId 할당
      fkFields[config.requiredFks[0]] = parentId;
    }

    // body.data에서 추가 FK 가져오기
    for (const fk of config.requiredFks) {
      const cleanFk = fk.replace(/"/g, '');
      if (data[cleanFk] !== undefined) {
        fkFields[fk] = data[cleanFk];
        delete data[cleanFk];
      }
    }

    // INSERT 쿼리 구성
    const allFields: Record<string, unknown> = {
      ...config.defaultFields,
      ...data,
      ...fkFields,
    };

    const columns = ['id', '"fmeaId"', '"createdAt"', '"updatedAt"'];
    const values: unknown[] = [newId, fmeaId, new Date(), new Date()];
    let paramIdx = values.length + 1;

    for (const [col, val] of Object.entries(allFields)) {
      const colRef = col.startsWith('"') ? col : `"${col}"`;
      columns.push(colRef);
      values.push(val);
      paramIdx++;
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO "${schema}".${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    await prisma.$executeRawUnsafe(sql, ...values);

    return NextResponse.json({
      success: true,
      id: newId,
      table,
      createdAt: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('[atom-cell] POST error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════
// DELETE — 행 삭제 + FK CASCADE
// ═══════════════════════════════════════════════════════

/**
 * FK CASCADE 삭제 순서:
 *   FailureCause 삭제 → FailureLink(fcId) → RiskAnalysis(linkId) → Optimization(riskId)
 *   FailureMode 삭제  → FailureLink(fmId) → RiskAnalysis(linkId) → Optimization(riskId)
 *   FailureEffect 삭제 → FailureLink(feId) → RiskAnalysis(linkId) → Optimization(riskId)
 *   FailureLink 삭제  → RiskAnalysis(linkId) → Optimization(riskId)
 *   RiskAnalysis 삭제 → Optimization(riskId)
 */
const CASCADE_MAP: Record<string, { childTable: string; fkColumn: string }[]> = {
  failure_causes: [
    { childTable: 'failure_links', fkColumn: '"fcId"' },
  ],
  failure_modes: [
    { childTable: 'failure_links', fkColumn: '"fmId"' },
  ],
  failure_effects: [
    { childTable: 'failure_links', fkColumn: '"feId"' },
  ],
  failure_links: [
    { childTable: 'risk_analyses', fkColumn: '"linkId"' },
  ],
  risk_analyses: [
    { childTable: 'optimizations', fkColumn: '"riskId"' },
  ],
};

// 삭제 가능한 테이블
const DELETABLE_TABLES = new Set([
  'failure_causes', 'failure_modes', 'failure_effects',
  'failure_links', 'risk_analyses', 'optimizations',
]);

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { error, fmeaId, table } = validateBase(body);
    if (error || !fmeaId || !table) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    if (!DELETABLE_TABLES.has(table)) {
      return NextResponse.json(
        { success: false, error: `삭제가 허용되지 않은 테이블: ${table}` },
        { status: 400 },
      );
    }

    const recordId = String(body.recordId || '');
    if (!recordId) return NextResponse.json({ success: false, error: 'recordId is required' }, { status: 400 });

    const db = await getProjectPrisma(fmeaId);
    if (db.error) return NextResponse.json({ success: false, error: db.error }, { status: 500 });
    const { prisma, schema } = db;

    // 레코드 존재 확인
    const exists = await prisma.$queryRawUnsafe(
      `SELECT id FROM "${schema}".${table} WHERE id = $1 AND "fmeaId" = $2 LIMIT 1`,
      recordId, fmeaId,
    ) as { id: string }[];
    if (exists.length === 0) {
      return NextResponse.json({ success: false, error: '레코드를 찾을 수 없습니다' }, { status: 404 });
    }

    // FK CASCADE 삭제 (트랜잭션)
    const deleted: Record<string, number> = {};

    await prisma.$transaction(async (tx: { $executeRawUnsafe: (q: string, ...a: unknown[]) => Promise<number> }) => {
      // 재귀적 CASCADE 삭제
      async function cascadeDelete(tbl: string, id: string): Promise<void> {
        const children = CASCADE_MAP[tbl] || [];
        for (const child of children) {
          // 자식 레코드 ID 조회
          const childRows = await prisma.$queryRawUnsafe(
            `SELECT id FROM "${schema}".${child.childTable} WHERE ${child.fkColumn} = $1`,
            id,
          ) as { id: string }[];
          // 자식의 자식도 재귀 삭제
          for (const cr of childRows) {
            await cascadeDelete(child.childTable, cr.id);
          }
          // 자식 레코드 삭제
          if (childRows.length > 0) {
            const count = await tx.$executeRawUnsafe(
              `DELETE FROM "${schema}".${child.childTable} WHERE ${child.fkColumn} = $1`,
              id,
            );
            deleted[child.childTable] = (deleted[child.childTable] || 0) + Number(count);
          }
        }
      }

      // CASCADE 삭제 실행
      await cascadeDelete(table, recordId);

      // 본 레코드 삭제
      const count = await tx.$executeRawUnsafe(
        `DELETE FROM "${schema}".${table} WHERE id = $1 AND "fmeaId" = $2`,
        recordId, fmeaId,
      );
      deleted[table] = Number(count);
    });

    return NextResponse.json({
      success: true,
      deleted,
      recordId,
      table,
    });

  } catch (error) {
    console.error('[atom-cell] DELETE error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
