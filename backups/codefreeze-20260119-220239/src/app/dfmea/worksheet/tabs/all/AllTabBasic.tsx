// @ts-nocheck
/**
 * @file AllTabBasic.tsx
 * @description 전체보기 탭 - 기본 테이블 렌더링 (고장연결 데이터 없을 때)
 */

'use client';

import React from 'react';
import { FlatRow, WorksheetState, FONT_WEIGHTS, FONT_SIZES } from '../../constants';
import SODSelectModal from '@/components/modals/SODSelectModal';
import DataSelectModal from '@/components/modals/DataSelectModal';
import { evalTableStyle, stepHeaderStyle, subHeaderCellStyle, evalRowStyle, emptyDataRowStyle } from './AllTabEvalStyles';
import { structureCellStyle, functionCellStyle, failureCellStyle, riskCellStyle, optCellStyle } from './AllTabCellStyles';
import { stickyTheadStyle } from './AllTabStyles';
import { ALL_TAB_COLORS, BORDER, COL_COUNTS } from './constants';
import { useAllTabModals } from './hooks/useAllTabModals';

interface AllTabBasicProps {
  rows: FlatRow[];
  state: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  l1Spans: number[];
  l1TypeSpans: number[];
  l1FuncSpans: number[];
  l2Spans: number[];
  visibleSteps: number[];
  onAPClick?: () => void;
}

/**
 * 기본 테이블 렌더링 (고장연결 데이터 없을 때)
 */
