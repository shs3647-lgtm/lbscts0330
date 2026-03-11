/**
 * @file AllTabWithLinks.tsx
 * @description 전체보기 탭 - 고장연결 데이터가 있을 때 렌더링 (40열 FMEA 워크시트)
 */

'use client';

import React from 'react';
import { WorksheetState, FONT_WEIGHTS } from '../../constants';
import { groupFailureLinksWithFunctionData, groupByProcessName, calculateLastRowMerge } from '../../utils';
import { exportAllViewExcel } from '../../excel-export';
import SODSelectModal from '@/components/modals/SODSelectModal';
import DataSelectModal from '@/components/modals/DataSelectModal';
import { colHeaderStyle, colHeaderStyleWithOptions } from './AllTabStyles';
import { structureCellStyle, functionCellStyle, failureCellStyle, severityCellStyle, riskCellStyle, optCellStyle, rpnCellStyle, inputFieldStyle, dateInputStyle, selectFieldStyle } from './AllTabCellStyles';
import { evalRowStyle } from './AllTabEvalStyles';
import { calculateAP } from './apCalculator';
import { ALL_TAB_COLORS, TW_CLASSES, BORDER } from './constants';
import { useAllTabModals, SODModalState, ControlModalState } from './hooks/useAllTabModals';

interface AllTabWithLinksProps {
  state: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  failureLinks: any[];
  visibleSteps?: number[];
}

/**
 * 고장연결 데이터가 있을 때 40열 테이블 렌더링
 */
