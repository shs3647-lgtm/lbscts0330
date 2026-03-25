'use client';

/**
 * @file PipelineStep0Detail.tsx
 * @description STEP 0 상세 패널 — Import + L1/L2/L3 검증/편집
 *
 * 기능:
 * 1. Master DB 데이터를 L1/L2/L3/FC 탭으로 상세 검증
 * 2. 셀 더블클릭 인라인 편집 → Master DB 즉시 반영
 * 3. Import 탭: 엑셀 업로드 → Import 페이지 연동 / Atomic DB 원클릭 저장
 */

import React, { useState, useCallback, useEffect } from 'react';

interface FlatItem {
  id?: string;
  processNo: string;
  itemCode: string;
  value: string;
  m4?: string;
  specialChar?: string;
  belongsTo?: string;
}

interface StepResult {
  step: number;
  name: string;
  status: 'ok' | 'warn' | 'error' | 'fixed';
  details: Record<string, number | string>;
  issues: string[];
  fixed: string[];
}

interface Props {
  step: StepResult;
  fmeaId: string;
  onImportComplete?: () => void;
}

type TabKey = 'summary' | 'L1' | 'L2' | 'L3' | 'FC' | 'import';

const TAB_DEFS: { key: TabKey; label: string; color: string }[] = [
  { key: 'summary', label: '요약', color: 'text-white' },
  { key: 'L2', label: 'L2 공정', color: 'text-blue-300' },
  { key: 'L3', label: 'L3 부품(컴포넌트)', color: 'text-cyan-300' },
  { key: 'L1', label: 'L1 완제품', color: 'text-green-300' },
  { key: 'FC', label: 'FC 고장사슬', color: 'text-orange-300' },
  { key: 'import', label: 'Import', color: 'text-yellow-300' },
];

const CODE_LABELS: Record<string, string> = {
  A1: '공정번호', A2: '공정명', A3: '설계기능', A4: '설계특성', A5: '고장형태', A6: '설계검증 검출',
  B1: '부품(컴포넌트)', B2: '요소기능', B3: '설계파라미터', B4: '고장원인', B5: '설계검증 예방',
  C1: '구분', C2: '제품기능', C3: '요구사항', C4: '고장영향',
};

