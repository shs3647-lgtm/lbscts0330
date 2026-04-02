/**
 * @file RiskOptCellRenderer.tsx
 * @description 리스크분석/최적화 단계 셀 렌더링 컴포넌트
 * 컬럼 이름에 따라 적절한 셀 컴포넌트를 라우팅
 * @updated 2026-02-10 - 1441행→680행 모듈화 (riskOptTypes, riskOptUtils, RiskOptControlCell 분리)
 */
'use client';

import React, { useEffect } from 'react';
import type { WorksheetState } from '../../constants';
import { HEIGHTS, IMPORTED_HIGHLIGHT, PLACEHOLDER_NA } from './allTabConstants';
import { ControlCell } from './RiskOptControlCell';
import type { RiskOptCellRendererProps } from './riskOptTypes';
import {
  FIELD_MAP, STATUS_OPTIONS, STATUS_CODE_MAP, STATUS_LABEL_MAP,
  CONTROL_TYPES, RE_EVAL_MAP, STATUS_COLORS,
} from './riskOptTypes';
import {
  getCellStyle, calcAP, getSODTextColor,
  getMaxSeverity, getSafeSODValue, getImprovementStatus, checkNeedsAction,
  parseTargetFromText, getTargetToL,
} from './riskOptUtils';
import { getOptRowKey, getOptSODKey, MULTI_ROW_COL_NAMES, AGGREGATED_OPT_COL_NAMES } from './multiOptUtils';
import { renderOptSODCell, renderAPCell, renderDateCell, renderSpecialCharCell } from './RiskOptHelperCells';

// ★★★ 2026-02-23→26: riskData 1건 변경 시 500개 셀 전체 리렌더 방지 ★★★
// ★ 성능 최적화: SOD 접미사가 필요한 prefix 3개 + 기본 prefix 20개 분리 (92→29 lookups/cell)
const SOD_BEARING_PREFIXES = ['risk-', 'opt-', 'opt6-'];
const PLAIN_PREFIXES = ['prevention-', 'detection-', 'prevention-opt-', 'detection-opt-', 'targetDate-opt-', 'completionDate-opt-', 'specialChar-', 'specialChar-opt-', 'status-', 'status-opt-', 'user-', 'lesson-', 'lesson-target-', 'lesson-cls-', 'lesson-opt-', 'filterCode-', 'result-', 'result-opt-', 'note-', 'note-opt-', 'person-', 'person-opt-', 'S-fe-', 'imported-O-', 'imported-D-', 'imported-prevention-', 'imported-detection-'];
const SOD_SUFFIXES = ['-S', '-O', '-D'];

function areRiskOptPropsEqual(prev: RiskOptCellRendererProps, next: RiskOptCellRendererProps): boolean {
  // 1. 프리미티브 props 비교 (빠른 실패)
  if (prev.col !== next.col || prev.colIdx !== next.colIdx ||
      prev.globalRowIdx !== next.globalRowIdx || prev.fcRowSpan !== next.fcRowSpan ||
      prev.fmId !== next.fmId || prev.fcId !== next.fcId || prev.rowInFM !== next.rowInFM ||
      prev.isCompact !== next.isCompact || prev.fmeaRevisionDate !== next.fmeaRevisionDate ||
      prev.optIdx !== next.optIdx || prev.optCount !== next.optCount) return false;

  // 2. state 동일 참조 → 즉시 true
  if (prev.state === next.state) return true;

  // 3. 구조 데이터 변경 → 반드시 리렌더 (심각도 계산에 영향)
  if (prev.state?.failureLinks !== next.state?.failureLinks ||
      prev.state?.l1 !== next.state?.l1) return false;

  // 4. riskData: uniqueKey 관련 키만 비교 (핵심 최적화)
  const prevRD = prev.state?.riskData;
  const nextRD = next.state?.riskData;
  if (prevRD === nextRD) return true;

  // ★ fcId 빈값 방어: FMGroupRows와 동일한 키 패턴
  const uk = prev.fmId && prev.fcId ? `${prev.fmId}-${prev.fcId}` : (prev.fmId ? `${prev.fmId}-r${prev.rowInFM}` : `r${prev.globalRowIdx}`);
  // ★ SOD 접미사가 있는 prefix: risk-{uk}-S, opt-{uk}-O 등 (3×3 = 9 lookups)
  for (const prefix of SOD_BEARING_PREFIXES) {
    for (const suffix of SOD_SUFFIXES) {
      if (prevRD?.[`${prefix}${uk}${suffix}`] !== nextRD?.[`${prefix}${uk}${suffix}`]) return false;
    }
  }
  // ★ 기본 prefix: prevention-{uk}, detection-opt-{uk} 등 (20 lookups)
  for (const prefix of PLAIN_PREFIXES) {
    if (prevRD?.[`${prefix}${uk}`] !== nextRD?.[`${prefix}${uk}`]) return false;
  }
  // ★ 다중행: optIdx > 0이면 #N suffix 키도 비교
  const _optIdx = prev.optIdx || 0;
  if (_optIdx > 0) {
    const sfx = `#${_optIdx}`;
    for (const prefix of PLAIN_PREFIXES) {
      if (prevRD?.[`${prefix}${uk}${sfx}`] !== nextRD?.[`${prefix}${uk}${sfx}`]) return false;
    }
    // ★ per-row SOD 키 비교 (opt-{uk}#N-S, opt-{uk}#N-O, opt-{uk}#N-D)
    for (const suffix of SOD_SUFFIXES) {
      if (prevRD?.[`opt-${uk}${sfx}${suffix}`] !== nextRD?.[`opt-${uk}${sfx}${suffix}`]) return false;
    }
  }
  // ★ opt-rows 변경 감지
  if (prevRD?.[`opt-rows-${uk}`] !== nextRD?.[`opt-rows-${uk}`]) return false;
  return true;
}

