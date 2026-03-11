// @ts-nocheck
/**
 * @file EPDevicePopup.tsx
 * @description EP/자동검사 장치 선택 팝업 모달
 *
 * CP 테이블에서 EP/자동검사 셀 클릭 시 해당 공정의 장치 목록을 보여줌
 * SOD 모달과 동일한 스타일 (블루/베이지)
 */

'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EPDevice, EPDeviceCategory, getDevicesForProcess } from '../../types/epDevice';

interface EPDevicePopupProps {
  isOpen: boolean;
  onClose: () => void;
  processNo: string;
  processName: string;
  category: 'ep' | 'autoInspect';  // 어떤 열을 클릭했는지
  devices: EPDevice[];             // 전체 EP검사장치 목록
  selectedDeviceIds: string[];     // 현재 선택된 장치 ID들
  onSelect: (deviceIds: string[]) => void;  // 선택 완료 콜백
}

// 스타일 상수
const btnStyle = (bg: string): React.CSSProperties => ({
  padding: '6px 14px', background: bg, color: 'white', border: 'none', borderRadius: '4px',
  fontSize: '12px', fontWeight: 600, cursor: 'pointer'
});

export default function EPDevicePopup({
  isOpen,
  onClose,
  processNo,
  processName,
  category,
  devices,
  selectedDeviceIds,
  onSelect,
}: EPDevicePopupProps) {
  const [mounted, setMounted] = useState(false);
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set(selectedDeviceIds));

  useEffect(() => {
    setMounted(true);
  }, []);

  // 해당 공정/구분의 장치만 필터링
  const filteredDevices = useMemo(() => {
    const cat: EPDeviceCategory = category === 'ep' ? 'Error Proof' : '자동검사';
    return getDevicesForProcess(devices, processNo, cat);
  }, [devices, processNo, category]);

  // 팝업 열릴 때 선택 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(selectedDeviceIds));
    }
  }, [isOpen, selectedDeviceIds]);

  // 장치 토글
  const toggleDevice = (deviceId: string) => {
    setTempSelected(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) next.delete(deviceId);
      else next.add(deviceId);
      return next;
    });
  };

  // 전체 선택/해제
  const toggleAll = () => {
    if (tempSelected.size === filteredDevices.length) {
      setTempSelected(new Set());
    } else {
      setTempSelected(new Set(filteredDevices.map(d => d.id)));
    }
  };

  // 확인 버튼
  const handleConfirm = () => {
    onSelect(Array.from(tempSelected));
    onClose();
  };

  if (!mounted || !isOpen) return null;

  const categoryLabel = category === 'ep' ? 'Error Proof (EP)' : '자동검사';

  // 헤더 그라데이션 (블루 계열)
  const headerGradientStyle: React.CSSProperties = {
    background: category === 'ep'
      ? 'linear-gradient(135deg, #5c6bc0 0%, #7986cb 100%)'
      : 'linear-gradient(135deg, #0288d1 0%, #03a9f4 100%)'
  };

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/50">
      <div className="bg-white rounded-xl w-[600px] max-h-[70vh] flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="text-white py-3 px-5 rounded-t-xl flex justify-between items-center" style={headerGradientStyle}>
          <div>
            <h3 className="m-0 text-base font-bold">
              {category === 'ep' ? '🛡️' : '🔍'} {categoryLabel} 장치 선택
            </h3>
            <p className="mt-0.5 text-xs opacity-80">
              공정 {processNo}: {processName}
            </p>
          </div>
          <button onClick={onClose} style={btnStyle('#ffffff30')} className="hover:bg-white/20">
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-4">
          {filteredDevices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-base mb-2">등록된 {categoryLabel} 장치가 없습니다.</p>
              <p className="text-sm">[EP검사장치] 메뉴에서 장치를 먼저 등록해주세요.</p>
            </div>
          ) : (
            <>
              {/* 전체 선택 */}
              <div className="mb-3 flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempSelected.size === filteredDevices.length}
                    onChange={toggleAll}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    전체 선택 ({tempSelected.size}/{filteredDevices.length})
                  </span>
                </label>
              </div>

              {/* 장치 목록 */}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: '#1565c0', color: 'white' }}>
                    <th className="w-[40px] py-2 px-2 border border-blue-400 text-center">선택</th>
                    <th className="py-2 px-3 border border-blue-400 text-left" style={{ width: '180px' }}>장치명</th>
                    <th className="py-2 px-3 border border-blue-400 text-left">기능/목적</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((device, idx) => {
                    const isSelected = tempSelected.has(device.id);
                    const rowBg = isSelected
                      ? '#e3f2fd'
                      : idx % 2 === 0 ? '#faf8f5' : '#f5f3f0';

                    return (
                      <tr
                        key={device.id}
                        style={{ background: rowBg, cursor: 'pointer' }}
                        onClick={() => toggleDevice(device.id)}
                        className="hover:bg-blue-50"
                      >
                        <td className="py-2 px-2 border border-gray-200 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDevice(device.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="py-2 px-3 border border-gray-200 font-medium">
                          {device.deviceName}
                        </td>
                        <td className="py-2 px-3 border border-gray-200 text-gray-600">
                          {device.purpose}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="py-3 px-5 border-t bg-gray-50 flex items-center justify-between rounded-b-xl">
          <div className="text-sm text-gray-500">
            {tempSelected.size > 0 && (
              <span className="font-semibold text-blue-600">
                ✓ {tempSelected.size}개 장치 선택됨
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} style={btnStyle('#9e9e9e')}>취소</button>
            <button onClick={handleConfirm} style={btnStyle('#1565c0')}>확인</button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
