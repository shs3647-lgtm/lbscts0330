'use client';

/**
 * @file PipelineStepDetailView.tsx
 * @description STEP 0~4 상세 데이터 뷰
 *
 * STEP 0: 구조 완전성
 * STEP 1: UUID + 모자관계
 * STEP 2: fmeaId 격리 검증
 * STEP 3: FK — 14개 관계 전수검증 + 고아 레코드
 * STEP 4: 누락 — DC/PC/SOD + emptyPC/orphanPC
 */

import React, { useState, useEffect, useCallback } from 'react';

interface CrossCheckEntry {
  entity: string;
  atomicCount: number;
  legacyCount: number;
  match: boolean;
  missingInAtomic: string[];
  missingInLegacy: string[];
}

interface FkIntegrityEntry {
  relation: string;
  total: number;
  valid: number;
  orphans: { id: string; fkValue: string; name?: string }[];
}

interface ParentChildEntry {
  parent: string;
  child: string;
  missingChildren: { parentId: string; parentName: string }[];
}

interface StepResultData {
  crossCheck?: CrossCheckEntry[];
  fkIntegrity?: FkIntegrityEntry[];
  parentChild?: ParentChildEntry[];
}

interface Props {
  fmeaId: string;
  step: number;
  stepName: string;
  stepResult?: StepResultData;
}

type SubTab = string;

export default function PipelineStepDetailView({ fmeaId, step, stepName, stepResult }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('');

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fmea/pipeline-detail?fmeaId=${fmeaId}&step=${step}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (e) { console.error('[PipelineDetail] load error:', e); }
    setLoading(false);
  }, [fmeaId, step]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  if (loading) return <div className="text-gray-400 text-[10px] py-4 text-center">로딩 중...</div>;
  if (!data) return <div className="text-red-400 text-[10px] py-4 text-center">데이터 로드 실패</div>;

  switch (step) {
    case 0: return <Step1Detail data={data} crossCheck={stepResult?.crossCheck} />;
    case 1: return <Step3Detail data={data} subTab={subTab} setSubTab={setSubTab} parentChild={stepResult?.parentChild} />;
    case 2: return <Step2Detail data={data} subTab={subTab} setSubTab={setSubTab} crossCheck={stepResult?.crossCheck} />;
    case 3: return <Step4Detail data={data} fkIntegrity={stepResult?.fkIntegrity} />;
    case 4: return <Step5Detail data={data} crossCheck={stepResult?.crossCheck} />;
    default: return <div className="text-gray-400 text-[10px]">STEP {step} 상세 미지원</div>;
  }
}

