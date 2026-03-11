/**
 * StructureAnalysis - 구조분석 워크시트 컴포넌트
 * ★★★ 콘크리트 구조: 열은 고정, 행은 동적, 불일치 시 에러 표시 ★★★
 */

'use client';

import React, { useMemo, useState } from 'react';
import { L1Product, L2Process, WorksheetLevel, M4_INFO, M4Type } from './types';

// ★★★ 콘크리트 구조: 열 위치 상수 (절대 변경 금지) ★★★
const COLUMN_INDEX = {
  L1: 0,    // 완제품 공정명
  L2: 1,    // 메인 공정명
  M4: 2,    // 4M 분류
  L3: 3,    // 작업 요소명
} as const;

// 위치 검증 에러 타입
interface PositionError {
  type: 'L1' | 'L2' | 'L3';
  id: string;
  message: string;
  expectedRow: number;
  actualRow?: number;
  expectedCol: number;
  actualCol?: number;
}

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
  // ★★★ 위치 검증 에러 상태 ★★★
  const [positionErrors, setPositionErrors] = useState<PositionError[]>([]);

  // 평탄화된 행 데이터 생성 + 위치 검증
  const { flatRows, errors } = useMemo(() => {
    const rows: Array<{
      l1Id: string;
      l1Name: string;
      l2Id: string;
      l2Label: string;
      l3Id: string;
      m4: M4Type;
      l3Name: string;
      calculatedRowIndex: number;  // ★ 계산된 행 위치
    }> = [];
    const validationErrors: PositionError[] = [];
    let currentRowIndex = 0;

    // ★ L1 위치 검증 (colIndex는 항상 0이어야 함)
    if (l1.colIndex !== undefined && l1.colIndex !== COLUMN_INDEX.L1) {
      validationErrors.push({
        type: 'L1',
        id: l1.id,
        message: `L1 열 위치 불일치: 기대=${COLUMN_INDEX.L1}, 실제=${l1.colIndex}`,
        expectedRow: 0,
        actualRow: l1.rowIndex,
        expectedCol: COLUMN_INDEX.L1,
        actualCol: l1.colIndex,
      });
    }

    l2List.forEach((proc) => {
      // ★ L2 위치 검증 (colIndex는 항상 1이어야 함)
      if (proc.colIndex !== undefined && proc.colIndex !== COLUMN_INDEX.L2) {
        validationErrors.push({
          type: 'L2',
          id: proc.id,
          message: `L2 열 위치 불일치: 기대=${COLUMN_INDEX.L2}, 실제=${proc.colIndex}`,
          expectedRow: currentRowIndex,
          actualRow: proc.rowIndex,
          expectedCol: COLUMN_INDEX.L2,
          actualCol: proc.colIndex,
        });
      }

      if (proc.l3.length === 0) {
        rows.push({
          l1Id: l1.id,
          l1Name: l1.name,
          l2Id: proc.id,
          l2Label: `${proc.no} ${proc.name}`,
          l3Id: '',
          m4: 'MN',
          l3Name: '',
          calculatedRowIndex: currentRowIndex,
        });
        currentRowIndex++;
      } else {
        proc.l3.forEach((work) => {
          // ★ L3 위치 검증 (colIndex는 항상 3이어야 함)
          if (work.colIndex !== undefined && work.colIndex !== COLUMN_INDEX.L3) {
            validationErrors.push({
              type: 'L3',
              id: work.id,
              message: `L3 열 위치 불일치: 기대=${COLUMN_INDEX.L3}, 실제=${work.colIndex}`,
              expectedRow: currentRowIndex,
              actualRow: work.rowIndex,
              expectedCol: COLUMN_INDEX.L3,
              actualCol: work.colIndex,
            });
          }

          rows.push({
            l1Id: l1.id,
            l1Name: l1.name,
            l2Id: proc.id,
            l2Label: `${proc.no} ${proc.name}`,
            l3Id: work.id,
            m4: work.m4,
            l3Name: work.name,
            calculatedRowIndex: currentRowIndex,
          });
          currentRowIndex++;
        });
      }
    });

    return { flatRows: rows, errors: validationErrors };
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
      {/* ★★★ 위치 검증 에러 표시 - AI가 수정할 수 있도록 상세 정보 제공 ★★★ */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
            <span>⚠️</span>
            <span>구조 무결성 오류 ({errors.length}건) - 열(Column) 위치 불일치</span>
          </div>
          <div className="text-xs text-red-600 space-y-2">
            {errors.map((err, idx) => (
              <div key={idx} className="p-2 bg-red-100 rounded border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 bg-red-300 rounded text-[10px] font-bold text-red-800">
                    {err.type}
                  </span>
                  <span className="font-semibold">{err.message}</span>
                </div>
                <div className="text-[10px] text-red-500 space-y-0.5 ml-2">
                  <div>• <b>ID:</b> {err.id}</div>
                  <div>• <b>기대 열:</b> {err.expectedCol} | <b>실제 열:</b> {err.actualCol ?? '미정의'}</div>
                  <div>• <b>기대 행:</b> {err.expectedRow} | <b>실제 행:</b> {err.actualRow ?? '미정의'}</div>
                  <div className="mt-1 text-red-700 font-semibold">
                    🔧 수정 방법: DB 테이블 <code className="bg-red-200 px-1 rounded">
                      {err.type === 'L1' ? 'l1_structures' : err.type === 'L2' ? 'l2_structures' : 'l3_structures'}
                    </code>에서 colIndex를 <b>{err.expectedCol}</b>로 변경
                  </div>
                  <div className="text-red-600">
                    📁 파일: <code className="bg-red-200 px-1 rounded">prisma/schema.prisma</code> →
                    API: <code className="bg-red-200 px-1 rounded">api/fmea/route.ts</code>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-300 rounded text-[10px] text-yellow-800">
            <b>💡 해결 가이드:</b><br />
            1. 저장 로직에서 colIndex 값을 올바르게 설정하세요 (L1=0, L2=1, L3=3)<br />
            2. 기존 데이터는 DB에서 직접 업데이트하거나 삭제 후 재생성하세요<br />
            3. 열은 절대 고정값입니다. 동적으로 변경되면 안 됩니다.
          </div>
        </div>
      )}

      {/* 제목 */}
      <div className="text-center font-bold py-3 bg-[#d7ecff] border border-[#6f8fb4] border-b-0 rounded-t-lg">
        P-FMEA 구조 분석 ({stageText}) - Level {level === 'all' ? 'All' : level}
        {errors.length > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[10px] rounded">
            오류 {errors.length}건
          </span>
        )}
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
                    className={`border border-[#6f8fb4] px-3 py-2 text-center align-middle cursor-pointer transition-colors ${selectedId === row.l1Id ? 'bg-[#f2f7ff]' : 'bg-white hover:bg-[#e8f0fe]'
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
                    className={`border border-[#6f8fb4] px-3 py-2 text-center align-middle cursor-pointer transition-colors ${selectedId === row.l2Id ? 'bg-[#f2f7ff]' : 'bg-white hover:bg-[#e8f0fe]'
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
                  className={`border border-[#6f8fb4] px-1 py-1 align-middle ${selectedId === row.l3Id ? 'bg-[#f2f7ff]' : 'bg-[#fffdf2]'
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















