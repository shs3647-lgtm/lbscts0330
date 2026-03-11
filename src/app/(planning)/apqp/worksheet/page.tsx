/**
 * @file page.tsx
 * @description APQP 워크시트 페이지 - FMEA와 동일한 구조
 * @version 1.0.1
 * @updated 2026-01-26 - Sidebar 추가
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import APQPTopNav from '@/components/layout/APQPTopNav';
import { SidebarRouter } from '@/components/layout/SidebarRouter';
import { useLocale } from '@/lib/locale';
import { APQPProject, APQPStage, APQPActivity } from '@/types/apqp-project';
import { APQPStorage } from '@/utils/apqp-storage';

// 색상 정의
// 색상 정의
const COLORS = {
  bg: '#f5f7fa',
  text: '#333',
  primary: '#004C6D',     // 변경: 짙은 청록색 (Deep Teal)
  primaryDark: '#003853', // 변경: 더 짙은 청록색
  header: '#004C6D',      // 변경: 헤더 색상 통일
};

// 빈 APQP 프로젝트 생성
function createEmptyAPQPProject(projectName: string): APQPProject {
  const now = new Date();
  const projectId = `PJ-${String(now.getTime()).slice(-6)}`;
  const today = now.toISOString().split('T')[0];
  const endDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    id: projectId,
    projectName: projectName,
    customer: '',
    factory: '',
    productName: '',
    startDate: today,
    endDate: endDate,
    status: 'Active',
    stages: [
      { id: 'stage-1', label: 'Stage 1: 계획 및 정의', expanded: true, activities: createEmptyActivities('stage-1', 5) },
      { id: 'stage-2', label: 'Stage 2: 제품 설계 및 개발', expanded: true, activities: createEmptyActivities('stage-2', 5) },
      { id: 'stage-3', label: 'Stage 3: 공정 설계 및 개발', expanded: true, activities: createEmptyActivities('stage-3', 5) },
      { id: 'stage-4', label: 'Stage 4: 제품 및 공정 검증', expanded: true, activities: createEmptyActivities('stage-4', 5) },
      { id: 'stage-5', label: 'Stage 5: 양산 준비', expanded: true, activities: createEmptyActivities('stage-5', 5) },
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    createdBy: 'System'
  };
}

// 빈 활동 목록 생성
function createEmptyActivities(stageId: string, count: number): APQPActivity[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${stageId}-activity-${i + 1}`,
    name: '',
    stageId: stageId,
    planStart: '',
    planFinish: '',
    actStart: '',
    actFinish: '',
    state: 'G' as const,
    department: '',
    owner: ''
  }));
}

export default function APQPWorksheetPage() {
  const { t } = useLocale();
  const [projects, setProjects] = useState<APQPProject[]>([]);
  const [currentProject, setCurrentProject] = useState<APQPProject | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // 프로젝트 목록 로드
  const loadProjects = useCallback(() => {
    const allProjects = APQPStorage.getAllProjects();
    setProjects(allProjects);

    // 프로젝트가 없으면 기본 프로젝트 생성
    if (allProjects.length === 0) {
      const defaultProject = createEmptyAPQPProject('SDD APQP 프로젝트');
      defaultProject.customer = 'SDD';
      defaultProject.productName = 'PCR 타이어';
      APQPStorage.saveProjectDetail(defaultProject.id, defaultProject);
      setProjects([defaultProject]);
      setCurrentProject(defaultProject);
      setSelectedProjectId(defaultProject.id);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 프로젝트 선택 시 로드
  useEffect(() => {
    if (selectedProjectId) {
      const project = APQPStorage.getProjectDetail(selectedProjectId);
      setCurrentProject(project);
      setDirty(false);
    } else if (projects.length > 0 && !currentProject) {
      setSelectedProjectId(projects[0].id);
    }
  }, [selectedProjectId, projects]);

  // 저장
  const handleSave = useCallback(() => {
    if (!currentProject) return;

    setIsSaving(true);
    try {
      currentProject.updatedAt = new Date().toISOString();
      APQPStorage.saveProjectDetail(currentProject.id, currentProject);
      setDirty(false);
      setSyncMessage('✅ 저장 완료');
      setTimeout(() => setSyncMessage(null), 2000);
    } catch (e) {
      console.error('저장 실패:', e);
      setSyncMessage('❌ 저장 실패');
    }
    setIsSaving(false);
  }, [currentProject]);

  // 신규 프로젝트
  const handleNewProject = () => {
    const projectName = prompt('새 APQP 프로젝트 이름:', '신규 APQP 프로젝트');
    if (!projectName) return;

    const newProject = createEmptyAPQPProject(projectName);
    APQPStorage.saveProjectDetail(newProject.id, newProject);
    loadProjects();
    setSelectedProjectId(newProject.id);
    setSyncMessage('✅ 신규 프로젝트 생성 완료');
    setTimeout(() => setSyncMessage(null), 2000);
  };

  // Stage 토글
  const toggleStage = (stageId: string) => {
    if (!currentProject) return;

    const updated = { ...currentProject };
    const stage = updated.stages.find(s => s.id === stageId);
    if (stage) {
      stage.expanded = !stage.expanded;
      setCurrentProject(updated);
    }
  };

  // Activity 변경
  const updateActivity = (stageId: string, activityId: string, field: keyof APQPActivity, value: string) => {
    if (!currentProject) return;

    const updated = { ...currentProject };
    const stage = updated.stages.find(s => s.id === stageId);
    if (!stage) return;

    const activity = stage.activities.find(a => a.id === activityId);
    if (!activity) return;

    (activity as any)[field] = value;
    setCurrentProject(updated);
    setDirty(true);
  };

  // Activity 추가
  const addActivity = (stageId: string) => {
    if (!currentProject) return;

    const updated = { ...currentProject };
    const stage = updated.stages.find(s => s.id === stageId);
    if (!stage) return;

    const newActivity: APQPActivity = {
      id: `${stageId}-activity-${Date.now()}`,
      name: '',
      stageId: stageId,
      state: 'G'
    };

    stage.activities.push(newActivity);
    setCurrentProject(updated);
    setDirty(true);
  };

  // Activity 삭제
  const deleteActivity = (stageId: string, activityId: string) => {
    if (!currentProject) return;

    const updated = { ...currentProject };
    const stage = updated.stages.find(s => s.id === stageId);
    if (!stage) return;

    stage.activities = stage.activities.filter(a => a.id !== activityId);
    setCurrentProject(updated);
    setDirty(true);
  };

  // 상태 색상
  const getStateColor = (state?: string) => {
    switch (state) {
      case 'G': return { bg: '#dcfce7', color: '#166534', label: '정상' };
      case 'Y': return { bg: '#fef9c3', color: '#854d0e', label: '주의' };
      case 'R': return { bg: '#fee2e2', color: '#991b1b', label: '지연' };
      default: return { bg: '#f3f4f6', color: '#374151', label: '미정' };
    }
  };

  // 통계 계산
  const totalActivities = currentProject?.stages.reduce((sum, s) => sum + s.activities.filter(a => a.name).length, 0) || 0;

  // 스타일
  const cellStyle = 'border border-gray-300 px-2 py-1.5';
  const inputStyle = 'w-full border-0 bg-transparent text-xs outline-none focus:bg-blue-50 px-1';

  return (
    <>
      {/* ★ 사이드바 추가 */}
      <SidebarRouter />

      <APQPTopNav
        selectedProjectId={selectedProjectId}
      />

      <div className="h-full flex flex-col font-[Segoe_UI,Malgun_Gothic,Arial,sans-serif]" style={{ background: COLORS.bg, color: COLORS.text, marginLeft: 53 }}>

        {/* TopMenuBar */}
        <div
          className="flex items-center gap-2 fixed top-8 left-[53px] right-0 h-8 px-2 z-[99] border-t border-b border-white/30"
          style={{ background: 'linear-gradient(to right, #1d4ed8, #2563eb, #1d4ed8)' }}
        >
          {/* 프로젝트 선택 */}
          <div className="flex items-center gap-1.5">
            <span className="text-white text-xs font-semibold">📋 {t('프로젝트')}:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-2 py-1 rounded border-0 bg-white/20 text-white min-w-[180px] text-xs"
            >
              <option value="" className="text-gray-800">{t('프로젝트 선택')}...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id} className="text-gray-800">
                  {p.projectName} ({p.customer})
                </option>
              ))}
            </select>
            <button
              onClick={handleNewProject}
              className="px-3 py-1 rounded bg-green-500 text-white text-xs font-bold hover:bg-green-400"
            >
              ➕ 신규
            </button>
          </div>

          <div className="w-px h-5 bg-white/30" />

          {/* 저장 */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-3 py-1 rounded transition-all text-white text-xs font-semibold ${isSaving ? 'bg-orange-500' : dirty ? 'bg-yellow-500' : 'bg-white/15'
              }`}
          >
            {isSaving ? `⏳${t('저장중')}` : dirty ? `💾${t('저장')}` : `✅${t('저장됨')}`}
          </button>

          {syncMessage && (
            <span className="px-3 py-1 rounded text-white text-xs font-semibold bg-green-600">
              {syncMessage}
            </span>
          )}

          <div className="flex-1" />

          {currentProject && (
            <div className="flex items-center gap-2 text-white/80 text-[10px]">
              <span>ID: {currentProject.id}</span>
              <span>|</span>
              <span>{t('고객')}: {currentProject.customer || '-'}</span>
              <span>|</span>
              <span>{t('품명')}: {currentProject.productName || '-'}</span>
            </div>
          )}
        </div>

        {/* 메인 레이아웃 */}
        <div className="fixed top-16 left-[53px] right-0 bottom-0 flex flex-row overflow-x-auto overflow-y-hidden">

          {/* 좌측: 워크시트 영역 */}
          <div className="flex-1 flex flex-col min-w-0 bg-white overflow-auto">

            <div
              className="shrink-0 flex items-center justify-center font-black py-1 px-2 text-[13px] border-b-2 border-black"
              style={{ background: COLORS.header, color: '#fff' }}
            >
              <span>APQP Work Sheet - {currentProject?.projectName || '프로젝트 선택'}</span>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {!currentProject ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-lg mb-2">📋 프로젝트를 선택하세요</div>
                  <div className="text-sm">상단에서 프로젝트를 선택하거나 신규 버튼을 클릭하세요.</div>
                </div>
              ) : (
                <>
                  {/* 프로젝트 정보 */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 border">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('프로젝트명')}</label>
                        <input
                          type="text"
                          value={currentProject.projectName}
                          onChange={(e) => {
                            setCurrentProject({ ...currentProject, projectName: e.target.value });
                            setDirty(true);
                          }}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('고객')}</label>
                        <input
                          type="text"
                          value={currentProject.customer}
                          onChange={(e) => {
                            setCurrentProject({ ...currentProject, customer: e.target.value });
                            setDirty(true);
                          }}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('품명')}</label>
                        <input
                          type="text"
                          value={currentProject.productName}
                          onChange={(e) => {
                            setCurrentProject({ ...currentProject, productName: e.target.value });
                            setDirty(true);
                          }}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('상태')}</label>
                        <select
                          value={currentProject.status}
                          onChange={(e) => {
                            setCurrentProject({ ...currentProject, status: e.target.value });
                            setDirty(true);
                          }}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        >
                          <option value="Active">Active</option>
                          <option value="Completed">Completed</option>
                          <option value="On Hold">On Hold</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('시작일')}</label>
                        <input
                          type="date"
                          value={currentProject.startDate}
                          onChange={(e) => {
                            setCurrentProject({ ...currentProject, startDate: e.target.value });
                            setDirty(true);
                          }}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('종료일')}</label>
                        <input
                          type="date"
                          value={currentProject.endDate}
                          onChange={(e) => {
                            setCurrentProject({ ...currentProject, endDate: e.target.value });
                            setDirty(true);
                          }}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{t('공장')}</label>
                        <input
                          type="text"
                          value={currentProject.factory}
                          onChange={(e) => {
                            setCurrentProject({ ...currentProject, factory: e.target.value });
                            setDirty(true);
                          }}
                          className="w-full px-2 py-1.5 border rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* APQP 5 Stages */}
                  {currentProject.stages.map((stage, stageIdx) => (
                    <div key={stage.id} className="mb-4">
                      {/* Stage Header */}
                      <div
                        onClick={() => toggleStage(stage.id)}
                        className="flex items-center justify-between px-4 py-2 rounded-t-lg cursor-pointer text-white font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}
                      >
                        <span>📌 {stage.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-normal opacity-80">{stage.activities.filter(a => a.name).length}개 활동</span>
                          <span>{stage.expanded ? '▼' : '▶'}</span>
                        </div>
                      </div>

                      {/* Stage Activities */}
                      {stage.expanded && (
                        <div className="border border-t-0 rounded-b-lg overflow-hidden">
                          {/* Table Header */}
                          <table className="w-full border-collapse text-xs">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className={`${cellStyle} w-[200px]`}>{t('활동명')}</th>
                                <th className={`${cellStyle} w-[100px]`}>{t('계획 시작')}</th>
                                <th className={`${cellStyle} w-[100px]`}>{t('계획 종료')}</th>
                                <th className={`${cellStyle} w-[100px]`}>{t('실제 시작')}</th>
                                <th className={`${cellStyle} w-[100px]`}>{t('실제 종료')}</th>
                                <th className={`${cellStyle} w-[60px]`}>{t('상태')}</th>
                                <th className={`${cellStyle} w-[100px]`}>{t('부서')}</th>
                                <th className={`${cellStyle} w-[100px]`}>{t('담당자')}</th>
                                <th className={`${cellStyle} w-[50px]`}>{t('삭제')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stage.activities.map((activity, actIdx) => {
                                const stateInfo = getStateColor(activity.state);
                                return (
                                  <tr key={activity.id} className={actIdx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                                    <td className={cellStyle}>
                                      <input
                                        type="text"
                                        value={activity.name}
                                        onChange={(e) => updateActivity(stage.id, activity.id, 'name', e.target.value)}
                                        placeholder="활동명 입력"
                                        className={inputStyle}
                                      />
                                    </td>
                                    <td className={cellStyle}>
                                      <input
                                        type="date"
                                        value={activity.planStart || ''}
                                        onChange={(e) => updateActivity(stage.id, activity.id, 'planStart', e.target.value)}
                                        className={inputStyle}
                                      />
                                    </td>
                                    <td className={cellStyle}>
                                      <input
                                        type="date"
                                        value={activity.planFinish || ''}
                                        onChange={(e) => updateActivity(stage.id, activity.id, 'planFinish', e.target.value)}
                                        className={inputStyle}
                                      />
                                    </td>
                                    <td className={cellStyle}>
                                      <input
                                        type="date"
                                        value={activity.actStart || ''}
                                        onChange={(e) => updateActivity(stage.id, activity.id, 'actStart', e.target.value)}
                                        className={inputStyle}
                                      />
                                    </td>
                                    <td className={cellStyle}>
                                      <input
                                        type="date"
                                        value={activity.actFinish || ''}
                                        onChange={(e) => updateActivity(stage.id, activity.id, 'actFinish', e.target.value)}
                                        className={inputStyle}
                                      />
                                    </td>
                                    <td className={cellStyle}>
                                      <select
                                        value={activity.state || 'G'}
                                        onChange={(e) => updateActivity(stage.id, activity.id, 'state', e.target.value)}
                                        className={`${inputStyle} font-semibold`}
                                        style={{ background: stateInfo.bg, color: stateInfo.color }}
                                      >
                                        <option value="G">정상</option>
                                        <option value="Y">주의</option>
                                        <option value="R">지연</option>
                                      </select>
                                    </td>
                                    <td className={cellStyle}>
                                      <input
                                        type="text"
                                        value={activity.department || ''}
                                        onChange={(e) => updateActivity(stage.id, activity.id, 'department', e.target.value)}
                                        placeholder="부서"
                                        className={inputStyle}
                                      />
                                    </td>
                                    <td className={cellStyle}>
                                      <input
                                        type="text"
                                        value={activity.owner || ''}
                                        onChange={(e) => updateActivity(stage.id, activity.id, 'owner', e.target.value)}
                                        placeholder="담당자"
                                        className={inputStyle}
                                      />
                                    </td>
                                    <td className={`${cellStyle} text-center`}>
                                      <button
                                        onClick={() => deleteActivity(stage.id, activity.id)}
                                        className="px-2 py-0.5 bg-red-500 text-white rounded text-[10px] hover:bg-red-600"
                                      >
                                        ❌
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {/* Add Activity */}
                          <div className="p-2 bg-gray-50 text-center">
                            <button
                              onClick={() => addActivity(stage.id)}
                              className="px-4 py-1 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600"
                            >
                              ➕ {t('활동 추가')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 우측: 패널 영역 */}
          <div className="w-[280px] shrink-0 flex flex-col bg-[#f0f4f8] overflow-hidden border-l-2 border-white">
            <div className="h-8 bg-blue-700 flex items-center px-3 border-b border-blue-600">
              <span className="text-white text-xs font-bold">📊 {t('APQP 요약')}</span>
            </div>

            <div className="flex-1 p-3 overflow-auto">
              <div className="space-y-3">
                {currentProject && (
                  <>
                    <div className="bg-white rounded p-3 shadow-sm">
                      <div className="text-xs font-bold text-blue-700 mb-2">{t('기본정보')}</div>
                      <div className="text-[11px] text-gray-600 space-y-1">
                        <div>{t('프로젝트')}: <span className="font-semibold text-gray-800">{currentProject.projectName}</span></div>
                        <div>{t('고객')}: <span className="font-semibold text-gray-800">{currentProject.customer || '-'}</span></div>
                        <div>{t('품명')}: <span className="font-semibold text-gray-800">{currentProject.productName || '-'}</span></div>
                      </div>
                    </div>

                    <div className="bg-white rounded p-3 shadow-sm">
                      <div className="text-xs font-bold text-blue-700 mb-2">📋 APQP 통계</div>
                      <div className="text-[11px] text-gray-600 space-y-1">
                        <div>Stage: <span className="font-bold text-blue-600">5개</span></div>
                        <div>총 활동: <span className="font-bold text-green-600">{totalActivities}개</span></div>
                        <div>상태: <span className="font-bold" style={{ color: currentProject.status === 'Active' ? '#16a34a' : currentProject.status === 'Completed' ? '#2563eb' : '#ca8a04' }}>{currentProject.status}</span></div>
                      </div>
                    </div>

                    <div className="bg-white rounded p-3 shadow-sm">
                      <div className="text-xs font-bold text-blue-700 mb-2">📅 일정</div>
                      <div className="text-[11px] text-gray-600 space-y-1">
                        <div>시작: <span className="font-semibold text-gray-800">{currentProject.startDate}</span></div>
                        <div>종료: <span className="font-semibold text-gray-800">{currentProject.endDate}</span></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}