function IdDiffList({ label, ids, color }: { label: string; ids: string[]; color: string }) {
  if (!ids || ids.length === 0) return null;
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-0.5">
      <button onClick={() => setExpanded(!expanded)} className={`text-[8px] ${color} cursor-pointer hover:underline`}>
        {label} ({ids.length}건) {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <div className="ml-2 max-h-[80px] overflow-y-auto">
          {ids.map((id, i) => (
            <div key={i} className="text-[7px] font-mono text-gray-400">{id}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniCrossCheckTable({ entries }: { entries?: CrossCheckEntry[] }) {
  if (!entries || entries.length === 0) return null;
  const mismatches = entries.filter(e => !e.match);
  if (mismatches.length === 0) return (
    <div className="text-[9px] text-green-400 mb-1">교차검증: ✅ {entries.length}개 항목 전체 일치</div>
  );
  return (
    <div className="mb-2">
      <div className="text-[9px] text-red-400 font-bold mb-0.5">
        불일치 항목 ({mismatches.length}/{entries.length})
      </div>
      <table className="w-full border-collapse text-[8px]">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-1 py-0.5 text-gray-500 text-left">항목</th>
            <th className="px-1 py-0.5 text-gray-500 text-right w-12">Atomic</th>
            <th className="px-1 py-0.5 text-gray-500 text-right w-12">Legacy</th>
            <th className="px-1 py-0.5 text-gray-500 text-left">diff ID</th>
          </tr>
        </thead>
        <tbody>
          {mismatches.map((e, i) => (
            <tr key={i} className="border-t border-gray-800 bg-red-900/20">
              <td className="px-1 py-0.5 text-white">{e.entity}</td>
              <td className="px-1 py-0.5 text-right text-blue-300">{e.atomicCount}</td>
              <td className="px-1 py-0.5 text-right text-yellow-300">{e.legacyCount}</td>
              <td className="px-1 py-0.5">
                <IdDiffList label="Atomic에 없음" ids={e.missingInAtomic} color="text-red-400" />
                <IdDiffList label="Legacy에 없음" ids={e.missingInLegacy} color="text-orange-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── STEP 1: Import Legacy 구조 ───
function Step1Detail({ data, crossCheck }: { data: any; crossCheck?: CrossCheckEntry[] }) {
  if (!data.exists) return <div className="text-red-400 text-[10px]">Legacy 데이터 없음 — Import 필요</div>;
  return (
    <div className="max-h-[300px] overflow-y-auto">
      <MiniCrossCheckTable entries={crossCheck} />
      <div className="flex gap-3 text-[10px] mb-2">
        <span className="text-green-300">L1: {data.l1Name}</span>
        <span className="text-cyan-300">L1 기능: {data.l1FuncCount}건</span>
        <span className="text-orange-300">FE: {data.feCount}건</span>
      </div>
      <table className="w-full border-collapse text-[9px]">
        <thead className="sticky top-0 bg-gray-800 z-10">
          <tr>
            <th className="px-1 py-0.5 text-gray-500 text-left w-10">공정</th>
            <th className="px-1 py-0.5 text-gray-500 text-left">공정명</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-10">기능</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-10">L3</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-10">FM</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-10">FC</th>
          </tr>
        </thead>
        <tbody>
          {data.processes.map((p: any, i: number) => (
            <tr key={i} className="border-t border-gray-800 hover:bg-gray-700/50">
              <td className="px-1 py-0.5 text-cyan-400 font-bold">{p.processNo}</td>
              <td className="px-1 py-0.5 text-white">{p.name}</td>
              <td className="px-1 py-0.5 text-center text-green-300">{p.funcCount}</td>
              <td className="px-1 py-0.5 text-center text-blue-300">{p.l3Count}</td>
              <td className="px-1 py-0.5 text-center text-orange-300">{p.fmCount}</td>
              <td className="px-1 py-0.5 text-center text-red-300">{p.fcCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── STEP 2: 파싱 상세 ───
function Step2Detail({ data, subTab, setSubTab, crossCheck }: { data: any; subTab: string; setSubTab: (t: string) => void; crossCheck?: CrossCheckEntry[] }) {
  const tabs = [
    { key: 'cross', label: `교차검증 (${crossCheck?.length || 0})` },
    { key: 'proc', label: `공정 (${data.processes?.length || 0})` },
    { key: 'l1func', label: `L1기능 (${data.l1Functions?.length || 0})` },
    { key: 'fe', label: `FE (${data.failureEffects?.length || 0})` },
  ];
  const activeTab = subTab || 'cross';

  return (
    <div>
      <div className="flex gap-0.5 mb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`px-2 py-0.5 text-[9px] rounded-t ${activeTab === t.key ? 'bg-gray-700 text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {activeTab === 'cross' && crossCheck && (
          <table className="w-full border-collapse text-[9px]">
            <thead className="sticky top-0 bg-gray-800 z-10">
              <tr>
                <th className="px-1 py-0.5 text-gray-500 text-left">항목코드</th>
                <th className="px-1 py-0.5 text-gray-500 text-right w-14">Atomic DB</th>
                <th className="px-1 py-0.5 text-gray-500 text-right w-14">Legacy</th>
                <th className="px-1 py-0.5 text-gray-500 text-center w-10">일치</th>
                <th className="px-1 py-0.5 text-gray-500 text-center w-10">차이</th>
              </tr>
            </thead>
            <tbody>
              {crossCheck.map((e, i) => {
                const diff = Math.abs(e.atomicCount - e.legacyCount);
                return (
                  <tr key={i} className={`border-t border-gray-800 ${!e.match ? 'bg-red-900/30' : ''}`}>
                    <td className="px-1 py-0.5 text-white font-bold">{e.entity}</td>
                    <td className="px-1 py-0.5 text-right text-blue-300 font-bold">{e.atomicCount}</td>
                    <td className="px-1 py-0.5 text-right text-yellow-300 font-bold">{e.legacyCount}</td>
                    <td className="px-1 py-0.5 text-center">{e.match ? '✅' : '❌'}</td>
                    <td className={`px-1 py-0.5 text-center font-bold ${diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {diff > 0 ? `+${diff}` : '0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {activeTab === 'proc' && (
          <table className="w-full border-collapse text-[9px]">
            <thead className="sticky top-0 bg-gray-800 z-10">
              <tr>
                <th className="px-1 py-0.5 text-gray-500 text-left w-8">공정</th>
                <th className="px-1 py-0.5 text-gray-500 text-left">공정명</th>
                <th className="px-1 py-0.5 text-gray-500 text-left">A3 설계기능</th>
                <th className="px-1 py-0.5 text-gray-500 text-center w-8">A4</th>
                <th className="px-1 py-0.5 text-gray-500 text-center w-8">A5</th>
                <th className="px-1 py-0.5 text-gray-500 text-center w-8">B1</th>
              </tr>
            </thead>
            <tbody>
              {(data.processes || []).map((p: any, i: number) => (
                <tr key={i} className="border-t border-gray-800 hover:bg-gray-700/50">
                  <td className="px-1 py-0.5 text-cyan-400 font-bold">{p.processNo}</td>
                  <td className="px-1 py-0.5 text-white truncate max-w-[120px]">{p.name}</td>
                  <td className="px-1 py-0.5 text-gray-300 truncate max-w-[200px]">{p.a3.join(', ') || '-'}</td>
                  <td className="px-1 py-0.5 text-center text-green-300">{p.a4.length}</td>
                  <td className="px-1 py-0.5 text-center text-orange-300">{p.a5.length}</td>
                  <td className="px-1 py-0.5 text-center text-blue-300">{p.b1.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'l1func' && (
          <table className="w-full border-collapse text-[9px]">
            <thead className="sticky top-0 bg-gray-800 z-10">
              <tr>
                <th className="px-1 py-0.5 text-gray-500 text-left">C1 구분</th>
                <th className="px-1 py-0.5 text-gray-500 text-left">C2 제품기능</th>
                <th className="px-1 py-0.5 text-gray-500 text-left">C3 요구사항</th>
              </tr>
            </thead>
            <tbody>
              {(data.l1Functions || []).map((fn: any, i: number) => (
                <tr key={i} className="border-t border-gray-800 hover:bg-gray-700/50">
                  <td className="px-1 py-0.5 text-yellow-300">{fn.category || '-'}</td>
                  <td className="px-1 py-0.5 text-white">{fn.name || '-'}</td>
                  <td className="px-1 py-0.5 text-gray-300">{fn.requirement || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'fe' && (
          <table className="w-full border-collapse text-[9px]">
            <thead className="sticky top-0 bg-gray-800 z-10">
              <tr>
                <th className="px-1 py-0.5 text-gray-500 text-left">C4 고장영향</th>
                <th className="px-1 py-0.5 text-gray-500 text-left w-16">구분</th>
                <th className="px-1 py-0.5 text-gray-500 text-center w-8">S</th>
              </tr>
            </thead>
            <tbody>
              {(data.failureEffects || []).map((fe: any, i: number) => (
                <tr key={i} className="border-t border-gray-800 hover:bg-gray-700/50">
                  <td className="px-1 py-0.5 text-white">{fe.name || '-'}</td>
                  <td className="px-1 py-0.5 text-gray-400">{fe.scope || '-'}</td>
                  <td className="px-1 py-0.5 text-center text-orange-300">{fe.severity || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── STEP 3: UUID 상세 ───
function Step3Detail({ data, subTab, setSubTab, parentChild }: { data: any; subTab: string; setSubTab: (t: string) => void; parentChild?: ParentChildEntry[] }) {
  const tabs = [
    { key: 'l2', label: `L2 (${data.l2?.length || 0})`, color: 'text-blue-300' },
    { key: 'l3', label: `L3 (${data.l3?.length || 0})`, color: 'text-cyan-300' },
    { key: 'fm', label: `FM (${data.failureModes?.length || 0})`, color: 'text-orange-300' },
    { key: 'fe', label: `FE (${data.failureEffects?.length || 0})`, color: 'text-green-300' },
    { key: 'fc', label: `FC (${data.failureCauses?.length || 0})`, color: 'text-red-300' },
    { key: 'l2f', label: `L2Func (${data.l2Functions?.length || 0})`, color: 'text-yellow-300' },
    { key: 'l3f', label: `L3Func (${data.l3Functions?.length || 0})`, color: 'text-purple-300' },
    { key: 'tree', label: '모자관계', color: 'text-pink-300' },
  ];
  const activeTab = subTab || 'l2';

  const renderTable = (items: any[], columns: { key: string; label: string; width?: string }[]) => (
    <table className="w-full border-collapse text-[9px]">
      <thead className="sticky top-0 bg-gray-800 z-10">
        <tr>
          {columns.map(c => (
            <th key={c.key} className={`px-1 py-0.5 text-gray-500 text-left ${c.width || ''}`}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item: any, i: number) => (
          <tr key={i} className="border-t border-gray-800 hover:bg-gray-700/50">
            {columns.map(c => (
              <td key={c.key} className={`px-1 py-0.5 ${c.key === 'id' ? 'text-yellow-400 font-mono' : 'text-white'} truncate max-w-[250px]`}>
                {String(item[c.key] ?? '-')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const configs: Record<string, { items: any[]; columns: { key: string; label: string; width?: string }[] }> = {
    l2: { items: data.l2 || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'processNo', label: '공정번호', width: 'w-12' }, { key: 'name', label: '공정명' }] },
    l3: { items: data.l3 || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'processNo', label: '공정', width: 'w-10' }, { key: 'm4', label: '4M', width: 'w-8' }, { key: 'name', label: '부품(컴포넌트)' }] },
    fm: { items: data.failureModes || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'processNo', label: '공정', width: 'w-10' }, { key: 'name', label: '고장형태' }] },
    fe: { items: data.failureEffects || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'name', label: '고장영향' }, { key: 'category', label: '구분', width: 'w-14' }, { key: 'severity', label: 'S', width: 'w-6' }] },
    fc: { items: data.failureCauses || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'processNo', label: '공정', width: 'w-10' }, { key: 'cause', label: '고장원인' }] },
    l2f: { items: data.l2Functions || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'processNo', label: '공정', width: 'w-10' }, { key: 'name', label: '설계기능' }, { key: 'productChar', label: '설계특성' }] },
    l3f: { items: data.l3Functions || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'name', label: '요소기능' }, { key: 'processChar', label: '설계파라미터' }] },
  };

  const cfg = configs[activeTab];

  return (
    <div>
      <div className="flex gap-0.5 mb-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`px-1.5 py-0.5 text-[9px] rounded-t ${activeTab === t.key ? 'bg-gray-700 font-bold ' + t.color : 'text-gray-500 hover:text-gray-300'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {activeTab === 'tree' ? (
          <ParentChildDetailTree entries={parentChild} />
        ) : cfg ? (
          <>
            {renderTable(cfg.items, cfg.columns)}
            {cfg.items.length === 0 && <div className="text-gray-500 text-[10px] py-4 text-center">데이터 없음</div>}
          </>
        ) : (
          <div className="text-gray-500 text-[10px] py-4 text-center">데이터 없음</div>
        )}
      </div>
    </div>
  );
}

function ParentChildDetailTree({ entries }: { entries?: ParentChildEntry[] }) {
  if (!entries || entries.length === 0) {
    return <div className="text-gray-400 text-[10px] py-4 text-center">모자관계 데이터 없음</div>;
  }
  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div key={i} className="border border-gray-700 rounded p-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-cyan-300 font-bold">{e.parent}</span>
            <span className="text-gray-500 text-[10px]">&rarr;</span>
            <span className="text-[10px] text-blue-300 font-bold">{e.child}</span>
            {e.missingChildren.length === 0 ? (
              <span className="text-green-400 text-[10px]">✅ 전체 정상</span>
            ) : (
              <span className="text-red-400 text-[10px]">❌ {e.missingChildren.length}건 누락</span>
            )}
          </div>
          {e.missingChildren.length > 0 && (
            <table className="w-full border-collapse text-[9px]">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-1 py-0.5 text-gray-500 text-left w-32">부모 ID</th>
                  <th className="px-1 py-0.5 text-gray-500 text-left">부모 이름</th>
                  <th className="px-1 py-0.5 text-gray-500 text-center w-16">자식 상태</th>
                </tr>
              </thead>
              <tbody>
                {e.missingChildren.map((m, j) => (
                  <tr key={j} className="border-t border-gray-800 bg-red-900/20">
                    <td className="px-1 py-0.5 font-mono text-yellow-400 text-[8px]">{m.parentId.substring(0, 16)}</td>
                    <td className="px-1 py-0.5 text-white">{m.parentName}</td>
                    <td className="px-1 py-0.5 text-center text-red-400">누락</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── STEP 4: FK 상세 ───
function Step4Detail({ data, fkIntegrity }: { data: any; fkIntegrity?: FkIntegrityEntry[] }) {
  const [activeTab, setActiveTab] = useState<'links' | 'fk'>('fk');

  return (
    <div>
      <div className="flex gap-0.5 mb-1">
        <button onClick={() => setActiveTab('fk')}
          className={`px-2 py-0.5 text-[9px] rounded-t ${activeTab === 'fk' ? 'bg-gray-700 text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}>
          FK 무결성 ({fkIntegrity?.length || 0}개 관계)
        </button>
        <button onClick={() => setActiveTab('links')}
          className={`px-2 py-0.5 text-[9px] rounded-t ${activeTab === 'links' ? 'bg-gray-700 text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}>
          고장연결 ({data.totalLinks || 0}건)
        </button>
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {activeTab === 'fk' && fkIntegrity && (
          <div>
            <table className="w-full border-collapse text-[9px]">
              <thead className="sticky top-0 bg-gray-800 z-10">
                <tr>
                  <th className="px-1 py-0.5 text-gray-500 text-left">FK 관계</th>
                  <th className="px-1 py-0.5 text-gray-500 text-right w-10">전체</th>
                  <th className="px-1 py-0.5 text-gray-500 text-right w-10">유효</th>
                  <th className="px-1 py-0.5 text-gray-500 text-right w-10">고아</th>
                  <th className="px-1 py-0.5 text-gray-500 text-center w-8">상태</th>
                </tr>
              </thead>
              <tbody>
                {fkIntegrity.map((e, i) => (
                  <tr key={i} className={`border-t border-gray-800 ${e.orphans.length > 0 ? 'bg-red-900/30' : ''}`}>
                    <td className="px-1 py-0.5 text-white text-[8px]">{e.relation}</td>
                    <td className="px-1 py-0.5 text-right text-gray-300">{e.total}</td>
                    <td className="px-1 py-0.5 text-right text-green-300">{e.valid}</td>
                    <td className="px-1 py-0.5 text-right text-red-400 font-bold">{e.orphans.length}</td>
                    <td className="px-1 py-0.5 text-center">{e.orphans.length === 0 ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {fkIntegrity.filter(e => e.orphans.length > 0).map((e, i) => (
              <details key={i} className="mt-1 ml-1">
                <summary className="text-[8px] text-red-400 cursor-pointer">{e.relation} 고아 {e.orphans.length}건</summary>
                <table className="w-full border-collapse text-[8px] mt-0.5 ml-2">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-1 py-0.5 text-gray-500 text-left w-28">레코드 ID</th>
                      <th className="px-1 py-0.5 text-gray-500 text-left w-28">FK 값</th>
                      <th className="px-1 py-0.5 text-gray-500 text-left">이름</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.orphans.map((o, j) => (
                      <tr key={j} className="border-t border-gray-800">
                        <td className="px-1 py-0.5 font-mono text-yellow-400">{o.id}</td>
                        <td className="px-1 py-0.5 font-mono text-red-400">{o.fkValue}</td>
                        <td className="px-1 py-0.5 text-gray-300">{o.name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ))}
          </div>
        )}
        {activeTab === 'links' && (
          <div>
            <div className="flex gap-3 text-[10px] mb-1">
              <span className="text-green-300">총 Link: {data.totalLinks}</span>
              <span className="text-cyan-300">총 FC: {data.totalFCs}</span>
              {data.unlinkedFCs?.length > 0 && <span className="text-red-400">미연결 FC: {data.unlinkedFCs.length}</span>}
            </div>
            <table className="w-full border-collapse text-[9px]">
              <thead className="sticky top-0 bg-gray-800 z-10">
                <tr>
                  <th className="px-1 py-0.5 text-gray-500 text-left w-8">공정</th>
                  <th className="px-1 py-0.5 text-gray-500 text-left">FM</th>
                  <th className="px-1 py-0.5 text-gray-500 text-left">FC</th>
                  <th className="px-1 py-0.5 text-gray-500 text-left">FE</th>
                  <th className="px-1 py-0.5 text-gray-500 text-center w-6">FK</th>
                </tr>
              </thead>
              <tbody>
                {(data.links || []).map((lk: any, i: number) => (
                  <tr key={i} className={`border-t border-gray-800 hover:bg-gray-700/50 ${lk.broken ? 'bg-red-900/30' : ''}`}>
                    <td className="px-1 py-0.5 text-cyan-400">{lk.processNo}</td>
                    <td className="px-1 py-0.5 text-white truncate max-w-[160px]" title={lk.fmName}>{lk.fmName}</td>
                    <td className="px-1 py-0.5 text-gray-300 truncate max-w-[160px]" title={lk.fcName}>{lk.fcName}</td>
                    <td className="px-1 py-0.5 text-gray-300 truncate max-w-[100px]" title={lk.feName}>{lk.feName}</td>
                    <td className="px-1 py-0.5 text-center">{lk.broken ? '❌' : '✅'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.unlinkedFCs?.length > 0 && (
              <div className="mt-2 border-t border-gray-700 pt-1">
                <div className="text-[10px] text-red-400 mb-0.5">미연결 FC ({data.unlinkedFCs.length}건)</div>
                {data.unlinkedFCs.map((fc: any, i: number) => (
                  <div key={i} className="text-[9px] text-red-300">
                    <span className="text-yellow-400 font-mono mr-1">{fc.id}</span> {fc.cause}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STEP 5: WS 상세 ───
function Step5Detail({ data, crossCheck }: { data: any; crossCheck?: CrossCheckEntry[] }) {
  return (
    <div className="max-h-[300px] overflow-y-auto">
      <MiniCrossCheckTable entries={crossCheck} />
      <table className="w-full border-collapse text-[9px]">
        <thead className="sticky top-0 bg-gray-800 z-10">
          <tr>
            <th className="px-1 py-0.5 text-gray-500 text-left w-8">공정</th>
            <th className="px-1 py-0.5 text-gray-500 text-left">공정명</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-8">FM</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-8">FC</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-8">L3</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-8">PC</th>
            <th className="px-1 py-0.5 text-gray-500 text-left">설계파라미터 상세</th>
          </tr>
        </thead>
        <tbody>
          {(data.processes || []).map((p: any, i: number) => (
            <tr key={i} className="border-t border-gray-800 hover:bg-gray-700/50 align-top">
              <td className="px-1 py-0.5 text-cyan-400 font-bold">{p.processNo}</td>
              <td className="px-1 py-0.5 text-white">{p.name}</td>
              <td className="px-1 py-0.5 text-center text-orange-300">{p.fmCount}</td>
              <td className="px-1 py-0.5 text-center text-red-300">{p.fcCount}</td>
              <td className="px-1 py-0.5 text-center text-blue-300">{p.l3Count}</td>
              <td className="px-1 py-0.5 text-center text-green-300">{p.processChars?.length || 0}</td>
              <td className="px-1 py-0.5">
                {(p.processChars || []).map((pc: any, j: number) => (
                  <div key={j} className={`text-[8px] ${pc.name === '(빈값)' ? 'text-red-400' : pc.hasFC ? 'text-green-300' : 'text-yellow-400'}`}>
                    <span className="font-mono text-gray-600 mr-0.5">{pc.id}</span>
                    {pc.name} {!pc.hasFC && pc.name !== '(빈값)' && '\u26A0\uFE0F'}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
