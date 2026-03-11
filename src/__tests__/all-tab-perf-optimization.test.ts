/**
 * @file all-tab-perf-optimization.test.ts
 * @description ALL탭 CRITICAL 성능 최적화 3건 — 회귀 테스트
 *
 * Phase 1: AllTabRenderer useMemo — enrichFailureLinks 출력 일관성
 * Phase 3: useControlModalSave — 자동연결 Map 기반 카운팅 정확성
 *
 * @created 2026-03-04
 */

import { describe, it, expect } from 'vitest';
import { enrichFailureLinks } from '@/lib/fmea-core/enrichFailureChains';
import type { WorksheetState } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import type { ProcessedFMGroup } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/processFailureLinks';
import {
  buildAutoLinkIndex,
  countAutoLinks,
  type AutoLinkIndex,
  type AutoLinkCounts,
} from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/hooks/autoLinkUtils';

// ═══════════════════════════════════════════
// 공통 테스트 픽스처
// ═══════════════════════════════════════════

/** 최소 WorksheetState 픽스처 */
function createMockState(): WorksheetState {
  return {
    l1: {
      id: 'l1-1',
      name: '완제품공정',
      types: [
        {
          id: 'type-1',
          name: 'YP',
          functions: [
            {
              id: 'func-1',
              name: '기능A',
              requirements: [
                { id: 'req-1', name: '요구사항A' },
                { id: 'req-2', name: '요구사항B' },
              ],
            },
          ],
        },
      ],
      failureScopes: [
        { id: 'fe-1', effect: '고장영향1', severity: 8, reqId: 'req-1', scope: 'YP', requirement: '요구사항A' },
        { id: 'fe-2', effect: '고장영향2', severity: 6, reqId: 'req-2', scope: 'YP', requirement: '요구사항B' },
      ],
    },
    l2: [
      {
        id: 'proc-1',
        no: '10',
        name: '프레스공정',
        functions: [
          {
            id: 'l2func-1',
            name: '프레스기능',
            productChars: [
              { id: 'pc-1', name: '치수정밀도', specialChar: '' },
            ],
          },
        ],
        failureModes: [
          { id: 'fm-1', name: '치수불량', productCharId: 'pc-1' },
          { id: 'fm-2', name: '표면결함', productCharId: 'pc-1' },
        ],
        failureCauses: [
          { id: 'fc-1', name: '금형마모', processCharId: 'l3pc-1' },
          { id: 'fc-2', name: '소재불량', processCharId: 'l3pc-2' },
          { id: 'fc-3', name: '금형마모', processCharId: 'l3pc-3' },  // ← 동일 원인 텍스트
        ],
        l3: [
          {
            id: 'we-1',
            name: '금형세팅',
            m4: 'MN',
            functions: [
              {
                id: 'l3func-1',
                name: '금형정렬',
                processChars: [
                  { id: 'l3pc-1', name: '금형간격', specialChar: '' },
                  { id: 'l3pc-3', name: '금형압력', specialChar: '' },
                ],
              },
            ],
          },
          {
            id: 'we-2',
            name: '소재투입',
            m4: 'MT',
            functions: [
              {
                id: 'l3func-2',
                name: '소재검사',
                processChars: [
                  { id: 'l3pc-2', name: '소재강도', specialChar: '' },
                ],
              },
            ],
          },
        ],
      },
    ],
    failureLinks: [
      { fmId: 'fm-1', fmText: '치수불량', feId: 'fe-1', feText: '고장영향1', severity: 8, fcId: 'fc-1', fcText: '금형마모', fmProcessNo: '10' },
      { fmId: 'fm-1', fmText: '치수불량', feId: 'fe-2', feText: '고장영향2', severity: 6, fcId: 'fc-2', fcText: '소재불량', fmProcessNo: '10' },
      { fmId: 'fm-2', fmText: '표면결함', feId: 'fe-1', feText: '고장영향1', severity: 8, fcId: 'fc-3', fcText: '금형마모', fmProcessNo: '10' },
    ],
    riskData: {
      'risk-fm-1-fc-1-S': 8,
      'risk-fm-1-fc-1-O': 4,
      'risk-fm-1-fc-1-D': 6,
      'risk-fm-1-fc-2-S': 6,
      'risk-fm-1-fc-2-O': 3,
      'risk-fm-1-fc-2-D': 5,
      'risk-fm-2-fc-3-O': 4,
      'risk-fm-2-fc-3-D': 6,
      'prevention-fm-1-fc-1': 'P:SPC 관리',
      'detection-fm-1-fc-1': 'D:육안검사',
      'detection-fm-2-fc-3': 'D:육안검사',
    },
    visibleSteps: [2, 3, 4, 5, 6],
  } as unknown as WorksheetState;
}

