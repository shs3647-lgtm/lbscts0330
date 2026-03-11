/**
 * @file components/ImportMenuBar.tsx
 * @description PFD Import 메뉴바 컴포넌트 (3행 입력 영역) - CP와 동일한 UI
 * @created 2026-01-24
 */

import React, { RefObject } from 'react';
import { CheckCircle } from 'lucide-react';
import { PFDProject } from '../types';
import { GROUP_SHEET_OPTIONS, INDIVIDUAL_SHEET_OPTIONS, tw } from '../constants';

export interface ImportMenuBarProps {
  // PFD 선택
  selectedPfdId: string;
  pfdList: PFDProject[];
  onPfdChange: (pfdId: string) => void;
  
  // 전체 Import
  downloadFullTemplate: () => void;
  downloadFullSampleTemplate: () => void;
  fullFileInputRef: RefObject<HTMLInputElement | null>;
  fullFileName: string;
  onFullFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFullImport: () => void;
  fullPendingCount: number;
  isFullParsing: boolean;
  isFullImporting: boolean;
  fullImportSuccess: boolean;
  fullDataCount: number;
  
  // 그룹 시트 Import
  selectedSheet: string;
  onSheetChange: (sheet: string) => void;
  downloadGroupSheetTemplate: () => void;
  downloadGroupSheetSampleTemplate: () => void;
  groupFileInputRef: RefObject<HTMLInputElement | null>;
  groupFileName: string;
  onGroupFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGroupImport: () => void;
  groupPendingCount: number;
  isGroupParsing: boolean;
  isGroupImporting: boolean;
  groupImportSuccess: boolean;
  groupDataCount: number;
  
  // 개별 항목 Import
  selectedItem: string;
  onItemChange: (item: string) => void;
  downloadItemTemplate: (item: string) => void;
  downloadItemSampleTemplate: (item: string) => void;
  itemFileInputRef: RefObject<HTMLInputElement | null>;
  itemFileName: string;
  onItemFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onItemImport: () => void;
  itemPendingCount: number;
  isItemParsing: boolean;
  isItemImporting: boolean;
  itemImportSuccess: boolean;
  itemDataCount: number;
}

/**
 * PFD Import 메뉴바 컴포넌트
 * - 3행 입력 영역 (전체/그룹/개별)
 * - PFD 선택, 시트 선택, 파일 선택, Import 상태 표시
 */
