/**
 * @file help/content/cp-register.tsx
 * @description CP(Control Plan) 등록화면 도움말 콘텐츠
 * @module help
 */

'use client';

import type { HelpSectionDef, HelpManualMeta } from '../types';

export const CP_REGISTER_META: HelpManualMeta = {
  title: 'CP 등록화면 도움말',
  module: 'Control Plan Register',
  version: 'v1.0',
  lastUpdated: '2026-03-13',
};

function OverviewSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-yellow-800">CP(Control Plan) 등록화면은 관리계획서의 기본 정보를 등록하고 관리하는 화면입니다.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded p-2 border border-yellow-200">
          <p className="font-bold text-[10px] text-blue-700 mb-1">주요 기능</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>- CP 프로젝트 신규 등록 / 수정</li>
            <li>- CP 유형(M/F/P) 선택 및 ID 자동 부여</li>
            <li>- PFMEA / PFD / APQP 문서 연동</li>
            <li>- CFT(상호기능팀) 구성원 관리</li>
            <li>- Triplet 세트(FMEA+CP+PFD) 자동 생성</li>
          </ul>
        </div>
        <div className="bg-white rounded p-2 border border-yellow-200">
          <p className="font-bold text-[10px] text-green-700 mb-1">버튼 설명</p>
          <ul className="space-y-0.5 text-[10px]">
            <li><span className="font-bold text-green-600">새로 작성</span> — 새 CP 등록 (Triplet 세트 자동 생성)</li>
            <li><span className="font-bold text-yellow-600">편집</span> — 기존 CP 불러오기 / 수정모드</li>
            <li><span className="font-bold text-blue-600">저장</span> — 현재 정보를 DB에 저장</li>
            <li><span className="font-bold text-gray-600">도움말</span> — 화면 사용법 안내 (이 패널)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function FieldsSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-yellow-800">CP 등록 필드 설명</p>
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-yellow-200">
            <th className="border border-yellow-300 px-2 py-1 text-left w-[22%]">필드명</th>
            <th className="border border-yellow-300 px-2 py-1 text-left">설명</th>
            <th className="border border-yellow-300 px-2 py-1 text-center w-[10%]">필수</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['CP 유형', 'M(Master), F(Family), P(Part) 중 선택. Triplet 유형과 동일합니다.', 'Y'],
            ['CP명(Subject)', '관리계획서 명칭. Triplet 생성 시 자동 입력됩니다.', 'Y'],
            ['CP ID', '자동 생성된 고유 식별자 (예: cp26-m001).', '-'],
            ['연동 PFMEA', 'Triplet으로 연결된 PFMEA. 배지 클릭 시 이동합니다.', '-'],
            ['연동 PFD', 'Triplet으로 연결된 PFD. 연동 모달에서 관리합니다.', '-'],
            ['고객 명', '납품 대상 고객명을 입력합니다.', '-'],
            ['회사 명', '자사(제조사) 회사명을 입력합니다.', '-'],
            ['시작 일자', 'CP 작성 시작 예정일.', '-'],
            ['품명 / 품번', '대상 제품명과 품번을 입력합니다.', '-'],
          ].map(([name, desc, req], i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-yellow-50'}>
              <td className="border border-yellow-200 px-2 py-1 font-semibold">{name}</td>
              <td className="border border-yellow-200 px-2 py-1">{desc}</td>
              <td className="border border-yellow-200 px-2 py-1 text-center font-bold">{req === 'Y' ? <span className="text-red-500">Y</span> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MFPSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-yellow-800">M / F / P 계층 구조</p>
      <div className="bg-white rounded p-2 border border-yellow-200">
        <div className="flex items-center gap-2 text-[10px] mb-2">
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-bold">Master CP</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold">Family CP</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">Part CP</span>
        </div>
        <table className="w-full text-[10px] border-collapse">
          <tbody>
            {([
              ['M', 'bg-purple-50', 'text-purple-700', '표준 관리계획서 (최상위 기준, FMEA Master와 연동)'],
              ['F', 'bg-blue-50', 'text-blue-700', '제품군 단위 관리계획서 (FMEA Family와 연동)'],
              ['P', 'bg-green-50', 'text-green-700', '개별 부품 관리계획서 (FMEA Part와 연동, 양산용)'],
            ] as const).map(([type, bg, text, desc]) => (
              <tr key={type} className={bg}>
                <td className={`px-1.5 py-1 font-bold ${text} w-6 border border-gray-200`}>{type}</td>
                <td className="px-1.5 py-1 border border-gray-200">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-blue-50 rounded p-2 border border-blue-200">
        <p className="font-bold text-[10px] text-blue-700 mb-1">CP ID 형식</p>
        <table className="w-full text-[9px] border-collapse bg-white">
          <thead>
            <tr className="bg-blue-100">
              <th className="border border-blue-200 px-1.5 py-0.5 text-left">유형</th>
              <th className="border border-blue-200 px-1.5 py-0.5 text-left">ID 형식</th>
              <th className="border border-blue-200 px-1.5 py-0.5 text-left">예시</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-purple-50">
              <td className="border border-blue-200 px-1.5 py-0.5 font-bold">Master</td>
              <td className="border border-blue-200 px-1.5 py-0.5 font-mono">cp{'{yy}'}-m{'{NNN}'}</td>
              <td className="border border-blue-200 px-1.5 py-0.5 font-mono text-purple-700">cp26-m001</td>
            </tr>
            <tr className="bg-blue-50">
              <td className="border border-blue-200 px-1.5 py-0.5 font-bold">Family</td>
              <td className="border border-blue-200 px-1.5 py-0.5 font-mono">cp{'{yy}'}-f{'{NNN}'}</td>
              <td className="border border-blue-200 px-1.5 py-0.5 font-mono text-blue-700">cp26-f001</td>
            </tr>
            <tr className="bg-green-50">
              <td className="border border-blue-200 px-1.5 py-0.5 font-bold">Part</td>
              <td className="border border-blue-200 px-1.5 py-0.5 font-mono">cp{'{yy}'}-p{'{NNN}'}-i{'{GG}'}</td>
              <td className="border border-blue-200 px-1.5 py-0.5 font-mono text-green-700">cp26-p001-i01</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinkageSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-yellow-800">문서 연동 관리 (Triplet 아키텍처)</p>
      <p className="text-[10px] text-gray-600">CP는 PFMEA, PFD와 <strong>Triplet(3중 세트)</strong>로 자동 연동됩니다.</p>

      <div className="bg-indigo-50 rounded p-2 border border-indigo-200">
        <p className="font-bold text-[10px] text-indigo-700 mb-1">Triplet 자동 생성 규칙</p>
        <table className="w-full text-[9px] border-collapse bg-white">
          <thead>
            <tr className="bg-indigo-100">
              <th className="border border-indigo-200 px-1.5 py-0.5 text-left w-[18%]">생성 시점</th>
              <th className="border border-indigo-200 px-1.5 py-0.5 text-left">자동 생성 문서</th>
              <th className="border border-indigo-200 px-1.5 py-0.5 text-left w-[30%]">하위 세트</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-purple-50">
              <td className="border border-indigo-200 px-1.5 py-0.5 font-bold text-purple-700">Master 생성</td>
              <td className="border border-indigo-200 px-1.5 py-0.5">M-FMEA + M-CP + M-PFD</td>
              <td className="border border-indigo-200 px-1.5 py-0.5">0~1개 Family 세트 선택</td>
            </tr>
            <tr className="bg-blue-50">
              <td className="border border-indigo-200 px-1.5 py-0.5 font-bold text-blue-700">Family 생성</td>
              <td className="border border-indigo-200 px-1.5 py-0.5">F-FMEA + F-CP + F-PFD</td>
              <td className="border border-indigo-200 px-1.5 py-0.5">0~5개 Part 세트 선택</td>
            </tr>
            <tr className="bg-green-50">
              <td className="border border-indigo-200 px-1.5 py-0.5 font-bold text-green-700">Part 생성</td>
              <td className="border border-indigo-200 px-1.5 py-0.5">P-FMEA + P-CP + P-PFD</td>
              <td className="border border-indigo-200 px-1.5 py-0.5">-</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[9px] text-indigo-600 mt-1">* CP 화면에서 &quot;새로 작성&quot; → FMEA+PFD도 함께 생성됩니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded p-2 border border-yellow-200">
          <p className="font-bold text-[10px] text-orange-700 mb-1">연동 PFMEA</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>- Triplet으로 자동 연결된 PFMEA 표시</li>
            <li>- 배지 클릭 시 PFMEA 등록화면으로 이동</li>
          </ul>
        </div>
        <div className="bg-white rounded p-2 border border-yellow-200">
          <p className="font-bold text-[10px] text-violet-700 mb-1">연동 PFD</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>- Triplet으로 자동 연결된 PFD 표시</li>
            <li>- 배지 클릭 시 PFD 등록화면으로 이동</li>
            <li>- 연동 관리 모달에서 추가/삭제 가능</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function WorkflowSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-yellow-800">CP 등록 작업 흐름</p>
      <div className="bg-white rounded p-2 border border-yellow-200">
        <div className="space-y-2 text-[10px]">
          {[
            { step: '1', title: '신규 등록 (Triplet)', desc: '새로 작성 클릭 → M/F/P 유형 선택 → FMEA+CP+PFD 세트 자동 생성 → CP 등록화면 이동', color: 'bg-green-100 text-green-700' },
            { step: '2', title: '기본정보 입력', desc: 'CP명, 담당자, 고객명, 회사명, 품명/품번, 일자 등 입력', color: 'bg-blue-100 text-blue-700' },
            { step: '3', title: '연동 확인', desc: 'Triplet으로 자동 생성된 PFMEA/PFD 확인', color: 'bg-purple-100 text-purple-700' },
            { step: '4', title: 'CFT 구성', desc: 'CFT 멤버 등록 — 역할 지정 및 사용자 검색', color: 'bg-orange-100 text-orange-700' },
            { step: '5', title: '저장', desc: '저장 클릭 → DB에 CP 정보 저장', color: 'bg-indigo-100 text-indigo-700' },
            { step: '6', title: '기초정보 등록', desc: 'Master/Family/Part CP Data 선택 또는 신규 입력 → 워크시트로 이동', color: 'bg-amber-100 text-amber-700' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-2">
              <span className={`${item.color} rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold shrink-0`}>{item.step}</span>
              <div>
                <span className="font-bold">{item.title}</span>
                <span className="text-gray-500 ml-1">— {item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-red-50 rounded p-2 border border-red-200">
        <p className="font-bold text-[10px] text-red-700 mb-1">주의사항</p>
        <ul className="space-y-0.5 text-[10px] text-red-600">
          <li>- 기초정보 등록 전 반드시 저장을 먼저 수행해주세요</li>
          <li>- CP 유형 변경 시 ID가 재생성되므로 주의하세요</li>
          <li>- Triplet 생성 시 PFMEA/PFD가 함께 자동 생성됩니다</li>
        </ul>
      </div>
    </div>
  );
}

export const CP_REGISTER_SECTIONS: HelpSectionDef[] = [
  { key: 'overview', label: '개요', component: OverviewSection },
  { key: 'fields', label: '필드 설명', component: FieldsSection },
  { key: 'mfp', label: 'M/F/P 구조', component: MFPSection },
  { key: 'linkage', label: '연동 관리', component: LinkageSection },
  { key: 'workflow', label: '작업 흐름', component: WorkflowSection },
];
