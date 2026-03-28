/**
 * @file FailureSeverityMappingTab.tsx
 * @description AIAG-VDA 심각도 매핑 전용 탭 — 엑셀 Import/Export (프로젝트별 localStorage)
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { FailureTabProps } from './types';
import {
  AIAG_VDA_SEVERITY_TEMPLATE_HEADERS,
  AIAG_VDA_YIELD_RECOMMENDATION_ROWS,
  loadAiagVdaSeverityMapping,
  saveAiagVdaSeverityMapping,
  rowsFromExcelSheet,
  mapYieldRecommendationsToRows,
  severityBackground,
  severityTextColor,
  type AiagVdaSeverityMappingRow,
} from '@/lib/fmea/aiag-vda-severity-mapping';
import { uid } from '../../constants';

export default function FailureSeverityMappingTab({ fmeaId }: FailureTabProps) {
  const fid = fmeaId || 'default';
  const [rows, setRows] = useState<AiagVdaSeverityMappingRow[]>([]);

  useEffect(() => {
    setRows(loadAiagVdaSeverityMapping(fid));
  }, [fid]);

  const persist = useCallback(
    (next: AiagVdaSeverityMappingRow[]) => {
      setRows(next);
      saveAiagVdaSeverityMapping(fid, next);
    },
    [fid],
  );

  const handleExport = useCallback(async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('AIAG_VDA_Severity_Mapping');
    sheet.addRow([...AIAG_VDA_SEVERITY_TEMPLATE_HEADERS]);
    rows.forEach((r) => {
      sheet.addRow([
        r.scope,
        r.productFunction,
        r.requirement,
        r.failureEffect,
        r.severity,
        r.basis,
      ]);
    });
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1565C0' },
    };
    sheet.columns = [
      { width: 12 },
      { width: 28 },
      { width: 28 },
      { width: 32 },
      { width: 10 },
      { width: 40 },
    ];
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AIAG_VDA_Severity_Mapping_${fid}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [fid, rows]);

  const handleDownloadTemplate = useCallback(async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('AIAG_VDA_Severity_Mapping');
    sheet.addRow([...AIAG_VDA_SEVERITY_TEMPLATE_HEADERS]);
    sheet.addRow(['USER', '예: 최종 사용자 신뢰성 기준 충족', 'Electrical Reliability Spec', '제품 손실', 8, '고객 사용 불가, 제품 전수 폐기']);
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1565C0' },
    };
    sheet.columns = [
      { width: 12 },
      { width: 28 },
      { width: 28 },
      { width: 32 },
      { width: 10 },
      { width: 40 },
    ];
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AIAG_VDA_Severity_Mapping_TEMPLATE.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleAppendYield = useCallback(() => {
    const add = mapYieldRecommendationsToRows(() => uid());
    if (add.length === 0) return;
    if (
      !confirm(
        `YIELD 관련 S=6·7 추천 ${add.length}건을 현재 목록 뒤에 추가합니다.\n(중복 FE 문구가 있을 수 있으니 필요 시 정리하세요.)`,
      )
    ) {
      return;
    }
    persist([...rows, ...add]);
    alert(`${add.length}건을 추가했습니다.`);
  }, [persist, rows]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const sheet = wb.worksheets[0];
        if (!sheet) {
          alert('시트를 찾을 수 없습니다.');
          return;
        }
        const imported = rowsFromExcelSheet(sheet, () => uid());
        if (imported.length === 0) {
          alert(
            '가져올 데이터가 없습니다.\n1행: Scope, 제품기능(C2), 요구사항(C3), 고장영향(FE/C4), 심각도(S), AIAG-VDA 근거\n필수 열: Scope, 고장영향, 심각도',
          );
          return;
        }
        if (!confirm(`기존 ${rows.length}건을 덮어쓰고 ${imported.length}건을 불러옵니다. 계속할까요?`)) {
          return;
        }
        persist(imported);
        alert(`${imported.length}건을 불러왔습니다.`);
      } catch (err) {
        console.error('[FailureSeverityMappingTab] import', err);
        alert(`엑셀 읽기 실패: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    input.click();
  }, [persist, rows.length]);

  const handleClear = useCallback(() => {
    if (!confirm('이 FMEA에 저장된 AIAG-VDA 심각도 매핑을 모두 삭제할까요?')) return;
    persist([]);
  }, [persist]);

  return (
    <div className="p-2 h-full overflow-auto" style={{ paddingBottom: 48 }}>
      <div className="flex flex-wrap items-center gap-2 mb-2 border-b border-gray-200 pb-2">
        <h2 className="text-sm font-bold text-gray-800 mr-2">
          AIAG-VDA 심각도 매핑 <span className="text-[10px] font-normal text-gray-500">(프로젝트: {fid})</span>
        </h2>
        <button
          type="button"
          className="px-2 py-1 text-[10px] font-bold rounded bg-green-600 text-white hover:bg-green-700"
          onClick={handleImport}
        >
          엑셀 Import
        </button>
        <button
          type="button"
          className="px-2 py-1 text-[10px] font-bold rounded bg-amber-600 text-white hover:bg-amber-700"
          onClick={handleExport}
        >
          엑셀 Export
        </button>
        <button
          type="button"
          className="px-2 py-1 text-[10px] font-bold rounded bg-slate-600 text-white hover:bg-slate-700"
          onClick={handleDownloadTemplate}
        >
          템플릿 받기
        </button>
        <button
          type="button"
          className="px-2 py-1 text-[10px] font-bold rounded bg-violet-600 text-white hover:bg-violet-700"
          onClick={handleAppendYield}
          title="SP/YP YIELD 고장영향 S=6·7 추천 행 일괄 추가"
        >
          YIELD 6·7 추천 추가 ({AIAG_VDA_YIELD_RECOMMENDATION_ROWS.length}건)
        </button>
        <button
          type="button"
          className="px-2 py-1 text-[10px] font-bold rounded bg-red-100 text-red-800 border border-red-300 hover:bg-red-200"
          onClick={handleClear}
        >
          전체 삭제
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-[#1565c0] text-white">
              {AIAG_VDA_SEVERITY_TEMPLATE_HEADERS.map((h) => (
                <th key={h} className="border border-gray-400 p-1 text-left font-bold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-gray-200 p-4 text-center text-gray-500">
                  데이터 없음 — 템플릿 받기 후 작성하거나 엑셀 Import 하세요.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="border border-gray-200 p-1 align-top">{r.scope}</td>
                  <td className="border border-gray-200 p-1 align-top">{r.productFunction}</td>
                  <td className="border border-gray-200 p-1 align-top">{r.requirement}</td>
                  <td className="border border-gray-200 p-1 align-top">{r.failureEffect}</td>
                  <td
                    className="border border-gray-200 p-1 text-center font-bold align-top"
                    style={{
                      background: severityBackground(r.severity),
                      color: severityTextColor(r.severity),
                    }}
                  >
                    {r.severity}
                  </td>
                  <td className="border border-gray-200 p-1 align-top text-gray-800">{r.basis}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[9px] text-gray-500">
        {rows.length}건 | AIAG-VDA Severity Mapping
      </p>
    </div>
  );
}