export default function ImportMenuBar({
  selectedPfdId,
  pfdList,
  onPfdChange,
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
  selectedSheet,
  onSheetChange,
  downloadGroupSheetTemplate,
  downloadGroupSheetSampleTemplate,
  groupFileInputRef,
  groupFileName,
  onGroupFileSelect,
  onGroupImport,
  groupPendingCount,
  isGroupParsing,
  isGroupImporting,
  groupImportSuccess,
  groupDataCount,
  selectedItem,
  onItemChange,
  downloadItemTemplate,
  downloadItemSampleTemplate,
  itemFileInputRef,
  itemFileName,
  onItemFileSelect,
  onItemImport,
  itemPendingCount,
  isItemParsing,
  isItemImporting,
  itemImportSuccess,
  itemDataCount,
}: ImportMenuBarProps) {
  return (
    <div className={`${tw.tableWrapper} p-3 w-full flex-shrink-0`}>
      <table className="border-collapse w-full table-fixed">
        <tbody>
          {/* 1행: 전체 */}
          <tr className="h-7">
            <td className={`${tw.rowHeader} w-[55px]`}>PFD 선택</td>
            <td className={`${tw.cell} w-[80px]`}>
              <select value={selectedPfdId} onChange={(e) => onPfdChange(e.target.value)} className={tw.select}>
                <option value="">선택</option>
                {pfdList.map((pfd, idx) => <option key={`${pfd.id}-${idx}`} value={pfd.id}>{pfd.id}</option>)}
              </select>
            </td>
            <td className={`${tw.rowHeader} w-[55px]`}>전체 다운</td>
            <td className={`${tw.cell} w-[100px]`}>
              <div className="flex items-center gap-1">
                <button onClick={downloadFullTemplate} className={tw.btnPrimary}>📥양식</button>
                <button onClick={downloadFullSampleTemplate} className={tw.btnBlue}>📥샘플</button>
              </div>
            </td>
            <td className={`${tw.rowHeader} w-[45px]`}>Import</td>
            <td className={`${tw.cell} w-[130px]`}>
              <div className="flex items-center gap-1">
                <input type="file" ref={fullFileInputRef} accept=".xlsx,.xls" onChange={onFullFileSelect} className="hidden" />
                <button onClick={() => fullFileInputRef.current?.click()} className={tw.btnBrowse}>{fullFileName || '파일 선택'}</button>
                <button onClick={onFullImport} disabled={fullPendingCount === 0 || isFullImporting} className={fullPendingCount === 0 ? tw.btnSuccessDisabled : tw.btnBlue}>
                  {isFullImporting ? '...' : '적용'}
                </button>
              </div>
            </td>
            <td className={`${tw.cellCenter} w-[50px]`}>
              {isFullParsing && <span className="text-blue-500 text-[10px]">파싱중...</span>}
              {!isFullParsing && (
                fullImportSuccess || fullDataCount > 0 ? (
                  <span className="text-green-500 text-[10px] flex items-center gap-1">
                    <CheckCircle size={12} />
                    <span>{fullDataCount}건</span>
                  </span>
                ) : (
                  <span className="text-gray-400 text-[10px]">{fullPendingCount > 0 ? `${fullPendingCount}건` : '대기'}</span>
                )
              )}
            </td>
          </tr>
          {/* 2행: 그룹 시트 */}
          <tr className="h-7">
            <td className={`${tw.rowHeader}`}>그룹 시트</td>
            <td className={`${tw.cell}`}>
              <select value={selectedSheet} onChange={(e) => onSheetChange(e.target.value)} className={tw.select}>
                {GROUP_SHEET_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </td>
            <td className={`${tw.rowHeader}`}>그룹 다운</td>
            <td className={`${tw.cell}`}>
              <div className="flex items-center gap-1">
                <button onClick={downloadGroupSheetTemplate} className={tw.btnPrimary}>📥양식</button>
                <button onClick={downloadGroupSheetSampleTemplate} className={tw.btnBlue}>📥샘플</button>
              </div>
            </td>
            <td className={`${tw.rowHeader}`}>Import</td>
            <td className={`${tw.cell} w-[130px]`}>
              <div className="flex items-center gap-1">
                <input type="file" ref={groupFileInputRef} accept=".xlsx,.xls" onChange={onGroupFileSelect} className="hidden" />
                <button onClick={() => groupFileInputRef.current?.click()} className={tw.btnBrowse}>{groupFileName || '파일 선택'}</button>
                <button onClick={onGroupImport} disabled={groupPendingCount === 0 || isGroupImporting} className={groupPendingCount === 0 ? tw.btnSuccessDisabled : tw.btnBlue}>
                  {isGroupImporting ? '...' : '적용'}
                </button>
              </div>
            </td>
            <td className={`${tw.cellCenter} w-[50px]`}>
              {isGroupParsing && <span className="text-blue-500 text-[10px]">파싱중...</span>}
              {!isGroupParsing && (
                groupImportSuccess || groupDataCount > 0 ? (
                  <span className="text-green-500 text-[10px] flex items-center gap-1">
                    <CheckCircle size={12} />
                    <span>{groupDataCount}건</span>
                  </span>
                ) : (
                  <span className="text-gray-400 text-[10px]">{groupPendingCount > 0 ? `${groupPendingCount}건` : '대기'}</span>
                )
              )}
            </td>
          </tr>
          {/* 3행: 개별 항목 */}
          <tr className="h-7">
            <td className={`${tw.rowHeader}`}>개별 항목</td>
            <td className={`${tw.cell}`}>
              <select value={selectedItem} onChange={(e) => onItemChange(e.target.value)} className={tw.select}>
                {INDIVIDUAL_SHEET_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </td>
            <td className={`${tw.rowHeader}`}>개별 다운</td>
            <td className={`${tw.cell}`}>
              <div className="flex items-center gap-1">
                <button onClick={() => downloadItemTemplate(selectedItem)} className={tw.btnOrange}>📥양식</button>
                <button onClick={() => downloadItemSampleTemplate(selectedItem)} className="px-2 py-0.5 bg-orange-600 text-white border-none rounded cursor-pointer text-[10px] font-bold">📥샘플</button>
              </div>
            </td>
            <td className={`${tw.rowHeader}`}>Import</td>
            <td className={`${tw.cell} w-[130px]`}>
              <div className="flex items-center gap-1">
                <input type="file" ref={itemFileInputRef} accept=".xlsx,.xls" onChange={onItemFileSelect} className="hidden" />
                <button onClick={() => itemFileInputRef.current?.click()} className={tw.btnBrowse}>{itemFileName || '파일 선택'}</button>
                <button onClick={onItemImport} disabled={itemPendingCount === 0 || isItemImporting} className={itemPendingCount === 0 ? tw.btnSuccessDisabled : tw.btnOrange}>
                  {isItemImporting ? '...' : '적용'}
                </button>
              </div>
            </td>
            <td className={`${tw.cellCenter} w-[50px]`}>
              {isItemParsing && <span className="text-orange-500 text-[10px]">파싱중...</span>}
              {!isItemParsing && (
                itemImportSuccess || itemDataCount > 0 ? (
                  <span className="text-green-500 text-[10px] flex items-center gap-1">
                    <CheckCircle size={12} />
                    <span>{itemDataCount}건</span>
                  </span>
                ) : (
                  <span className="text-gray-400 text-[10px]">{itemPendingCount > 0 ? `${itemPendingCount}건` : '대기'}</span>
                )
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