/** ProcessedFMGroup 픽스처 */
function createMockProcessedGroups(): ProcessedFMGroup[] {
  return [
    {
      fmId: 'fm-1',
      fmNo: 'M1',
      fmText: '치수불량',
      fmRowSpan: 2,
      maxSeverity: 8,
      maxSeverityFeText: '고장영향1',
      l1ProductName: '완제품공정',
      fmProcessNo: '10',
      fmProcessName: '프레스공정',
      fmProcessFunction: '프레스기능',
      fmProductChar: '치수정밀도',
      fmProductCharSC: '',
      rows: [
        {
          feId: 'fe-1', feText: '고장영향1', feSeverity: 8,
          fcId: 'fc-1', fcText: '금형마모',
          feRowSpan: 1, fcRowSpan: 1, isFirstRow: true,
          feCategory: 'YP', feFunctionName: '기능A', feRequirement: '요구사항A',
          fcWorkFunction: '금형정렬', fcProcessChar: '금형간격', fcProcessCharSC: '',
          fcM4: 'MN', fcWorkElem: '금형세팅',
        },
        {
          feId: 'fe-2', feText: '고장영향2', feSeverity: 6,
          fcId: 'fc-2', fcText: '소재불량',
          feRowSpan: 1, fcRowSpan: 1, isFirstRow: false,
          feCategory: 'YP', feFunctionName: '기능A', feRequirement: '요구사항B',
          fcWorkFunction: '소재검사', fcProcessChar: '소재강도', fcProcessCharSC: '',
          fcM4: 'MT', fcWorkElem: '소재투입',
        },
      ],
    },
    {
      fmId: 'fm-2',
      fmNo: 'M2',
      fmText: '표면결함',
      fmRowSpan: 1,
      maxSeverity: 8,
      maxSeverityFeText: '고장영향1',
      l1ProductName: '완제품공정',
      fmProcessNo: '10',
      fmProcessName: '프레스공정',
      fmProcessFunction: '프레스기능',
      fmProductChar: '치수정밀도',
      fmProductCharSC: '',
      rows: [
        {
          feId: 'fe-1', feText: '고장영향1', feSeverity: 8,
          fcId: 'fc-3', fcText: '금형마모',   // ← fc-1과 동일 텍스트
          feRowSpan: 1, fcRowSpan: 1, isFirstRow: true,
          feCategory: 'YP', feFunctionName: '기능A', feRequirement: '요구사항A',
          fcWorkFunction: '금형정렬', fcProcessChar: '금형압력', fcProcessCharSC: '',
          fcM4: 'MN', fcWorkElem: '금형세팅',
        },
      ],
    },
  ];
}

// ═══════════════════════════════════════════
// Phase 1: enrichFailureLinks 출력 일관성
// ═══════════════════════════════════════════

