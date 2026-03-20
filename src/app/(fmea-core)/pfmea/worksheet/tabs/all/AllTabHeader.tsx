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
import { useLocale } from '@/lib/locale';
import { blText, getBilingualEntry } from '@/lib/bilingual-labels';
import { MENU_DICT } from '@/lib/locale-dict';
import {
  STEP_LABELS, STEP_DIVIDER, STEP_FIRST_COLUMN_IDS,
  COMPACT_FONT, HEIGHTS, COMPACT_HEIGHTS,
  ColumnDef, StepSpan, GroupSpan,
} from './allTabConstants';

// ★ 3행 헤더 축약 매핑 (KO 축약명 + EN 축약명)
const HEADER_SHORT_MAP: Record<string, { ko: string; en: string }> = {
  'LLD': { ko: 'Filter Code', en: 'LLD' },
  '예방관리개선': { ko: '예방개선', en: 'Prev. Improve' },
  '검출관리개선': { ko: '검출개선', en: 'Det. Improve' },
  '책임자성명': { ko: '책임자', en: 'Person' },
  '목표완료일자': { ko: '목표일', en: 'Target' },
  '개선결과근거': { ko: '개선결과', en: 'Result' },
  '완료일자': { ko: '완료일', en: 'Completion' },
  '완제품 공정명': { ko: '완제품공정명', en: 'Product Process' },
};

// ★ 하위호환용 (외부에서 HEADER_SHORT 참조하는 코드 있을 수 있음)
export const HEADER_SHORT: Record<string, string> = Object.fromEntries(
  Object.entries(HEADER_SHORT_MAP).map(([k, v]) => [k, `${v.ko}(${v.en})`])
);