export default function PipelineStep0Detail({ step, fmeaId, onImportComplete }: Props) {
  const [tab, setTab] = useState<TabKey>('summary');
  const [flatData, setFlatData] = useState<FlatItem[]>([]);
  const [chains, setChains] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [editingCell, setEditingCell] = useState<{ idx: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pfmea/master?fmeaId=${fmeaId}&includeItems=true`);
      if (res.ok) {
        const data = await res.json();
        const ds = data.dataset || data;
        setFlatData(ds.flatItems || []);
        setChains(ds.failureChains || []);
      }
    } catch (e) { console.error('[Step0] load error:', e); }
    setLoading(false);
  }, [fmeaId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Atomic DB 저장 → 워크시트 렌더링
  const handleAtomicSave = useCallback(async () => {
    if (flatData.length === 0) {
      setImportMsg('Master 데이터가 없습니다. Import 페이지에서 엑셀을 먼저 업로드하세요.');
      return;
    }
    setImporting(true);
    setImportMsg('Atomic DB 저장 중...');
    try {
      const l1Name = flatData.find(d => d.itemCode === 'C1')?.value || '';
      const res = await fetch('/api/fmea/save-position-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId, flatData, l1Name, failureChains: chains }),
      });
      const data = await res.json();
      if (data.success) {
        setImportMsg('Atomic DB 저장 완료! 워크시트 새로고침...');
        onImportComplete?.();
      } else {
        setImportMsg(`저장 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setImportMsg(`오류: ${msg}`);
    }
    setImporting(false);
  }, [fmeaId, flatData, chains, onImportComplete]);

  // 셀 편집 저장
  const handleEditSave = useCallback(async (idx: number, field: string, value: string) => {
    const item = flatData[idx];
    if (!item) return;
    const updated = [...flatData];
    updated[idx] = { ...updated[idx], [field]: value };
    setFlatData(updated);
    setEditingCell(null);

    try {
      await fetch('/api/pfmea/master', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId, itemId: item.id, field, value }),
      });
    } catch (e) { console.error('[Step0] edit save error:', e); }
  }, [flatData, fmeaId]);

  const codeCounts: Record<string, number> = {};
  for (const item of flatData) {
    codeCounts[item.itemCode] = (codeCounts[item.itemCode] || 0) + 1;
  }

  const statusBg = step.status === 'ok' ? 'border-green-500 bg-green-900/60' :
    step.status === 'warn' ? 'border-yellow-500 bg-yellow-900/60' : 'border-red-500 bg-red-900/60';

  return (
    <div className={`border ${statusBg} rounded p-2`}>
      {/* 탭 바 */}
      <div className="flex items-center gap-0.5 mb-2 border-b border-gray-700 pb-1">
        {TAB_DEFS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2 py-0.5 text-[10px] rounded-t ${tab === t.key ? 'bg-gray-700 font-bold ' + t.color : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t.label}
            {t.key === 'L2' && codeCounts['A1'] ? ` (${codeCounts['A1']})` : ''}
            {t.key === 'L3' && codeCounts['B1'] ? ` (${codeCounts['B1']})` : ''}
            {t.key === 'L1' && codeCounts['C1'] ? ` (${codeCounts['C1']})` : ''}
            {t.key === 'FC' && chains.length ? ` (${chains.length})` : ''}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-400 text-[10px] py-2">로딩 중...</div>}

      {tab === 'summary' && !loading && (
        <SummaryTab codeCounts={codeCounts} chains={chains} step={step} />
      )}

      {tab === 'L2' && !loading && (
        <DataTable
          items={flatData}
          codes={['A1', 'A2', 'A3', 'A4', 'A5', 'A6']}
          groupBy="processNo"
          editingCell={editingCell}
          editValue={editValue}
          onEditStart={(idx, field, val) => { setEditingCell({ idx, field }); setEditValue(val); }}
          onEditChange={setEditValue}
          onEditSave={handleEditSave}
          onEditCancel={() => setEditingCell(null)}
        />
      )}

      {tab === 'L3' && !loading && (
        <DataTable
          items={flatData}
          codes={['B1', 'B2', 'B3', 'B4', 'B5']}
          groupBy="processNo"
          editingCell={editingCell}
          editValue={editValue}
          onEditStart={(idx, field, val) => { setEditingCell({ idx, field }); setEditValue(val); }}
          onEditChange={setEditValue}
          onEditSave={handleEditSave}
          onEditCancel={() => setEditingCell(null)}
        />
      )}

      {tab === 'L1' && !loading && (
        <DataTable
          items={flatData}
          codes={['C1', 'C2', 'C3', 'C4']}
          groupBy="processNo"
          editingCell={editingCell}
          editValue={editValue}
          onEditStart={(idx, field, val) => { setEditingCell({ idx, field }); setEditValue(val); }}
          onEditChange={setEditValue}
          onEditSave={handleEditSave}
          onEditCancel={() => setEditingCell(null)}
        />
      )}

      {tab === 'FC' && !loading && (
        <ChainsTable chains={chains} />
      )}

      {tab === 'import' && (
        <ImportTab
          fmeaId={fmeaId}
          flatCount={flatData.length}
          chainCount={chains.length}
          importing={importing}
          importMsg={importMsg}
          onAtomicSave={handleAtomicSave}
          onReload={loadData}
        />
      )}
    </div>
  );
}

