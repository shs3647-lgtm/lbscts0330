/**
 * @file APSummaryTable.tsx
 * @description AP Improvement 요약 테이블 컴포넌트
 * @author AI Assistant
 * @created 2026-01-03
 * 
 * 테이블 디자인 원칙:
 * - 헤더: #00587a (진한 남청색) + 흰색 글자
 * - 첫 번째 열: #00587a + 흰색 글자
 * - 짝수 행: #e0f2fb (연한 하늘색)
 * - 홀수 행: #ffffff (흰색)
 * - 테두리: 1px solid #999
 */

'use client';

import Link from 'next/link';
import { APSummaryItem, APStats } from '../types';
import { getAPBadge, getStatusInfo } from '../utils';

interface APSummaryTableProps {
  data: APSummaryItem[];
  stats: APStats;
}

export default function APSummaryTable({ data, stats }: APSummaryTableProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-black text-base flex items-center gap-2">
          <span className="text-red-400">⚠️</span>
          AP Improvement 진행상태
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 font-bold">H: {stats.high}</span>
          <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 font-bold">M: {stats.medium}</span>
          <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 font-bold">L: {stats.low}</span>
          <span className="px-2 py-1 rounded bg-white/10 text-white/70">
            완료: {stats.completed}/{stats.total}
          </span>
          <Link 
            href="/welcomeboard/ap-improvement"
            className="ml-2 px-3 py-1 rounded bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
          >
            전체보기 →
          </Link>
        </div>
      </div>
      
      {/* 표준 테이블 디자인 - 컴팩트 */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            {/* 헤더 - #00587a 진한 남청색 */}
            <thead>
              <tr>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-center border border-[#999] whitespace-nowrap">AP5</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-center border border-[#999] whitespace-nowrap">AP6</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-center border border-[#999] whitespace-nowrap">RPN5</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-center border border-[#999] whitespace-nowrap">RPN6</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-center border border-[#999] whitespace-nowrap">특성</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-left border border-[#999] whitespace-nowrap">예방관리</th>
                <th className="bg-[#00587a] text-white font-bold px-1 py-2 text-center border border-[#999] whitespace-nowrap">S</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-left border border-[#999] whitespace-nowrap">고장형태</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-left border border-[#999] whitespace-nowrap">고장원인</th>
                <th className="bg-[#00587a] text-white font-bold px-1 py-2 text-center border border-[#999] whitespace-nowrap">O</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-left border border-[#999] whitespace-nowrap">검출관리</th>
                <th className="bg-[#00587a] text-white font-bold px-1 py-2 text-center border border-[#999] whitespace-nowrap">D</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-center border border-[#999] whitespace-nowrap">담당자</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-center border border-[#999] whitespace-nowrap w-16">상태</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-2 text-center border border-[#999] whitespace-nowrap">완료일</th>
              </tr>
            </thead>
            <tbody>
              {data.map((ap, index) => {
                const statusInfo = getStatusInfo(ap.status);
                return (
                <tr 
                  key={ap.id} 
                  className={index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}
                >
                  {/* AP5 */}
                  <td className="bg-[#00587a] text-white font-bold px-2 py-1.5 text-center border border-[#999]">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-bold text-xs ${getAPBadge(ap.ap5)}`}>
                      {ap.ap5}
                    </span>
                  </td>
                  {/* AP6 */}
                  <td className="px-2 py-1.5 text-center border border-[#999] text-black">
                    {ap.ap6 ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-bold text-xs ${getAPBadge(ap.ap6)}`}>
                        {ap.ap6}
                      </span>
                    ) : '-'}
                  </td>
                  {/* RPN5 */}
                  <td className="px-2 py-1.5 text-center border border-[#999] text-black font-bold whitespace-nowrap">{ap.prn5}</td>
                  {/* RPN6 */}
                  <td className="px-2 py-1.5 text-center border border-[#999] text-black whitespace-nowrap">{ap.prn6 || '-'}</td>
                  {/* 특별특성 */}
                  <td className="px-2 py-1.5 text-center border border-[#999] text-black whitespace-nowrap">{ap.specialChar || '-'}</td>
                  {/* 예방관리 */}
                  <td className="px-2 py-1.5 text-left border border-[#999] text-black max-w-[120px] truncate" title={ap.preventiveControl}>
                    {ap.preventiveControl || '-'}
                  </td>
                  {/* S */}
                  <td className="px-1 py-1.5 text-center border border-[#999] text-black font-medium whitespace-nowrap">{ap.severity}</td>
                  {/* 고장형태 */}
                  <td className="px-2 py-1.5 text-left border border-[#999] text-black max-w-[120px] truncate" title={ap.failureMode}>
                    {ap.failureMode}
                  </td>
                  {/* 고장원인 */}
                  <td className="px-2 py-1.5 text-left border border-[#999] text-black max-w-[120px] truncate" title={ap.failureCause}>
                    {ap.failureCause}
                  </td>
                  {/* O */}
                  <td className="px-1 py-1.5 text-center border border-[#999] text-black font-medium whitespace-nowrap">{ap.occurrence}</td>
                  {/* 검출관리 */}
                  <td className="px-2 py-1.5 text-left border border-[#999] text-black max-w-[80px] truncate" title={ap.detectionControl}>
                    {ap.detectionControl || '-'}
                  </td>
                  {/* D */}
                  <td className="px-1 py-1.5 text-center border border-[#999] text-black font-medium whitespace-nowrap">{ap.detection}</td>
                  {/* 담당자 */}
                  <td className="px-2 py-1.5 text-center border border-[#999] text-black whitespace-nowrap">
                    {ap.responsible || '-'}
                  </td>
                  {/* 상태 */}
                  <td className="px-2 py-1.5 text-center border border-[#999]">
                    <span className={`inline-block px-3 py-1 rounded text-xs font-bold whitespace-nowrap ${statusInfo.style}`}>
                      {statusInfo.text}
                    </span>
                  </td>
                  {/* 완료일자 */}
                  <td className="px-2 py-1.5 text-center border border-[#999] text-black whitespace-nowrap">
                    {ap.dueDate || '-'}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* 색상 범례 */}
      <div className="mt-4 flex items-center gap-6 text-xs text-[#a7b6d3]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#00587a] border border-[#999]"></div>
          <span>헤더/좌측열: #00587a</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#e0f2fb] border border-[#999]"></div>
          <span>짝수 행: #e0f2fb</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-[#999]"></div>
          <span>홀수 행: #ffffff</span>
        </div>
      </div>
    </section>
  );
}





