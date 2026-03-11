/**
 * @file page.tsx
 * @description DFMEA 등록 페이지 - 설계 FMEA
 * @version 1.0.0
 * @created 2025-12-27
 */

'use client';

import { useState, useEffect } from 'react';
import { BizInfoSelectModal } from '@/components/modals/BizInfoSelectModal';
import { UserSelectModal } from '@/components/modals/UserSelectModal';
import { CFTAccessLogTable } from '@/components/tables/CFTAccessLogTable';
import { CFTRegistrationTable, CFTMember, createInitialCFTMembers } from '@/components/tables/CFTRegistrationTable';
import { BizInfoProject } from '@/types/bizinfo';
import { UserInfo } from '@/types/user';
import { CFTAccessLog } from '@/types/project-cft';
import DFMEATopNav from '@/components/layout/DFMEATopNav';

// =====================================================
// 타입 정의
// =====================================================
interface FMEAInfo {
  companyName: string;
  engineeringLocation: string;
  customerName: string;
  modelYear: string;
  subject: string;
  fmeaStartDate: string;
  fmeaRevisionDate: string;
  fmeaProjectName: string;
  fmeaId: string;
  designResponsibility: string;
  confidentialityLevel: string;
  fmeaResponsibleName: string;
}

// =====================================================
// 초기 데이터
// =====================================================
const INITIAL_FMEA: FMEAInfo = {
  companyName: '',
  engineeringLocation: '',
  customerName: '',
  modelYear: '',
  subject: '',
  fmeaStartDate: '',
  fmeaRevisionDate: '',
  fmeaProjectName: '',
  fmeaId: '',
  designResponsibility: '',
  confidentialityLevel: '',
  fmeaResponsibleName: '',
};

