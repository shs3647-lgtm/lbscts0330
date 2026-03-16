'use client';

/**
 * @file page.tsx
 * @description FMEA 통계검증 페이지
 *
 * URL: /pfmea/verify?fmeaId=xxx
 *
 * 4개 검증 탭:
 * 1. 탭별 DB 카운트 (17항목)
 * 2. FK 정합성 (고아 레코드 9개 FK 관계)
 * 3. Import vs DB 비교 (15 아이템코드 + link)
 * 4. 카테시안 중복 탐지
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PFMEATopNav from '@/components/layout/PFMEATopNav';
import { FixedLayout } from '@/components/layout';
import type {
  VerifyIntegrityResponse, VerifyTab,
  FKCheckItem, ImportComparisonItem, CartesianGroup,
  CountDisplayRow,
} from './types';
import { getScoreColor, getScoreLabel, getStatusIcon, buildCountDisplayRows } from './utils';

interface FixResult {
  relation: string;
  action: 'reassign' | 'nullify' | 'delete';
  count: number;
  detail: string;
}

/** 탭별 카운트 행 그룹핑 (섹션 구분) */
function groupBySection(rows: CountDisplayRow[]): Map<string, CountDisplayRow[]> {
  const map = new Map<string, CountDisplayRow[]>();
  for (const row of rows) {
    const arr = map.get(row.section) || [];
    arr.push(row);
    map.set(row.section, arr);
  }
  return map;
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>}>
      <VerifyPageContent />
    </Suspense>
  );
}

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const fmeaId = searchParams.get('fmeaId') || '';

  const [data, setData] = useState<VerifyIntegrityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<VerifyTab>('counts');
  const [fixing, setFixing] = useState(false);
  const [fixReport, setFixReport] = useState<FixResult[] | null>(null);

  const fetchData = useCallback(async () => {
    if (!fmeaId) {
      setError('fmeaId가 필요합니다. URL에 ?fmeaId=xxx 형태로 전달해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fmea/verify-integrity?fmeaId=${encodeURIComponent(fmeaId)}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error || '검증 실패');
        return;
      }
      setData(json as VerifyIntegrityResponse);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`API 호출 실패: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [fmeaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFix = useCallback(async () => {
    if (!fmeaId) return;
    if (!confirm('FK 고아 레코드를 정리합니다. 계속하시겠습니까?\n(Clean up FK orphan records?)')) return;
    setFixing(true);
    setFixReport(null);
    try {
      const res = await fetch('/api/fmea/verify-integrity/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(`정리 실패: ${json.error}`);
        return;
      }
      setFixReport(json.results as FixResult[]);
      // 정리 후 자동 새로고침
      await fetchData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`정리 API 호출 실패: ${msg}`);
    } finally {
      setFixing(false);
    }
  }, [fmeaId, fetchData]);

  const tabs: Array<{ id: VerifyTab; label: string }> = [
    { id: 'counts', label: '탭별 카운트(Tab Counts)' },
    { id: 'fk', label: 'FK 정합성(FK Integrity)' },
    { id: 'import', label: 'Import 비교(Import Comparison)' },
    { id: 'cartesian', label: '중복 탐지(Cartesian Detection)' },
  ];

  return (
    <FixedLayout topNav={<PFMEATopNav />} bgColor="#f8fafc">
      <div className="max-w-[1400px] mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              FMEA 통계검증(Statistics Verify)
            </h1>
            {data && (
              <p className="text-sm text-gray-500 mt-1">
                FMEA: {data.fmeaName || data.fmeaId}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(data.score)}`}>
                {data.score} — {getScoreLabel(data.score)}
              </span>
            )}
            {data && data.fkIntegrity.totalOrphans > 0 && (
              <button
                onClick={handleFix}
                disabled={fixing || loading}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                {fixing ? '정리 중...(Fixing...)' : `고아 정리(Fix ${data.fkIntegrity.totalOrphans})`}
              </button>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '검증 중...' : '새로고침(Refresh)'}
            </button>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 로딩 */}
        {loading && !data && (
          <div className="flex items-center justify-center h-64 text-gray-400">
            DB 검증 중... 잠시 기다려주세요.
          </div>
        )}

        {/* 데이터 */}
        {data && (
          <>
            {/* 종합 요약 카드 */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <SummaryCard
                label="DB 항목(DB Items)"
                value={`${Object.values(data.counts).reduce((s, v) => s + v, 0)}`}
                status="info"
              />
              <SummaryCard
                label="FK 고아(Orphans)"
                value={`${data.fkIntegrity.totalOrphans}`}
                status={data.fkIntegrity.totalOrphans === 0 ? 'ok' : 'error'}
              />
              <SummaryCard
                label="Import 불일치(Mismatch)"
                value={`${data.importComparison.totalMismatch}`}
                status={data.importComparison.totalMismatch === 0 ? 'ok' : 'warn'}
              />
              <SummaryCard
                label="카테시안 중복(Duplicates)"
                value={`${data.cartesian.duplicateProductChars + data.cartesian.duplicateFailureModes}`}
                status={(data.cartesian.duplicateProductChars + data.cartesian.duplicateFailureModes) === 0 ? 'ok' : 'error'}
              />
            </div>

            {/* 탭 메뉴 */}
            <div className="flex border-b border-gray-300 mb-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 탭 내용 */}
            {activeTab === 'counts' && <CountsTable counts={data.counts} />}
            {activeTab === 'fk' && <FKTable checks={data.fkIntegrity.checks} />}
            {activeTab === 'import' && <ImportTable items={data.importComparison.items} />}
            {activeTab === 'cartesian' && (
              <CartesianTable
                dupPc={data.cartesian.duplicateProductChars}
                dupFm={data.cartesian.duplicateFailureModes}
                groups={data.cartesian.groups}
              />
            )}

            {/* 정리 결과 보고서 */}
            {fixReport && fixReport.length > 0 && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded overflow-hidden">
                <div className="px-3 py-2 bg-green-100 text-sm font-bold text-green-800">
                  정리 완료 보고서(Cleanup Report)
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-600 border-b border-green-200">
                      <th className="text-left px-3 py-1.5">관계(Relation)</th>
                      <th className="text-right px-3 py-1.5 w-28">삭제 건수(Deleted)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fixReport.filter(r => r.count > 0).map((r, idx) => (
                      <tr key={idx} className="border-t border-green-100">
                        <td className="px-3 py-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs mr-2 ${
                            r.action === 'reassign' ? 'bg-blue-100 text-blue-700' :
                            r.action === 'nullify' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {r.action === 'reassign' ? '재할당' : r.action === 'nullify' ? 'null설정' : '삭제'}
                          </span>
                          {r.relation}
                        </td>
                        <td className="px-3 py-1 text-right font-mono font-bold text-green-700">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {fixReport && fixReport.length === 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                정리할 고아 레코드가 없습니다. (No orphan records to clean up.)
              </div>
            )}

            {/* Link 진단 */}
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-500">
              FailureLink 진단: Active={data.linkDiag.active} | SoftDeleted={data.linkDiag.softDeleted} | Total={data.linkDiag.total} | ImportChains={data.linkDiag.importChains}
            </div>
          </>
        )}
      </div>
    </FixedLayout>
  );
}

// ──────────────────────────────────────────────────
// 서브 컴포넌트
// ──────────────────────────────────────────────────

function SummaryCard({ label, value, status }: { label: string; value: string; status: 'ok' | 'warn' | 'error' | 'info' }) {
  const bgMap = { ok: 'bg-green-50 border-green-200', warn: 'bg-yellow-50 border-yellow-200', error: 'bg-red-50 border-red-200', info: 'bg-blue-50 border-blue-200' };
  const textMap = { ok: 'text-green-700', warn: 'text-yellow-700', error: 'text-red-700', info: 'text-blue-700' };
  return (
    <div className={`p-3 rounded border ${bgMap[status]}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-bold ${textMap[status]}`}>
        {getStatusIcon(status)} {value}
      </div>
    </div>
  );
}

/** 탭별 카운트 테이블 */
function CountsTable({ counts }: { counts: VerifyIntegrityResponse['counts'] }) {
  const rows = buildCountDisplayRows(counts);
  const grouped = groupBySection(rows);

  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-gray-600">
            <th className="text-left px-3 py-2 w-56">탭/항목(Tab/Item)</th>
            <th className="text-left px-3 py-2 w-52">DB 테이블(DB Table)</th>
            <th className="text-right px-3 py-2 w-28">DB 건수(Count)</th>
            <th className="text-center px-3 py-2 w-20">상태(Status)</th>
            <th className="text-left px-3 py-2">비고(Note)</th>
          </tr>
        </thead>
        <tbody>
          {[...grouped.entries()].map(([section, sectionRows]) => (
            <React.Fragment key={section}>
              <tr className="bg-gray-50">
                <td colSpan={5} className="px-3 py-1.5 font-bold text-xs text-gray-700 border-t border-gray-200">
                  {section}
                </td>
              </tr>
              {sectionRows.map((row, idx) => (
                <tr key={`${section}-${idx}`} className="border-t border-gray-100 hover:bg-blue-50">
                  <td className="px-3 py-1.5 pl-6">{row.label}</td>
                  <td className="px-3 py-1.5 text-gray-400 font-mono text-xs">{row.labelEn}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{row.dbCount.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-center">{getStatusIcon(row.status)}</td>
                  <td className="px-3 py-1.5 text-gray-400 text-xs">{row.note || ''}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** FK 정합성 테이블 */
function FKTable({ checks }: { checks: FKCheckItem[] }) {
  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-gray-600">
            <th className="text-left px-3 py-2">FK 관계(FK Relation)</th>
            <th className="text-left px-3 py-2 w-36">테이블(Table)</th>
            <th className="text-left px-3 py-2 w-40">대상(Target)</th>
            <th className="text-right px-3 py-2 w-28">고아 수(Orphans)</th>
            <th className="text-center px-3 py-2 w-20">상태(Status)</th>
            <th className="text-left px-3 py-2">샘플 ID(Sample IDs)</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check, idx) => (
            <tr
              key={idx}
              className={`border-t border-gray-100 ${check.orphanCount > 0 ? 'bg-red-50' : 'hover:bg-blue-50'}`}
            >
              <td className="px-3 py-1.5 font-medium">{check.relation}</td>
              <td className="px-3 py-1.5 text-gray-500 font-mono text-xs">{check.table}</td>
              <td className="px-3 py-1.5 text-gray-500 font-mono text-xs">{check.targetTable}</td>
              <td className="px-3 py-1.5 text-right font-mono font-bold">
                {check.orphanCount}
              </td>
              <td className="px-3 py-1.5 text-center">
                {getStatusIcon(check.orphanCount === 0 ? 'ok' : 'error')}
              </td>
              <td className="px-3 py-1.5 text-gray-400 text-xs font-mono truncate max-w-xs" title={check.sampleIds.join(', ')}>
                {check.sampleIds.length > 0 ? check.sampleIds.join(', ') : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {checks.every(c => c.orphanCount === 0) && (
        <div className="p-3 text-center text-sm text-green-600 bg-green-50">
          {getStatusIcon('ok')} 모든 FK 관계가 정상입니다. (All FK relations are valid.)
        </div>
      )}
    </div>
  );
}

/** Import vs DB 비교 테이블 */
function ImportTable({ items }: { items: ImportComparisonItem[] }) {
  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-gray-600">
            <th className="text-left px-3 py-2 w-20">코드(Code)</th>
            <th className="text-left px-3 py-2 w-52">항목(Item)</th>
            <th className="text-right px-3 py-2 w-28">Import</th>
            <th className="text-right px-3 py-2 w-28">DB</th>
            <th className="text-right px-3 py-2 w-24">차이(Diff)</th>
            <th className="text-center px-3 py-2 w-20">상태(Status)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={idx}
              className={`border-t border-gray-100 ${
                item.status === 'MISMATCH' ? 'bg-yellow-50' : 'hover:bg-blue-50'
              }`}
            >
              <td className="px-3 py-1.5 font-mono font-medium">{item.code}</td>
              <td className="px-3 py-1.5">{item.label}</td>
              <td className="px-3 py-1.5 text-right font-mono">{item.importCount.toLocaleString()}</td>
              <td className="px-3 py-1.5 text-right font-mono">{item.dbCount.toLocaleString()}</td>
              <td className={`px-3 py-1.5 text-right font-mono font-bold ${
                item.diff !== 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {item.diff > 0 ? `+${item.diff}` : item.diff}
              </td>
              <td className="px-3 py-1.5 text-center">
                {item.status === 'OK' && getStatusIcon('ok')}
                {item.status === 'MISMATCH' && getStatusIcon('warn')}
                {item.status === 'N/A' && <span className="text-gray-400">N/A</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.every(i => i.status === 'OK' || i.status === 'N/A') && (
        <div className="p-3 text-center text-sm text-green-600 bg-green-50">
          {getStatusIcon('ok')} Import와 DB 카운트가 일치합니다. (Import and DB counts match.)
        </div>
      )}
    </div>
  );
}

/** 카테시안 중복 탐지 테이블 */
function CartesianTable({ dupPc, dupFm, groups }: {
  dupPc: number; dupFm: number; groups: CartesianGroup[];
}) {
  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded border ${dupPc === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-xs text-gray-500">ProcessProductChar 중복(Duplicates)</div>
          <div className={`text-xl font-bold ${dupPc === 0 ? 'text-green-700' : 'text-red-700'}`}>
            {getStatusIcon(dupPc === 0 ? 'ok' : 'error')} {dupPc}
          </div>
        </div>
        <div className={`p-3 rounded border ${dupFm === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-xs text-gray-500">FailureMode 중복(Duplicates)</div>
          <div className={`text-xl font-bold ${dupFm === 0 ? 'text-green-700' : 'text-red-700'}`}>
            {getStatusIcon(dupFm === 0 ? 'ok' : 'error')} {dupFm}
          </div>
        </div>
      </div>

      {/* 상세 */}
      {groups.length > 0 ? (
        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">테이블(Table)</th>
                <th className="text-left px-3 py-2">그룹 키(Group Key)</th>
                <th className="text-right px-3 py-2 w-28">중복 수(Count)</th>
                <th className="text-center px-3 py-2 w-20">상태(Status)</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, idx) => (
                <tr key={idx} className="border-t border-gray-100 bg-red-50">
                  <td className="px-3 py-1.5 font-mono text-xs">{g.table}</td>
                  <td className="px-3 py-1.5 font-mono text-xs truncate max-w-sm" title={g.groupKey}>
                    {g.groupKey}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-red-600">{g.count}</td>
                  <td className="px-3 py-1.5 text-center">{getStatusIcon('error')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 text-center text-sm text-green-600 bg-green-50 rounded border border-green-200">
          {getStatusIcon('ok')} 카테시안 중복이 없습니다. (No Cartesian duplicates detected.)
        </div>
      )}
    </div>
  );
}
