/**
 * @file project-schema.ts
 * @description 프로젝트별 DB(스키마) 자동 생성/초기화 유틸
 *
 * ═══════════════════════════════════════════════════════════════
 * ★ DB 스키마 운영 정책 (혼선 방지)
 * ═══════════════════════════════════════════════════════════════
 *
 * ■ public 스키마 — 글로벌·메타·(현재) PFMEA Import 스테이징
 *   - FmeaProject / FmeaRegistration / FmeaCftMember (프로젝트 등록 메타)
 *   - PfmeaMasterDataset / PfmeaMasterFlatItem ← Import flat 스테이징 (★ 아래 PROJECT_TABLES에 없음 → 프로젝트 스키마에는 복제 안 됨)
 *   - ProjectLinkage, TripletGroup, LLD/SOD/산업DB, APQPProject 등
 *
 * ■ 프로젝트 스키마 pfmea_{fmeaId} — 해당 FMEA의 Atomic·연동 데이터 (SSoT 몸통)
 *   - L1/L2/L3, FM/FE/FC, FailureLink, RiskAnalysis, Optimization, …
 *   - save-position-import / GET /api/fmea?format=atomic 등이 여기에 읽기·쓰기
 *
 * ★★★ 프로젝트 데이터 조회·저장 시 반드시 이 순서 ★★★
 *   1) const schema = getProjectSchemaName(fmeaId)   // 소문자·하이픈→_ 규칙 적용
 *   2) await ensureProjectSchemaReady({ baseDatabaseUrl: getBaseDatabaseUrl(), schema })
 *   3) const prisma = getPrismaForSchema(schema)
 *   → Atomic·import_jobs·import_validations·CP/PFD(아래 PROJECT_TABLES)는 전부 여기.
 *
 * public 스테이징을 쓰지 않게 하려면(선택·대공사):
 *   - PROJECT_TABLES에 'pfmea_master_datasets', 'pfmea_master_flat_items' 추가 → ensure 시 LIKE 복제
 *   - /api/pfmea/master, verify-counts, master-processes 등 모든 pfmeaMaster* 접근을 getPrismaForSchema로 일괄 전환
 *   - 기존 public 행 → 스키마별 이관 스크립트 + 이중 쓰기/컷오버 계획
 *
 * ⚠️ 디버그: FM/FL/L2 등 "프로젝트 본문"은 public이 아니라 반드시 pfmea_* 스키마에서 조회
 * ═══════════════════════════════════════════════════════════════
 *
 * 스키마명 규칙: pfmea_{projectId} (안전한 sanitize 후 소문자)
 * public 스키마의 테이블 구조를 프로젝트 스키마로 복제하여 Prisma가 즉시 사용할 수 있게 함
 */

import { Client } from 'pg';

// PFMEA에서 프로젝트별로 분리 저장·복제할 테이블 (prisma @@map 기준).
// ★ pfmea_master_datasets / pfmea_master_flat_items 는 의도적으로 제외 → 현재는 public 스테이징만 사용.
const PROJECT_TABLES = [
  // ── FMEA Atomic DB ──
  'fmea_projects',
  'fmea_registrations',
  'fmea_cft_members',
  'apqp_projects',
  'l1_structures',
  'l2_structures',
  'l3_structures',
  'l1_functions',
  'l1_requirements',   // ★ 2026-03-17: C3 요구사항 별도 테이블
  'l2_functions',
  'l3_functions',
  'failure_effects',
  'failure_modes',
  'failure_causes',
  'failure_links',
  'failure_analyses',
  'risk_analyses',
  'optimizations',
  'fmea_confirmed_states',
  'unified_process_items',  // ★ 2026-02-05: CP/PFD 연동용 테이블 추가
  'process_product_chars',  // ★ 2026-03-14: ProcessProductChar 독립 엔티티 (A4 공유)
  'l3_process_chars',       // ★ 2026-03-23: L3ProcessChar 독립 엔티티 (B3 공정특성 UUID)
  'l1_scopes',              // ★ 2026-03-23: L1Scope (C1 구분 독립 엔티티)
  'l2_process_nos',         // ★ 2026-03-23: L2ProcessNo (A1 공정번호 독립 엔티티)
  'l2_process_names',       // ★ 2026-03-23: L2ProcessName (A2 공정명 독립 엔티티)
  'l2_special_chars',       // ★ 2026-03-23: L2SpecialChar (L2 SC 독립 엔티티)
  'l3_process_nos',         // ★ 2026-03-23: L3ProcessNo (processNo 독립 엔티티)
  'l3_four_ms',             // ★ 2026-03-23: L3FourM (4M 독립 엔티티)
  'l3_work_elements',       // ★ 2026-03-23: L3WorkElement (B1 작업요소 독립 엔티티)
  'l3_special_chars',       // ★ 2026-03-23: L3SpecialChar (L3 SC 독립 엔티티)
  'import_jobs',            // ★ 2026-03-17: Import 추적
  'import_mappings',        // ★ 2026-03-17: Import 매핑 (flatData→entity)
  'import_validations',     // ★ 2026-03-17: Import 검증 결과
  // ── PFD (공정흐름도) ── ★ 2026-03-19: 프로젝트별 고유 스키마
  'pfd_registrations',
  'pfd_items',
  'pfd_revisions',
  'pfd_master_datasets',
  'pfd_master_flat_items',
  // ── CP (관리계획서) ── ★ 2026-03-19: 프로젝트별 고유 스키마
  'control_plans',
  'control_plan_items',
  'cp_registrations',
  'cp_cft_members',
  'cp_revisions',
  'cp_processes',
  'cp_detectors',
  'cp_control_items',
  'cp_control_methods',
  'cp_reaction_plans',
  'cp_atomic_processes',
  'cp_atomic_detectors',
  'cp_atomic_control_items',
  'cp_atomic_control_methods',
  'cp_atomic_reaction_plans',
  'cp_confirmed_states',
  'cp_master_datasets',
  'cp_master_flat_items',
  'cp_master_processes',
  'cp_master_detectors',
  'cp_master_control_items',
  'cp_master_control_methods',
  'cp_master_reaction_plans',
  // ── FMEA↔CP↔PFD 매핑 ──
  'pfmea_cp_mappings',
  'pfmea_pfd_mappings',
  // ── 공통 ──
  'document_links',
  'sync_logs',
] as const;

