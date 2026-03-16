/**
 * @file utils.ts
 * @description 통계검증 유틸리티 함수
 */

import type { IntegrityScore, CountDisplayRow, TabCounts } from './types';

/** 이슈 수 → 종합 점수 */
export function getScoreFromIssues(issues: number): IntegrityScore {
  if (issues === 0) return 'A';
  if (issues <= 2) return 'B';
  if (issues <= 5) return 'C';
  return 'D';
}

/** 점수 → 색상 클래스 */
export function getScoreColor(score: IntegrityScore): string {
  switch (score) {
    case 'A': return 'bg-green-600 text-white';
    case 'B': return 'bg-yellow-500 text-white';
    case 'C': return 'bg-orange-500 text-white';
    case 'D': return 'bg-red-600 text-white';
  }
}

/** 점수 → 한국어 설명 */
export function getScoreLabel(score: IntegrityScore): string {
  switch (score) {
    case 'A': return '완벽(Perfect)';
    case 'B': return '양호(Good)';
    case 'C': return '주의(Warning)';
    case 'D': return '심각(Critical)';
  }
}

/** 상태 아이콘 */
export function getStatusIcon(status: 'ok' | 'warn' | 'error' | 'info'): string {
  switch (status) {
    case 'ok': return '\u2705';
    case 'warn': return '\u26A0\uFE0F';
    case 'error': return '\u274C';
    case 'info': return '\u2139\uFE0F';
  }
}

/** 아이템코드 → 한국어(영문) 라벨 */
export function formatItemCode(code: string): string {
  const labels: Record<string, string> = {
    A1: '공정번호(Process No)',
    A2: '공정명(Process Name)',
    B1: '작업요소(Work Element)',
    C1: '구분(Category)',
    C2: '완제품기능(Product Func)',
    C3: '요구사항(Requirement)',
    A3: '공정기능(Process Func)',
    A4: '제품특성(Product Char)',
    B2: 'WE기능(WE Function)',
    B3: '공정특성(Process Char)',
    C4: '고장영향(Failure Effect)',
    A5: '고장형태(Failure Mode)',
    B4: '고장원인(Failure Cause)',
    A6: '검출관리(Detection Ctrl)',
    B5: '예방관리(Prevention Ctrl)',
    link: '고장연결(Failure Link)',
  };
  return labels[code] || code;
}

/** TabCounts → UI 표시용 행 배열 변환 */
export function buildCountDisplayRows(counts: TabCounts): CountDisplayRow[] {
  const rows: CountDisplayRow[] = [
    // 구조분석
    { section: '구조분석(Structure)', label: 'L1 완제품(Product)', labelEn: 'L1Structure', dbCount: counts.l1Structure, status: counts.l1Structure > 0 ? 'ok' : 'warn' },
    { section: '구조분석(Structure)', label: 'L2 공정(Process)', labelEn: 'L2Structure', dbCount: counts.l2Structure, status: counts.l2Structure > 0 ? 'ok' : 'warn' },
    { section: '구조분석(Structure)', label: 'L3 작업요소(WE)', labelEn: 'L3Structure', dbCount: counts.l3Structure, status: counts.l3Structure > 0 ? 'ok' : 'warn' },
    // 1L 기능
    { section: '1L 기능(L1 Function)', label: '구분(Category)', labelEn: 'L1Function.category', dbCount: counts.l1Category, status: 'info' },
    { section: '1L 기능(L1 Function)', label: '완제품기능(Product Func)', labelEn: 'L1Function.functionName', dbCount: counts.l1Function, status: counts.l1Function > 0 ? 'ok' : 'warn' },
    { section: '1L 기능(L1 Function)', label: '요구사항(Requirement)', labelEn: 'L1Function.requirement', dbCount: counts.l1Requirement, status: counts.l1Requirement > 0 ? 'ok' : 'warn' },
    // 2L 기능
    { section: '2L 기능(L2 Function)', label: '공정기능(Process Func)', labelEn: 'L2Function', dbCount: counts.l2Function, status: counts.l2Function > 0 ? 'ok' : 'warn' },
    { section: '2L 기능(L2 Function)', label: '제품특성(Product Char)', labelEn: 'ProcessProductChar', dbCount: counts.productChar, status: counts.productChar > 0 ? 'ok' : 'warn' },
    // 3L 기능
    { section: '3L 기능(L3 Function)', label: 'WE기능(WE Function)', labelEn: 'L3Function.functionName', dbCount: counts.l3Function, status: counts.l3Function > 0 ? 'ok' : 'warn' },
    { section: '3L 기능(L3 Function)', label: '공정특성(Process Char)', labelEn: 'L3Function.processChar', dbCount: counts.l3ProcessChar, status: counts.l3ProcessChar > 0 ? 'ok' : 'warn' },
    // 1L 영향
    { section: '1L 영향(Failure Effect)', label: '고장영향(FE)', labelEn: 'FailureEffect', dbCount: counts.failureEffect, status: counts.failureEffect > 0 ? 'ok' : 'warn' },
    // 2L 형태
    { section: '2L 형태(Failure Mode)', label: '고장형태(FM)', labelEn: 'FailureMode', dbCount: counts.failureMode, status: counts.failureMode > 0 ? 'ok' : 'warn' },
    // 3L 원인
    { section: '3L 원인(Failure Cause)', label: '고장원인(FC)', labelEn: 'FailureCause', dbCount: counts.failureCause, status: counts.failureCause > 0 ? 'ok' : 'warn' },
    // 고장연결
    { section: '고장연결(Failure Link)', label: 'FailureLink', labelEn: 'FailureLink', dbCount: counts.failureLink, status: counts.failureLink > 0 ? 'ok' : 'warn' },
    { section: '고장연결(Failure Link)', label: 'FailureAnalysis', labelEn: 'FailureAnalysis', dbCount: counts.failureAnalysis, status: counts.failureAnalysis > 0 ? 'ok' : 'warn' },
    // 위험분석
    { section: '위험/최적화(Risk/Opt)', label: 'RiskAnalysis', labelEn: 'RiskAnalysis', dbCount: counts.riskAnalysis, status: counts.riskAnalysis > 0 ? 'ok' : 'info' },
    { section: '위험/최적화(Risk/Opt)', label: 'Optimization', labelEn: 'Optimization', dbCount: counts.optimization, status: 'info' },
  ];
  return rows;
}
