/**
 * 기초정보 선택 모달 (통합 버전)
 * 고객명, 코드, 공장, 모델년도, 프로그램, 품명, 품번을 한 세트로 표시
 * @ref C:\01_Next_FMEA\app\fmea\components\modals\BizInfoSelectModal.tsx
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BizInfoProject } from '@/types/bizinfo';
import { getAllProjects, saveProject, deleteProject, clearAllBizInfoCache } from '@/lib/bizinfo-db';
import { downloadStyledExcel } from '@/lib/excel-utils';
import * as XLSX from 'xlsx';

interface BizInfoSelectModalProps {
  isOpen: boolean;
  onSelect: (project: BizInfoProject) => void;
  onClose: () => void;
}

export function BizInfoSelectModal({
  isOpen,
  onSelect,
  onClose
}: BizInfoSelectModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<BizInfoProject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<BizInfoProject | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 로드 - DB 전용, localStorage 완전 제거, 샘플 생성 없음
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      // ★ 1단계: 모달 열릴 때마다 모든 localStorage 캐시 완전 삭제
      clearAllBizInfoCache();

      // ★ 2단계: DB에서만 최신 데이터 로드 (샘플 생성 없음 - PUBLIC DB 데이터 사용)
      const loadedProjects = await getAllProjects(true);
      setProjects(Array.isArray(loadedProjects) ? loadedProjects : []);
    };

    loadData();
  }, [isOpen]);

  // 검색 필터링
  const filteredProjects = projects.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    return (
      p.customerName.toLowerCase().includes(searchLower) ||
      p.customerCode.toLowerCase().includes(searchLower) ||
      p.factory.toLowerCase().includes(searchLower) ||
      p.productName.toLowerCase().includes(searchLower) ||
      p.partNo.toLowerCase().includes(searchLower) ||
      p.program.toLowerCase().includes(searchLower)
    );
  });

  // 모달 닫기 시 검색어 초기화
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedId(null);
      setEditingProject(null);
    }
  }, [isOpen]);

  // 데이터 새로고침 (async) - 강제 새로고침
  const refreshData = async () => {
    const loadedProjects = await getAllProjects(true);
    setProjects(Array.isArray(loadedProjects) ? loadedProjects : []);
  };

  // 신규 추가
  const handleAdd = () => {
    const now = new Date().toISOString();
    const newProject: BizInfoProject = {
      id: `BIZ-${Date.now()}`,
      customerName: '',
      customerCode: '',
      factory: '',
      modelYear: new Date().getFullYear().toString(),
      program: '',
      productName: '',
      partNo: '',
      createdAt: now,
      updatedAt: now
    };
    setEditingProject(newProject);
  };

  // 저장 (async)
  const handleSave = async () => {
    if (editingProject) {
      if (!editingProject.customerName || !editingProject.productName) {
        alert('고객명과 품명은 필수입니다.');
        return;
      }
      await saveProject(editingProject);
      const savedId = editingProject.id;
      setEditingProject(null);
      // 즉시 최신 데이터 로드
      const latestProjects = await getAllProjects();
      setProjects(Array.isArray(latestProjects) ? latestProjects : []);
      setSelectedId(savedId); // 저장된 항목 선택 유지
    }
  };

  // 삭제 (async)
  const handleDelete = async () => {
    if (selectedId) {
      if (confirm('선택한 항목을 삭제하시겠습니까?')) {
        await deleteProject(selectedId);
        await refreshData();
        setSelectedId(null);
      }
    } else {
      alert('삭제할 항목을 선택해주세요.');
    }
  };

  // Export (엑셀 다운로드)
  const handleExport = () => {
    const headers = ['고객명', '코드', '공장', 'Model Year', '프로그램', '품명', '품번'];
    const colWidths = [15, 10, 12, 12, 12, 15, 15];
    const data = projects.map(p => [
      p.customerName,
      p.customerCode,
      p.factory,
      p.modelYear,
      p.program,
      p.productName,
      p.partNo
    ]);
    downloadStyledExcel(headers, data, colWidths, '고객정보', `고객정보_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

      // 헤더 제외하고 데이터만 처리
      const dataRows = jsonData.slice(1).filter(row => row.length > 0 && row[0]);
      
      if (dataRows.length === 0) {
        alert('❌ 데이터가 없습니다.');
        return;
      }

      const now = new Date().toISOString();
      let importedCount = 0;

      for (const row of dataRows) {
        const newProject: BizInfoProject = {
          id: `BIZ-${Date.now()}-${importedCount}`,
          customerName: String(row[0] || ''),
          customerCode: String(row[1] || ''),
          factory: String(row[2] || ''),
          modelYear: String(row[3] || ''),
          program: String(row[4] || ''),
          productName: String(row[5] || ''),
          partNo: String(row[6] || ''),
          createdAt: now,
          updatedAt: now
        };

        if (newProject.customerName) {
          saveProject(newProject);
          importedCount++;
        }
      }

      await refreshData();
      alert(`✅ ${importedCount}건 Import 완료!`);
    } catch (err) {
      console.error('Import 오류:', err);
      alert('❌ 엑셀 파일 읽기 오류');
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  const handleSelect = (project: BizInfoProject) => {
    onSelect(project);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-[90%] max-w-[900px] max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-300 bg-[#00587a]">
          <h2 className="text-sm font-bold text-white flex items-center gap-1">
            📂 고객정보
          </h2>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleImport}
              className="px-2 py-1 text-[10px] font-semibold bg-white text-[#00587a] rounded hover:bg-gray-100"
            >
              📥 Import
            </button>
            <button 
              onClick={handleExport}
              className="px-2 py-1 text-[10px] font-semibold bg-white text-[#00587a] rounded hover:bg-gray-100"
            >
              📤 Export
            </button>
            <button 
              onClick={handleAdd}
              className="px-2 py-1 text-[10px] font-semibold bg-green-500 text-white rounded hover:bg-green-600"
            >
              ➕ 추가
            </button>
            <button 
              onClick={() => {
                if (editingProject) {
                  // 저장 모드 → 저장 실행
                  handleSave();
                } else if (selectedId) {
                  // 선택된 항목 수정 모드로 전환
                  const project = projects.find(p => p.id === selectedId);
                  if (project) setEditingProject({...project});
                } else {
                  alert('수정할 항목을 선택해주세요.');
                }
              }}
              className={`px-2 py-1 text-[10px] font-semibold rounded ${
                editingProject 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {editingProject ? '💾 저장' : '✏️ 수정'}
            </button>
            <button 
              onClick={handleDelete}
              className="px-2 py-1 text-[10px] font-semibold bg-red-500 text-white rounded hover:bg-red-600"
            >
              🗑️ 삭제
            </button>
            <div className="w-px h-4 bg-white/50" />
            <button 
              onClick={onClose} 
              className="px-2 py-1 text-[10px] font-semibold bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              ✕ 닫기
            </button>
          </div>
        </div>
        
        {/* 파일 입력 (숨김) */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".xlsx,.xls" 
          className="hidden" 
        />

        {/* 검색 */}
        <div className="px-3 py-2 border-b border-gray-200">
          <input
            type="text"
            placeholder="🔍 검색 (고객명, 코드, 공장, 품명, 품번, 프로그램)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            autoFocus
          />
        </div>

        {/* 편집 폼 (추가/수정 시) */}
        {editingProject ? (
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-2">
              <p className="text-xs font-semibold text-blue-700 mb-2">📝 고객정보 {editingProject.id.startsWith('BIZ-') ? '신규 등록' : '수정'}</p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">고객명 *</label>
                  <input type="text" value={editingProject.customerName} onChange={(e) => setEditingProject({...editingProject, customerName: e.target.value})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="현대자동차" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">코드</label>
                  <input type="text" value={editingProject.customerCode} onChange={(e) => setEditingProject({...editingProject, customerCode: e.target.value})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="HMC" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">공장</label>
                  <input type="text" value={editingProject.factory} onChange={(e) => setEditingProject({...editingProject, factory: e.target.value})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="울산공장" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">Model Year</label>
                  <input type="text" value={editingProject.modelYear} onChange={(e) => setEditingProject({...editingProject, modelYear: e.target.value})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="2025" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">프로그램</label>
                  <input type="text" value={editingProject.program} onChange={(e) => setEditingProject({...editingProject, program: e.target.value})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="NE1" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">품명 *</label>
                  <input type="text" value={editingProject.productName} onChange={(e) => setEditingProject({...editingProject, productName: e.target.value})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="도어패널" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">품번</label>
                  <input type="text" value={editingProject.partNo} onChange={(e) => setEditingProject({...editingProject, partNo: e.target.value})}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="DP-001" />
                </div>
                <div className="flex items-end gap-1">
                  <button onClick={handleSave} className="px-3 py-1 text-xs font-semibold bg-blue-500 text-white rounded hover:bg-blue-600">💾 저장</button>
                  <button onClick={() => setEditingProject(null)} className="px-3 py-1 text-xs font-semibold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">취소</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 안내 메시지 + 선택 적용 버튼 */}
            <div className="flex items-center justify-between px-3 py-1 bg-amber-50 border-b border-amber-200">
              <p className="text-[10px] text-amber-700">
                💡 행 클릭 → 선택 | 더블클릭 → 적용 | 행 선택 후 삭제 가능
              </p>
              <button 
                onClick={() => {
                  if (!selectedId) {
                    alert('선택된 항목이 없습니다.');
                    return;
                  }
                  const project = projects.find(p => p.id === selectedId);
                  if (project) handleSelect(project);
                }}
                disabled={!selectedId || !!editingProject}
                className={`px-3 py-1 text-[10px] font-semibold rounded ${
                  selectedId && !editingProject
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                ✓ 선택 적용
              </button>
            </div>

            {/* 테이블 */}
            <div className="flex-1 overflow-y-auto px-2 py-1">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  데이터가 없습니다. [➕ 추가] 또는 [📥 Import]로 등록하세요.
                </div>
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-[#00587a] text-white">
                    <tr>
                      <th className="border border-white px-1 py-1 text-center align-middle font-semibold w-6">✓</th>
                      <th className="border border-white px-1 py-1 text-center align-middle font-semibold w-8">NO</th>
                      <th className="border border-white px-1 py-1 text-center align-middle font-semibold">고객명</th>
                      <th className="border border-white px-1 py-1 text-center align-middle font-semibold w-12">코드</th>
                      <th className="border border-white px-1 py-1 text-center align-middle font-semibold">공장</th>
                      <th className="border border-white px-1 py-1 text-center align-middle font-semibold w-14">MY</th>
                      <th className="border border-white px-1 py-1 text-center align-middle font-semibold">프로그램</th>
                      <th className="border border-white px-1 py-1 text-center align-middle font-semibold">품명</th>
                      <th className="border border-white px-1 py-1 text-center align-middle font-semibold">품번</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((project, index) => (
                      <tr
                        key={project.id}
                        onClick={() => setSelectedId(project.id)}
                        onDoubleClick={() => handleSelect(project)}
                        className={`cursor-pointer hover:bg-blue-100 transition-colors ${
                          selectedId === project.id 
                            ? 'bg-blue-200' 
                            : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">
                          <input type="radio" checked={selectedId === project.id} onChange={() => setSelectedId(project.id)} className="w-3 h-3" />
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">{index + 1}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle font-medium">{project.customerName}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle text-blue-600 font-semibold">{project.customerCode}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">{project.factory}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">{project.modelYear}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">{project.program}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle font-medium">{project.productName}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle text-gray-600">{project.partNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* 푸터 */}
        <div className="px-3 py-1.5 border-t border-gray-200 bg-gray-50">
          <span className="text-[10px] text-gray-500">
            총 {filteredProjects.length}개 {selectedId && '| 선택: 1건'}
          </span>
        </div>
      </div>
    </div>
  );
}
