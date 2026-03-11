/**
 * @file components/ImportMenuBar.tsx
 * @description Import 메뉴바 — CP 선택 + 기초정보 Import + 워크시트 Import (3행)
 * @updated 2026-03-05 — 기초정보 5시트 Import 행 복원 + 샘플 다운로드
 */

import React, { RefObject } from 'react';
import { CheckCircle, Download } from 'lucide-react';
import { CPProject } from '../types';
import { tw } from '../constants';

export interface ImportMenuBarProps {
  // CP 선택
  selectedCpId: string;
  cpList: CPProject[];
  onCpChange: (cpId: string) => void;

  // ★ 기초정보 Import (5시트 Excel)
  downloadFullTemplate?: () => void;
  downloadFullSampleTemplate?: () => void;
  fullFileInputRef?: RefObject<HTMLInputElement | null>;
  fullFileName?: string;
  onFullFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFullImport?: () => void;
  fullPendingCount?: number;
  isFullParsing?: boolean;
  isFullImporting?: boolean;
  fullImportSuccess?: boolean;
  fullDataCount?: number;

  // ★ 워크시트 Import (19컬럼 단일시트)
  downloadWorksheetTemplate?: () => void;
  downloadWorksheetSampleTemplate?: () => void;
  worksheetFileInputRef?: RefObject<HTMLInputElement | null>;
  worksheetFileName?: string;
  onWorksheetFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onWorksheetImport?: () => void;
  worksheetPendingCount?: number;
  isWorksheetParsing?: boolean;
  isWorksheetImporting?: boolean;
  worksheetImportSuccess?: boolean;

  // 호환용 props
  groupCounts?: Record<string, number>;
  groupCountsTotal?: number;
  selectedSheet?: string;
  onSheetChange?: (sheet: string) => void;
  downloadGroupSheetTemplate?: () => void;
  downloadGroupSheetSampleTemplate?: () => void;
  groupFileInputRef?: RefObject<HTMLInputElement | null>;
  groupFileName?: string;
  onGroupFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGroupImport?: () => void;
  groupPendingCount?: number;
  isGroupParsing?: boolean;
  isGroupImporting?: boolean;
  groupImportSuccess?: boolean;
  groupDataCount?: number;
  selectedItem?: string;
  onItemChange?: (item: string) => void;
  downloadItemTemplate?: (item: string) => void;
  downloadItemSampleTemplate?: (item: string) => void;
  itemFileInputRef?: RefObject<HTMLInputElement | null>;
  itemFileName?: string;
  onItemFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onItemImport?: () => void;
  itemPendingCount?: number;
  isItemParsing?: boolean;
  isItemImporting?: boolean;
  itemImportSuccess?: boolean;
  itemDataCount?: number;
}

