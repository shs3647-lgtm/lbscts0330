/**
 * @file TreePanel.tsx
 * @description FMEA 워크시트 트리 패널 (BaseTreePanel 기반 리팩토링)
 * @version 3.1.0 - AI 추천 통합
 * @updated 2026-01-04
 */

'use client';

import React from 'react';
import BaseTreePanel, { TreeItem, TreeBranch, TreeLeaf, TreeEmpty, TreeBadge, tw } from './BaseTreePanel';
import { getL1TypeColor, TREE_FUNCTION, TREE_FUNCTION_L3, TREE_FAILURE } from '@/styles/level-colors';
import TreeAIRecommend from '@/components/ai/TreeAIRecommend';
import { getMissingWorkElements } from '../../WorkElementSelectModal';
// ★★★ 2026-02-16: 워크시트 탭과 동일한 필터 함수 import (트리뷰=워크시트 미러 원칙) ★★★
import { isMeaningful as isMeaningfulL1 } from '../../tabs/function/functionL1Utils';
import { isMeaningfulL2 } from '../../tabs/function/functionL2Utils';
import { isMeaningfulL3 } from '../../tabs/function/functionL3Utils';

/** ★★★ 마스터 데이터 검증 정보 (STRUCTURE_DRIVEN_DESIGN.md 7.1 매핑표 기반) ★★★ */
interface MasterDataInfo {
  /** itemCode별 건수 (A1,A2,B1=구조 / C1~C3,A3~A4,B2~B3=기능 / C4,A5,B4=고장) */
  counts: Record<string, number>;
  total: number;
  /** itemCode별 유니크 processNo 목록 (L2 탭: 구조 processNo와 비교해 누락 감지) */
  processNos: Record<string, string[]>;
  /** itemCode별 유니크 processNo::m4 키 목록 (L3 탭: 구조 WE와 비교해 누락 감지) */
  keys: Record<string, string[]>;
}

interface TreePanelProps {
  state: any;
  collapsedIds?: Set<string>;
  setCollapsedIds?: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  onAddAIItem?: (type: 'cause' | 'mode' | 'effect', value: string, context?: any) => void;
  /** 입력 모드 (auto/manual) — page.tsx에서 전달 */
  inputMode?: 'auto' | 'manual';
  /** 입력 모드 변경 콜백 */
  setInputMode?: React.Dispatch<React.SetStateAction<'auto' | 'manual'>>;
}

// ============ IM 원자재 오류 타입 ============
interface ImError {
  processNo: string;
  processName: string;
  m4: string;
  weName: string;
  weId: string;
  charName: string;  // 오류가 발생한 값 (processChar name 또는 WE name)
  source: 'B1' | 'B3'; // B1=작업요소명, B3=공정특성값
}

// 4M 색상
const M4_COLORS: Record<string, { bg: string; text: string }> = {
  MN: { bg: '#ffebee', text: '#d32f2f' },
  MC: { bg: '#e3f2fd', text: '#1565c0' },
  IM: { bg: '#e8f5e9', text: '#2e7d32' },
  EN: { bg: '#fff3e0', text: '#f57c00' },
};

// ★★★ 2026-02-20: IM 원자재 오류 검증 제거 (오탐 문제로 비활성화) ★★★
function scanImErrors(_state: any): ImError[] {
  return [];
}

/** 작업요소별 오류 수 집계 */
function countImErrorsByWe(errors: ImError[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of errors) {
    map.set(e.weId, (map.get(e.weId) || 0) + 1);
  }
  return map;
}

