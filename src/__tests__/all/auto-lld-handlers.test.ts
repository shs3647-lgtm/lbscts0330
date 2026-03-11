/**
 * @file auto-lld-handlers.test.ts
 * @description LLD 자동선택 핸들러 단위 테스트
 *
 * 검증 항목:
 * 1. processedFMGroups가 빈 배열일 때 → "고장연결 데이터 없음" 에러
 * 2. 유효한 FM-FC 데이터가 있을 때 → 후보 생성됨
 * 3. 모든 항목에 이미 lesson 적용 → "이미 지정됨" 에러
 * 4. fcId/fmId 누락 시 → 해당 행 건너뛰기
 * 5. LLD 매칭 로직 정상 동작
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ★ 직접 모듈 테스트가 어려우므로 (React hooks), 핸들러 로직을 순수 함수로 분리 테스트
import { extractKeywords, calcRecommendScore, type LLDItem } from '@/lib/lldRecommendUtils';
import type { ProcessedFMGroup } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/processFailureLinks';

// ──── extractKeywords 테스트 ────

describe('extractKeywords (키워드 추출)', () => {
  test('한글 텍스트에서 2글자 이상 키워드 추출', () => {
    const kw = extractKeywords('솔더 크랙 발생');
    expect(kw).toContain('솔더');
    expect(kw).toContain('크랙');
    expect(kw).toContain('발생');
  });

  test('영문+한글 혼합 텍스트', () => {
    const kw = extractKeywords('USB 인식 실패');
    expect(kw).toContain('usb');
    expect(kw).toContain('인식');
    expect(kw).toContain('실패');
  });

  test('빈 문자열 → 빈 배열', () => {
    expect(extractKeywords('')).toEqual([]);
    expect(extractKeywords(undefined as unknown as string)).toEqual([]);
  });

  test('불용어 제외', () => {
    const kw = extractKeywords('이것은 테스트 입니다');
    // '이것은' → '이것은' 분리 후 '이것', '테스트', '입니다' 등
    // 불용어 '이', '은' 등은 1글자라 이미 필터됨
    expect(kw).toContain('테스트');
  });
});

// ──── calcRecommendScore 테스트 ────

describe('calcRecommendScore (추천 점수)', () => {
  const sampleLld: LLDItem = {
    id: 'll-006',
    lldNo: 'LLD26-006',
    vehicle: 'DEF',
    target: '제조',
    failureMode: '솔더 크랙 발생',
    cause: '리플로우 온도 프로파일 불량',
    category: '예방관리',
    improvement: '온도 프로파일 최적화',
    status: 'Y',
  };

  test('일치하는 키워드 있으면 점수 > 0', () => {
    const fmKw = extractKeywords('솔더 브릿지 결함');
    const fcKw = extractKeywords('온도 설정 오류');
    const { score, reasons } = calcRecommendScore(sampleLld, fmKw, fcKw);
    expect(score).toBeGreaterThan(0);
    expect(reasons.length).toBeGreaterThan(0);
  });

  test('전혀 관련없는 키워드면 점수 0', () => {
    const fmKw = extractKeywords('블루투스 연결 끊김');
    const fcKw = extractKeywords('드라이버 호환성 문제');
    const { score } = calcRecommendScore(sampleLld, fmKw, fcKw);
    expect(score).toBe(0);
  });

  test('빈 키워드면 점수 0', () => {
    const { score } = calcRecommendScore(sampleLld, [], []);
    expect(score).toBe(0);
  });

  test('현재 예방관리 문맥이 유사하면 예방관리 항목 점수가 추가로 올라간다', () => {
    const fmKw = extractKeywords('솔더 브릿지 결함');
    const fcKw = extractKeywords('온도 설정 오류');
    const base = calcRecommendScore(sampleLld, fmKw, fcKw);
    const withContext = calcRecommendScore(sampleLld, fmKw, fcKw, {
      pcKeywords: extractKeywords('온도 프로파일 최적화 및 조건 관리'),
      preferredTarget: 'prevention',
    });
    expect(withContext.score).toBeGreaterThan(base.score);
    expect(withContext.reasons).toContain('현재 예방관리와 유사');
    expect(withContext.reasons).toContain('반영 대상 일치');
  });

  test('동일 문맥이면 완료 상태(G) 항목이 진행중(Y)보다 점수가 높다', () => {
    const doneItem: LLDItem = { ...sampleLld, status: 'G' };
    const wipItem: LLDItem = { ...sampleLld, status: 'Y' };
    const fmKw = extractKeywords('솔더 브릿지 결함');
    const fcKw = extractKeywords('온도 설정 오류');
    const done = calcRecommendScore(doneItem, fmKw, fcKw);
    const wip = calcRecommendScore(wipItem, fmKw, fcKw);
    expect(done.score).toBeGreaterThan(wip.score);
  });
});

// ──── 후보 수집 로직 테스트 (순수 함수 시뮬레이션) ────

describe('자동선택 후보 수집 로직', () => {
  /** processedFMGroups mock 생성 */
  function createMockFMGroups(count: number = 3): ProcessedFMGroup[] {
    return Array.from({ length: count }, (_, i) => ({
      fmId: `fm-${i + 1}`,
      fmNo: `M${i + 1}`,
      fmText: `고장형태 ${i + 1}`,
      fmRowSpan: 2,
      maxSeverity: 8,
      maxSeverityFeText: `고장영향 ${i + 1}`,
      l1ProductName: '완제품',
      fmProcessNo: `${i + 10}`,
      fmProcessName: `공정 ${i + 1}`,
      fmProcessFunction: `기능 ${i + 1}`,
      fmProductChar: `제품특성 ${i + 1}`,
      fmProductCharSC: '',
      rows: [
        {
          feId: `fe-${i + 1}-1`,
          feText: `고장영향 ${i + 1}-1`,
          feSeverity: 8,
          fcId: `fc-${i + 1}-1`,
          fcText: `고장원인 ${i + 1}-1`,
          feRowSpan: 1,
          fcRowSpan: 1,
          isFirstRow: true,
          feCategory: 'YP',
          feFunctionName: '',
          feRequirement: '',
          fcWorkFunction: '',
          fcProcessChar: '',
          fcProcessCharSC: '',
          fcM4: 'MC',
          fcWorkElem: '',
        },
        {
          feId: `fe-${i + 1}-2`,
          feText: `고장영향 ${i + 1}-2`,
          feSeverity: 6,
          fcId: `fc-${i + 1}-2`,
          fcText: `고장원인 ${i + 1}-2`,
          feRowSpan: 1,
          fcRowSpan: 1,
          isFirstRow: false,
          feCategory: 'SP',
          feFunctionName: '',
          feRequirement: '',
          fcWorkFunction: '',
          fcProcessChar: '',
          fcProcessCharSC: '',
          fcM4: 'MN',
          fcWorkElem: '',
        },
      ],
    }));
  }

  /**
   * ★ 후보 수집 로직 시뮬레이션 (useAutoLldHandlers.handleAutoLld 핵심 로직 추출)
   * 이 함수는 실제 handleAutoLld의 processedFMGroups.forEach 루프를 재현
   */
  function collectCandidates(
    processedFMGroups: ProcessedFMGroup[],
    riskData: Record<string, unknown>,
  ): { totalRows: number; skippedNoId: number; skippedAllApplied: number; candidates: number } {
    let totalRows = 0;
    let skippedNoId = 0;
    let skippedAllApplied = 0;
    let candidates = 0;

    processedFMGroups.forEach(fmGroup => {
      fmGroup.rows.forEach(row => {
        totalRows++;
        if (!row.fcId || !fmGroup.fmId) {
          skippedNoId++;
          return;
        }
        const uk = `${fmGroup.fmId}-${row.fcId}`;

        const existingLesson = ((riskData[`lesson-${uk}`] as string) || '').trim();
        const existingTarget = ((riskData[`lesson-target-${uk}`] as string) || '').trim();
        const prevAlreadyApplied = existingLesson && (existingTarget === 'prevention' || existingTarget.includes('prevention'));
        const detAlreadyApplied = existingLesson && (existingTarget === 'detection' || existingTarget.includes('detection'));

        if (prevAlreadyApplied && detAlreadyApplied) {
          skippedAllApplied++;
          return;
        }

        // needPrev / needDet
        const needPrev = !prevAlreadyApplied;
        const needDet = !detAlreadyApplied;

        if (needPrev) candidates++;
        if (needDet) candidates++;
      });
    });

    return { totalRows, skippedNoId, skippedAllApplied, candidates };
  }

  test('빈 processedFMGroups → candidates=0, totalRows=0', () => {
    const result = collectCandidates([], {});
    expect(result.totalRows).toBe(0);
    expect(result.candidates).toBe(0);
  });

  test('유효한 FM-FC 데이터 → candidates > 0 (예방+검출 각각)', () => {
    const groups = createMockFMGroups(3);
    const result = collectCandidates(groups, {});
    // 3 groups × 2 rows × 2 (prevention + detection) = 12
    expect(result.totalRows).toBe(6);
    expect(result.candidates).toBe(12);
    expect(result.skippedNoId).toBe(0);
    expect(result.skippedAllApplied).toBe(0);
  });

  test('fcId 빈 행 → skippedNoId 증가', () => {
    const groups = createMockFMGroups(1);
    groups[0].rows[1].fcId = ''; // 두번째 행 fcId 누락
    const result = collectCandidates(groups, {});
    expect(result.skippedNoId).toBe(1);
    expect(result.candidates).toBe(2); // 첫번째 행만 (prevention + detection)
  });

  test('fmId 빈 그룹 → 모든 행 skippedNoId', () => {
    const groups = createMockFMGroups(1);
    (groups[0] as any).fmId = ''; // fmId 누락
    const result = collectCandidates(groups, {});
    expect(result.skippedNoId).toBe(2); // 2 rows all skipped
    expect(result.candidates).toBe(0);
  });

  test('모든 행에 lesson 양쪽(예방+검출) 적용됨 → candidates=0', () => {
    const groups = createMockFMGroups(2);
    const riskData: Record<string, unknown> = {};

    // 모든 FM-FC에 대해 예방+검출 모두 적용
    groups.forEach(g => {
      g.rows.forEach(r => {
        const uk = `${g.fmId}-${r.fcId}`;
        riskData[`lesson-${uk}`] = 'LLD26-001';
        riskData[`lesson-target-${uk}`] = 'prevention,detection';
      });
    });

    const result = collectCandidates(groups, riskData);
    expect(result.skippedAllApplied).toBe(4); // 2 groups × 2 rows
    expect(result.candidates).toBe(0);
  });

  test('예방만 적용됨 → 검출 candidate만 생성', () => {
    const groups = createMockFMGroups(1);
    const riskData: Record<string, unknown> = {};
    const uk = `${groups[0].fmId}-${groups[0].rows[0].fcId}`;
    riskData[`lesson-${uk}`] = 'LLD26-001';
    riskData[`lesson-target-${uk}`] = 'prevention';

    const result = collectCandidates(groups, riskData);
    // 첫 행: 예방 적용됨 → 검출만 1건
    // 둘째 행: 둘 다 미적용 → 예방+검출 2건
    // 합계: 3건
    expect(result.candidates).toBe(3);
  });

  test('lesson은 있지만 target 비어있음 → both=false → 예방+검출 모두 candidate', () => {
    const groups = createMockFMGroups(1);
    const riskData: Record<string, unknown> = {};
    const uk = `${groups[0].fmId}-${groups[0].rows[0].fcId}`;
    riskData[`lesson-${uk}`] = 'LLD26-001'; // lesson 있지만
    riskData[`lesson-target-${uk}`] = '';     // target 비어있음

    const result = collectCandidates(groups, riskData);
    // existingLesson truthy + existingTarget '' → prevAlreadyApplied=false, detAlreadyApplied=false
    // → 건너뛰지 않음 → 예방+검출 2건
    // 둘째 행: 둘 다 미적용 → 예방+검출 2건
    expect(result.candidates).toBe(4);
  });
});
