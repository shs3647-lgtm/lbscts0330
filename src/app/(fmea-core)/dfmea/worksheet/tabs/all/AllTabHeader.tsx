/**
 * @file AllTabHeader.tsx
 * @description ALL 화면 <thead> 3행 헤더 (1행 단계 + 2행 분류 + 3행 컬럼명)
 *
 * AllTabEmpty.tsx에서 추출한 순수 렌더링 컴포넌트.
 * - 1행: 단계 (대분류) — 리스크분석/고장분석 배지+버튼 포함
 * - 2행: 분류 (중분류) — 개선추천 버튼 포함
 * - 3행: 컬럼명 (소분류)
 */

import React from 'react';
import {
  STEP_LABELS, STEP_DIVIDER, STEP_FIRST_COLUMN_IDS,
  COMPACT_FONT, HEIGHTS, COMPACT_HEIGHTS,
  ColumnDef, StepSpan, GroupSpan,
} from './allTabConstants';
import { useLocale } from '@/lib/locale';
import { blText, getBilingualEntry } from '@/lib/bilingual-labels';
import { MENU_DICT } from '@/lib/locale-dict';

// ★ 3행 헤더 축약 매핑 (KO 축약명 + EN 축약명)
const HEADER_SHORT_MAP: Record<string, { ko: string; en: string }> = {
  '예방관리개선': { ko: '예방개선', en: 'Prev. Improve' },
  '검출관리개선': { ko: '검출개선', en: 'Det. Improve' },
  '책임자성명': { ko: '책임자', en: 'Person' },
  '목표완료일자': { ko: '목표일', en: 'Target' },
  '개선결과근거': { ko: '개선결과', en: 'Result' },
  '완료일자': { ko: '완료일', en: 'Completion' },
  '완제품 공정명': { ko: '완제품공정명', en: 'Product Process' },
};

// ★ 하위호환용
export const HEADER_SHORT: Record<string, string> = Object.fromEntries(
  Object.entries(HEADER_SHORT_MAP).map(([k, v]) => [k, `${v.ko}(${v.en})`])
);

/** 2-line header helper for col names */
function ColBiHeader({ name, narrow }: { name: string; narrow: boolean }) {
  const mapped = HEADER_SHORT_MAP[name];
  if (mapped) {
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
        <span>{mapped.ko}</span>
        <span style={{ fontSize: narrow ? '7px' : '8px', opacity: 0.65 }}>({mapped.en})</span>
      </span>
    );
  }
  const entry = getBilingualEntry(name);
  const paren = name.match(/^(.+?)\(([^)]+)\)$/);
  if (paren) {
    const ko = paren[1];
    const en = entry ? entry.full : paren[2];
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
        <span>{ko}</span>
        <span style={{ fontSize: narrow ? '7px' : '8px', opacity: 0.65 }}>({en})</span>
      </span>
    );
  }
  if (entry) {
    const en = entry.abbr || entry.full;
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
        <span>{name}</span>
        <span style={{ fontSize: narrow ? '7px' : '8px', opacity: 0.65 }}>({en})</span>
      </span>
    );
  }
  return <>{name}</>;
}

/** 2-line header for group names (row 2) */
function GroupBiHeader({ group }: { group: string }) {
  const en = MENU_DICT[group];
  if (en) {
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
        <span>{group}</span>
        <span style={{ fontSize: '8px', opacity: 0.65 }}>({en})</span>
      </span>
    );
  }
  return <>{group}</>;
}

/** 2-line header for step labels (row 1) */
function StepBiHeader({ ko, en }: { ko: string; en: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15 }}>
      <span>{ko}</span>
      <span style={{ fontSize: '8px', opacity: 0.7 }}>({en})</span>
    </span>
  );
}

// ★ EN모드: 1행 단계 라벨
const STEP_LABELS_EN: Record<string, string> = {
  '구조분석': '2ST Structure',
  '기능분석': '3ST Function',
  '고장분석': '4ST Failure',
  '리스크분석': '5ST Risk',
  '최적화': '6ST Optimization',
};

/** failureStats 타입 (structureStats + missingSODCounts 합산) */
export interface FailureStatsForHeader {
  linked: { fe: number; fm: number; fc: number };
  state: { fe: number; fm: number; fc: number };
  mismatch: { fe: boolean; fm: boolean; fc: boolean };
  hasMismatch: boolean;
  missingSevCount: number;
  missingOCount: number;
  missingDCount: number;
}

