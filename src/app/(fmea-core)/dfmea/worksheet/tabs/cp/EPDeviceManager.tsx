// CODEFREEZE
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
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
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

// 메인 탭 타입 (마스터/CP별)
type MainTabType = 'master' | 'cp';
// 서브 탭 타입 (카테고리별)
type SubTabType = 'all' | 'ep' | 'autoInspect';

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
  // CP NO가 유효한지 확인
  const hasValidCpNo = cpNo && cpNo !== '__NEW__';

  // 메인 탭: 항상 마스터가 기본
  const [mainTab, setMainTab] = useState<MainTabType>('master');
  const [subTab, setSubTab] = useState<SubTabType>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 700, height: 500, minWidth: 400, minHeight: 280 });
  const [isSaving, setIsSaving] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // DB에서 EP검사장치 로드 (마스터 + CP별 모두)
  useEffect(() => {
    if (!isOpen) return;
    const loadAllDevices = async () => {
      try {
        // 마스터와 CP별 데이터를 모두 로드
        const allDevices: EPDevice[] = [];

        // 1. 마스터 로드
        const masterRes = await fetch('/api/ep-device?isMaster=true');
        if (masterRes.ok) {
          const masterData = await masterRes.json();
          if (masterData.success && masterData.data) {
            allDevices.push(...masterData.data);
          }
        }

        // 2. CP별 로드 (cpNo가 있을 때만)
        if (hasValidCpNo) {
          const cpParams = new URLSearchParams();
          cpParams.set('isMaster', 'false');
          cpParams.set('cpNo', cpNo!);

          const cpRes = await fetch(`/api/ep-device?${cpParams.toString()}`);
          if (cpRes.ok) {
            const cpData = await cpRes.json();
            if (cpData.success && cpData.data) {
              allDevices.push(...cpData.data);
            }
          }
        }

        setDevices(allDevices);
      } catch (error) {
        console.error('EP검사장치 로드 오류:', error);
      }
    };
    loadAllDevices();
  }, [isOpen, cpNo, hasValidCpNo, setDevices]);

  // 필터링된 장치 목록 (메인탭 + 서브탭 + 검색)
  const filteredDevices = useMemo(() => {
    let filtered = devices;
    // 메인 탭에 따라 필터링
    filtered = filtered.filter(d => mainTab === 'master' ? d.isMaster : !d.isMaster);
    // 서브 탭에 따라 카테고리 필터링
    if (subTab !== 'all') {
      const category: EPDeviceCategory = subTab === 'ep' ? 'Error Proof' : '자동검사';
      filtered = filtered.filter(d => d.category === category);
    }
    // 검색어 필터링
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(d =>
        d.deviceName?.toLowerCase().includes(search) ||
        d.processName?.toLowerCase().includes(search) ||
        d.epNo?.toLowerCase().includes(search) ||
        d.processNo?.toLowerCase().includes(search)
      );
    }
    return filtered;
  }, [devices, mainTab, subTab, searchText]);

  // 통계
  const stats = useMemo(() => {
    const masterDevices = devices.filter(d => d.isMaster);
    const cpDevices = devices.filter(d => !d.isMaster);
    const currentDevices = mainTab === 'master' ? masterDevices : cpDevices;
    return {
      total: currentDevices.length,
      ep: currentDevices.filter(d => d.category === 'Error Proof').length,
      autoInspect: currentDevices.filter(d => d.category === '자동검사').length,
      processCount: new Set(currentDevices.map(d => d.processNo)).size,
      masterTotal: masterDevices.length,
      cpTotal: cpDevices.length,
    };
  }, [devices, mainTab]);

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
    const isMaster = mainTab === 'master';
    const newDevice = createEmptyEPDevice(
      '',
      '',
      subTab === 'autoInspect' ? '자동검사' : 'Error Proof',
      isMaster,
      isMaster ? undefined : (hasValidCpNo ? cpNo : undefined)
    );
    setDevices(prev => [...prev, newDevice]);
  };

  // 장치 수정
   
  const updateDevice = useCallback((id: string, field: keyof EPDevice, value: unknown) => {
    setDevices(prev => prev.map(d => {
      if (d.id !== id) return d;
      return { ...d, [field]: value, updatedAt: new Date() } as EPDevice;
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
    const isMasterTab = mainTab === 'master';
    // 현재 탭에 해당하는 장치만 필터링
    const currentTabDevices = devices.filter(d =>
      isMasterTab ? d.isMaster : !d.isMaster
    );
    // 빈 행 필터링 (장치명이 없는 행은 제외)
    const validDevices = currentTabDevices.filter(d => d.deviceName && d.deviceName.trim() !== '');

    if (validDevices.length === 0) {
      alert('저장할 EP검사장치가 없습니다. 장치명을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      // cpNo가 "__NEW__"이면 null로 저장
      const validCpNo = cpNo && cpNo !== '__NEW__' ? cpNo : null;

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
          cpNo: isMasterTab ? null : validCpNo,
          fmeaId: isMasterTab ? null : fmeaId,
          isMaster: isMasterTab,
          replaceAll: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // 저장 후 서버에서 반환된 데이터로 업데이트 (ID 포함)
          if (data.data) {
            setDevices(prev => {
              // 다른 탭 데이터는 유지, 현재 탭 데이터만 교체
              const otherTabDevices = prev.filter(d =>
                isMasterTab ? !d.isMaster : d.isMaster
              );
              return [...otherTabDevices, ...data.data];
            });
          }
          setIsEditMode(false);
          alert(`${data.count || validDevices.length}개 EP검사장치 저장 완료`);
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
  }, [devices, mainTab, cpNo, fmeaId, setDevices]);

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
    const tabName = subTab === 'ep' ? 'ErrorProof' : subTab === 'autoInspect' ? '자동검사' : '전체';
    const typePrefix = mainTab === 'master' ? 'Master' : `CP-${cpNo}`;
    link.download = `EP검사장치_${typePrefix}_${tabName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredDevices, subTab, mainTab, cpNo]);

  // Import (CSV/Excel)
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
         
        let data: unknown[][] = [];

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
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
          data = jsonData.slice(1); // 헤더 제외
        }

        const newDevices: EPDevice[] = [];
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          // 빈 행이면 건너뛰기 (모든 셀이 비어있는 경우만)
          if (!row || row.length === 0) continue;

          // 모든 셀이 비어있으면 건너뛰기
          const hasAnyData = row.some((cell: unknown) => cell !== null && cell !== undefined && String(cell).trim() !== '');
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

          const isMasterDevice = mainTab === 'master';
          newDevices.push({
            id: `ep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
            epNo: '', // 저장 시 자동 생성
            isMaster: isMasterDevice,
            cpNo: isMasterDevice ? undefined : (hasValidCpNo ? cpNo : undefined),
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
  }, [setDevices, mainTab, hasValidCpNo, cpNo]);

  if (!mounted || !isOpen) return null;

  // 메인 탭 스타일 (마스터/CP별)
  const mainTabBtnStyle = (tab: MainTabType, active: boolean): React.CSSProperties => {
    const colors: Record<MainTabType, string> = {
      master: '#7b1fa2', // 보라색 (마스터)
      cp: '#00695c',     // 틸 (CP별)
    };
    return {
      background: active ? colors[tab] : '#e0e0e0',
      color: active ? 'white' : '#666',
      padding: '8px 16px',
      border: 'none',
      borderRadius: '6px 6px 0 0',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '13px',
      marginRight: '2px',
    };
  };

  // 서브 탭 스타일 (카테고리별)
  const subTabBtnStyle = (tab: SubTabType, active: boolean): React.CSSProperties => {
    const colors: Record<SubTabType, string> = {
      all: '#1565c0',
      ep: '#5c6bc0',
      autoInspect: '#0288d1',
    };
    return {
      background: active ? colors[tab] : '#e0e0e0',
      color: active ? 'white' : '#666',
      padding: '6px 14px',
      border: 'none',
      borderRadius: '16px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '12px',
    };
  };

  // 헤더 그라데이션 (블루 계열)
  const headerGradientStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)'
  };

  const modalContent = (
    <div className="fixed z-[9999] bg-white rounded-xl flex flex-col shadow-2xl select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
      {/* 헤더 */}
      <div className="text-white py-4 px-6 rounded-t-xl flex justify-between items-center cursor-move" style={headerGradientStyle} onMouseDown={onDragStart}>
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
          <button onMouseDown={e => e.stopPropagation()} onClick={handleImport} style={btnStyle('#43a047')}>Import</button>
          <button onMouseDown={e => e.stopPropagation()} onClick={handleExport} style={btnStyle('#fb8c00')}>Export</button>
          {/* 수정/저장 토글 버튼 */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={isEditMode ? handleSave : handleToggleEditMode}
            style={btnStyle(isEditMode ? (isSaving ? '#ff9800' : '#43a047') : '#1e88e5')}
            disabled={isSaving}
          >
            {isSaving ? '⏳ 저장중...' : isEditMode ? '💾 저장' : '✏️ 수정'}
          </button>
          {isEditMode && <button onMouseDown={e => e.stopPropagation()} onClick={() => setIsEditMode(false)} style={btnStyle('#9e9e9e')}>취소</button>}
          <button onMouseDown={e => e.stopPropagation()} onClick={onClose} style={btnStyle('#e53935')}>닫기</button>
        </div>
      </div>

        {/* 메인 탭 (마스터/CP별) */}
        <div className="flex px-6 pt-2" style={{ background: '#f5f5f5' }}>
          <button
            onClick={() => setMainTab('master')}
            style={mainTabBtnStyle('master', mainTab === 'master')}
          >
            🏭 마스터 ({stats.masterTotal})
          </button>
          <button
            onClick={() => { if (hasValidCpNo) setMainTab('cp'); else alert('CP를 먼저 선택해주세요.'); }}
            style={{
              ...mainTabBtnStyle('cp', mainTab === 'cp'),
              opacity: hasValidCpNo ? 1 : 0.5,
              cursor: hasValidCpNo ? 'pointer' : 'not-allowed',
            }}
          >
            📋 CP별 ({stats.cpTotal}) {hasValidCpNo ? `- ${cpNo}` : ''}
          </button>
        </div>

        {/* 통계 바 + 검색 */}
        <div className="flex border-b border-gray-200 items-center justify-between" style={{ background: mainTab === 'master' ? '#f3e5f5' : '#e0f2f1' }}>
          <div className="flex-1 py-2 px-6 flex items-center gap-4 text-sm">
            <span className="font-semibold text-gray-700">📊</span>
            <span className="text-gray-600">공정 <strong className="text-blue-700">{stats.processCount}</strong></span>
            <span className="text-gray-600">EP <strong className="text-indigo-600">{stats.ep}</strong></span>
            <span className="text-gray-600">자동검사 <strong className="text-cyan-600">{stats.autoInspect}</strong></span>
            <span className="text-gray-500">| {mainTab === 'master' ? '마스터' : 'CP별'} {stats.total}개</span>
          </div>
          {/* 검색 */}
          <div className="px-6 py-2">
            <input
              type="text"
              placeholder="🔍 검색 (EP번호, 장치명, 공정명)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm w-[200px]"
            />
          </div>
        </div>

        {/* 서브 탭 & 도구모음 */}
        <div className="flex gap-2 py-2 px-6 bg-gray-50 items-center justify-between border-b">
          {/* 서브 탭 (카테고리) */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSubTab('all')} style={subTabBtnStyle('all', subTab === 'all')}>
              전체
            </button>
            <button onClick={() => setSubTab('ep')} style={subTabBtnStyle('ep', subTab === 'ep')}>
              🛡️ EP
            </button>
            <button onClick={() => setSubTab('autoInspect')} style={subTabBtnStyle('autoInspect', subTab === 'autoInspect')}>
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
                <tr style={{ background: mainTab === 'master' ? '#7b1fa2' : '#00695c', color: 'white' }}>
                  <th className="p-2 border border-white/30 w-[35px] text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === filteredDevices.length && filteredDevices.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="p-2 border border-white/30 w-[70px] text-center">공정번호</th>
                  <th className="p-2 border border-white/30 w-[100px] text-center">공정명</th>
                  <th className="p-2 border border-white/30 w-[220px] text-center">장치명</th>
                  <th className="p-2 border border-white/30 w-[80px] text-center">구분</th>
                  <th className="p-2 border border-white/30 text-center">기능/목적</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device, idx) => {
                  // 마스터/CP에 따른 행 배경색
                  const rowBg = mainTab === 'master'
                    ? (idx % 2 === 0 ? '#faf5ff' : '#f3e8ff') // 연한 보라색
                    : (idx % 2 === 0 ? '#f0fdfa' : '#e6fffa'); // 연한 틸색

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
                      {/* 공정번호 */}
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
                      {/* 공정명 */}
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
                      {/* ★ 장치명 (구분 앞으로 이동) */}
                      <td style={tdBaseStyle}>
                        {isEditMode ? (
                          <input
                            type="text"
                            value={device.deviceName}
                            onChange={(e) => updateDevice(device.id, 'deviceName', e.target.value)}
                            style={inputEditStyle}
                          />
                        ) : (
                          <span className="font-medium text-blue-800">{device.deviceName}</span>
                        )}
                      </td>
                      {/* 구분 */}
                      <td style={{ ...tdBaseStyle, textAlign: 'center' }}>
                        {isEditMode ? (
                          <select
                            value={device.category}
                            onChange={(e) => updateDevice(device.id, 'category', e.target.value)}
                            style={{ ...inputEditStyle, cursor: 'pointer' }}
                          >
                            <option value="Error Proof">EP</option>
                            <option value="자동검사">자동</option>
                          </select>
                        ) : (
                          <span className={`font-semibold text-[10px] ${device.category === 'Error Proof' ? 'text-indigo-700' : 'text-cyan-700'
                            }`}>
                            {device.category === 'Error Proof' ? 'EP' : '자동'}
                          </span>
                        )}
                      </td>
                      {/* 기능/목적 */}
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
            {mainTab === 'master' ? '🏭 마스터' : `📋 CP별 (${cpNo})`} |{' '}
            {subTab === 'all' ? '전체' : subTab === 'ep' ? 'Error Proof' : '자동검사'} 장치 목록
          </span>
          {selectedRows.size > 0 && (
            <span className="text-blue-600 font-semibold">{selectedRows.size}개 선택됨</span>
          )}
        </div>

      {/* 리사이즈 핸들 */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
