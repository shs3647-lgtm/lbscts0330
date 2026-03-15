/**
 * @file APHelpModal.tsx
 * @description AP 개선관리 도움말 모달
 */

'use client';

import React from 'react';

interface APHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function APHelpModal({ isOpen, onClose }: APHelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-y-auto p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#00587a]">📖 AP 개선관리 도움말 (Help)</h2>
          <button className="text-gray-400 hover:text-gray-600 text-lg font-bold" onClick={onClose}>✕</button>
        </div>

        <div className="space-y-3 text-[11px] text-gray-700 leading-relaxed">
          <section>
            <h3 className="font-bold text-[12px] text-[#00587a] mb-1">1. AP 등급 (Action Priority)</h3>
            <table className="w-full text-[10px] border-collapse border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1">등급</th>
                  <th className="border border-slate-300 px-2 py-1">의미</th>
                  <th className="border border-slate-300 px-2 py-1">조치</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 text-center font-bold text-red-600">H (High)</td>
                  <td className="border border-slate-300 px-2 py-1">높은 우선순위</td>
                  <td className="border border-slate-300 px-2 py-1">즉시 개선 필요 — 예방/검출 관리 강화 필수</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 text-center font-bold text-orange-600">M (Medium)</td>
                  <td className="border border-slate-300 px-2 py-1">중간 우선순위</td>
                  <td className="border border-slate-300 px-2 py-1">개선 권고 — 리스크 저감 계획 수립</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 text-center font-bold text-green-600">L (Low)</td>
                  <td className="border border-slate-300 px-2 py-1">낮은 우선순위</td>
                  <td className="border border-slate-300 px-2 py-1">현행 유지 — 모니터링 지속</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="font-bold text-[12px] text-[#00587a] mb-1">2. 기능 버튼</h3>
            <table className="w-full text-[10px] border-collapse border border-slate-300">
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-bold bg-green-600 text-white w-20 text-center">↑Import</td>
                  <td className="border border-slate-300 px-2 py-1">Excel 파일에서 AP 개선 데이터를 불러옵니다</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-bold bg-orange-500 text-white text-center">↓Export</td>
                  <td className="border border-slate-300 px-2 py-1">현재 테이블 데이터를 Excel 파일로 내보냅니다</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-bold bg-slate-500 text-white text-center">📋양식</td>
                  <td className="border border-slate-300 px-2 py-1">빈 Import 양식(템플릿)을 다운로드합니다</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-bold bg-blue-600 text-white text-center">+Add</td>
                  <td className="border border-slate-300 px-2 py-1">수동으로 새 행을 추가합니다</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-bold bg-[#0d47a1] text-white text-center">⊞Save</td>
                  <td className="border border-slate-300 px-2 py-1">수동 입력/Import한 데이터를 DB에 저장합니다</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 font-bold bg-red-600 text-white text-center">✕Del</td>
                  <td className="border border-slate-300 px-2 py-1">수동 입력 항목을 모두 삭제합니다</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="font-bold text-[12px] text-[#00587a] mb-1">3. 데이터 소스</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><b>워크시트 데이터</b>: FMEA 워크시트의 RiskAnalysis + Optimization 데이터 (읽기 전용)</li>
              <li><b>CIP 데이터</b>: Import 또는 수동 추가 후 Save한 개선 항목 (편집 가능)</li>
              <li>두 소스의 데이터가 통합되어 테이블 및 그래프에 표시됩니다</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-[12px] text-[#00587a] mb-1">4. 대상 분류 (Target)</h3>
            <div className="flex flex-wrap gap-1">
              {[
                { name: 'Field', color: '#8b5cf6', desc: '필드 이슈' },
                { name: 'Yield', color: '#3b82f6', desc: '수율 개선' },
                { name: 'Quality', color: '#ef4444', desc: '품질 개선' },
                { name: 'Cost', color: '#f97316', desc: '원가 절감' },
                { name: 'Delivery', color: '#22c55e', desc: '납기 개선' },
                { name: 'Safety', color: '#ec4899', desc: '안전 개선' },
              ].map(t => (
                <span key={t.name} className="px-2 py-0.5 rounded text-white text-[9px] font-bold" style={{ backgroundColor: t.color }}>
                  {t.name}: {t.desc}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-bold text-[12px] text-[#00587a] mb-1">5. 상태 관리</h3>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 rounded bg-gray-400 text-white text-[9px] font-bold">대기: 미착수</span>
              <span className="px-2 py-0.5 rounded bg-orange-500 text-white text-[9px] font-bold">진행중: 개선 실행 중</span>
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold">완료: 개선 완료</span>
            </div>
          </section>
        </div>

        <div className="mt-4 text-right">
          <button className="px-4 py-1.5 rounded bg-[#00587a] text-white text-[11px] font-bold hover:bg-[#004060]" onClick={onClose}>
            닫기 (Close)
          </button>
        </div>
      </div>
    </div>
  );
}