// ─── 요약 탭 ───
function SummaryTab({ codeCounts, chains, step }: { codeCounts: Record<string, number>; chains: Record<string, unknown>[]; step: StepResult }) {
  const groups = [
    { label: 'L2 공정', codes: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'], color: 'text-blue-300' },
    { label: 'L3 부품(컴포넌트)', codes: ['B1', 'B2', 'B3', 'B4', 'B5'], color: 'text-cyan-300' },
    { label: 'L1 완제품', codes: ['C1', 'C2', 'C3', 'C4'], color: 'text-green-300' },
  ];

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-3 gap-2">
        {groups.map(g => (
          <div key={g.label} className="bg-black/30 rounded p-1.5">
            <div className={`text-[10px] font-bold ${g.color} mb-1`}>{g.label}</div>
            {g.codes.map(code => {
              const count = codeCounts[code] || 0;
              return (
                <div key={code} className="flex justify-between text-[9px]">
                  <span className="text-gray-400">{code} {CODE_LABELS[code]}</span>
                  <span className={count === 0 ? 'text-red-400 font-bold' : 'text-green-300'}>{count}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] bg-black/30 rounded px-2 py-1">
        <span className="text-orange-300 font-bold">FC 고장사슬: {chains.length}건</span>
        <span className="text-gray-400">|</span>
        <span className="text-white">총 flatItems: {Object.values(codeCounts).reduce((a, b) => a + b, 0)}</span>
      </div>
      {step.issues.length > 0 && (
        <div className="mt-1">
          {step.issues.map((issue, i) => (
            <div key={i} className="text-[10px] text-red-300">• {issue}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 데이터 테이블 ───
function DataTable({ items, codes, groupBy, editingCell, editValue, onEditStart, onEditChange, onEditSave, onEditCancel }: {
  items: FlatItem[];
  codes: string[];
  groupBy: string;
  editingCell: { idx: number; field: string } | null;
  editValue: string;
  onEditStart: (idx: number, field: string, val: string) => void;
  onEditChange: (val: string) => void;
  onEditSave: (idx: number, field: string, val: string) => void;
  onEditCancel: () => void;
}) {
  const filtered = items.filter(d => codes.includes(d.itemCode));
  const groups = new Map<string, FlatItem[]>();
  for (const item of filtered) {
    const key = (item as any)[groupBy] || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return (
    <div className="max-h-[280px] overflow-y-auto">
      <table className="w-full border-collapse text-[9px]">
        <thead className="sticky top-0 bg-gray-800 z-10">
          <tr>
            <th className="px-1 py-0.5 text-gray-500 text-left w-12">공정</th>
            <th className="px-1 py-0.5 text-gray-500 text-left w-8">코드</th>
            <th className="px-1 py-0.5 text-gray-500 text-left">값</th>
            <th className="px-1 py-0.5 text-gray-500 w-6">SC</th>
          </tr>
        </thead>
        <tbody>
          {[...groups.entries()].map(([groupKey, groupItems]) => (
            <React.Fragment key={groupKey}>
              {groupItems.map((item, j) => {
                const globalIdx = items.indexOf(item);
                const isEditing = editingCell?.idx === globalIdx && editingCell?.field === 'value';
                return (
                  <tr key={`${groupKey}-${j}`} className="border-t border-gray-800 hover:bg-gray-700/50">
                    {j === 0 && (
                      <td className="px-1 py-0.5 text-cyan-400 font-bold align-top" rowSpan={groupItems.length}>
                        {groupKey}
                      </td>
                    )}
                    <td className="px-1 py-0.5 text-yellow-300">{item.itemCode}</td>
                    <td
                      className="px-1 py-0.5 text-white cursor-pointer hover:bg-blue-900/30"
                      onDoubleClick={() => onEditStart(globalIdx, 'value', item.value)}
                    >
                      {isEditing ? (
                        <input
                          className="w-full bg-gray-900 border border-blue-500 text-white text-[9px] px-1 rounded"
                          value={editValue}
                          onChange={e => onEditChange(e.target.value)}
                          onBlur={() => onEditSave(globalIdx, 'value', editValue)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') onEditSave(globalIdx, 'value', editValue);
                            if (e.key === 'Escape') onEditCancel();
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="truncate block max-w-[400px]">{item.value || '-'}</span>
                      )}
                    </td>
                    <td className="px-1 py-0.5 text-center">
                      {item.specialChar && <span className={item.specialChar === '★' ? 'text-orange-400' : 'text-cyan-400'}>{item.specialChar}</span>}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <div className="text-gray-500 text-[10px] py-4 text-center">데이터 없음</div>}
    </div>
  );
}

// ─── FC 고장사슬 테이블 ───
function ChainsTable({ chains }: { chains: Record<string, unknown>[] }) {
  const s = (v: unknown) => String(v || '');
  const uniqueFMs = new Set(chains.map(c => `${s(c.processNo)}|${s(c.fmValue)}`)).size;

  return (
    <div className="max-h-[280px] overflow-y-auto">
      <div className="text-[10px] text-orange-300 mb-1">
        총 {chains.length}건 | Unique FM: {uniqueFMs}개
      </div>
      <table className="w-full border-collapse text-[9px]">
        <thead className="sticky top-0 bg-gray-800 z-10">
          <tr>
            <th className="px-1 py-0.5 text-gray-500 text-left w-8">공정</th>
            <th className="px-1 py-0.5 text-gray-500 text-left">FM(고장형태)</th>
            <th className="px-1 py-0.5 text-gray-500 text-left">FC(고장원인)</th>
            <th className="px-1 py-0.5 text-gray-500 text-left">FE(고장영향)</th>
          </tr>
        </thead>
        <tbody>
          {chains.slice(0, 200).map((ch, i) => (
            <tr key={i} className="border-t border-gray-800 hover:bg-gray-700/50">
              <td className="px-1 py-0.5 text-cyan-400">{s(ch.processNo)}</td>
              <td className="px-1 py-0.5 text-white truncate max-w-[180px]">{s(ch.fmValue) || '-'}</td>
              <td className="px-1 py-0.5 text-gray-300 truncate max-w-[180px]">{s(ch.fcValue) || '-'}</td>
              <td className="px-1 py-0.5 text-gray-300 truncate max-w-[120px]">{s(ch.feValue) || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {chains.length === 0 && <div className="text-gray-500 text-[10px] py-4 text-center">고장사슬 없음</div>}
    </div>
  );
}

// ─── Import 탭 ───
function ImportTab({ fmeaId, flatCount, chainCount, importing, importMsg, onAtomicSave, onReload }: {
  fmeaId: string;
  flatCount: number;
  chainCount: number;
  importing: boolean;
  importMsg: string;
  onAtomicSave: () => void;
  onReload: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-[10px] bg-black/30 rounded px-2 py-1.5">
        <span className="text-gray-400">Master DB:</span>
        <span className={`font-bold ${flatCount > 0 ? 'text-green-300' : 'text-red-400'}`}>{flatCount}건</span>
        <span className="text-gray-400">|</span>
        <span className="text-gray-400">고장사슬:</span>
        <span className="text-orange-300 font-bold">{chainCount}건</span>
      </div>

      {flatCount === 0 && (
        <div className="bg-yellow-900/40 border border-yellow-600 rounded p-2 text-[10px]">
          <div className="text-yellow-300 font-bold mb-1">Master 데이터 없음</div>
          <div className="text-gray-300">Import 페이지에서 엑셀 파일을 먼저 업로드하세요.</div>
          <button
            onClick={() => window.open(`/pfmea/import/legacy?fmeaId=${fmeaId}`, '_blank')}
            className="mt-1.5 px-3 py-1 bg-blue-700 text-white text-[10px] rounded hover:bg-blue-600"
          >
            Import 페이지 열기
          </button>
        </div>
      )}

      {flatCount > 0 && (
        <>
          <div className="bg-black/30 rounded p-2 text-[10px]">
            <div className="text-gray-300 mb-1">
              엑셀 재업로드가 필요하면 Import 페이지를 사용하세요.
              업로드 후 아래 새로고침 → Atomic DB 저장으로 워크시트에 반영됩니다.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`/pfmea/import/legacy?fmeaId=${fmeaId}`, '_blank')}
                className="px-3 py-0.5 bg-gray-700 text-white text-[10px] rounded hover:bg-gray-600"
              >
                Import 페이지 열기
              </button>
              <button
                onClick={onReload}
                className="px-3 py-0.5 bg-gray-700 text-cyan-300 text-[10px] rounded hover:bg-gray-600"
              >
                새로고침
              </button>
            </div>
          </div>

          <button
            onClick={onAtomicSave}
            disabled={importing}
            className="w-full py-1.5 bg-green-700 text-white text-[11px] font-bold rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? '처리 중...' : `Atomic DB 저장 + 워크시트 렌더링 (${flatCount}건)`}
          </button>
        </>
      )}

      {importMsg && (
        <div className={`text-[10px] px-2 py-1 rounded ${importMsg.includes('실패') || importMsg.includes('오류') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
          {importMsg}
        </div>
      )}
    </div>
  );
}
