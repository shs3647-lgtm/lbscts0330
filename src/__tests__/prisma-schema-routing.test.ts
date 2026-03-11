/**
 * @file prisma-schema-routing.test.ts
 * @description getPrismaForSchema()가 project schema로 올바르게 라우팅하는지 검증
 *
 * 근본 원인: getPrismaForSchema()가 schema 파라미터를 무시하고 getPrisma() 반환 (no-op)
 * 수정: PrismaPg(pool, { schema }) 옵션으로 schema-specific 클라이언트 생성
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track adapter creation calls
const adapterCalls: Array<{ schema?: string }> = [];
const createdClients: Array<{ _schema: string; _id: string }> = [];

vi.mock('pg', () => ({
  Pool: class MockPool {
    end() { /* no-op */ }
  },
}));

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: class MockPrismaPg {
    _schema: string;
    constructor(_pool: unknown, opts?: { schema?: string }) {
      this._schema = opts?.schema || 'public';
      adapterCalls.push({ schema: this._schema });
    }
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {
    _schema: string;
    _id: string;
    constructor(opts?: { adapter?: { _schema?: string } }) {
      this._schema = opts?.adapter?._schema || 'public';
      this._id = Math.random().toString(36).substring(7);
      createdClients.push({ _schema: this._schema, _id: this._id });
    }
  },
}));

describe('getPrismaForSchema - schema routing', () => {
  beforeEach(() => {
    adapterCalls.length = 0;
    createdClients.length = 0;
    vi.resetModules();
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db?schema=public';
  });

  it('should create a schema-specific client for project schema (NOT return public client)', async () => {
    const { getPrisma, getPrismaForSchema } = await import('@/lib/prisma');

    const publicClient = getPrisma();
    expect(publicClient).not.toBeNull();

    const schemaClient = getPrismaForSchema('pfmea_test_project');
    expect(schemaClient).not.toBeNull();

    // ★ 핵심: project schema client는 public client와 다른 인스턴스여야 함
    expect(schemaClient).not.toBe(publicClient);
  });

  it('should return public client when schema is "public"', async () => {
    const { getPrisma, getPrismaForSchema } = await import('@/lib/prisma');

    const publicClient = getPrisma();
    const sameClient = getPrismaForSchema('public');

    expect(sameClient).toBe(publicClient);
  });

  it('should cache and reuse schema-specific clients', async () => {
    const { getPrismaForSchema } = await import('@/lib/prisma');

    const client1 = getPrismaForSchema('pfmea_cache_test');
    const client2 = getPrismaForSchema('pfmea_cache_test');

    expect(client1).not.toBeNull();
    expect(client2).toBe(client1);
  });

  it('should create PrismaPg adapter with schema option', async () => {
    const { getPrismaForSchema } = await import('@/lib/prisma');

    getPrismaForSchema('pfmea_my_project');

    // PrismaPg가 schema 옵션과 함께 생성되었는지 확인
    const projectAdapterCall = adapterCalls.find(c => c.schema === 'pfmea_my_project');
    expect(projectAdapterCall).toBeDefined();
  });
});