export default function AllTabBasic({ 
  rows, state, setState, l1Spans, l1TypeSpans, l1FuncSpans, l2Spans, visibleSteps, onAPClick 
}: AllTabBasicProps) {
  const COLORS = ALL_TAB_COLORS;
  
  // 모달 훅 사용
  const {
    sodModal,
    controlModal,
    handleSODClick,
    handleSODSelect,
    closeSodModal,
    closeControlModal,
    setControlModal
  } = useAllTabModals(setState);
  
  // 스타일 함수
  const headerCellStyle = (bg: string, color = '#fff'): React.CSSProperties => ({
    background: bg, color, border: BORDER, padding: '4px', 
    fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.cell, textAlign: 'center'
  });
  
  // 컬럼 수 계산
  const totalCols = visibleSteps.reduce((sum, step) => sum + (COL_COUNTS[step as keyof typeof COL_COUNTS] || 0), 0);

  return (
    <>
      <table style={evalTableStyle}>
        <thead style={stickyTheadStyle}>
          {/* 1행: 단계 대분류 */}
          <tr>
            {visibleSteps.includes(2) && <th colSpan={4} style={headerCellStyle(COLORS.structure.main)}>P-FMEA 구조 분석(2단계)</th>}
            {visibleSteps.includes(3) && <th colSpan={8} style={headerCellStyle(COLORS.function.main)}>P-FMEA 기능 분석(3단계)</th>}
            {visibleSteps.includes(4) && <th colSpan={6} style={headerCellStyle('#f57c00')}>P-FMEA 고장 분석(4단계)</th>}
            {visibleSteps.includes(5) && <th colSpan={8} style={headerCellStyle(COLORS.risk.main)}>P-FMEA 리스크 분석(5단계)</th>}
            {visibleSteps.includes(6) && <th colSpan={14} style={headerCellStyle(COLORS.opt.main)}>P-FMEA 최적화(6단계)</th>}
          </tr>
          {/* 2행: 서브그룹 */}
          <tr>
            {visibleSteps.includes(2) && <><th style={subHeaderCellStyle(COLORS.structure.header)}>1. 제품명</th><th style={subHeaderCellStyle(COLORS.structure.header)}>2. A'SSY명</th><th style={subHeaderCellStyle(COLORS.structure.header)}>3. 부품 또는 특성</th></>}
            {visibleSteps.includes(3) && <><th colSpan={3} style={subHeaderCellStyle(COLORS.function.header)}>1. 다음상위수준 기능</th><th colSpan={2} style={subHeaderCellStyle(COLORS.function.header)}>2. 초점요소 기능</th><th colSpan={3} style={subHeaderCellStyle(COLORS.function.header)}>3. 다음하위수준/특성유형</th></>}
            {visibleSteps.includes(4) && <><th colSpan={3} style={subHeaderCellStyle(COLORS.failure.header)}>1. 고장영향(FE)</th><th style={subHeaderCellStyle(COLORS.failure.header)}>2. 고장형태(FM)</th><th colSpan={2} style={subHeaderCellStyle(COLORS.failure.header)}>3. 고장원인(FC)</th></>}
            {visibleSteps.includes(5) && <><th colSpan={2} style={subHeaderCellStyle(COLORS.risk.prevention.header)}>현재 예방관리</th><th colSpan={2} style={subHeaderCellStyle(COLORS.risk.detection.header)}>현재 검출관리</th><th colSpan={4} style={subHeaderCellStyle(COLORS.risk.evaluation.header)}>리스크 평가</th></>}
            {visibleSteps.includes(6) && <><th colSpan={4} style={subHeaderCellStyle(COLORS.opt.plan.header)}>계획</th><th colSpan={3} style={subHeaderCellStyle(COLORS.opt.monitor.header)}>결과 모니터링</th><th colSpan={7} style={subHeaderCellStyle(COLORS.opt.effect.header)}>효과 평가</th></>}
          </tr>
          {/* 3행: 컬럼명 */}
          <tr>
            {visibleSteps.includes(2) && <><th style={subHeaderCellStyle(COLORS.structure.cell)}>제품명</th><th style={subHeaderCellStyle(COLORS.structure.cell)}>A'SSY명</th><th style={subHeaderCellStyle(COLORS.structure.cell)}>부품 또는 특성</th></>}
            {visibleSteps.includes(3) && <><th style={subHeaderCellStyle(COLORS.function.cell)}>구분</th><th style={subHeaderCellStyle(COLORS.function.cell)}>제품 기능</th><th style={subHeaderCellStyle(COLORS.function.cell)}>요구사항</th><th style={subHeaderCellStyle(COLORS.function.cell)}>초점요소 기능</th><th style={subHeaderCellStyle(COLORS.function.cell)}>제품특성</th><th style={subHeaderCellStyle(COLORS.function.cell)}>부품</th><th style={subHeaderCellStyle(COLORS.function.cell)}>부품 기능</th><th style={subHeaderCellStyle(COLORS.function.cell)}>설계특성</th></>}
            {visibleSteps.includes(4) && <><th style={subHeaderCellStyle(COLORS.failure.cell)}>구분</th><th style={subHeaderCellStyle(COLORS.failure.cell)}>고장영향(FE)</th><th style={subHeaderCellStyle(COLORS.failure.cell)}>심각도</th><th style={subHeaderCellStyle(COLORS.failure.cell)}>고장형태(FM)</th><th style={subHeaderCellStyle(COLORS.failure.cell)}>부품</th><th style={subHeaderCellStyle(COLORS.failure.cell)}>고장원인(FC)</th></>}
            {visibleSteps.includes(5) && <><th style={subHeaderCellStyle(COLORS.risk.prevention.cell)}>예방관리(PC)</th><th style={subHeaderCellStyle(COLORS.risk.prevention.cell)}>발생도</th><th style={subHeaderCellStyle(COLORS.risk.detection.cell)}>검출관리(DC)</th><th style={subHeaderCellStyle(COLORS.risk.detection.cell)}>검출도</th><th onClick={onAPClick} style={subHeaderCellStyle(COLORS.risk.evaluation.cell, { cursor: 'pointer' })}>AP 📊</th><th style={subHeaderCellStyle(COLORS.risk.evaluation.cell)}>RPN</th><th style={subHeaderCellStyle(COLORS.risk.evaluation.cell)}>특별특성</th><th style={subHeaderCellStyle(COLORS.risk.evaluation.cell)}>습득교훈</th></>}
            {visibleSteps.includes(6) && <><th style={subHeaderCellStyle(COLORS.opt.plan.cell)}>예방관리개선</th><th style={subHeaderCellStyle(COLORS.opt.plan.cell)}>검출관리개선</th><th style={subHeaderCellStyle(COLORS.opt.plan.cell)}>책임자성명</th><th style={subHeaderCellStyle(COLORS.opt.plan.cell)}>목표완료일자</th><th style={subHeaderCellStyle(COLORS.opt.monitor.cell)}>상태</th><th style={subHeaderCellStyle(COLORS.opt.monitor.cell)}>개선결과근거</th><th style={subHeaderCellStyle(COLORS.opt.monitor.cell)}>완료일자</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell)}>심각도</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell)}>발생도</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell)}>검출도</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell)}>특별특성</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell)}>AP</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell)}>RPN</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell)}>비고</th></>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={totalCols} style={emptyDataRowStyle}>데이터가 없습니다.</td></tr>
          ) : rows.map((row, idx) => {
            const zebraBg = idx % 2 === 1 ? '#f5f5f5' : '#fff';
            const riskData = state.riskData || {};
            
            return (
              <tr key={`eval-${row.l1Id}-${row.l2Id}-${row.l3Id}-${idx}`} style={evalRowStyle(zebraBg)}>
                {visibleSteps.includes(2) && <>
                  {l1Spans[idx] > 0 && <td rowSpan={l1Spans[idx]} style={structureCellStyle(COLORS.structure.cell, idx, zebraBg)}>{row.l1Name}</td>}
                  {l2Spans[idx] > 0 && <td rowSpan={l2Spans[idx]} style={structureCellStyle(COLORS.structure.cell, idx, zebraBg)}>{row.l2Name}</td>}
                  {/* DFMEA: m4 제거됨 */}
                  <td style={structureCellStyle(COLORS.structure.cell, idx, zebraBg)}>{row.l3Name}</td>
                </>}
                {visibleSteps.includes(3) && <>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l1Type || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l1Function || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l1Requirement || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l2Functions?.map((f: any) => f.name).join(', ') || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l2ProductChars?.map((c: any) => c.name).join(', ') || ''}</td>
                  {/* DFMEA: m4 제거됨 */}
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l3Functions?.map((f: any) => f.name).join(', ') || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l3ProcessChars?.map((c: any) => c.name).join(', ') || ''}</td>
                </>}
                {visibleSteps.includes(4) && <>
                  <td style={failureCellStyle(COLORS.failure.cell, idx, zebraBg)}>{row.l1Type || ''}</td>
                  <td style={failureCellStyle(COLORS.failure.cell, idx, zebraBg)}>{row.l1FailureEffect || ''}</td>
                  <td 
                    style={riskCellStyle(COLORS.indicator.severity.bg, idx, zebraBg, COLORS.indicator.severity.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })}
                    onClick={() => handleSODClick('S', 'risk', idx, typeof row.l1Severity === 'number' ? row.l1Severity : parseInt(row.l1Severity as string) || undefined)}
                    title="클릭하여 심각도 평가"
                  >
                    {row.l1Severity || ''}
                  </td>
                  <td style={failureCellStyle(COLORS.failure.cell, idx, zebraBg)}>{row.l2FailureMode || ''}</td>
                  {/* DFMEA: m4 제거됨 */}
                  <td style={failureCellStyle(COLORS.failure.cell, idx, zebraBg)}>{row.l3FailureCause || ''}</td>
                </>}
                {visibleSteps.includes(5) && <>
                  <td style={riskCellStyle(COLORS.risk.prevention.cell, idx, zebraBg, '#000')}></td>
                  <td 
                    style={riskCellStyle(COLORS.indicator.occurrence.bg, idx, zebraBg, COLORS.indicator.occurrence.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })}
                    onClick={() => handleSODClick('O', 'risk', idx, Number(riskData[`risk-${idx}-O`]) || undefined)}
                    title="클릭하여 발생도 평가"
                  >{riskData[`risk-${idx}-O`] || ''}</td>
                  <td style={riskCellStyle(COLORS.risk.detection.cell, idx, zebraBg, '#000')}></td>
                  <td 
                    style={riskCellStyle(COLORS.indicator.detection.bg, idx, zebraBg, COLORS.indicator.detection.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })}
                    onClick={() => handleSODClick('D', 'risk', idx, Number(riskData[`risk-${idx}-D`]) || undefined)}
                    title="클릭하여 검출도 평가"
                  >{riskData[`risk-${idx}-D`] || ''}</td>
                  <td style={riskCellStyle(COLORS.risk.evaluation.cell, idx, zebraBg, '#000')}></td>
                  <td style={riskCellStyle(COLORS.risk.evaluation.cell, idx, zebraBg, '#000')}></td>
                  <td style={riskCellStyle(COLORS.risk.evaluation.cell, idx, zebraBg, '#000')}></td>
                  <td style={riskCellStyle(COLORS.risk.evaluation.cell, idx, zebraBg, '#000')}></td>
                </>}
                {visibleSteps.includes(6) && <>
                  <td style={optCellStyle(COLORS.opt.plan.cell, idx, zebraBg)}></td>
                  <td style={optCellStyle(COLORS.opt.plan.cell, idx, zebraBg)}></td>
                  <td style={optCellStyle(COLORS.opt.plan.cell, idx, zebraBg)}></td>
                  <td style={optCellStyle(COLORS.opt.plan.cell, idx, zebraBg)}></td>
                  <td style={optCellStyle(COLORS.opt.monitor.cell, idx, zebraBg)}></td>
                  <td style={optCellStyle(COLORS.opt.monitor.cell, idx, zebraBg)}></td>
                  <td style={optCellStyle(COLORS.opt.monitor.cell, idx, zebraBg)}></td>
                  <td 
                    style={riskCellStyle(COLORS.indicator.severity.bg, idx, zebraBg, COLORS.indicator.severity.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })}
                    onClick={() => handleSODClick('S', 'opt', idx, Number(riskData[`opt-${idx}-S`]) || undefined)}
                    title="클릭하여 최적화 심각도 평가"
                  >{riskData[`opt-${idx}-S`] || ''}</td>
                  <td 
                    style={riskCellStyle(COLORS.indicator.occurrence.bg, idx, zebraBg, COLORS.indicator.occurrence.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })}
                    onClick={() => handleSODClick('O', 'opt', idx, Number(riskData[`opt-${idx}-O`]) || undefined)}
                    title="클릭하여 최적화 발생도 평가"
                  >{riskData[`opt-${idx}-O`] || ''}</td>
                  <td 
                    style={riskCellStyle(COLORS.indicator.detection.bg, idx, zebraBg, COLORS.indicator.detection.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })}
                    onClick={() => handleSODClick('D', 'opt', idx, Number(riskData[`opt-${idx}-D`]) || undefined)}
                    title="클릭하여 최적화 검출도 평가"
                  >{riskData[`opt-${idx}-D`] || ''}</td>
                  <td style={optCellStyle(COLORS.opt.effect.cell, idx, zebraBg)}></td>
                  <td style={optCellStyle(COLORS.opt.effect.cell, idx, zebraBg)}></td>
                  <td style={optCellStyle(COLORS.opt.effect.cell, idx, zebraBg)}></td>
                  <td style={optCellStyle(COLORS.opt.effect.cell, idx, zebraBg)}></td>
                </>}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* SOD 선택 모달 */}
      <SODSelectModal
        isOpen={sodModal.isOpen}
        onClose={closeSodModal}
        onSelect={handleSODSelect}
        category={sodModal.category}
        fmeaType="P-FMEA"
        currentValue={sodModal.currentValue}
        scope={sodModal.scope}
      />
      
      {/* 예방관리/검출관리/특별특성 선택 모달 */}
      {controlModal.isOpen && (
        <DataSelectModal
          isOpen={controlModal.isOpen}
          title={controlModal.type === 'prevention' ? '예방관리 선택' : controlModal.type === 'detection' ? '검출관리 선택' : '특별특성 선택'}
          itemCode={controlModal.type === 'prevention' ? 'B5' : controlModal.type === 'detection' ? 'B6' : 'SC'}
          onClose={closeControlModal}
          onSave={(selectedValues) => {
            if (setState && selectedValues.length > 0) {
              const key = `${controlModal.type}-${controlModal.rowIndex}`;
              setState((prev: WorksheetState) => ({
                ...prev,
                riskData: { ...(prev.riskData || {}), [key]: selectedValues[0] }
              }));
            }
            closeControlModal();
          }}
          onDelete={() => {
            if (setState) {
              const key = `${controlModal.type}-${controlModal.rowIndex}`;
              setState((prev: WorksheetState) => {
                const newRiskData = { ...(prev.riskData || {}) };
                delete newRiskData[key];
                return { ...prev, riskData: newRiskData };
              });
            }
            closeControlModal();
          }}
          singleSelect={true}
          currentValues={[(state.riskData || {})[`${controlModal.type}-${controlModal.rowIndex}`] || ''].filter(Boolean).map(String)}
        />
      )}
    </>
  );
}

