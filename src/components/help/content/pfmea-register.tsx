/**
 * @file help/content/pfmea-register.tsx
 * @description PFMEA 등록화면 도움말 콘텐츠 (인쇄용 매뉴얼 겸용)
 * @module help
 * CODEFREEZE
 */

'use client';

import type { HelpSectionDef, HelpManualMeta } from '../types';

// =====================================================
// 메타 정보
// =====================================================
export const PFMEA_REGISTER_META: HelpManualMeta = {
  title: 'PFMEA 등록화면 도움말',
  module: 'PFMEA Register',
  version: 'v3.1',
  lastUpdated: '2026-03-13',
};

// =====================================================
// 섹션 컴포넌트
// =====================================================
function OverviewSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-yellow-800">PFMEA 등록화면은 FMEA 프로젝트의 기본 정보를 등록하고 관리하는 화면입니다.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded p-2 border border-yellow-200">
          <p className="font-bold text-[10px] text-blue-700 mb-1">주요 기능</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>- FMEA 프로젝트 신규 등록 / 수정</li>
            <li>- FMEA 유형(M/F/P) 선택 및 ID 자동 부여</li>
            <li>- 상위 APQP / FMEA 연동</li>
            <li>- CP / PFD / DFMEA 문서 연동</li>
            <li>- CFT(상호기능팀) 구성원 관리</li>
          </ul>
        </div>
        <div className="bg-white rounded p-2 border border-yellow-200">
          <p className="font-bold text-[10px] text-green-700 mb-1">버튼 설명</p>
          <ul className="space-y-0.5 text-[10px]">
            <li><span className="font-bold text-green-600">새로 작성</span> — 새 PFMEA 등록 (ID 자동 생성)</li>
            <li><span className="font-bold text-yellow-600">편집</span> — 기존 PFMEA 불러오기 / 수정모드</li>
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
      <p className="font-bold text-yellow-800">기획 및 준비 (1단계) - 필드별 설명</p>
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-yellow-200">
            <th className="border border-yellow-300 px-2 py-1 text-left w-[20%]">필드명</th>
            <th className="border border-yellow-300 px-2 py-1 text-left">설명</th>
            <th className="border border-yellow-300 px-2 py-1 text-center w-[10%]">필수</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['FMEA 유형', 'M(Master), F(Family), P(Part) 중 선택. 유형에 따라 ID가 자동 변경됩니다.', 'Y'],
            ['FMEA명', '시스템, 서브시스템 및/또는 구성품의 이름을 입력합니다.', 'Y'],
            ['FMEA ID', '자동 생성된 고유 식별자. 유형 변경 시 자동 재생성됩니다.', '-'],
            ['상위 APQP', 'APQP 프로젝트와 연동합니다. 선택 시 APQP 정보가 자동 반영됩니다.', '-'],
            ['공정 책임', '해당 공정의 책임 부서를 입력합니다. 돋보기로 사용자 검색 가능합니다.', '-'],
            ['FMEA 담당자', 'FMEA 작성 담당자의 성명을 입력합니다. 돋보기로 사용자 검색 가능합니다.', 'Y'],
            ['시작 일자', 'FMEA 분석 시작 예정일. 클릭하여 달력에서 선택합니다.', '-'],
            ['상위 FMEA', 'Master/Family FMEA와 연동합니다. Part FMEA 작성 시 필수입니다.', '-'],
            ['고객 명', '납품 대상 고객명. 돋보기로 사업자 정보에서 검색 가능합니다.', '-'],
            ['회사 명', '자사(제조사) 회사명을 입력합니다.', '-'],
            ['모델 연식', '해당 어플리케이션/모델 연식을 입력합니다.', '-'],
            ['품명 / 품번', '완제품명과 품번을 입력합니다.', '-'],
            ['기밀수준', '사업용도 / 독점 / 기밀 중 선택합니다.', '-'],
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
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-bold">Master (MBD)</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold">Family (FBD)</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">Part (PBD)</span>
        </div>
        <table className="w-full text-[10px] border-collapse">
          <tbody>
            {([
              ['M', 'bg-purple-50', 'text-purple-700', 'MBD', '공정 유형별 표준 FMEA (최상위 기준)'],
              ['F', 'bg-blue-50', 'text-blue-700', 'FBD', 'Master를 상속한 제품군 단위 FMEA'],
              ['P', 'bg-green-50', 'text-green-700', 'PBD', 'Family를 상속한 개별 부품 FMEA (양산)'],
            ] as const).map(([type, bg, text, bd, desc]) => (
              <tr key={type} className={bg}>
                <td className={`px-1.5 py-1 font-bold ${text} w-6 border border-gray-200`}>{type}</td>
                <td className="px-1.5 py-1 font-mono text-gray-600 w-10 border border-gray-200">{bd}</td>
                <td className="px-1.5 py-1 border border-gray-200">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-blue-50 rounded p-2 border border-blue-200">
        <p className="font-bold text-[10px] text-blue-700 mb-1">FMEA ID와 BD ID의 관계</p>
        <p className="text-[10px] text-gray-700 mb-1">기초정보 템플릿 패널에서 BD ID와 FMEA명이 표시됩니다. FMEA ID와 BD ID는 같은 프로젝트를 가리키지만 형식이 다릅니다:</p>
        <table className="w-full text-[9px] border-collapse bg-white">
          <thead>
            <tr className="bg-blue-100">
              <th className="border border-blue-200 px-1.5 py-0.5 text-left">구분</th>
              <th className="border border-blue-200 px-1.5 py-0.5 text-left">형식</th>
              <th className="border border-blue-200 px-1.5 py-0.5 text-left">예시</th>
              <th className="border border-blue-200 px-1.5 py-0.5 text-left">용도</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-green-50">
              <td className="border border-blue-200 px-1.5 py-0.5 font-bold">FMEA ID</td>
              <td className="border border-blue-200 px-1.5 py-0.5 font-mono">pfm/dfm + 년도 + 타입 + 순번 + 위치</td>
              <td className="border border-blue-200 px-1.5 py-0.5 font-mono text-green-700">pfm26-p001-l02</td>
              <td className="border border-blue-200 px-1.5 py-0.5">시스템 내부 고유 ID (위치 정보 포함)</td>
            </tr>
            <tr className="bg-blue-50">
              <td className="border border-blue-200 px-1.5 py-0.5 font-bold">BD ID</td>
              <td className="border border-blue-200 px-1.5 py-0.5 font-mono">타입(BD) + 년도 + 순번</td>
              <td className="border border-blue-200 px-1.5 py-0.5 font-mono text-blue-700">PBD-26-001</td>
              <td className="border border-blue-200 px-1.5 py-0.5">사용자 표시용 (간략 형식)</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[9px] text-gray-500 mt-1 leading-4">
          • 두 ID의 <strong>번호(년도 + 순번)는 일치</strong>합니다 (예: 26-001 = 26-001) <br/>
          • BD ID는 위치(-l02)를 제외하여 사용자가 보기 편한 형식입니다 <br/>
          • 기초정보 템플릿에 표시되는 FMEA명은 같은 프로젝트의 설명명입니다
        </p>
      </div>
      <div className="bg-white rounded p-2 border border-yellow-200">
        <p className="font-bold text-[10px] text-gray-700 mb-1">기초정보 등록 옵션</p>
        <ul className="space-y-0.5 text-[10px]">
          <li><span className="font-bold text-purple-600">Master FMEA Basic Data 사용</span> — MBD 기초정보 상속</li>
          <li><span className="font-bold text-blue-600">Family FMEA Basic Data 사용</span> — FBD 기초정보 상속</li>
          <li><span className="font-bold text-green-600">Part FMEA Basic Data 사용</span> — PBD 기초정보 상속</li>
          <li><span className="font-bold text-amber-600">신규 입력</span> — 엑셀 Import 또는 빈 워크시트</li>
        </ul>
        <p className="text-[9px] text-gray-400 mt-1">* 상세 예시는 사용자 매뉴얼 7.5절 참조</p>
      </div>
      <div className="bg-white rounded p-2 border border-yellow-200">
        <p className="font-bold text-[10px] text-gray-700 mb-1">업종별 사례 (Sample)</p>
        <p className="text-[10px] text-gray-600 mb-1">기초정보 템플릿에서 업종사례를 선택하면 해당 업종의 예시 데이터가 자동 생성됩니다.</p>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-yellow-100">
              <th className="border border-yellow-200 px-1.5 py-0.5 text-left w-[25%]">사례 번호</th>
              <th className="border border-yellow-200 px-1.5 py-0.5 text-left">업종</th>
              <th className="border border-yellow-200 px-1.5 py-0.5 text-left">주요 공정 (예시)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['sample-001', '자전거 프레임', '파이프 절단 / 프레임 용접 / 도장'],
              ['sample-002', 'Micro Bump (Cu/SnAg)', 'UBM Sputtering / Cu Pillar Plating / SnAg Reflow'],
              ['sample-003', 'Flip Chip (FCBGA)', 'Wafer Bump / Die Attach / Reflow'],
              ['sample-004', '휠베어링 (자동차)', '내외륜 가공 / 열처리 / 조립'],
            ].map(([id, industry, process], i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-yellow-50'}>
                <td className="border border-yellow-200 px-1.5 py-0.5 font-mono font-bold text-blue-600">{id}</td>
                <td className="border border-yellow-200 px-1.5 py-0.5 font-semibold">{industry}</td>
                <td className="border border-yellow-200 px-1.5 py-0.5 text-gray-600">{process}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[9px] text-gray-400 mt-1">* 모든 사례 데이터에는 (예시) 표시가 포함되어 있으며, 실제 데이터로 교체하여 사용합니다</p>
      </div>
    </div>
  );
}

function LinkageSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-yellow-800">문서 연동 관리 (Triplet 아키텍처)</p>
      <p className="text-[10px] text-gray-600">PFMEA, CP, PFD는 <strong>Triplet(3중 세트)</strong>로 자동 생성됩니다. 어느 화면에서든 동일한 Triplet API를 사용합니다.</p>

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
        <p className="text-[9px] text-indigo-600 mt-1">* PFMEA/CP/PFD 어느 등록화면에서 생성해도 동일한 Triplet 세트가 만들어집니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded p-2 border border-yellow-200">
          <p className="font-bold text-[10px] text-yellow-700 mb-1">상위 APQP 연동</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>- APQP 프로젝트를 선택하면 고객정보 자동 반영</li>
            <li>- APQP 등록화면으로 바로 이동 가능 (배지 클릭)</li>
          </ul>
        </div>
        <div className="bg-white rounded p-2 border border-yellow-200">
          <p className="font-bold text-[10px] text-orange-700 mb-1">상위 FMEA 연동</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>- Master/Family FMEA를 상위 문서로 지정</li>
            <li>- 기초정보를 상속받아 워크시트 자동 생성</li>
          </ul>
        </div>
        <div className="bg-white rounded p-2 border border-yellow-200">
          <p className="font-bold text-[10px] text-teal-700 mb-1">연동 CP (관리계획서)</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>- Triplet으로 자동 생성된 CP 표시</li>
            <li>- 배지 클릭시 CP 등록화면으로 이동</li>
            <li>- 연동 관리 모달에서 추가/삭제 가능</li>
          </ul>
        </div>
        <div className="bg-white rounded p-2 border border-yellow-200">
          <p className="font-bold text-[10px] text-violet-700 mb-1">연동 PFD (공정흐름도)</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>- Triplet으로 자동 생성된 PFD 표시</li>
            <li>- 배지 클릭시 PFD 등록화면으로 이동</li>
            <li>- 연동 관리 모달에서 추가/삭제 가능</li>
          </ul>
        </div>
      </div>
      <div className="bg-cyan-50 rounded p-2 border border-cyan-200">
        <p className="font-bold text-[10px] text-cyan-700 mb-1">연동 DFMEA</p>
        <p className="text-[10px]">DFMEA가 연동된 경우 표시됩니다. 배지 클릭 시 DFMEA 등록화면으로 이동합니다.</p>
      </div>
    </div>
  );
}

function CFTHelpSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-yellow-800">CFT (상호기능팀) 구성</p>
      <div className="bg-white rounded p-2 border border-yellow-200">
        <p className="font-bold text-[10px] text-blue-700 mb-1">역할별 책임 (필수 5역할 + CFT 팀원)</p>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-yellow-100">
              <th className="border border-yellow-200 px-1 py-0.5 text-center w-[6%]">No</th>
              <th className="border border-yellow-200 px-1 py-0.5 text-left w-[22%]">역할</th>
              <th className="border border-yellow-200 px-1 py-0.5 text-left">책임 및 역할</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['1', 'Champion', '최종 승인 및 자원 배정, 경영층 보고'],
              ['2', 'Technical Leader', '기술 판단 주도, 분석 방향 및 타당성 검증'],
              ['3', 'Leader', '프로젝트 총괄 운영, CFT 구성 및 산출물 관리'],
              ['4', 'PM', '일정/이슈 관리, CFT 간 업무 조율 및 진행 추적'],
              ['5', 'Moderator', '워크시트 회의 진행, S/O/D 평가 합의 주도'],
              ['6', 'CFT 팀원', '부서 전문 지식 제공, 고장 모드 식별 및 조치 실행'],
            ].map(([no, role, desc], i) => (
              <tr key={i} className={i < 5 ? (i % 2 === 0 ? 'bg-blue-50' : 'bg-white') : 'bg-gray-50'}>
                <td className="border border-yellow-200 px-1 py-0.5 text-center font-bold text-gray-500">{no}</td>
                <td className="border border-yellow-200 px-1 py-0.5 font-bold">{role}</td>
                <td className="border border-yellow-200 px-1 py-0.5">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-[9px] text-red-500 font-semibold">* 1~5번 필수 역할은 삭제 불가 — 미입력 시 저장 경고 표시</p>
      </div>
      <div className="bg-white rounded p-2 border border-yellow-200">
        <p className="font-bold text-[10px] text-green-700 mb-1">CFT 관리 방법</p>
        <ul className="space-y-0.5 text-[10px]">
          <li><span className="font-bold">이름 검색</span> — 성명 셀 클릭 후 사용자 검색 모달에서 선택</li>
          <li><span className="font-bold">비고 자동 매핑</span> — 사용자 정보의 비고가 담당업무에 자동 반영</li>
          <li><span className="font-bold">역할 드롭다운</span> — CFT역할 셀 클릭 후 역할 선택 (필수 역할 중복 불가)</li>
          <li><span className="font-bold">행 추가/삭제</span> — CFT 팀원만 추가/삭제 가능, 필수 역할은 삭제 불가</li>
          <li><span className="font-bold">초기화</span> — 초기화 버튼으로 5개 필수 역할 + 빈 양식 복원</li>
        </ul>
      </div>
      <div className="bg-white rounded p-2 border border-yellow-200">
        <p className="font-bold text-[10px] text-gray-700 mb-1">CFT 접속 로그</p>
        <p className="text-[10px]">CFT 멤버의 접속 이력이 자동 기록됩니다. 추가/수정/삭제/조회/승인/생성 액션이 기록됩니다.</p>
      </div>
    </div>
  );
}

function WorkflowSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-yellow-800">PFMEA 등록 작업 흐름</p>
      <div className="bg-white rounded p-2 border border-yellow-200">
        <div className="space-y-2 text-[10px]">
          {[
            { step: '1', title: '신규 등록 (Triplet)', desc: '새로 작성 클릭 → M/F/P 유형 선택 → FMEA+CP+PFD Triplet 세트 자동 생성', color: 'bg-green-100 text-green-700' },
            { step: '2', title: '기본정보 입력', desc: 'FMEA명, 담당자, 고객명, 회사명, 품명/품번, 일자 등 입력', color: 'bg-blue-100 text-blue-700' },
            { step: '3', title: '연동 확인', desc: 'Triplet으로 자동 생성된 CP/PFD 확인, 상위 APQP/FMEA 연동 (선택사항)', color: 'bg-purple-100 text-purple-700' },
            { step: '4', title: 'CFT 구성', desc: 'CFT 멤버 등록 — 역할 지정 및 사용자 검색', color: 'bg-orange-100 text-orange-700' },
            { step: '5', title: '저장', desc: '저장 클릭 → DB에 프로젝트 정보 저장', color: 'bg-indigo-100 text-indigo-700' },
            { step: '6', title: '기초정보 등록', desc: 'Master/Family/Part 데이터 선택 또는 신규 입력 → 워크시트로 이동', color: 'bg-amber-100 text-amber-700' },
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
          <li>- FMEA 유형 변경 시 ID가 재생성되므로 주의하세요</li>
          <li>- 시작일자는 목표완료일보다 이전이어야 합니다</li>
        </ul>
      </div>
    </div>
  );
}

// =====================================================
// 섹션 정의 (export)
// =====================================================
export const PFMEA_REGISTER_SECTIONS: HelpSectionDef[] = [
  { key: 'overview', label: '개요', component: OverviewSection },
  { key: 'fields', label: '필드 설명', component: FieldsSection },
  { key: 'mfp', label: 'M/F/P 구조', component: MFPSection },
  { key: 'linkage', label: '연동 관리', component: LinkageSection },
  { key: 'cft', label: 'CFT 구성', component: CFTHelpSection },
  { key: 'workflow', label: '작업 흐름', component: WorkflowSection },
];
