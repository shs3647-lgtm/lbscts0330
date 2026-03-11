
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  schemaClients: Map<string, PrismaClient> | undefined;
};

/**
 * Prisma 7+ 호환 PrismaClient 초기화
 * - Driver Adapter 필수 사용 (@prisma/adapter-pg)
 */
export function getPrisma(): PrismaClient | null {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

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
 * Schema-specific PrismaClient 생성/반환
 * - 'public' 또는 빈 값이면 기본 클라이언트 반환
 * - project schema이면 PrismaPg({ schema }) 옵션으로 별도 클라이언트 생성
 * - 동일 schema에 대해 캐싱하여 Pool 누수 방지
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
  if (cached) return cached;

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
  // Remove schema parameter if present
  const baseUrl = url.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');
  return baseUrl;
}

