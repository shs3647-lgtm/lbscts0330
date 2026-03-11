// @ts-nocheck
/**
 * @file EPDeviceManager.tsx
 * @description EP검사장치 기초정보 관리 모달
 *
 * SOD 모달과 동일한 포맷 (블루/베이지 색상)
 * - Excel Import/Export 지원
 * - 수동 추가/수정/삭제
 * - 공정별 그룹화 표시
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ExcelJS from 'exceljs';
import {
  EPDevice,
  EPDeviceCategory,
  createEmptyEPDevice,
  saveEPDevices,
} from '../../types/epDevice';

interface EPDeviceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  devices: EPDevice[];
  setDevices: React.Dispatch<React.SetStateAction<EPDevice[]>>;
  cpNo?: string;  // CP 번호 (DB 저장용)
  fmeaId?: string; // FMEA ID (DB 저장용)
}

// 탭 타입
type TabType = 'all' | 'ep' | 'autoInspect';

// 스타일 상수
const tdBaseStyle: React.CSSProperties = { padding: '6px 8px', border: '1px solid #e0e0e0', verticalAlign: 'middle' };
const inputEditStyle: React.CSSProperties = { width: '100%', border: '1px solid #90caf9', padding: '4px 6px', fontSize: '12px', background: '#e3f2fd', borderRadius: '3px' };
const btnStyle = (bg: string): React.CSSProperties => ({
  padding: '6px 12px', background: bg, color: 'white', border: 'none', borderRadius: '4px',
  fontSize: '12px', fontWeight: 600, cursor: 'pointer'
});

export default function EPDeviceManager({
  isOpen,
  onClose,
  devices,
  setDevices,
  cpNo,
  fmeaId,
}: EPDeviceManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // DB에서 EP검사장치 로드
  useEffect(() => {
    if (!isOpen) return;
    const loadDevices = async () => {
      try {
        const params = new URLSearchParams();
        if (cpNo) params.set('cpNo', cpNo);
        if (fmeaId) params.set('fmeaId', fmeaId);

        const res = await fetch(`/api/ep-device?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setDevices(data.data);
          }
        }
      } catch (error) {
        console.error('EP검사장치 로드 오류:', error);
      }
    };
    loadDevices();
  }, [isOpen, cpNo, fmeaId, setDevices]);

  // 필터링된 장치 목록
  const filteredDevices = useMemo(() => {
    if (activeTab === 'all') return devices;
    const category: EPDeviceCategory = activeTab === 'ep' ? 'Error Proof' : '자동검사';
    return devices.filter(d => d.category === category);
  }, [devices, activeTab]);

  // 통계
  const stats = useMemo(() => ({
    total: devices.length,
    ep: devices.filter(d => d.category === 'Error Proof').length,
    autoInspect: devices.filter(d => d.category === '자동검사').length,
    processCount: new Set(devices.map(d => d.processNo)).size,
  }), [devices]);

  // 행 선택
  const toggleRowSelect = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 전체 선택
  const toggleSelectAll = () => {
    if (selectedRows.size === filteredDevices.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredDevices.map(d => d.id)));
    }
  };

  // 장치 추가
  const addDevice = () => {
    const newDevice = createEmptyEPDevice('', '', activeTab === 'autoInspect' ? '자동검사' : 'Error Proof');
    setDevices(prev => [...prev, newDevice]);
  };

  // 장치 수정
  const updateDevice = useCallback((id: string, field: keyof EPDevice, value: any) => {
    setDevices(prev => prev.map(d => {
      if (d.id !== id) return d;
      return { ...d, [field]: value, updatedAt: new Date() };
    }));
  }, [setDevices]);

  // 선택 삭제
  const deleteSelected = () => {
    if (selectedRows.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }
    if (!confirm(`선택된 ${selectedRows.size}개 항목을 삭제하시겠습니까?`)) return;
    setDevices(prev => prev.filter(d => !selectedRows.has(d.id)));
    setSelectedRows(new Set());
  };

  // 저장 (DB에 저장)
  const handleSave = useCallback(async () => {
    // 빈 행 필터링 (장치명이 없는 행은 제외)
    const validDevices = devices.filter(d => d.deviceName && d.deviceName.trim() !== '');

    if (validDevices.length === 0) {
      alert('저장할 EP검사장치가 없습니다. 장치명을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/ep-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devices: validDevices.map(d => ({
            processNo: d.processNo,
            processName: d.processName,
            category: d.category,
            deviceName: d.deviceName,
            purpose: d.purpose,
          })),
          cpNo,
          fmeaId,
          replaceAll: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // 저장 후 서버에서 반환된 데이터로 업데이트 (ID 포함)
          if (data.data) {
            setDevices(data.data);
          }
          setIsEditMode(false);
          alert(`${data.count || devices.length}개 EP검사장치 저장 완료`);
        } else {
          alert('저장 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } else {
        alert('저장 실패: 서버 오류');
      }
    } catch (error) {
      console.error('EP검사장치 저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [devices, cpNo, fmeaId, setDevices]);

  // 수정모드 토글
  const handleToggleEditMode = useCallback(() => {
    setIsEditMode(prev => !prev);
  }, []);

  // Export (Excel - FMEA 기초정보 양식과 완전 동일 스타일)
  const handleExport = useCallback(async () => {
    // FMEA 기초정보 템플릿 스타일 (excel-template.ts와 동일)
    const HEADER_COLOR = '00587A';  // FMEA 디자인 표준 네이비 색상

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FMEA Smart System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('EP검사장치', {
      properties: { tabColor: { argb: HEADER_COLOR } },
    });

    // 컬럼 설정 (FMEA 양식과 동일한 구조)
    worksheet.columns = [
      { header: '공정번호', key: 'processNo', width: 15 },
      { header: '공정명', key: 'processName', width: 30 },
      { header: '구분', key: 'category', width: 15 },
      { header: '장치명', key: 'deviceName', width: 30 },
      { header: '기능/목적', key: 'purpose', width: 40 },
    ];

    // 헤더 스타일 적용 (FMEA 양식과 완전 동일 - applyHeaderStyle 패턴)
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: '999999' } },
        left: { style: 'thin', color: { argb: '999999' } },
        bottom: { style: 'thin', color: { argb: '999999' } },
        right: { style: 'thin', color: { argb: '999999' } },
      };
    });

    // 데이터 행 추가 (FMEA 양식과 동일한 줄무늬 스타일)
    filteredDevices.forEach((device, idx) => {
      const row = worksheet.addRow({
        processNo: device.processNo,
        processName: device.processName,
        category: device.category,
        deviceName: device.deviceName,
        purpose: device.purpose,
      });

      // 데이터 행 스타일 (FMEA 양식과 완전 동일 - 줄무늬 배경 FFFFFF/E0F2FB)
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFF' : 'E0F2FB' } };
        cell.border = {
          top: { style: 'thin', color: { argb: '999999' } },
          left: { style: 'thin', color: { argb: '999999' } },
          bottom: { style: 'thin', color: { argb: '999999' } },
          right: { style: 'thin', color: { argb: '999999' } },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: '맑은 고딕', size: 10 };
      });
    });

    // 데이터가 없으면 빈 행 10개 추가 (FMEA 양식과 동일)
    if (filteredDevices.length === 0) {
      for (let i = 0; i < 10; i++) {
        const row = worksheet.addRow({ processNo: '', processName: '', category: '', deviceName: '', purpose: '' });
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: '999999' } },
            left: { style: 'thin', color: { argb: '999999' } },
            bottom: { style: 'thin', color: { argb: '999999' } },
            right: { style: 'thin', color: { argb: '999999' } },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: '맑은 고딕', size: 10 };
        });
      }
    }

    // 열 고정 (헤더 1행 + 첫번째 열) - FMEA 양식과 동일
    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

    // 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const tabName = activeTab === 'ep' ? 'ErrorProof' : activeTab === 'autoInspect' ? '자동검사' : '전체';
    link.download = `EP검사장치_${tabName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredDevices, activeTab]);

  // Import (CSV/Excel)
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        let data: any[][] = [];

        if (file.name.endsWith('.csv')) {
          // CSV 파일 처리
          const text = await file.text();
          const lines = text.split('\n').slice(1); // 헤더 제외
          data = lines.filter(line => line.trim()).map(line => {
            return line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
          });
        } else {
          // Excel 파일 처리
          const XLSX = await import('xlsx');
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          data = jsonData.slice(1); // 헤더 제외
        }

        const newDevices: EPDevice[] = [];
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          // 빈 행이면 건너뛰기 (모든 셀이 비어있는 경우만)
          if (!row || row.length === 0) continue;

          // 모든 셀이 비어있으면 건너뛰기
          const hasAnyData = row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '');
          if (!hasAnyData) continue;

          const processNo = String(row[0] || '').trim();
          const processName = String(row[1] || '').trim();
          const categoryRaw = String(row[2] || '').trim();
          const deviceName = String(row[3] || '').trim();
          const purpose = String(row[4] || '').trim();

          // 최소한 구분과 장치명은 있어야 함 (공정번호/공정명은 빈 값 허용)
          if (!deviceName && !categoryRaw) continue;

          let category: EPDeviceCategory = '없음';
          if (categoryRaw.includes('Error') || categoryRaw.includes('EP') || categoryRaw.includes('에러') || categoryRaw.toLowerCase().includes('proof')) {
            category = 'Error Proof';
          } else if (categoryRaw.includes('자동') || categoryRaw.includes('검사') || categoryRaw.includes('Auto')) {
            category = '자동검사';
          }

          // 구분이 없으면 건너뛰기 (빈 행 처리)
          if (category === '없음') continue;

          newDevices.push({
            id: `ep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
            processNo,
            processName,
            category,
            deviceName,
            purpose,
            createdAt: new Date(),
          });
        }

        if (newDevices.length === 0) {
          alert('유효한 EP검사장치 데이터가 없습니다.\n\n헤더: 공정번호, 공정명, 구분, 장치명, 기능/목적');
          return;
        }

        const replace = confirm(
          `${newDevices.length}개의 EP검사장치를 가져왔습니다.\n\n[확인] 기존 데이터 대체\n[취소] 기존 데이터에 추가`
        );

        if (replace) {
          setDevices(newDevices);
        } else {
          setDevices(prev => [...prev, ...newDevices]);
        }
        alert(`${newDevices.length}개 항목을 가져왔습니다.`);
      } catch (error) {
        console.error('Import 오류:', error);
        alert('파일 읽기 오류가 발생했습니다.');
      }
    };
    input.click();
  }, [setDevices]);

  if (!mounted || !isOpen) return null;

  // 탭 스타일 (SOD와 동일)
  const tabBtnStyle = (tab: TabType, active: boolean): React.CSSProperties => {
    const colors: Record<TabType, string> = {
      all: '#1565c0',
      ep: '#5c6bc0',
      autoInspect: '#0288d1',
    };
    return {
      background: active ? colors[tab] : '#e0e0e0',
      color: active ? 'white' : '#666',
      padding: '8px 20px',
      border: 'none',
      borderRadius: '20px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '13px',
    };
  };

  // 헤더 그라데이션 (블루 계열)
  const headerGradientStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)'
  };

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/50">
      <div className="bg-white rounded-xl w-[95%] max-w-[1000px] max-h-[90vh] flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="text-white py-4 px-6 rounded-t-xl flex justify-between items-center" style={headerGradientStyle}>
          <div className="flex items-center gap-3">
            <div>
              <h2 className="m-0 text-lg font-bold">🛡️ EP검사장치 기초정보 관리</h2>
              <p className="mt-1 text-xs opacity-80">Error Proofing / 자동검사 장치 등록 및 관리</p>
            </div>
            {isEditMode && (
              <span className="bg-amber-500 text-white py-1 px-3 rounded-xl text-xs font-bold animate-pulse">✏️ 수정중</span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={handleImport} style={btnStyle('#43a047')}>Import</button>
            <button onClick={handleExport} style={btnStyle('#fb8c00')}>Export</button>
            {/* 수정/저장 토글 버튼 */}
            <button
              onClick={isEditMode ? handleSave : handleToggleEditMode}
              style={btnStyle(isEditMode ? (isSaving ? '#ff9800' : '#43a047') : '#1e88e5')}
              disabled={isSaving}
            >
              {isSaving ? '⏳ 저장중...' : isEditMode ? '💾 저장' : '✏️ 수정'}
            </button>
            {isEditMode && <button onClick={() => setIsEditMode(false)} style={btnStyle('#9e9e9e')}>취소</button>}
            <button onClick={onClose} style={btnStyle('#e53935')}>닫기</button>
          </div>
        </div>

        {/* 통계 바 (베이지 배경) */}
        <div className="flex border-b border-gray-200" style={{ background: '#faf8f5' }}>
          <div className="flex-1 py-2.5 px-6 flex items-center gap-4 text-sm">
            <span className="font-semibold text-gray-700">📊 통계:</span>
            <span className="text-gray-600">공정 <strong className="text-blue-700">{stats.processCount}</strong>개</span>
            <span className="text-gray-600">EP <strong className="text-indigo-600">{stats.ep}</strong>개</span>
            <span className="text-gray-600">자동검사 <strong className="text-cyan-600">{stats.autoInspect}</strong>개</span>
            <span className="text-gray-500">전체 {stats.total}개</span>
          </div>
        </div>

        {/* 탭 & 도구모음 */}
        <div className="flex gap-2 py-3 px-6 bg-gray-50 items-center justify-between border-b">
          {/* 탭 */}
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('all')} style={tabBtnStyle('all', activeTab === 'all')}>
              전체
            </button>
            <button onClick={() => setActiveTab('ep')} style={tabBtnStyle('ep', activeTab === 'ep')}>
              🛡️ Error Proof
            </button>
            <button onClick={() => setActiveTab('autoInspect')} style={tabBtnStyle('autoInspect', activeTab === 'autoInspect')}>
              🔍 자동검사
            </button>
          </div>

          {/* 도구 버튼 */}
          <div className="flex items-center gap-2">
            <button
              onClick={addDevice}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition"
            >
              + 행 추가
            </button>
            <button
              onClick={deleteSelected}
              className="px-3 py-1.5 bg-red-500 text-white text-sm font-semibold rounded hover:bg-red-600 transition disabled:opacity-50"
              disabled={selectedRows.size === 0}
            >
              선택 삭제
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto p-4 px-6">
          {filteredDevices.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg mb-2">등록된 EP검사장치가 없습니다.</p>
              <p className="text-sm">[+ 행 추가] 버튼이나 [Import]로 장치를 등록해주세요.</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr style={{ background: '#1565c0', color: 'white' }}>
                  <th className="p-2.5 border border-blue-400 w-[40px] text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === filteredDevices.length && filteredDevices.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="p-2.5 border border-blue-400 w-[80px] text-center">공정번호</th>
                  <th className="p-2.5 border border-blue-400 w-[120px] text-center">공정명</th>
                  <th className="p-2.5 border border-blue-400 w-[100px] text-center">구분</th>
                  <th className="p-2.5 border border-blue-400 w-[220px] text-center">장치명</th>
                  <th className="p-2.5 border border-blue-400 text-center">기능/목적</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device, idx) => {
                  // 구분에 따른 행 배경색 (베이지/연한 블루)
                  const rowBg = device.category === 'Error Proof'
                    ? idx % 2 === 0 ? '#faf8f5' : '#f5f3f0'
                    : idx % 2 === 0 ? '#f0f7ff' : '#e8f4fd';

                  return (
                    <tr key={device.id} style={{ background: rowBg }}>
                      <td style={{ ...tdBaseStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(device.id)}
                          onChange={() => toggleRowSelect(device.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td style={{ ...tdBaseStyle, textAlign: 'center' }}>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={device.processNo}
                            onChange={(e) => updateDevice(device.id, 'processNo', e.target.value)}
                            style={inputEditStyle}
                            className="text-center"
                          />
                        ) : (
                          <span className="font-semibold">{device.processNo}</span>
                        )}
                      </td>
                      <td style={tdBaseStyle}>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={device.processName}
                            onChange={(e) => updateDevice(device.id, 'processName', e.target.value)}
                            style={inputEditStyle}
                          />
                        ) : (
                          <span>{device.processName}</span>
                        )}
                      </td>
                      <td style={{ ...tdBaseStyle, textAlign: 'center' }}>
                        {isEditMode ? (
                          <select
                            value={device.category}
                            onChange={(e) => updateDevice(device.id, 'category', e.target.value)}
                            style={{ ...inputEditStyle, cursor: 'pointer' }}
                          >
                            <option value="Error Proof">Error Proof</option>
                            <option value="자동검사">자동검사</option>
                          </select>
                        ) : (
                          <span className={`font-semibold ${
                            device.category === 'Error Proof' ? 'text-indigo-700' : 'text-cyan-700'
                          }`}>
                            {device.category}
                          </span>
                        )}
                      </td>
                      <td style={tdBaseStyle}>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={device.deviceName}
                            onChange={(e) => updateDevice(device.id, 'deviceName', e.target.value)}
                            style={inputEditStyle}
                          />
                        ) : (
                          <span className="font-medium">{device.deviceName}</span>
                        )}
                      </td>
                      <td style={tdBaseStyle}>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={device.purpose}
                            onChange={(e) => updateDevice(device.id, 'purpose', e.target.value)}
                            style={inputEditStyle}
                          />
                        ) : (
                          <span className="text-gray-600">{device.purpose}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 푸터 */}
        <div className="py-3 px-6 bg-gray-100 border-t border-gray-300 text-[11px] text-gray-600 flex justify-between items-center">
          <span>
            총 {filteredDevices.length}개 항목 |{' '}
            {activeTab === 'all' ? '전체' : activeTab === 'ep' ? 'Error Proof' : '자동검사'} 장치 목록
          </span>
          {selectedRows.size > 0 && (
            <span className="text-blue-600 font-semibold">{selectedRows.size}개 선택됨</span>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
