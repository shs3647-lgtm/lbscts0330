/**
 * @file FailureLinkDiagram.tsx
 * @description 고장연결 다이어그램 화면 (FM 중심 SVG 연결선)
 */

'use client';

import React from 'react';
import { FONT_SIZES } from '../../constants';
import {
  diagramAreaStyle,
  svgCanvasStyle,
  diagramFallbackStyle,
  diagramMainStyle,
  diagramLabelRowStyle,
  diagramLabelStyle,
  diagramGridStyle,
  diagramColumnStyle,
  diagramCardStyle,
  cardHeaderStyle,
  cardBodyStyle
} from './FailureLinkStyles';
import { FEItem, FMItem, FCItem } from './FailureLinkTypes';

interface FailureLinkDiagramProps {
  currentFM: FMItem | undefined;
  linkedFEs: Map<string, FEItem>;
  linkedFCs: Map<string, FCItem>;
  svgPaths: string[];
  chainAreaRef: React.RefObject<HTMLDivElement | null>;
  fmNodeRef: React.RefObject<HTMLDivElement | null>;
  feColRef: React.RefObject<HTMLDivElement | null>;
  fcColRef: React.RefObject<HTMLDivElement | null>;
  onPrevFM?: () => void;
  onNextFM?: () => void;
  hasPrevFM?: boolean;
  hasNextFM?: boolean;
}

export default function FailureLinkDiagram({
  currentFM,
  linkedFEs,
  linkedFCs,
  svgPaths,
  chainAreaRef,
  fmNodeRef,
  feColRef,
  fcColRef,
  onPrevFM,
  onNextFM,
  hasPrevFM = false,
  hasNextFM = false
}: FailureLinkDiagramProps) {
  return (
    <div ref={chainAreaRef} style={diagramAreaStyle}>
      {/* SVG 곡선 + 화살표 */}
      <svg style={svgCanvasStyle}>
        <defs>
          <marker id="arrowhead" markerWidth="4" markerHeight="3" refX="4" refY="1.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L4,1.5 L0,3 Z" fill="#555" stroke="none" />
          </marker>
        </defs>
        {svgPaths.map((d, idx) => (
          <path key={idx} d={d} fill="none" stroke="#555" strokeWidth="2" markerEnd="url(#arrowhead)" />
        ))}
      </svg>

      {!currentFM ? (
        <div style={diagramFallbackStyle}>
          <div className="text-[32px] mb-2.5">🔗</div>
          <div>FM(고장형태)를 먼저 선택하세요</div>
        </div>
      ) : (
        <div style={diagramMainStyle}>
          {/* 카드 영역 */}
          <div style={diagramGridStyle}>
            {/* FE 열 - 남색 */}
            <div ref={feColRef} style={diagramColumnStyle('flex-start')}>
              {Array.from(linkedFEs.values()).map(fe => (
                <div key={fe.id} className="fe-card" style={diagramCardStyle('90px', 'FE')}>
                  <div style={cardHeaderStyle('FE')}>
                    {fe.feNo} | S:{fe.severity || '-'}
                  </div>
                  <div style={cardBodyStyle()}>{fe.text}</div>
                </div>
              ))}
              {linkedFEs.size === 0 && (
                <div className="text-center p-2">
                  <div className="text-blue-600 text-xs font-semibold">← 좌측</div>
                  <div className="text-blue-600 text-xs font-semibold">FE 선택하여,</div>
                  <div className="text-blue-600 text-xs font-semibold">연결 필요</div>
                </div>
              )}
            </div>

            {/* 왼쪽 간격 (화살표 영역) */}
            <div className="flex items-center justify-center"></div>

            {/* FM 열 - 주황색 + 이동 화살표 */}
            <div style={{ ...diagramColumnStyle('center'), flexDirection: 'column', gap: '4px' }}>
              {/* 위로 이동 화살표 */}
              <button
                onClick={onPrevFM}
                disabled={!hasPrevFM}
                style={{
                  width: '100%',
                  padding: '2px 4px',
                  backgroundColor: hasPrevFM ? '#f57c00' : '#e0e0e0',
                  color: hasPrevFM ? '#fff' : '#999',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: hasPrevFM ? 'pointer' : 'not-allowed',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px'
                }}
              >
                ▲ Prev
              </button>

              {/* FM 카드 — 가로 120px, 높이 auto (전체 텍스트 표시) */}
              <div ref={fmNodeRef} style={diagramCardStyle('120px', 'FM')}>
                <div style={cardHeaderStyle('FM')}>{currentFM.fmNo}</div>
                <div style={cardBodyStyle({ fontWeight: 600 })}>{currentFM.text}</div>
              </div>

              {/* 아래로 이동 화살표 */}
              <button
                onClick={onNextFM}
                disabled={!hasNextFM}
                style={{
                  width: '100%',
                  padding: '2px 4px',
                  backgroundColor: hasNextFM ? '#f57c00' : '#e0e0e0',
                  color: hasNextFM ? '#fff' : '#999',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: hasNextFM ? 'pointer' : 'not-allowed',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px'
                }}
              >
                ▼ Next
              </button>
            </div>

            {/* 오른쪽 간격 (화살표 영역) */}
            <div className="flex items-center justify-center"></div>

            {/* FC 열 - 녹색 */}
            <div ref={fcColRef} style={diagramColumnStyle('flex-end')}>
              {Array.from(linkedFCs.values()).map(fc => (
                <div key={fc.id} className="fc-card" style={diagramCardStyle('90px', 'FC')}>
                  <div style={cardHeaderStyle('FC')}>{fc.fcNo} {fc.processName}</div>
                  <div style={cardBodyStyle()}>{fc.text}</div>
                </div>
              ))}
              {linkedFCs.size === 0 && (
                <div className="text-center p-2">
                  <div className="text-green-700 text-xs font-semibold">좌측</div>
                  <div className="text-green-700 text-xs font-semibold">FC 선택하여,</div>
                  <div className="text-green-700 text-xs font-semibold">연결 필요 →</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

