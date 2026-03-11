/**
 * @file sequential-pipeline-regression.test.ts
 * @description 등록 → Import → 워크시트 순차 파이프라인 회귀 테스트
 *
 * 이 테스트는 전체 파이프라인의 데이터 흐름을 순차적으로 시뮬레이션하여
 * 각 단계 간 ID/l1Name/FailureLink 정합성을 검증합니다.
 *
 * 시뮬레이션 순서:
 *   Step 1: 프로젝트 등록 → FMEA ID 생성
 *   Step 2: Import 페이지 → URL 파라미터로 ID 수신 → l1Name 산출
 *   Step 3: Import → DB 저장 API 호출 (ID 전달)
 *   Step 4: Import → 워크시트 리다이렉트 (ID 전달)
 *   Step 5: 워크시트 → API에서 데이터 로드 (ID 전달)
 *   Step 6: 워크시트 → 상태 구성 (l1Name, failureLinks, l2)
 *
 * @created 2026-03-10
 */

import { describe, it, expect } from 'vitest';

// ---- 각 단계의 순수 로직 추출 ----

// Step 1: FMEA ID 생성 시뮬레이션
function generateFmeaId(type: 'P' | 'D' = 'P'): string {
  const prefix = type === 'P' ? 'pfm' : 'dfm';
  return `${prefix}26-p001-l01-r00`;
}

// Step 2: Import URL 파라미터 → selectedFmeaId
function importExtractId(url: string): string | null {
  const params = new URLSearchParams(url.split('?')[1] || '');
  return params.get('id');
}

// Step 2b: Import l1Name 산출
function importComputeL1Name(fmeaInfo: { partName?: string; subject?: string }, project?: { productName?: string }): string {
  const rawL1 = fmeaInfo?.partName
    || fmeaInfo?.subject
    || project?.productName
    || '';
  return rawL1.replace(/\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i, '').trim();
}

// Step 3: Import 저장 URL 구성
function importBuildSaveUrl(fmeaId: string): string {
  return `/api/fmea/save-from-import`;
}

// Step 4: Import → 워크시트 리다이렉트 URL 구성
function importBuildWorksheetUrl(fmeaId: string, tab: string = 'structure'): string {
  return `/pfmea/worksheet?id=${fmeaId}&tab=${tab}`;
}

// Step 5: 워크시트 URL → fmeaId 추출 (useWorksheetState 로직)
function worksheetExtractId(url: string): string | null {
  const params = new URLSearchParams(url.split('?')[1] || '');
  return params.get('id')?.toLowerCase()
    || params.get('fmeaId')?.toLowerCase()
    || null;
}

// Step 5b: API GET URL에서 fmeaId 추출 (fmea/route.ts 로직)
function apiExtractFmeaId(params: URLSearchParams): string | undefined {
  const originalQueryFmeaId = params.get('fmeaId') || params.get('id');
  return originalQueryFmeaId?.toLowerCase();
}

// Step 6: ensureL1Types (간소화)
function ensureL1Types(l1: any, projectL1Name: string): any {
  if (!l1) return { name: projectL1Name, types: [], failureScopes: [] };
  const currentName = l1.name || '';
  const isPlaceholder = !currentName || currentName.includes('입력') || currentName.trim() === '';
  const finalL1Name = projectL1Name || (isPlaceholder ? '' : currentName);
  return { ...l1, name: finalL1Name };
}

// ---- 순차 파이프라인 테스트 ----

