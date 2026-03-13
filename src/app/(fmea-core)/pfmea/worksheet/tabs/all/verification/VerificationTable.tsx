/**
 * @file VerificationTable.tsx
 * @description 역전개 검증 테이블 3종 (FE/FM/FC)
 * - SA탭과 동일한 계층구조 (rowSpan 기반 셀 병합)
 * - 레벨별 색상: L1=파란, L2=녹색, L3=주황
 * - 헤더에 적합/누락/중복 통계 배지, 중복 셀 노란배경
 * - ★ 행 더블클릭 → 해당 분석 탭의 정확한 항목으로 이동
 */

'use client';

import React from 'react';
import { LEVEL_COLORS, PLACEHOLDER_DASH, PLACEHOLDER_UNCLASSIFIED } from '../allTabConstants';
import type { VerificationMode, FlatFERow, FlatFMRow, FlatFCRow, SpannedRow, VerificationStats } from './types';

// ============ 공용 스타일 (10px 소형 최적화) ============

const BORDER = '1px solid #ccc';
const DUPLICATE_BG = '#fffde7';
const MISSING_BG = '#fff0f0';

const HEADER_STYLE = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: BORDER,
  padding: '2px 4px', fontSize: '10px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap',
});
const CELL = (bg: string): React.CSSProperties => ({
  background: bg, border: BORDER,
  padding: '2px 4px', fontSize: '10px', verticalAlign: 'middle',
  wordBreak: 'break-word' as const, lineHeight: '1.3',
});
const CENTER_CELL = (bg: string): React.CSSProperties => ({
  ...CELL(bg), textAlign: 'center',
});

const isMissing = (val: string) => !val || val === PLACEHOLDER_DASH || val === PLACEHOLDER_UNCLASSIFIED;

/** 셀 배경: 누락 > 중복 > 기본 */
function bg(text: string, baseBg: string, dupTexts: Set<string>): string {
  if (isMissing(text)) return MISSING_BG;
  if (dupTexts.has(text)) return DUPLICATE_BG;
  return baseBg;
}

/** 통계 배지 */
function StatsBadges({ stats }: { stats: VerificationStats }) {
  return (
    <span style={{ display: 'inline-flex', gap: '3px', marginLeft: '6px' }}>
      {stats.ok > 0 && (
        <span style={{ background: '#4caf50', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 700 }}>
          적합{stats.ok}
        </span>
      )}
      {stats.missing > 0 && (
        <span style={{ background: '#ef5350', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 700 }}>
          누락{stats.missing}
        </span>
      )}
      {stats.duplicate > 0 && (
        <span style={{ background: '#ffc107', color: '#000', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 700 }}>
          중복{stats.duplicate}
        </span>
      )}
    </span>
  );
}

// ============ FE 검증 테이블 (1L 고장영향) ============

function FETable({ rows, stats, onRowDblClick }: { rows: SpannedRow<FlatFERow>[]; stats: VerificationStats; onRowDblClick?: (id: string) => void }) {
  const L1 = LEVEL_COLORS.L1;
  if (rows.length === 0) return <EmptyMessage text="연결된 고장영향이 없습니다." />;
  const dup = stats.duplicateTexts;

  return (
    <>
      <thead className="sticky top-0 z-10">
        <tr>
          <th colSpan={5} style={{ ...HEADER_STYLE(L1.header), fontSize: '11px' }}>
            1L 고장영향 검증 — {rows.length}건 <StatsBadges stats={stats} />
          </th>
        </tr>
        <tr>
          <th style={{ ...HEADER_STYLE(L1.headerLight), width: '7%' }}>구분</th>
          <th style={{ ...HEADER_STYLE(L1.headerLight), width: '20%' }}>완제품기능</th>
          <th style={{ ...HEADER_STYLE(L1.headerLight), width: '20%' }}>요구사항</th>
          <th style={{ ...HEADER_STYLE(L1.headerLight), width: '49%' }}>고장영향</th>
          <th style={{ ...HEADER_STYLE(L1.headerLight), width: '4%' }}>S</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((sr, idx) => {
          const d = sr.data;
          const baseBg = idx % 2 === 0 ? L1.cell : L1.cellAlt;
          return (
            <tr key={d.feId || idx} onDoubleClick={() => d.feId && onRowDblClick?.(d.feId)} style={{ cursor: 'pointer' }} title="더블클릭: 해당 항목으로 이동">
              {sr.spans.feCategory > 0 && (
                <td rowSpan={sr.spans.feCategory} style={CENTER_CELL(isMissing(d.feCategory) ? MISSING_BG : baseBg)}>
                  <span style={{ fontWeight: 700 }}>{d.feCategory}</span>
                </td>
              )}
              {sr.spans.feFunctionName > 0 && (
                <td rowSpan={sr.spans.feFunctionName} style={CELL(isMissing(d.feFunctionName) ? MISSING_BG : baseBg)}>
                  {d.feFunctionName}
                </td>
              )}
              {sr.spans.feRequirement > 0 && (
                <td rowSpan={sr.spans.feRequirement} style={CELL(isMissing(d.feRequirement) ? MISSING_BG : baseBg)}>
                  {d.feRequirement}
                </td>
              )}
              <td style={CELL(bg(d.feText, baseBg, dup))}>{d.feText}</td>
              <td style={{
                ...CENTER_CELL(baseBg),
                fontWeight: 700,
                color: d.feSeverity >= 9 ? '#d32f2f' : d.feSeverity >= 7 ? '#e65100' : undefined,
              }}>
                {d.feSeverity > 0 ? d.feSeverity : PLACEHOLDER_DASH}
              </td>
            </tr>
          );
        })}
      </tbody>
    </>
  );
}

