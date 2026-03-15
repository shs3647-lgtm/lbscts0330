/**
 * @file b5-mn-mc-swap.test.ts
 * @description B5_MN_MC_SWAP 방지 — inferPC 4M 적합성 검증 테스트
 *
 * 규칙:
 *   - MN 행에 MC용 PC(PM, 정기 교정, 장비) 금지
 *   - MC 행에 MN용 PC(교육, 숙련도, 작업표준) 금지
 *   - "실시간 모니터링" 단독 표현 B5 금지
 */
import { describe, it, expect } from 'vitest';
import {
  inferPC,
  inferPCWithConfidence,
  type IndustryRuleSet,
} from '../../app/(fmea-core)/pfmea/import/stepb-parser/pc-dc-inference';

// 테스트용 규칙 셋 (getDefaultRuleSet의 require 경로 문제 회피)
const testRuleSet: IndustryRuleSet = {
  id: 'test',
  name: '테스트 규칙',
  pcRulesFC: [
    { keywords: ['온도', '열처리'], pc: '온도 프로파일 PM + 자동제어' },
    { keywords: ['숙련도', '작업자'], pc: '작업자 정기 교육 + 숙련도 평가' },
    { keywords: ['노즐', '막힘'], pc: '설비 PM(예방보전) + 노즐 교체 주기 관리' },
    { keywords: ['rpm', '회전'], pc: '설비 파라미터 자동제어' },
    { keywords: ['측정', '오차'], pc: '측정기 정기 교정(MSA)' },
    { keywords: ['전류', '전압'], pc: 'Power 정기 교정, UPS 운용' },
  ],
  pcRulesFM: [
    { keywords: ['두께 부족'], pc: '설비 PM + 파라미터 모니터링' },
  ],
  m4Defaults: {
    MN: '작업자 교육/훈련',
    MC: '예방유지보전(PM)',
    IM: '수입검사',
    EN: '작업표준서(WI) 개정',
  },
  dcRules: [],
  fallbackPC: '작업 표준 준수 교육',
  fallbackDC: { dc: '육안 검사', d: 7 },
};

describe('B5_MN_MC_SWAP 방지 — inferPC 4M 적합성 검증', () => {

  it('MN 행: PM/교정 키워드가 포함된 PC를 반환하지 않음', () => {
    const mnForbidden = ['pm', '예방보전', '정기 교정', '교정(', 'calibration'];
    const testFCs = [
      '작업 숙련도 부족', '판정 기준 오적용', '체크리스트 누락',
      '노즐 막힘', 'Power 불안정', '온도 편차',
    ];
    for (const fc of testFCs) {
      const pc = inferPC(fc, 'MN', testRuleSet);
      const pcLower = pc.toLowerCase();
      for (const kw of mnForbidden) {
        expect(pcLower, `MN행 FC="${fc}" → PC="${pc}" 에 금지 키워드 "${kw}" 포함`)
          .not.toContain(kw.toLowerCase());
      }
    }
  });

  it('MC 행: 교육/숙련도 키워드가 포함된 PC를 반환하지 않음', () => {
    const mcForbidden = ['교육', '숙련도', '작업표준'];
    const testFCs = [
      '설비 가동률 저하', '측정 오차', 'RPM 편차',
      '전류밀도 편차', '해상도 저하', '노즐 막힘',
    ];
    for (const fc of testFCs) {
      const pc = inferPC(fc, 'MC', testRuleSet);
      const pcLower = pc.toLowerCase();
      for (const kw of mcForbidden) {
        expect(pcLower, `MC행 FC="${fc}" → PC="${pc}" 에 금지 키워드 "${kw}" 포함`)
          .not.toContain(kw.toLowerCase());
      }
    }
  });

  it('MN m4Default는 작업자 관련 PC를 반환', () => {
    const result = inferPCWithConfidence('알 수 없는 고장원인', 'MN', testRuleSet);
    expect(result.confidence).toBe('m4-default');
    expect(result.value).toContain('교육');
  });

  it('MC m4Default는 설비 관련 PC를 반환', () => {
    const result = inferPCWithConfidence('알 수 없는 고장원인', 'MC', testRuleSet);
    expect(result.confidence).toBe('m4-default');
    expect(result.value.toLowerCase()).toMatch(/pm|예방|보전/);
  });

  it('IM m4Default는 수입품질 관리를 반환 (SA 적합 보강)', () => {
    const result = inferPCWithConfidence('알 수 없는 고장원인', 'IM', testRuleSet);
    expect(result.confidence).toBe('m4-default');
    // enhancePCFormat: "수입검사" → "수입품질 관리(IQC), 자재 성적서(COC) 확인"
    expect(result.value).toContain('수입품질');
  });

  it('EN m4Default는 작업표준서를 반환', () => {
    const result = inferPCWithConfidence('알 수 없는 고장원인', 'EN', testRuleSet);
    expect(result.confidence).toBe('m4-default');
    expect(result.value).toContain('표준서');
  });

  it('FC "온도 편차" → MN에는 PM 없는 결과, MC에는 교육 없는 결과', () => {
    const pcMN = inferPCWithConfidence('온도 편차', 'MN', testRuleSet);
    const pcMC = inferPCWithConfidence('온도 편차', 'MC', testRuleSet);

    // FC "온도" 매칭 결과 = "온도 프로파일 PM + 자동제어" → PM 포함 → MN 부적합
    // MN은 m4Default로 폴백해야 함
    expect(pcMN.value.toLowerCase()).not.toMatch(/pm/);

    // MC는 FC 매칭 결과 사용 가능 (PM은 MC에 적합)
    expect(pcMC.value.toLowerCase()).not.toMatch(/교육|숙련도/);
  });

  it('FC "숙련도 부족" → MC에는 교육 없는 결과', () => {
    const pcMC = inferPCWithConfidence('작업 숙련도 부족', 'MC', testRuleSet);

    // FC "숙련도" 매칭 = "작업자 정기 교육 + 숙련도 평가" → 교육 포함 → MC 부적합
    // MC는 m4Default "예방유지보전(PM)"으로 폴백
    expect(pcMC.value.toLowerCase()).not.toContain('교육');
    expect(pcMC.value.toLowerCase()).not.toContain('숙련도');
  });

  it('FC "측정 오차" → MN에는 교정 없는 결과', () => {
    const pcMN = inferPCWithConfidence('측정 오차', 'MN', testRuleSet);

    // FC "측정" 매칭 = "측정기 정기 교정(MSA)" → 교정 포함 → MN 부적합
    // MN은 m4Default "작업자 교육/훈련"으로 폴백
    expect(pcMN.value.toLowerCase()).not.toContain('교정');
  });

  it('동일 FC에 대해 MN/MC가 서로 다른 적합한 PC를 반환', () => {
    const fc = '노즐 막힘';
    const pcMN = inferPC(fc, 'MN', testRuleSet);
    const pcMC = inferPC(fc, 'MC', testRuleSet);

    // MN → PM 없어야 함 (m4Default "작업자 교육/훈련")
    expect(pcMN.toLowerCase()).not.toMatch(/pm|예방보전/);

    // MC → 교육 없어야 함 (FC 매칭 "설비 PM" 또는 m4Default "예방유지보전")
    expect(pcMC.toLowerCase()).not.toMatch(/교육|숙련도/);
  });
});