/** 2-line header helper for ALL tab col names */
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
  // 사전에서 영문 조회
  const entry = getBilingualEntry(name);
  const paren = name.match(/^(.+?)\(([^)]+)\)$/);
  if (paren) {
    // 이미 한글(약어) 형태 → ko=한글, en=약어 or full
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

/** 2-line header helper for group names (row 2) */
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

/** 2-line header helper for step labels (row 1) */
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
  apStats6?: { hCount: number; mCount: number; lCount: number };
  // 버튼 핸들러들
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  autoRecommendS: () => void;
  autoRecommendO?: () => void;
  autoRecommendD?: () => void;
  handleRecommendImprovement: () => void;
  // ★ LLD(필터코드) 통합 추천 — step 파라미터로 5ST/6ST 선택
  handleAutoLldFilter?: (step: '5ST' | '6ST') => void;
  handleClearOptLld?: () => void;
  // ★ PC/DC 수동 전체 매칭 + LLD 5ST 초기화
  handleManualPCDCFill?: () => void;
  isRunningPCDC?: boolean;
  handleClearLld5ST?: () => void;
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
  apStats6,
  saveAtomicDB,
  autoRecommendS,
  autoRecommendO,
  autoRecommendD,
  handleRecommendImprovement,
  handleAutoLldFilter,
  handleClearOptLld,
  handleManualPCDCFill,
  isRunningPCDC,
  handleClearLld5ST,
}: AllTabHeaderProps) {
  const { locale, t } = useLocale();

  /** H/M/L 배지 클릭 → 현재 화면 아래의 다음 항목으로 스크롤 (마지막이면 처음으로) */
  const scrollToAP = (level: 'H' | 'M' | 'L', step: '5st' | '6st') => {
    const cells = Array.from(document.querySelectorAll<HTMLElement>(
      `td[data-ap-level="${level}"][data-ap-step="${step}"]`
    ));
    if (cells.length === 0) return;

    // 현재 뷰포트 중앙 Y 기준으로 다음 셀 찾기
    const viewCenterY = window.innerHeight / 2;
    const next = cells.find(c => {
      const rect = c.getBoundingClientRect();
      return rect.top > viewCenterY + 10; // 현재 보이는 영역 아래
    });
    const target = next || cells[0]; // 없으면 처음으로 순환

    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    // 시각적 하이라이트 (1.5초 후 제거)
    target.style.outline = '3px solid #ffeb3b';
    target.style.outlineOffset = '-1px';
    setTimeout(() => { target.style.outline = ''; target.style.outlineOffset = ''; }, 1500);
  };
  return (
    <thead className="sticky top-0 z-20 bg-white" style={{ boxShadow: '0 2px 0 0 #2196f3' }}>
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
                {handleManualPCDCFill && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleManualPCDCFill(); }}
                    disabled={isRunningPCDC}
                    style={{
                      background: isRunningPCDC ? '#9ca3af' : '#0d9488',
                      color: '#fff', border: '1px solid #5eead4',
                      padding: '1px 5px', borderRadius: '3px',
                      fontSize: '9px', fontWeight: 700,
                      cursor: isRunningPCDC ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap', lineHeight: '14px',
                    }}
                    title="Import B5(예방관리)/A6(검출관리) 데이터로 빈 PC/DC 셀 전체 매칭"
                  >
                    {isRunningPCDC ? '매칭중...' : 'PC/DC매칭'}
                  </button>
                )}
                {handleAutoLldFilter && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAutoLldFilter('5ST'); }}
                    style={{
                      background: '#7c3aed',
                      color: '#fff', border: '1px solid #a78bfa',
                      padding: '1px 5px', borderRadius: '3px',
                      fontSize: '9px', fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap', lineHeight: '14px',
                    }}
                    title="LLD(필터코드) → 5단계 리스크분석 PC/DC에 적용"
                  >
                    LLD추천(LLD Rec.)
                  </button>
                )}
                {handleClearLld5ST && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClearLld5ST(); }}
                    style={{
                      background: '#dc2626', color: '#fff', border: '1px solid #f87171',
                      padding: '1px 5px', borderRadius: '3px',
                      fontSize: '9px', fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap', lineHeight: '14px',
                    }}
                    title="5ST 리스크분석에 적용된 LLD 데이터 전체 삭제"
                  >
                    LLD삭제(Clear)
                  </button>
                )}
                <span style={{ fontSize: '10px' }}><StepBiHeader ko="5ST 리스크분석" en="Risk Analysis" /></span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 600 }}>
                  <span onClick={() => scrollToAP('H', '5st')} style={{ background: '#ef5350', color: '#fff', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px', cursor: apStats.hCount > 0 ? 'pointer' : 'default' }} title="H 항목으로 이동">H:{apStats.hCount}</span>
                  <span onClick={() => scrollToAP('M', '5st')} style={{ background: '#ffc107', color: '#000', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px', cursor: apStats.mCount > 0 ? 'pointer' : 'default' }} title="M 항목으로 이동">M:{apStats.mCount}</span>
                  <span onClick={() => scrollToAP('L', '5st')} style={{ background: '#4caf50', color: '#fff', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px', cursor: apStats.lCount > 0 ? 'pointer' : 'default' }} title="L 항목으로 이동">L:{apStats.lCount}</span>
                </span>
                {failureStats.missingOCount > 0 && autoRecommendO && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 600 }}>
                    <span style={{ background: '#ff9800', color: '#fff', padding: '1px 3px', borderRadius: '3px', border: '1px solid #ffeb3b', lineHeight: '13px' }} title={`발생도 미평가: ${failureStats.missingOCount}건`}>
                      O누락:{failureStats.missingOCount}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); autoRecommendO(); }}
                      style={{ background: '#e65100', color: '#fff', border: '1px solid #ff9800', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', lineHeight: '13px' }}
                      title="발생도(O) 자동추천 — PC 텍스트 AIAG-VDA 키워드 기반"
                    >O추천</button>
                  </span>
                )}
                {failureStats.missingDCount > 0 && autoRecommendD && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 600 }}>
                    <span style={{ background: '#ff9800', color: '#fff', padding: '1px 3px', borderRadius: '3px', border: '1px solid #ffeb3b', lineHeight: '13px' }} title={`검출도 미평가: ${failureStats.missingDCount}건`}>
                      D누락:{failureStats.missingDCount}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); autoRecommendD(); }}
                      style={{ background: '#1565c0', color: '#fff', border: '1px solid #42a5f5', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', lineHeight: '13px' }}
                      title="검출도(D) 자동추천 — DC 텍스트 AIAG-VDA 키워드 기반"
                    >D추천</button>
                  </span>
                )}
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
                    }} title={failureStats.mismatch[t] ? `\u26A0\uFE0F 불일치: 고장연결=${failureStats.linked[t]}, 고장분석=${failureStats.state[t]}` : ''}>
                      {t.toUpperCase()}:{failureStats.linked[t]}
                    </span>
                  ))}
                  {failureStats.hasMismatch && (
                    <span style={{ color: '#ffeb3b', fontWeight: 700, fontSize: '10px' }} title="고장연결과 고장분석 데이터 불일치">{'\u26A0\uFE0F'}</span>
                  )}
                </span>
                {failureStats.missingSevCount > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 600 }}>
                    <span style={{ background: '#ff9800', color: '#fff', padding: '1px 3px', borderRadius: '3px', border: '1px solid #ffeb3b', lineHeight: '13px' }} title={`심각도 미평가 FM: ${failureStats.missingSevCount}건`}>
                      S누락(S Missing):{failureStats.missingSevCount}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); autoRecommendS(); }}
                      style={{
                        background: '#e65100', color: '#fff', border: '1px solid #ff9800',
                        padding: '1px 4px', borderRadius: '3px',
                        fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                        whiteSpace: 'nowrap', lineHeight: '13px',
                      }}
                      title="심각도(S) 자동추천 — FE 텍스트와 SOD 평가기준 유사도 기반 예비평가"
                    >
                      S추천(S Recommend)
                    </button>
                  </span>
                )}
              </div>
            ) : span.step === '최적화' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleRecommendImprovement}
                  style={{
                    background: '#e65100', color: '#fff', border: '1px solid #ff9800',
                    padding: '1px 5px', borderRadius: '3px',
                    fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap', lineHeight: '14px',
                  }}
                  title="PC/DC 매칭 + 산업DB 기반 개선추천 통합 (예방관리개선/검출관리개선에 적용)"
                >
                  개선추천(Improve Rec.)
                </button>
                {handleAutoLldFilter && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAutoLldFilter('6ST'); }}
                    style={{
                      background: '#7c3aed',
                      color: '#fff', border: '1px solid #a78bfa',
                      padding: '1px 5px', borderRadius: '3px',
                      fontSize: '9px', fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap', lineHeight: '14px',
                    }}
                    title="LLD(필터코드) → 6단계 최적화 PC/DC 개선에 적용"
                  >
                    LLD추천(LLD Rec.)
                  </button>
                )}
                {handleClearOptLld && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClearOptLld(); }}
                    style={{
                      background: '#dc2626', color: '#fff', border: '1px solid #f87171',
                      padding: '1px 5px', borderRadius: '3px',
                      fontSize: '9px', fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap', lineHeight: '14px',
                    }}
                    title="6ST 최적화에 적용된 LLD 데이터 전체 삭제"
                  >
                    LLD삭제(Clear)
                  </button>
                )}
                <span style={{ fontSize: '10px' }}><StepBiHeader ko="6ST 최적화" en="Optimization" /></span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: 600 }}>
                  <span onClick={() => scrollToAP('H', '6st')} style={{ background: '#ef5350', color: '#fff', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px', cursor: (apStats6 || apStats).hCount > 0 ? 'pointer' : 'default' }} title="H 항목으로 이동">H:{(apStats6 || apStats).hCount}</span>
                  <span onClick={() => scrollToAP('M', '6st')} style={{ background: '#ffc107', color: '#000', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px', cursor: (apStats6 || apStats).mCount > 0 ? 'pointer' : 'default' }} title="M 항목으로 이동">M:{(apStats6 || apStats).mCount}</span>
                  <span onClick={() => scrollToAP('L', '6st')} style={{ background: '#4caf50', color: '#fff', padding: '1px 3px', borderRadius: '3px', lineHeight: '13px', cursor: (apStats6 || apStats).lCount > 0 ? 'pointer' : 'default' }} title="L 항목으로 이동">L:{(apStats6 || apStats).lCount}</span>
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
