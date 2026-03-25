/**
 * @file CPTab.tsx
 * @description Control Plan (관리계획서) 워크시트 탭
 *
 * PFMEA와 쌍방향 연동:
 * - 🔄 동기화 버튼으로 PFMEA ↔ CP 양방향 동기화
 * - 연동 필드는 노란색 배경으로 표시
 * - 수정된 필드는 주황색 배경으로 표시
 *
 * EP검사장치 기능:
 * - EP/자동검사 셀 클릭 시 해당 공정의 장치 선택 팝업
 * - EP검사장치 메뉴로 기초정보 관리 모달
 */

'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { WorksheetState } from '../../constants';
import {
  CPRow,
  createEmptyCPRow,
  CP_COLUMNS,
  CP_HEADER_GROUPS,
  SPECIAL_CHAR_OPTIONS,
  FREQUENCY_OPTIONS,
  MEASURE_METHOD_OPTIONS,
  ACTION_METHOD_OPTIONS
} from '../../types/controlPlan';
import { syncPfmeaToCP, syncCPToPfmea, checkSyncStatus } from './syncPfmeaCP';
import { EPDevice, loadEPDevices, getDevicesForProcess } from '../../types/epDevice';
import EPDeviceManager from './EPDeviceManager';
import EPDevicePopup from './EPDevicePopup';

interface CPTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty: (dirty: boolean) => void;
}

// 스타일
const styles = {
  container: 'w-full h-full overflow-auto bg-white',
  table: 'w-full border-collapse min-w-[2000px]',
  thead: 'sticky top-0 z-10 bg-white',

  // PFMEA 연동 필드 스타일
  syncedCell: 'bg-yellow-50',
  modifiedCell: 'bg-orange-100',
  newCell: 'bg-green-50',

  cell: 'border border-[#ccc] text-[11px] p-1 align-top',
  cellCenter: 'border border-[#ccc] text-[11px] p-1 text-center align-middle',

  input: 'w-full border-none bg-transparent text-[11px] outline-none focus:bg-blue-50 p-0.5',
  checkbox: 'w-4 h-4 cursor-pointer',
  select: 'w-full border-none bg-transparent text-[10px] outline-none cursor-pointer',
};

