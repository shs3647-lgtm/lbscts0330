/**
 * @file page.tsx
 * @description PM (Preventive Maintenance) 리스트 페이지 - 최적화 및 의존성 제거 버전
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PFDTopNav from '@/components/layout/PFDTopNav';
import { FixedLayout } from '@/components/layout';
import { ListActionBar, ListStatusBar, useListSelection } from '@/components/list';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { toast } from '@/hooks/useToast';
import DeleteHelpBadge from '@/components/common/DeleteHelpBadge';

const CONFIG = {
  moduleName: 'PM',
  modulePrefix: 'pm',
  themeColor: '#0d47a1', // Dark Blue (Blue 900)
  registerUrl: '/pm/register',
  apiEndpoint: '/api/pm',
};

const COLUMN_WIDTHS = ['40px', '80px', '100px', '200px', '80px', '80px', '80px', '100px', '100px', '60px'];

interface PMProject {
  id: string;
  pmNo: string;
  subject?: string;
  machineName?: string;     // 설비명 (기존 customerName 대체)
  maintenanceType?: string; // 보전유형 (기존 processResponsibility 대체)
  manager?: string;         // 담당자
  startDate?: string;
  endDate?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function PMListPage() {
  const [projects, setProjects] = useState<PMProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { selectedRows, toggleRow, toggleAllRows, clearSelection, isAllSelected } = useListSelection();
  const { confirmDialog, ConfirmDialogUI } = useConfirmDialog();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(CONFIG.apiEndpoint);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setProjects(result.data.map((p: any) => ({
            id: p.pmNo || p.id,
            pmNo: p.pmNo || p.id,
            subject: p.subject,
            machineName: p.machineName || p.customerName || '',
            maintenanceType: p.maintenanceType || p.processResponsibility || '',
            manager: p.manager || p.pfdResponsibleName || '',
            startDate: p.startDate || p.pfdStartDate || '',
            endDate: p.endDate || p.pfdRevisionDate || '',
            status: p.status || 'Planned',
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          })));
        } else {
          setProjects([]);
        }
      }
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async () => {
    if (selectedRows.size === 0) { toast.warn('삭제할 항목을 선택해주세요.'); return; }
    const ok = await confirmDialog({ title: '삭제 확인', message: `선택한 ${selectedRows.size}개 항목을 삭제하시겠습니까?`, variant: 'danger', confirmText: '삭제', cancelText: '취소' });
    if (!ok) return;
    toast.info('삭제 기능은 API 연동 필요');
    clearSelection();
  };

  const filteredProjects = projects.filter(p =>
    !searchQuery ||
    p.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.pmNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FixedLayout topNav={<PFDTopNav />} showSidebar={true} bgColor="#f0f0f0" contentPadding="p-0">
      <div className="h-full overflow-y-auto px-3 py-3 font-[Malgun_Gothic]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🛠️</span>
          <h1 className="text-base font-bold text-gray-800">{CONFIG.moduleName} 리스트</h1>
          <span className="text-xs text-gray-500 ml-2">총 {filteredProjects.length}건</span>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <ListActionBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="검색..."
              onRefresh={loadData}
              onEdit={() => { }}
              editDisabled={true}
              onDelete={handleDelete}
              deleteDisabled={selectedRows.size === 0}
              deleteCount={selectedRows.size}
              registerUrl={CONFIG.registerUrl}
              themeColor={CONFIG.themeColor}
            />
          </div>
          <DeleteHelpBadge />
        </div>

        <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0d47a1] text-white" style={{ height: '32px' }}>
                <th className="w-8 border border-white text-center"><input type="checkbox" /></th>
                <th className="border border-white px-2">No</th>
                <th className="border border-white px-2">PM ID</th>
                <th className="border border-white px-2">제목</th>
                <th className="border border-white px-2">설비명</th>
                <th className="border border-white px-2">보전유형</th>
                <th className="border border-white px-2">담당자</th>
                <th className="border border-white px-2">시작일</th>
                <th className="border border-white px-2">종료일</th>
                <th className="border border-white px-2">상태</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p, i) => (
                <tr key={p.id} className="hover:bg-blue-50 border-b border-gray-200" style={{ height: '30px' }}>
                  <td className="text-center border-r border-gray-300"><input type="checkbox" checked={selectedRows.has(p.id)} onChange={() => toggleRow(p.id)} /></td>
                  <td className="text-center border-r border-gray-300">{i + 1}</td>
                  <td className="text-center border-r border-gray-300 font-bold text-blue-900">{p.pmNo}</td>
                  <td className="pl-2 border-r border-gray-300">{p.subject}</td>
                  <td className="text-center border-r border-gray-300">{p.machineName}</td>
                  <td className="text-center border-r border-gray-300">{p.maintenanceType}</td>
                  <td className="text-center border-r border-gray-300">{p.manager}</td>
                  <td className="text-center border-r border-gray-300">{p.startDate}</td>
                  <td className="text-center border-r border-gray-300">{p.endDate}</td>
                  <td className="text-center">{p.status}</td>
                </tr>
              ))}
              {projects.length === 0 && <tr><td colSpan={10} className="text-center py-4 text-gray-500">데이터가 없습니다.</td></tr>}
              {projects.length > 0 && filteredProjects.length === 0 && <tr><td colSpan={10} className="text-center py-4 text-gray-500">검색 결과가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialogUI />
    </FixedLayout>
  );
}