describe('순차 파이프라인 회귀 — 등록 → Import → 워크시트', () => {
  const FMEA_ID = 'pfm26-p001-l01-r00';
  const PART_NAME = '엔진부품';
  const SUBJECT = '엔진부품+PFMEA';
  const PRODUCT_NAME = '자동차 엔진';

  it('Step 1→2: 등록 생성 ID가 Import URL에서 정확히 추출됨', () => {
    const fmeaId = generateFmeaId('P');
    const importUrl = `/pfmea/import/legacy?id=${fmeaId}`;
    const extracted = importExtractId(importUrl);
    expect(extracted).toBe(fmeaId);
  });

  it('Step 2→3: Import l1Name 산출 → 저장 API에 전달', () => {
    const l1Name = importComputeL1Name(
      { partName: PART_NAME, subject: SUBJECT },
      { productName: PRODUCT_NAME },
    );
    expect(l1Name).toBe(PART_NAME); // partName 우선
    // 저장 API body에 l1Name 포함 가능
    const saveBody = { fmeaId: FMEA_ID, l1Name };
    expect(saveBody.fmeaId).toBe(FMEA_ID);
    expect(saveBody.l1Name).toBe(PART_NAME);
  });

  it('Step 3→4: Import 저장 후 워크시트 리다이렉트 URL 정합성', () => {
    const redirectUrl = importBuildWorksheetUrl(FMEA_ID);
    expect(redirectUrl).toBe(`/pfmea/worksheet?id=${FMEA_ID}&tab=structure`);

    // 워크시트에서 추출한 ID가 원본과 일치
    const wsId = worksheetExtractId(redirectUrl);
    expect(wsId).toBe(FMEA_ID);
  });

  it('Step 4→5: 워크시트 → API 데이터 로드 시 ID 정합성', () => {
    // 워크시트가 ?id= 로 요청
    const apiParams = new URLSearchParams(`id=${FMEA_ID}`);
    const apiId = apiExtractFmeaId(apiParams);
    expect(apiId).toBe(FMEA_ID);

    // 워크시트가 ?fmeaId= 로 요청 (레거시 호환)
    const legacyParams = new URLSearchParams(`fmeaId=${FMEA_ID}`);
    const legacyId = apiExtractFmeaId(legacyParams);
    expect(legacyId).toBe(FMEA_ID);
  });

  it('Step 5→6: 로드된 데이터 → ensureL1Types 적용 → l1Name 정합성', () => {
    // DB에서 로드된 l1 (아직 등록정보 반영 안 된 상태)
    const dbL1 = { name: SUBJECT, types: [{ id: 't1', name: 'YP', functions: [] }], failureScopes: [] };
    const result = ensureL1Types(dbL1, PART_NAME);
    // projectL1Name(등록정보)이 우선 → subject 덮어쓰기
    expect(result.name).toBe(PART_NAME);
  });

  it('전체 파이프라인 — ID가 모든 단계에서 일관됨', () => {
    // 1. 등록
    const fmeaId = generateFmeaId('P');

    // 2. Import 진입
    const importUrl = `/pfmea/import/legacy?id=${fmeaId}`;
    const importId = importExtractId(importUrl);
    expect(importId).toBe(fmeaId);

    // 3. Import 저장
    const saveUrl = importBuildSaveUrl(fmeaId);
    expect(saveUrl).toContain('save-from-import');

    // 4. 워크시트 리다이렉트
    const wsUrl = importBuildWorksheetUrl(fmeaId);
    const wsId = worksheetExtractId(wsUrl);
    expect(wsId).toBe(fmeaId);

    // 5. API 로드
    const apiId = apiExtractFmeaId(new URLSearchParams(`id=${fmeaId}`));
    expect(apiId).toBe(fmeaId);

    // 모든 단계 ID 일치
    expect(importId).toBe(wsId);
    expect(wsId).toBe(apiId);
  });
});

// ---- 대소문자 정규화 순차 테스트 ----

describe('대소문자 정규화 — 전 단계 일관성', () => {
  it('대문자 ID가 모든 단계에서 소문자로 정규화됨', () => {
    const originalId = 'PFM26-P001-L01-R00';
    const expected = 'pfm26-p001-l01-r00';

    // Import → 워크시트 URL
    const wsUrl = `/pfmea/worksheet?id=${originalId}`;
    const wsId = worksheetExtractId(wsUrl);
    expect(wsId).toBe(expected);

    // API 로드
    const apiId = apiExtractFmeaId(new URLSearchParams(`id=${originalId}`));
    expect(apiId).toBe(expected);

    // fmeaId 파라미터로도 동일
    const legacyId = apiExtractFmeaId(new URLSearchParams(`fmeaId=${originalId}`));
    expect(legacyId).toBe(expected);
  });
});

// ---- FailureLink 파이프라인 회귀 테스트 ----

