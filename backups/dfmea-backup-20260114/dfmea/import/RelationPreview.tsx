/**
 * @file RelationPreview.tsx
 * @description 관계형 DATA 미리보기 컴포넌트
 * @author AI Assistant
 * @created 2025-12-26
 * @updated 2025-12-26 - 다운로드/입포트 탭 추가
 * 
 * L2 고장형태, L3 고장원인, L1 고장영향, 다운로드, 입포트 탭
 * 각 탭 클릭시 해당 데이터 표 형식으로 미리보기
 * 세로 스크롤 (디폴트 20행)
 */

'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Upload, FileSpreadsheet, Check, Save } from 'lucide-react';
import { ImportedFlatData } from './types';
import ExcelJS from 'exceljs';

interface RelationPreviewProps {
  data: ImportedFlatData[];
  onDataChange?: (data: ImportedFlatData[]) => void;
}

// 탭 정의
const TABS = [
  { 
    code: 'A', 
    label: 'L2 고장형태', 
    color: 'blue',
    columns: [
      { code: 'A1', label: '공정번호' },
      { code: 'A2', label: '공정명' },
      { code: 'A3', label: '공정기능' },
      { code: 'A4', label: '제품특성' },
      { code: 'A5', label: '고장형태' },
      { code: 'A6', label: '검출관리' },
    ]
  },
  { 
    code: 'B', 
    label: 'L3 고장원인', 
    color: 'green',
    columns: [
      { code: 'A1', label: '공정번호' },
      { code: 'B1', label: '작업요소' },
      { code: 'B2', label: '요소기능' },
      { code: 'B3', label: '공정특성' },
      { code: 'B4', label: '고장원인' },
      { code: 'B5', label: '예방관리' },
    ]
  },
  { 
    code: 'C', 
    label: 'L1 고장영향', 
    color: 'red',
    columns: [
      { code: 'C1', label: '구분' },  // YOUR PLANT, SHIP TO PLANT, USER
      { code: 'C2', label: '제품기능' },
      { code: 'C3', label: '요구사항' },
      { code: 'C4', label: '고장영향' },
    ]
  },
  {
    code: 'download',
    label: '다운로드',
    color: 'yellow',
    columns: []
  },
  {
    code: 'import',
    label: '입포트',
    color: 'yellow',
    columns: []
  },
  {
    code: 'save',
    label: '저장',
    color: 'purple',
    columns: []
  },
];