/**
 * 리스크분석/최적화 컬럼별 셀 렌더링 라우터
 */

export const RiskOptCellRenderer = React.memo(function RiskOptCellRendererInner({
  col, colIdx, globalRowIdx, fcRowSpan, rowInFM, prevFcRowSpan,
  fmId = '', fcId = '', fcText = '', fmText = '', fcM4 = '',
  fcProcessChar = '', fcProcessCharSC = '', fmProductChar = '', fmProductCharSC = '',
  processNo = '', processName = '',
  state, setState, setDirty, setControlModal, handleSODClick, setApModal, onApImprove,
  openLldModal, openUserModal, openDateModal, onOpenSpecialChar, fmeaRevisionDate,
  isCompact,
  optIdx = 0, optCount = 1, baseFcRowSpan, onAddOptRow, onRemoveOptRow,
  groupFirstIds,
}: RiskOptCellRendererProps): React.ReactElement | null {
  const targetType = col.step === '리스크분석' ? 'risk' : 'opt';
  const stage = col.step === '리스크분석' ? 5 : 6;
  const uniqueKey = fmId && fcId ? `${fmId}-${fcId}` : (fmId ? `${fmId}-r${rowInFM}` : `r${globalRowIdx}`);
  const style = getCellStyle(globalRowIdx, col.cellColor, col.cellAltColor, col.align, true, col.id, isCompact, groupFirstIds);

  // ★ 최적화 재평가 SOD 자동 동기화 — 의존성 좁히기 (state?.riskData → 특정 키만)
  // 95% 셀에서 _needsSync=false → deps 불변 → useEffect 발동 안 함
  const _isOptSOD = col.step === '최적화' && !!RE_EVAL_MAP[col.name];
  const _isTargetDate = col.name === '목표완료일자';
  const _needsSync = _isOptSOD || _isTargetDate;
  const _cat = _isOptSOD ? RE_EVAL_MAP[col.name] : '';
  // ★ per-row SOD 키: optIdx=0 → 하위호환, optIdx>0 → #N suffix
  const _optVal = _isOptSOD ? state?.riskData?.[getOptSODKey(uniqueKey, _cat as 'S'|'O'|'D', optIdx)] : undefined;
  const _riskVal = _isOptSOD ? getSafeSODValue(state?.riskData, `risk-${uniqueKey}-${_cat}`) : 0;
  const _hasTarget = _needsSync ? !!state?.riskData?.[getOptRowKey('targetDate-opt-', uniqueKey, optIdx)] : false;
  const _preventOpt = _needsSync ? !!(state?.riskData?.[getOptRowKey('prevention-opt-', uniqueKey, optIdx)] as string)?.trim() : false;
  const _detectOpt = _needsSync ? !!(state?.riskData?.[getOptRowKey('detection-opt-', uniqueKey, optIdx)] as string)?.trim() : false;
  // ★ 2026-02-26: 개선안 텍스트에서 목표값 파싱용 (O/D 추천값 동기화)
  const _preventOptText = (_isOptSOD && _cat === 'O') ? (state?.riskData?.[getOptRowKey('prevention-opt-', uniqueKey, optIdx)] as string || '') : '';
  const _detectOptText = (_isOptSOD && _cat === 'D') ? (state?.riskData?.[getOptRowKey('detection-opt-', uniqueKey, optIdx)] as string || '') : '';
  const _targetDateVal = _isTargetDate ? (state?.riskData?.[getOptRowKey('targetDate-opt-', uniqueKey, optIdx)] as string || '') : '';
  const _maxSev = _isOptSOD && _cat === 'S' ? getMaxSeverity(fmId, state) : 0;

  // ★★★ 2026-02-26: 5단계 AP=L → 최적화/습득교훈 차단 + opt 동기화 중단 ★★★
  const _ap5 = calcAP(
    getSafeSODValue(state?.riskData, `risk-${uniqueKey}-S`) || getMaxSeverity(fmId, state),
    getSafeSODValue(state?.riskData, `risk-${uniqueKey}-O`),
    getSafeSODValue(state?.riskData, `risk-${uniqueKey}-D`)
  );
  const _isApL = _ap5 === 'L' || _ap5 === null;

  // ★★★ 성능 최적화: 1개 useEffect(17 deps) → 3개 독립 effect로 분할 (2026-03-04)
  // 95% 셀에서 _needsSync=false → 각 effect가 좁은 deps로 즉시 return
  // 연쇄 setState 방지: 각 effect가 독립적이므로 순서 무관 (prev => 패턴)

  // ─── Effect A: 심각도(S) 동기화 ───
  useEffect(() => {
    if (!setState || !_isOptSOD || _cat !== 'S' || _isApL) return;
    const optKey = getOptSODKey(uniqueKey, 'S', optIdx);
    const riskS = _riskVal;
    if (riskS > 0 && _optVal !== riskS) {
      setState((prev: WorksheetState) => {
        if (prev.riskData?.[optKey] === riskS) return prev;
        return { ...prev, riskData: { ...(prev.riskData || {}), [optKey]: riskS } };
      });
    }
  }, [setState, _isOptSOD, _cat, _riskVal, _optVal, uniqueKey, _isApL, optIdx]);

  // ─── Effect B: O/D 자동동기화 ───
  useEffect(() => {
    if (!setState || !_isOptSOD || _cat === 'S' || _isApL) return;
    if (!_hasTarget && !_preventOpt && !_detectOpt) return;

    const optKey = getOptSODKey(uniqueKey, _cat as 'S'|'O'|'D', optIdx);
    let syncValue = 0;
    let shouldDelete = false;
    const noValidOpt = !_optVal || typeof _optVal !== 'number';

    if (_cat === 'O') {
      const isRealPrevOpt = _preventOpt && _preventOptText.trim() !== PLACEHOLDER_NA;
      if (isRealPrevOpt && _riskVal > 0) {
        const parsedTarget = parseTargetFromText(_preventOptText);
        const target = parsedTarget > 0 ? parsedTarget : getTargetToL(_riskVal, 'O');
        if (noValidOpt || _optVal !== target) syncValue = target;
      } else if (_riskVal > 0 && (noValidOpt || _optVal !== _riskVal)) {
        syncValue = _riskVal;
      }
    } else if (_cat === 'D') {
      const isRealDetOpt = _detectOpt && _detectOptText.trim() !== PLACEHOLDER_NA;
      if (isRealDetOpt && _riskVal > 0) {
        const parsedTarget = parseTargetFromText(_detectOptText);
        const target = parsedTarget > 0 ? parsedTarget : getTargetToL(_riskVal, 'D');
        if (noValidOpt || _optVal !== target) syncValue = target;
      } else if (_riskVal > 0 && (noValidOpt || _optVal !== _riskVal)) {
        syncValue = _riskVal;
      }
    }

    if (syncValue === 0 && _optVal !== null && _optVal !== undefined && typeof _optVal !== 'number') {
      shouldDelete = true;
    }

    if (syncValue > 0) {
      setState((prev: WorksheetState) => {
        if (prev.riskData?.[optKey] === syncValue) return prev;
        return { ...prev, riskData: { ...(prev.riskData || {}), [optKey]: syncValue } };
      });
    } else if (shouldDelete) {
      setState((prev: WorksheetState) => {
        if (!(optKey in (prev.riskData || {}))) return prev;
        const newRD = { ...(prev.riskData || {}) };
        delete newRD[optKey];
        return { ...prev, riskData: newRD };
      });
    }
  }, [setState, _isOptSOD, _cat, _optVal, _riskVal, _hasTarget,
      _preventOpt, _detectOpt, _preventOptText, _detectOptText, uniqueKey, _isApL, optIdx]);

  // ─── Effect C: 목표완료일자 자동채우기 ───
  useEffect(() => {
    if (!setState || !_isTargetDate || _targetDateVal) return;
    if (!_preventOpt && !_detectOpt) return;
    const masterDate = fmeaRevisionDate || '';
    if (!masterDate) return;
    const key = getOptRowKey('targetDate-opt-', uniqueKey, optIdx);
    setState((prev: WorksheetState) => {
      if (prev.riskData?.[key]) return prev;
      return { ...prev, riskData: { ...(prev.riskData || {}), [key]: masterDate } };
    });
  }, [setState, _isTargetDate, _targetDateVal, _preventOpt, _detectOpt,
      fmeaRevisionDate, uniqueKey, optIdx]);

  // ★★★ 5단계 AP=L → 최적화 전체 + LLD 빈칸 반환 ★★★
  // 단, LLD 최적화 데이터(prevention-opt/detection-opt)가 있으면 빈칸 처리 스킵
  // _preventOpt/_detectOpt는 _needsSync=true(SOD/목표일 컬럼)에서만 유효하므로
  // 모든 최적화 컬럼에서 동작하도록 riskData 직접 확인
  const _hasLldOptData = !!(state?.riskData?.[getOptRowKey('prevention-opt-', uniqueKey, optIdx)] as string)?.trim()
    || !!(state?.riskData?.[getOptRowKey('detection-opt-', uniqueKey, optIdx)] as string)?.trim();
  // ★ optIdx > 0 (사용자가 직접 추가한 개선행)은 AP=L 블랭크 처리 제외
  if (_isApL && !_hasLldOptData && optIdx === 0 && (col.step === '최적화' || col.name === 'LLD')) {
    // ★ 다중행: step 6 다중행 컬럼은 multi-row rowSpan 적용
    const blankRowSpan = (col.step === '최적화' && MULTI_ROW_COL_NAMES.has(col.name))
      ? (optIdx === 0 ? (baseFcRowSpan ?? fcRowSpan) : 1)
      : fcRowSpan;
    return <td key={colIdx} rowSpan={blankRowSpan} style={style}>{'\u00A0'}</td>;
  }

  // ═══════════════════════════════════════════════════
  // 예방관리/검출관리/예방관리개선/검출관리개선
  // ═══════════════════════════════════════════════════
  if (CONTROL_TYPES[col.name]) {
    const modalType = CONTROL_TYPES[col.name];
    // ★ 다중행: step 6 개선 컬럼은 optIdx-aware 키 사용
    const isOptType = modalType === 'prevention-opt' || modalType === 'detection-opt';
    const key = isOptType ? getOptRowKey(`${modalType}-`, uniqueKey, optIdx) : `${modalType}-${uniqueKey}`;
    const value = state?.riskData?.[key] || '';
    // ★ 다중행: step 6 컬럼의 rowSpan — optIdx===0이면 baseFcRowSpan(원본), optIdx>0이면 1
    const cellRowSpan = isOptType ? (optIdx === 0 ? (baseFcRowSpan ?? fcRowSpan) : 1) : fcRowSpan;

    let needsAction = false;
    if (isOptType && !value && optIdx === 0) {
      const s = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-S`) || getMaxSeverity(fmId, state);
      const o = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-O`);
      const d = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-D`);
      const ap = calcAP(s, o, d);
      needsAction = (ap === 'H' || ap === 'M');
    }

    // ★ Import 자동보완 하이라이트 (예방관리/검출관리)
    const importedCtrlFlag = !isOptType ? state?.riskData?.[`imported-${modalType}-${uniqueKey}`] : undefined;
    const isImportedCtrl = importedCtrlFlag === 'auto';

    const warningStyle: React.CSSProperties = needsAction
      ? { ...style, backgroundColor: '#fee2e2', textAlign: 'center', cursor: 'pointer' }
      : isImportedCtrl
        ? { ...style, backgroundColor: IMPORTED_HIGHLIGHT.bg, color: IMPORTED_HIGHLIGHT.text }
        : style;
    const displayText = needsAction && !value ? '미수립' : String(value || '');

    return (
      <ControlCell
        key={colIdx} colIdx={colIdx} fcRowSpan={cellRowSpan} style={warningStyle}
        value={displayText} riskDataKey={key} modalType={modalType} globalRowIdx={globalRowIdx}
        fmId={fmId} fcId={fcId} fcText={fcText} fmText={fmText} fcM4={fcM4} processNo={processNo} processName={processName}
        state={state} setState={setState} setDirty={setDirty} setControlModal={setControlModal}
      />
    );
  }

  // ═══════════════════════════════════════════════════
  // 발생도/검출도 (리스크분석 5단계)
  // ═══════════════════════════════════════════════════
  if ((col.name === '발생도(O)' || col.name === '검출도(D)') && col.step === '리스크분석') {
    const category: 'O' | 'D' = col.name === '발생도(O)' ? 'O' : 'D';
    const key = `${targetType}-${uniqueKey}-${category}`;
    const numericValue = getSafeSODValue(state?.riskData, key);
    const displayValue = numericValue > 0 ? String(numericValue) : '';
    // ★ Import 자동보완 하이라이트
    const importedFlag = state?.riskData?.[`imported-${category}-${uniqueKey}`];
    const isImported = importedFlag === 'auto';

    return (
      <td key={colIdx} rowSpan={fcRowSpan}
        onClick={(e) => {
          e.stopPropagation();
          // ★ 사용자 클릭 시 imported flag 삭제
          if (isImported && setState) {
            setState((prev: WorksheetState) => {
              const flagKey = `imported-${category}-${uniqueKey}`;
              if (!prev.riskData?.[flagKey]) return prev;
              const newRD = { ...(prev.riskData || {}) };
              delete newRD[flagKey];
              return { ...prev, riskData: newRD };
            });
          }
          handleSODClick(category, 'risk', globalRowIdx, numericValue, undefined, undefined, undefined, fmId, fcId);
        }}
        style={{
          ...style, fontWeight: numericValue > 0 ? 700 : 400, cursor: 'pointer',
          backgroundColor: isImported ? IMPORTED_HIGHLIGHT.bg : (globalRowIdx % 2 === 0 ? col.cellColor : col.cellAltColor),
          color: isImported ? IMPORTED_HIGHLIGHT.text : getSODTextColor(numericValue),
        }}
        title={isImported ? `자동보완 ${col.name}: ${numericValue} — 클릭하여 확인/수정` : `클릭하여 ${col.name} 선택 (현재: ${numericValue || '-'})`}
      >{displayValue}</td>
    );
  }

  // ═══════════════════════════════════════════════════
  // 재평가 SOD (최적화 6단계)
  // ═══════════════════════════════════════════════════
  if (RE_EVAL_MAP[col.name] && col.step === '최적화') {
    return renderOptSODCell(col, colIdx, globalRowIdx, fcRowSpan, uniqueKey, fmId, fcId, style, state, handleSODClick, optIdx, baseFcRowSpan);
  }

  // ═══════════════════════════════════════════════════
  // AP 셀 (5단계/6단계)
  // ═══════════════════════════════════════════════════
  if (col.name === 'AP' || col.name === 'AP(재평가)') {
    return renderAPCell(col, colIdx, globalRowIdx, fcRowSpan, uniqueKey, fmId, fcId, stage, style, state, setApModal, onApImprove, optIdx, baseFcRowSpan);
  }

  // ═══════════════════════════════════════════════════
  // LLD(필터코드) 통합 셀 — 습득교훈 + Filter Code 일원화
  // ═══════════════════════════════════════════════════
  if (col.name === 'LLD') {
    const lldKey = `lesson-${uniqueKey}`;
    const lldValue = (state?.riskData?.[lldKey] as string) || '';
    const isLldNo = lldValue.startsWith('LLD');
    const clsValue = (state?.riskData?.[`lesson-cls-${uniqueKey}`] as string) || '';
    // 예방/검출 연결 타입 배지
    const lessonTarget = (state?.riskData?.[`lesson-target-${uniqueKey}`] as string) || '';
    const targetLabel = lessonTarget === 'detection' ? '검출' : lessonTarget === 'prevention' ? '예방' : '';
    // Filter Code 분류 색상
    const FC_COLORS: Record<string, string> = { 'RMA': '#dc2626', 'ABN': '#d97706', 'CIP': '#2563eb', 'ECN': '#7c3aed', 'FieldIssue': '#059669', 'DevIssue': '#0891b2' };
    // tooltip — LLD는 5단계 리스크분석 예방관리/검출관리에 적용
    const ctrlKey = lessonTarget === 'detection' ? `detection-${uniqueKey}` : `prevention-${uniqueKey}`;
    const ctrlText = isLldNo ? (state?.riskData?.[ctrlKey] as string) || '' : '';
    const tooltipText = isLldNo
      ? `${lldValue}${clsValue ? ` [${clsValue}]` : ''}${targetLabel ? ` → ${targetLabel === '예방' ? '예방관리' : '검출관리'}` : ''}\n${ctrlText ? `관리: ${ctrlText}` : '클릭하여 LLD 변경'}`
      : '클릭하여 LLD 선택';
    return (
      <td key={colIdx} rowSpan={fcRowSpan}
        style={{ ...style, cursor: 'pointer', position: 'relative', padding: '1px 2px' }}
        title={tooltipText}
        onClick={() => {
          const _pc = (state?.riskData?.[`prevention-${uniqueKey}`] as string) || '';
          const _dc = (state?.riskData?.[`detection-${uniqueKey}`] as string) || '';
          openLldModal?.(globalRowIdx, lldValue, fmId, fcId, fmText, fcText, _pc, _dc);
        }}
      >
        {/* LLD 번호 */}
        <div style={{ color: isLldNo ? '#00587a' : '#999', fontWeight: isLldNo ? 600 : 400, fontSize: '8px', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {lldValue || '\u00A0'}
        </div>
        {/* 구분+예방/검출 배지 (한 줄) */}
        {isLldNo && (clsValue || targetLabel) && (
          <div style={{ display: 'flex', gap: 1, marginTop: 1, flexWrap: 'nowrap' }}>
            {clsValue && (
              <span style={{ padding: '0 2px', borderRadius: 2, fontSize: '7px', fontWeight: 700, color: FC_COLORS[clsValue] || '#666', background: '#f3f4f6', lineHeight: '12px' }}>
                {clsValue}
              </span>
            )}
            {targetLabel && (
              <span style={{ padding: '0 2px', borderRadius: 2, fontSize: '7px', fontWeight: 700, background: lessonTarget === 'detection' ? '#fef3c7' : '#dbeafe', color: lessonTarget === 'detection' ? '#b45309' : '#1d4ed8', lineHeight: '12px' }}>
                {targetLabel}
              </span>
            )}
          </div>
        )}
        {/* LLD 삭제 × 버튼 */}
        {lldValue && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setState?.((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [lldKey]: '', [`lesson-target-${uniqueKey}`]: '', [`lesson-cls-${uniqueKey}`]: '' } }));
              setDirty?.(true);
            }}
            style={{ position: 'absolute', top: 0, right: 1, fontSize: '10px', color: '#999', cursor: 'pointer', lineHeight: 1, padding: '1px 2px' }}
            title="LLD 삭제"
          >×</span>
        )}
      </td>
    );
  }

  // ═══════════════════════════════════════════════════
  // 책임자성명
  // ═══════════════════════════════════════════════════
  if (col.name === '책임자성명') {
    const field = FIELD_MAP[col.name];
    // ★ 다중행: optIdx-aware 키
    const key = col.step === '최적화' ? getOptRowKey(`${field}-opt-`, uniqueKey, optIdx) : `${field}-${uniqueKey}`;
    const value = (state?.riskData?.[key] as string) || '';
    // ★ 다중행: multi-row rowSpan
    const cellRowSpan = col.step === '최적화' ? (optIdx === 0 ? (baseFcRowSpan ?? fcRowSpan) : 1) : fcRowSpan;

    // ★ 다중행: optIdx > 0은 항상 표시 (사용자가 행추가한 것)
    if (optIdx === 0) {
      const { hasImprovement } = getImprovementStatus(uniqueKey, state?.riskData);
      if (!hasImprovement) {
        return <td key={colIdx} rowSpan={cellRowSpan} style={{ ...style, cursor: 'default' }} />;
      }
    }
    const personStyle: React.CSSProperties = !value
      ? { ...style, cursor: 'pointer', textAlign: 'center', backgroundColor: '#fecaca', color: '#b91c1c', fontWeight: 700 }
      : { ...style, cursor: 'pointer', textAlign: 'center' };
    // ★ 다중행: optIdx > 0일 때 fcId에 #N 인코딩 (모달 키 호환)
    const modalFcId = optIdx > 0 ? `${fcId}#${optIdx}` : fcId;
    return (
      <td key={colIdx} rowSpan={cellRowSpan}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); openUserModal?.(globalRowIdx, value, fmId, modalFcId); }}
        style={personStyle}
        title={value ? `${value} - 클릭하여 책임자 변경` : '담당자 미지정 — 클릭하여 책임자 선택'}
      >{value ? value : '미지정'}</td>
    );
  }

  // ═══════════════════════════════════════════════════
  // 개선결과근거/비고 - 인라인 텍스트 입력
  // ═══════════════════════════════════════════════════
  if (FIELD_MAP[col.name] && !col.name.includes('일자') && col.name !== 'LLD' && col.name !== '책임자성명') {
    const field = FIELD_MAP[col.name];
    // ★ 다중행: multi-row rowSpan
    const cellRowSpan = col.step === '최적화' ? (optIdx === 0 ? (baseFcRowSpan ?? fcRowSpan) : 1) : fcRowSpan;
    // ★ 다중행: optIdx > 0은 targetDate 체크 생략 (사용자가 행추가한 것)
    if (col.name === '비고' && optIdx === 0 && !state?.riskData?.[`targetDate-opt-${uniqueKey}`]) {
      return <td key={colIdx} rowSpan={cellRowSpan} style={{ ...style, cursor: 'default' }} />;
    }
    // ★ 다중행: optIdx-aware 키
    const key = col.step === '최적화' ? getOptRowKey(`${field}-opt-`, uniqueKey, optIdx) : `${field}-${uniqueKey}`;
    const value = (state?.riskData?.[key] as string) || '';
    // ★ 개선결과근거 컬럼: +/- 버튼 표시 (행 추가/삭제)
    const isResult = col.name === '개선결과근거' && col.step === '최적화';
    return (
      <td key={colIdx} rowSpan={cellRowSpan} style={{ ...style, padding: 0, position: isResult ? 'relative' : undefined }}>
        <input type="text" defaultValue={value} placeholder=""
          onBlur={(e) => {
            if (!setState) return;
            const newValue = e.target.value;
            if (newValue !== value) {
              setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [key]: newValue } }));
              setDirty?.(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          }}
          className={`w-full h-full bg-transparent ${isCompact ? 'text-[9px]' : 'text-[10px]'} px-1 py-0 border-0 outline-none focus:ring-1 focus:ring-blue-400`}
          style={{ minHeight: `${HEIGHTS.body - 2}px`, paddingRight: isResult ? ((optCount > 1 || optIdx > 0) ? '28px' : '18px') : undefined }}
        />
        {isResult && onAddOptRow && (
          <span
            onClick={(e) => { e.stopPropagation(); onAddOptRow(uniqueKey); }}
            style={{ position: 'absolute', top: 0, right: (optCount > 1 || optIdx > 0) ? 14 : 1, fontSize: '11px', color: '#2196f3', cursor: 'pointer', lineHeight: 1, padding: '1px 2px', fontWeight: 700 }}
            title="개선안 행 추가 (+)"
          >+</span>
        )}
        {isResult && onRemoveOptRow && (optIdx > 0 || optCount > 1) && (
          <span
            onClick={(e) => { e.stopPropagation(); onRemoveOptRow(uniqueKey, optIdx > 0 ? optIdx : optCount - 1); }}
            style={{ position: 'absolute', top: 0, right: 1, fontSize: '11px', color: '#f44336', cursor: 'pointer', lineHeight: 1, padding: '1px 2px', fontWeight: 700 }}
            title={optIdx > 0 ? '이 개선안 행 삭제 (−)' : '마지막 개선안 행 삭제 (−)'}
          >−</span>
        )}
      </td>
    );
  }

  // ═══════════════════════════════════════════════════
  // 날짜 입력 (목표완료일자/완료일자)
  // ═══════════════════════════════════════════════════
  if (col.name === '목표완료일자' || col.name === '완료일자') {
    return renderDateCell(col, colIdx, globalRowIdx, fcRowSpan, uniqueKey, fmId, fcId, style, state, openDateModal, fmeaRevisionDate, optIdx, baseFcRowSpan);
  }

  // ═══════════════════════════════════════════════════
  // 상태 셀 - 드롭다운
  // ═══════════════════════════════════════════════════
  if (col.name === '상태') {
    // ★ 다중행: multi-row rowSpan
    const cellRowSpan = col.step === '최적화' ? (optIdx === 0 ? (baseFcRowSpan ?? fcRowSpan) : 1) : fcRowSpan;
    // ★ 다중행: optIdx > 0은 targetDate 체크 생략
    if (optIdx === 0 && !state?.riskData?.[`targetDate-opt-${uniqueKey}`]) {
      return <td key={colIdx} rowSpan={cellRowSpan} style={{ ...style, cursor: 'default' }} />;
    }
    // ★ 다중행: optIdx-aware 키
    const key = col.step === '최적화' ? getOptRowKey('status-opt-', uniqueKey, optIdx) : `status-${uniqueKey}`;
    const storedValue = (state?.riskData?.[key] as string) || '';
    const displayValue = STATUS_LABEL_MAP[storedValue] || storedValue || '';

    return (
      <td key={colIdx} rowSpan={cellRowSpan} style={{ ...style, padding: 0 }}>
        <select value={displayValue}
          onChange={(e) => {
            const codeValue = STATUS_CODE_MAP[e.target.value] || e.target.value;
            setState?.((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [key]: codeValue } }));
            setDirty?.(true);
          }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full h-full bg-transparent ${isCompact ? 'text-[9px]' : 'text-[9px]'} px-0 py-0 border-0 outline-none cursor-pointer`}
          style={{ minHeight: `${HEIGHTS.body - 2}px`, color: STATUS_COLORS[displayValue] || '#666', fontWeight: displayValue ? 600 : 400, textAlign: 'center', textAlignLast: 'center', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' } as React.CSSProperties}
        >
          <option value=""></option>
          {STATUS_OPTIONS.map(opt => (<option key={opt} value={opt} style={{ color: STATUS_COLORS[opt] }}>{opt}</option>))}
        </select>
      </td>
    );
  }

  // ═══════════════════════════════════════════════════
  // RPN 셀
  // ═══════════════════════════════════════════════════
  if (col.name === 'RPN' || col.name === 'RPN(재평가)') {
    // ★ 5단계: risk-{uk}-S/O/D, 6단계: per-row SOD 키 (globalRowIdx 버그 수정)
    const isOpt = col.step === '최적화';
    const sKey = isOpt ? getOptSODKey(uniqueKey, 'S', optIdx) : `risk-${uniqueKey}-S`;
    const oKey = isOpt ? getOptSODKey(uniqueKey, 'O', optIdx) : `risk-${uniqueKey}-O`;
    const dKey = isOpt ? getOptSODKey(uniqueKey, 'D', optIdx) : `risk-${uniqueKey}-D`;
    const s = isOpt
      ? (getSafeSODValue(state?.riskData, sKey) || getSafeSODValue(state?.riskData, `risk-${uniqueKey}-S`) || getMaxSeverity(fmId, state))
      : (getSafeSODValue(state?.riskData, sKey) || getMaxSeverity(fmId, state));
    const o = getSafeSODValue(state?.riskData, oKey);
    const d = getSafeSODValue(state?.riskData, dKey);
    const rpn = s > 0 && o > 0 && d > 0 ? s * o * d : 0;
    // ★ 다중행: 6단계 per-row rowSpan
    const rpnRowSpan = isOpt ? (optIdx === 0 ? (baseFcRowSpan ?? fcRowSpan) : 1) : fcRowSpan;
    const rpnColor = rpn >= 200 ? '#c62828' : rpn >= 100 ? '#f57f17' : rpn > 0 ? '#2e7d32' : '#666';
    return (
      <td key={colIdx} rowSpan={rpnRowSpan} style={{ ...style, cursor: 'default', fontWeight: rpn > 0 ? 700 : 400, color: rpnColor }}>
        {rpn > 0 ? rpn : ''}
      </td>
    );
  }

  // ═══════════════════════════════════════════════════
  // 특별특성
  // ═══════════════════════════════════════════════════
  if (col.name === '특별특성(SC)') {
    return renderSpecialCharCell(col, colIdx, globalRowIdx, fcRowSpan, uniqueKey, fmId, fcId, fcText, fmProductChar, fmProductCharSC, fcProcessChar, fcProcessCharSC, processNo, processName, style, state, onOpenSpecialChar);
  }

  // 기본 빈 셀
  return <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, cursor: 'default' }}></td>;
}, areRiskOptPropsEqual);

// ═══════════════════════════════════════════════════
// 하위 렌더 함수 → RiskOptHelperCells.tsx로 분리
// (renderOptSODCell, renderAPCell, renderDateCell, renderSpecialCharCell)
// ═══════════════════════════════════════════════════