function generateFMEAId(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  
  // ✅ 기존 프로젝트에서 최대 ID 찾아서 순차 증가
  try {
    const stored = localStorage.getItem('dfmea-projects');
    if (stored) {
      const projects = JSON.parse(stored);
      const currentYearIds = projects
        .filter((p: { id: string }) => p.id?.startsWith(`DFM${year}-`))
        .map((p: { id: string }) => parseInt(p.id.split('-')[1]) || 0);
      
      if (currentYearIds.length > 0) {
        const maxSeq = Math.max(...currentYearIds);
        return `DFM${year}-${(maxSeq + 1).toString().padStart(3, '0')}`;
      }
    }
  } catch (e) {
    console.error('ID 생성 중 오류:', e);
  }
  
  return `DFM${year}-001`;
}

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function DFMEARegisterPage() {
  const [fmeaInfo, setFmeaInfo] = useState<FMEAInfo>(INITIAL_FMEA);
  const [cftMembers, setCftMembers] = useState<CFTMember[]>(createInitialCFTMembers());
  const [fmeaId, setFmeaId] = useState('');
  
  // 모달 상태
  const [bizInfoModalOpen, setBizInfoModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);
  const [userModalTarget, setUserModalTarget] = useState<'responsible' | 'cft'>('cft');
  
  // 저장 상태
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [cftSaveStatus, setCftSaveStatus] = useState<'idle' | 'saved'>('idle');

  // 초기화: 마지막 저장된 프로젝트 불러오기
  useEffect(() => {
    const storedProjects = localStorage.getItem('dfmea-projects');
    if (storedProjects) {
      try {
        const projects = JSON.parse(storedProjects);
        // ✅ 가장 최근 저장된 프로젝트 (첫 번째 = 가장 최신)
        if (projects.length > 0) {
          const lastProject = projects[0];
          setFmeaId(lastProject.id);
          if (lastProject.fmeaInfo) {
            setFmeaInfo(lastProject.fmeaInfo);
          }
          if (lastProject.cftMembers && lastProject.cftMembers.length > 0) {
            setCftMembers(lastProject.cftMembers);
          }
          console.log('[DFMEA 등록] 마지막 저장된 프로젝트 로드:', lastProject.id);
        } else {
          setFmeaId(generateFMEAId());
        }
      } catch (e) {
        console.error('프로젝트 데이터 로드 실패:', e);
        setFmeaId(generateFMEAId());
      }
    } else {
      setFmeaId(generateFMEAId());
      
      // 저장된 CFT 데이터 불러오기
      const savedCft = localStorage.getItem('dfmea-cft-data');
      if (savedCft) {
        try {
          const parsed = JSON.parse(savedCft);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCftMembers(parsed);
          }
        } catch (e) {
          console.error('CFT 데이터 로드 실패:', e);
        }
      }
    }
  }, []);

  // ✅ 새로 등록 - 초기화 후 새 ID 생성
  const handleNewRegister = () => {
    if (confirm('새로운 FMEA를 등록하시겠습니까?\n현재 화면의 내용은 초기화됩니다.')) {
      setFmeaInfo(INITIAL_FMEA);
      setCftMembers(createInitialCFTMembers());
      setFmeaId(generateFMEAId());
      localStorage.removeItem('dfmea-register-draft');
    }
  };

  // 필드 업데이트
  const updateField = (field: keyof FMEAInfo, value: string) => {
    setFmeaInfo(prev => ({ ...prev, [field]: value }));
  };

  // 기초정보 선택
  const handleBizInfoSelect = (info: BizInfoProject) => {
    setFmeaInfo(prev => ({
      ...prev,
      companyName: info.customerName || '',
      customerName: info.customerName || '',
      modelYear: info.modelYear || '',
      fmeaProjectName: info.program || '',
      // ✅ FMEA명(subject)은 기존 값이 있으면 유지, 없으면 기초정보에서 가져옴
      subject: prev.subject?.trim() ? prev.subject : (info.productName || ''),
    }));
    setBizInfoModalOpen(false);
  };

  // 사용자 선택
  const handleUserSelect = (user: UserInfo) => {
    if (userModalTarget === 'responsible') {
      setFmeaInfo(prev => ({
        ...prev,
        fmeaResponsibleName: user.name || '',
        designResponsibility: user.department || '',
      }));
    } else if (selectedMemberIndex !== null) {
      const updated = [...cftMembers];
      updated[selectedMemberIndex] = {
        ...updated[selectedMemberIndex],
        name: user.name || '',
        department: user.department || '',
        position: user.position || '',
        phone: user.phone || '',
        email: user.email || '',
      };
      setCftMembers(updated);
    }
    setUserModalOpen(false);
    setSelectedMemberIndex(null);
  };

  // CFT 사용자 검색
  const handleCftUserSearch = (index: number) => {
    setSelectedMemberIndex(index);
    setUserModalTarget('cft');
    setUserModalOpen(true);
  };

  // CFT 저장
  const handleCftSave = () => {
    localStorage.setItem('dfmea-cft-data', JSON.stringify(cftMembers));
    setCftSaveStatus('saved');
    setTimeout(() => setCftSaveStatus('idle'), 3000);
  };

  // CFT 초기화
  const handleCftReset = () => {
    if (confirm('CFT 목록을 초기화하시겠습니까?')) {
      localStorage.removeItem('dfmea-cft-data');
      setCftMembers(createInitialCFTMembers());
    }
  };

  // 저장
  const handleSave = () => {
    if (!fmeaInfo.subject.trim()) {
      alert('FMEA명을 입력해주세요.');
      return;
    }

    const data = { 
      id: fmeaId, 
      project: {
        projectName: fmeaInfo.subject,
        customer: fmeaInfo.customerName,
        productName: fmeaInfo.subject,
        partNo: '',
        department: fmeaInfo.designResponsibility,
        leader: fmeaInfo.fmeaResponsibleName,
        startDate: fmeaInfo.fmeaStartDate,
        endDate: '',
      },
      fmeaInfo,
      cftMembers, 
      createdAt: new Date().toISOString(),
      status: 'draft'
    };
    
    const existing = JSON.parse(localStorage.getItem('dfmea-projects') || '[]');
    existing.unshift(data);
    localStorage.setItem('dfmea-projects', JSON.stringify(existing));
    
    setSaveStatus('saved');
    setTimeout(() => {
      setSaveStatus('idle');
      window.location.href = '/dfmea/list';
    }, 1500);
  };

  // 새로고침 (새로 등록과 동일)
  const handleRefresh = handleNewRegister;

  // CFT 접속 로그
  const [accessLogs] = useState<CFTAccessLog[]>([
    { id: 1, projectId: fmeaId, userName: '김철수', loginTime: '2025-12-26 09:00', logoutTime: '2025-12-26 12:30', action: '수정', itemType: 'DFMEA', cellAddress: 'A1:B5', description: 'DFMEA 프로젝트 정보 수정' },
    { id: 2, projectId: fmeaId, userName: '이영희', loginTime: '2025-12-26 10:15', logoutTime: '2025-12-26 11:45', action: '추가', itemType: 'CFT', cellAddress: 'C3', description: 'CFT 팀원 추가' },
    { id: 3, projectId: fmeaId, userName: '박지민', loginTime: '2025-12-26 14:00', logoutTime: null, action: '수정', itemType: 'DFMEA', cellAddress: 'D10:F15', description: '고장형태 분석 업데이트' },
  ]);

  // 테이블 셀 스타일
  const headerCell = "bg-[#00587a] text-white px-2 py-1.5 border border-white font-semibold text-xs text-center align-middle";
  const inputCell = "border border-gray-300 px-1 py-0.5";

  // CFT 멤버 이름 목록 (상호기능팀용)
  const cftNames = cftMembers.filter(m => m.name).map(m => m.name).join(', ');

  return (
    <>
      <DFMEATopNav selectedFmeaId={fmeaId} />
      <div className="min-h-screen bg-[#f0f0f0] p-3 font-[Malgun_Gothic] pt-11">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h1 className="text-sm font-bold text-gray-800">D-FMEA 등록</h1>
          <span className="text-xs text-gray-500 ml-2">ID: {fmeaId}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleNewRegister} className="px-3 py-1.5 bg-green-100 border border-green-400 text-green-700 text-xs rounded hover:bg-green-200 font-semibold">
            ➕ 새로 등록
          </button>
          <button 
            onClick={handleSave}
            className={`px-4 py-1.5 text-xs font-bold rounded ${saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-[#1976d2] text-white hover:bg-[#1565c0]'}`}
          >
            {saveStatus === 'saved' ? '✓ 저장됨' : '💾 저장'}
          </button>
        </div>
      </div>

      {/* ===== 기획 및 준비 (1단계) ===== */}
      <div className="bg-white rounded border border-gray-300 mb-3">
        <div className="bg-[#e3f2fd] px-3 py-1.5 border-b border-gray-300">
          <h2 className="text-xs font-bold text-gray-700">기획 및 준비 (1단계)</h2>
        </div>
        
        <table className="w-full border-collapse text-xs">
          <tbody>
            {/* 1행 - 파란색 */}
            <tr className="bg-[#e3f2fd] h-8">
              <td className={headerCell} >회사 명</td>
              <td className={`${inputCell}`} >
                <input type="text" value={fmeaInfo.companyName} onChange={(e) => updateField('companyName', e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400" placeholder="설계 FMEA에 책임이 있는 회사 명" />
              </td>
              <td className={headerCell} >FMEA명</td>
              <td className={`${inputCell}`} >
                <div className="flex items-center gap-1">
                  <input type="text" value={fmeaInfo.subject} onChange={(e) => updateField('subject', e.target.value)}
                    className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400" placeholder="시스템, 서브시스템 및/또는 구성품" />
                  <button onClick={() => setBizInfoModalOpen(true)} className="text-blue-500 hover:text-blue-700">🔍</button>
                </div>
              </td>
              <td className={headerCell} >FMEA ID 번호</td>
              <td className={`${inputCell}`} >
                <span className="px-2 text-xs text-gray-600">{fmeaId}</span>
              </td>
              <td className={headerCell} >회사에 의해 결정됨</td>
            </tr>
            
            {/* 2행 - 흰색 */}
            <tr className="bg-white h-8">
              <td className={headerCell}>엔지니어링 위치</td>
              <td className={`${inputCell}`}>
                <input type="text" value={fmeaInfo.engineeringLocation} onChange={(e) => updateField('engineeringLocation', e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400" placeholder="지리적 위치" />
              </td>
              <td className={headerCell}>시작 일자</td>
              <td className={`${inputCell}`}>
                <input type="date" value={fmeaInfo.fmeaStartDate} onChange={(e) => updateField('fmeaStartDate', e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" />
              </td>
              <td className={headerCell}>설계 책임</td>
              <td className={`${inputCell}`}>
                <input type="text" value={fmeaInfo.designResponsibility} onChange={(e) => updateField('designResponsibility', e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400" placeholder="부서" />
              </td>
              <td className={`${inputCell}`}>
                <div className="flex items-center gap-1">
                  <input type="text" value={fmeaInfo.fmeaResponsibleName} onChange={(e) => updateField('fmeaResponsibleName', e.target.value)}
                    className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400" placeholder="FMEA 책임자 성명" />
                  <button onClick={() => { setUserModalTarget('responsible'); setUserModalOpen(true); }} className="text-blue-500 hover:text-blue-700">🔍</button>
                </div>
              </td>
            </tr>
            
            {/* 3행 - 파란색 */}
            <tr className="bg-[#e3f2fd] h-8">
              <td className={headerCell}>고객 명</td>
              <td className={`${inputCell}`}>
                <input type="text" value={fmeaInfo.customerName} onChange={(e) => updateField('customerName', e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400" placeholder="고객(들) 또는 제품 패밀리 명" />
              </td>
              <td className={headerCell}>개정 일자</td>
              <td className={`${inputCell}`}>
                <input type="date" value={fmeaInfo.fmeaRevisionDate} onChange={(e) => updateField('fmeaRevisionDate', e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" />
              </td>
              <td className={headerCell}>기밀유지 수준</td>
              <td className={`${inputCell}`} colSpan={2}>
                <select value={fmeaInfo.confidentialityLevel} onChange={(e) => updateField('confidentialityLevel', e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none text-gray-600">
                  <option value="">선택</option>
                  <option value="사업용도">사업용도</option>
                  <option value="독점">독점</option>
                  <option value="기밀">기밀</option>
                </select>
              </td>
            </tr>
            
            {/* 4행 - 흰색 */}
            <tr className="bg-white h-8">
              <td className={headerCell}>모델 연식 / 플랫폼</td>
              <td className={`${inputCell}`}>
                <input type="text" value={fmeaInfo.modelYear} onChange={(e) => updateField('modelYear', e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400" placeholder="고객 어플리케이션 또는 회사 모델/스타일" />
              </td>
              <td className={headerCell}>상호기능팀</td>
              <td className={`${inputCell}`} colSpan={4}>
                <span className="text-xs text-gray-500 px-2">
                  {cftNames || '팀 명단이 요구됨'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== CFT 등록 (표준 컴포넌트) ===== */}
      <div className="mt-6">
        <CFTRegistrationTable
          title="CFT 등록"
          members={cftMembers}
          onMembersChange={setCftMembers}
          onUserSearch={handleCftUserSearch}
          onSave={handleCftSave}
          onReset={handleCftReset}
          saveStatus={cftSaveStatus}
          minRows={10}
        />
      </div>

      {/* ===== CFT 접속 로그 섹션 ===== */}
      <div className="flex items-center gap-2 mt-6 mb-2">
        <span>📊</span>
        <h2 className="text-sm font-bold text-gray-700">CFT 접속 로그</h2>
      </div>
      <CFTAccessLogTable accessLogs={accessLogs} maxRows={5} />

      {/* 하단 상태바 */}
      <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
        <span>총 {cftMembers.filter(m => m.name).length}명의 CFT 멤버 | 접속 로그 {accessLogs.length}건</span>
        <span>버전: D-FMEA Suite v3.0 | 사용자: FMEA Lead</span>
      </div>

      {/* 모달 */}
      <BizInfoSelectModal
        isOpen={bizInfoModalOpen}
        onClose={() => setBizInfoModalOpen(false)}
        onSelect={handleBizInfoSelect}
      />

      <UserSelectModal
        isOpen={userModalOpen}
        onClose={() => { setUserModalOpen(false); setSelectedMemberIndex(null); }}
        onSelect={handleUserSelect}
      />
      </div>
    </>
  );
}



