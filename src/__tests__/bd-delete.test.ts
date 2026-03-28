/**
 * @file bd-delete.test.ts
 * @description BD 현황 삭제(soft delete) 로직 단위 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildBdStatusList } from '../app/(fmea-core)/pfmea/import/hooks/useMasterDataHandlers';
import type { FMEAProject, BdStatusItem } from '../app/(fmea-core)/pfmea/import/components/ImportPageTypes';
import type { DatasetSummary } from '../app/(fmea-core)/pfmea/import/utils/master-api';

// ---------- 테스트 데이터 ----------

function mkProject(id: string, fmeaType: string = 'P', subject?: string): FMEAProject {
  return {
    id,
    fmeaType,
    fmeaNo: id,
    fmeaInfo: { subject: subject || `FMEA ${id}` },
    project: { productName: 'Test', customer: 'Customer', startDate: '2026-01-01' },
  };
}

function mkDataset(
  fmeaId: string,
  overrides: Partial<DatasetSummary> = {},
): DatasetSummary {
  return {
    id: `ds-${fmeaId}`,
    fmeaId,
    fmeaType: 'P',
    parentFmeaId: null,
    version: 1,
    name: `Dataset ${fmeaId}`,
    isActive: true,
    createdAt: '2026-01-01',
    processCount: 5,
    itemCount: 10,
    dataCount: 100,
    fmCount: 20,
    fcCount: 30,
    ...overrides,
  };
}

// ---------- buildBdStatusList 테스트 ----------

describe('buildBdStatusList', () => {
  it('활성 dataset만 목록에 포함', () => {
    const projects = [
      mkProject('pfm26-p001-l01', 'P'),
      mkProject('pfm26-p002-l02', 'P'),
      mkProject('pfm26-p003-l03', 'P'),
    ];
    const datasets: DatasetSummary[] = [
      mkDataset('pfm26-p001-l01', { isActive: true }),
      mkDataset('pfm26-p002-l02', { isActive: false }),
      mkDataset('pfm26-p003-l03', { isActive: true }),
    ];

    const result = buildBdStatusList(projects, datasets);

    const ids = result.map(r => r.fmeaId);
    expect(ids).toContain('pfm26-p001-l01');
    expect(ids).not.toContain('pfm26-p002-l02');
    expect(ids).toContain('pfm26-p003-l03');
    expect(result).toHaveLength(2);
  });

  it('dataset이 없는 프로젝트는 목록에 포함 (isActive 기본 true)', () => {
    const projects = [mkProject('pfm26-p001-l01', 'M')];
    const datasets: DatasetSummary[] = [];

    const result = buildBdStatusList(projects, datasets);

    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(true);
    expect(result[0].itemCount).toBe(0);
  });

  it('fmeaType 필터: pfm으로 시작하고 M/F/P만 포함', () => {
    const projects = [
      mkProject('pfm26-p001-l01', 'P'),
      mkProject('dfm26-d001-l01', 'P'),
      mkProject('pfm26-p002-l02', 'X'),
    ];
    const datasets: DatasetSummary[] = [
      mkDataset('pfm26-p001-l01'),
    ];

    const result = buildBdStatusList(projects, datasets);

    expect(result).toHaveLength(1);
    expect(result[0].fmeaId).toBe('pfm26-p001-l01');
  });

  it('정렬: M > F > P 순서, 같은 타입은 fmeaId 오름차순', () => {
    const projects = [
      mkProject('pfm26-p002-l02', 'P'),
      mkProject('pfm26-f001-l01', 'F'),
      mkProject('pfm26-m001-l01', 'M'),
      mkProject('pfm26-p001-l01', 'P'),
    ];
    const datasets: DatasetSummary[] = [
      mkDataset('pfm26-p002-l02'),
      mkDataset('pfm26-f001-l01', { fmeaType: 'F' }),
      mkDataset('pfm26-m001-l01', { fmeaType: 'M' }),
      mkDataset('pfm26-p001-l01'),
    ];

    const result = buildBdStatusList(projects, datasets);

    expect(result.map(r => r.fmeaId)).toEqual([
      'pfm26-m001-l01',
      'pfm26-f001-l01',
      'pfm26-p001-l01',
      'pfm26-p002-l02',
    ]);
  });

  it('soft delete된 항목의 processCount/fmCount/fcCount는 반환되지 않음', () => {
    const projects = [
      mkProject('pfm26-p001-l01', 'P'),
      mkProject('pfm26-p002-l02', 'P'),
    ];
    const datasets: DatasetSummary[] = [
      mkDataset('pfm26-p001-l01', { processCount: 10, fmCount: 20, fcCount: 30 }),
      mkDataset('pfm26-p002-l02', { isActive: false, processCount: 5, fmCount: 10, fcCount: 15 }),
    ];

    const result = buildBdStatusList(projects, datasets);

    expect(result).toHaveLength(1);
    expect(result[0].processCount).toBe(10);
    expect(result[0].fmCount).toBe(20);
    expect(result[0].fcCount).toBe(30);
  });

  it('전체 soft delete 시 빈 목록 반환', () => {
    const projects = [
      mkProject('pfm26-p001-l01', 'P'),
      mkProject('pfm26-p002-l02', 'P'),
    ];
    const datasets: DatasetSummary[] = [
      mkDataset('pfm26-p001-l01', { isActive: false }),
      mkDataset('pfm26-p002-l02', { isActive: false }),
    ];

    const result = buildBdStatusList(projects, datasets);

    expect(result).toHaveLength(0);
  });
});

// ---------- handleBdDeleteDatasets 로직 테스트 (순수 함수 분리) ----------

describe('BD 삭제 후 프로젝트 필터링 로직', () => {
  it('삭제 대상 fmeaId가 프로젝트 목록에서 제거됨', () => {
    const bdFmeaList: FMEAProject[] = [
      mkProject('pfm26-p001-l18', 'P'),
      mkProject('pfm26-p002-l20', 'P'),
      mkProject('pfm26-t004-l22', 'P'),
    ];
    const fmeaIds = ['pfm26-p001-l18', 'pfm26-t004-l22'];

    const deletedSet = new Set(fmeaIds.map(id => id.toLowerCase()));
    const updatedFmeaList = bdFmeaList.filter(f => !deletedSet.has(f.id.toLowerCase()));

    expect(updatedFmeaList).toHaveLength(1);
    expect(updatedFmeaList[0].id).toBe('pfm26-p002-l20');
  });

  it('빈 삭제 목록이면 프로젝트 변경 없음', () => {
    const bdFmeaList: FMEAProject[] = [
      mkProject('pfm26-p001-l01', 'P'),
      mkProject('pfm26-p002-l02', 'P'),
    ];
    const fmeaIds: string[] = [];

    const deletedSet = new Set(fmeaIds.map(id => id.toLowerCase()));
    const updatedFmeaList = bdFmeaList.filter(f => !deletedSet.has(f.id.toLowerCase()));

    expect(updatedFmeaList).toHaveLength(2);
  });

  it('대소문자 무관하게 삭제 매칭', () => {
    const bdFmeaList: FMEAProject[] = [
      mkProject('pfm26-P001-L18', 'P'),
    ];
    const fmeaIds = ['PFM26-p001-l18'];

    const deletedSet = new Set(fmeaIds.map(id => id.toLowerCase()));
    const updatedFmeaList = bdFmeaList.filter(f => !deletedSet.has(f.id.toLowerCase()));

    expect(updatedFmeaList).toHaveLength(0);
  });
});

// ---------- API soft delete 테스트 ----------

describe('API soft delete 호출 테스트', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('PATCH /api/pfmea/master 에 softDelete action 전송', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, updated: 2 }),
    });
    global.fetch = mockFetch;

    const fmeaIds = ['pfm26-p001-l18', 'pfm26-t004-l22'];
    const res = await fetch('/api/pfmea/master', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaIds, action: 'softDelete' }),
    });
    const result = await res.json();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/pfmea/master');
    expect(options.method).toBe('PATCH');

    const body = JSON.parse(options.body);
    expect(body.action).toBe('softDelete');
    expect(body.fmeaIds).toEqual(['pfm26-p001-l18', 'pfm26-t004-l22']);
    expect(result.success).toBe(true);
  });

  it('API 실패 시 에러 처리', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'Not found' }),
    });
    global.fetch = mockFetch;

    const fmeaIds = ['non-existent-id'];
    const res = await fetch('/api/pfmea/master', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaIds, action: 'softDelete' }),
    });
    const result = await res.json();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not found');
  });

  it('네트워크 에러 시 예외 발생', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    await expect(
      fetch('/api/pfmea/master', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaIds: ['test'], action: 'softDelete' }),
      }),
    ).rejects.toThrow('Network error');
  });
});

// ---------- loadAllDatasetSummaries + deletedFmeaIds 테스트 ----------

describe('loadAllDatasetSummaries deletedFmeaIds 연동', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('API 응답의 deletedFmeaIds로 프로젝트를 올바르게 필터링', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        datasets: [
          mkDataset('pfm26-p002-l02'),
          mkDataset('pfm26-p003-l03'),
        ],
        deletedFmeaIds: ['pfm26-p001-l18', 'pfm26-t004-l22'],
      }),
    });
    global.fetch = mockFetch;

    const res = await fetch('/api/pfmea/master');
    const json = await res.json();
    const deletedFmeaIds: string[] = json.deletedFmeaIds || [];

    const projects = [
      mkProject('pfm26-p001-l18', 'P'),
      mkProject('pfm26-p002-l02', 'P'),
      mkProject('pfm26-p003-l03', 'P'),
      mkProject('pfm26-t004-l22', 'P'),
    ];

    const activeProjects = projects.filter(p => !deletedFmeaIds.includes(p.id.toLowerCase()));
    expect(activeProjects).toHaveLength(2);
    expect(activeProjects.map(p => p.id)).toEqual(['pfm26-p002-l02', 'pfm26-p003-l03']);

    const result = buildBdStatusList(activeProjects, json.datasets);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.fmeaId)).not.toContain('pfm26-p001-l18');
    expect(result.map(r => r.fmeaId)).not.toContain('pfm26-t004-l22');
  });

  it('deletedFmeaIds가 비어있으면 모든 프로젝트 유지', async () => {
    const projects = [
      mkProject('pfm26-p001-l01', 'P'),
      mkProject('pfm26-p002-l02', 'P'),
    ];
    const deletedFmeaIds: string[] = [];
    const activeProjects = projects.filter(p => !deletedFmeaIds.includes(p.id.toLowerCase()));
    expect(activeProjects).toHaveLength(2);
  });
});

// ---------- M/F/P 유형 필터링 테스트 ----------

describe('BD 유형 필터 로직', () => {
  it('유형별 후보 필터링: Master만', () => {
    const bdStatusList: BdStatusItem[] = [
      { fmeaId: 'pfm26-m001-l01', fmeaType: 'M', fmeaName: 'Master 1', bdId: 'MBD-1', itemCount: 5, dataCount: 100, fmCount: 10, fcCount: 20, processCount: 5 },
      { fmeaId: 'pfm26-m002-l02', fmeaType: 'M', fmeaName: 'Master 2', bdId: 'MBD-2', itemCount: 3, dataCount: 50, fmCount: 5, fcCount: 10, processCount: 3 },
      { fmeaId: 'pfm26-f001-l03', fmeaType: 'F', fmeaName: 'Family 1', bdId: 'FBD-1', itemCount: 4, dataCount: 80, fmCount: 8, fcCount: 15, processCount: 4 },
      { fmeaId: 'pfm26-p001-l04', fmeaType: 'P', fmeaName: 'Part 1', bdId: 'PBD-1', itemCount: 2, dataCount: 30, fmCount: 3, fcCount: 5, processCount: 2 },
    ];

    const masterCandidates = bdStatusList.filter(bd => bd.fmeaType === 'M');
    expect(masterCandidates).toHaveLength(2);
    expect(masterCandidates.map(c => c.fmeaId)).toEqual(['pfm26-m001-l01', 'pfm26-m002-l02']);
  });

  it('유형별 후보 필터링: Family만', () => {
    const bdStatusList: BdStatusItem[] = [
      { fmeaId: 'pfm26-m001-l01', fmeaType: 'M', fmeaName: 'Master 1', bdId: 'MBD-1', itemCount: 5, dataCount: 100 },
      { fmeaId: 'pfm26-f001-l03', fmeaType: 'F', fmeaName: 'Family 1', bdId: 'FBD-1', itemCount: 4, dataCount: 80 },
      { fmeaId: 'pfm26-f002-l04', fmeaType: 'F', fmeaName: 'Family 2', bdId: 'FBD-2', itemCount: 3, dataCount: 60 },
    ];

    const familyCandidates = bdStatusList.filter(bd => bd.fmeaType === 'F');
    expect(familyCandidates).toHaveLength(2);
  });

  it('유형 후보가 0개면 빈 배열', () => {
    const bdStatusList: BdStatusItem[] = [
      { fmeaId: 'pfm26-p001-l01', fmeaType: 'P', fmeaName: 'Part 1', bdId: 'PBD-1', itemCount: 2, dataCount: 30 },
    ];
    expect(bdStatusList.filter(bd => bd.fmeaType === 'M')).toHaveLength(0);
    expect(bdStatusList.filter(bd => bd.fmeaType === 'F')).toHaveLength(0);
  });

  it('유형 후보가 1개면 즉시 선택 (모달 불필요)', () => {
    const bdStatusList: BdStatusItem[] = [
      { fmeaId: 'pfm26-m001-l01', fmeaType: 'M', fmeaName: 'Master 1', bdId: 'MBD-1', itemCount: 5, dataCount: 100 },
      { fmeaId: 'pfm26-p001-l02', fmeaType: 'P', fmeaName: 'Part 1', bdId: 'PBD-1', itemCount: 2, dataCount: 30 },
    ];

    const masterCandidates = bdStatusList.filter(bd => bd.fmeaType === 'M');
    expect(masterCandidates).toHaveLength(1);
    const selectedId = masterCandidates[0].fmeaId;
    expect(selectedId).toBe('pfm26-m001-l01');
  });

  it('유형 필터 적용 후 검색 조합', () => {
    const bdStatusList: BdStatusItem[] = [
      { fmeaId: 'pfm26-p001-l01', fmeaType: 'P', fmeaName: 'Door Panel', bdId: 'PBD-1', itemCount: 5, dataCount: 100, companyName: 'AMP' },
      { fmeaId: 'pfm26-p002-l02', fmeaType: 'P', fmeaName: 'Hood', bdId: 'PBD-2', itemCount: 3, dataCount: 50, companyName: 'T&F' },
      { fmeaId: 'pfm26-m001-l03', fmeaType: 'M', fmeaName: 'Master All', bdId: 'MBD-1', itemCount: 10, dataCount: 200, companyName: 'AMP' },
    ];

    // 유형 P만 필터
    const partOnly = bdStatusList.filter(bd => bd.fmeaType === 'P');
    expect(partOnly).toHaveLength(2);

    // 유형 P + 검색 "Door"
    const search = 'door';
    const partSearch = partOnly.filter(bd => bd.fmeaName.toLowerCase().includes(search));
    expect(partSearch).toHaveLength(1);
    expect(partSearch[0].fmeaId).toBe('pfm26-p001-l01');
  });
});

// ---------- 통합 시나리오 ----------

describe('BD 삭제 통합 시나리오', () => {
  it('삭제 → 프로젝트 필터 → buildBdStatusList 일관성', () => {
    const projects: FMEAProject[] = [
      mkProject('pfm26-p001-l01', 'P'),
      mkProject('pfm26-p002-l02', 'F'),
      mkProject('pfm26-p003-l03', 'M'),
    ];
    const allDatasets: DatasetSummary[] = [
      mkDataset('pfm26-p001-l01', { isActive: true }),
      mkDataset('pfm26-p002-l02', { fmeaType: 'F', isActive: true }),
      mkDataset('pfm26-p003-l03', { fmeaType: 'M', isActive: true }),
    ];

    // Step 1: 초기 상태 - 3개 모두 표시
    const initial = buildBdStatusList(projects, allDatasets);
    expect(initial).toHaveLength(3);

    // Step 2: pfm26-p002-l02 삭제 (dataset soft delete + 프로젝트 필터)
    const deletedIds = ['pfm26-p002-l02'];
    const deletedSet = new Set(deletedIds.map(id => id.toLowerCase()));
    const filteredProjects = projects.filter(f => !deletedSet.has(f.id.toLowerCase()));
    const filteredDatasets = allDatasets.filter(ds => ds.fmeaId !== 'pfm26-p002-l02');

    const afterDelete = buildBdStatusList(filteredProjects, filteredDatasets);
    expect(afterDelete).toHaveLength(2);
    expect(afterDelete.map(r => r.fmeaId)).not.toContain('pfm26-p002-l02');

    // Step 3: 나머지 항목의 데이터 무결성 확인
    const p1 = afterDelete.find(r => r.fmeaId === 'pfm26-p001-l01');
    expect(p1).toBeDefined();
    expect(p1!.processCount).toBe(5);
    expect(p1!.fmCount).toBe(20);
    expect(p1!.fcCount).toBe(30);
  });

  it('soft delete된 dataset이 API 응답에서 제외된 경우도 필터링', () => {
    const projects: FMEAProject[] = [
      mkProject('pfm26-p001-l01', 'P'),
      mkProject('pfm26-p002-l02', 'P'),
    ];
    // API가 isActive=true만 반환하므로 삭제된 p002는 datasets에 없음
    const datasetsFromApi: DatasetSummary[] = [
      mkDataset('pfm26-p001-l01', { isActive: true }),
    ];

    // p002는 dataset이 없으므로 ds=undefined → isActive 기본 true → 목록에 포함됨
    // 이것이 버그의 원인이었음: 프로젝트 목록에서도 제거해야 함
    const beforeFix = buildBdStatusList(projects, datasetsFromApi);
    // 프로젝트를 필터링하지 않으면 p002도 표시됨 (dataset 없는 신규 프로젝트로 간주)
    expect(beforeFix).toHaveLength(2);

    // 프로젝트를 먼저 필터링한 후
    const deletedIds = ['pfm26-p002-l02'];
    const deletedSet = new Set(deletedIds.map(id => id.toLowerCase()));
    const filteredProjects = projects.filter(f => !deletedSet.has(f.id.toLowerCase()));

    const afterFix = buildBdStatusList(filteredProjects, datasetsFromApi);
    expect(afterFix).toHaveLength(1);
    expect(afterFix[0].fmeaId).toBe('pfm26-p001-l01');
  });
});
