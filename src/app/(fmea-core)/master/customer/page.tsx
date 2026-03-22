'use client';

/**
 * @file 고객사정보 기초정보 페이지
 * @description 고객사 기초정보 관리 - localStorage 기반 양방향 동기화
 * @version 1.1.0
 * @updated 2026-01-26 AdminTopNav 추가
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BizInfoCustomer } from '@/types/bizinfo';
import { getAllCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/lib/bizinfo-db';
import { downloadStyledExcel } from '@/lib/excel-utils';
import { FixedLayout, AdminTopNav } from '@/components/layout';
import { useLocale } from '@/lib/locale';
import * as XLSX from 'xlsx';

export default function CustomerMasterPage() {
  const { t } = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<BizInfoCustomer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<BizInfoCustomer | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // 데이터 로드
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const loadedCustomers = await getAllCustomers();
      setCustomers(loadedCustomers);
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  const filteredCustomers = customers.filter(customer =>
    customer.name.includes(searchTerm) ||
    customer.code.includes(searchTerm) ||
    customer.factory.includes(searchTerm)
  );

  // ✅ 자동저장 (디바운스 800ms)
  const doAutoSave = useCallback(async (cust: BizInfoCustomer) => {
    if (!cust.name) return; // 이름 필수
    setAutoSaveStatus('saving');
    try {
      const isExisting = customers.some(c => c.id === cust.id);
      if (isExisting) {
        await updateCustomer(cust);
      } else {
        await createCustomer({ name: cust.name, code: cust.code, factory: cust.factory });
      }
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 1500);
      await refreshData();
    } catch (err) {
      console.error('자동저장 오류:', err);
      setAutoSaveStatus('idle');
    }
  }, [customers]);

  // ✅ editingCustomer 변경 시 자동저장 트리거
  useEffect(() => {
    if (!editingCustomer || !editingCustomer.name) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => doAutoSave(editingCustomer), 800);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [editingCustomer, doAutoSave]);

  // 신규 추가
  const handleAdd = () => {
    const now = new Date().toISOString();
    const newCustomer: BizInfoCustomer = {
      id: crypto.randomUUID(),
      name: '',
      code: '',
      factory: '',
      createdAt: now,
      updatedAt: now
    };
    setEditingCustomer(newCustomer);
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

  // Export
  const handleExport = () => {
    const headers = ['회사명', '코드', '공장'];
    const colWidths = [20, 10, 20];
    const data = customers.map(c => [
      c.name,
      c.code,
      c.factory
    ]);
    downloadStyledExcel(headers, data, colWidths, '회사명정보', `회사명정보_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Import
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

      let importedCount = 0;

      for (const row of dataRows) {
        const name = String(row[0] || '').trim();
        const code = String(row[1] || '').trim();
        const factory = String(row[2] || '').trim();

        if (name) {
          try {
            await createCustomer({ name, code, factory });
            importedCount++;
          } catch (err) {
          }
        }
      }

      refreshData();
      alert(`✅ ${importedCount}건 Import 완료!`);
    } catch (err) {
      console.error('Import 오류:', err);
      alert('❌ 엑셀 파일 읽기 오류');
    }
    e.target.value = '';
  };

  return (
    <FixedLayout topNav={<AdminTopNav />} showSidebar={true}>
      <div className="h-full flex flex-col bg-gray-50">
        {/* 헤더 — 예전 CFT와 동일: Import / Export / 추가 / 수정 / 삭제 (가로 한 줄) */}
        <div className="bg-[#00587a] px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            🏢 {t('회사명')} {t('정보')}
          </h1>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleImport}
              className="px-3 py-1.5 text-xs font-semibold bg-white text-[#00587a] rounded hover:bg-gray-100"
            >
              📥 Import
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-1.5 text-xs font-semibold bg-white text-[#00587a] rounded hover:bg-gray-100"
            >
              📤 Export
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➕ {t('추가')}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (selectedId) {
                  const customer = customers.find((c) => c.id === selectedId);
                  if (customer) setEditingCustomer({ ...customer });
                } else {
                  alert('수정할 항목을 선택해주세요.');
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✏️ {t('수정')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑️ {t('삭제')}
            </button>
            {autoSaveStatus === 'saving' && (
              <span className="text-[10px] text-yellow-200 animate-pulse">{t('저장중')}</span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="text-[10px] text-green-200">{t('저장됨')}</span>
            )}
          </div>
        </div>

        {/* 파일 입력 */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />

        {/* 검색 */}
        <div className="px-4 py-3 bg-white border-b border-gray-200">
          <input
            type="text"
            placeholder="🔍 검색 (회사명/코드/공장)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 편집 폼 (자동저장 - 입력 후 0.8초 후 자동 DB 저장) */}
        {editingCustomer && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-blue-700 shrink-0">
                {customers.find(c => c.id === editingCustomer.id) ? t('수정') : t('신규')}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <input type="text" value={editingCustomer.name} onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder={`${t('회사명')} *`} autoFocus />
                <input type="text" value={editingCustomer.code} onChange={(e) => setEditingCustomer({ ...editingCustomer, code: e.target.value })}
                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder={t('코드')} />
                <input type="text" value={editingCustomer.factory} onChange={(e) => setEditingCustomer({ ...editingCustomer, factory: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder={t('공장')} />
                <button onClick={() => setEditingCustomer(null)} className="px-3 py-1 text-xs font-semibold bg-gray-300 text-gray-700 rounded hover:bg-gray-400 cursor-pointer shrink-0">{t('닫기')}</button>
              </div>
              {autoSaveStatus === 'saving' && <span className="text-[10px] text-amber-600 animate-pulse shrink-0">{t('저장중')}...</span>}
              {autoSaveStatus === 'saved' && <span className="text-[10px] text-green-600 shrink-0">{t('자동저장됨')}</span>}
            </div>
          </div>
        )}

        {/* 테이블 */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              고객사 정보를 불러오는 중...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              고객사가 없습니다. [➕ 추가] 또는 [📥 Import]로 등록하세요.
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-[#00587a] text-white">
                <tr>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold w-10">✓</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold" title="Company Name">회사명(Company Name)</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold w-24" title="Code">코드(Code)</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold" title="Factory">공장(Factory)</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold w-32" title="Registration Date">등록일(Reg. Date)</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => (
                  <tr
                    key={customer.id}
                    onClick={() => setSelectedId(customer.id)}
                    onDoubleClick={() => setEditingCustomer({ ...customer })}
                    className={`cursor-pointer hover:bg-blue-100 transition-colors ${selectedId === customer.id
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
            {t('총')} {filteredCustomers.length}{t('개')} {selectedId && `| ${t('선택')}: 1${t('개')}`}
          </span>
          <span className="text-xs text-gray-400 ml-4">
            💡 이 데이터는 FMEA 등록화면의 고객사 선택과 자동 동기화됩니다.
          </span>
        </div>
      </div>
    </FixedLayout>
  );
}
