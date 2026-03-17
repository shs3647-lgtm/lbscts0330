'use client';

/**
 * @file PipelineStepDetailView.tsx
 * @description STEP 1~5 상세 데이터 뷰 — 실제 DB 레코드를 테이블로 표시
 *
 * STEP 1: Import Legacy 구조 상세
 * STEP 2: 파싱 데이터 공정별 A1-A6,B1-B5,C1-C4 실제 값
 * STEP 3: UUID — Atomic DB 엔티티 목록 (L1/L2/L3/FM/FE/FC)
 * STEP 4: FK — FailureLink FM↔FE↔FC 관계 상세
 * STEP 5: WS — 워크시트 구조 검증 (공정특성↔FC 연결)
 */

import React, { useState, useEffect, useCallback } from 'react';

interface Props {
  fmeaId: string;
  step: number;
  stepName: string;
}

type SubTab = string;

export default function PipelineStepDetailView({ fmeaId, step, stepName }: Props) {
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
    case 1: return <Step1Detail data={data} />;
    case 2: return <Step2Detail data={data} subTab={subTab} setSubTab={setSubTab} />;
    case 3: return <Step3Detail data={data} subTab={subTab} setSubTab={setSubTab} />;
    case 4: return <Step4Detail data={data} />;
    case 5: return <Step5Detail data={data} />;
    default: return <div className="text-gray-400 text-[10px]">STEP {step} 상세 미지원</div>;
  }
}

// ─── STEP 1: Import Legacy 구조 ───
function Step1Detail({ data }: { data: any }) {
  if (!data.exists) return <div className="text-red-400 text-[10px]">Legacy 데이터 없음 — Import 필요</div>;
  return (
    <div className="max-h-[300px] overflow-y-auto">
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
function Step2Detail({ data, subTab, setSubTab }: { data: any; subTab: string; setSubTab: (t: string) => void }) {
  const tabs = [
    { key: 'proc', label: `공정 (${data.processes?.length || 0})` },
    { key: 'l1func', label: `L1기능 (${data.l1Functions?.length || 0})` },
    { key: 'fe', label: `FE (${data.failureEffects?.length || 0})` },
  ];
  const activeTab = subTab || 'proc';

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
        {activeTab === 'proc' && (
          <table className="w-full border-collapse text-[9px]">
            <thead className="sticky top-0 bg-gray-800 z-10">
              <tr>
                <th className="px-1 py-0.5 text-gray-500 text-left w-8">공정</th>
                <th className="px-1 py-0.5 text-gray-500 text-left">공정명</th>
                <th className="px-1 py-0.5 text-gray-500 text-left">A3 공정기능</th>
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
function Step3Detail({ data, subTab, setSubTab }: { data: any; subTab: string; setSubTab: (t: string) => void }) {
  const tabs = [
    { key: 'l2', label: `L2 (${data.l2?.length || 0})`, color: 'text-blue-300' },
    { key: 'l3', label: `L3 (${data.l3?.length || 0})`, color: 'text-cyan-300' },
    { key: 'fm', label: `FM (${data.failureModes?.length || 0})`, color: 'text-orange-300' },
    { key: 'fe', label: `FE (${data.failureEffects?.length || 0})`, color: 'text-green-300' },
    { key: 'fc', label: `FC (${data.failureCauses?.length || 0})`, color: 'text-red-300' },
    { key: 'l2f', label: `L2Func (${data.l2Functions?.length || 0})`, color: 'text-yellow-300' },
    { key: 'l3f', label: `L3Func (${data.l3Functions?.length || 0})`, color: 'text-purple-300' },
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
    l3: { items: data.l3 || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'processNo', label: '공정', width: 'w-10' }, { key: 'm4', label: '4M', width: 'w-8' }, { key: 'name', label: '작업요소' }] },
    fm: { items: data.failureModes || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'processNo', label: '공정', width: 'w-10' }, { key: 'name', label: '고장형태' }] },
    fe: { items: data.failureEffects || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'name', label: '고장영향' }, { key: 'category', label: '구분', width: 'w-14' }, { key: 'severity', label: 'S', width: 'w-6' }] },
    fc: { items: data.failureCauses || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'processNo', label: '공정', width: 'w-10' }, { key: 'cause', label: '고장원인' }] },
    l2f: { items: data.l2Functions || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'processNo', label: '공정', width: 'w-10' }, { key: 'name', label: '공정기능' }, { key: 'productChar', label: '제품특성' }] },
    l3f: { items: data.l3Functions || [], columns: [{ key: 'id', label: 'UUID', width: 'w-16' }, { key: 'name', label: '요소기능' }, { key: 'processChar', label: '공정특성' }] },
  };

  const cfg = configs[activeTab] || configs.l2;

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
        {renderTable(cfg.items, cfg.columns)}
        {cfg.items.length === 0 && <div className="text-gray-500 text-[10px] py-4 text-center">데이터 없음</div>}
      </div>
    </div>
  );
}