export default function RelationPreview({ data, onDataChange }: RelationPreviewProps) {
  const [activeTab, setActiveTab] = useState('A');
  const [importFileName, setImportFileName] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 현재 탭 정보
  const currentTab = TABS.find(t => t.code === activeTab);

  // 공정번호 목록 추출
  const processNos = useMemo(() => {
    const nos = new Set<string>();
    data.filter(d => d.itemCode === 'A1').forEach(d => {
      if (d.processNo) nos.add(d.processNo);
      if (d.value) nos.add(d.value);
    });
    return Array.from(nos).sort();
  }, [data]);

  // 완제품 목록 추출 (C 탭용)
  const productNames = useMemo(() => {
    const names = new Set<string>();
    data.filter(d => d.itemCode === 'C1').forEach(d => {
      if (d.value) names.add(d.value);
    });
    return Array.from(names);
  }, [data]);

  // 특정 공정번호의 특정 항목 값 가져오기
  const getValue = (processNo: string, itemCode: string) => {
    const item = data.find(d => d.processNo === processNo && d.itemCode === itemCode);
    return item?.value || '';
  };

  // C 탭용: 특정 제품명의 특정 항목 값 가져오기
  const getProductValue = (productName: string, itemCode: string) => {
    if (itemCode === 'C1') return productName;
    const item = data.find(d => {
      const c1Item = data.find(c => c.itemCode === 'C1' && c.value === productName);
      return d.itemCode === itemCode && c1Item;
    });
    return item?.value || '';
  };

  // 저장 상태
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // 탭 색상
  const getTabColor = (tab: typeof TABS[number]) => {
    const colors: Record<string, { active: string; inactive: string }> = {
      blue: { active: 'bg-blue-600 text-white', inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      green: { active: 'bg-green-600 text-white', inactive: 'bg-green-50 text-green-700 hover:bg-green-100' },
      red: { active: 'bg-red-600 text-white', inactive: 'bg-red-50 text-red-700 hover:bg-red-100' },
      yellow: { active: 'bg-yellow-500 text-white', inactive: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
      purple: { active: 'bg-purple-600 text-white', inactive: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
    };
    return activeTab === tab.code ? colors[tab.color].active : colors[tab.color].inactive;
  };

  // 관계형 데이터 저장 (DB)
  const handleSave = async () => {
    if (data.length === 0) return;
    
    setSaveStatus('saving');
    
    try {
      // TODO: 실제 API 호출로 변경
      // const response = await fetch('/api/pfmea/relation-data', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ data }),
      // });
      
      // 시뮬레이션: 1.5초 후 저장 완료
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSaveStatus('success');
      
      // 3초 후 상태 초기화
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // 관계형 데이터 다운로드
  const handleDownload = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FMEA Smart System';
    workbook.created = new Date();

    // L2 고장형태 시트
    const sheetA = workbook.addWorksheet('L2 고장형태', { properties: { tabColor: { argb: '3B82F6' } } });
    sheetA.columns = [
      { header: 'A1.공정번호', key: 'A1', width: 12 },
      { header: 'A2.공정명', key: 'A2', width: 15 },
      { header: 'A3.공정기능', key: 'A3', width: 25 },
      { header: 'A4.제품특성', key: 'A4', width: 20 },
      { header: 'A5.고장형태', key: 'A5', width: 20 },
      { header: 'A6.검출관리', key: 'A6', width: 20 },
    ];
    processNos.forEach(pNo => {
      sheetA.addRow({
        A1: pNo,
        A2: getValue(pNo, 'A2'),
        A3: getValue(pNo, 'A3'),
        A4: getValue(pNo, 'A4'),
        A5: getValue(pNo, 'A5'),
        A6: getValue(pNo, 'A6'),
      });
    });

    // L3 고장원인 시트
    const sheetB = workbook.addWorksheet('L3 고장원인', { properties: { tabColor: { argb: '22C55E' } } });
    sheetB.columns = [
      { header: 'A1.공정번호', key: 'A1', width: 12 },
      { header: 'B1.작업요소', key: 'B1', width: 15 },
      { header: 'B2.요소기능', key: 'B2', width: 20 },
      { header: 'B3.공정특성', key: 'B3', width: 20 },
      { header: 'B4.고장원인', key: 'B4', width: 20 },
      { header: 'B5.예방관리', key: 'B5', width: 20 },
    ];
    processNos.forEach(pNo => {
      sheetB.addRow({
        A1: pNo,
        B1: getValue(pNo, 'B1'),
        B2: getValue(pNo, 'B2'),
        B3: getValue(pNo, 'B3'),
        B4: getValue(pNo, 'B4'),
        B5: getValue(pNo, 'B5'),
      });
    });

    // L1 고장영향 시트
    const sheetC = workbook.addWorksheet('L1 고장영향', { properties: { tabColor: { argb: 'EF4444' } } });
    sheetC.columns = [
      { header: 'C1.구분', key: 'C1', width: 15 },  // YOUR PLANT, SHIP TO PLANT, USER
      { header: 'C2.제품기능', key: 'C2', width: 20 },
      { header: 'C3.요구사항', key: 'C3', width: 20 },
      { header: 'C4.고장영향', key: 'C4', width: 20 },
    ];
    productNames.forEach(pName => {
      sheetC.addRow({
        C1: pName,
        C2: getProductValue(pName, 'C2'),
        C3: getProductValue(pName, 'C3'),
        C4: getProductValue(pName, 'C4'),
      });
    });

    // 스타일 적용
    [sheetA, sheetB, sheetC].forEach(sheet => {
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00587A' } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.border = {
          top: { style: 'thin', color: { argb: '999999' } },
          left: { style: 'thin', color: { argb: '999999' } },
          bottom: { style: 'thin', color: { argb: '999999' } },
          right: { style: 'thin', color: { argb: '999999' } },
        };
      });
    });

    // 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PFMEA_관계형DATA_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 관계형 데이터 입포트
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onDataChange) return;

    setImportFileName(file.name);
    setImportSuccess(false);

    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const newData: ImportedFlatData[] = [];

      // L2 고장형태 시트 읽기
      const sheetA = workbook.getWorksheet('L2 고장형태');
      if (sheetA) {
        for (let i = 2; i <= sheetA.rowCount; i++) {
          const row = sheetA.getRow(i);
          const processNo = String(row.getCell(1).value || '');
          if (processNo) {
            ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].forEach((code, idx) => {
              const value = String(row.getCell(idx + 1).value || '');
              if (value) {
                newData.push({
                  id: `import-${code}-${processNo}-${Date.now()}-${idx}`,
                  processNo,
                  category: 'A',
                  itemCode: code,
                  value: code === 'A1' ? processNo : value,
                  createdAt: new Date(),
                });
              }
            });
          }
        }
      }

      // L3 고장원인 시트 읽기
      const sheetB = workbook.getWorksheet('L3 고장원인');
      if (sheetB) {
        for (let i = 2; i <= sheetB.rowCount; i++) {
          const row = sheetB.getRow(i);
          const processNo = String(row.getCell(1).value || '');
          if (processNo) {
            ['B1', 'B2', 'B3', 'B4', 'B5'].forEach((code, idx) => {
              const value = String(row.getCell(idx + 2).value || '');
              if (value) {
                newData.push({
                  id: `import-${code}-${processNo}-${Date.now()}-${idx}`,
                  processNo,
                  category: 'B',
                  itemCode: code,
                  value,
                  createdAt: new Date(),
                });
              }
            });
          }
        }
      }

      // L1 고장영향 시트 읽기
      const sheetC = workbook.getWorksheet('L1 고장영향');
      if (sheetC) {
        for (let i = 2; i <= sheetC.rowCount; i++) {
          const row = sheetC.getRow(i);
          const productName = String(row.getCell(1).value || '');
          if (productName) {
            ['C1', 'C2', 'C3', 'C4'].forEach((code, idx) => {
              const value = String(row.getCell(idx + 1).value || '');
              if (value) {
                newData.push({
                  id: `import-${code}-${productName}-${Date.now()}-${idx}`,
                  processNo: 'ALL',
                  category: 'C',
                  itemCode: code,
                  value,
                  createdAt: new Date(),
                });
              }
            });
          }
        }
      }

      onDataChange([...data, ...newData]);
      setImportSuccess(true);
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  // 데이터 개수
  const getTabCount = (tabCode: string) => {
    return data.filter(d => d.itemCode.startsWith(tabCode)).length;
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* 탭 헤더 */}
      <div className="flex border-b">
        {TABS.map((tab) => {
          const count = getTabCount(tab.code);
          return (
            <button
              key={tab.code}
              onClick={() => setActiveTab(tab.code)}
              className={`flex-1 px-4 py-3 font-bold text-sm transition-colors ${getTabColor(tab)}`}
            >
              {tab.label}
              {count > 0 && (
                <Badge className="ml-2 text-xs bg-white/30">{count}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* 다운로드 탭 */}
      {activeTab === 'download' && (
        <div className="p-8 text-center">
          <Download className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-lg font-bold text-[#00587a] mb-2">관계형 DATA 다운로드</h3>
          <p className="text-sm text-gray-600 mb-6">
            현재 Import된 관계형 데이터를 Excel 파일로 다운로드합니다.<br />
            L2 고장형태, L3 고장원인, L1 고장영향 시트가 포함됩니다.
          </p>
          <Button 
            onClick={handleDownload}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3"
            disabled={data.length === 0}
          >
            <Download className="h-5 w-5 mr-2" />
            관계형 DATA 다운로드 ({data.length}개 항목)
          </Button>
        </div>
      )}

      {/* 입포트 탭 */}
      {activeTab === 'import' && (
        <div className="p-8 text-center">
          <Upload className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-lg font-bold text-[#00587a] mb-2">관계형 DATA 입포트</h3>
          <p className="text-sm text-gray-600 mb-6">
            이전에 다운로드한 관계형 DATA Excel 파일을 불러옵니다.<br />
            기존 데이터에 추가됩니다.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Input 
              type="text" 
              value={importFileName} 
              readOnly 
              placeholder="파일을 선택하세요..." 
              className="w-64"
            />
            <label className="cursor-pointer">
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx,.xls" 
                className="hidden" 
                onChange={handleImport} 
              />
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" asChild>
                <span><FileSpreadsheet className="h-4 w-4 mr-2" />찾아보기...</span>
              </Button>
            </label>
          </div>
          {importSuccess && (
            <div className="mt-4 p-3 border-l-4 border-green-500 text-sm text-green-700 inline-block bg-green-100">
              <Check className="h-4 w-4 inline mr-2" />
              입포트 완료!
            </div>
          )}
        </div>
      )}

      {/* 저장 탭 */}
      {activeTab === 'save' && (
        <div className="p-8 text-center">
          <Save className="h-16 w-16 mx-auto mb-4 text-purple-500" />
          <h3 className="text-lg font-bold text-[#00587a] mb-2">관계형 DATA 저장</h3>
          <p className="text-sm text-gray-600 mb-6">
            현재 Import된 관계형 데이터를 데이터베이스에 저장합니다.<br />
            저장된 데이터는 FMEA 워크시트에서 사용할 수 있습니다.
          </p>
          
          {/* 저장 통계 */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="bg-blue-50 px-4 py-2 rounded">
              <span className="text-blue-600 font-bold">L2 고장형태: </span>
              <span className="text-blue-800">{processNos.length}개</span>
            </div>
            <div className="bg-green-50 px-4 py-2 rounded">
              <span className="text-green-600 font-bold">L3 고장원인: </span>
              <span className="text-green-800">{data.filter(d => d.itemCode.startsWith('B')).length}개</span>
            </div>
            <div className="bg-red-50 px-4 py-2 rounded">
              <span className="text-red-600 font-bold">L1 고장영향: </span>
              <span className="text-red-800">{productNames.length}개</span>
            </div>
          </div>
          
          <Button 
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
            disabled={data.length === 0 || saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                데이터베이스에 저장 (총 {data.length}개 항목)
              </>
            )}
          </Button>
          
          {/* 저장 결과 메시지 */}
          {saveStatus === 'success' && (
            <div className="mt-4 p-3 border-l-4 border-green-500 text-sm text-green-700 inline-block bg-green-100">
              <Check className="h-4 w-4 inline mr-2" />
              저장 완료! 데이터가 성공적으로 저장되었습니다.
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="mt-4 p-3 border-l-4 border-red-500 text-sm text-red-700 inline-block bg-red-100">
              저장 실패! 다시 시도해주세요.
            </div>
          )}
        </div>
      )}

      {/* 테이블 (A, B, C 탭) */}
      {['A', 'B', 'C'].includes(activeTab) && (
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0">
              <tr>
                {currentTab?.columns.map((col) => (
                  <th 
                    key={col.code}
                    className="bg-[#00587a] text-white font-bold px-3 py-2 text-center whitespace-nowrap border border-gray-600"
                  >
                    {col.code}.{col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'C' ? (
                // C 탭: 제품명 기준
                productNames.length === 0 ? (
                  <tr>
                    <td colSpan={currentTab?.columns.length || 4} className="text-center py-8 text-gray-500">
                      C 레벨 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  productNames.map((productName, idx) => (
                    <tr key={productName} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'}>
                      {currentTab?.columns.map((col) => (
                        <td 
                          key={col.code}
                          className="px-3 py-2 text-center border border-gray-300"
                        >
                          {col.code === 'C1' ? productName : getProductValue(productName, col.code) || '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                )
              ) : (
                // A, B 탭: 공정번호 기준
                processNos.length === 0 ? (
                  <tr>
                    <td colSpan={currentTab?.columns.length || 6} className="text-center py-8 text-gray-500">
                      {activeTab} 레벨 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  processNos.map((processNo, idx) => (
                    <tr key={processNo} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'}>
                      {currentTab?.columns.map((col) => (
                        <td 
                          key={col.code}
                          className={`px-3 py-2 border border-gray-300 ${col.code === 'A1' ? 'text-center font-bold text-[#00587a]' : ''}`}
                        >
                          {col.code === 'A1' ? processNo : getValue(processNo, col.code) || '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 안내 (A, B, C 탭만) */}
      {['A', 'B', 'C'].includes(activeTab) && (
        <div className="p-3 border-t text-xs text-gray-500 text-center">
          세로 스크롤 지원 (디폴트 20행 표시)
        </div>
      )}
    </div>
  );
}