export default function AllTabWithLinks({ state, setState, failureLinks, visibleSteps: propsVisibleSteps }: AllTabWithLinksProps) {
  const COLORS = ALL_TAB_COLORS;
  // visibleSteps: props 우선, 없으면 state, 그래도 없으면 기본값
  const visibleSteps = propsVisibleSteps || (state.visibleSteps || [2, 3, 4, 5, 6]);
  
  // 모달 훅 사용
  const {
    sodModal,
    controlModal,
    handleSODClick,
    handleSODSelect,
    handleLessonInput,
    openControlModal,
    closeControlModal,
    closeSodModal,
    setControlModal
  } = useAllTabModals(setState);
  
  // 스타일 함수
  const headerCellStyle = (bg: string, color = '#fff'): React.CSSProperties => ({
    background: bg, color, border: BORDER, padding: '4px', 
    fontWeight: FONT_WEIGHTS.semibold, fontSize: '11px', textAlign: 'center'
  });
  
  const subHeaderStyle = (bg: string): React.CSSProperties => ({
    background: bg, color: '#fff', border: BORDER, padding: '2px', 
    fontSize: '10px', fontWeight: FONT_WEIGHTS.semibold
  });

  // FM별 그룹핑 + 기능분석 데이터 조회
  const fmGroups = groupFailureLinksWithFunctionData(failureLinks, state);
  
  // 공정명별 그룹핑 (셀합치기용)
  const processGroups = groupByProcessName(fmGroups);
  
  // 행 데이터 생성
  const allRows: {
    processName: string;
    fmText: string;
    showFm: boolean;
    fmRowSpan: number;
    showProcess: boolean;
    processRowSpan: number;
    fe: { no: string; scope: string; text: string; severity: number; funcData: any } | null;
    feRowSpan: number;
    showFe: boolean;
    fc: { no: string; process: string; m4: string; workElem: string; text: string; funcData: any } | null;
    fcRowSpan: number;
    showFc: boolean;
    l2FuncData: any;
    maxFeSeverity: number;
    allFeSeverities: number[];
    allFeTexts: string[];
  }[] = [];
  
  // 행 생성
  let globalIdx = 0;
  processGroups.forEach((pg, procName) => {
    pg.startIdx = globalIdx;
    let processRowCount = 0;
    
    pg.fmList.forEach((group, fmIdx) => {
      const feCount = group.fes.length;
      const fcCount = group.fcs.length;
      const maxRows = Math.max(feCount, fcCount, 1);
      
      const allFeSeverities = group.fes.map((fe: any) => fe.severity || 0);
      const allFeTexts = group.fes.map((fe: any) => fe.text || '');
      const maxFeSeverity = allFeSeverities.length > 0 ? Math.max(...allFeSeverities) : 0;
      
      for (let i = 0; i < maxRows; i++) {
        const mergeConfig = calculateLastRowMerge(feCount, fcCount, i, maxRows);
        
        let fe = null;
        if (mergeConfig.showFe && i < feCount) {
          fe = group.fes[i];
        }
        
        let fc = null;
        if (mergeConfig.showFc && i < fcCount) {
          fc = group.fcs[i];
        }
        
        allRows.push({
          processName: procName,
          fmText: group.fmText,
          showFm: i === 0,
          fmRowSpan: maxRows,
          showProcess: fmIdx === 0 && i === 0,
          processRowSpan: 0,
          fe, feRowSpan: mergeConfig.feRowSpan, showFe: mergeConfig.showFe,
          fc, fcRowSpan: mergeConfig.fcRowSpan, showFc: mergeConfig.showFc,
          l2FuncData: group.l2FuncData || null,
          maxFeSeverity, allFeSeverities, allFeTexts,
        });
        
        processRowCount++;
        globalIdx++;
      }
    });
    
    if (pg.startIdx >= 0 && allRows[pg.startIdx]) {
      allRows[pg.startIdx].processRowSpan = processRowCount;
    }
  });
  
  const totalFM = fmGroups.size;
  const totalFE = Array.from(fmGroups.values()).reduce((s, g) => s + g.fes.length, 0);
  const totalFC = Array.from(fmGroups.values()).reduce((s, g) => s + g.fcs.length, 0);
  
  // FMEA STATUS 저장
  if (typeof window !== 'undefined') {
    (window as any).__FMEA_STATUS__ = { totalFM, totalFE, totalFC, totalRows: allRows.length };
  }
  
  return (
    <div className={TW_CLASSES.container}>
      <table className={`${TW_CLASSES.table} min-w-[2600px]`}>
        <thead className={TW_CLASSES.stickyHead}>
          {/* 1행: 단계 대분류 */}
          <tr>
            <th colSpan={4} style={headerCellStyle(COLORS.structure.main)}>D-FMEA 구조분석(2단계)</th>
            <th colSpan={8} style={headerCellStyle(COLORS.function.main)}>D-FMEA 기능분석(3단계)</th>
            <th colSpan={6} style={headerCellStyle('#f57c00')}>D-FMEA 고장분석(4단계)</th>
            <th colSpan={8} style={headerCellStyle(COLORS.risk.main)}>D-FMEA 리스크분석(5단계)</th>
            <th colSpan={14} style={headerCellStyle(COLORS.opt.main)}>D-FMEA 최적화(6단계)</th>
          </tr>
          {/* 2행: 서브그룹 */}
          <tr>
            <th style={subHeaderStyle(COLORS.structure.l1.h2)}>1.다음 상위수준</th>
            <th style={subHeaderStyle(COLORS.structure.l2.h2)}>2.초점 요소</th>
            <th colSpan={2} style={subHeaderStyle(COLORS.structure.l3.h2)}>3.다음 하위수준</th>
            <th colSpan={3} style={subHeaderStyle(COLORS.function.l1.h2)}>1.다음상위수준 기능</th>
            <th colSpan={2} style={subHeaderStyle(COLORS.function.l2.h2)}>2.공정기능/제품특성</th>
            <th colSpan={3} style={subHeaderStyle(COLORS.function.l3.h2)}>3.다음하위수준/특성유형</th>
            <th colSpan={3} style={subHeaderStyle(COLORS.failure.l1.h2)}>1.고장영향(FE)</th>
            <th style={subHeaderStyle(COLORS.failure.l2.h2)}>2.고장형태</th>
            <th colSpan={2} style={subHeaderStyle(COLORS.failure.l3.h2)}>3.고장원인(FC)</th>
            <th colSpan={2} style={subHeaderStyle(COLORS.risk.prevention.h2)}>예방관리</th>
            <th colSpan={2} style={subHeaderStyle(COLORS.risk.detection.h2)}>검출관리</th>
            <th colSpan={4} style={subHeaderStyle(COLORS.risk.evaluation.h2)}>리스크평가</th>
            <th colSpan={4} style={subHeaderStyle(COLORS.opt.plan.h2)}>계획</th>
            <th colSpan={3} style={subHeaderStyle(COLORS.opt.monitor.h2)}>모니터링</th>
            <th colSpan={7} style={subHeaderStyle(COLORS.opt.effect.h2)}>효과평가</th>
          </tr>
          {/* 3행: 컬럼명 */}
          <tr>
            {/* 구조분석 4열 */}
            <th style={colHeaderStyle('60px', COLORS.structure.l1.h3)}>제품명</th>
            <th style={colHeaderStyle('80px', COLORS.structure.l2.h3)}>NO+공정명</th>
            <th style={colHeaderStyleWithOptions('30px', COLORS.special.m4.h3, '#fff', { fontWeight: FONT_WEIGHTS.bold })}>I/F</th>
            <th style={colHeaderStyle('70px', COLORS.structure.l3.h3)}>부품</th>
            {/* 기능분석 8열 */}
            <th style={colHeaderStyle('70px', COLORS.special.scope.h3, '#fff')}>구분</th>
            <th style={colHeaderStyle('120px', COLORS.function.l1.h3)}>제품 기능</th>
            <th style={colHeaderStyle('70px', COLORS.function.l1.h3)}>요구사항</th>
            <th style={colHeaderStyle('160px', COLORS.function.l2.h3)}>초점요소 기능</th>
            <th style={colHeaderStyleWithOptions('80px', COLORS.function.l2.h3, undefined, { whiteSpace: 'nowrap' })}>제품특성</th>
            <th style={colHeaderStyleWithOptions('30px', COLORS.special.m4.h3, '#fff', { fontWeight: FONT_WEIGHTS.bold })}>I/F</th>
            <th style={colHeaderStyle('140px', COLORS.function.l3.h3)}>부품 기능</th>
            <th style={colHeaderStyleWithOptions('80px', COLORS.function.l3.h3, undefined, { whiteSpace: 'nowrap' })}>설계특성</th>
            {/* 고장분석 6열 */}
            <th style={colHeaderStyleWithOptions('90px', COLORS.special.scope.h3, '#fff', { whiteSpace: 'nowrap' })}>구분</th>
            <th style={colHeaderStyleWithOptions('120px', COLORS.failure.l1.h3, undefined, { whiteSpace: 'nowrap' })}>고장영향</th>
            <th style={colHeaderStyleWithOptions('30px', COLORS.indicator.severity.bg, COLORS.indicator.severity.text, { fontWeight: FONT_WEIGHTS.bold })}>S</th>
            <th style={colHeaderStyleWithOptions('120px', COLORS.failure.l2.h3, undefined, { whiteSpace: 'nowrap' })}>고장형태</th>
            <th style={colHeaderStyleWithOptions('100px', COLORS.failure.l3.h3, undefined, { whiteSpace: 'nowrap' })}>부품</th>
            <th style={colHeaderStyleWithOptions('130px', COLORS.failure.l3.h3, undefined, { whiteSpace: 'nowrap' })}>고장원인</th>
            {/* 리스크분석 8열 */}
            <th style={colHeaderStyleWithOptions('90px', COLORS.risk.prevention.h3, '#fff', { whiteSpace: 'nowrap' })}>예방관리</th>
            <th style={colHeaderStyleWithOptions('30px', COLORS.indicator.occurrence.bg, COLORS.indicator.occurrence.text, { fontWeight: FONT_WEIGHTS.bold })}>O</th>
            <th style={colHeaderStyleWithOptions('90px', COLORS.risk.detection.h3, '#fff', { whiteSpace: 'nowrap' })}>검출관리</th>
            <th style={colHeaderStyleWithOptions('25px', COLORS.indicator.detection.bg, COLORS.indicator.detection.text, { fontWeight: FONT_WEIGHTS.bold })}>D</th>
            <th style={colHeaderStyleWithOptions('25px', COLORS.indicator.ap.bg, COLORS.indicator.ap.text, { fontWeight: FONT_WEIGHTS.bold })}>AP</th>
            <th style={colHeaderStyleWithOptions('30px', COLORS.indicator.rpn.bg, COLORS.indicator.rpn.text, { fontWeight: FONT_WEIGHTS.bold })}>RPN</th>
            <th style={colHeaderStyleWithOptions('60px', COLORS.risk.evaluation.h3, undefined, { whiteSpace: 'nowrap' })}>특별특성</th>
            <th style={colHeaderStyleWithOptions('80px', '#f97316', '#fff', { whiteSpace: 'nowrap' })}>습득교훈</th>
            {/* 최적화 14열 */}
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
          </tr>
        </thead>
        <tbody>
          {allRows.map((row, idx) => {
            const zebraBg = idx % 2 === 1 ? '#f5f5f5' : '#fff';
            const getScopeAbbr = (s: string) => s === 'Your Plant' ? 'YOUR PLANT' : s === 'Ship to Plant' ? 'SHIP TO PLANT' : s === 'User' ? 'USER' : '';
            
            // 구조분석 4M 찾기
            const getStructureM4 = () => {
              if (!row.fc?.workElem) return '';
              const process = state.l2?.find((p: any) => p.name === row.processName || `${p.no}. ${p.name}` === row.processName);
              if (!process) return '';
              const workElem = process.l3?.find((w: any) => w.name === row.fc?.workElem);
              return workElem?.m4 || '';
            };
            const structureM4 = getStructureM4();
            
            // RPN 계산
            const riskData = state.riskData || {};
            const allSeveritiesWithDB = row.allFeTexts.map((feT, i) => {
              const dbSev = riskData[`S-fe-${feT}`];
              const rawVal = dbSev !== undefined ? Number(dbSev) : row.allFeSeverities[i] || 0;
              return Math.min(Math.max(rawVal, 0), 10);
            });
            const severity = allSeveritiesWithDB.length > 0 ? Math.max(...allSeveritiesWithDB, 0) : 0;
            const rawO = Number(riskData[`risk-${idx}-O`]) || 0;
            const rawD = Number(riskData[`risk-${idx}-D`]) || 0;
            const occurrence = Math.min(Math.max(rawO, 0), 10);
            const detection = Math.min(Math.max(rawD, 0), 10);
            const rpn = severity * occurrence * detection;
            const ap = calculateAP(severity, occurrence, detection);
            
            return (
              <tr key={`all-${idx}`} style={evalRowStyle(zebraBg, row.showFm ? '2px solid #666' : undefined)}>
                {/* 구조분석 4열 */}
                {idx === 0 && <td rowSpan={allRows.length} className="text-center font-semibold" style={structureCellStyle(COLORS.structure.l1.cell, 0, COLORS.structure.l1.cell, { textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold })}>{state.l1?.name || ''}</td>}
                {row.showProcess && row.processRowSpan > 0 && <td rowSpan={row.processRowSpan} style={structureCellStyle(COLORS.structure.l2.cell, idx, zebraBg, { textAlign: 'center' })}>{row.processName}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={structureCellStyle(COLORS.special.m4.cell, idx, zebraBg, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold })}>{structureM4 || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={structureCellStyle(COLORS.structure.l3.cell, idx, zebraBg)}>{row.fc?.workElem || ''}</td>}
                
                {/* 기능분석 8열 */}
                {row.showFm && <td rowSpan={row.fmRowSpan} style={structureCellStyle(COLORS.special.scope.cell, idx, zebraBg, { textAlign: 'center' })}>{row.fe?.funcData?.typeName || (row.fe ? getScopeAbbr(row.fe.scope) : '')}</td>}
                {row.showFm && <td rowSpan={row.fmRowSpan} style={functionCellStyle(COLORS.function.l1.cell, idx, zebraBg, !!row.fe?.funcData)}>{row.fe?.funcData?.funcName || '(미연결)'}</td>}
                {row.showFm && <td rowSpan={row.fmRowSpan} style={functionCellStyle(COLORS.function.l1.cell, idx, zebraBg, !!row.fe?.funcData, { textAlign: 'center', fontWeight: 600 })}>{row.fe?.funcData?.reqName || '(미연결)'}</td>}
                {row.showFm && <td rowSpan={row.fmRowSpan} style={functionCellStyle(COLORS.function.l2.cell, idx, zebraBg, !!row.l2FuncData)}>{row.l2FuncData?.funcName || '(미연결)'}</td>}
                {row.showFm && <td rowSpan={row.fmRowSpan} style={functionCellStyle(COLORS.function.l2.cell, idx, zebraBg, !!row.l2FuncData, { textAlign: 'center', fontWeight: 600 })}>{row.l2FuncData?.productCharName || '(미연결)'}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={structureCellStyle(COLORS.special.m4.cell, idx, zebraBg, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold })}>{structureM4 || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={functionCellStyle(COLORS.function.l3.cell, idx, zebraBg, !!row.fc?.funcData)}>{row.fc?.funcData?.funcName || (row.fc ? '(미연결)' : '')}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={functionCellStyle(COLORS.function.l3.cell, idx, zebraBg, !!row.fc?.funcData, { textAlign: 'center', fontWeight: 600 })}>{row.fc?.funcData?.processCharName || (row.fc ? '(미연결)' : '')}</td>}
                
                {/* 고장분석 6열 */}
                {row.showFe && <td rowSpan={row.feRowSpan} style={failureCellStyle(COLORS.special.scope.cell, idx, zebraBg, { textAlign: 'center' })}>{row.fe ? getScopeAbbr(row.fe.scope) : ''}</td>}
                {row.showFe && (() => {
                  const feText = row.fe?.text || '';
                  const feSeverityFromDB = riskData[`S-fe-${feText}`] || row.fe?.severity || 0;
                  return (
                    <td rowSpan={row.feRowSpan} style={failureCellStyle(COLORS.failure.l1.cell, idx, zebraBg)}>
                      {feText}{feSeverityFromDB ? <span className="text-red-800 font-semibold">({feSeverityFromDB})</span> : ''}
                    </td>
                  );
                })()}
                {row.showFe && (() => {
                  const feText = row.fe?.text || '';
                  const riskDataRef = state.riskData || {};
                  const allSevWithDB = row.allFeTexts.map((feT, i) => {
                    const dbSev = riskDataRef[`S-fe-${feT}`];
                    return dbSev !== undefined ? Number(dbSev) : row.allFeSeverities[i] || 0;
                  });
                  const maxSeverity = allSevWithDB.length > 0 ? Math.max(...allSevWithDB, 0) : 0;
                  const currentFeSev = Number(riskDataRef[`S-fe-${feText}`]) || row.fe?.severity || 0;
                  return (
                    <td 
                      rowSpan={row.feRowSpan} 
                      style={severityCellStyle(maxSeverity, idx, zebraBg)}
                      onClick={() => handleSODClick('S', 'risk', idx, currentFeSev, row.fe?.scope, undefined, feText)}
                      title={`클릭하여 "${feText}" 심각도 평가`}
                    >
                      {maxSeverity || ''}
                    </td>
                  );
                })()}
                {row.showFm && <td rowSpan={row.fmRowSpan} style={failureCellStyle(COLORS.failure.l2.cell, idx, zebraBg, { textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold })}>{row.fmText}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={failureCellStyle(COLORS.failure.l3.cell, idx, zebraBg)}>{row.fc?.workElem || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={failureCellStyle(COLORS.failure.l3.cell, idx, zebraBg)}>{row.fc?.text || ''}</td>}
                
                {/* 리스크분석 8열 */}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={riskCellStyle(COLORS.risk.prevention.cell, idx, zebraBg, '#000', { cursor: 'pointer', fontWeight: 500 })} onClick={() => openControlModal('prevention', idx, row.fc?.text)} title={`클릭하여 예방관리 선택`}>{riskData[`prevention-${idx}`] || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={riskCellStyle(COLORS.indicator.occurrence.bg, idx, zebraBg, COLORS.indicator.occurrence.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })} onClick={() => handleSODClick('O', 'risk', idx, occurrence)} title="클릭하여 발생도 평가">{occurrence || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={riskCellStyle(COLORS.risk.detection.cell, idx, zebraBg, '#000', { cursor: 'pointer', fontWeight: 500 })} onClick={() => openControlModal('detection', idx, row.fc?.text)} title={`클릭하여 검출관리 선택`}>{riskData[`detection-${idx}`] || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={riskCellStyle(COLORS.indicator.detection.bg, idx, zebraBg, COLORS.indicator.detection.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })} onClick={() => handleSODClick('D', 'risk', idx, detection)} title="클릭하여 검출도 평가">{detection || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={riskCellStyle(COLORS.indicator.ap.bg, idx, zebraBg, COLORS.indicator.ap.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold })}>{ap || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={rpnCellStyle(rpn, idx, zebraBg, COLORS)}>{rpn || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={riskCellStyle(COLORS.risk.evaluation.cell, idx, zebraBg, '#dc2626', { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })} onClick={() => openControlModal('specialChar', idx, row.fc?.text)} title="클릭하여 특별특성 선택">{riskData[`specialChar-${idx}`] || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={optCellStyle('#fed7aa', idx, zebraBg, '0')}><input type="text" value={String(riskData[`lesson-${idx}`] || '')} onChange={(e) => handleLessonInput(idx, e.target.value)} style={inputFieldStyle} /></td>}
                
                {/* 최적화 14열 */}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={optCellStyle(COLORS.opt.plan.cell, idx, zebraBg, '0')}><input type="text" value={String(riskData[`opt-action-${idx}`] || '')} onChange={(e) => setState && setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [`opt-action-${idx}`]: e.target.value } }))} style={inputFieldStyle} /></td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={optCellStyle(COLORS.opt.plan.cell, idx, zebraBg, '0')}><input type="text" value={String(riskData[`opt-detection-action-${idx}`] || '')} onChange={(e) => setState && setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [`opt-detection-action-${idx}`]: e.target.value } }))} style={inputFieldStyle} /></td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={optCellStyle(COLORS.opt.plan.cell, idx, zebraBg, '0')}><input type="text" value={String(riskData[`opt-manager-${idx}`] || '')} onChange={(e) => setState && setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [`opt-manager-${idx}`]: e.target.value } }))} style={inputFieldStyle} /></td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={optCellStyle(COLORS.opt.plan.cell, idx, zebraBg, '0')}><input type="date" value={String(riskData[`opt-target-date-${idx}`] || '')} onChange={(e) => setState && setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [`opt-target-date-${idx}`]: e.target.value } }))} style={dateInputStyle} /></td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={optCellStyle(COLORS.opt.monitor.cell, idx, zebraBg, '0')}><select value={String(riskData[`opt-status-${idx}`] || '')} onChange={(e) => setState && setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [`opt-status-${idx}`]: e.target.value } }))} style={selectFieldStyle}><option value=""></option><option value="진행">진행</option><option value="지연">지연</option><option value="완료">완료</option></select></td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={optCellStyle(COLORS.opt.monitor.cell, idx, zebraBg, '0')}><input type="text" value={String(riskData[`opt-improve-reason-${idx}`] || '')} onChange={(e) => setState && setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [`opt-improve-reason-${idx}`]: e.target.value } }))} style={inputFieldStyle} /></td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={optCellStyle(COLORS.opt.monitor.cell, idx, zebraBg, '0')}><input type="date" value={String(riskData[`opt-complete-date-${idx}`] || '')} onChange={(e) => setState && setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [`opt-complete-date-${idx}`]: e.target.value } }))} style={dateInputStyle} /></td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={riskCellStyle(COLORS.indicator.severity.bg, idx, zebraBg, COLORS.indicator.severity.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })} onClick={() => handleSODClick('S', 'opt', idx, Number(riskData[`opt-${idx}-S`]) || undefined)} title="클릭하여 최적화 심각도 평가">{riskData[`opt-${idx}-S`] || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={riskCellStyle(COLORS.indicator.occurrence.bg, idx, zebraBg, COLORS.indicator.occurrence.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })} onClick={() => handleSODClick('O', 'opt', idx, Number(riskData[`opt-${idx}-O`]) || undefined)} title="클릭하여 최적화 발생도 평가">{riskData[`opt-${idx}-O`] || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={riskCellStyle(COLORS.indicator.detection.bg, idx, zebraBg, COLORS.indicator.detection.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })} onClick={() => handleSODClick('D', 'opt', idx, Number(riskData[`opt-${idx}-D`]) || undefined)} title="클릭하여 최적화 검출도 평가">{riskData[`opt-${idx}-D`] || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={riskCellStyle(COLORS.opt.effect.cell, idx, zebraBg, '#ffd600', { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold, cursor: 'pointer' })} onClick={() => openControlModal('specialChar', idx, `opt-${idx}`)} title="클릭하여 특별특성 선택">{riskData[`opt-specialChar-${idx}`] || ''}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={riskCellStyle(COLORS.indicator.ap.bg, idx, zebraBg, COLORS.indicator.ap.text, { textAlign: 'center', fontWeight: FONT_WEIGHTS.bold })}>{(() => { const optS = Math.min(Math.max(Number(riskData[`opt-${idx}-S`]) || 0, 0), 10); const optO = Math.min(Math.max(Number(riskData[`opt-${idx}-O`]) || 0, 0), 10); const optD = Math.min(Math.max(Number(riskData[`opt-${idx}-D`]) || 0, 0), 10); return calculateAP(optS, optO, optD); })()}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={rpnCellStyle((() => { const optS = Math.min(Math.max(Number(riskData[`opt-${idx}-S`]) || 0, 0), 10); const optO = Math.min(Math.max(Number(riskData[`opt-${idx}-O`]) || 0, 0), 10); const optD = Math.min(Math.max(Number(riskData[`opt-${idx}-D`]) || 0, 0), 10); return optS * optO * optD; })(), idx, zebraBg, COLORS)}>{(() => { const optS = Math.min(Math.max(Number(riskData[`opt-${idx}-S`]) || 0, 0), 10); const optO = Math.min(Math.max(Number(riskData[`opt-${idx}-O`]) || 0, 0), 10); const optD = Math.min(Math.max(Number(riskData[`opt-${idx}-D`]) || 0, 0), 10); return optS * optO * optD || ''; })()}</td>}
                {row.showFc && <td rowSpan={row.fcRowSpan} style={optCellStyle(COLORS.opt.effect.cell, idx, zebraBg, '0')}><input type="text" value={String(riskData[`opt-note-${idx}`] || '')} onChange={(e) => setState && setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [`opt-note-${idx}`]: e.target.value } }))} style={inputFieldStyle} /></td>}
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
    </div>
  );
}