/** ★★★ 검증 배너 — 모든 트리뷰 탭에서 공통 사용 ★★★ */
function ValidationBanner({ imErrors, onShowDetail, totalMissing, emptyMessage, masterInfo }: {
  imErrors: ImError[];
  onShowDetail: () => void;
  totalMissing?: number;
  emptyMessage?: string;
  /** 마스터 기초정보 건수 표시 (예: "C2:9 C3:9") */
  masterInfo?: string;
}) {
  const hasErrors = imErrors.length > 0;
  const hasMissing = (totalMissing || 0) > 0;
  const isAllGood = !hasErrors && !hasMissing && !emptyMessage;
  return (
    <div className={`mb-2 px-2.5 py-1.5 rounded text-[10px] font-bold border ${
      isAllGood ? 'bg-green-50 border-green-300 text-green-800' : 'bg-amber-50 border-amber-300 text-amber-800'
    }`}>
      <div className="flex items-center gap-1 flex-wrap">
        <span>검증:</span>
        {isAllGood && <span className="text-green-600">정상</span>}
        {hasErrors && (
          <button type="button" onClick={onShowDetail} className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded cursor-pointer hover:bg-red-600">
            이상 {imErrors.length}건
          </button>
        )}
        {hasMissing && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500 text-white rounded">누락 {totalMissing}건</span>}
        {emptyMessage && <span className="text-gray-500">{emptyMessage}</span>}
        {masterInfo && <span className="ml-auto text-[9px] text-blue-600 font-normal">{masterInfo}</span>}
      </div>
    </div>
  );
}

/** ★★★ IM 원자재 오류 상세 모달 — 모든 트리뷰 탭에서 공통 사용 ★★★ */
function ImDetailModal({ imErrors, onClose }: { imErrors: ImError[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-[480px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-red-600 text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between">
          <span className="font-bold text-sm">IM 원자재 오류 상세(IM Material Error Detail) ({imErrors.length}건)</span>
          <button type="button" onClick={onClose} className="text-white hover:text-red-200 cursor-pointer text-lg font-bold">x</button>
        </div>
        <div className="p-3 overflow-auto flex-1">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-red-50">
                <th className="border px-2 py-1 text-left">NO</th>
                <th className="border px-2 py-1 text-left" title="Process">공정(Process)</th>
                <th className="border px-2 py-1 text-left" title="Work Element">작업요소(WE)</th>
                <th className="border px-2 py-1 text-left">4M</th>
                <th className="border px-2 py-1 text-left" title="Error Value">오류값(Error)</th>
                <th className="border px-2 py-1 text-left" title="Source">출처(Source)</th>
              </tr>
            </thead>
            <tbody>
              {imErrors.map((err, i) => (
                <tr key={i} className="hover:bg-red-50">
                  <td className="border px-2 py-1">{i + 1}</td>
                  <td className="border px-2 py-1">{err.processNo}-{err.processName}</td>
                  <td className="border px-2 py-1">{err.weName}</td>
                  <td className="border px-2 py-1 text-red-600 font-bold">{err.m4}</td>
                  <td className="border px-2 py-1 text-red-600">{err.charName}</td>
                  <td className="border px-2 py-1">{err.source === 'B1' ? '작업요소명' : '공정특성'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800">
            <div className="font-bold mb-1">IM(부자재) 판별 기준:</div>
            <div>도료, 도장, 페인트, 프라이머, 클리어코트, 코팅제 → 원자재(제품 일부)이므로 IM 대상 아님</div>
            <div className="mt-1">Import 화면에서 4M 분류를 수정하거나 해당 항목을 삭제하세요.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TreePanel({ state, onAddAIItem, inputMode, setInputMode }: TreePanelProps) {
  const tab = state.tab;

  // ★★★ 2026-02-17: IM 원자재 오류 전체 스캔 (모든 탭에서 사용) ★★★
  const imErrors = React.useMemo(() => scanImErrors(state), [state]);
  const imErrorByWe = React.useMemo(() => countImErrorsByWe(imErrors), [imErrors]);
  const [showImDetailModal, setShowImDetailModal] = React.useState(false);

  // ★★★ 2026-02-17: 마스터 데이터(기초정보) 검증 — 구조와 비교해 누락 감지 ★★★
  // STRUCTURE_DRIVEN_DESIGN.md 7.1 매핑표 기반: 각 시트별 데이터 수 + processNo/m4 커버리지
  const [masterData, setMasterData] = React.useState<MasterDataInfo | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/dfmea/master?includeItems=true');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const items: any[] = data.active?.flatItems || [];
        const info: MasterDataInfo = { counts: {}, total: items.length, processNos: {}, keys: {} };
        for (const it of items) {
          const code = it.itemCode as string;
          if (!code) continue;
          info.counts[code] = (info.counts[code] || 0) + 1;
          // processNo 수집 → L2 탭에서 구조 processNo와 비교
          const pno = it.processNo as string;
          if (pno) {
            if (!info.processNos[code]) info.processNos[code] = [];
            if (!info.processNos[code].includes(pno)) info.processNos[code].push(pno);
          }
          // processNo::m4 복합키 수집 → L3 탭에서 구조 WE와 비교
          const m4 = it.m4 as string;
          if (pno && m4) {
            const key = `${pno}::${m4}`;
            if (!info.keys[code]) info.keys[code] = [];
            if (!info.keys[code].includes(key)) info.keys[code].push(key);
          }
        }
        if (!cancelled) setMasterData(info);
      } catch { /* 조회 실패 시 null 유지 */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // ========== 구조 트리 ==========
  // ★★★ 2026-02-16: 트리뷰 = 워크시트 읽기전용 미러 (필터링 동일화) ★★★
  // rows 계산의 isPlaceholderProc와 동일한 필터 사용
  const isPlaceholderProc = (p: any) => {
    const name = (p.name || '').trim();
    return name.includes('클릭') || name.includes('선택');
  };

  if (tab === 'structure') {
    const visibleProcs = state.l2.filter((p: any) => !isPlaceholderProc(p));
    const s2Count = visibleProcs.filter((p: any) => p.name?.trim()).length;
    const s3Count = visibleProcs.reduce((sum: number, p: any) =>
      sum + (p.l3 || []).filter((w: any) => w.name && !w.name.includes('추가') && !w.name.includes('클릭')).length, 0);

    // ★★★ 검증 상태 산출 ★★★
    const totalMissing = visibleProcs.reduce((sum: number, proc: any) => {
      const validL3 = (proc.l3 || []).filter((w: any) => w.name?.trim() && !w.name.includes('추가') && !w.name.includes('클릭'));
      const selectedNames = validL3.map((w: any) => w.name || '');
      return sum + getMissingWorkElements(proc.no || '', selectedNames).length;
    }, 0);
    const hasErrors = imErrors.length > 0;
    const hasMissing = totalMissing > 0;
    const isAllGood = !hasErrors && !hasMissing && s3Count > 0;

    return (
      <>
      <BaseTreePanel config={{
        icon: '🌳',
        title: '구조트리(Structure Tree)',
        counts: [{ label: '완제품(Product)', value: 1 }, { label: '메인공정(Process)', value: s2Count }, { label: '작업요소(WE)', value: s3Count }],
        theme: 'structure',
        subHeader: { icon: '📦', label: state.l1.name || '(완제품명 입력)', bgColor: '#1976d2', textColor: '#fff' },
        // ★ 헤더 공간 부족 → extra 미사용, 검증 배너에서 표시
      }}>
        {/* ★★★ 검증 요약 배너 — 구조분석: A1(공정번호), A2(공정명), B1(작업요소) 단위검증 ★★★ */}
        {(() => {
          if (!masterData) return <ValidationBanner imErrors={imErrors} onShowDetail={() => setShowImDetailModal(true)} totalMissing={totalMissing} emptyMessage={!hasErrors && !hasMissing && s3Count === 0 ? '작업요소 미등록' : undefined} masterInfo="기초정보 조회중..." />;
          const a1 = masterData.counts.A1 || 0;
          const a2 = masterData.counts.A2 || 0;
          const b1 = masterData.counts.B1 || 0;
          // 구조 L2 processNo vs 마스터 A1 processNo 단위검증
          const structPNos = visibleProcs.filter((p: any) => p.no?.trim()).map((p: any) => p.no);
          const masterA1PNos = new Set(masterData.processNos.A1 || []);
          const missingA1 = structPNos.filter((no: string) => !masterA1PNos.has(no));
          // 구조 L3 processNo::m4 vs 마스터 B1 keys 단위검증
          const structKeys = visibleProcs.flatMap((p: any) =>
            (p.l3 || []).filter((w: any) => w.name?.trim() && !w.name.includes('추가') && !w.name.includes('클릭') && w.m4)
              .map((w: any) => `${p.no}::${w.m4}`)
          );
          const masterB1Keys = new Set(masterData.keys.B1 || []);
          const missingB1 = structKeys.filter((key: string) => !masterB1Keys.has(key));
          const parts: string[] = [`A1:${a1}`, `A2:${a2}`, `B1:${b1}`];
          if (missingA1.length > 0) parts.push(`A1누락:${missingA1.join(',')}`);
          if (missingB1.length > 0) parts.push(`B1누락:${missingB1.length}`);
          return <ValidationBanner
            imErrors={imErrors}
            onShowDetail={() => setShowImDetailModal(true)}
            totalMissing={totalMissing}
            emptyMessage={!hasErrors && !hasMissing && s3Count === 0 ? '작업요소 미등록' : undefined}
            masterInfo={parts.join(' | ')}
          />;
        })()}

        {visibleProcs.map((proc: any, pIdx: number) => {
          // ★★★ 2026-02-05: 빈 이름도 표시 (컨텍스트 메뉴로 추가된 항목) ★★★
          const allL3 = (proc.l3 || []).filter((w: any) => !w.name?.includes('추가') && !w.name?.includes('클릭'));
          const validL3 = allL3.filter((w: any) => w.name?.trim());
          // ★★★ 2026-02-02: 마스터 데이터(기초정보) 기반 누락 체크 ★★★
          const selectedNames = validL3.map((w: any) => w.name || '');
          const missingElements = getMissingWorkElements(proc.no || '', selectedNames);
          const connectedCount = validL3.length;
          const missingCount = missingElements.length;
          // 빈 이름 항목 (새로 추가된 항목)
          const emptyL3 = allL3.filter((w: any) => !w.name?.trim());

          // 공정명 표시: no/name 모두 비어있으면 가이드 텍스트
          const hasNo = proc.no?.trim();
          const hasName = proc.name?.trim();
          const procLabel = hasNo && hasName
            ? `${proc.no}-${proc.name}`
            : hasNo && !hasName
            ? `${proc.no}-(공정명 입력)`
            : !hasNo && hasName
            ? `??-${proc.name}`
            : '📌 공정을 선택하세요';

          return (
            <TreeBranch key={proc.id} borderColor="#1976d2">
              {/* 공정명: 파란색 + 연결/누락 배지 */}
              <TreeItem
                icon="📁"
                label={procLabel}
                count={connectedCount + emptyL3.length}  // 빈 항목도 카운트
                bgColor={pIdx % 2 === 0 ? '#e3f2fd' : '#bbdefb'}
                textColor={proc.name?.trim() ? '#1565c0' : '#9ca3af'}
                badge={
                  missingCount > 0 ? (
                    <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded">
                      누락 {missingCount}
                    </span>
                  ) : emptyL3.length > 0 ? (
                    <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-amber-500 text-white rounded">
                      신규 {emptyL3.length}
                    </span>
                  ) : undefined
                }
              />
              <div className="ml-4">
                {/* 기존 작업요소 */}
                {validL3.map((w: any, wIdx: number) => {
                  const weImErrors = imErrorByWe.get(w.id) || 0;
                  const imError = weImErrors > 0;
                  // 상태 뱃지: 정상/이상
                  const statusBadge = w.m4 === 'IM' ? (
                    imError
                      ? <span className="ml-1 px-1 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded">이상 {weImErrors}</span>
                      : <span className="ml-1 px-1 py-0.5 text-[9px] font-bold bg-green-500 text-white rounded">정상</span>
                  ) : null;
                  return (
                    <TreeLeaf
                      key={w.id}
                      icon={imError ? '⚠️' : ''}
                      label={w.name}
                      bgColor={imError ? '#fee2e2' : wIdx % 2 === 0 ? '#e3f2fd' : '#bbdefb'}
                      textColor={imError ? '#dc2626' : '#1565c0'}
                      indent={0}
                      badge={<>
                        <TreeBadge label={w.m4 || '-'} bgColor={imError ? '#dc2626' : '#1976d2'} textColor="#fff" />
                        {statusBadge}
                      </>}
                    />
                  );
                })}
                {/* ★★★ 2026-02-05: 새로 추가된 빈 작업요소 표시 ★★★ */}
                {emptyL3.map((w: any) => (
                  <TreeLeaf key={w.id} icon="✨" label="(새 작업요소)" bgColor="#fef3c7" textColor="#d97706" indent={0} badge={<TreeBadge label={w.m4 || '미정'} bgColor="#f59e0b" textColor="#fff" />} />
                ))}
                {/* 누락된 작업요소 표시 */}
                {missingElements.map((elem: any, idx: number) => (
                  <TreeLeaf key={`missing-${elem.id}-${idx}`} icon="⚠️" label={`[${elem.m4}] ${elem.name}`} bgColor="#fee2e2" textColor="#dc2626" indent={0} badge={<TreeBadge label="누락" bgColor="#dc2626" textColor="#fff" />} />
                ))}
              </div>
            </TreeBranch>
          );
        })}
      </BaseTreePanel>

      {showImDetailModal && <ImDetailModal imErrors={imErrors} onClose={() => setShowImDetailModal(false)} />}
      </>
    );
  }

  // ========== 1L 기능트리 ==========
  if (tab === 'function-l1') {
    // ✅ 의미 있는 데이터만 필터링
    const meaningfulTypes = (state.l1.types || []).filter((t: any) => {
      const name = t.name || '';
      return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
    });

    const funcCount = meaningfulTypes.reduce((s: number, t: any) => {
      const meaningfulFuncs = (t.functions || []).filter((f: any) => {
        const name = f.name || '';
        return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
      });
      return s + meaningfulFuncs.length;
    }, 0);

    const reqCount = meaningfulTypes.reduce((s: number, t: any) => {
      const meaningfulFuncs = (t.functions || []).filter((f: any) => {
        const name = f.name || '';
        return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
      });
      return s + meaningfulFuncs.reduce((a: number, f: any) => {
        const meaningfulReqs = (f.requirements || []).filter((r: any) => {
          const name = r.name || '';
          return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
        });
        return a + meaningfulReqs.length;
      }, 0);
    }, 0);

    return (
      <BaseTreePanel config={{
        icon: '🎯',
        title: '1L 기능트리(Function Tree)',
        counts: [{ label: '완제품(Product)', value: 1 }, { label: '기능(Func)', value: funcCount }, { label: '요구사항(Req)', value: reqCount }],
        theme: 'function-l1',
      }}>
        {/* ★ 1L기능: C1(구분), C2(제품기능), C3(요구사항) — 구분(YP/SP/USER) 대비 단위검증 */}
        {(() => {
          if (!masterData) return <ValidationBanner imErrors={[]} onShowDetail={() => {}} masterInfo="기초정보 조회중..." />;
          const c1 = masterData.counts.C1 || 0;
          const c2 = masterData.counts.C2 || 0;
          const c3 = masterData.counts.C3 || 0;
          // 구조의 구분(YP/SP/USER) vs 마스터 C2의 processNo(=category) 단위검증
          const structCategories = meaningfulTypes.map((t: any) => t.name?.trim()).filter(Boolean);
          const masterC2Cats = new Set(masterData.processNos.C2 || []);
          const missingC2 = structCategories.filter((cat: string) => !masterC2Cats.has(cat));
          const masterC3Cats = new Set(masterData.processNos.C3 || []);
          const missingC3 = structCategories.filter((cat: string) => !masterC3Cats.has(cat));
          const parts: string[] = [`C1:${c1}`, `C2:${c2}`, `C3:${c3}`];
          if (missingC2.length > 0) parts.push(`C2누락:${missingC2.join(',')}`);
          if (missingC3.length > 0) parts.push(`C3누락:${missingC3.join(',')}`);
          return <ValidationBanner
            imErrors={[]}
            onShowDetail={() => {}}
            emptyMessage={c2 + c3 === 0 ? '기초정보 C2/C3 미입력' : undefined}
            masterInfo={parts.join(' | ')}
          />;
        })()}
        <TreeItem icon="📦" label={state.l1.name || '(완제품명)'} bgColor="#bbf7d0" textColor="#166534" className="mb-2" />
        {meaningfulTypes.length === 0 ? (
          <TreeEmpty message="구분/기능/요구사항을 정의하세요" />
        ) : meaningfulTypes.map((t: any) => {
          const typeColor = getL1TypeColor(t.name);
          // ✅ 의미 있는 기능만 필터링
          const meaningfulFuncs = (t.functions || []).filter((f: any) => {
            const name = f.name || '';
            return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
          });

          return (
            <TreeBranch key={t.id} borderColor={typeColor.bg}>
              <TreeItem icon="📋" label={t.name} bgColor={typeColor.bg} textColor="#fff" />
              {meaningfulFuncs.length === 0 ? (
                <TreeEmpty message="(기능 미입력)" small />
              ) : meaningfulFuncs.map((f: any) => {
                // ✅ 의미 있는 요구사항만 필터링
                const meaningfulReqs = (f.requirements || []).filter((r: any) => {
                  const name = r.name || '';
                  return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
                });

                return (
                  <div key={f.id} className="ml-3 mb-1">
                    <TreeLeaf icon="⚙️" label={f.name} bgColor={typeColor.light} textColor={typeColor.text} indent={0} />
                    {meaningfulReqs.map((r: any) => (
                      <TreeLeaf key={r.id} icon="•" label={r.name} bgColor="#fff3e0" textColor="#e65100" indent={4} />
                    ))}
                  </div>
                );
              })}
            </TreeBranch>
          );
        })}
      </BaseTreePanel>
    );
  }

  // ========== 2L 기능트리 ==========
  // ★★★ 2026-02-16: 로컬 필터 제거 → 워크시트 Utils 함수 사용 (트리뷰=워크시트 미러) ★★★
  // function-l2: isMeaningfulL2 (functionL2Utils) → 빈값+'클릭하여'+'선택'+'입력'
  // function-l3: isMeaningfulL3 (functionL3Utils) → 빈값+'클릭하여'+'선택'+'입력'
  // failure-l2/l3: isMeaningfulL1 (functionL1Utils) → 빈값+'클릭하여'+'선택'

  // ★★★ function-l3 전용: FunctionL3Tab.isMeaningfulFunc와 동일 로직 ★★★
  const isMeaningfulL3Func = (f: any) => {
    const name = f.name || '';
    const hasProcessChars = (f.processChars || []).some((c: any) => c.name && c.name.trim() !== '');
    const isNameMeaningful = isMeaningfulL3(name) && !name.includes('자동생성');
    return isNameMeaningful || hasProcessChars;
  };

  // ★★★ failure-l1 전용: FailureL1Tab.isMeaningfulRequirementName과 동일 ★★★
  const isMeaningfulReq = (name: unknown): boolean => {
    if (typeof name !== 'string') return false;
    const n = name.trim();
    if (!n) return false;
    if (n.includes('클릭하여')) return false;
    if (n === '요구사항 선택') return false;
    if (n.startsWith('(기능분석에서')) return false;
    return true;
  };

  if (tab === 'function-l2') {
    const procCount = state.l2.filter((p: any) => isMeaningfulL2(p.name)).length;
    const funcCount = state.l2.reduce((s: number, p: any) => s + (p.functions || []).filter((f: any) => isMeaningfulL2(f.name)).length, 0);
    const charCount = state.l2.reduce((s: number, p: any) => s + (p.functions || []).reduce((a: number, f: any) => a + (f.productChars || []).filter((c: any) => isMeaningfulL2(c.name)).length, 0), 0);

    return (
      <BaseTreePanel config={{
        icon: '🔧',
        title: '2L 기능트리(Function Tree)',
        counts: [{ label: '공정(Process)', value: procCount }, { label: '기능(Func)', value: funcCount }, { label: '제품특성(PC)', value: charCount }],
        theme: 'function-l2',
      }}>
        {/* ★ 2L기능: A3(공정기능), A4(제품특성) — 각각 processNo 대비 단위검증 */}
        {(() => {
          if (!masterData) return <ValidationBanner imErrors={[]} onShowDetail={() => {}} masterInfo="기초정보 조회중..." />;
          const a3 = masterData.counts.A3 || 0;
          const a4 = masterData.counts.A4 || 0;
          // 구조의 processNo 목록
          const structPNos = state.l2.filter((p: any) => isMeaningfulL2(p.name) && p.no?.trim()).map((p: any) => p.no);
          // A3 단위검증: 각 processNo에 A3 데이터 있는지
          const masterA3PNos = new Set(masterData.processNos.A3 || []);
          const missingA3 = structPNos.filter((no: string) => !masterA3PNos.has(no));
          // A4 단위검증: 각 processNo에 A4 데이터 있는지
          const masterA4PNos = new Set(masterData.processNos.A4 || []);
          const missingA4 = structPNos.filter((no: string) => !masterA4PNos.has(no));
          const parts: string[] = [`A3:${a3}`, `A4:${a4}`];
          if (missingA3.length > 0) parts.push(`A3누락:${missingA3.join(',')}`);
          if (missingA4.length > 0) parts.push(`A4누락:${missingA4.join(',')}`);
          return <ValidationBanner
            imErrors={[]}
            onShowDetail={() => {}}
            emptyMessage={a3 + a4 === 0 ? '기초정보 A3/A4 미입력' : undefined}
            masterInfo={parts.join(' | ')}
          />;
        })()}
        {state.l2.length === 0 ? (
          <TreeEmpty message="구조분석에서 공정을 추가하세요" />
        ) : state.l2.filter((p: any) => isMeaningfulL2(p.name)).map((proc: any) => {
          const meaningfulFuncs = (proc.functions || []).filter((f: any) => isMeaningfulL2(f.name));
          return (
            <TreeBranch key={proc.id} borderColor={TREE_FUNCTION.border}>
              <TreeItem icon="🏭" label={`${proc.no}. ${proc.name}`} bgColor={TREE_FUNCTION.procBg} textColor={TREE_FUNCTION.procText} />
              {meaningfulFuncs.length === 0 ? (
                <TreeEmpty message="기능 미정의" small />
              ) : meaningfulFuncs.map((f: any) => {
                const meaningfulChars = (f.productChars || []).filter((c: any) => isMeaningfulL2(c.name));
                return (
                  <div key={f.id} className="ml-3 mb-1">
                    <TreeLeaf icon="⚙️" label={f.name} bgColor={TREE_FUNCTION.itemBg} textColor={TREE_FUNCTION.itemText} indent={0} />
                    {meaningfulChars.map((c: any) => (
                      <TreeLeaf
                        key={c.id}
                        icon="📐"
                        label={c.name}
                        bgColor={c.specialChar ? '#fed7aa' : '#fff7ed'}
                        textColor="#e65100"
                        indent={4}
                        badge={c.specialChar && <TreeBadge label={c.specialChar} bgColor="#f97316" textColor="#fff" />}
                      />
                    ))}
                  </div>
                );
              })}
            </TreeBranch>
          );
        })}
      </BaseTreePanel>
    );
  }

  // ========== 3L 기능트리 (공정:파란색, 기능:녹색, 공정특성:주황색) ==========
  if (tab === 'function-l3') {
    const weCount = state.l2.reduce((s: number, p: any) => s + (p.l3 || []).filter((w: any) => isMeaningfulL3(w.name)).length, 0);
    const funcCount = state.l2.reduce((s: number, p: any) => s + (p.l3 || []).reduce((a: number, w: any) => a + (w.functions || []).filter((f: any) => isMeaningfulL3Func(f)).length, 0), 0);
    const charCount = state.l2.reduce((s: number, p: any) => s + (p.l3 || []).reduce((a: number, w: any) => a + (w.functions || []).reduce((b: number, f: any) => b + (f.processChars || []).filter((c: any) => isMeaningfulL3(c.name)).length, 0), 0), 0);

    return (
      <>
      <BaseTreePanel config={{
        icon: '🛠️',
        title: '3L 기능트리(Function Tree)',
        counts: [{ label: '작업요소(WE)', value: weCount }, { label: '기능(Func)', value: funcCount }, { label: '공정특성(PC)', value: charCount }],
        theme: 'function-l3',
      }}>
        {/* ★ 3L기능: B2(요소기능), B3(공정특성) — 각각 processNo::m4 대비 단위검증 */}
        {(() => {
          if (!masterData) return <ValidationBanner imErrors={[]} onShowDetail={() => {}} masterInfo="기초정보 조회중..." />;
          const b2 = masterData.counts.B2 || 0;
          const b3 = masterData.counts.B3 || 0;
          // 구조의 processNo::m4 목록 + 작업요소명
          const structEntries = state.l2.flatMap((p: any) =>
            (p.l3 || []).filter((w: any) => isMeaningfulL3(w.name) && w.m4).map((w: any) => ({
              key: `${p.no}::${w.m4}`,
              procNo: p.no,
              procName: p.name,
              m4: w.m4,
              weName: w.name,
            }))
          );
          const structKeys = structEntries.map((e: any) => e.key);
          // B2 단위검증
          const masterB2Keys = new Set(masterData.keys.B2 || []);
          const missingB2 = structKeys.filter((key: string) => !masterB2Keys.has(key));
          // B3 단위검증
          const masterB3Keys = new Set(masterData.keys.B3 || []);
          const missingB3 = structKeys.filter((key: string) => !masterB3Keys.has(key));
          const totalMissing = missingB2.length + missingB3.length;
          const parts: string[] = [`B2:${b2}`, `B3:${b3}`];
          if (missingB2.length > 0) parts.push(`B2누락:${missingB2.length}`);
          if (missingB3.length > 0) parts.push(`B3누락:${missingB3.length}`);

          // ★★★ 2026-02-17: 누락 상세 목록 + 수동입력 안내 ★★★
          const missingB2Set = new Set(missingB2);
          const missingDetails = structEntries.filter((e: any) => missingB2Set.has(e.key));

          return <>
            <ValidationBanner
              imErrors={[]}
              onShowDetail={() => {}}
              totalMissing={totalMissing}
              emptyMessage={b2 + b3 === 0 ? '기초정보 B2/B3 미입력' : undefined}
              masterInfo={parts.join(' | ')}
            />
            {missingDetails.length > 0 && (
              <div className="mb-2 px-2 py-1.5 rounded border border-amber-300 bg-amber-50 text-[9px]">
                <div className="font-bold text-amber-800 mb-1">B2 누락 작업요소 (수동입력 필요):</div>
                {missingDetails.map((d: any) => (
                  <div key={d.key} className="flex items-center gap-1 py-0.5 text-amber-700">
                    <span className="font-mono text-[8px] bg-amber-200 px-1 rounded">{d.procNo}</span>
                    <span className="font-bold text-[8px] bg-blue-100 text-blue-700 px-1 rounded">{d.m4}</span>
                    <span>{d.weName}</span>
                    <span className="ml-auto text-red-600 font-bold">수동입력</span>
                  </div>
                ))}
                {setInputMode && (
                  <button
                    type="button"
                    onClick={() => setInputMode('manual')}
                    className="mt-1 w-full px-2 py-1 text-[9px] font-bold bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700"
                  >
                    수동모드로 전환하여 직접 입력
                  </button>
                )}
              </div>
            )}
          </>;
        })()}
        {state.l2.every((p: any) => (p.l3 || []).length === 0) ? (
          <TreeEmpty message="구조분석에서 작업요소를 추가하세요" />
        ) : state.l2.filter((p: any) => (p.l3 || []).some((w: any) => isMeaningfulL3(w.name))).map((proc: any) => {
          const meaningfulWEs = (proc.l3 || []).filter((w: any) => isMeaningfulL3(w.name));
          return (
            <TreeBranch key={proc.id} borderColor="#1976d2">
              {/* 공정명: 파란색 */}
              <TreeItem icon="🏭" label={`${proc.no}. ${proc.name}`} bgColor="#1976d2" textColor="#fff" />
              {meaningfulWEs.map((we: any, weIdx: number) => {
                const meaningfulFuncs = (we.functions || []).filter((f: any) => isMeaningfulL3Func(f));
                // ★★★ 2026-02-02: 기능이 없어도 공정특성 수집 ★★★
                const allProcessChars = (we.functions || []).flatMap((f: any) =>
                  (f.processChars || []).filter((c: any) => isMeaningfulL3(c.name))
                );
                return (
                  <div key={we.id} className="ml-3 mb-1.5">
                    {/* 작업요소: 파란색 */}
                    <TreeLeaf icon="" label={`[${we.m4}] ${we.name}`} bgColor={weIdx % 2 === 0 ? '#e3f2fd' : '#bbdefb'} textColor="#1565c0" indent={0} />
                    {meaningfulFuncs.length === 0 ? (
                      <>
                        {/* ★★★ 기능 미정의 + 공정특성 렌더링 ★★★ */}
                        <div className="ml-3">
                          <TreeLeaf icon="⚙️" label="(기능 미정의 — 워크시트에서 수동입력)" bgColor="#fff3e0" textColor="#e65100" indent={0}
                            badge={<TreeBadge label="수동입력" bgColor="#e65100" textColor="#fff" />}
                          />
                          {allProcessChars.map((c: any, cIdx: number) => (
                            <TreeLeaf
                              key={c.id}
                              icon="📏"
                              label={c.name}
                              bgColor={cIdx % 2 === 0 ? '#fff3e0' : '#ffe0b2'}
                              textColor="#e65100"
                              indent={3}
                              badge={c.specialChar && <TreeBadge label={c.specialChar} bgColor="#f57c00" textColor="#fff" />}
                            />
                          ))}
                        </div>
                      </>
                    ) : meaningfulFuncs.map((f: any, fIdx: number) => {
                      const meaningfulChars = (f.processChars || []).filter((c: any) => isMeaningfulL3(c.name));
                      // ★★★ 기능 name이 비어있으면 "(기능 미정의)" 표시 ★★★
                      const funcLabel = f.name && f.name.trim() ? f.name : '(기능 미정의)';
                      const funcTextColor = f.name && f.name.trim() ? '#1b5e20' : '#9e9e9e';
                      return (
                        <div key={f.id} className="ml-3">
                          {/* 기능: 녹색 */}
                          <TreeLeaf icon="⚙️" label={funcLabel} bgColor={fIdx % 2 === 0 ? '#e8f5e9' : '#c8e6c9'} textColor={funcTextColor} indent={0} />
                          {meaningfulChars.map((c: any, cIdx: number) => (
                            // 공정특성: 주황색 (워크시트와 통일)
                            <TreeLeaf
                              key={c.id}
                              icon="📏"
                              label={c.name}
                              bgColor={cIdx % 2 === 0 ? '#fff3e0' : '#ffe0b2'}
                              textColor="#e65100"
                              indent={3}
                              badge={c.specialChar && <TreeBadge label={c.specialChar} bgColor="#f57c00" textColor="#fff" />}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </TreeBranch>
          );
        })}
      </BaseTreePanel>
      </>
    );
  }

  // ========== 1L 고장영향 트리 (공정명:파란색, 기능:녹색, 고장:주황색) ==========
  // ★★★ 2026-02-16: FailureL1Tab과 동일 필터 적용 ★★★
  if (tab === 'failure-l1') {
    const meaningfulTypesL1 = (state.l1.types || []).filter((t: any) => isMeaningfulL1(t.name));
    const reqCount = meaningfulTypesL1.reduce((s: number, t: any) => {
      const mFuncs = (t.functions || []).filter((f: any) => isMeaningfulL1(f.name));
      return s + mFuncs.reduce((a: number, f: any) => a + (f.requirements || []).filter((r: any) => isMeaningfulReq(r.name)).length, 0);
    }, 0);
    const feCount = (state.l1.failureScopes || []).filter((s: any) => s.effect).length;

    return (
      <BaseTreePanel config={{
        icon: '⚠️',
        title: '1L 고장영향(FE)',
        counts: [{ label: '요구사항(Req)', value: reqCount }, { label: '고장영향(FE)', value: feCount }],
        theme: 'failure-l1',
      }}>
        {/* ★ 1L고장: C4(고장영향) — 구분(YP/SP/USER) 대비 단위검증 */}
        {(() => {
          if (!masterData) return <ValidationBanner imErrors={[]} onShowDetail={() => {}} masterInfo="기초정보 조회중..." />;
          const c4 = masterData.counts.C4 || 0;
          // 구조의 구분(YP/SP/USER) vs 마스터 C4의 category 단위검증
          const structCats = meaningfulTypesL1.map((t: any) => t.name?.trim()).filter(Boolean);
          const masterC4Cats = new Set(masterData.processNos.C4 || []);
          const missingC4 = structCats.filter((cat: string) => !masterC4Cats.has(cat));
          const parts: string[] = [`C4:${c4}`];
          if (missingC4.length > 0) parts.push(`C4누락:${missingC4.join(',')}`);
          return <ValidationBanner
            imErrors={[]}
            onShowDetail={() => {}}
            emptyMessage={c4 === 0 ? '기초정보 C4 미입력' : undefined}
            masterInfo={parts.join(' | ')}
          />;
        })()}
        {/* 공정명: 파란색 */}
        <TreeItem icon="📦" label={state.l1.name || '(완제품 공정명)'} bgColor="#1976d2" textColor="#fff" className="mb-2 border-l-[3px] border-[#1a237e]" />
        {meaningfulTypesL1.length === 0 ? (
          <div className="text-center text-gray-500 text-[10px] p-5">기능분석(L1)에서 구분을 먼저 입력해주세요.</div>
        ) : meaningfulTypesL1.map((type: any) => {
          const typeColor = getL1TypeColor(type.name);
          const meaningfulFuncsL1 = (type.functions || []).filter((f: any) => isMeaningfulL1(f.name));
          return (
            <div key={type.id} className="ml-2 mb-2">
              {/* 구분(YP/SP/User): 고유색상 유지 */}
              <TreeItem icon="🏷️" label={type.name} bgColor={typeColor.bg} textColor="#fff" />
              {meaningfulFuncsL1.length === 0 ? (
                <TreeEmpty message="(기능 미입력)" small />
              ) : meaningfulFuncsL1.map((func: any) => {
                const meaningfulReqsL1 = (func.requirements || []).filter((r: any) => isMeaningfulReq(r.name));
                return (
                <div key={func.id} className="ml-3 mb-1.5">
                  {/* 기능: 녹색 */}
                  <TreeLeaf icon="⚙️" label={func.name} bgColor={TREE_FUNCTION.itemBg} textColor={TREE_FUNCTION.itemText} indent={0} />
                  {meaningfulReqsL1.length === 0 ? (
                    <TreeEmpty message="(요구사항 미입력)" small />
                  ) : meaningfulReqsL1.map((req: any) => {
                    const effects = (state.l1.failureScopes || []).filter((s: any) => s.reqId === req.id);
                    return (
                      <div key={req.id} className="ml-3 mb-1">
                        {/* 요구사항: 주황색 (워크시트와 통일) */}
                        <TreeLeaf icon="📋" label={req.name} bgColor="#fff3e0" textColor="#e65100" indent={0} />
                        {effects.length === 0 ? (
                          <TreeEmpty message="(고장영향 미입력)" small />
                        ) : effects.map((eff: any) => (
                          <TreeLeaf
                            key={eff.id}
                            icon="⚡"
                            label={eff.effect || '(미입력)'}
                            bgColor="#ffe0b2"
                            textColor="#e65100"
                            indent={3}
                            badge={eff.severity && <TreeBadge label={`S:${eff.severity}`} bgColor={eff.severity >= 8 ? '#f97316' : '#fbbf24'} textColor="#000" />}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
                );
              })}
            </div>
          );
        })}
      </BaseTreePanel>
    );
  }

  // ========== 2L 고장형태 트리 (공정명:파란색, 기능:녹색, 제품특성/고장:주황색) ==========
  if (tab === 'failure-l2') {
    const isL2Confirmed = state.failureL2Confirmed || false;
    const charCount = state.l2.reduce((s: number, p: any) => s + (p.functions || []).reduce((a: number, f: any) => a + (f.productChars || []).filter((c: any) => isMeaningfulL1(c.name)).length, 0), 0);
    const fmCount = state.l2.reduce((s: number, p: any) => s + (p.failureModes || []).filter((m: any) => isMeaningfulL1(m.name)).length, 0);

    return (
      <BaseTreePanel config={{
        icon: '🔥',
        title: '2L 고장형태(FM)',
        counts: [{ label: '제품특성(PC)', value: charCount }, { label: '고장형태(FM)', value: fmCount }],
        theme: 'failure-l2',
        extra: !isL2Confirmed && <span className="ml-1 text-yellow-300 text-[9px]">(미확정)</span>,
      }}>
        {/* ★ 2L고장: A5(고장형태) — 구조 processNo 대비 누락 비교 */}
        {(() => {
          if (!masterData) return <ValidationBanner imErrors={[]} onShowDetail={() => {}} masterInfo="기초정보 조회중..." />;
          const a5 = masterData.counts.A5 || 0;
          const structPNos = state.l2.filter((p: any) => isMeaningfulL1(p.name) && p.no?.trim()).map((p: any) => p.no);
          const masterA5PNos = new Set(masterData.processNos.A5 || []);
          const missingA5 = structPNos.filter((no: string) => !masterA5PNos.has(no));
          const missingLabel = missingA5.length > 0 ? ` | 누락:${missingA5.length}공정(${missingA5.join(',')})` : '';
          return <ValidationBanner
            imErrors={[]}
            onShowDetail={() => {}}
            emptyMessage={a5 === 0 ? '기초정보 A5 미입력' : undefined}
            masterInfo={`A5(고장형태):${a5}${missingLabel}`}
          />;
        })()}
        {state.l2.filter((p: any) => isMeaningfulL1(p.name)).length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">📋 구조분석에서 메인공정을 입력해주세요</div>
        ) : state.l2.filter((p: any) => isMeaningfulL1(p.name)).map((proc: any) => {
          const meaningfulFuncs = (proc.functions || []).filter((f: any) => isMeaningfulL1(f.name));
          const confirmedModes = (proc.failureModes || []).filter((m: any) => isMeaningfulL1(m.name));
          return (
            <div key={proc.id} className="mb-2.5">
              {/* 공정명: 파란색 */}
              <TreeItem icon="🔧" label={`${proc.no}. ${proc.name}`} bgColor="#1976d2" textColor="#fff" className="border-l-[3px] border-[#1565c0]" />
              {meaningfulFuncs.length > 0 ? meaningfulFuncs.map((f: any) => {
                const meaningfulChars = (f.productChars || []).filter((c: any) => isMeaningfulL1(c.name));
                return (
                  <div key={f.id} className="ml-3 mb-1">
                    {/* 기능: 녹색 */}
                    <TreeLeaf icon="📋" label={f.name} bgColor={TREE_FUNCTION.itemBg} textColor={TREE_FUNCTION.itemText} indent={0} />
                    {meaningfulChars.length > 0 ? meaningfulChars.map((pc: any, pcIdx: number) => (
                      <div key={pc.id} className="ml-3 mb-0.5">
                        {/* 제품특성: 주황색 줄무늬 (워크시트와 통일) */}
                        <TreeLeaf
                          icon="🏷️"
                          label={pc.name}
                          bgColor={pc.specialChar ? '#ffcc80' : (pcIdx % 2 === 0 ? '#fff3e0' : '#ffe0b2')}
                          textColor="#e65100"
                          indent={0}
                          badge={pc.specialChar && <TreeBadge label={pc.specialChar} bgColor="#f57c00" textColor="#fff" />}
                        />
                        {/* 고장형태: 주황색 */}
                        {confirmedModes.filter((m: any) => !pc.name || m.productCharId === pc.id || !m.productCharId).slice(0, 3).map((m: any) => (
                          <TreeLeaf key={m.id} icon="└ ⚠️" label={m.name} bgColor="#ffe0b2" textColor="#e65100" indent={3} />
                        ))}
                        {/* AI 추천: 고장형태 */}
                        {onAddAIItem && confirmedModes.filter((m: any) => m.productCharId === pc.id).length < 3 && (
                          <TreeAIRecommend
                            context={{
                              processName: proc.name,
                              productChar: pc.name,
                            }}
                            type="mode"
                            onAccept={(value) => onAddAIItem('mode', value, { processId: proc.id, productCharId: pc.id })}
                            existingItems={confirmedModes.map((m: any) => m.name)}
                            maxItems={3}
                          />
                        )}
                      </div>
                    )) : <TreeEmpty message="└ (제품특성 미입력)" small />}
                  </div>
                );
              }) : <TreeEmpty message="└ (메인공정기능 미입력)" small />}
              {meaningfulFuncs.length === 0 && confirmedModes.map((m: any) => (
                <TreeLeaf key={m.id} icon="└ ⚠️" label={m.name} bgColor="#ffe0b2" textColor="#e65100" indent={4} />
              ))}
            </div>
          );
        })}
      </BaseTreePanel>
    );
  }

  // ========== 3L 고장원인 트리 (공정명/작업요소:파란색, 공정특성:녹색, 고장원인:주황색) ==========
  if (tab === 'failure-l3') {
    const isL3Confirmed = state.failureL3Confirmed || false;
    let processCharCount = 0, failureCauseCount = 0;
    state.l2.forEach((proc: any) => {
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          processCharCount += (f.processChars || []).filter((c: any) => isMeaningfulL1(c.name)).length;
        });
      });
      failureCauseCount += (proc.failureCauses || []).filter((c: any) => isMeaningfulL1(c.name)).length;
    });

    return (
      <>
      <BaseTreePanel config={{
        icon: '⚡',
        title: '3L 고장원인 트리(FC Tree)',
        counts: [{ label: '공정특성(PC)', value: processCharCount }, { label: '고장원인(FC)', value: failureCauseCount }],
        theme: 'failure-l3',
        extra: !isL3Confirmed && <span className="ml-2 text-yellow-300 text-[9px]">(미확정)</span>,
      }}>
        {/* ★ 3L고장: B4(고장원인) — 구조 processNo::m4 대비 누락 비교 */}
        {(() => {
          if (!masterData) return <ValidationBanner imErrors={[]} onShowDetail={() => {}} masterInfo="기초정보 조회중..." />;
          const b4 = masterData.counts.B4 || 0;
          const structKeys = state.l2.flatMap((p: any) =>
            (p.l3 || []).filter((w: any) => isMeaningfulL1(w.name) && w.m4).map((w: any) => `${p.no}::${w.m4}`)
          );
          const masterB4Keys = new Set(masterData.keys.B4 || []);
          const missingB4 = structKeys.filter((key: string) => !masterB4Keys.has(key));
          return <ValidationBanner
            imErrors={[]}
            onShowDetail={() => {}}
            totalMissing={missingB4.length}
            emptyMessage={b4 === 0 ? '기초정보 B4 미입력' : undefined}
            masterInfo={`B4(고장원인):${b4}${missingB4.length > 0 ? ` | 누락:${missingB4.length}요소` : ''}`}
          />;
        })()}
        {state.l2.filter((p: any) => isMeaningfulL1(p.name)).length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">📋 구조분석에서 메인공정을 입력해주세요</div>
        ) : state.l2.filter((p: any) => isMeaningfulL1(p.name)).map((proc: any) => {
          const meaningfulCauses = (proc.failureCauses || []).filter((c: any) => isMeaningfulL1(c.name));
          const meaningfulWEs = (proc.l3 || []).filter((w: any) => isMeaningfulL1(w.name));
          return (
            <div key={proc.id} className="mb-2">
              {/* 공정명: 파란색 */}
              <TreeItem icon="🔧" label={`${proc.no}. ${proc.name}`} bgColor="#1976d2" textColor="#fff" className="border-l-[3px] border-[#1565c0]" />
              {meaningfulWEs.map((we: any) => {
                const processChars: any[] = [];
                // ★★★ 2026-02-16: FailureL3Tab 렌더링과 동일 필터 ★★★
                (we.functions || []).filter((f: any) => isMeaningfulL1(f.name)).forEach((f: any) => {
                  (f.processChars || []).filter((pc: any) => isMeaningfulL1(pc.name)).forEach((pc: any) => { processChars.push(pc); });
                });
                return (
                  <div key={we.id} className="ml-3 mb-1">
                    {/* 작업요소: 파란색 */}
                    <TreeLeaf icon="" label={`[${we.m4}] ${we.name}`} bgColor="#bbdefb" textColor="#1565c0" indent={0} />
                    {processChars.map((pc: any) => {
                      const linkedCauses = meaningfulCauses.filter((c: any) => c.processCharId === pc.id);
                      return (
                        <div key={pc.id} className="ml-2">
                          {/* 공정특성: 녹색 */}
                          <TreeLeaf
                            icon="└"
                            label={pc.name}
                            bgColor={TREE_FUNCTION.itemBg}
                            textColor={TREE_FUNCTION.itemText}
                            indent={0}
                            badge={pc.specialChar && <TreeBadge label={pc.specialChar} bgColor="#2e7d32" textColor="#fff" />}
                          />
                          {/* 고장원인: 주황색 */}
                          {linkedCauses.map((c: any) => (
                            <TreeLeaf
                              key={c.id}
                              icon="└"
                              label={c.name}
                              bgColor="#ffe0b2"
                              textColor="#e65100"
                              indent={4}
                              badge={c.occurrence && <TreeBadge label={`O:${c.occurrence}`} bgColor={c.occurrence >= 7 ? '#f97316' : '#fb923c'} textColor="#fff" />}
                            />
                          ))}
                          {/* AI 추천: 고장원인 */}
                          {onAddAIItem && linkedCauses.length < 3 && (
                            <TreeAIRecommend
                              context={{
                                processName: proc.name,
                                workElement: we.name,
                                m4Category: we.m4,
                              }}
                              type="cause"
                              onAccept={(value) => onAddAIItem('cause', value, { processId: proc.id, workElementId: we.id, processCharId: pc.id })}
                              existingItems={linkedCauses.map((c: any) => c.name)}
                              maxItems={3}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </BaseTreePanel>
      </>
    );
  }

  // ========== 기본 폴백 ==========
  return (
    <BaseTreePanel config={{
      icon: '🌳',
      title: '트리(Tree)',
      counts: [],
      theme: 'structure',
    }}>
      <div className="flex-1 flex justify-center items-center text-[11px] text-gray-500">
        해당 탭에서는 트리가 표시되지 않습니다
      </div>
    </BaseTreePanel>
  );
}
