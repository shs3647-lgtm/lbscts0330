'use client';

/**
 * @file DbVerifyPanel.tsx
 * @description DB 영구저장 검증 패널 — 파싱 카운트 vs DB 저장 카운트 대조
 * Import 후 DB에 실제 저장된 건수를 파싱 건수와 비교하여 정합성 보장
 *
 * ★ MBD-26-009: 3단계 검증(PASS/WARN/FAIL) — 복합키 dedup·공정 전개로
 * 파싱↔메모리↔DB 간 소폭 차이는 WARN, 대형 누락만 FAIL
 * @created 2026-03-22
 */

import React, { useMemo, useState } from 'react';
import type { ParseStatistics } from '@/app/(fmea-core)/pfmea/import/excel-parser';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

interface Props {
  parseStats: ParseStatistics;
  dbCounts: Record<string, number>;
  flatData: ImportedFlatData[];
}

const ALL_CODES: [string, string, string][] = [
  ['L2', 'A1', '공정번호'], ['L2', 'A2', '공정명'], ['L2', 'A3', '공정기능'],
  ['L2', 'A4', '제품특성'], ['L2', 'A5', '고장형태'], ['L2', 'A6', '검출관리'],
  ['L3', 'B1', '작업요소'], ['L3', 'B2', '요소기능'], ['L3', 'B3', '공정특성'],
  ['L3', 'B4', '고장원인'], ['L3', 'B5', '예방관리'],
  ['L1', 'C1', '구분'], ['L1', 'C2', '제품기능'], ['L1', 'C3', '요구사항'], ['L1', 'C4', '고장영향'],
];

/** 개별 항목 검증 결과 */
type VerifyGrade = 'pass' | 'warn' | 'fail';

function gradeRow(mem: number, db: number): VerifyGrade {
  if (mem === db) return 'pass';         // 완전 일치
  if (db >= mem) return 'pass';          // DB ≥ 메모리: 정상 (skipDuplicates 등)
  if (mem === 0) return 'pass';          // 원래 없음
  // DB가 mem보다 적은 경우
  const gap = mem - db;
  const pct = gap / mem;
  if (pct <= 0.05 || gap <= 3) return 'warn';  // 5% 이하 또는 3건 이하: 경고
  return 'fail';                         // 대형 누락: 실패
}

