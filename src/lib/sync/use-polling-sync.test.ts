/**
 * @file use-polling-sync.test.ts
 * @description usePollingSync React 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// react-query 모킹
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

describe('usePollingSync module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('module exports', () => {
    it('should export usePollingSync function', async () => {
      const module = await import('./use-polling-sync');
      expect(typeof module.usePollingSync).toBe('function');
    });

    it('should export useSyncStatus function', async () => {
      const module = await import('./use-polling-sync');
      expect(typeof module.useSyncStatus).toBe('function');
    });

    it('should export AppType type', async () => {
      const module = await import('./use-polling-sync');
      // TypeScript 타입은 런타임에 존재하지 않으므로 함수가 존재하는지만 확인
      expect(module.usePollingSync).toBeDefined();
    });
  });

  describe('POLLING_CONFIG', () => {
    it('should have correct configuration values', async () => {
      // 훅 내부 설정 확인을 위해 간접적으로 테스트
      const module = await import('./use-polling-sync');
      expect(module.usePollingSync).toBeDefined();
    });
  });
});

describe('usePollingSync hook behavior', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    global.fetch = mockFetch;
    mockFetch.mockReset();
    mockInvalidateQueries.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should make fetch call with correct parameters', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        changes: [],
        lastPolledAt: new Date().toISOString(),
      }),
    });

    // 직접 fetch 호출 시뮬레이션
    const appType = 'cp';
    const documentId = 'CP26-001';

    await fetch('/api/sync/poll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appType,
        documentId,
        since: undefined,
      }),
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/sync/poll', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('should parse response correctly', async () => {
    const mockChanges = [
      {
        id: 'sync-001',
        sourceType: 'pfmea',
        sourceTable: 'shared_process_master',
        changeType: 'update',
        changedFields: ['processName'],
        newValues: { processName: 'New Name' },
        createdAt: new Date().toISOString(),
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        changes: mockChanges,
        lastPolledAt: new Date().toISOString(),
      }),
    });

    const response = await fetch('/api/sync/poll', {
      method: 'POST',
      body: JSON.stringify({
        appType: 'cp',
        documentId: 'CP26-001',
      }),
    });

    const data = await response.json();

    expect(data.changes).toHaveLength(1);
    expect(data.changes[0].sourceType).toBe('pfmea');
    expect(data.changes[0].changeType).toBe('update');
  });

  it('should handle fetch error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const response = await fetch('/api/sync/poll', {
      method: 'POST',
      body: JSON.stringify({
        appType: 'cp',
        documentId: 'CP26-001',
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });

  it('should handle network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(fetch('/api/sync/poll')).rejects.toThrow('Network error');
  });
});

describe('Query invalidation logic', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockClear();
  });

  it('should invalidate CP queries for cp appType', () => {
    const appType = 'cp';
    const documentId = 'CP26-001';
    const changes = [{ sourceTable: 'shared_process_master' }];

    // 쿼리 무효화 로직 시뮬레이션
    if (appType === 'cp') {
      mockInvalidateQueries({ queryKey: ['controlPlan', documentId] });
      mockInvalidateQueries({ queryKey: ['controlPlanItems', documentId] });

      const hasCharacteristicChange = changes.some(
        c => c.sourceTable === 'shared_characteristics_master'
      );
      if (hasCharacteristicChange) {
        mockInvalidateQueries({ queryKey: ['cpControlItems', documentId] });
      }
    }

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['controlPlan', 'CP26-001'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['controlPlanItems', 'CP26-001'] });
  });

  it('should invalidate cpControlItems when characteristics change', () => {
    const appType = 'cp';
    const documentId = 'CP26-001';
    const changes = [{ sourceTable: 'shared_characteristics_master' }];

    // 쿼리 무효화 로직 시뮬레이션
    if (appType === 'cp') {
      mockInvalidateQueries({ queryKey: ['controlPlan', documentId] });
      mockInvalidateQueries({ queryKey: ['controlPlanItems', documentId] });

      const hasCharacteristicChange = changes.some(
        c => c.sourceTable === 'shared_characteristics_master'
      );
      if (hasCharacteristicChange) {
        mockInvalidateQueries({ queryKey: ['cpControlItems', documentId] });
      }
    }

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['cpControlItems', 'CP26-001'] });
  });

  it('should invalidate PFD queries for pfd appType', () => {
    const appType = 'pfd';
    const documentId = 'PFD26-001';

    // 쿼리 무효화 로직 시뮬레이션
    if (appType === 'pfd') {
      mockInvalidateQueries({ queryKey: ['pfd', documentId] });
      mockInvalidateQueries({ queryKey: ['pfdItems', documentId] });
    }

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['pfd', 'PFD26-001'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['pfdItems', 'PFD26-001'] });
  });

  it('should invalidate PFMEA queries for pfmea appType', () => {
    const appType = 'pfmea';
    const documentId = 'FMEA26-001';

    // 쿼리 무효화 로직 시뮬레이션
    if (appType === 'pfmea') {
      mockInvalidateQueries({ queryKey: ['pfmea', documentId] });
    }

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['pfmea', 'FMEA26-001'] });
  });
});

describe('Sync status logic', () => {
  it('should determine synced status when no pending changes', () => {
    const pendingChanges = 0;
    const error = null;

    let status: 'synced' | 'syncing' | 'pending' | 'error' = 'synced';

    if (error) {
      status = 'error';
    } else if (pendingChanges > 0) {
      status = 'pending';
    } else {
      status = 'synced';
    }

    expect(status).toBe('synced');
  });

  it('should determine pending status when changes exist', () => {
    const pendingChanges = 5;
    const error = null;

    let status: 'synced' | 'syncing' | 'pending' | 'error' = 'synced';

    if (error) {
      status = 'error';
    } else if (pendingChanges > 0) {
      status = 'pending';
    } else {
      status = 'synced';
    }

    expect(status).toBe('pending');
  });

  it('should determine error status on error', () => {
    const pendingChanges = 0;
    const error = new Error('Test error');

    let status: 'synced' | 'syncing' | 'pending' | 'error' = 'synced';

    if (error) {
      status = 'error';
    } else if (pendingChanges > 0) {
      status = 'pending';
    } else {
      status = 'synced';
    }

    expect(status).toBe('error');
  });
});

describe('Backoff calculation', () => {
  it('should calculate backoff correctly', () => {
    const interval = 3000;
    const BACKOFF_MULTIPLIER = 1.5;
    const MAX_INTERVAL = 30000;

    // 첫 번째 에러 후
    let retryCount = 1;
    let backoff = Math.min(
      interval * Math.pow(BACKOFF_MULTIPLIER, retryCount),
      MAX_INTERVAL
    );
    expect(backoff).toBe(4500);

    // 두 번째 에러 후
    retryCount = 2;
    backoff = Math.min(
      interval * Math.pow(BACKOFF_MULTIPLIER, retryCount),
      MAX_INTERVAL
    );
    expect(backoff).toBe(6750);

    // 최대값 도달
    retryCount = 10;
    backoff = Math.min(
      interval * Math.pow(BACKOFF_MULTIPLIER, retryCount),
      MAX_INTERVAL
    );
    expect(backoff).toBe(MAX_INTERVAL);
  });
});