export function getProjectSchemaName(fmeaId: string): string {
  const base = String(fmeaId || '').trim().toLowerCase();
  // allow a-z0-9_ only
  const safe = base.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  // detect DFMEA IDs (starting with 'dfm') vs PFMEA
  const prefix = base.startsWith('dfm') ? 'dfmea' : 'pfmea';
  return `${prefix}_${safe || 'unknown'}`;
}

function quoteIdent(ident: string): string {
  // Minimal quote for identifiers
  return `"${ident.replace(/"/g, '""')}"`;
}

/**
 * Ensure the project schema exists and contains the required tables.
 * This clones public.<table> into <schema>.<table> using LIKE INCLUDING ALL.
 *
 * ⚠️ RULE 0.8.1: 반드시 객체 파라미터로 호출.
 * ❌ ensureProjectSchemaReady(fmeaId) — 문자열 전달 금지
 * ✅ ensureProjectSchemaReady({ baseDatabaseUrl: getBaseDatabaseUrl(), schema: getProjectSchemaName(fmeaId) })
 */
export async function ensureProjectSchemaReady(params: {
  baseDatabaseUrl: string;
  schema: string;
}): Promise<void> {
  const { baseDatabaseUrl, schema } = params;

  const client = new Client({ connectionString: baseDatabaseUrl });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdent(schema)}`);

    for (const table of PROJECT_TABLES) {
      // Check if table exists in public schema
      const publicTableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [table]);
      
      if (publicTableExists.rows[0].exists) {
        // ★ 2026-03-19: INCLUDING ALL → INCLUDING DEFAULTS INDEXES CONSTRAINTS
        // INCLUDING ALL copies types too → pg_type_typname_nsp_index conflict on concurrent requests
        // try-catch handles race condition between EXISTS check and CREATE
        try {
          await client.query(
            `CREATE TABLE IF NOT EXISTS ${quoteIdent(schema)}.${quoteIdent(table)} (LIKE public.${quoteIdent(table)} INCLUDING DEFAULTS INCLUDING INDEXES INCLUDING CONSTRAINTS)`
          );
        } catch (e: any) {
          // 42P07 = relation already exists, 23505 = duplicate key (type conflict) — safe to ignore
          if (e.code !== '42P07' && e.code !== '23505') throw e;
        }
      } else {
        // If table doesn't exist in public, check if it exists in project schema
        const projectTableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = $2
          )
        `, [schema, table]);
        
        if (!projectTableExists.rows[0].exists) {
          // Table doesn't exist in either schema - log warning
        }
      }
    }

    // public 스키마에 있지만 프로젝트 스키마에 없는 컬럼을 자동 추가
    await syncMissingColumns(client, schema);
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * public 스키마의 컬럼 구조를 프로젝트 스키마에 동기화.
 * public에 존재하지만 프로젝트 스키마에 없는 컬럼을 ALTER TABLE ADD COLUMN으로 추가.
 */
