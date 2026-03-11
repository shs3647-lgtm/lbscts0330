/**
 * @file route.test.ts
 * @description Shared Master API 엔드포인트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 서비스 함수 모킹
vi.mock('@/lib/sync/polling-sync-service', () => ({
  syncPfmeaToSharedMaster: vi.fn(),
  recordSyncChange: vi.fn(),
  M4_CP_FILTER: ['MC', 'IM', 'EN'],
}));

// prisma 모킹 - getPrisma 함수를 mock
const mockPrisma = {
  sharedProcessMaster: {
    findMany: vi.fn(),
  },
  failureLink: {
    findMany: vi.fn(),
  },
  sharedCharacteristicsMaster: {
    findMany: vi.fn(),
  },
  sharedRiskReference: {
    upsert: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(() => mockPrisma),
}));

import { syncPfmeaToSharedMaster, recordSyncChange } from '@/lib/sync/polling-sync-service';

describe('POST /api/sync/shared-master', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when fmeaId is missing', async () => {
    const { POST } = await import('./route');

    const mockRequest = {
      json: vi.fn().mockResolvedValue({}),
    } as unknown as Request;

    const response = await POST(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('fmeaId is required');
  });

  it('should sync PFMEA to shared master', async () => {
    const { POST } = await import('./route');

    (syncPfmeaToSharedMaster as ReturnType<typeof vi.fn>).mockResolvedValue({
      processCount: 5,
      characteristicCount: 10,
    });

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        fmeaId: 'fmea-001',
        projectId: 'project-001',
      }),
    } as unknown as Request;

    const response = await POST(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.processCount).toBe(5);
    expect(data.characteristicCount).toBe(10);
    expect(data.message).toContain('동기화 완료');
  });

  it('should use fmeaId as projectId when projectId is not provided', async () => {
    const { POST } = await import('./route');

    (syncPfmeaToSharedMaster as ReturnType<typeof vi.fn>).mockResolvedValue({
      processCount: 1,
      characteristicCount: 2,
    });

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        fmeaId: 'fmea-001',
      }),
    } as unknown as Request;

    const response = await POST(mockRequest as never);
    const data = await response.json();

    expect(syncPfmeaToSharedMaster).toHaveBeenCalledWith(
      expect.anything(),
      'fmea-001',
      'fmea-001'
    );
    expect(data.projectId).toBe('fmea-001');
  });

  it('should record sync change after syncing', async () => {
    const { POST } = await import('./route');

    (syncPfmeaToSharedMaster as ReturnType<typeof vi.fn>).mockResolvedValue({
      processCount: 5,
      characteristicCount: 10,
    });

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        fmeaId: 'fmea-001',
        projectId: 'project-001',
      }),
    } as unknown as Request;

    await POST(mockRequest as never);

    expect(recordSyncChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sourceType: 'pfmea',
        sourceId: 'fmea-001',
        changeType: 'update',
        changedFields: ['processCount', 'characteristicCount'],
        targetTypes: ['cp', 'pfd'],
      })
    );
  });

  it('should include risk sync when includeRisk is true', async () => {
    const { POST } = await import('./route');

    (syncPfmeaToSharedMaster as ReturnType<typeof vi.fn>).mockResolvedValue({
      processCount: 3,
      characteristicCount: 6,
    });

    // FailureLink 및 관련 데이터 모킹
    (mockPrisma.failureLink.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        fmeaId: 'fmea-001',
        includeRisk: true,
      }),
    } as unknown as Request;

    const response = await POST(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.riskCount).toBeDefined();
  });

  it('should return 500 on sync error', async () => {
    const { POST } = await import('./route');

    (syncPfmeaToSharedMaster as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Sync failed')
    );

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        fmeaId: 'fmea-001',
      }),
    } as unknown as Request;

    const response = await POST(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to sync shared master');
  });
});

describe('GET /api/sync/shared-master', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when neither fmeaId nor projectId is provided', async () => {
    const { GET } = await import('./route');

    const url = 'http://localhost/api/sync/shared-master';
    const mockRequest = {
      url,
    } as unknown as Request;

    const response = await GET(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('fmeaId or projectId is required');
  });

  it('should return shared master data by fmeaId', async () => {
    const { GET } = await import('./route');

    const mockProcesses = [
      {
        id: 'spm-001',
        processNo: '10',
        processName: '용접 공정',
        workElement: '1. 스폿 용접',
        m4: 'MC',
        version: 1,
        updatedAt: new Date('2024-01-01'),
        characteristics: [{ id: 'scm-001' }],
        cpMappings: [{ id: 'pcm-001' }],
        pfdMappings: [],
      },
    ];

    (mockPrisma.sharedProcessMaster.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockProcesses
    );

    const url = 'http://localhost/api/sync/shared-master?fmeaId=fmea-001';
    const mockRequest = {
      url,
    } as unknown as Request;

    const response = await GET(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.total).toBe(1);
    expect(data.processes).toHaveLength(1);
    expect(data.processes[0].isCpEligible).toBe(true);
  });

  it('should return shared master data by projectId', async () => {
    const { GET } = await import('./route');

    (mockPrisma.sharedProcessMaster.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const url = 'http://localhost/api/sync/shared-master?projectId=project-001';
    const mockRequest = {
      url,
    } as unknown as Request;

    const response = await GET(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.sharedProcessMaster.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'project-001' },
      })
    );
  });

  it('should correctly identify CP eligible processes', async () => {
    const { GET } = await import('./route');

    const mockProcesses = [
      { id: 'spm-001', m4: 'MC', processNo: '10', processName: 'A', characteristics: [], cpMappings: [], pfdMappings: [] },
      { id: 'spm-002', m4: 'IM', processNo: '20', processName: 'B', characteristics: [], cpMappings: [], pfdMappings: [] },
      { id: 'spm-003', m4: 'EN', processNo: '30', processName: 'C', characteristics: [], cpMappings: [], pfdMappings: [] },
      { id: 'spm-004', m4: 'MN', processNo: '40', processName: 'D', characteristics: [], cpMappings: [], pfdMappings: [] },
      { id: 'spm-005', m4: null, processNo: '50', processName: 'E', characteristics: [], cpMappings: [], pfdMappings: [] },
    ];

    (mockPrisma.sharedProcessMaster.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockProcesses
    );

    const url = 'http://localhost/api/sync/shared-master?fmeaId=fmea-001';
    const mockRequest = {
      url,
    } as unknown as Request;

    const response = await GET(mockRequest as never);
    const data = await response.json();

    expect(data.total).toBe(5);
    expect(data.cpEligible).toBe(4); // MC, IM, EN, null (MN 제외)
    expect(data.processes[0].isCpEligible).toBe(true);  // MC
    expect(data.processes[1].isCpEligible).toBe(true);  // IM
    expect(data.processes[2].isCpEligible).toBe(true);  // EN
    expect(data.processes[3].isCpEligible).toBe(false); // MN
    expect(data.processes[4].isCpEligible).toBe(true);  // null
  });

  it('should return 500 on query error', async () => {
    const { GET } = await import('./route');

    (mockPrisma.sharedProcessMaster.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Query failed')
    );

    const url = 'http://localhost/api/sync/shared-master?fmeaId=fmea-001';
    const mockRequest = {
      url,
    } as unknown as Request;

    const response = await GET(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to query shared master');
  });
});
