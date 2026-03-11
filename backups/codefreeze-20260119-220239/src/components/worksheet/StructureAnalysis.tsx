/**
 * StructureAnalysis - 구조분석 워크시트 컴포넌트
 */

'use client';

import React, { useMemo } from 'react';
import { L1Product, L2Process, WorksheetLevel, M4_INFO, M4Type } from './types';

interface StructureAnalysisProps {
  l1: L1Product;
  l2List: L2Process[];
  level: WorksheetLevel;
  selectedId: string | null;
  onCellClick: (type: 'L1' | 'L2' | 'L3', id: string) => void;
  onL1Click: () => void;
  onL2Click: (l2Id: string) => void;
  onL3Change: (l2Id: string, l3Id: string, field: string, value: string) => void;
  onM4Change: (l2Id: string, l3Id: string, m4: M4Type) => void;
}

export const StructureAnalysis: React.FC<StructureAnalysisProps> = ({
  l1,
  l2List,
  level,
  selectedId,
  onCellClick,
  onL1Click,
  onL2Click,
  onL3Change,
  onM4Change,
}) => {
  // 평탄화된 행 데이터 생성
  const flatRows = useMemo(() => {
    const rows: Array<{
      l1Id: string;
      l1Name: string;
      l2Id: string;
      l2Label: string;
      l3Id: string;
      m4: M4Type;
      l3Name: string;
    }> = [];

    l2List.forEach((proc) => {
      if (proc.l3.length === 0) {
        // L3가 없는 경우 빈 행 추가
        rows.push({
          l1Id: l1.id,
          l1Name: l1.name,
          l2Id: proc.id,
          l2Label: `${proc.no} ${proc.name}`,
          l3Id: '',
          m4: 'MN',
          l3Name: '',
        });
      } else {
        proc.l3.forEach((work) => {
          rows.push({
            l1Id: l1.id,
            l1Name: l1.name,
            l2Id: proc.id,
            l2Label: `${proc.no} ${proc.name}`,
            l3Id: work.id,
            m4: work.m4,
            l3Name: work.name,
          });
        });
      }
    });

    return rows;
  }, [l1, l2List]);

  // rowSpan 계산
  const computeSpan = (rows: typeof flatRows, keyFn: (r: typeof flatRows[0]) => string) => {
    const spans: number[] = new Array(rows.length).fill(0);
    let i = 0;
    while (i < rows.length) {
      const key = keyFn(rows[i]);
      let j = i + 1;
      while (j < rows.length && keyFn(rows[j]) === key) j++;
      spans[i] = j - i;
      for (let k = i + 1; k < j; k++) spans[k] = -1;
      i = j;
    }
    return spans.map((v) => (v < 0 ? 0 : v));
  };

  const l1Spans = computeSpan(flatRows, (r) => r.l1Id);
  const l2Spans = computeSpan(flatRows, (r) => r.l2Id);

  // 단계 텍스트
  const stageText = level === 'all' ? '전체' : `${level}단계`;

  return (
    <div className="p-4">
      {/* 제목 */}
      <div className="text-center font-bold py-3 bg-[#d7ecff] border border-[#6f8fb4] border-b-0 rounded-t-lg">
        P-FMEA 구조 분석 ({stageText}) - Level {level === 'all' ? 'All' : level}
      </div>

      {/* 테이블 */}
      <div className="border border-[#6f8fb4] rounded-b-lg overflow-hidden">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#bfe0ff]">
              <th className="border border-[#6f8fb4] px-3 py-2 text-center font-bold w-[26%]">
                1. 완제품 공정명
              </th>
              <th className="border border-[#6f8fb4] px-3 py-2 text-center font-bold w-[30%]">
                2. 메인 공정명
              </th>
              <th className="border border-[#6f8fb4] px-3 py-2 text-center font-bold w-[10%]">
                4M
              </th>
              <th className="border border-[#6f8fb4] px-3 py-2 text-center font-bold w-[34%]">
                3. 작업 요소명
              </th>
            </tr>
            <tr className="bg-[#d7ecff]">
              <th className="border border-[#6f8fb4] px-2 py-1 text-center text-[10px] font-semibold">
                완제품명+생산라인/공정
              </th>
              <th className="border border-[#6f8fb4] px-2 py-1 text-center text-[10px] font-semibold">
                공정NO+공정명
              </th>
              <th className="border border-[#6f8fb4] px-2 py-1 text-center text-[10px] font-semibold">
                4M
              </th>
              <th className="border border-[#6f8fb4] px-2 py-1 text-center text-[10px] font-semibold">
                작업요소
              </th>
            </tr>
          </thead>
          <tbody>
            {flatRows.map((row, idx) => (
              <tr key={`${row.l2Id}-${row.l3Id || idx}`} className="hover:bg-blue-50">
                {/* L1 셀 (병합) */}
                {l1Spans[idx] > 0 && (
                  <td
                    rowSpan={l1Spans[idx]}
                    onClick={onL1Click}
                    className={`border border-[#6f8fb4] px-3 py-2 text-center align-middle cursor-pointer transition-colors ${
                      selectedId === row.l1Id ? 'bg-[#f2f7ff]' : 'bg-white hover:bg-[#e8f0fe]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-blue-500">🔍</span>
                      <span className="font-semibold">{row.l1Name || '클릭하여 선택'}</span>
                    </div>
                  </td>
                )}

                {/* L2 셀 (병합) */}
                {l2Spans[idx] > 0 && (
                  <td
                    rowSpan={l2Spans[idx]}
                    onClick={() => onL2Click(row.l2Id)}
                    className={`border border-[#6f8fb4] px-3 py-2 text-center align-middle cursor-pointer transition-colors ${
                      selectedId === row.l2Id ? 'bg-[#f2f7ff]' : 'bg-white hover:bg-[#e8f0fe]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-blue-500">🔍</span>
                      <span className="font-semibold">{row.l2Label || '클릭하여 선택'}</span>
                    </div>
                  </td>
                )}

                {/* 4M 셀 */}
                <td
                  className={`border border-[#6f8fb4] px-1 py-1 text-center align-middle`}
                  style={{
                    backgroundColor: M4_INFO[row.m4]?.bgColor || '#fff',
                  }}
                >
                  <select
                    value={row.m4}
                    onChange={(e) => {
                      const proc = l2List.find((p) => p.id === row.l2Id);
                      if (proc && row.l3Id) {
                        onM4Change(row.l2Id, row.l3Id, e.target.value as M4Type);
                      }
                    }}
                    className="w-full h-7 px-1 text-xs text-center font-bold border-0 bg-transparent focus:outline-none cursor-pointer"
                    style={{ color: M4_INFO[row.m4]?.color || '#333' }}
                  >
                    <option value="MN">MN</option>
                    <option value="MC">MC</option>
                    <option value="IM">IM</option>
                    <option value="EN">EN</option>
                  </select>
                </td>

                {/* L3 셀 (편집 가능) */}
                <td
                  onClick={() => row.l3Id && onCellClick('L3', row.l3Id)}
                  className={`border border-[#6f8fb4] px-1 py-1 align-middle ${
                    selectedId === row.l3Id ? 'bg-[#f2f7ff]' : 'bg-[#fffdf2]'
                  }`}
                >
                  <input
                    type="text"
                    value={row.l3Name}
                    onChange={(e) => {
                      if (row.l3Id) {
                        onL3Change(row.l2Id, row.l3Id, 'name', e.target.value);
                      }
                    }}
                    placeholder="작업요소 입력..."
                    className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none focus:bg-white"
                  />
                </td>
              </tr>
            ))}

            {/* 빈 데이터 안내 */}
            {flatRows.length === 0 && (
              <tr>
                <td colSpan={4} className="border border-[#6f8fb4] px-4 py-10 text-center text-gray-400">
                  데이터가 없습니다. 완제품공정 또는 메인공정 셀을 클릭하여 추가하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>🔍 클릭하여 기초정보 선택</span>
          <span>✏️ 직접 입력 가능</span>
        </div>
        <div className="flex gap-2">
          {Object.entries(M4_INFO).map(([key, info]) => (
            <span
              key={key}
              className="px-2 py-0.5 rounded text-[10px] font-bold"
              style={{ backgroundColor: info.bgColor, color: info.color }}
            >
              {key}: {info.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StructureAnalysis;