async function syncMissingColumns(client: Client, schema: string): Promise<void> {
  for (const table of PROJECT_TABLES) {
    // ★ 2026-03-23: udt_name 추가 — ARRAY 타입 처리를 위해 (feRefs TEXT[] 등)
    const pubCols = await client.query(`
      SELECT column_name, data_type, character_maximum_length, column_default, is_nullable, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);

    const projCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
    `, [schema, table]);

    if (pubCols.rows.length === 0 || projCols.rows.length === 0) continue;

    const projColSet = new Set(projCols.rows.map((r: { column_name: string }) => r.column_name));

    for (const col of pubCols.rows) {
      if (projColSet.has(col.column_name)) continue;

      let colType = col.data_type.toUpperCase();
      if (colType === 'CHARACTER VARYING') {
        colType = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'TEXT';
      } else if (colType === 'TIMESTAMP WITHOUT TIME ZONE') {
        colType = 'TIMESTAMP';
      } else if (colType === 'TIMESTAMP WITH TIME ZONE') {
        colType = 'TIMESTAMPTZ';
      } else if (colType === 'ARRAY') {
        // ★ PostgreSQL ARRAY: udt_name starts with '_' (e.g., '_text' → TEXT[])
        const baseType = (col.udt_name || '').replace(/^_/, '').toUpperCase() || 'TEXT';
        colType = `${baseType}[]`;
      }

      const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';

      try {
        await client.query(
          `ALTER TABLE ${quoteIdent(schema)}.${quoteIdent(table)} ADD COLUMN IF NOT EXISTS ${quoteIdent(col.column_name)} ${colType}${nullable}${defaultVal}`
        );
      } catch {
        // 컬럼 추가 실패 시 무시 (이미 존재하거나 호환 불가)
      }
    }
  }
}

// ═══════════════════════════════════════════════════
// 유틸: pfdNo/cpNo → 프로젝트 Prisma 클라이언트 자동 결정
// ═══════════════════════════════════════════════════

import { getBaseDatabaseUrl, getPrisma, getPrismaForSchema } from '@/lib/prisma';
import { derivePfmeaIdFromPfdNo } from '@/lib/utils/derivePfdNo';

/**
 * pfdNo에서 fmeaId를 찾아 프로젝트 스키마 Prisma 클라이언트를 반환.
 * public 스키마에서 pfd_registrations.fmeaId 조회 → 프로젝트 스키마 결정.
 * 조회 실패 시 public Prisma 폴백.
 */
export async function getPrismaForPfd(pfdNo: string) {
  const publicPrisma = getPrisma();
  if (!publicPrisma) return null;

  try {
    const pfd = await publicPrisma.pfdRegistration.findFirst({
      where: { OR: [{ pfdNo }, { id: pfdNo }] },
      select: { fmeaId: true, linkedPfmeaNo: true },
    });
    let fmeaId = (pfd?.fmeaId || pfd?.linkedPfmeaNo || '').trim().toLowerCase() || null;
    if (!fmeaId) {
      const derived = derivePfmeaIdFromPfdNo(pfdNo);
      if (derived) fmeaId = derived;
    }
    if (fmeaId) {
      const baseUrl = getBaseDatabaseUrl();
      const schema = getProjectSchemaName(fmeaId);
      await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
      return getPrismaForSchema(schema) || publicPrisma;
    }
  } catch {
    // 조회 실패 → public 폴백
  }
  return publicPrisma;
}

/**
 * cpNo에서 fmeaId를 찾아 프로젝트 스키마 Prisma 클라이언트를 반환.
 * public 스키마에서 control_plans.fmeaId 조회 → 프로젝트 스키마 결정.
 * 조회 실패 시 public Prisma 폴백.
 */
export async function getPrismaForCp(cpNo: string) {
  const publicPrisma = getPrisma();
  if (!publicPrisma) return null;

  const idNorm = String(cpNo || '').trim().toLowerCase();
  let fmeaId: string | null = null;

  try {
    const cp = await publicPrisma.controlPlan.findFirst({
      where: { OR: [{ cpNo: idNorm }, { id: cpNo }] },
      select: { fmeaId: true, linkedPfmeaNo: true },
    });
    fmeaId = (cp?.fmeaId || cp?.linkedPfmeaNo || '').trim().toLowerCase() || null;
  } catch {
    // ignore
  }

  // ★ public.control_plans에 없어도 CpRegistration(메타)에서 PFMEA ID 역추적 — 워크시트는 프로젝트 스키마 CP를 본다
  if (!fmeaId) {
    try {
      const reg = await publicPrisma.cpRegistration.findFirst({
        where: {
          deletedAt: null,
          OR: [{ cpNo: idNorm }, { id: cpNo }],
        },
        select: { fmeaId: true, linkedPfmeaNo: true },
      });
      fmeaId = (reg?.fmeaId || reg?.linkedPfmeaNo || '').trim().toLowerCase() || null;
    } catch {
      // ignore
    }
  }

  if (fmeaId) {
    try {
      const baseUrl = getBaseDatabaseUrl();
      if (!baseUrl) return publicPrisma;
      const schema = getProjectSchemaName(fmeaId);
      await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
      return getPrismaForSchema(schema) || publicPrisma;
    } catch {
      return publicPrisma;
    }
  }
  return publicPrisma;
}