export default function ImportMenuBar({
  selectedCpId,
  cpList,
  onCpChange,
  downloadFullTemplate,
  downloadFullSampleTemplate,
  fullFileInputRef,
  fullFileName,
  onFullFileSelect,
  onFullImport,
  fullPendingCount,
  isFullParsing,
  isFullImporting,
  fullImportSuccess,
  fullDataCount,
  downloadWorksheetTemplate,
  downloadWorksheetSampleTemplate,
  worksheetFileInputRef,
  worksheetFileName,
  onWorksheetFileSelect,
  onWorksheetImport,
  worksheetPendingCount,
  isWorksheetParsing,
  isWorksheetImporting,
  worksheetImportSuccess,
}: ImportMenuBarProps) {
  return (
    <div className={`${tw.tableWrapper} p-3 w-full flex-shrink-0`}>
      <table className="border-collapse w-full table-fixed">
        <tbody>
          {/* 1행: 구분 */}
          <tr className="h-7">
            <td className={`${tw.rowHeader} w-[70px]`} title="Classification">구분(Class)</td>
            <td className={`${tw.cell} w-[160px]`}>
              <select value={selectedCpId} onChange={(e) => onCpChange(e.target.value)} className={tw.select}>
                <option value="">선택(Select)</option>
                {cpList.map((cp, idx) => <option key={`${cp.id}-${idx}`} value={cp.id}>{cp.id}</option>)}
              </select>
            </td>
            <td className={`${tw.cell}`} colSpan={5}>
              <span className="text-[10px] text-gray-500 px-2">
                관리계획서 Excel 파일을 Import하여 CP 기초정보/워크시트를 생성합니다.
              </span>
            </td>
          </tr>

          {/* 2행: 기초정보 Import (5시트 Excel) */}
          {fullFileInputRef && onFullFileSelect && onFullImport && (
            <tr className="h-7 bg-teal-50">
              <td className={`${tw.rowHeader} bg-teal-600 text-white w-[70px]`} title="Master Data">
                기초정보(Master)
              </td>
              <td className={`${tw.cell} text-[10px] text-teal-700`}>
                5시트 Excel (공정현황/검출장치/관리항목/관리방법/대응계획)
              </td>
              <td className={`${tw.cell} w-[120px]`}>
                <div className="flex items-center gap-1 justify-center">
                  {downloadFullTemplate && (
                    <button onClick={downloadFullTemplate} className={tw.btnPrimary} title="빈 템플릿 다운로드">
                      <Download size={10} className="inline mr-0.5" />빈 템플릿(Empty Template)
                    </button>
                  )}
                  {downloadFullSampleTemplate && (
                    <button onClick={downloadFullSampleTemplate} className={tw.btnBlue} title="샘플 데이터 템플릿">
                      <Download size={10} className="inline mr-0.5" />샘플(Sample)
                    </button>
                  )}
                </div>
              </td>
              <td className={`${tw.rowHeader} bg-teal-600 text-white w-[50px]`}>Import</td>
              <td className={`${tw.cell} w-[160px]`}>
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    ref={fullFileInputRef}
                    accept=".xlsx,.xls"
                    onChange={onFullFileSelect}
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    className="hidden"
                  />
                  <button
                    onClick={() => fullFileInputRef.current?.click()}
                    className="px-2 py-0.5 bg-teal-500 text-white border-none rounded cursor-pointer text-[10px] font-bold truncate max-w-[90px]"
                  >
                    {fullFileName || '파일 선택(Choose File)'}
                  </button>
                  <button
                    onClick={onFullImport}
                    disabled={(fullPendingCount ?? 0) === 0 || isFullImporting}
                    className={(fullPendingCount ?? 0) === 0 ? tw.btnSuccessDisabled : tw.btnGreen}
                  >
                    {isFullImporting ? '...' : 'Import'}
                  </button>
                </div>
              </td>
              <td className={`${tw.cellCenter} w-[80px]`} colSpan={2}>
                {isFullParsing && <span className="text-teal-500 text-[10px]">파싱중...(Parsing)</span>}
                {!isFullParsing && (
                  fullImportSuccess ? (
                    <span className="text-green-500 text-[10px] flex items-center gap-1 justify-center">
                      <CheckCircle size={12} />완료(Done)
                    </span>
                  ) : (fullPendingCount ?? 0) > 0 ? (
                    <span className="text-teal-600 text-[10px] font-bold">{fullPendingCount}건 파싱(parsed)</span>
                  ) : (fullDataCount ?? 0) > 0 ? (
                    <span className="text-gray-500 text-[10px]">DB {fullDataCount}건</span>
                  ) : (
                    <span className="text-gray-400 text-[10px]">대기(Ready)</span>
                  )
                )}
              </td>
            </tr>
          )}

          {/* 3행: 관리계획서 Import (19컬럼 단일시트) */}
          {worksheetFileInputRef && onWorksheetFileSelect && onWorksheetImport && (
            <tr className="h-7 bg-teal-50">
              <td className={`${tw.rowHeader} bg-teal-600 text-white w-[70px]`} title="Control Plan Worksheet">
                관리계획서(CP WS)
              </td>
              <td className={`${tw.cell} text-[10px] text-teal-700`}>
                CP 워크시트 Excel (병합 셀 포함, 19컬럼) → 원자성 DB 저장
              </td>
              <td className={`${tw.cell} w-[120px]`}>
                <div className="flex items-center gap-1 justify-center">
                  {downloadWorksheetTemplate && (
                    <button onClick={downloadWorksheetTemplate} className={tw.btnPrimary} title="빈 템플릿 다운로드">
                      <Download size={10} className="inline mr-0.5" />빈 템플릿(Empty Template)
                    </button>
                  )}
                  {downloadWorksheetSampleTemplate && (
                    <button onClick={downloadWorksheetSampleTemplate} className={tw.btnBlue} title="샘플 데이터 템플릿">
                      <Download size={10} className="inline mr-0.5" />샘플(Sample)
                    </button>
                  )}
                </div>
              </td>
              <td className={`${tw.rowHeader} bg-teal-600 text-white w-[50px]`}>Import</td>
              <td className={`${tw.cell} w-[160px]`}>
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    ref={worksheetFileInputRef}
                    accept=".xlsx,.xls"
                    onChange={onWorksheetFileSelect}
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    className="hidden"
                  />
                  <button
                    onClick={() => worksheetFileInputRef.current?.click()}
                    className="px-2 py-0.5 bg-teal-500 text-white border-none rounded cursor-pointer text-[10px] font-bold truncate max-w-[90px]"
                  >
                    {worksheetFileName || '파일 선택(Choose File)'}
                  </button>
                  <button
                    onClick={onWorksheetImport}
                    disabled={(worksheetPendingCount ?? 0) === 0 || isWorksheetImporting}
                    className={(worksheetPendingCount ?? 0) === 0 ? tw.btnSuccessDisabled : tw.btnGreen}
                  >
                    {isWorksheetImporting ? '...' : 'Import'}
                  </button>
                </div>
              </td>
              <td className={`${tw.cellCenter} w-[80px]`} colSpan={2}>
                {isWorksheetParsing && <span className="text-teal-500 text-[10px]">파싱중...(Parsing)</span>}
                {!isWorksheetParsing && (
                  worksheetImportSuccess ? (
                    <span className="text-green-500 text-[10px] flex items-center gap-1 justify-center">
                      <CheckCircle size={12} />완료(Done)
                    </span>
                  ) : (worksheetPendingCount ?? 0) > 0 ? (
                    <span className="text-teal-600 text-[10px] font-bold">{worksheetPendingCount}건 파싱(parsed)</span>
                  ) : (
                    <span className="text-gray-400 text-[10px]">대기(Ready)</span>
                  )
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
