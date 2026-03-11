/**
 * @file route.test.ts
 * @description Polling API 엔드포인트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// pollPendingChanges 모킹
vi.mock('@/lib/sync/polling-sync-service', () => ({
  pollPendingChanges: vi.fn(),
}));

// prisma 모킹 - getPrisma 함수를 mock
const mockPrisma = {};
vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(() => mockPrisma),
}));

import { pollPendingChanges } from '@/lib/sync/polling-sync-service';

describe('POST /api/sync/poll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for invalid appType', async () => {
    const { POST } = await import('./route');

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        appType: 'invalid',
        documentId: 'DOC-001',
      }),
    } as unknown as Request;

    const response = await POST(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid appType');
  });

  it('should return 400 when documentId is missing', async () => {
    const { POST } = await import('./route');

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        appType: 'cp',
      }),
    } as unknown as Request;

    const response = await POST(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('documentId is required');
  });

  it('should return changes for valid request', async () => {
    const { POST } = await import('./route');

    const mockChanges = [
      {
        id: 'sync-001',
        sourceType: 'pfmea',
        sourceTable: 'shared_process_master',
        changeType: 'update',
        changedFields: ['processName'],
        newValues: { processName: 'New Name' },
        createdAt: new Date('2024-01-01'),
      },
    ];

    (pollPendingChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
      changes: mockChanges,
      lastPolledAt: new Date('2024-01-01T12:00:00Z'),
    });

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        appType: 'cp',
        documentId: 'CP26-001',
      }),
    } as unknown as Request;

    const response = await POST(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.changes).toHaveLength(1);
    expect(data.count).toBe(1);
  });

  it('should accept pfmea, cp, and pfd as valid appTypes', async () => {
    const { POST } = await import('./route');

    (pollPendingChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
      changes: [],
      lastPolledAt: new Date(),
    });

    for (const appType of ['pfmea', 'cp', 'pfd']) {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          appType,
          documentId: `${appType.toUpperCase()}-001`,
        }),
      } as unknown as Request;

      const response = await POST(mockRequest as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    }
  });

  it('should pass since parameter to pollPendingChanges', async () => {
    const { POST } = await import('./route');

    const since = '2024-01-01T00:00:00Z';

    (pollPendingChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
      changes: [],
      lastPolledAt: new Date(),
    });

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        appType: 'cp',
        documentId: 'CP26-001',
        since,
      }),
    } as unknown as Request;

    await POST(mockRequest as never);

    expect(pollPendingChanges).toHaveBeenCalledWith(
      expect.anything(),
      'cp',
      'CP26-001',
      new Date(since)
    );
  });

  it('should return 500 on service error', async () => {
    const { POST } = await import('./route');

    (pollPendingChanges as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Database connection failed')
    );

    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        appType: 'cp',
        documentId: 'CP26-001',
      }),
    } as unknown as Request;

    const response = await POST(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to poll changes');
    expect(data.details).toContain('Database connection failed');
  });
});

describe('GET /api/sync/poll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for invalid appType', async () => {
    const { GET } = await import('./route');

    const url = 'http://localhost/api/sync/poll?appType=invalid&documentId=DOC-001';
    const mockRequest = {
      url,
    } as unknown as Request;

    const response = await GET(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid appType');
  });

  it('should return 400 when documentId is missing', async () => {
    const { GET } = await import('./route');

    const url = 'http://localhost/api/sync/poll?appType=cp';
    const mockRequest = {
      url,
    } as unknown as Request;

    const response = await GET(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('documentId is required');
  });

  it('should return changes for valid GET request', async () => {
    const { GET } = await import('./route');

    (pollPendingChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
      changes: [],
      lastPolledAt: new Date('2024-01-01T12:00:00Z'),
    });

    const url = 'http://localhost/api/sync/poll?appType=pfd&documentId=PFD26-001';
    const mockRequest = {
      url,
    } as unknown as Request;

    const response = await GET(mockRequest as never);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle since query parameter', async () => {
    const { GET } = await import('./route');

    const since = '2024-01-01T00:00:00Z';

    (pollPendingChanges as ReturnType<typeof vi.fn>).mockResolvedValue({
      changes: [],
      lastPolledAt: new Date(),
    });

    const url = `http://localhost/api/sync/poll?appType=cp&documentId=CP26-001&since=${encodeURIComponent(since)}`;
    const mockRequest = {
      url,
    } as unknown as Request;

    await GET(mockRequest as never);

    expect(pollPendingChanges).toHaveBeenCalledWith(
      expect.anything(),
      'cp',
      'CP26-001',
      new Date(since)
    );
  });
});
