/**
 * @file AllTabBasic.tsx
 * @description 전체보기 탭 - 기본 테이블 렌더링 (고장연결 데이터 없을 때)
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


'use client';

import React from 'react';
import { FlatRow, WorksheetState, FONT_WEIGHTS, FONT_SIZES, L2Function, L2ProductChar, L3Function, L3ProcessChar } from '../../constants';
import SODSelectModal from '@/components/modals/SODSelectModal';
import DataSelectModal from '@/components/modals/DataSelectModal';
import { BiHeader } from '../shared/BaseWorksheetComponents';
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
            {visibleSteps.includes(2) && <th colSpan={4} style={headerCellStyle(COLORS.structure.main)} title="Structure Analysis"><BiHeader ko="D-FMEA 구조분석" en="Structure (2ST)" /></th>}
            {visibleSteps.includes(3) && <th colSpan={8} style={headerCellStyle(COLORS.function.main)} title="Function Analysis"><BiHeader ko="D-FMEA 기능분석" en="Function (3ST)" /></th>}
            {visibleSteps.includes(4) && <th colSpan={6} style={headerCellStyle('#f57c00')} title="Failure Analysis"><BiHeader ko="D-FMEA 고장분석" en="Failure (4ST)" /></th>}
            {visibleSteps.includes(5) && <th colSpan={8} style={headerCellStyle(COLORS.risk.main)} title="Risk Analysis"><BiHeader ko="D-FMEA 리스크분석" en="Risk (5ST)" /></th>}
            {visibleSteps.includes(6) && <th colSpan={14} style={headerCellStyle(COLORS.opt.main)} title="Optimization"><BiHeader ko="D-FMEA 최적화" en="Optimization (6ST)" /></th>}
          </tr>
          {/* 2행: 서브그룹 */}
          <tr>
            {visibleSteps.includes(2) && <><th style={subHeaderCellStyle(COLORS.structure.header)} title="Product Line">1. 완제품 공정명</th><th style={subHeaderCellStyle(COLORS.structure.header)} title="Process">2. 메인 공정명</th><th colSpan={2} style={subHeaderCellStyle(COLORS.structure.header)} title="Work Element">3. 작업 요소명</th></>}
            {visibleSteps.includes(3) && <><th colSpan={3} style={subHeaderCellStyle(COLORS.function.header)} title="Next Higher Level Function">1. 다음상위수준 기능</th><th colSpan={2} style={subHeaderCellStyle(COLORS.function.header)} title="Focus Element Function">2. 초점요소 기능</th><th colSpan={3} style={subHeaderCellStyle(COLORS.function.header)} title="Next Lower Level / Characteristic Type">3. 다음하위수준/특성유형</th></>}
            {visibleSteps.includes(4) && <><th colSpan={3} style={subHeaderCellStyle(COLORS.failure.header)} title="Failure Effect">1. 고장영향(FE)</th><th style={subHeaderCellStyle(COLORS.failure.header)} title="Failure Mode">2. 고장형태(FM)</th><th colSpan={2} style={subHeaderCellStyle(COLORS.failure.header)} title="Failure Cause">3. 고장원인(FC)</th></>}
            {visibleSteps.includes(5) && <><th colSpan={2} style={subHeaderCellStyle(COLORS.risk.prevention.header)} title="Current Prevention Control"><BiHeader ko="현재 예방관리" en="Current PC" /></th><th colSpan={2} style={subHeaderCellStyle(COLORS.risk.detection.header)} title="Current Detection Control"><BiHeader ko="현재 검출관리" en="Current DC" /></th><th colSpan={4} style={subHeaderCellStyle(COLORS.risk.evaluation.header)} title="Risk Evaluation"><BiHeader ko="리스크 평가" en="Risk Eval." /></th></>}
            {visibleSteps.includes(6) && <><th colSpan={4} style={subHeaderCellStyle(COLORS.opt.plan.header)} title="Plan"><BiHeader ko="계획" en="Plan" /></th><th colSpan={3} style={subHeaderCellStyle(COLORS.opt.monitor.header)} title="Monitoring"><BiHeader ko="모니터링" en="Monitoring" /></th><th colSpan={7} style={subHeaderCellStyle(COLORS.opt.effect.header)} title="Effectiveness Evaluation"><BiHeader ko="효과 평가" en="Effectiveness" /></th></>}
          </tr>
          {/* 3행: 컬럼명 (2px 파란색 border-bottom으로 헤더 구분) */}
          <tr>
            {visibleSteps.includes(2) && <><th style={subHeaderCellStyle(COLORS.structure.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Product Line">완제품공정명</th><th style={subHeaderCellStyle(COLORS.structure.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Process No + Name">NO+공정명</th><th style={subHeaderCellStyle(COLORS.structure.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })}>4M</th><th style={subHeaderCellStyle(COLORS.structure.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Part">부품</th></>}
            {visibleSteps.includes(3) && <><th style={subHeaderCellStyle(COLORS.function.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Category">구분</th><th style={subHeaderCellStyle(COLORS.function.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Product Function">제품 기능</th><th style={subHeaderCellStyle(COLORS.function.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Requirement">요구사항</th><th style={subHeaderCellStyle(COLORS.function.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Focus Element Function">초점요소 기능</th><th style={subHeaderCellStyle(COLORS.function.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Product Characteristic">제품특성</th><th style={subHeaderCellStyle(COLORS.function.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Part">부품</th><th style={subHeaderCellStyle(COLORS.function.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Part Function">부품 기능</th><th style={subHeaderCellStyle(COLORS.function.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Design Characteristic">설계특성</th></>}
            {visibleSteps.includes(4) && <><th style={subHeaderCellStyle(COLORS.failure.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Category">구분</th><th style={subHeaderCellStyle(COLORS.failure.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Failure Effect">고장영향(FE)</th><th style={subHeaderCellStyle(COLORS.failure.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Severity">심각도(S)</th><th style={subHeaderCellStyle(COLORS.failure.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Failure Mode">고장형태(FM)</th><th style={subHeaderCellStyle(COLORS.failure.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Part">부품</th><th style={subHeaderCellStyle(COLORS.failure.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Failure Cause">고장원인(FC)</th></>}
            {visibleSteps.includes(5) && <><th style={subHeaderCellStyle(COLORS.risk.prevention.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Prevention Control">예방관리(PC)</th><th style={subHeaderCellStyle(COLORS.risk.prevention.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Occurrence">발생도(O)</th><th style={subHeaderCellStyle(COLORS.risk.detection.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Detection Control">검출관리(DC)</th><th style={subHeaderCellStyle(COLORS.risk.detection.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Detection">검출도(D)</th><th onClick={onAPClick} style={subHeaderCellStyle(COLORS.risk.evaluation.cell, { cursor: 'pointer', boxShadow: 'inset 0 -2px 0 #2196f3' })}>AP</th><th style={subHeaderCellStyle(COLORS.risk.evaluation.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })}>RPN</th><th style={subHeaderCellStyle(COLORS.risk.evaluation.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Special Characteristic">특별특성(SC)</th><th style={subHeaderCellStyle(COLORS.risk.evaluation.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Lessons Learned">습득교훈(LLD)</th></>}
            {visibleSteps.includes(6) && <><th style={subHeaderCellStyle(COLORS.opt.plan.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="PC Improvement">예방관리개선</th><th style={subHeaderCellStyle(COLORS.opt.plan.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="DC Improvement">검출관리개선</th><th style={subHeaderCellStyle(COLORS.opt.plan.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Responsible">책임자성명</th><th style={subHeaderCellStyle(COLORS.opt.plan.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Target Date">목표완료일자</th><th style={subHeaderCellStyle(COLORS.opt.monitor.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Status">상태</th><th style={subHeaderCellStyle(COLORS.opt.monitor.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Evidence">개선결과근거</th><th style={subHeaderCellStyle(COLORS.opt.monitor.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Completion Date">완료일자</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Severity">심각도(S)</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Occurrence">발생도(O)</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Detection">검출도(D)</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Special Characteristic">특별특성(SC)</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })}>AP</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })}>RPN</th><th style={subHeaderCellStyle(COLORS.opt.effect.cell, { boxShadow: 'inset 0 -2px 0 #2196f3' })} title="Remarks">비고</th></>}
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
                  {l2Spans[idx] > 0 && <td rowSpan={l2Spans[idx]} style={structureCellStyle(COLORS.structure.cell, idx, zebraBg)}>{row.l2No} {row.l2Name}</td>}
                  <td style={structureCellStyle(COLORS.structure.cell, idx, zebraBg, { textAlign: 'center' })}>{row.m4}</td>
                  <td style={structureCellStyle(COLORS.structure.cell, idx, zebraBg)}>{row.l3Name}</td>
                </>}
                {visibleSteps.includes(3) && <>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l1Type || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l1Function || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l1Requirement || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l2Functions?.map((f: L2Function) => f.name).join(', ') || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l2ProductChars?.map((c: L2ProductChar) => c.name).join(', ') || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.m4 || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l3Functions?.map((f: L3Function) => f.name).join(', ') || ''}</td>
                  <td style={functionCellStyle(COLORS.function.cell, idx, zebraBg, true)}>{row.l3ProcessChars?.map((c: L3ProcessChar) => c.name).join(', ') || ''}</td>
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
                  <td style={failureCellStyle(COLORS.failure.cell, idx, zebraBg)}>{row.m4 || ''}</td>
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
        fmeaType="D-FMEA"
        currentValue={sodModal.currentValue}
        scope={sodModal.scope}
      />

      {/* 예방관리/검출관리/특별특성 선택 모달 */}
      {controlModal.isOpen && (
        <DataSelectModal
          isOpen={controlModal.isOpen}
          title={controlModal.type === 'prevention' ? '예방관리 선택' : controlModal.type === 'detection' ? '검출관리 선택' : '특별특성 선택'}
          itemCode={controlModal.type === 'prevention' ? 'B5' : controlModal.type === 'detection' ? 'A6' : 'SC'}
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
          fmeaType="PFMEA"
          processNo={controlModal.processNo}
          processName={controlModal.processName}
          currentValues={[(state.riskData || {})[`${controlModal.type}-${controlModal.rowIndex}`] || ''].filter(Boolean).map(String)}
        />
      )}
    </>
  );
}

