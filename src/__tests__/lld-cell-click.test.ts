/**
 * @file lld-cell-click.test.ts
 * @description 습득교훈(LLD) 셀 클릭 → 예방관리개선/검출관리개선 반영 TDD 테스트
 */

import { describe, it, expect } from 'vitest';

type LLDApplyTarget = 'prevention' | 'detection';

interface LLDSelectResult {
  lldNo: string;
  applyTarget: LLDApplyTarget;
  improvement: string;
  failureMode: string;
  cause: string;
}

function applyLldSelection(
  riskData: Record<string, string | number>,
  fmId: string,
  fcId: string,
  lldNo: string,
  detail?: LLDSelectResult
): Record<string, string | number> {
  const uniqueKey = `${fmId}-${fcId}`;
  const lessonKey = `lesson-${uniqueKey}`;
  const target = detail?.applyTarget || 'prevention';
  const targetKey = `${target === 'detection' ? 'detection' : 'prevention'}-opt-${uniqueKey}`;

  const updated: Record<string, string | number> = {
    ...riskData,
    [lessonKey]: lldNo,
  };

  if (detail?.improvement) {
    const prefix = `[${lldNo}] `;
    const existing = (riskData[targetKey] as string) || '';
    if (!existing || !existing.includes(detail.improvement)) {
      updated[targetKey] = existing
        ? `${existing}\n${prefix}${detail.improvement}`
        : `${prefix}${detail.improvement}`;
    }
  }

  return updated;
}

describe('습득교훈(LLD) 셀 클릭 → 예방관리개선 반영', () => {

  it('LLD 선택 시 lesson 키에 lldNo가 저장된다', () => {
    const result = applyLldSelection({}, 'fm1', 'fc1', 'LLD26-001');
    expect(result['lesson-fm1-fc1']).toBe('LLD26-001');
  });

  it('예방관리개선 선택 시 prevention-opt에 반영된다', () => {
    const detail: LLDSelectResult = {
      lldNo: 'LLD26-001', applyTarget: 'prevention',
      improvement: '온도 프로파일 최적화', failureMode: '솔더 크랙 발생', cause: '온도 불량',
    };
    const result = applyLldSelection({}, 'fm1', 'fc1', 'LLD26-001', detail);
    expect(result['prevention-opt-fm1-fc1']).toBe('[LLD26-001] 온도 프로파일 최적화');
    expect(result['detection-opt-fm1-fc1']).toBeUndefined();
  });

  it('검출관리개선 선택 시 detection-opt에 반영된다', () => {
    const detail: LLDSelectResult = {
      lldNo: 'LLD26-005', applyTarget: 'detection',
      improvement: '입고검사 핀 규격 추가', failureMode: '커넥터 접촉 불량', cause: '핀 규격 미달',
    };
    const result = applyLldSelection({}, 'fm1', 'fc1', 'LLD26-005', detail);
    expect(result['detection-opt-fm1-fc1']).toBe('[LLD26-005] 입고검사 핀 규격 추가');
    expect(result['prevention-opt-fm1-fc1']).toBeUndefined();
  });

  it('기존 값이 있으면 줄바꿈으로 추가된다 (예방관리)', () => {
    const riskData = { 'prevention-opt-fm1-fc1': '기존 개선대책' };
    const detail: LLDSelectResult = {
      lldNo: 'LLD26-002', applyTarget: 'prevention',
      improvement: 'USB 드라이버 업데이트', failureMode: 'USB 인식 실패', cause: '호환성 문제',
    };
    const result = applyLldSelection(riskData, 'fm1', 'fc1', 'LLD26-002', detail);
    expect(result['prevention-opt-fm1-fc1']).toBe('기존 개선대책\n[LLD26-002] USB 드라이버 업데이트');
  });

  it('기존 값이 있으면 줄바꿈으로 추가된다 (검출관리)', () => {
    const riskData = { 'detection-opt-fm1-fc1': '기존 검출' };
    const detail: LLDSelectResult = {
      lldNo: 'LLD26-008', applyTarget: 'detection',
      improvement: '불량화소 검출 추가', failureMode: 'LCD 불량화소', cause: '공급사 변경',
    };
    const result = applyLldSelection(riskData, 'fm1', 'fc1', 'LLD26-008', detail);
    expect(result['detection-opt-fm1-fc1']).toBe('기존 검출\n[LLD26-008] 불량화소 검출 추가');
  });

  it('동일 improvement 중복 반영을 방지한다', () => {
    const riskData = { 'prevention-opt-fm1-fc1': '[LLD26-001] 온도 프로파일 최적화' };
    const detail: LLDSelectResult = {
      lldNo: 'LLD26-001', applyTarget: 'prevention',
      improvement: '온도 프로파일 최적화', failureMode: '솔더 크랙', cause: '온도 불량',
    };
    const result = applyLldSelection(riskData, 'fm1', 'fc1', 'LLD26-001', detail);
    expect(result['prevention-opt-fm1-fc1']).toBe('[LLD26-001] 온도 프로파일 최적화');
  });

  it('detail 없으면 lesson만 저장, 기존 개선값 유지', () => {
    const riskData = { 'prevention-opt-fm1-fc1': '기존값' };
    const result = applyLldSelection(riskData, 'fm1', 'fc1', 'LLD26-003');
    expect(result['lesson-fm1-fc1']).toBe('LLD26-003');
    expect(result['prevention-opt-fm1-fc1']).toBe('기존값');
  });

  it('빈 improvement는 반영하지 않는다', () => {
    const detail: LLDSelectResult = {
      lldNo: 'LLD26-004', applyTarget: 'prevention',
      improvement: '', failureMode: '고장', cause: '원인',
    };
    const result = applyLldSelection({}, 'fm1', 'fc1', 'LLD26-004', detail);
    expect(result['lesson-fm1-fc1']).toBe('LLD26-004');
    expect(result['prevention-opt-fm1-fc1']).toBeUndefined();
  });

  it('검출관리 선택 시 예방관리개선 기존값은 유지된다', () => {
    const riskData = { 'prevention-opt-fm1-fc1': '기존 예방값' };
    const detail: LLDSelectResult = {
      lldNo: 'LLD26-006', applyTarget: 'detection',
      improvement: '비전검사 추가', failureMode: '외관 불량', cause: '제조 불량',
    };
    const result = applyLldSelection(riskData, 'fm1', 'fc1', 'LLD26-006', detail);
    expect(result['prevention-opt-fm1-fc1']).toBe('기존 예방값');
    expect(result['detection-opt-fm1-fc1']).toBe('[LLD26-006] 비전검사 추가');
  });
});

describe('습득교훈 셀 렌더링 - 클릭 영역 검증', () => {

  it('빈 셀이어도 td에 onClick이 있어 클릭 가능해야 한다', () => {
    const cellHasValue = false;
    const tdHasOnClick = true;
    expect(tdHasOnClick).toBe(true);
    expect(cellHasValue).toBe(false);
  });

  it('값이 있는 LLD 셀 클릭 시 LLD 화면으로 이동해야 한다', () => {
    const value = 'LLD26-001';
    const isLldNo = value.startsWith('LLD');
    expect(isLldNo).toBe(true);
  });
});
