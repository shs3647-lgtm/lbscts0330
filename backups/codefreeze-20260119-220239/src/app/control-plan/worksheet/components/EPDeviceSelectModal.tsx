/**
 * @file EPDeviceSelectModal.tsx
 * @description CP 워크시트에서 EP/자동검사 체크박스 클릭 시 EP검사장치 선택 모달
 *
 * - 해당 공정에 등록 가능한 EP검사장치 목록 표시
 * - 체크박스로 다중 선택 가능
 * - 선택된 장치는 해당 행의 EP/자동검사 필드에 연동
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';

// EP검사장치 타입 (pfmea/worksheet/types/epDevice.ts와 호환)
interface EPDevice {
  id: string;
  processNo: string;
  processName: string;
  category: 'Error Proof' | '자동검사' | '없음';
  deviceName: string;
  purpose?: string;
}

interface EPDeviceSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 현재 행 정보
  processNo: string;
  processName: string;
  category: 'EP' | '자동검사'; // 클릭한 체크박스 종류
  // 전체 EP검사장치 목록
  allDevices: EPDevice[];
  // 현재 선택된 장치 ID 목록
  selectedDeviceIds: string[];
  // 선택 변경 시 콜백
  onSelectionChange: (deviceIds: string[]) => void;
  // 체크박스 값 변경 콜백 (true/false)
  onCheckboxChange: (checked: boolean) => void;
}

export default function EPDeviceSelectModal({
  isOpen,
  onClose,
  processNo,
  processName,
  category,
  allDevices,
  selectedDeviceIds,
  onSelectionChange,
  onCheckboxChange,
}: EPDeviceSelectModalProps) {
  const [mounted, setMounted] = useState(false);
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedDeviceIds));

  useEffect(() => {
    setMounted(true);
  }, []);

  // 선택 초기화
  useEffect(() => {
    if (isOpen) {
      setLocalSelected(new Set(selectedDeviceIds));
    }
  }, [isOpen, selectedDeviceIds]);

  // 해당 공정 & 카테고리에 맞는 장치 필터링
  const filteredDevices = useMemo(() => {
    const targetCategory = category === 'EP' ? 'Error Proof' : '자동검사';
    return allDevices.filter(d => {
      // 같은 공정번호 또는 공정번호가 비어있는 장치 (전체 공통 장치)
      const matchProcess = !d.processNo || d.processNo === processNo;
      const matchCategory = d.category === targetCategory;
      return matchProcess && matchCategory;
    });
  }, [allDevices, processNo, category]);

  // 장치 선택 토글
  const toggleDevice = (deviceId: string) => {
    setLocalSelected(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  // 전체 선택/해제
  const toggleAll = () => {
    if (localSelected.size === filteredDevices.length) {
      setLocalSelected(new Set());
    } else {
      setLocalSelected(new Set(filteredDevices.map(d => d.id)));
    }
  };

  // 확인 버튼
  const handleConfirm = () => {
    const selectedIds = Array.from(localSelected);
    onSelectionChange(selectedIds);
    // 하나 이상 선택되면 체크박스 true, 아니면 false
    onCheckboxChange(selectedIds.length > 0);
    onClose();
  };

  // 취소 버튼
  const handleCancel = () => {
    onClose();
  };

  if (!mounted || !isOpen) return null;

  const categoryLabel = category === 'EP' ? 'Error Proof' : '자동검사';
  const headerColor = category === 'EP' ? '#5c6bc0' : '#0288d1';

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/40">
      <div className="bg-white rounded-xl w-[90%] max-w-[600px] max-h-[70vh] flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div
          className="text-white py-3 px-5 rounded-t-xl flex justify-between items-center"
          style={{ background: headerColor }}
        >
          <div>
            <h3 className="text-base font-bold m-0">
              {category === 'EP' ? '🛡️' : '🔍'} {categoryLabel} 장치 선택
            </h3>
            <p className="text-xs opacity-80 mt-1">
              공정: {processNo} {processName}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-white hover:text-gray-200 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-4">
          {filteredDevices.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p className="text-lg mb-2">등록된 {categoryLabel} 장치가 없습니다.</p>
              <p className="text-sm">
                EP검사장치 기초정보에서 먼저 장치를 등록해주세요.
              </p>
            </div>
          ) : (
            <>
              {/* 전체 선택 */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <input
                  type="checkbox"
                  checked={localSelected.size === filteredDevices.length && filteredDevices.length > 0}
                  onChange={toggleAll}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-gray-700">
                  전체 선택 ({localSelected.size}/{filteredDevices.length})
                </span>
              </div>

              {/* 장치 목록 */}
              <div className="space-y-2">
                {filteredDevices.map((device) => (
                  <label
                    key={device.id}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      localSelected.has(device.id)
                        ? 'bg-blue-50 border border-blue-300'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={localSelected.has(device.id)}
                      onChange={() => toggleDevice(device.id)}
                      className="w-4 h-4 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-800">
                        {device.deviceName}
                      </div>
                      {device.purpose && (
                        <div className="text-xs text-gray-500 mt-1">
                          {device.purpose}
                        </div>
                      )}
                      {device.processNo && (
                        <div className="text-xs text-gray-400 mt-1">
                          공정: {device.processNo} {device.processName}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="py-3 px-5 bg-gray-100 rounded-b-xl flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {localSelected.size > 0
              ? `${localSelected.size}개 장치 선택됨`
              : '장치를 선택해주세요'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-400 text-white text-sm font-semibold rounded hover:bg-gray-500 transition"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-white text-sm font-semibold rounded transition"
              style={{ background: headerColor }}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