// ============ FM 검증 테이블 (2L 고장형태) ============

function FMTable({ rows, stats, onRowDblClick }: { rows: SpannedRow<FlatFMRow>[]; stats: VerificationStats; onRowDblClick?: (id: string) => void }) {
  const L2 = LEVEL_COLORS.L2;
  if (rows.length === 0) return <EmptyMessage text="연결된 고장형태가 없습니다." />;
  const dup = stats.duplicateTexts;

  return (
    <>
      <thead className="sticky top-0 z-10">
        <tr>
          <th colSpan={4} style={{ ...HEADER_STYLE(L2.header), fontSize: '11px' }}>
            2L 고장형태 검증 — {rows.length}건 <StatsBadges stats={stats} />
          </th>
        </tr>
        <tr>
          <th style={{ ...HEADER_STYLE(L2.headerLight), width: '10%' }}>NO+공정명</th>
          <th style={{ ...HEADER_STYLE(L2.headerLight), width: '25%' }}>공정기능</th>
          <th style={{ ...HEADER_STYLE(L2.headerLight), width: '20%' }}>제품특성</th>
          <th style={{ ...HEADER_STYLE(L2.headerLight), width: '45%' }}>고장형태</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((sr, idx) => {
          const d = sr.data;
          const baseBg = idx % 2 === 0 ? L2.cell : L2.cellAlt;
          const processLabel = d.processNo !== PLACEHOLDER_DASH ? `${d.processNo} ${d.processName}` : d.processName;
          return (
            <tr key={d.fmId || idx} onDoubleClick={() => d.fmId && onRowDblClick?.(d.fmId)} style={{ cursor: 'pointer' }} title="더블클릭: 해당 항목으로 이동">
              {sr.spans.process > 0 && (
                <td rowSpan={sr.spans.process} style={CELL(isMissing(d.processNo) ? MISSING_BG : baseBg)}>
                  <span style={{ fontWeight: 700 }}>{processLabel}</span>
                </td>
              )}
              {sr.spans.processFunction > 0 && (
                <td rowSpan={sr.spans.processFunction} style={CELL(isMissing(d.processFunction) ? MISSING_BG : baseBg)}>
                  {d.processFunction}
                </td>
              )}
              {sr.spans.productChar > 0 && (
                <td rowSpan={sr.spans.productChar} style={CELL(isMissing(d.productChar) ? MISSING_BG : baseBg)}>
                  {d.productChar}
                </td>
              )}
              <td style={CELL(bg(d.fmText, baseBg, dup))}>{d.fmText}</td>
            </tr>
          );
        })}
      </tbody>
    </>
  );
}

// ============ FC 검증 테이블 (3L 고장원인) ============

