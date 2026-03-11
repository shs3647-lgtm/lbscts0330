/**
 * @file AllTabHeader.tsx
 * @description 전체보기 탭 헤더 컴포넌트 (3행 헤더)
 */

import React from 'react';
import { ALL_TAB_COLORS, BORDER } from '../constants';
import { FONT_WEIGHTS, FONT_SIZES } from '../../../constants';
import { colHeaderStyle, colHeaderStyleWithOptions, stickyTheadStyle } from '../AllTabStyles';

interface AllTabHeaderProps {
  visibleSteps: number[];
  onAPClick?: () => void;
}

/** 헤더 셀 스타일 함수 */
const headerCellStyle = (bg: string, color = '#fff'): React.CSSProperties => ({
  background: bg, color, border: BORDER, padding: '4px', 
  fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.cell, textAlign: 'center'
});

/** 서브헤더 스타일 함수 */
const subHeaderStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: BORDER, padding: '2px', 
  fontSize: FONT_SIZES.small, fontWeight: FONT_WEIGHTS.semibold
});

export default function AllTabHeader({ visibleSteps, onAPClick }: AllTabHeaderProps) {
  const COLORS = ALL_TAB_COLORS;
  
  return (
    <thead style={stickyTheadStyle}>
      {/* 1행: 단계 대분류 */}
      <tr>
        {visibleSteps.includes(2) && <th colSpan={4} style={headerCellStyle(COLORS.structure.main)}>D-FMEA 구조분석(2단계)</th>}
        {visibleSteps.includes(3) && <th colSpan={8} style={headerCellStyle(COLORS.function.main)}>D-FMEA 기능분석(3단계)</th>}
        {visibleSteps.includes(4) && <th colSpan={6} style={headerCellStyle('#f57c00')}>D-FMEA 고장분석(4단계)</th>}
        {visibleSteps.includes(5) && <th colSpan={8} style={headerCellStyle(COLORS.risk.main)}>D-FMEA 리스크분석(5단계)</th>}
        {visibleSteps.includes(6) && <th colSpan={14} style={headerCellStyle(COLORS.opt.main)}>D-FMEA 최적화(6단계)</th>}
      </tr>
      {/* 2행: 서브그룹 */}
      <tr>
        {visibleSteps.includes(2) && (
          <>
            <th style={subHeaderStyle(COLORS.structure.l1.h2)}>1.다음 상위수준</th>
            <th style={subHeaderStyle(COLORS.structure.l2.h2)}>2.초점 요소</th>
            <th colSpan={2} style={subHeaderStyle(COLORS.structure.l3.h2)}>3.다음 하위수준</th>
          </>
        )}
        {visibleSteps.includes(3) && (
          <>
            <th colSpan={3} style={subHeaderStyle(COLORS.function.l1.h2)}>1.다음상위수준 기능</th>
            <th colSpan={2} style={subHeaderStyle(COLORS.function.l2.h2)}>2.공정기능/제품특성</th>
            <th colSpan={3} style={subHeaderStyle(COLORS.function.l3.h2)}>3.다음하위수준/특성유형</th>
          </>
        )}
        {visibleSteps.includes(4) && (
          <>
            <th colSpan={3} style={subHeaderStyle(COLORS.failure.l1.h2)}>1.고장영향(FE)</th>
            <th style={subHeaderStyle(COLORS.failure.l2.h2)}>2.고장형태</th>
            <th colSpan={2} style={subHeaderStyle(COLORS.failure.l3.h2)}>3.고장원인(FC)</th>
          </>
        )}
        {visibleSteps.includes(5) && (
          <>
            <th colSpan={2} style={subHeaderStyle(COLORS.risk.prevention.h2)}>예방관리</th>
            <th colSpan={2} style={subHeaderStyle(COLORS.risk.detection.h2)}>검출관리</th>
            <th colSpan={4} style={subHeaderStyle(COLORS.risk.evaluation.h2)}>리스크평가</th>
          </>
        )}
        {visibleSteps.includes(6) && (
          <>
            <th colSpan={4} style={subHeaderStyle(COLORS.opt.plan.h2)}>계획</th>
            <th colSpan={3} style={subHeaderStyle(COLORS.opt.monitor.h2)}>모니터링</th>
            <th colSpan={7} style={subHeaderStyle(COLORS.opt.effect.h2)}>효과평가</th>
          </>
        )}
      </tr>
      {/* 3행: 컬럼명 */}
      <tr>
        {/* 구조분석 4열 */}
        {visibleSteps.includes(2) && (
          <>
            <th style={colHeaderStyle('60px', COLORS.structure.l1.h3)}>제품명</th>
            <th style={colHeaderStyle('80px', COLORS.structure.l2.h3)}>NO+공정명</th>
            <th style={colHeaderStyleWithOptions('30px', COLORS.special.m4.h3, '#fff', { fontWeight: FONT_WEIGHTS.bold })}>I/F</th>
            <th style={colHeaderStyle('70px', COLORS.structure.l3.h3)}>부품</th>
          </>
        )}
        {/* 기능분석 8열 */}
        {visibleSteps.includes(3) && (
          <>
            <th style={colHeaderStyle('70px', COLORS.special.scope.h3, '#fff')}>구분</th>
            <th style={colHeaderStyle('120px', COLORS.function.l1.h3)}>제품 기능</th>
            <th style={colHeaderStyle('70px', COLORS.function.l1.h3)}>요구사항</th>
            <th style={colHeaderStyle('160px', COLORS.function.l2.h3)}>초점요소 기능</th>
            <th style={colHeaderStyleWithOptions('80px', COLORS.function.l2.h3, undefined, { whiteSpace: 'nowrap' })}>제품특성</th>
            <th style={colHeaderStyleWithOptions('30px', COLORS.special.m4.h3, '#fff', { fontWeight: FONT_WEIGHTS.bold })}>I/F</th>
            <th style={colHeaderStyle('140px', COLORS.function.l3.h3)}>부품 기능</th>
            <th style={colHeaderStyleWithOptions('80px', COLORS.function.l3.h3, undefined, { whiteSpace: 'nowrap' })}>설계특성</th>
          </>
        )}
        {/* 고장분석 6열 */}
        {visibleSteps.includes(4) && (
          <>
            <th style={colHeaderStyleWithOptions('90px', COLORS.special.scope.h3, '#fff', { whiteSpace: 'nowrap' })}>구분</th>
            <th style={colHeaderStyleWithOptions('120px', COLORS.failure.l1.h3, undefined, { whiteSpace: 'nowrap' })}>고장영향</th>
            <th style={colHeaderStyleWithOptions('30px', COLORS.indicator.severity.bg, COLORS.indicator.severity.text, { fontWeight: FONT_WEIGHTS.bold })}>S</th>
            <th style={colHeaderStyleWithOptions('120px', COLORS.failure.l2.h3, undefined, { whiteSpace: 'nowrap' })}>고장형태</th>
            <th style={colHeaderStyleWithOptions('100px', COLORS.failure.l3.h3, undefined, { whiteSpace: 'nowrap' })}>부품</th>
            <th style={colHeaderStyleWithOptions('130px', COLORS.failure.l3.h3, undefined, { whiteSpace: 'nowrap' })}>고장원인</th>
          </>
        )}
        {/* 리스크분석 8열 */}
        {visibleSteps.includes(5) && (
          <>
            <th style={colHeaderStyleWithOptions('90px', COLORS.risk.prevention.h3, '#fff', { whiteSpace: 'nowrap' })}>예방관리</th>
            <th style={colHeaderStyleWithOptions('30px', COLORS.indicator.occurrence.bg, COLORS.indicator.occurrence.text, { fontWeight: FONT_WEIGHTS.bold })}>O</th>
            <th style={colHeaderStyleWithOptions('90px', COLORS.risk.detection.h3, '#fff', { whiteSpace: 'nowrap' })}>검출관리</th>
            <th style={colHeaderStyleWithOptions('25px', COLORS.indicator.detection.bg, COLORS.indicator.detection.text, { fontWeight: FONT_WEIGHTS.bold })}>D</th>
            <th style={colHeaderStyleWithOptions('25px', COLORS.indicator.ap.bg, COLORS.indicator.ap.text, { fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })} onClick={onAPClick}>AP</th>
            <th style={colHeaderStyleWithOptions('30px', COLORS.indicator.rpn.bg, COLORS.indicator.rpn.text, { fontWeight: FONT_WEIGHTS.bold })}>RPN</th>
            <th style={colHeaderStyleWithOptions('60px', COLORS.risk.evaluation.h3, undefined, { whiteSpace: 'nowrap' })}>특별특성</th>
            <th style={colHeaderStyleWithOptions('80px', '#f97316', '#fff', { whiteSpace: 'nowrap' })}>습득교훈</th>
          </>
        )}
        {/* 최적화 14열 */}
        {visibleSteps.includes(6) && (
          <>
            <th style={colHeaderStyle('70px', COLORS.opt.plan.h3)}>예방개선</th>
            <th style={colHeaderStyle('70px', COLORS.opt.plan.h3)}>검출개선</th>
            <th style={colHeaderStyle('50px', COLORS.opt.plan.h3)}>책임자</th>
            <th style={colHeaderStyle('50px', COLORS.opt.plan.h3)}>목표일</th>
            <th style={colHeaderStyle('35px', COLORS.opt.monitor.h3)}>상태</th>
            <th style={colHeaderStyle('60px', COLORS.opt.monitor.h3)}>개선근거</th>
            <th style={colHeaderStyle('50px', COLORS.opt.monitor.h3)}>완료일</th>
            <th style={colHeaderStyleWithOptions('25px', COLORS.indicator.severity.bg, COLORS.indicator.severity.text, { fontWeight: FONT_WEIGHTS.bold })}>S</th>
            <th style={colHeaderStyleWithOptions('25px', COLORS.indicator.occurrence.bg, COLORS.indicator.occurrence.text, { fontWeight: FONT_WEIGHTS.bold })}>O</th>
            <th style={colHeaderStyleWithOptions('25px', COLORS.indicator.detection.bg, COLORS.indicator.detection.text, { fontWeight: FONT_WEIGHTS.bold })}>D</th>
            <th style={colHeaderStyle('40px', COLORS.opt.effect.h3)}>특별특성</th>
            <th style={colHeaderStyleWithOptions('25px', COLORS.indicator.ap.bg, COLORS.indicator.ap.text, { fontWeight: FONT_WEIGHTS.bold })}>AP</th>
            <th style={colHeaderStyleWithOptions('30px', COLORS.indicator.rpn.bg, COLORS.indicator.rpn.text, { fontWeight: FONT_WEIGHTS.bold })}>RPN</th>
            <th style={colHeaderStyle('50px', COLORS.opt.effect.h3)}>비고</th>
          </>
        )}
      </tr>
    </thead>
  );
}