describe('Phase 1: enrichFailureLinks 멱등성 (idempotency)', () => {
  const state = createMockState();
  const rawLinks = state.failureLinks as unknown[];

  it('동일 입력 → 동일 출력 (referential equality 아닌 deep equality)', () => {
    const result1 = enrichFailureLinks(rawLinks, state);
    const result2 = enrichFailureLinks(rawLinks, state);
    expect(result1).toEqual(result2);
  });

  it('3개 링크 → 3개 enriched row 반환', () => {
    const result = enrichFailureLinks(rawLinks, state);
    expect(result).toHaveLength(3);
  });

  it('FM 역전개: fmProcessNo, fmProcessName, fmProcessFunction 채워짐', () => {
    const result = enrichFailureLinks(rawLinks, state);
    const row0 = result[0];
    expect(row0.fmProcessNo).toBe('10');
    expect(row0.fmProcessName).toBe('프레스공정');
    expect(row0.fmProcessFunction).toBe('프레스기능');
    expect(row0.fmProductChar).toBe('치수정밀도');
  });

  it('FE 역전개: feCategory, feFunctionName, feRequirement 채워짐', () => {
    const result = enrichFailureLinks(rawLinks, state);
    const row0 = result[0];
    expect(row0.feCategory).toBe('YP');
    expect(row0.feFunctionName).toBe('기능A');
    expect(row0.feRequirement).toBe('요구사항A');
  });

  it('FC 역전개: fcWorkFunction, fcProcessChar, fcM4, fcWorkElem 채워짐', () => {
    const result = enrichFailureLinks(rawLinks, state);
    const row0 = result[0];
    expect(row0.fcWorkFunction).toBe('금형정렬');
    expect(row0.fcProcessChar).toBe('금형간격');
    expect(row0.fcM4).toBe('MN');
    expect(row0.fcWorkElem).toBe('금형세팅');
  });

  it('riskData 변경은 enrichment 결과에 영향 없음 (순수 함수)', () => {
    const stateA = createMockState();
    const stateB = { ...stateA, riskData: { ...stateA.riskData, 'risk-fm-1-fc-1-O': 7 } } as unknown as WorksheetState;
    const resultA = enrichFailureLinks(rawLinks, stateA);
    const resultB = enrichFailureLinks(rawLinks, stateB);
    // enrichment는 riskData를 사용하지 않으므로 결과 동일
    expect(resultA).toEqual(resultB);
  });
});

// ═══════════════════════════════════════════
// Phase 3: 자동연결 Map 기반 카운팅
// ═══════════════════════════════════════════

describe('Phase 3: buildAutoLinkIndex — Lookup Map 구축', () => {
  const groups = createMockProcessedGroups();

  it('buildAutoLinkIndex가 rowsByFcText Map을 올바르게 구축', () => {
    const index = buildAutoLinkIndex(groups);
    expect(index.rowsByFcText).toBeInstanceOf(Map);

    // "금형마모" → fc-1 (fm-1) + fc-3 (fm-2) = 2건
    const moldWearRows = index.rowsByFcText.get('금형마모') || [];
    expect(moldWearRows).toHaveLength(2);
    expect(moldWearRows.map(r => r.rFcId).sort()).toEqual(['fc-1', 'fc-3']);

    // "소재불량" → fc-2 (fm-1) = 1건
    const materialRows = index.rowsByFcText.get('소재불량') || [];
    expect(materialRows).toHaveLength(1);
    expect(materialRows[0].rFcId).toBe('fc-2');
  });

  it('buildAutoLinkIndex가 rowsByFmText Map을 올바르게 구축', () => {
    const index = buildAutoLinkIndex(groups);
    expect(index.rowsByFmText).toBeInstanceOf(Map);

    // "치수불량" → fm-1의 2개 행
    const dimRows = index.rowsByFmText.get('치수불량') || [];
    expect(dimRows).toHaveLength(2);

    // "표면결함" → fm-2의 1개 행
    const surfRows = index.rowsByFmText.get('표면결함') || [];
    expect(surfRows).toHaveLength(1);
  });

  it('빈 groups → 빈 Map 반환', () => {
    const index = buildAutoLinkIndex([]);
    expect(index.rowsByFcText.size).toBe(0);
    expect(index.rowsByFmText.size).toBe(0);
  });
});

