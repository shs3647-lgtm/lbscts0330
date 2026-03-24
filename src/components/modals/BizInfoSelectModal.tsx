// CODEFREEZE
/**
 * 기초정보 선택 모달 (통합 버전)
 * 고객명, 코드, 공장, 모델년도, 프로그램, 품명, 품번을 한 세트로 표시
 * @ref C:\01_Next_FMEA\app\fmea\components\modals\BizInfoSelectModal.tsx
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import { BizInfoProject } from '@/types/bizinfo';
import { getAllProjects, saveProject, deleteProject } from '@/lib/bizinfo-db';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingProject, setEditingProject] = useState<BizInfoProject | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: 620, height: 440, minWidth: 480, minHeight: 320
  });

  // 다중선택 토글
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 전체선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map(p => p.id)));
    }
  };

  // 데이터 로드 — PUBLIC DB 영구저장 전용
  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
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
      setSelectedIds(new Set());
      setEditingProject(null);
    }
  }, [isOpen]);

  // body 스크롤 방지 제거됨 - 비모달 플로팅 윈도우로 전환

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
      setSelectedIds(new Set([savedId])); // 저장된 항목 선택 유지
    }
  };

  // 삭제 (다중선택)
  const handleDelete = async () => {
    if (selectedIds.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }
    const count = selectedIds.size;
    if (confirm(`선택한 ${count}건의 고객정보를 삭제하시겠습니까?`)) {
      for (const id of selectedIds) {
        await deleteProject(id);
      }
      await refreshData();
      setSelectedIds(new Set());
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

  // ✅ 2026-01-22: Portal을 사용하여 레이아웃 영향 방지
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-300 bg-[#00587a] cursor-move shrink-0 rounded-t-lg" onMouseDown={onDragStart}>
          <h2 className="text-sm font-bold text-white flex items-center gap-1" title="Business Information">
            📂 사업장 정보(Business Info)
          </h2>
          <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
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
              추가<span className="text-[7px] opacity-70 ml-0.5">(Add)</span>
            </button>
            <button
              onClick={() => {
                if (selectedIds.size === 1) {
                  const project = projects.find(p => p.id === [...selectedIds][0]);
                  if (project) setEditingProject({ ...project });
                } else if (selectedIds.size > 1) { alert('수정은 1건만 선택해주세요.'); }
                else { alert('수정할 항목을 선택해주세요.'); }
              }}
              className="px-2 py-1 text-[10px] font-semibold rounded bg-amber-500 text-white hover:bg-amber-600"
              title="Edit"
            >
              수정<span className="text-[7px] opacity-70 ml-0.5">(Edit)</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!editingProject}
              className={`px-2 py-1 text-[10px] font-semibold rounded ${editingProject ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
              title="Save"
            >
              저장<span className="text-[7px] opacity-70 ml-0.5">(Save)</span>
            </button>
            <button
              onClick={handleDelete}
              className="px-2 py-1 text-[10px] font-semibold bg-red-500 text-white rounded hover:bg-red-600"
              title="Delete"
            >
              삭제<span className="text-[7px] opacity-70 ml-0.5">(Del)</span>
            </button>
            <div className="w-px h-4 bg-white/50" />
            <button
              onClick={() => setShowHelp(v => !v)}
              className={`px-2 py-1 text-[10px] font-semibold rounded ${showHelp ? 'bg-yellow-400 text-gray-800' : 'bg-white text-[#00587a]'} hover:bg-yellow-300`}
            >
              도움말<span className="text-[7px] opacity-70 ml-0.5">(Help)</span>
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1 text-[10px] font-semibold bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              title="Close"
            >
              닫기<span className="text-[7px] opacity-70 ml-0.5">(Close)</span>
            </button>
          </div>
        </div>

        {/* 도움말 패널 */}
        {showHelp && (
          <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-200 text-[10px] text-gray-700 space-y-1">
            <p className="font-bold text-[11px] text-yellow-800 mb-1">고객정보 모달 사용법</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <p><span className="font-semibold text-blue-700">체크박스 클릭</span> — 다중 선택/해제</p>
              <p><span className="font-semibold text-blue-700">헤더 체크박스</span> — 전체 선택/해제</p>
              <p><span className="font-semibold text-blue-700">행 클릭</span> — 해당 항목 선택 토글</p>
              <p><span className="font-semibold text-blue-700">행 더블클릭</span> — 즉시 선택 적용</p>
              <p><span className="font-semibold text-green-700">➕ 추가</span> — 새 고객정보 등록 폼 열기</p>
              <p><span className="font-semibold text-amber-700">✏️ 수정</span> — 1건 선택 후 정보 편집</p>
              <p><span className="font-semibold text-blue-700">💾 저장</span> — 편집 중인 고객정보 DB 저장</p>
              <p><span className="font-semibold text-red-700">🗑️ 삭제</span> — 선택된 항목 DB에서 즉시 삭제</p>
              <p><span className="font-semibold text-[#00587a]">📥 Import</span> — 엑셀 파일로 일괄 등록</p>
              <p><span className="font-semibold text-[#00587a]">📤 Export</span> — 전체 고객정보 엑셀 다운로드</p>
            </div>
            <p className="text-[9px] text-gray-500 mt-1">* 검색창에서 고객명, 코드, 공장, 품명, 품번, 프로그램으로 검색 가능</p>
          </div>
        )}

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
                  <input type="text" value={editingProject.customerName} onChange={(e) => setEditingProject({ ...editingProject, customerName: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="현대자동차" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">코드</label>
                  <input type="text" value={editingProject.customerCode} onChange={(e) => setEditingProject({ ...editingProject, customerCode: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="HMC" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">공장</label>
                  <input type="text" value={editingProject.factory} onChange={(e) => setEditingProject({ ...editingProject, factory: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="울산공장" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">Model Year</label>
                  <input type="text" value={editingProject.modelYear} onChange={(e) => setEditingProject({ ...editingProject, modelYear: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="2025" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">프로그램</label>
                  <input type="text" value={editingProject.program} onChange={(e) => setEditingProject({ ...editingProject, program: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="NE1" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">품명 *</label>
                  <input type="text" value={editingProject.productName} onChange={(e) => setEditingProject({ ...editingProject, productName: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="도어패널" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">품번</label>
                  <input type="text" value={editingProject.partNo} onChange={(e) => setEditingProject({ ...editingProject, partNo: e.target.value })}
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
                💡 체크박스로 다중선택 | 더블클릭 → 적용 | 선택 후 삭제 가능
              </p>
              <button
                onClick={() => {
                  if (selectedIds.size === 0) {
                    alert('선택된 항목이 없습니다.');
                    return;
                  }
                  if (selectedIds.size > 1) {
                    alert('적용은 1건만 선택해주세요.');
                    return;
                  }
                  const project = projects.find(p => p.id === [...selectedIds][0]);
                  if (project) handleSelect(project);
                }}
                disabled={selectedIds.size !== 1 || !!editingProject}
                className={`px-3 py-1 text-[10px] font-semibold rounded ${selectedIds.size === 1 && !editingProject
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                적용<span className="text-[8px] opacity-70 ml-0.5">(Apply)</span>
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
                      <th className="border border-white px-1 py-1 text-center align-middle font-semibold w-6">
                        <input
                          type="checkbox"
                          checked={filteredProjects.length > 0 && selectedIds.size === filteredProjects.length}
                          onChange={toggleSelectAll}
                          className="w-3 h-3 cursor-pointer"
                          title="전체선택"
                        />
                      </th>
                      <th className="border border-white px-1 py-0.5 text-center align-middle font-semibold w-7">NO</th>
                      <th className="border border-white px-1 py-0.5 text-center align-middle font-semibold" title="Customer Name"><div className="leading-tight"><div className="text-[10px]">고객명</div><div className="text-[7px] font-normal opacity-60">(Cust.)</div></div></th>
                      <th className="border border-white px-1 py-0.5 text-center align-middle font-semibold" title="Factory"><div className="leading-tight"><div className="text-[10px]">공장</div><div className="text-[7px] font-normal opacity-60">(Plant)</div></div></th>
                      <th className="border border-white px-1 py-0.5 text-center align-middle font-semibold w-12" title="Model Year">MY</th>
                      <th className="border border-white px-1 py-0.5 text-center align-middle font-semibold" title="Program"><div className="leading-tight"><div className="text-[10px]">프로그램</div><div className="text-[7px] font-normal opacity-60">(Prog.)</div></div></th>
                      <th className="border border-white px-1 py-0.5 text-center align-middle font-semibold" title="Product Name"><div className="leading-tight"><div className="text-[10px]">품명</div><div className="text-[7px] font-normal opacity-60">(Product)</div></div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((project, index) => (
                      <tr
                        key={project.id}
                        onClick={() => toggleSelect(project.id)}
                        onDoubleClick={() => handleSelect(project)}
                        className={`cursor-pointer hover:bg-blue-100 transition-colors ${selectedIds.has(project.id)
                          ? 'bg-blue-200'
                          : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                      >
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(project.id)} onChange={() => toggleSelect(project.id)} className="w-3 h-3 cursor-pointer" />
                        </td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">{index + 1}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle font-medium">{project.customerName}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">{project.factory}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">{project.modelYear}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">{project.program}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle font-medium">{project.productName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* 푸터 */}
        <div className="px-3 py-1.5 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-lg">
          <span className="text-[10px] text-gray-500">
            총 {filteredProjects.length}개 {selectedIds.size > 0 && `| 선택: ${selectedIds.size}건`}
          </span>
        </div>

        {/* 리사이즈 핸들 */}
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
          <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
            <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      </div>,
    document.body
  );
}