export interface AllTabHeaderProps {
  stepSpans: StepSpan[];
  groupSpans: GroupSpan[];
  columns: ColumnDef[];
  hHeights: typeof HEIGHTS | typeof COMPACT_HEIGHTS;
  hFont: typeof COMPACT_FONT | undefined;
  isCompact: boolean;
  failureStats: FailureStatsForHeader;
  apStats: { hCount: number; mCount: number; lCount: number };
  // 버튼 핸들러들
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  autoRecommendS: () => void;
  handleRecommendImprovement: () => void;
  // ★ O/D 매칭 + 누락 토글
  handleOMatch: () => void;
  handleDMatch: () => void;
  highlightMissingO: boolean;
  highlightMissingD: boolean;
  toggleHighlightO: () => void;
  toggleHighlightD: () => void;
  // ★ 자동수정 통합 버튼
  runAutoFix?: () => void;
  isAutoFixRunning?: boolean;
}

export default function AllTabHeader({
  stepSpans,
  groupSpans,
  columns,
  hHeights,
  hFont,
  isCompact,
  failureStats,
  apStats,
  saveAtomicDB,
  autoRecommendS,
  handleRecommendImprovement,
  handleOMatch,
  handleDMatch,
  highlightMissingO,
  highlightMissingD,
  toggleHighlightO,
  toggleHighlightD,
  runAutoFix,
  isAutoFixRunning,
}: AllTabHeaderProps) {
  const { locale, t } = useLocale();
  return (
    <thead className="sticky top-0 z-20" style={{ boxShadow: '0 2px 0 0 #2196f3' }}>
      {/* 1행: 단계 (대분류) */}
      <tr>
        {stepSpans.map((span, idx) => {
          const stepNumMap: Record<string, number> = { '구조분석': 2, '기능분석': 3, '고장분석': 4, '리스크분석': 5, '최적화': 6 };
          return (
          <th
            key={idx}
            colSpan={span.colSpan}
            data-step-num={stepNumMap[span.step] || 0}
            style={{
              background: span.color, color: '#fff',
              height: `${hHeights.header1}px`, padding: isCompact ? '2px 3px' : '4px 8px',
              borderTop: '1px solid #ccc', borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc',
              borderLeft: `${STEP_DIVIDER.borderWidth} ${STEP_DIVIDER.borderStyle} ${STEP_DIVIDER.borderColor}`,
              fontWeight: 800, fontSize: hFont?.header1 || '12px', textAlign: 'center',
              whiteSpace: isCompact ? 'normal' : 'nowrap', lineHeight: isCompact ? 1.2 : undefined,
            }}
          >
            {span.step === '리스크분석' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', flexWrap: 'wrap' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); saveAtomicDB?.(true); }}
                  style={{
                    background: '#2e7d32', color: '#fff', border: '1px solid #66bb6a',
                    padding: '1px 5px', borderRadius: '3px',
                    fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap', lineHeight: '14px',
                  }}
                  title={t('현재 워크시트 데이터를 DB에 저장')}
                >
                  {t('저장')}
                </button>
                {runAutoFix && (
                  <button
                    onClick={(e) => { e.stopPropagation(); runAutoFix(); }}
                    disabled={isAutoFixRunning}
                    style={{
                      background: isAutoFixRunning ? '#999' : '#e65100',
                      color: '#fff', border: '1px solid #ff9800',
                      padding: '1px 5px', borderRadius: '3px',
                      fontSize: '9px', fontWeight: 700,
                      cursor: isAutoFixRunning ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap', lineHeight: '14px',
                    }}
                    title={t('S매칭→PC매칭→DC매칭→O/D평가를 순차 자동 실행 (적색 표시)')}
                  >
                    {isAutoFixRunning ? t('수정중...') : t('자동수정')}
                  </button>
                )}
                <span style={{ fontSize: '10px' }}><StepBiHeader ko="5ST 리스크분석" en="Risk Analysis" /></span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 600 }}>
                  <span style={{ background: '#ef5350', color: '#fff', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px' }}>H:{apStats.hCount}</span>
                  <span style={{ background: '#ffc107', color: '#000', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px' }}>M:{apStats.mCount}</span>
                  <span style={{ background: '#4caf50', color: '#fff', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px' }}>L:{apStats.lCount}</span>
                </span>
                {/* ★ O매칭 + O누락 | D매칭 + D누락 — 한 그룹으로 묶음 (S누락/S추천은 고장분석에만 표시) */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 600 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOMatch(); }}
                    style={{
                      background: '#1565c0', color: '#fff', border: '1px solid #42a5f5',
                      padding: '1px 4px', borderRadius: '3px',
                      fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                      whiteSpace: 'nowrap', lineHeight: '13px',
                    }}
                    title={t('Import B5 데이터를 공정별로 자동 매칭 → 예방관리 + 발생도(O) 평가')}
                  >
                    {t('O매칭')}
                  </button>
                  <span
                    onClick={(e) => { e.stopPropagation(); toggleHighlightO(); }}
                    style={{
                      background: highlightMissingO ? '#ff1744' : '#e53935',
                      color: '#fff',
                      padding: '1px 3px', borderRadius: '3px', lineHeight: '13px',
                      border: highlightMissingO ? '2px solid #fff' : '1px solid #ffeb3b',
                      cursor: 'pointer',
                    }}
                    title={locale === 'en'
                      ? `O missing: ${failureStats.missingOCount} — Click to ${highlightMissingO ? 'hide' : 'highlight'}`
                      : `발생도 미평가: ${failureStats.missingOCount}건 — 클릭하여 하이라이트 ${highlightMissingO ? 'OFF' : 'ON'}`}
                  >
                    {locale === 'en' ? 'O miss' : 'O누락'}:{failureStats.missingOCount}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDMatch(); }}
                    style={{
                      background: '#1565c0', color: '#fff', border: '1px solid #42a5f5',
                      padding: '1px 4px', borderRadius: '3px',
                      fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                      whiteSpace: 'nowrap', lineHeight: '13px',
                    }}
                    title={t('Import A6 데이터를 공정별로 자동 매칭 → 검출관리 + 검출도(D) 평가')}
                  >
                    {t('D매칭')}
                  </button>
                  <span
                    onClick={(e) => { e.stopPropagation(); toggleHighlightD(); }}
                    style={{
                      background: highlightMissingD ? '#00acc1' : '#00838f',
                      color: '#fff',
                      padding: '1px 3px', borderRadius: '3px', lineHeight: '13px',
                      border: highlightMissingD ? '2px solid #fff' : '1px solid #4dd0e1',
                      cursor: 'pointer',
                    }}
                    title={locale === 'en'
                      ? `D missing: ${failureStats.missingDCount} — Click to ${highlightMissingD ? 'hide' : 'highlight'}`
                      : `검출도 미평가: ${failureStats.missingDCount}건 — 클릭하여 하이라이트 ${highlightMissingD ? 'OFF' : 'ON'}`}
                  >
                    {locale === 'en' ? 'D miss' : 'D누락'}:{failureStats.missingDCount}
                  </span>
                </span>
              </div>
            ) : span.step === '고장분석' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px' }}><StepBiHeader ko="4ST 고장분석" en="Failure Analysis" /></span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 600 }}>
                  {(['fe', 'fm', 'fc'] as const).map(t => (
                    <span key={t} style={{
                      background: failureStats.mismatch[t] ? '#f44336' : '#1565c0',
                      color: '#fff', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px',
                      border: failureStats.mismatch[t] ? '2px solid #ffeb3b' : '1px solid rgba(255,255,255,0.3)',
                    }} title={failureStats.mismatch[t] ? (locale === 'en' ? `Mismatch: Link=${failureStats.linked[t]}, Analysis=${failureStats.state[t]}` : `\u26A0\uFE0F 불일치: 고장연결=${failureStats.linked[t]}, 고장분석=${failureStats.state[t]}`) : ''}>
                      {t.toUpperCase()}:{failureStats.linked[t]}
                    </span>
                  ))}
                  {failureStats.hasMismatch && (
                    <span style={{ color: '#ffeb3b', fontWeight: 700, fontSize: '10px' }} title={locale === 'en' ? 'Failure link / analysis mismatch' : '고장연결과 고장분석 데이터 불일치'}>{'\u26A0\uFE0F'}</span>
                  )}
                </span>
                {failureStats.missingSevCount > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 600 }}>
                    <span style={{ background: '#ff9800', color: '#fff', padding: '1px 3px', borderRadius: '3px', border: '1px solid #ffeb3b', lineHeight: '13px' }} title={locale === 'en' ? `S missing FM: ${failureStats.missingSevCount}` : `심각도 미평가 FM: ${failureStats.missingSevCount}건`}>
                      {locale === 'en' ? 'S miss' : 'S누락'}:{failureStats.missingSevCount}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); autoRecommendS(); }}
                      style={{
                        background: '#e65100', color: '#fff', border: '1px solid #ff9800',
                        padding: '1px 4px', borderRadius: '3px',
                        fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                        whiteSpace: 'nowrap', lineHeight: '13px',
                      }}
                      title={t('심각도(S) 자동추천 — FE 텍스트와 SOD 평가기준 유사도 기반 예비평가')}
                    >
                      {t('S추천')}
                    </button>
                  </span>
                )}
              </div>
            ) : span.step === '최적화' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px' }}><StepBiHeader ko="6ST 최적화" en="Optimization" /></span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 600 }}>
                  <span style={{ background: '#ef5350', color: '#fff', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px' }}>H:{apStats.hCount}</span>
                  <span style={{ background: '#ffc107', color: '#000', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px' }}>M:{apStats.mCount}</span>
                  <span style={{ background: '#4caf50', color: '#fff', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px' }}>L:{apStats.lCount}</span>
                </span>
              </div>
            ) : (
              <StepBiHeader
                ko={isCompact ? span.step : (STEP_LABELS[span.step] || span.step)}
                en={STEP_LABELS_EN[span.step]?.replace(/^\dST\s+/, '') || span.step}
              />
            )}
          </th>
        );
        })}
      </tr>

      {/* 2행: 분류 (중분류) */}
      <tr>
        {groupSpans.map((span, idx) => {
          const isStepFirst = STEP_FIRST_COLUMN_IDS.includes(span.startColId);
          return (
            <th key={idx} colSpan={span.colSpan} style={{
              background: span.color, color: span.isDark ? '#fff' : '#000',
              height: `${hHeights.header2}px`, padding: isCompact ? '0px 2px' : '0px 4px',
              borderTop: '1px solid #ccc', borderRight: '1px solid #ccc', borderBottom: '1px solid #ccc',
              borderLeft: isStepFirst ? `${STEP_DIVIDER.borderWidth} ${STEP_DIVIDER.borderStyle} ${STEP_DIVIDER.borderColor}` : '1px solid #ccc',
              fontWeight: 600, fontSize: hFont?.header2 || '10px', textAlign: 'center',
              whiteSpace: 'nowrap', lineHeight: 1,
            }}>
              <GroupBiHeader group={span.group} />
              {span.group === '1. 계획(Plan)' && (
                <>
                  <button
                    onClick={handleRecommendImprovement}
                    style={{
                      marginLeft: 4, padding: '0 4px', fontSize: '9px', fontWeight: 700,
                      background: '#fff', color: '#1565c0', border: '1px solid #1565c0',
                      borderRadius: 3, cursor: 'pointer', lineHeight: '16px',
                    }}
                    title={t('AP(H/M) 항목에 개선 추천안 자동 입력')}
                  >
                    {t('개선추천')}
                  </button>
                </>
              )}
            </th>
          );
        })}
      </tr>

      {/* 3행: 컬럼명 (소분류) — 축약 + 좁은컬럼 줄바꿈 허용 */}
      <tr>
        {columns.map((col, idx) => {
          const isStepFirst = STEP_FIRST_COLUMN_IDS.includes(col.id);
          const isNarrow = col.width <= 80;
          return (
            <th key={idx} style={{
              background: col.isDark ? col.headerColor : col.cellAltColor,
              color: col.isDark ? '#fff' : '#000',
              height: `${hHeights.header3}px`, padding: '1px 1px',
              borderTop: '1px solid #ccc', borderRight: '1px solid #ccc',
              borderBottom: '1px solid #ccc', boxShadow: 'inset 0 -2px 0 #2196f3',
              borderLeft: isStepFirst ? `${STEP_DIVIDER.borderWidth} ${STEP_DIVIDER.borderStyle} ${STEP_DIVIDER.borderColor}` : '1px solid #ccc',
              fontWeight: 600, fontSize: isNarrow ? '9px' : (hFont?.header3 || '10px'), textAlign: 'center',
              whiteSpace: isNarrow ? 'normal' : 'nowrap', lineHeight: 1.1,
              overflow: 'hidden',
            }}>
              <ColBiHeader name={col.name} narrow={isNarrow} />
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