export default function DbVerifyPanel({ parseStats, dbCounts, flatData }: Props) {
  const [expanded, setExpanded] = useState(true);

  const rows = useMemo(() => {
    const parseMap = new Map<string, { raw: number; unique: number }>();
    for (const s of parseStats.itemStats) {
      parseMap.set(s.itemCode, { raw: s.rawCount, unique: s.uniqueCount });
    }

    const flatCounts = new Map<string, number>();
    for (const item of flatData) {
      flatCounts.set(item.itemCode, (flatCounts.get(item.itemCode) || 0) + 1);
    }

    return ALL_CODES.map(([level, code, label]) => {
      const parse = parseMap.get(code);
      const parseCount = parse?.raw ?? 0;
      const uniqueCount = parse?.unique ?? 0;
      const memCount = flatCounts.get(code) ?? 0;
      const dbCount = dbCounts[code] ?? 0;
      const grade = gradeRow(memCount, dbCount);
      return { level, code, label, parseCount, uniqueCount, memCount, dbCount, grade };
    });
  }, [parseStats, dbCounts, flatData]);

  const totalParse = rows.reduce((s, r) => s + r.parseCount, 0);
  const totalUnique = rows.reduce((s, r) => s + r.uniqueCount, 0);
  const totalMem = rows.reduce((s, r) => s + r.memCount, 0);
  const totalDb = rows.reduce((s, r) => s + r.dbCount, 0);

  const failCount = rows.filter(r => r.grade === 'fail').length;
  const warnCount = rows.filter(r => r.grade === 'warn').length;
  const overallGrade: VerifyGrade = failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass';

  const headerStyle = overallGrade === 'pass' ? 'bg-emerald-600 text-white'
    : overallGrade === 'warn' ? 'bg-amber-500 text-white'
    : 'bg-red-600 text-white';
  const statusLabel = overallGrade === 'pass' ? '✅ 전체 일치'
    : overallGrade === 'warn' ? `⚡ ${warnCount}건 허용차이`
    : `⚠️ ${failCount}건 불일치`;
  const badgeLabel = overallGrade === 'pass' ? 'PASS'
    : overallGrade === 'warn' ? 'WARN' : 'FAIL';

  return (
    <div className="mt-2 mb-2 border border-emerald-300 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold cursor-pointer ${headerStyle}`}
      >
        <span>
          {expanded ? '▼' : '▶'}{' '}
          DB 영구저장 검증 — {statusLabel}
          {' '}(파싱 {totalParse} → 메모리 {totalMem} → DB {totalDb})
        </span>
        <span className="text-[10px] opacity-80">
          {badgeLabel}
        </span>
      </button>
      <p className="px-2 py-0.5 text-[9px] text-gray-600 bg-gray-50 border-x border-b border-gray-200">
        검증 기준: <strong>메모리(flat)</strong>와 <strong>DB</strong> 건수 비교.
        복합키 dedup·공정 전개로 소폭 차이(≤5% 또는 ≤3건)는 허용(WARN).
        &quot;파싱&quot; 합계는 엑셀 원본 셀 수라 메모리와 다를 수 있습니다.
      </p>

      {expanded && (
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 px-1.5 py-0.5 text-center" style={{width: 30}}>레벨</th>
              <th className="border border-gray-200 px-1.5 py-0.5 text-center" style={{width: 36}}>코드</th>
              <th className="border border-gray-200 px-1.5 py-0.5 text-left">항목</th>
              <th className="border border-gray-200 px-1.5 py-0.5 text-center bg-blue-50" style={{width: 40}}>파싱</th>
              <th className="border border-gray-200 px-1.5 py-0.5 text-center bg-blue-50" style={{width: 40}}>고유</th>
              <th className="border border-gray-200 px-1.5 py-0.5 text-center bg-cyan-50" style={{width: 44}}>메모리</th>
              <th className="border border-gray-200 px-1.5 py-0.5 text-center bg-emerald-50 font-bold" style={{width: 44}}>DB</th>
              <th className="border border-gray-200 px-1.5 py-0.5 text-center" style={{width: 30}}>검증</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.code}
                className={
                  r.grade === 'fail' ? 'bg-red-50' :
                  r.grade === 'warn' ? 'bg-amber-50/50' :
                  r.level === 'L1' ? 'bg-yellow-50/50' :
                  r.level === 'L2' ? 'bg-blue-50/30' : 'bg-green-50/30'
                }
              >
                <td className="border border-gray-200 px-1 py-0.5 text-center text-gray-500">{r.level}</td>
                <td className="border border-gray-200 px-1 py-0.5 text-center font-mono font-bold">{r.code}</td>
                <td className="border border-gray-200 px-1 py-0.5">{r.label}</td>
                <td className="border border-gray-200 px-1 py-0.5 text-center">{r.parseCount}</td>
                <td className="border border-gray-200 px-1 py-0.5 text-center text-blue-700">{r.uniqueCount}</td>
                <td className="border border-gray-200 px-1 py-0.5 text-center text-cyan-700 font-bold">{r.memCount}</td>
                <td className={`border border-gray-200 px-1 py-0.5 text-center font-bold ${
                  r.grade === 'pass' ? 'text-emerald-700' :
                  r.grade === 'warn' ? 'text-amber-600 bg-amber-50' :
                  'text-red-600 bg-red-100'
                }`}>{r.dbCount}</td>
                <td className="border border-gray-200 px-1 py-0.5 text-center">
                  {r.grade === 'pass'
                    ? <span className="text-emerald-600 font-bold">✓</span>
                    : r.grade === 'warn'
                    ? <span className="text-amber-500 font-bold">~</span>
                    : <span className="text-red-600 font-bold">✗</span>
                  }
                </td>
              </tr>
            ))}
            <tr className="bg-gray-200 font-bold">
              <td colSpan={3} className="border border-gray-300 px-1.5 py-0.5">합계</td>
              <td className="border border-gray-300 px-1.5 py-0.5 text-center">{totalParse}</td>
              <td className="border border-gray-300 px-1.5 py-0.5 text-center text-blue-700">{totalUnique}</td>
              <td className="border border-gray-300 px-1.5 py-0.5 text-center text-cyan-700">{totalMem}</td>
              <td className={`border border-gray-300 px-1.5 py-0.5 text-center ${
                overallGrade === 'pass' ? 'text-emerald-700' :
                overallGrade === 'warn' ? 'text-amber-600' : 'text-red-600'
              }`}>{totalDb}</td>
              <td className="border border-gray-300 px-1.5 py-0.5 text-center">
                {overallGrade === 'pass'
                  ? <span className="text-emerald-600 font-bold">✓</span>
                  : overallGrade === 'warn'
                  ? <span className="text-amber-500 font-bold">~</span>
                  : <span className="text-red-600 font-bold">✗</span>
                }
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
