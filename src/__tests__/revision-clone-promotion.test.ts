/**
 * @file revision-clone-promotion.test.ts
 * @description FMEA 개정 복제 — 최적화 결과 승격 로직 단위 테스트 (TDD)
 *
 * 검증 항목:
 * 1. promoteRiskAnalysis: 완료된 최적화 → SOD/예방/검출 승격
 * 2. promoteRiskAnalysis: 미완료 최적화 → 원본 값 유지
 * 3. promoteRiskAnalysis: null newOccurrence/newDetection → 원본 값 유지
 * 4. extractAction: recommendedAction에서 예방/검출 분리 추출
 * 5. AP 재계산 정확성
 *
 * @created 2026-03-02
 */
import { describe, it, expect } from 'vitest';
import {
  promoteRiskAnalysis,
  extractAction,
  type RiskSource,
  type OptimizationSource,
} from '@/app/api/fmea/revision-clone/promotionLogic';

// ═══════════════════════════════════════════════════════
// extractAction 테스트
// ═══════════════════════════════════════════════════════
describe('extractAction', () => {
  it('복합 문자열에서 예방 조치를 추출한다', () => {
    const action = '[예방] SPC 관리 강화 | [검출] 검사 빈도 증가';
    expect(extractAction(action, '예방')).toBe('SPC 관리 강화');
  });

  it('복합 문자열에서 검출 조치를 추출한다', () => {
    const action = '[예방] SPC 관리 강화 | [검출] 검사 빈도 증가';
    expect(extractAction(action, '검출')).toBe('검사 빈도 증가');
  });

  it('태그 없는 문자열에서 예방 타입이면 전체 반환', () => {
    const action = '공정 개선 조치';
    expect(extractAction(action, '예방')).toBe('공정 개선 조치');
  });

  it('태그 없는 문자열에서 검출 타입이면 빈 문자열 반환', () => {
    const action = '공정 개선 조치';
    expect(extractAction(action, '검출')).toBe('');
  });

  it('null 입력이면 빈 문자열 반환', () => {
    expect(extractAction(null, '예방')).toBe('');
    expect(extractAction(null, '검출')).toBe('');
  });

  it('빈 문자열 입력이면 빈 문자열 반환', () => {
    expect(extractAction('', '예방')).toBe('');
  });

  it('검출 태그만 있는 문자열에서 예방 추출 시 빈 문자열', () => {
    const action = '[검출] 검사 빈도 증가';
    expect(extractAction(action, '예방')).toBe('');
  });
});

// ═══════════════════════════════════════════════════════
// promoteRiskAnalysis 테스트
// ═══════════════════════════════════════════════════════
describe('promoteRiskAnalysis', () => {
  const baseRisk: RiskSource = {
    severity: 8,
    occurrence: 7,
    detection: 6,
    ap: 'H',
    preventionControl: '기존 예방관리',
    detectionControl: '기존 검출관리',
  };

  it('완료된 최적화 → SOD 승격', () => {
    const opt: OptimizationSource = {
      recommendedAction: '[예방] 개선된 예방 | [검출] 개선된 검출',
      newSeverity: null, // severity는 동일 유지
      newOccurrence: 3,
      newDetection: 4,
      status: '완료',
    };

    const result = promoteRiskAnalysis(baseRisk, opt);

    expect(result.severity).toBe(8); // 동일 유지
    expect(result.occurrence).toBe(3); // 승격
    expect(result.detection).toBe(4); // 승격
    expect(result.preventionControl).toBe('개선된 예방'); // 승격
    expect(result.detectionControl).toBe('개선된 검출'); // 승격
    expect(result.ap).toBeDefined(); // AP 재계산됨
  });

  it('미완료 최적화 → 원본 값 유지', () => {
    const opt: OptimizationSource = {
      recommendedAction: '[예방] 개선 조치',
      newSeverity: null,
      newOccurrence: 3,
      newDetection: 4,
      status: '진행중',
    };

    const result = promoteRiskAnalysis(baseRisk, opt);

    expect(result.severity).toBe(8);
    expect(result.occurrence).toBe(7); // 원본 유지
    expect(result.detection).toBe(6); // 원본 유지
    expect(result.preventionControl).toBe('기존 예방관리');
    expect(result.detectionControl).toBe('기존 검출관리');
  });

  it('최적화 없음 → 원본 값 유지', () => {
    const result = promoteRiskAnalysis(baseRisk, null);

    expect(result.severity).toBe(8);
    expect(result.occurrence).toBe(7);
    expect(result.detection).toBe(6);
    expect(result.preventionControl).toBe('기존 예방관리');
    expect(result.detectionControl).toBe('기존 검출관리');
    expect(result.ap).toBe('H');
  });

  it('newOccurrence null → 원본 occurrence 유지', () => {
    const opt: OptimizationSource = {
      recommendedAction: '[예방] 개선 | [검출] 개선',
      newSeverity: null,
      newOccurrence: null,
      newDetection: 4,
      status: '완료',
    };

    const result = promoteRiskAnalysis(baseRisk, opt);

    expect(result.occurrence).toBe(7); // 원본 유지
    expect(result.detection).toBe(4); // 승격
  });

  it('newDetection null → 원본 detection 유지', () => {
    const opt: OptimizationSource = {
      recommendedAction: '[예방] 개선',
      newSeverity: null,
      newOccurrence: 3,
      newDetection: null,
      status: '완료',
    };

    const result = promoteRiskAnalysis(baseRisk, opt);

    expect(result.occurrence).toBe(3); // 승격
    expect(result.detection).toBe(6); // 원본 유지
  });

  it('빈 recommendedAction → 원본 예방/검출관리 유지', () => {
    const opt: OptimizationSource = {
      recommendedAction: '',
      newSeverity: null,
      newOccurrence: 3,
      newDetection: 4,
      status: '완료',
    };

    const result = promoteRiskAnalysis(baseRisk, opt);

    expect(result.preventionControl).toBe('기존 예방관리');
    expect(result.detectionControl).toBe('기존 검출관리');
    expect(result.occurrence).toBe(3); // SOD는 승격
    expect(result.detection).toBe(4);
  });

  it('S=9, O=2, D=1 → AP=L 재계산', () => {
    const risk: RiskSource = {
      severity: 9,
      occurrence: 5,
      detection: 5,
      ap: 'H',
      preventionControl: null,
      detectionControl: null,
    };
    const opt: OptimizationSource = {
      recommendedAction: '',
      newSeverity: null,
      newOccurrence: 2,
      newDetection: 1,
      status: '완료',
    };

    const result = promoteRiskAnalysis(risk, opt);

    expect(result.severity).toBe(9);
    expect(result.occurrence).toBe(2);
    expect(result.detection).toBe(1);
    // S=9, O=2, D=1 → AP_TABLE: s='9-10', o='2-3', d의 4번째(d=1) = 'L'
    expect(result.ap).toBe('L');
  });

  it('대기 상태 최적화 → 원본 값 유지', () => {
    const opt: OptimizationSource = {
      recommendedAction: '[예방] 개선',
      newSeverity: null,
      newOccurrence: 2,
      newDetection: 2,
      status: '대기',
    };

    const result = promoteRiskAnalysis(baseRisk, opt);

    expect(result.occurrence).toBe(7);
    expect(result.detection).toBe(6);
  });
});
