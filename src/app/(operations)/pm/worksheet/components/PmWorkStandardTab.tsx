/**
 * @file PmWorkStandardTab.tsx
 * @description 작업표준 관리 전용 탭 - 컴팩트 UI
 * @version 1.0.0 - 2026-02-03
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { PMMainDocument, WorkStep } from '@/types/pm-main';

interface PmWorkStandardTabProps {
    document: PMMainDocument;
    setDocument: React.Dispatch<React.SetStateAction<PMMainDocument>>;
}

function PmWorkStandardTabInner({ document, setDocument }: PmWorkStandardTabProps) {
    const [selectedStep, setSelectedStep] = useState<number | null>(null);
    const [editingStep, setEditingStep] = useState<WorkStep | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const workSteps = document.workMethod || [];

    const updateWorkSteps = useCallback((newSteps: WorkStep[]) => {
        setDocument(prev => ({ ...prev, workMethod: newSteps }));
    }, [setDocument]);

    const handleAddStep = useCallback(() => {
        const newStep: WorkStep = { step: workSteps.length + 1, content: '' };
        updateWorkSteps([...workSteps, newStep]);
        setSelectedStep(newStep.step);
        setEditingStep(newStep);
    }, [workSteps, updateWorkSteps]);

    const handleUpdateStep = useCallback((step: number, content: string) => {
        updateWorkSteps(workSteps.map(s => s.step === step ? { ...s, content } : s));
        if (editingStep?.step === step) {
            setEditingStep({ ...editingStep, content });
        }
    }, [workSteps, updateWorkSteps, editingStep]);

    const handleDeleteStep = useCallback((step: number) => {
        if (!confirm(`작업 ${step}을 삭제하시겠습니까?`)) return;
        const newSteps = workSteps.filter(s => s.step !== step).map((s, idx) => ({ ...s, step: idx + 1 }));
        updateWorkSteps(newSteps);
        if (selectedStep === step) {
            setSelectedStep(null);
            setEditingStep(null);
        }
    }, [workSteps, updateWorkSteps, selectedStep]);

    const handleMoveStep = useCallback((step: number, direction: 'up' | 'down') => {
        const idx = workSteps.findIndex(s => s.step === step);
        if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === workSteps.length - 1)) return;
        const newSteps = [...workSteps];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
        updateWorkSteps(newSteps.map((s, i) => ({ ...s, step: i + 1 })));
    }, [workSteps, updateWorkSteps]);

    const handleLoadSampleData = useCallback(() => {
        if (workSteps.length > 0 && !confirm('기존 데이터를 샘플로 대체하시겠습니까?')) return;
        const sampleSteps: WorkStep[] = [
            { step: 1, content: '부품 입고 확인 및 외관 검사' },
            { step: 2, content: '작업 지그 설치 및 고정' },
            { step: 3, content: '조립 전 부품 청소' },
            { step: 4, content: '메인 프레임 조립' },
            { step: 5, content: '하위 부품 결합 (토크 20N·m)' },
            { step: 6, content: '배선 연결 및 절연 확인' },
            { step: 7, content: '기능 테스트 실행' },
            { step: 8, content: '최종 외관 검사 및 라벨 부착' },
            { step: 9, content: '포장 및 출하 준비' },
        ];
        updateWorkSteps(sampleSteps);
        alert('✅ 9건의 샘플 작업 단계가 로드되었습니다.');
    }, [workSteps, updateWorkSteps]);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setDocument(prev => ({ ...prev, processImage: ev.target?.result as string }));
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }, [setDocument]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            {/* 상단 헤더 */}
            <div className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-gray-800">📋 작업표준</h2>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">총 <b>{workSteps.length}</b>단계</span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded">공정: <b>{document.processName || '-'}</b></span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleLoadSampleData} className="px-3 py-1.5 bg-purple-500 text-white rounded text-xs hover:bg-purple-600">📋 샘플</button>
                    <button onClick={handleAddStep} className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">➕ 단계 추가</button>
                </div>
            </div>

            {/* 메인 영역 */}
            <div className="flex-1 flex overflow-hidden">
                {/* 좌측: 작업 단계 목록 */}
                <div className="flex-1 overflow-auto p-2">
                    <table className="w-full text-xs border-collapse bg-white rounded shadow-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="border px-2 py-1.5 w-12 text-center">순서</th>
                                <th className="border px-2 py-1.5 text-left">작업 내용</th>
                                <th className="border px-2 py-1.5 w-20 text-center">이동</th>
                                <th className="border px-2 py-1.5 w-10 text-center">삭제</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workSteps.map((step, idx) => (
                                <tr
                                    key={step.step}
                                    onClick={() => { setSelectedStep(step.step); setEditingStep(step); }}
                                    className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedStep === step.step ? 'bg-blue-100' : ''}`}
                                >
                                    <td className="border px-2 py-2 text-center">
                                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full font-bold text-[11px]">
                                            {step.step}
                                        </span>
                                    </td>
                                    <td className="border px-2 py-2">
                                        <input
                                            type="text"
                                            value={step.content}
                                            onChange={(e) => handleUpdateStep(step.step, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded outline-none transition-colors"
                                            placeholder="작업 내용을 입력하세요"
                                        />
                                    </td>
                                    <td className="border px-2 py-2 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveStep(step.step, 'up'); }}
                                                disabled={idx === 0}
                                                className={`px-1.5 py-0.5 rounded text-[10px] ${idx === 0 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-200'}`}
                                            >⬆️</button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleMoveStep(step.step, 'down'); }}
                                                disabled={idx === workSteps.length - 1}
                                                className={`px-1.5 py-0.5 rounded text-[10px] ${idx === workSteps.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-200'}`}
                                            >⬇️</button>
                                        </div>
                                    </td>
                                    <td className="border px-2 py-2 text-center">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.step); }}
                                            className="text-red-400 hover:text-red-600"
                                        >🗑️</button>
                                    </td>
                                </tr>
                            ))}
                            {workSteps.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="border px-4 py-8 text-center text-gray-400">
                                        등록된 작업 단계가 없습니다.
                                        <button onClick={handleLoadSampleData} className="text-purple-500 underline ml-2">샘플 로드</button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 우측: 상세 패널 */}
                <div className="w-[320px] border-l bg-white overflow-y-auto p-3 space-y-3 shrink-0">
                    {/* 공정 이미지 */}
                    <div className="bg-blue-50 rounded p-3 text-xs">
                        <div className="font-bold text-gray-700 border-b pb-1 mb-2">📷 작업 공정도</div>
                        {document.processImage ? (
                            <div className="relative">
                                <img src={document.processImage} alt="공정도" className="w-full h-32 object-contain bg-white rounded" />
                                <div className="absolute top-1 right-1 flex gap-1">
                                    <button onClick={() => fileInputRef.current?.click()} className="px-1.5 py-0.5 bg-blue-500 text-white rounded text-[10px]">변경</button>
                                    <button onClick={() => setDocument(prev => ({ ...prev, processImage: undefined }))} className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[10px]">삭제</button>
                                </div>
                            </div>
                        ) : (
                            <div onClick={() => fileInputRef.current?.click()} className="h-20 border-2 border-dashed border-blue-300 rounded flex items-center justify-center bg-white cursor-pointer hover:bg-blue-50">
                                <span className="text-gray-400">📷 클릭하여 공정도 추가</span>
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </div>

                    {/* 안전 보호구 */}
                    <div className="bg-yellow-50 rounded p-3 text-xs">
                        <div className="font-bold text-gray-700 border-b pb-1 mb-2">🦺 안전 보호구</div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { key: 'gloves', label: '장갑', icon: '🧤' },
                                { key: 'safetyShoes', label: '안전화', icon: '👟' },
                                { key: 'helmet', label: '안전모', icon: '⛑️' },
                                { key: 'mask', label: '마스크', icon: '😷' },
                                { key: 'earplugs', label: '귀마개', icon: '🔇' },
                                { key: 'safetyGlasses', label: '보안경', icon: '🥽' },
                            ].map(({ key, label, icon }) => (
                                <label key={key} className="flex items-center gap-1 cursor-pointer hover:bg-yellow-100 p-1 rounded">
                                    <input
                                        type="checkbox"
                                        checked={document.safetyEquipment?.[key as keyof typeof document.safetyEquipment] || false}
                                        onChange={(e) => setDocument(prev => ({
                                            ...prev,
                                            safetyEquipment: { ...prev.safetyEquipment, [key]: e.target.checked }
                                        }))}
                                        className="rounded"
                                    />
                                    <span>{icon} {label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 선택된 단계 상세 */}
                    {editingStep ? (
                        <div className="bg-green-50 rounded p-3 text-xs space-y-2">
                            <div className="font-bold text-gray-700 border-b pb-1 mb-2">✏️ 단계 {editingStep.step} 상세</div>
                            <div>
                                <label className="text-gray-500">작업 내용</label>
                                <textarea
                                    value={editingStep.content}
                                    onChange={(e) => handleUpdateStep(editingStep.step, e.target.value)}
                                    rows={4}
                                    className="w-full px-2 py-1 border rounded mt-0.5 resize-none"
                                    placeholder="상세 작업 내용을 입력하세요..."
                                />
                            </div>
                            <div className="text-gray-400 text-[10px]">💡 Tip: 좌측 목록에서 직접 편집도 가능합니다</div>
                        </div>
                    ) : (
                        <div className="bg-gray-100 rounded p-3 text-xs text-center text-gray-400">
                            👈 좌측에서 작업 단계를 선택하세요
                        </div>
                    )}

                    {/* 공정 정보 요약 */}
                    <div className="bg-gray-50 rounded p-3 text-xs space-y-1">
                        <div className="font-bold text-gray-700 border-b pb-1 mb-2">📊 공정 정보</div>
                        <div className="flex justify-between"><span className="text-gray-500">공정번호:</span><span>{document.processNo || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">공정명:</span><span>{document.processName || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">제품명:</span><span>{document.productName || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Part No:</span><span>{document.partNo || '-'}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const PmWorkStandardTab = React.memo(PmWorkStandardTabInner);
export default PmWorkStandardTab;
