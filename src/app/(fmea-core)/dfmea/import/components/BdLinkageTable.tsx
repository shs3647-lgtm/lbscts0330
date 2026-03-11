/**
 * @file BdLinkageTable.tsx
 * @description BD 연동 정보 테이블 (첫 번째 테이블 - 구분/BD ID/등록FMEA/연동FMEA/상태/샘플/데이터현황)
 * @created 2026-02-17
 */

'use client';

import React from 'react';
import { tw } from '../tailwindClasses';
import { FMEAProject, BdStatusItem } from './ImportPageTypes';
import { fmeaIdToBdId, BD_TYPE_COLORS } from '../utils/bd-id';

interface DataCount {
  itemCount: number;
  dataCount: number;
}

interface BdLinkageTableProps {
  fmeaList: FMEAProject[];
  selectedFmeaId: string;
  bdStatusList?: BdStatusItem[];
  previewDataCount?: DataCount;
  onDownloadSample: (fmeaName: string) => void;
  onDownloadEmpty: (fmeaName: string) => void;
  onCopyFromParent?: () => void;
}

/** 유형 뱃지 */
function TypeBadge({ type }: { type: string }) {
  const c = BD_TYPE_COLORS[type] || BD_TYPE_COLORS.P;
  const label = type === 'M' ? 'Master' : type === 'F' ? 'Family' : 'Part';
  return (
    <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text} ${c.border} border`}>
      {label}
    </span>
  );
}

/** 상태 뱃지 */
function StatusBadge({ status }: { status: 'linked' | 'changed' | 'none' }) {
  if (status === 'linked') {
    return <span className="inline-block text-[8px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-300">연동</span>;
  }
  if (status === 'changed') {
    return <span className="inline-block text-[8px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-300">변경</span>;
  }
  return <span className="text-[9px] text-gray-400">-</span>;
}

const HEADER = tw.headerCell;

export function BdLinkageTable({
  fmeaList,
  selectedFmeaId,
  bdStatusList,
  previewDataCount,
  onDownloadSample,
  onDownloadEmpty,
  onCopyFromParent,
}: BdLinkageTableProps) {
  // 유형별 FMEA 분류
  const rows: { type: 'P' | 'M' | 'F'; label: string; prefix: string }[] = [
    { type: 'P', label: 'Part (PBD)', prefix: 'PBD' },
    { type: 'M', label: 'Master (MBD)', prefix: 'MBD' },
    { type: 'F', label: 'Family (FBD)', prefix: 'FBD' },
  ];

  // 현재 선택된 FMEA
  const selectedFmea = selectedFmeaId ? fmeaList.find(f => f.id === selectedFmeaId) : null;
  const selectedType = selectedFmea?.fmeaType || 'D';

  /** 해당 유형의 BD 정보 가져오기 */
  const getBdInfo = (type: string) => {
    // 선택된 FMEA가 해당 유형인 경우
    if (selectedType === type && selectedFmeaId) {
      const bd = bdStatusList?.find(b => b.fmeaId === selectedFmeaId);
      return {
        bdId: bd?.bdId || fmeaIdToBdId(selectedFmeaId),
        fmeaId: selectedFmeaId,
        fmeaName: selectedFmea?.fmeaInfo?.subject || selectedFmea?.fmeaNo || '-',
        sourceFmeaId: bd?.sourceFmeaId || selectedFmea?.parentFmeaId || null,
        sourceFmeaName: '',
        itemCount: bd?.itemCount ?? previewDataCount?.itemCount ?? 0,
        dataCount: bd?.dataCount ?? previewDataCount?.dataCount ?? 0,
        version: bd?.version ?? 0,
        hasData: (bd?.dataCount ?? 0) > 0 || (previewDataCount?.dataCount ?? 0) > 0,
      };
    }

    // 선택된 FMEA의 상위 FMEA 정보 (Part → Master/Family 연결)
    if (selectedType === 'P' && selectedFmea?.parentFmeaId) {
      const parent = fmeaList.find(f => f.id === selectedFmea.parentFmeaId);
      if (parent?.fmeaType === type) {
        const bd = bdStatusList?.find(b => b.fmeaId === parent.id);
        return {
          bdId: bd?.bdId || fmeaIdToBdId(parent.id),
          fmeaId: parent.id,
          fmeaName: parent.fmeaInfo?.subject || parent.fmeaNo || '-',
          sourceFmeaId: null,
          sourceFmeaName: '',
          itemCount: bd?.itemCount ?? 0,
          dataCount: bd?.dataCount ?? 0,
          version: bd?.version ?? 0,
          hasData: (bd?.dataCount ?? 0) > 0,
        };
      }
    }

    return null;
  };

  /** 소스 FMEA 이름 찾기 */
  const getSourceFmeaName = (sourceFmeaId: string | null) => {
    if (!sourceFmeaId) return '';
    const source = fmeaList.find(f => f.id === sourceFmeaId);
    return source?.fmeaInfo?.subject || source?.fmeaNo || sourceFmeaId;
  };

  /** 상태 판별 */
  const getStatus = (info: ReturnType<typeof getBdInfo>): 'linked' | 'changed' | 'none' => {
    if (!info || !info.hasData) return 'none';
    if (info.sourceFmeaId) return 'linked';
    return 'changed';
  };

  return (
    <div className={tw.tableWrapper}>
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col style={{ width: 80 }} />
          <col style={{ width: 100 }} />
          <col />
          <col />
          <col style={{ width: 55 }} />
          <col style={{ width: 80 }} />
          <col style={{ width: 90 }} />
        </colgroup>
        <thead>
          <tr>
            <th className={HEADER}>구 분</th>
            <th className={HEADER}>BD ID</th>
            <th className={HEADER}>등록 FMEA</th>
            <th className={HEADER}>연동 FMEA</th>
            <th className={HEADER}>상태</th>
            <th className={HEADER}>샘플/템플릿</th>
            <th className={HEADER}>데이터 현황</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const info = getBdInfo(row.type);
            const status = getStatus(info);
            const isCurrentType = selectedType === row.type;
            const sourceName = info ? getSourceFmeaName(info.sourceFmeaId) : '';

            // FMEA명 (다운로드용)
            const downloadName = info?.fmeaName || `${row.label}_FMEA`;

            return (
              <tr key={row.type}>
                {/* 구분 */}
                <td className={tw.rowHeader}>
                  <div className="flex items-center justify-center gap-1">
                    <TypeBadge type={row.type} />
                  </div>
                </td>

                {/* BD ID */}
                <td className={tw.cellCenter}>
                  {info ? (
                    <span className="text-[9px] font-mono font-bold text-indigo-600">{info.bdId}</span>
                  ) : (
                    <span className="text-[9px] text-gray-400">-</span>
                  )}
                </td>

                {/* 등록 FMEA */}
                <td className={tw.cell}>
                  {info ? (
                    <div className="text-[9px]">
                      <span className="font-mono text-gray-600">{info.fmeaId}</span>
                      <span className="text-gray-500 ml-1 truncate">{info.fmeaName !== '-' ? `(${info.fmeaName})` : ''}</span>
                    </div>
                  ) : (
                    <span className="text-[9px] text-gray-400">
                      {row.type} FMEA 미등록
                    </span>
                  )}
                </td>

                {/* 연동 FMEA */}
                <td className={tw.cell}>
                  {info?.sourceFmeaId ? (
                    <div className="text-[9px]">
                      <span className="font-mono text-green-700">{info.sourceFmeaId}</span>
                      {sourceName && <span className="text-gray-500 ml-1">({sourceName})</span>}
                    </div>
                  ) : info?.hasData ? (
                    <span className="text-[9px] text-orange-600">직접입력</span>
                  ) : (
                    <span className="text-[9px] text-gray-400">-</span>
                  )}
                </td>

                {/* 상태 */}
                <td className={tw.cellCenter}>
                  <StatusBadge status={status} />
                </td>

                {/* 샘플/템플릿 */}
                <td className={tw.cellPad}>
                  {isCurrentType ? (
                    <div className="flex gap-0.5">
                      <button onClick={() => onDownloadSample(downloadName)} className="text-[8px] px-1 py-0.5 bg-blue-500 text-white rounded">샘플</button>
                      <button onClick={() => onDownloadEmpty(downloadName)} className="text-[8px] px-1 py-0.5 bg-gray-500 text-white rounded">빈양식</button>
                    </div>
                  ) : (
                    <span className="text-[9px] text-gray-400">-</span>
                  )}
                </td>

                {/* 데이터현황 */}
                <td className={tw.cellPad}>
                  {info?.hasData ? (
                    <div className="text-[9px] text-center">
                      <span className="text-gray-600">항목 <b className="text-blue-600">{info.itemCount}</b></span>
                      <span className="text-gray-400 mx-0.5">/</span>
                      <span className="text-gray-600">데이터 <b className="text-green-600">{info.dataCount}</b></span>
                    </div>
                  ) : isCurrentType && onCopyFromParent && selectedFmea?.parentFmeaId ? (
                    <button
                      onClick={onCopyFromParent}
                      className="text-[8px] px-1.5 py-0.5 bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200 whitespace-nowrap"
                    >
                      상위 데이터 가져오기
                    </button>
                  ) : (
                    <span className="text-[9px] text-gray-400">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default BdLinkageTable;