// ─── STEP 4: FK 상세 ───
function Step4Detail({ data }: { data: any }) {
  return (
    <div>
      <div className="flex gap-3 text-[10px] mb-1">
        <span className="text-green-300">총 Link: {data.totalLinks}</span>
        <span className="text-cyan-300">총 FC: {data.totalFCs}</span>
        {data.unlinkedFCs?.length > 0 && <span className="text-red-400">미연결 FC: {data.unlinkedFCs.length}</span>}
      </div>
      <div className="max-h-[260px] overflow-y-auto">
        <table className="w-full border-collapse text-[9px]">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr>
              <th className="px-1 py-0.5 text-gray-500 text-left w-8">공정</th>
              <th className="px-1 py-0.5 text-gray-500 text-left">FM (고장형태)</th>
              <th className="px-1 py-0.5 text-gray-500 text-left">FC (고장원인)</th>
              <th className="px-1 py-0.5 text-gray-500 text-left">FE (고장영향)</th>
              <th className="px-1 py-0.5 text-gray-500 text-center w-6">FK</th>
            </tr>
          </thead>
          <tbody>
            {(data.links || []).map((lk: any, i: number) => (
              <tr key={i} className={`border-t border-gray-800 hover:bg-gray-700/50 ${lk.broken ? 'bg-red-900/30' : ''}`}>
                <td className="px-1 py-0.5 text-cyan-400">{lk.processNo}</td>
                <td className="px-1 py-0.5 text-white truncate max-w-[180px]" title={lk.fmName}>
                  <span className="text-yellow-400 font-mono mr-1">{lk.fmId}</span>{lk.fmName}
                </td>
                <td className="px-1 py-0.5 text-gray-300 truncate max-w-[180px]" title={lk.fcName}>
                  <span className="text-yellow-400 font-mono mr-1">{lk.fcId}</span>{lk.fcName}
                </td>
                <td className="px-1 py-0.5 text-gray-300 truncate max-w-[120px]" title={lk.feName}>
                  <span className="text-yellow-400 font-mono mr-1">{lk.feId}</span>{lk.feName}
                </td>
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
    </div>
  );
}

// ─── STEP 5: WS 상세 ───
function Step5Detail({ data }: { data: any }) {
  return (
    <div className="max-h-[300px] overflow-y-auto">
      <table className="w-full border-collapse text-[9px]">
        <thead className="sticky top-0 bg-gray-800 z-10">
          <tr>
            <th className="px-1 py-0.5 text-gray-500 text-left w-8">공정</th>
            <th className="px-1 py-0.5 text-gray-500 text-left">공정명</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-8">FM</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-8">FC</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-8">L3</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-8">PC</th>
            <th className="px-1 py-0.5 text-gray-500 text-left">공정특성 상세</th>
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
                    {pc.name} {!pc.hasFC && pc.name !== '(빈값)' && '⚠️'}
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
