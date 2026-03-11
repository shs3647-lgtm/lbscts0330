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

interface FEItem { id: string; scope: string; feNo: string; text: string; severity?: number; }
interface FMItem { id: string; fmNo: string; processName: string; text: string; }
interface FCItem { id: string; fcNo: string; processName: string; m4: string; workElem: string; text: string; }

interface FailureLinkDiagramProps {
  currentFM: FMItem | undefined;
  linkedFEs: Map<string, FEItem>;
  linkedFCs: Map<string, FCItem>;
  svgPaths: string[];
  chainAreaRef: React.RefObject<HTMLDivElement | null>;
  fmNodeRef: React.RefObject<HTMLDivElement | null>;
  feColRef: React.RefObject<HTMLDivElement | null>;
  fcColRef: React.RefObject<HTMLDivElement | null>;
}

export default function FailureLinkDiagram({
  currentFM,
  linkedFEs,
  linkedFCs,
  svgPaths,
  chainAreaRef,
  fmNodeRef,
  feColRef,
  fcColRef
}: FailureLinkDiagramProps) {
  return (
    <div ref={chainAreaRef} style={diagramAreaStyle}>
      {/* SVG 곡선 + 화살표 */}
      <svg style={svgCanvasStyle}>
        <defs>
          <marker id="arrowhead" markerWidth="5" markerHeight="4" refX="5" refY="2" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L5,2 L0,4" fill="none" stroke="#888" strokeWidth="0.8" />
          </marker>
        </defs>
        {svgPaths.map((d, idx) => (
          <path key={idx} d={d} fill="none" stroke="#888" strokeWidth="1.2" markerEnd="url(#arrowhead)" />
        ))}
      </svg>

      {!currentFM ? (
        <div style={diagramFallbackStyle}>
          <div className="text-[32px] mb-2.5">🔗</div>
          <div>FM(고장형태)를 먼저 선택하세요</div>
        </div>
      ) : (
        <div style={diagramMainStyle}>
          {/* 상단 라벨 */}
          <div style={diagramLabelRowStyle}>
            <div style={diagramLabelStyle}>FE(고장영향)</div>
            <div></div>
            <div style={diagramLabelStyle}>FM(고장형태)</div>
            <div></div>
            <div style={diagramLabelStyle}>FC(고장원인)</div>
          </div>
          
          {/* 카드 영역 */}
          <div style={diagramGridStyle}>
            {/* FE 열 */}
            <div ref={feColRef} style={diagramColumnStyle('flex-start')}>
              {Array.from(linkedFEs.values()).map(fe => (
                <div key={fe.id} className="fe-card" style={diagramCardStyle('120px')}>
                  <div style={cardHeaderStyle()}>
                    {fe.feNo} | S:{fe.severity || '-'}
                  </div>
                  <div style={cardBodyStyle()}>{fe.text}</div>
                </div>
              ))}
              {linkedFEs.size === 0 && <div className="text-gray-400 text-xs text-center">FE 클릭</div>}
            </div>

            {/* 왼쪽 간격 (화살표 영역) */}
            <div className="flex items-center justify-center"></div>

            {/* FM 열 */}
            <div style={diagramColumnStyle('center')}>
              <div ref={fmNodeRef} style={diagramCardStyle('110px')}>
                <div style={cardHeaderStyle({ borderBottom: '1px solid #ffe0b2' })}>{currentFM.fmNo}</div>
                <div style={cardBodyStyle({ fontWeight: 600 })}>{currentFM.text}</div>
              </div>
            </div>

            {/* 오른쪽 간격 (화살표 영역) */}
            <div className="flex items-center justify-center"></div>

            {/* FC 열 */}
            <div ref={fcColRef} style={diagramColumnStyle('flex-end')}>
              {Array.from(linkedFCs.values()).map(fc => (
                <div key={fc.id} className="fc-card" style={diagramCardStyle('110px')}>
                  <div style={cardHeaderStyle()}>{fc.fcNo}</div>
                  <div style={cardBodyStyle()}>{fc.text}</div>
                </div>
              ))}
              {linkedFCs.size === 0 && <div className="text-gray-400 text-xs">FC 클릭</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