export default function CPTab({ state, setState, setDirty }: CPTabProps) {
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // EP검사장치 관련 상태
  const [epDevices, setEpDevices] = useState<EPDevice[]>([]);
  const [showEPManager, setShowEPManager] = useState(false);
  const [showEPPopup, setShowEPPopup] = useState(false);
  const [epPopupConfig, setEpPopupConfig] = useState<{
    rowId: string;
    processNo: string;
    processName: string;
    category: 'ep' | 'autoInspect';
    selectedIds: string[];
  } | null>(null);

  // EP검사장치 로드
  useEffect(() => {
    setEpDevices(loadEPDevices());
  }, []);

  // CP 데이터 가져오기
   
  const cpRows: CPRow[] = useMemo(() => {
    return ((state as unknown as Record<string, unknown>).cpRows as CPRow[]) || [];
  }, [(state as unknown as Record<string, unknown>).cpRows]);

  // 동기화 상태 확인
  const syncStatus = useMemo(() => {
    return checkSyncStatus(state, cpRows);
  }, [state, cpRows]);

  // PFMEA → CP 동기화
  const handleSyncFromPfmea = useCallback(() => {
    const { cpRows: newRows, result } = syncPfmeaToCP(state);
    setState(prev => ({ ...prev, cpRows: newRows }));
    setDirty(true);
    setSyncMessage(result.message);
    setTimeout(() => setSyncMessage(null), 3000);
  }, [state, setState, setDirty]);

  // CP → PFMEA 동기화
  const handleSyncToPfmea = useCallback(() => {
    const modifiedRows = cpRows.filter(r => r.syncStatus === 'modified');
    if (modifiedRows.length === 0) {
      setSyncMessage('⚠️ 수정된 항목이 없습니다.');
      setTimeout(() => setSyncMessage(null), 3000);
      return;
    }

    const { updatedState, result } = syncCPToPfmea(state, modifiedRows);
    setState(prev => ({
      ...prev,
      ...updatedState,
      cpRows: cpRows.map(r => ({ ...r, syncStatus: 'synced' as const }))
    }));
    setDirty(true);
    setSyncMessage(result.message);
    setTimeout(() => setSyncMessage(null), 3000);
  }, [state, cpRows, setState, setDirty]);

  // 행 추가
  const addRow = useCallback(() => {
    const lastRow = cpRows[cpRows.length - 1];
    const newRow = createEmptyCPRow(
      lastRow ? String(Number(lastRow.processNo) + 10) : '10',
      ''
    );
    setState(prev => ({
      ...prev,
       
      cpRows: [...(((prev as unknown as Record<string, unknown>).cpRows as CPRow[]) || []), newRow]
    }));
    setDirty(true);
  }, [cpRows, setState, setDirty]);

  // 셀 값 변경
   
  const updateCell = useCallback((rowId: string, field: keyof CPRow, value: unknown) => {
    setState(prev => {
      const rows = [...(((prev as unknown as Record<string, unknown>).cpRows as CPRow[]) || [])];
      const idx = rows.findIndex((r: CPRow) => r.id === rowId);
      if (idx === -1) return prev;

      const row = { ...rows[idx] };
      (row as unknown as Record<string, unknown>)[field] = value;

      // PFMEA 연동 필드 수정 시 syncStatus를 modified로 변경
      const pfmeaSyncFields = ['specialChar', 'controlMethod', 'productChar', 'processChar'];
      if (pfmeaSyncFields.includes(field) && row.syncStatus === 'synced') {
        row.syncStatus = 'modified';
      }

      rows[idx] = row;
      return { ...prev, cpRows: rows };
    });
    setDirty(true);
  }, [setState, setDirty]);

  // EP/자동검사 셀 클릭 핸들러
  const handleEPCellClick = useCallback((row: CPRow, category: 'ep' | 'autoInspect') => {
    // 해당 공정의 장치 확인
    const cat = category === 'ep' ? 'Error Proof' : '자동검사';
    const processDevices = getDevicesForProcess(epDevices, row.processNo, cat as any);

    if (processDevices.length === 0) {
      // 장치가 없으면 토글만 수행
      updateCell(row.id, category, !row[category]);
      return;
    }

    // 장치가 있으면 팝업 표시
    setEpPopupConfig({
      rowId: row.id,
      processNo: row.processNo,
      processName: row.processName,
      category,
      selectedIds: ((row as unknown as Record<string, unknown>)[`${category}DeviceIds`] as string[]) || [],
    });
    setShowEPPopup(true);
  }, [epDevices, updateCell]);

  // EP장치 선택 완료
  const handleEPSelect = useCallback((deviceIds: string[]) => {
    if (!epPopupConfig) return;

    setState(prev => {
      const rows = [...(((prev as unknown as Record<string, unknown>).cpRows as CPRow[]) || [])];
      const idx = rows.findIndex((r: CPRow) => r.id === epPopupConfig.rowId);
      if (idx === -1) return prev;

      const row = { ...rows[idx] };
      // 선택된 장치 ID 저장
      (row as unknown as Record<string, unknown>)[`${epPopupConfig.category}DeviceIds`] = deviceIds;
      // 장치가 하나라도 선택되면 체크
      row[epPopupConfig.category] = deviceIds.length > 0;

      rows[idx] = row;
      return { ...prev, cpRows: rows };
    });
    setDirty(true);
  }, [epPopupConfig, setState, setDirty]);

  // 특별특성 색상
  const getSpecialCharColor = (value: string): string => {
    const opt = SPECIAL_CHAR_OPTIONS.find(o => o.value === value);
    return opt?.color || '#6b7280';
  };

  // 해당 공정의 EP장치 개수 표시
  const getEPDeviceCount = (processNo: string, category: 'ep' | 'autoInspect'): number => {
    const cat = category === 'ep' ? 'Error Proof' : '자동검사';
    return getDevicesForProcess(epDevices, processNo, cat as any).length;
  };

  return (
    <div className={styles.container}>
      {/* 툴바 */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-teal-800 to-teal-600 px-3 py-2 flex items-center justify-between border-b-2 border-teal-900">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-sm">📋 Control Plan (관리계획서)</span>
          <span className="text-teal-200 text-xs">| 총 {cpRows.length}행</span>

          {/* 동기화 상태 표시 */}
          <div className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
            syncStatus.inSync
              ? 'bg-green-500 text-white'
              : 'bg-orange-500 text-white'
          }`}>
            {syncStatus.inSync
              ? '✓ PFMEA 동기화됨'
              : `⚠️ PFMEA: ${syncStatus.pfmeaCount} / CP: ${syncStatus.cpCount}`
            }
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 동기화 메시지 */}
          {syncMessage && (
            <span className="text-yellow-300 text-xs font-semibold animate-pulse">
              {syncMessage}
            </span>
          )}

          {/* EP검사장치 관리 버튼 */}
          <button
            onClick={() => setShowEPManager(true)}
            className="px-3 py-1 bg-indigo-500 text-white text-xs font-semibold rounded hover:bg-indigo-600 transition"
            title="EP검사장치 기초정보 관리"
          >
            🛡️ EP검사장치
          </button>

          <button
            onClick={handleSyncFromPfmea}
            className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-600 transition"
            title="PFMEA 데이터를 CP에 반영"
          >
            🔄 PFMEA→CP
          </button>
          <button
            onClick={handleSyncToPfmea}
            className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded hover:bg-orange-600 transition"
            title="CP에서 수정된 내용을 PFMEA에 반영"
          >
            🔄 CP→PFMEA
          </button>
          <button
            onClick={addRow}
            className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 transition"
          >
            + 행 추가
          </button>
        </div>
      </div>

      {/* 범례 */}
      <div className="bg-gray-100 px-3 py-1 text-[10px] flex items-center gap-4 border-b">
        <span className="font-semibold">범례:</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-100 border border-yellow-300"></span>
          PFMEA 연동 필드
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-orange-100 border border-orange-300"></span>
          수정됨 (동기화 필요)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-100 border border-green-300"></span>
          신규
        </span>
        <span className="flex items-center gap-1 ml-4">
          <span className="w-3 h-3 bg-indigo-100 border border-indigo-300"></span>
          EP 장치 있음
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-cyan-100 border border-cyan-300"></span>
          자동검사 장치 있음
        </span>
      </div>

      {/* 테이블 */}
      <table className={styles.table}>
        <thead className={styles.thead}>
          {/* 1행: 그룹 헤더 */}
          <tr>
            {CP_HEADER_GROUPS.map((group, idx) => (
              <th
                key={idx}
                colSpan={group.colspan}
                className="text-white text-xs font-bold text-center border border-white/30 py-1.5"
                style={{ background: group.bg }}
              >
                {group.label}
              </th>
            ))}
          </tr>

          {/* 2행: 열 헤더 */}
          <tr>
            {CP_COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`bg-gray-200 text-gray-800 text-[10px] font-semibold text-center border border-gray-300 py-1 px-1 ${
                  col.pfmeaSync ? 'bg-yellow-100' : ''
                }`}
                style={{ width: col.width, minWidth: col.width }}
                title={col.pfmeaSync ? 'PFMEA 연동 필드' : ''}
              >
                {col.label}
                {col.pfmeaSync && <span className="ml-0.5 text-yellow-600">🔗</span>}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {cpRows.length === 0 ? (
            <tr>
              <td colSpan={19} className="text-center py-10 text-gray-400">
                데이터가 없습니다. [🔄 PFMEA→CP] 버튼으로 PFMEA에서 데이터를 가져오세요.
              </td>
            </tr>
          ) : (
            cpRows.map((row, idx) => {
              const zebraBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
              const statusBg = row.syncStatus === 'modified' ? styles.modifiedCell
                            : row.syncStatus === 'new' ? styles.newCell
                            : '';

              // EP장치 개수
              const epCount = getEPDeviceCount(row.processNo, 'ep');
              const autoCount = getEPDeviceCount(row.processNo, 'autoInspect');

              return (
                <tr key={row.id} className={zebraBg}>
                  {/* 공정번호 */}
                  <td className={`${styles.cellCenter} ${styles.syncedCell}`}>
                    <input
                      type="text"
                      value={row.processNo}
                      onChange={(e) => updateCell(row.id, 'processNo', e.target.value)}
                      className={styles.input}
                    />
                  </td>

                  {/* 공정명 */}
                  <td className={`${styles.cell} ${styles.syncedCell}`}>
                    <input
                      type="text"
                      value={row.processName}
                      onChange={(e) => updateCell(row.id, 'processName', e.target.value)}
                      className={styles.input}
                    />
                  </td>

                  {/* 형태 */}
                  <td className={styles.cellCenter}>
                    <select
                      value={row.processType}
                      onChange={(e) => updateCell(row.id, 'processType', e.target.value)}
                      className={styles.select}
                    >
                      <option value="">-</option>
                      <option value="메인">메인</option>
                      <option value="서브">서브</option>
                      <option value="작업">작업</option>
                    </select>
                  </td>

                  {/* 공정설명 */}
                  <td className={`${styles.cell} ${styles.syncedCell}`}>
                    <input
                      type="text"
                      value={row.processDesc}
                      onChange={(e) => updateCell(row.id, 'processDesc', e.target.value)}
                      className={styles.input}
                    />
                  </td>

                  {/* 부품(컴포넌트) */}
                  <td className={`${styles.cell} ${styles.syncedCell}`}>
                    <input
                      type="text"
                      value={row.workElement}
                      onChange={(e) => updateCell(row.id, 'workElement', e.target.value)}
                      className={styles.input}
                    />
                  </td>

                  {/* EP - 클릭 시 팝업 */}
                  <td
                    className={`${styles.cellCenter} cursor-pointer hover:bg-indigo-50 ${
                      epCount > 0 ? 'bg-indigo-50' : ''
                    }`}
                    onClick={() => handleEPCellClick(row, 'ep')}
                    title={epCount > 0 ? `클릭하여 ${epCount}개 EP장치 선택` : 'EP 장치 없음 (클릭하여 토글)'}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="checkbox"
                        checked={row.ep}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.checkbox}
                        readOnly
                      />
                      {epCount > 0 && (
                        <span className="text-[9px] text-indigo-600 font-semibold">({epCount})</span>
                      )}
                    </div>
                  </td>

                  {/* 자동검사 - 클릭 시 팝업 */}
                  <td
                    className={`${styles.cellCenter} cursor-pointer hover:bg-cyan-50 ${
                      autoCount > 0 ? 'bg-cyan-50' : ''
                    }`}
                    onClick={() => handleEPCellClick(row, 'autoInspect')}
                    title={autoCount > 0 ? `클릭하여 ${autoCount}개 자동검사장치 선택` : '자동검사 장치 없음 (클릭하여 토글)'}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="checkbox"
                        checked={row.autoInspect}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.checkbox}
                        readOnly
                      />
                      {autoCount > 0 && (
                        <span className="text-[9px] text-cyan-600 font-semibold">({autoCount})</span>
                      )}
                    </div>
                  </td>

                  {/* NO */}
                  <td className={styles.cellCenter}>
                    <input
                      type="text"
                      value={row.itemNo}
                      onChange={(e) => updateCell(row.id, 'itemNo', e.target.value)}
                      className={`${styles.input} text-center`}
                    />
                  </td>

                  {/* 설계특성 */}
                  <td className={`${styles.cell} ${styles.syncedCell} ${statusBg}`}>
                    <input
                      type="text"
                      value={row.productChar}
                      onChange={(e) => updateCell(row.id, 'productChar', e.target.value)}
                      className={styles.input}
                    />
                  </td>

                  {/* 설계파라미터 */}
                  <td className={`${styles.cell} ${styles.syncedCell} ${statusBg}`}>
                    <input
                      type="text"
                      value={row.processChar}
                      onChange={(e) => updateCell(row.id, 'processChar', e.target.value)}
                      className={styles.input}
                    />
                  </td>

                  {/* 특별특성 */}
                  <td
                    className={`${styles.cellCenter} ${styles.syncedCell} ${statusBg}`}
                    style={{ color: getSpecialCharColor(row.specialChar) }}
                  >
                    <select
                      value={row.specialChar}
                      onChange={(e) => updateCell(row.id, 'specialChar', e.target.value)}
                      className={styles.select}
                      style={{ color: getSpecialCharColor(row.specialChar), fontWeight: 600 }}
                    >
                      {SPECIAL_CHAR_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.value || '-'}</option>
                      ))}
                    </select>
                  </td>

                  {/* 규격/공차 */}
                  <td className={styles.cell}>
                    <input
                      type="text"
                      value={row.specTolerance}
                      onChange={(e) => updateCell(row.id, 'specTolerance', e.target.value)}
                      className={styles.input}
                    />
                  </td>

                  {/* 평가측정방법 */}
                  <td className={styles.cell}>
                    <select
                      value={row.measureMethod}
                      onChange={(e) => updateCell(row.id, 'measureMethod', e.target.value)}
                      className={styles.select}
                    >
                      <option value="">선택</option>
                      {MEASURE_METHOD_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>

                  {/* 샘플크기 */}
                  <td className={styles.cellCenter}>
                    <input
                      type="text"
                      value={row.sampleSize}
                      onChange={(e) => updateCell(row.id, 'sampleSize', e.target.value)}
                      className={`${styles.input} text-center`}
                    />
                  </td>

                  {/* 주기 */}
                  <td className={styles.cellCenter}>
                    <select
                      value={row.frequency}
                      onChange={(e) => updateCell(row.id, 'frequency', e.target.value)}
                      className={styles.select}
                    >
                      <option value="">선택</option>
                      {FREQUENCY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>

                  {/* 관리방법 */}
                  <td className={`${styles.cell} ${styles.syncedCell} ${statusBg}`}>
                    <input
                      type="text"
                      value={row.controlMethod}
                      onChange={(e) => updateCell(row.id, 'controlMethod', e.target.value)}
                      className={styles.input}
                    />
                  </td>

                  {/* 생산 */}
                  <td className={styles.cellCenter}>
                    <input
                      type="checkbox"
                      checked={row.production}
                      onChange={(e) => updateCell(row.id, 'production', e.target.checked)}
                      className={styles.checkbox}
                    />
                  </td>

                  {/* 품질 */}
                  <td className={styles.cellCenter}>
                    <input
                      type="checkbox"
                      checked={row.quality}
                      onChange={(e) => updateCell(row.id, 'quality', e.target.checked)}
                      className={styles.checkbox}
                    />
                  </td>

                  {/* 조치방법 */}
                  <td className={styles.cell}>
                    <select
                      value={row.actionMethod}
                      onChange={(e) => updateCell(row.id, 'actionMethod', e.target.value)}
                      className={styles.select}
                    >
                      <option value="">선택</option>
                      {ACTION_METHOD_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* EP검사장치 관리 모달 */}
      <EPDeviceManager
        isOpen={showEPManager}
        onClose={() => {
          setShowEPManager(false);
          // 모달 닫을 때 장치 목록 새로고침
          setEpDevices(loadEPDevices());
        }}
        devices={epDevices}
        setDevices={setEpDevices}
      />

      {/* EP장치 선택 팝업 */}
      {epPopupConfig && (
        <EPDevicePopup
          isOpen={showEPPopup}
          onClose={() => {
            setShowEPPopup(false);
            setEpPopupConfig(null);
          }}
          processNo={epPopupConfig.processNo}
          processName={epPopupConfig.processName}
          category={epPopupConfig.category}
          devices={epDevices}
          selectedDeviceIds={epPopupConfig.selectedIds}
          onSelect={handleEPSelect}
        />
      )}
    </div>
  );
}