describe('Phase 3: countAutoLinks — 자동연결 카운트 정확성', () => {
  const groups = createMockProcessedGroups();
  const state = createMockState();
  const index = buildAutoLinkIndex(groups);

  it('자동연결 1: 같은 공정 + 동일 FC텍스트 → 카운트 정확', () => {
    // fc-1 "금형마모" (fm-1, 공정 10) → fc-3 "금형마모" (fm-2, 공정 10) = 1건 매칭
    const counts = countAutoLinks({
      index,
      groups,
      state,
      saveType: 'prevention',
      currentFcId: 'fc-1',
      currentFcText: '금형마모',
      currentProcessNo: '10',
      currentFmId: 'fm-1',
      selectedValue: 'P:SPC 관리',
    });
    expect(counts.autoLinkedCount).toBe(1);
  });

  it('자동연결 1: 다른 공정번호면 카운트 0', () => {
    const counts = countAutoLinks({
      index,
      groups,
      state,
      saveType: 'prevention',
      currentFcId: 'fc-1',
      currentFcText: '금형마모',
      currentProcessNo: '20',  // ← 다른 공정
      currentFmId: 'fm-1',
      selectedValue: 'P:SPC 관리',
    });
    expect(counts.autoLinkedCount).toBe(0);
  });

  it('자동연결 1: 고유 FC텍스트(매칭 없음) → 카운트 0', () => {
    const counts = countAutoLinks({
      index,
      groups,
      state,
      saveType: 'prevention',
      currentFcId: 'fc-2',
      currentFcText: '소재불량',  // ← 유일한 텍스트
      currentProcessNo: '10',
      currentFmId: 'fm-1',
      selectedValue: 'P:SPC 관리',
    });
    expect(counts.autoLinkedCount).toBe(0);
  });

  it('자동연결 2 (FM 검출): 동일 FM텍스트 + 빈 셀 → 카운트 정확', () => {
    // fm-2 "표면결함" → detection 저장 → 같은 fmText "표면결함"인 다른 FC의 빈 detection 카운트
    // fixture에서 "표면결함"은 fm-2 1개뿐이므로 자기자신 제외 = 0
    const counts = countAutoLinks({
      index,
      groups,
      state,
      saveType: 'detection',
      currentFcId: 'fc-3',
      currentFcText: '금형마모',
      currentProcessNo: '10',
      currentFmId: 'fm-2',
      selectedValue: 'D:육안검사',
    });
    // fm-2는 행 1개뿐 → 자기자신 제외 → fmDetectionAutoLinkedCount = 0
    expect(counts.fmDetectionAutoLinkedCount).toBe(0);
  });

  it('자동연결 3 (발생도): 동일 예방관리 → 발생도 복사 카운트', () => {
    // fm-1/fc-1에 prevention="P:SPC 관리", O=4 이미 있음
    // 다른 행도 같은 prevention이면 O 복사 대상
    // fm-2/fc-3에는 prevention 없으므로 매칭 안 됨
    const counts = countAutoLinks({
      index,
      groups,
      state,
      saveType: 'prevention',
      currentFcId: 'fc-1',
      currentFcText: '금형마모',
      currentProcessNo: '10',
      currentFmId: 'fm-1',
      selectedValue: 'P:SPC 관리',
    });
    // "P:SPC 관리"를 가진 다른 행 = 없음 (fc-1만 가짐) → occurrenceAutoLinkedCount = 0
    expect(counts.occurrenceAutoLinkedCount).toBe(0);
  });

  it('자동연결 4 (검출도): 동일 FM 내 동일 검출관리 → 검출도 복사', () => {
    // fm-1/fc-1에 detection="D:육안검사", D=6 있음
    // fm-1/fc-2에 detection 없음 → 매칭 안 됨
    const counts = countAutoLinks({
      index,
      groups,
      state,
      saveType: 'detection',
      currentFcId: 'fc-1',
      currentFcText: '금형마모',
      currentProcessNo: '10',
      currentFmId: 'fm-1',
      selectedValue: 'D:육안검사',
    });
    // fm-1 내 fc-2의 detection이 비어있으므로 stripTypePrefix 비교 불일치 → 0
    expect(counts.detectionAutoLinkedCount).toBe(0);
  });

  it('specialChar 타입은 자동연결 비활성', () => {
    const counts = countAutoLinks({
      index,
      groups,
      state,
      saveType: 'specialChar',
      currentFcId: 'fc-1',
      currentFcText: '금형마모',
      currentProcessNo: '10',
      currentFmId: 'fm-1',
      selectedValue: '●',
    });
    expect(counts.autoLinkedCount).toBe(0);
    expect(counts.fmDetectionAutoLinkedCount).toBe(0);
    expect(counts.occurrenceAutoLinkedCount).toBe(0);
    expect(counts.detectionAutoLinkedCount).toBe(0);
  });
});