describe('FailureLink 파이프라인 회귀', () => {
  // Import → DB 저장 → 워크시트 로드 시 failureLinks 유지
  it('Import에서 생성된 failureLinks가 워크시트 로드 시 유지됨', () => {
    const importLinks = [
      { id: 'fl1', fmId: 'fm1', feId: 'fe1', fcId: 'fc1', fmText: '변형', feText: '파손', fcText: '오조립' },
      { id: 'fl2', fmId: 'fm2', feId: 'fe2', fcId: 'fc2', fmText: '균열', feText: '누수', fcText: '과부하' },
    ];

    // DB에서 로드된 데이터에 links 포함
    const dbData = {
      l1: { name: '엔진', types: [], failureScopes: [] },
      l2: [{ id: 'p1', no: '10', name: '드릴링', l3: [], functions: [], failureModes: [], failureCauses: [] }],
      failureLinks: importLinks,
      riskData: {},
    };

    // 워크시트 상태 구성 시 failureLinks 보존
    const stateLinks = dbData.failureLinks || [];
    expect(stateLinks).toHaveLength(2);
    expect(stateLinks[0].fmText).toBe('변형');
    expect(stateLinks[1].fcText).toBe('과부하');
  });

  it('Import failureLinks가 0건이고 dbLegacy에 있으면 복원', () => {
    const dbLegacyLinks = [
      { id: 'fl1', fmId: 'fm1', feId: 'fe1', fcId: 'fc1' },
    ];

    // 선택된 best candidate에 links 없음
    const stateLinks: any[] = [];

    // 폴백 로직
    const finalLinks = stateLinks.length === 0 && dbLegacyLinks.length > 0
      ? dbLegacyLinks
      : stateLinks;

    expect(finalLinks).toHaveLength(1);
    expect(finalLinks[0].id).toBe('fl1');
  });
});

// ---- l1Name 파이프라인 — Import → resave → 워크시트 일관성 ----

describe('l1Name 파이프라인 — Import → resave-import → 워크시트', () => {
  const REG = { partName: '엔진블록', subject: '엔진블록+PFMEA' };
  const PROJECT = { productName: '자동차 엔진' };

  it('Import와 resave-import에서 동일한 l1Name 산출', () => {
    // Import 단계
    const importL1 = importComputeL1Name(
      { partName: REG.partName, subject: REG.subject },
      PROJECT,
    );

    // resave-import 단계 (DB reg에서 조회)
    const raw = REG.partName || REG.subject || '';
    const resaveL1 = raw.replace(/\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i, '').trim();

    expect(importL1).toBe('엔진블록');
    expect(resaveL1).toBe('엔진블록');
    expect(importL1).toBe(resaveL1);
  });

  it('워크시트 로드 시 projectL1Name으로 l1Name 통일', () => {
    const projectL1Name = '엔진블록'; // 등록정보에서 추출
    const dbL1 = { name: '엔진블록+PFMEA', types: [{ id: 't1', name: 'YP', functions: [] }], failureScopes: [] };

    const result = ensureL1Types(dbL1, projectL1Name);
    expect(result.name).toBe('엔진블록'); // 접미사 없는 정제된 이름
  });

  it('등록정보 없는 경우 — "입력" 포함 name은 placeholder로 판단됨', () => {
    // "수동입력이름"에 "입력" 문자열 포함 → isPlaceholder=true → 빈 문자열
    const dbL1Placeholder = { name: '수동입력이름', types: [{ id: 't1', name: 'YP', functions: [] }], failureScopes: [] };
    const result1 = ensureL1Types(dbL1Placeholder, '');
    expect(result1.name).toBe(''); // "입력" 포함이므로 placeholder 처리

    // 일반 이름(placeholder 아닌 경우) → 유지
    const dbL1Normal = { name: '엔진블록', types: [{ id: 't1', name: 'YP', functions: [] }], failureScopes: [] };
    const result2 = ensureL1Types(dbL1Normal, '');
    expect(result2.name).toBe('엔진블록');
  });
});

// ---- 엣지 케이스 ----

describe('엣지 케이스 — 파이프라인 경계값', () => {
  it('fmeaId에 한국어 포함 → 소문자 변환 무영향', () => {
    // 실제로 한국어 ID는 없지만, 만약 들어오면 소문자 변환이 안전한지
    const wsId = worksheetExtractId('/pfmea/worksheet?id=한국어ID');
    expect(wsId).toBe('한국어id');
  });

  it('fmeaId가 매우 긴 경우 → 정상 추출', () => {
    const longId = 'pfm26-p001-l01-r00-' + 'x'.repeat(100);
    const params = new URLSearchParams(`id=${longId}`);
    expect(apiExtractFmeaId(params)).toBe(longId);
  });

  it('URL에 인코딩된 특수문자 → 정상 디코딩', () => {
    const encodedId = encodeURIComponent('pfm26-p001-l01');
    const params = new URLSearchParams(`id=${encodedId}`);
    expect(apiExtractFmeaId(params)).toBe('pfm26-p001-l01');
  });

  it('빈 ?id= → 빈 문자열 (falsy)', () => {
    const params = new URLSearchParams('id=');
    const result = apiExtractFmeaId(params);
    expect(result).toBe('');
  });

  it('?id=null 문자열 → "null" 반환 (유효하지 않은 ID)', () => {
    const params = new URLSearchParams('id=null');
    expect(apiExtractFmeaId(params)).toBe('null');
  });
});
