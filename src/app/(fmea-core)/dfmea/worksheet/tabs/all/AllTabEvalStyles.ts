/**
 * @file AllTabEvalStyles.ts
 * @description AllTabRenderer 평가 탭 스타일 함수
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


import type { CSSProperties } from 'react';
import { FONT_SIZES, FONT_WEIGHTS } from '../../constants';

const BORDER = '1px solid #ccc';

/** 평가 테이블 스타일 */
export const evalTableStyle: CSSProperties = {
  width: '100%',
  minWidth: '2400px', // 구조분석~기능분석 최적화: 2400px (한 화면에 다 보이게)
  borderCollapse: 'collapse',
  fontSize: FONT_SIZES.cell,
};

/** 단계별 헤더 스타일 */
export const stepHeaderStyle = (bg: string): CSSProperties => ({
  background: bg,
  color: '#fff',
  border: BORDER,
  padding: '4px',
  height: '24px',
  fontWeight: FONT_WEIGHTS.semibold,
  fontSize: FONT_SIZES.cell,
  textAlign: 'center',
});

/** 서브 헤더 스타일 */
export const subHeaderCellStyle = (bg: string, options?: { cursor?: string; borderBottom?: string; boxShadow?: string }): CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '2px',
  fontSize: FONT_SIZES.small,
  textAlign: 'center',
  ...(options?.cursor && { cursor: options.cursor }),
  ...(options?.borderBottom && { borderBottom: options.borderBottom }),
  ...(options?.boxShadow && { boxShadow: options.boxShadow }),
});

/** 행 스타일 */
export const evalRowStyle = (bg: string, borderTop?: string): CSSProperties => ({
  height: '22px',
  background: bg,
  ...(borderTop && { borderTop }),
});

/** 빈 데이터 행 스타일 */
export const emptyDataRowStyle: CSSProperties = {
  textAlign: 'center',
  padding: '40px',
  color: '#999',
  fontSize: FONT_SIZES.header1,
};

