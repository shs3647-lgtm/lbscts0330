'use client';

/**
 * @file 고객사정보 기초정보 페이지
 * @description 고객사 기초정보 관리 - localStorage 기반 양방향 동기화
 * @version 1.0.0
 * @created 2026-01-10
 */

import React, { useState, useEffect, useRef } from 'react';
import { BizInfoCustomer, BIZINFO_STORAGE_KEYS } from '@/types/bizinfo';
import { getAllCustomers, createCustomer, deleteCustomer, createSampleBizInfo } from '@/lib/bizinfo-db';
import { downloadStyledExcel } from '@/lib/excel-utils';
import * as XLSX from 'xlsx';

// UUID 생성
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function CustomerMasterPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<BizInfoCustomer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<BizInfoCustomer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 로드
  useEffect(() => {
    createSampleBizInfo();
    refreshData();
  }, []);

  const refreshData = async () => {
    const loadedCustomers = await getAllCustomers();
    setCustomers(loadedCustomers);
  };

  // 검색 필터링
  const filteredCustomers = customers.filter(customer =>
    customer.name.includes(searchTerm) ||
    customer.code.includes(searchTerm) ||
    customer.factory.includes(searchTerm)
  );

  // 신규 추가
  const handleAdd = () => {
    const now = new Date().toISOString();
    const newCustomer: BizInfoCustomer = {
      id: generateUUID(),
      name: '',
      code: '',
      factory: '',
      createdAt: now,
      updatedAt: now
    };
    setEditingCustomer(newCustomer);
  };

  // 저장
  const handleSave = async () => {
    if (editingCustomer) {
      if (!editingCustomer.name) {
        alert('고객사명은 필수입니다.');
        return;
      }
      const existing = await getAllCustomers();
      const idx = existing.findIndex(c => c.id === editingCustomer.id);
      if (idx >= 0) {
        existing[idx] = { ...editingCustomer, updatedAt: new Date().toISOString() };
      } else {
        existing.push(editingCustomer);
      }
      localStorage.setItem(BIZINFO_STORAGE_KEYS.customers, JSON.stringify(existing));
      const savedId = editingCustomer.id;
      setEditingCustomer(null);
      refreshData();
      setSelectedId(savedId);
    }
  };

  // 삭제
  const handleDelete = () => {
    if (selectedId) {
      if (confirm('선택한 고객사를 삭제하시겠습니까?')) {
        deleteCustomer(selectedId);
        refreshData();
        setSelectedId(null);
      }
    } else {
      alert('삭제할 고객사를 선택해주세요.');
    }
  };

  // Export (엑셀 다운로드)
  const handleExport = () => {
    const headers = ['고객사명', '코드', '공장'];
    const colWidths = [20, 10, 20];
    const data = customers.map(c => [
      c.name,
      c.code,
      c.factory
    ]);
    downloadStyledExcel(headers, data, colWidths, '고객사정보', `고객사정보_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Import (엑셀 업로드)
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

      const dataRows = jsonData.slice(1).filter(row => row.length > 0 && row[0]);
      
      if (dataRows.length === 0) {
        alert('❌ 데이터가 없습니다.');
        return;
      }

      const now = new Date().toISOString();
      let importedCount = 0;

      for (const row of dataRows) {
        const newCustomer: BizInfoCustomer = {
          id: generateUUID(),
          name: String(row[0] || ''),
          code: String(row[1] || ''),
          factory: String(row[2] || ''),
          createdAt: now,
          updatedAt: now
        };

        if (newCustomer.name) {
          const existing = await getAllCustomers();
          existing.push(newCustomer);
          localStorage.setItem(BIZINFO_STORAGE_KEYS.customers, JSON.stringify(existing));
          importedCount++;
        }
      }

      refreshData();
      alert(`✅ ${importedCount}개 고객사 Import 완료!`);
    } catch (err) {
      console.error('Import 오류:', err);
      alert('❌ 엑셀 파일 읽기 오류');
    }
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 pt-8">
      {/* 헤더 */}
      <div className="bg-[#37474f] px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          🏢 고객사 정보 관리
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={handleImport} className="px-3 py-1.5 text-xs font-semibold bg-white text-[#37474f] rounded hover:bg-gray-100">
            📥 Import
          </button>
          <button onClick={handleExport} className="px-3 py-1.5 text-xs font-semibold bg-white text-[#37474f] rounded hover:bg-gray-100">
            📤 Export
          </button>
          <button onClick={handleAdd} className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded hover:bg-green-600">
            ➕ 추가
          </button>
          <button 
            onClick={() => {
              if (editingCustomer) {
                handleSave();
              } else if (selectedId) {
                const customer = customers.find(c => c.id === selectedId);
                if (customer) setEditingCustomer({...customer});
              } else {
                alert('수정할 고객사를 선택해주세요.');
              }
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded ${
              editingCustomer 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            {editingCustomer ? '💾 저장' : '✏️ 수정'}
          </button>
          <button onClick={handleDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded hover:bg-red-600">
            🗑️ 삭제
          </button>
        </div>
      </div>

      {/* 파일 입력 (숨김) */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />

      {/* 검색 */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <input
          type="text"
          placeholder="🔍 검색 (고객사명/코드/공장)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* 편집 폼 */}
      {editingCustomer && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
          <p className="text-sm font-semibold text-blue-700 mb-3">
            📝 고객사 {customers.find(c => c.id === editingCustomer.id) ? '수정' : '신규 등록'}
          </p>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">고객사명 *</label>
              <input type="text" value={editingCustomer.name} onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="현대자동차" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">코드</label>
              <input type="text" value={editingCustomer.code} onChange={(e) => setEditingCustomer({...editingCustomer, code: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="HMC" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">공장</label>
              <input type="text" value={editingCustomer.factory} onChange={(e) => setEditingCustomer({...editingCustomer, factory: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="울산공장" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleSave} className="px-4 py-1.5 text-sm font-semibold bg-blue-500 text-white rounded hover:bg-blue-600">💾 저장</button>
              <button onClick={() => setEditingCustomer(null)} className="px-4 py-1.5 text-sm font-semibold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="flex-1 overflow-auto px-4 py-3">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            고객사가 없습니다. [➕ 추가] 또는 [📥 Import]로 등록하세요.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-[#37474f] text-white">
              <tr>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold w-10">✓</th>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold">고객사명</th>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold w-24">코드</th>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold">공장</th>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold w-32">등록일</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => (
                <tr
                  key={customer.id}
                  onClick={() => setSelectedId(customer.id)}
                  onDoubleClick={() => setEditingCustomer({...customer})}
                  className={`cursor-pointer hover:bg-blue-100 transition-colors ${
                    selectedId === customer.id 
                      ? 'bg-blue-200' 
                      : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    <input type="radio" checked={selectedId === customer.id} onChange={() => setSelectedId(customer.id)} className="w-4 h-4" />
                  </td>
                  <td className="border border-gray-300 px-2 py-2 font-semibold">{customer.name}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{customer.code || '-'}</td>
                  <td className="border border-gray-300 px-2 py-2">{customer.factory || '-'}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center text-xs text-gray-500">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 푸터 */}
      <div className="px-4 py-2 border-t border-gray-200 bg-white">
        <span className="text-sm text-gray-500">
          총 {filteredCustomers.length}개 {selectedId && '| 선택: 1개'}
        </span>
        <span className="text-xs text-gray-400 ml-4">
          💡 이 데이터는 FMEA 등록화면의 고객사 선택과 자동 동기화됩니다.
        </span>
      </div>
    </div>
  );
}










