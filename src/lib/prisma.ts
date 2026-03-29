// HMR trigger: 2026-03-23 prisma generate — CftPublicMember 모델 재생성
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  schemaClients: Map<string, PrismaClient> | undefined;
};

/**
 * PostgreSQL `public` 스키마용 클라이언트 (search_path 기본).
 *
 * 용도: 프로젝트 등록 메타(FmeaProject 등), 글로벌 마스터(LLD·SOD·산업DB),
 *       그리고 ★현재 아키텍처★에서만 PFMEA Import 스테이징(pfmea_master_*).
 *
 * 금지(Rule 0.8.1): L2/FM/FC/FailureLink 등 "프로젝트 Atomic 본문"을 public에 저장·조회하지 말 것.
 * 그 경우 → getProjectSchemaName(fmeaId) + ensureProjectSchemaReady + getPrismaForSchema(schema).
 */
export function getPrisma(): PrismaClient | null {
  // ★ 2026-03-25: 스테일 캐시 무효화 제거 — Prisma 7 어댑터 기반 클라이언트는
  // 모델 프로퍼티 존재 여부로 유효성 판단 불가. 캐시 있으면 그대로 반환.
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // ★★★ DATABASE_URL 환경 변수 확인
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return null;
  }

  try {

    // ★★★ Prisma 7: pg Pool 생성 및 어댑터 사용 필수 ★★★
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);

    const prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prisma;
      globalForPrisma.pool = pool;
    }

    return prisma;
  } catch (error: any) {
    console.error('[Prisma] Init Error:', error.message || error);
    return null;
  }
}

/**
 * 프로젝트(또는 지정) 스키마 전용 클라이언트 — Atomic·CP/PFD 프로젝트 테이블은 여기로만.
 *
 * - schema가 'public'·빈 값 → getPrisma()와 동일
 * - 그 외 예: `pfmea_pfm26_m009` → 해당 스키마의 l2_structures, failure_links, …
 *
 * ★ 호출 패턴 (복붙용):
 *   const schema = getProjectSchemaName(fmeaId);
 *   await ensureProjectSchemaReady({ baseDatabaseUrl: getBaseDatabaseUrl(), schema });
 *   const prisma = getPrismaForSchema(schema);
 *
 * ⚠️ pfmea_master_flat_items 등 스테이징은 현재 public(getPrisma)에만 있음 — 잘못 이 클라이언트로 조회하면 0건.
 */
export function getPrismaForSchema(schema: string): PrismaClient | null {
  if (!schema || schema === 'public') {
    return getPrisma();
  }

  // 캐시 확인
  if (!globalForPrisma.schemaClients) {
    globalForPrisma.schemaClients = new Map();
  }
  const cached = globalForPrisma.schemaClients.get(schema);
  // ★ 2026-03-25: 스테일 캐시 무효화 제거 — Prisma 7 어댑터 기반 클라이언트는
  // 모델 프로퍼티(l1Scope 등) 존재 여부로 유효성 판단 불가.
  // 이전: 매번 새 Pool 생성 → 커넥션 누수 + 트랜잭션 유실 가능
  if (cached) {
    return cached;
  }

  // Base URL (schema 파라미터 제거)
  const baseUrl = getBaseDatabaseUrl();
  if (!baseUrl) return null;

  try {
    const pool = new Pool({ connectionString: baseUrl });
    const adapter = new PrismaPg(pool, { schema });
    const client = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    globalForPrisma.schemaClients.set(schema, client);
    return client;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Prisma] Schema client init error (${schema}):`, msg);
    return null;
  }
}

/**
 * DATABASE_URL에서 기본 URL(스키마 제외)을 추출
 * 예: postgresql://user:pass@localhost:5432/db?schema=public -> postgresql://user:pass@localhost:5432/db
 */
export function getBaseDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || '';
  // Remove all query parameters to get clean base URL
  const baseUrl = url.replace(/\?.*$/, '');
  return baseUrl;
}