function FCTable({ rows, stats, onRowDblClick }: { rows: SpannedRow<FlatFCRow>[]; stats: VerificationStats; onRowDblClick?: (id: string) => void }) {
  const L3 = LEVEL_COLORS.L3;
  if (rows.length === 0) return <EmptyMessage text="연결된 고장원인이 없습니다." />;
  const dup = stats.duplicateTexts;

  return (
    <>
      <thead className="sticky top-0 z-10">
        <tr>
          <th colSpan={6} style={{ ...HEADER_STYLE(L3.header), fontSize: '11px' }}>
            3L 고장원인 검증 — {rows.length}건 <StatsBadges stats={stats} />
          </th>
        </tr>
        <tr>
          <th style={{ ...HEADER_STYLE(L3.headerLight), width: '7%' }}>NO+공정명</th>
          <th style={{ ...HEADER_STYLE(L3.headerLight), width: '3%' }}>4M</th>
          <th style={{ ...HEADER_STYLE(L3.headerLight), width: '10%' }}>작업요소</th>
          <th style={{ ...HEADER_STYLE(L3.headerLight), width: '18%' }}>작업요소기능</th>
          <th style={{ ...HEADER_STYLE(L3.headerLight), width: '14%' }}>공정특성</th>
          <th style={{ ...HEADER_STYLE(L3.headerLight), width: '48%' }}>고장원인</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((sr, idx) => {
          const d = sr.data;
          const baseBg = idx % 2 === 0 ? L3.cell : L3.cellAlt;
          const processLabel = d.processNo !== PLACEHOLDER_DASH ? `${d.processNo} ${d.processName}` : d.processName;
          return (
            <tr key={d.fcId || idx} onDoubleClick={() => d.fcId && onRowDblClick?.(d.fcId)} style={{ cursor: 'pointer' }} title="더블클릭: 해당 항목으로 이동">
              {sr.spans.process > 0 && (
                <td rowSpan={sr.spans.process} style={CELL(isMissing(d.processNo) ? MISSING_BG : baseBg)}>
                  <span style={{ fontWeight: 700 }}>{processLabel}</span>
                </td>
              )}
              {sr.spans.workElem > 0 && (
                <td rowSpan={sr.spans.workElem} style={CENTER_CELL(isMissing(d.fcM4) ? MISSING_BG : baseBg)}>
                  <span style={{ fontWeight: 700 }}>{d.fcM4}</span>
                </td>
              )}
              {sr.spans.workElem > 0 && (
                <td rowSpan={sr.spans.workElem} style={CELL(isMissing(d.fcWorkElem) ? MISSING_BG : baseBg)}>
                  {d.fcWorkElem}
                </td>
              )}
              {sr.spans.workFunction > 0 && (
                <td rowSpan={sr.spans.workFunction} style={CELL(isMissing(d.fcWorkFunction) ? MISSING_BG : baseBg)}>
                  {d.fcWorkFunction}
                </td>
              )}
              {sr.spans.processChar > 0 && (
                <td rowSpan={sr.spans.processChar} style={CELL(isMissing(d.fcProcessChar) ? MISSING_BG : baseBg)}>
                  {d.fcProcessChar}
                </td>
              )}
              <td style={CELL(bg(d.fcText, baseBg, dup))}>{d.fcText}</td>
            </tr>
          );
        })}
      </tbody>
    </>
  );
}

// ============ 빈 상태 안내 ============

function EmptyMessage({ text }: { text: string }) {
  return (
    <tbody>
      <tr>
        <td colSpan={10} className="text-center py-12 text-gray-400 text-[10px]">
          {text}
        </td>
      </tr>
    </tbody>
  );
}

// ============ 메인 컴포넌트 ============

interface VerificationTableProps {
  mode: VerificationMode;
  feSpanned: SpannedRow<FlatFERow>[];
  fmSpanned: SpannedRow<FlatFMRow>[];
  fcSpanned: SpannedRow<FlatFCRow>[];
  rightStats: VerificationStats;
  onDoubleClick?: (level: 'FE' | 'FM' | 'FC', itemId: string) => void;
}

export default function VerificationTable({ mode, feSpanned, fmSpanned, fcSpanned, rightStats, onDoubleClick }: VerificationTableProps) {
  if (!mode) return null;

  const handleRowDblClick = (itemId: string) => {
    if (mode && onDoubleClick) onDoubleClick(mode, itemId);
  };

  return (
    <div style={{ minWidth: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        {mode === 'FE' && <FETable rows={feSpanned} stats={rightStats} onRowDblClick={handleRowDblClick} />}
        {mode === 'FM' && <FMTable rows={fmSpanned} stats={rightStats} onRowDblClick={handleRowDblClick} />}
        {mode === 'FC' && <FCTable rows={fcSpanned} stats={rightStats} onRowDblClick={handleRowDblClick} />}
      </table>
    </div>
  );
}
