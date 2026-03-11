/**
 * @file FCChainVerifyBar.tsx
 * @description FC 고장사슬 검증 바 — Import 원본 행수 기준 파이프라인 검증
 *
 * 파이프라인: 원본(FC시트) → 파싱(고유사슬) → DB → WS → Link
 * 레이아웃: 공정 X축 가로 통합 테이블 (v2) — IMPORT/파싱/WS/검증 행그룹
 */

'use client';

import React, { useMemo } from 'react';
import type { RawChainInfo, ImportChain, FlatItem } from '../hooks/useImportVerify';

// ─── Props ───

interface SavedLink {
  fmText?: string;
  fcText?: string;
  feText?: string;
  fmId?: string;
  feId?: string;
  fcId?: string;
}

interface FCChainVerifyBarProps {
  rawChainInfo: RawChainInfo;
  chains: ImportChain[];
  flatItems: FlatItem[];
  state: Record<string, unknown>;
  savedLinks: SavedLink[];
}

// ─── 상태 판정 ───

type Status = 'ok' | 'fail';

function statusIcon(s: Status): string {
  return s === 'ok' ? '✓' : '✗';
}

function statusColor(s: Status): string {
  return s === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
}

// ─── Main Component ───

export default function FCChainVerifyBar({ rawChainInfo, chains, flatItems, state, savedLinks }: FCChainVerifyBarProps) {
  const data = useMemo(() => {
    // ── Import (flatItems) per-process ──
    const impFmMap = new Map<string, Set<string>>();
    const impFcMap = new Map<string, Set<string>>();
    const impFeMap = new Map<string, Set<string>>();
    let impFmTotal = 0, impFcTotal = 0, impFeTotal = 0;
    const impFmAll = new Set<string>();
    const impFcAll = new Set<string>();
    const impFeAll = new Set<string>();

    for (const item of flatItems) {
      const pno = item.processNo?.trim();
      const code = item.itemCode?.toUpperCase().trim();
      const val = item.value?.trim();
      if (!code || !val) continue;

      if (code === 'A5') {
        const key = `${pno}|${val}`;
        if (!impFmAll.has(key)) { impFmAll.add(key); impFmTotal++; }
        if (pno) {
          if (!impFmMap.has(pno)) impFmMap.set(pno, new Set());
          impFmMap.get(pno)!.add(val);
        }
      }
      if (code === 'B4') {
        const key = `${pno}|${val}`;
        if (!impFcAll.has(key)) { impFcAll.add(key); impFcTotal++; }
        if (pno) {
          if (!impFcMap.has(pno)) impFcMap.set(pno, new Set());
          impFcMap.get(pno)!.add(val);
        }
      }
      if (code === 'C4') {
        if (!impFeAll.has(val)) { impFeAll.add(val); impFeTotal++; }
        // C4(FE)는 L1 레벨 → flatItems의 processNo는 공정번호가 아님 → per-process 수집 안 함
      }
    }

    // ── Import FE per-process: chains에서 역산 (C4는 L1이라 flatItems processNo 비신뢰) ──
    for (const c of chains) {
      const pno = c.processNo || '';
      const fe = c.feValue?.trim();
      if (pno && fe && impFeAll.has(fe)) {
        if (!impFeMap.has(pno)) impFeMap.set(pno, new Set());
        impFeMap.get(pno)!.add(fe);
      }
    }

    // ── 파싱 (chains) per-process ──
    const pFmMap = new Map<string, Set<string>>();
    const pFcMap = new Map<string, Set<string>>();
    const pFeMap = new Map<string, Set<string>>();
    const pFmAll = new Set<string>();
    const pFcAll = new Set<string>();
    const pFeAll = new Set<string>();

    for (const c of chains) {
      const pno = c.processNo || '';
      const fm = c.fmValue?.trim();
      const fc = c.fcValue?.trim();
      const fe = c.feValue?.trim();

      if (!pFmMap.has(pno)) pFmMap.set(pno, new Set());
      if (!pFcMap.has(pno)) pFcMap.set(pno, new Set());
      if (!pFeMap.has(pno)) pFeMap.set(pno, new Set());

      if (fm) { pFmMap.get(pno)!.add(fm); pFmAll.add(`${pno}|${fm}`); }
      if (fc) { pFcMap.get(pno)!.add(fc); pFcAll.add(`${pno}|${fc}`); }
      if (fe) { pFeMap.get(pno)!.add(fe); pFeAll.add(fe); }
    }

    // ── WS per-process (고유값 Set 기준 — Import/파싱과 동일 카운트 기준) ──
    const wsFmMap = new Map<string, Set<string>>();
    const wsFcMap = new Map<string, Set<string>>();
    const wsFmAll = new Set<string>();
    const wsFcAll = new Set<string>();
    const wsFeAll = new Set<string>();

    const l2arr = (state.l2 || []) as Array<Record<string, unknown>>;
    for (const l2 of l2arr) {
      const pno = String(l2.no || '').trim();
      const modes = (l2.failureModes || []) as Array<{ name?: string }>;
      for (const m of modes) {
        const val = m.name?.trim();
        if (!val) continue;
        wsFmAll.add(`${pno}|${val}`);
        if (pno) {
          if (!wsFmMap.has(pno)) wsFmMap.set(pno, new Set());
          wsFmMap.get(pno)!.add(val);
        }
      }
      const causes = (l2.failureCauses || []) as Array<{ name?: string }>;
      for (const ca of causes) {
        const val = ca.name?.trim();
        if (!val) continue;
        wsFcAll.add(`${pno}|${val}`);
        if (pno) {
          if (!wsFcMap.has(pno)) wsFcMap.set(pno, new Set());
          wsFcMap.get(pno)!.add(val);
        }
      }
    }
    const wsFmTotal = wsFmAll.size;
    const wsFcTotal = wsFcAll.size;

    const l1obj = state.l1 as Record<string, unknown> | undefined;
    const feScopes = ((l1obj?.failureScopes || []) as Array<{ effect?: string }>);
    for (const fe of feScopes) {
      const val = fe.effect?.trim();
      if (val) wsFeAll.add(val);
    }
    const wsFeTotal = wsFeAll.size;

    // ── WS FE per-process: savedLinks의 FM→공정 매핑으로 FE 역산 ──
    const wsFeMap = new Map<string, Set<string>>();
    const fmIdToPno = new Map<string, string>();
    for (const l2 of l2arr) {
      const pno = String((l2 as Record<string, unknown>).no || '').trim();
      if (!pno) continue;
      const modes = ((l2 as Record<string, unknown>).failureModes || []) as Array<{ id?: string }>;
      for (const m of modes) { if (m.id) fmIdToPno.set(m.id, pno); }
    }
    for (const link of savedLinks) {
      const feText = link.feText?.trim();
      if (!link.fmId || !feText) continue;
      const pno = fmIdToPno.get(link.fmId);
      if (!pno) continue;
      if (!wsFeMap.has(pno)) wsFeMap.set(pno, new Set());
      wsFeMap.get(pno)!.add(feText);
    }

    // ── Link ──
    const linkCount = savedLinks.filter(l => l.fmText?.trim() || l.fmId).length;
    const linkedFmCount = new Set(savedLinks.map(l => l.fmId).filter(Boolean)).size;
    const linkedFcCount = new Set(savedLinks.map(l => l.fcId).filter(Boolean)).size;

    // ★ MEDIUM-1: UUID/ID 참조 유효성 검증
    // WS 상태에서 유효한 FM ID, FC ID 집합을 구축
    const validFmIds = new Set<string>();
    const validFcIds = new Set<string>();
    for (const l2 of l2arr) {
      const modes = ((l2 as Record<string, unknown>).failureModes || []) as Array<{ id?: string; causes?: Array<{ id?: string }> }>;
      for (const m of modes) {
        if (m.id) validFmIds.add(m.id);
        for (const c of (m.causes || [])) {
          if (c.id) validFcIds.add(c.id);
        }
      }
    }
    // 참조 무결성 검사: savedLinks의 fmId/fcId가 유효한지 확인
    let orphanLinkCount = 0;
    for (const link of savedLinks) {
      if (link.fmId && !validFmIds.has(link.fmId)) orphanLinkCount++;
      if (link.fcId && !validFcIds.has(link.fcId)) orphanLinkCount++;
    }

    // ── 중복제거율 ──
    const rawTotal = rawChainInfo.totalChainRows;
    const parsedTotal = chains.length;
    const dedupRatio = rawTotal > 0 ? ((1 - parsedTotal / rawTotal) * 100).toFixed(1) : '0';

    // ── 공정 목록 ──
    const processes = (rawChainInfo.processes || []).map(p => ({
      no: p.processNo,
      name: p.processName,
    }));

    return {
      rawTotal, parsedTotal, dedupRatio,
      impFmTotal, impFcTotal, impFeTotal, impFmAll, impFcAll, impFeAll, impFmMap, impFcMap, impFeMap,
      pFmAll, pFcAll, pFeAll, pFmMap, pFcMap, pFeMap,
      wsFmTotal, wsFcTotal, wsFeTotal, wsFmAll, wsFcAll, wsFeAll, wsFmMap, wsFcMap, wsFeMap,
      linkCount, linkedFmCount, linkedFcCount,
      orphanLinkCount,
      processes,
      ef: rawChainInfo.excelFormulas,
    };
  }, [rawChainInfo, chains, flatItems, state, savedLinks]);

  const th = 'px-2 py-1 text-[10px] font-bold text-gray-700 border border-gray-300 bg-gray-100 whitespace-nowrap';
  const td = 'px-2 py-1 text-[10px] border border-gray-300 text-center font-mono';
  const grp = `${td} text-left font-bold whitespace-nowrap text-[10px]`;

  // ── 누락 상세 — Set diff로 정확한 누락 항목 식별 ──
  const mismatches = useMemo(() => {
    type M = { pno: string; pname: string; metric: string; stage: string; values: string[] };
    const result: M[] = [];
    const E = new Set<string>();
    const diff = (a: Set<string>, b: Set<string>) => [...a].filter(v => !b.has(v));
    const push = (pno: string, pname: string, metric: string, stage: string, vals: string[]) => {
      if (vals.length) result.push({ pno, pname, metric, stage, values: vals });
    };
    for (const p of data.processes) {
      const impFm = data.impFmMap.get(p.no) ?? E;
      const pFm = data.pFmMap.get(p.no) ?? E;
      const wsFm = data.wsFmMap.get(p.no) ?? E;
      push(p.no, p.name, 'FM', '파싱누락', diff(impFm, pFm));
      push(p.no, p.name, 'FM', 'WS누락', diff(pFm, wsFm));
      const impFc = data.impFcMap.get(p.no) ?? E;
      const pFc = data.pFcMap.get(p.no) ?? E;
      const wsFc = data.wsFcMap.get(p.no) ?? E;
      push(p.no, p.name, 'FC', '파싱누락', diff(impFc, pFc));
      push(p.no, p.name, 'FC', 'WS누락', diff(pFc, wsFc));
      const impFe = data.impFeMap.get(p.no) ?? E;
      const pFe = data.pFeMap.get(p.no) ?? E;
      const wsFe = data.wsFeMap.get(p.no) ?? E;
      push(p.no, p.name, 'FE', '파싱누락', diff(impFe, pFe));
      push(p.no, p.name, 'FE', 'WS누락', diff(pFe, wsFe));
    }
    return result;
  }, [data]);

  /** 셀 값 — 0이면 회색 */
  const cell = (v: number, highlight?: boolean) => (
    <span className={highlight ? 'text-red-600 font-bold' : v === 0 ? 'text-gray-400' : ''}>
      {v}
    </span>
  );

  return (
    <div className="px-3 py-2">
      {/* 제목 */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs font-bold text-orange-700">
          FC 고장사슬 검증 (Import {data.rawTotal}건)
        </span>
        <span className="text-[9px] text-gray-500">
          중복제거: {data.rawTotal}→{data.parsedTotal} ({data.dedupRatio}%)
        </span>
        <span className="text-[9px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
          Link: {data.linkCount}건 (FM:{data.linkedFmCount} FC:{data.linkedFcCount})
        </span>
        {/* ★ MEDIUM-1: UUID 참조 무결성 경고 */}
        {data.orphanLinkCount > 0 && (
          <span className="text-[9px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded font-bold">
            ⚠️ 고아 참조: {data.orphanLinkCount}건
          </span>
        )}
        {data.ef?.hasVerifySheet && (
          <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            VERIFY시트: FM={data.ef.fmCount} FC={data.ef.fcCount} FE={data.ef.feCount}
          </span>
        )}
      </div>

      {/* 통합 가로 테이블 — IMPORT/파싱/WS/검증 행그룹 */}
      <div className="overflow-x-auto">
        <table className="border-collapse w-auto">
          <thead>
            <tr>
              <th className={th}>구분</th>
              <th className={th}>항목</th>
              <th className={`${th} bg-yellow-50`}>합계</th>
              {data.processes.map(p => (
                <th key={p.no} className={th} title={p.name}>
                  <div>{p.no}</div>
                  <div className="text-[8px] font-normal text-gray-500 max-w-[80px] truncate">
                    {p.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ── Import 그룹 ── */}
            <tr className="bg-orange-50/50">
              <td className={grp} rowSpan={3} style={{ verticalAlign: 'middle' }}>
                <span className="text-orange-700">Import</span>
              </td>
              <td className={`${td} text-left font-bold`}>FM</td>
              <td className={`${td} bg-yellow-50 font-bold`}>{data.impFmTotal}</td>
              {data.processes.map(p => (
                <td key={p.no} className={td}>{cell(data.impFmMap.get(p.no)?.size || 0)}</td>
              ))}
            </tr>
            <tr className="bg-orange-50/50">
              <td className={`${td} text-left font-bold`}>FC</td>
              <td className={`${td} bg-yellow-50 font-bold`}>{data.impFcTotal}</td>
              {data.processes.map(p => (
                <td key={p.no} className={td}>{cell(data.impFcMap.get(p.no)?.size || 0)}</td>
              ))}
            </tr>
            <tr className="bg-orange-50/50">
              <td className={`${td} text-left font-bold`}>FE</td>
              <td className={`${td} bg-yellow-50 font-bold`}>{data.impFeTotal}</td>
              {data.processes.map(p => (
                <td key={p.no} className={td}>{cell(data.impFeMap.get(p.no)?.size || 0)}</td>
              ))}
            </tr>

            {/* ── 파싱 그룹 ── */}
            <tr className="bg-blue-50/50">
              <td className={grp} rowSpan={3} style={{ verticalAlign: 'middle' }}>
                <span className="text-blue-700">파싱</span>
              </td>
              <td className={`${td} text-left font-bold`}>FM</td>
              <td className={`${td} bg-yellow-50 font-bold`}>{data.pFmAll.size}</td>
              {data.processes.map(p => {
                const v = data.pFmMap.get(p.no)?.size || 0;
                const imp = data.impFmMap.get(p.no)?.size || 0;
                return <td key={p.no} className={td}>{cell(v, v !== imp)}</td>;
              })}
            </tr>
            <tr className="bg-blue-50/50">
              <td className={`${td} text-left font-bold`}>FC</td>
              <td className={`${td} bg-yellow-50 font-bold`}>{data.pFcAll.size}</td>
              {data.processes.map(p => {
                const v = data.pFcMap.get(p.no)?.size || 0;
                const imp = data.impFcMap.get(p.no)?.size || 0;
                return <td key={p.no} className={td}>{cell(v, v !== imp)}</td>;
              })}
            </tr>
            <tr className="bg-blue-50/50">
              <td className={`${td} text-left font-bold`}>FE</td>
              <td className={`${td} bg-yellow-50 font-bold`}>{data.pFeAll.size}</td>
              {data.processes.map(p => {
                const v = data.pFeMap.get(p.no)?.size || 0;
                const imp = data.impFeMap.get(p.no)?.size || 0;
                return <td key={p.no} className={td}>{cell(v, v !== imp)}</td>;
              })}
            </tr>

            {/* ── WS 그룹 ── */}
            <tr className="bg-green-50/50">
              <td className={grp} rowSpan={3} style={{ verticalAlign: 'middle' }}>
                <span className="text-green-700">WS</span>
              </td>
              <td className={`${td} text-left font-bold`}>FM</td>
              <td className={`${td} bg-yellow-50 font-bold`}>{data.wsFmTotal}</td>
              {data.processes.map(p => (
                <td key={p.no} className={td}>{cell(data.wsFmMap.get(p.no)?.size ?? 0)}</td>
              ))}
            </tr>
            <tr className="bg-green-50/50">
              <td className={`${td} text-left font-bold`}>FC</td>
              <td className={`${td} bg-yellow-50 font-bold`}>{data.wsFcTotal}</td>
              {data.processes.map(p => (
                <td key={p.no} className={td}>{cell(data.wsFcMap.get(p.no)?.size ?? 0)}</td>
              ))}
            </tr>
            <tr className="bg-green-50/50">
              <td className={`${td} text-left font-bold`}>FE</td>
              <td className={`${td} bg-yellow-50 font-bold`}>{data.wsFeTotal}</td>
              {data.processes.map(p => (
                <td key={p.no} className={td}>{cell(data.wsFeMap.get(p.no)?.size ?? 0)}</td>
              ))}
            </tr>

            {/* ── 검증 그룹 (FM/FC/FE — Set 값 비교 기준) ── */}
            <VerifyRow
              label="FM" isFirst rowSpan={3}
              totalSets={[data.impFmAll, data.pFmAll, data.wsFmAll]}
              processes={data.processes}
              getSets={pno => [
                data.impFmMap.get(pno) ?? EMPTY_SET,
                data.pFmMap.get(pno) ?? EMPTY_SET,
                data.wsFmMap.get(pno) ?? EMPTY_SET,
              ]}
              td={td} grp={grp}
            />
            <VerifyRow
              label="FC"
              totalSets={[data.impFcAll, data.pFcAll, data.wsFcAll]}
              processes={data.processes}
              getSets={pno => [
                data.impFcMap.get(pno) ?? EMPTY_SET,
                data.pFcMap.get(pno) ?? EMPTY_SET,
                data.wsFcMap.get(pno) ?? EMPTY_SET,
              ]}
              td={td} grp={grp}
            />
            <VerifyRow
              label="FE"
              totalSets={[data.impFeAll, data.pFeAll, data.wsFeAll]}
              processes={data.processes}
              getSets={pno => [
                data.impFeMap.get(pno) ?? EMPTY_SET,
                data.pFeMap.get(pno) ?? EMPTY_SET,
                data.wsFeMap.get(pno) ?? EMPTY_SET,
              ]}
              td={td} grp={grp}
            />
          </tbody>
        </table>
      </div>

      {/* ── 누락 상세 목록 — 어떤 값이 어디서 누락됐는지 구체적 표시 ── */}
      {mismatches.length > 0 && (
        <div className="mt-2 border border-red-200 bg-red-50/50 rounded p-2">
          <div className="text-[10px] font-bold text-red-700 mb-1">
            누락 상세 ({mismatches.length}건)
          </div>
          <div className="text-[9px] space-y-0.5 max-h-[200px] overflow-y-auto">
            {mismatches.map((m, i) => (
              <div key={i} className="flex gap-1 items-baseline">
                <span className="font-mono text-red-600 shrink-0">[{m.pno}]</span>
                <span className="font-bold shrink-0">{m.metric}</span>
                <span className={`shrink-0 px-1 rounded ${
                  m.stage === '파싱누락' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>{m.stage}</span>
                <span className="text-gray-700 truncate" title={m.values.join(', ')}>
                  {m.values.join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Set 비교 유틸 ───

const EMPTY_SET = new Set<string>();

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) { if (!b.has(v)) return false; }
  return true;
}

// ─── 검증 셀 — Set 값 비교 (카운트가 같아도 내용이 다르면 NG) ───

function VerifyCell({ sets, td }: { sets: [Set<string>, Set<string>, Set<string>]; td: string }) {
  const [imp, parsed, ws] = sets;

  // 3소스 모두 비어있음
  if (imp.size === 0 && parsed.size === 0 && ws.size === 0) {
    return <td className={`${td} text-gray-300`}>–</td>;
  }

  // Set 내용 비교
  const ipMatch = setsEqual(imp, parsed);
  const pwMatch = setsEqual(parsed, ws);
  const allMatch = ipMatch && pwMatch;

  if (allMatch) {
    return (
      <td className={`${td} ${statusColor('ok')} font-bold`}>
        {statusIcon('ok')} {imp.size}
      </td>
    );
  }

  // 불일치 — diff 계산
  const impNotParsed = [...imp].filter(v => !parsed.has(v));
  const parsedNotWs = [...parsed].filter(v => !ws.has(v));

  const tips: string[] = [];
  if (impNotParsed.length) tips.push(`파싱누락(${impNotParsed.length}): ${impNotParsed.join(', ')}`);
  if (parsedNotWs.length) tips.push(`WS누락(${parsedNotWs.length}): ${parsedNotWs.join(', ')}`);

  return (
    <td className={`${td} ${statusColor('fail')} cursor-help`} title={tips.join('\n')}>
      <div className="font-bold">{statusIcon('fail')} NG</div>
      <div className="text-[8px] text-red-500">{imp.size}/{parsed.size}/{ws.size}</div>
    </td>
  );
}

// ─── 검증 행 컴포넌트 ───

function VerifyRow({ label, isFirst, rowSpan, totalSets, processes, getSets, td, grp }: {
  label: string;
  isFirst?: boolean;
  rowSpan?: number;
  totalSets: [Set<string>, Set<string>, Set<string>];
  processes: Array<{ no: string; name: string }>;
  getSets: (pno: string) => [Set<string>, Set<string>, Set<string>];
  td: string;
  grp: string;
}) {
  return (
    <tr className="bg-gray-50/50">
      {isFirst && (
        <td className={grp} rowSpan={rowSpan} style={{ verticalAlign: 'middle' }}>
          <span className="text-gray-700">검증</span>
        </td>
      )}
      <td className={`${td} text-left font-bold`}>{label}</td>
      <VerifyCell sets={totalSets} td={`${td} bg-yellow-50`} />
      {processes.map(p => (
        <VerifyCell key={p.no} sets={getSets(p.no)} td={td} />
      ))}
    </tr>
  );
}
