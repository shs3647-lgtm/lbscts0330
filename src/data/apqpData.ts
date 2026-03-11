
export const generateAPQPData = () => {
  // 로컬 스토리지에서 CFT 정보 가져오기
  // 🔥 CFT 실제 멤버 이름으로 가상 배치
  const cftMembers: Record<string, string> = {
    '설계팀': '김철수',
    '개발팀': '박영희',
    '품질팀': '이민수',
    '생산팀': '최지영',
    'PM팀': '정대표',
    '구매팀': '한구매',
    '영업팀': '오영업',
  };
  
  if (typeof window !== 'undefined') {
    const storedCFT = localStorage.getItem('CFT_sample-project-001');
    if (storedCFT) {
      try {
        const cftData = JSON.parse(storedCFT);
        if (Array.isArray(cftData)) {
          cftData.forEach((member: any) => {
            if (member.role && member.name) {
              // CFT 역할에 따라 팀명 매핑
              if (member.role === 'DESIGN') cftMembers['설계팀'] = member.name;
              if (member.role === 'DEVELOPMENT') cftMembers['개발팀'] = member.name;
              if (member.role === 'QUALITY') cftMembers['품질팀'] = member.name;
              if (member.role === 'PRODUCTION') cftMembers['생산팀'] = member.name;
              if (member.role === 'PM' || member.role === 'LEADER') cftMembers['PM팀'] = member.name;
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse CFT data', e);
      }
    }
  }

  // 🔥 20개월 일정 (2023-01 ~ 2024-08)
  const rawData = [
    // Level 0: 현대차 개발일정 - 20개월 전체
    { level: '0', task: '■ 현대차 개발일정', pStart: '2023-01-01', pFinish: '2024-08-31', aStart: '2023-01-06', aFinish: '', state: 'Y', cft: 'PM팀', manager: cftMembers['PM팀'] },
    // 마일스톤들 - 20개월에 분산
    { level: '0.1', task: 'PROTO', pStart: '2023-01-01', pFinish: '2023-04-30', aStart: '2023-01-06', aFinish: '2023-05-05', state: 'R', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '0.2', task: 'PILOT1', pStart: '2023-05-01', pFinish: '2023-08-31', aStart: '2023-05-06', aFinish: '2023-09-05', state: 'R', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '0.3', task: 'PILOT2', pStart: '2023-09-01', pFinish: '2023-12-31', aStart: '2023-09-06', aFinish: '2024-01-05', state: 'Y', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '0.4', task: 'PPAP', pStart: '2024-01-01', pFinish: '2024-04-30', aStart: '2024-01-06', aFinish: '2024-05-05', state: 'R', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '0.5', task: '양산(SOP)', pStart: '2024-05-01', pFinish: '2024-08-31', aStart: '2024-05-06', aFinish: '', state: 'Y', cft: '생산팀', manager: cftMembers['생산팀'] },
    
    // 1단계: 제품기획 (1~4개월)
    { level: '1', task: '1 단계. 제품기획', pStart: '2023-01-02', pFinish: '2023-04-30', aStart: '2023-01-07', aFinish: '2023-05-05', state: 'R', cft: 'PM팀', manager: cftMembers['PM팀'] },
    { level: '1.10', task: '개발 회의', pStart: '2023-01-02', pFinish: '2023-01-31', aStart: '2023-01-07', aFinish: '2023-01-28', state: 'G', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '1.20', task: 'Pre-제조공정도 작성', pStart: '2023-01-15', pFinish: '2023-02-15', aStart: '2023-01-20', aFinish: '2023-02-12', state: 'G', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '1.30', task: '도면 검토', pStart: '2023-02-01', pFinish: '2023-02-28', aStart: '2023-02-06', aFinish: '2023-03-10', state: 'R', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '1.40', task: '제조 타당성 검토', pStart: '2023-02-15', pFinish: '2023-03-15', aStart: '2023-02-20', aFinish: '2023-03-10', state: 'Y', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '1.50', task: '특별 특성 및 공정 특성 목록표', pStart: '2023-03-01', pFinish: '2023-03-31', aStart: '2023-03-06', aFinish: '2023-03-28', state: 'G', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '1.60', task: '협력업체 선정 및 개발계획', pStart: '2023-03-01', pFinish: '2023-03-31', aStart: '2023-03-06', aFinish: '2023-04-10', state: 'R', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '1.70', task: '설비 Capa 분석 및 확보계획 수립', pStart: '2023-03-15', pFinish: '2023-04-15', aStart: '2023-03-20', aFinish: '2023-04-10', state: 'Y', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '1.80', task: '포장사양 검토', pStart: '2023-04-01', pFinish: '2023-04-30', aStart: '2023-04-06', aFinish: '2023-04-25', state: 'G', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '1.90', task: 'Gage 검토 및 제작일정 수립', pStart: '2023-04-01', pFinish: '2023-04-30', aStart: '2023-04-06', aFinish: '2023-05-10', state: 'R', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '1.100', task: '개발일정 계획 수립', pStart: '2023-04-01', pFinish: '2023-04-30', aStart: '2023-04-06', aFinish: '2023-04-20', state: 'Y', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '1.110', task: 'Open issue', pStart: '2023-01-15', pFinish: '2023-04-30', aStart: '2023-01-20', aFinish: '2023-04-25', state: 'G', cft: '생산팀', manager: cftMembers['생산팀'] },
    
    // 2단계: 제품설계 및 개발 (5~8개월)
    { level: '2', task: '2단계. 제품설계 및 개발', pStart: '2023-05-01', pFinish: '2023-08-31', aStart: '2023-05-06', aFinish: '2023-09-05', state: 'R', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '2.10', task: '금형설계', pStart: '2023-05-01', pFinish: '2023-06-15', aStart: '2023-05-06', aFinish: '2023-06-10', state: 'G', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '2.20', task: '금형제작', pStart: '2023-06-01', pFinish: '2023-07-31', aStart: '2023-06-06', aFinish: '2023-08-10', state: 'R', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '2.30', task: '원자재 수급계획', pStart: '2023-06-15', pFinish: '2023-07-31', aStart: '2023-06-20', aFinish: '2023-07-25', state: 'Y', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '2.40', task: '시제품 제작', pStart: '2023-07-01', pFinish: '2023-08-15', aStart: '2023-07-06', aFinish: '2023-08-20', state: 'R', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '2.50', task: '시제품 검증', pStart: '2023-08-01', pFinish: '2023-08-31', aStart: '2023-08-06', aFinish: '2023-09-05', state: 'Y', cft: '품질팀', manager: cftMembers['품질팀'] },
    
    // 3단계: 공정설계 및 개발 (9~12개월)
    { level: '3', task: '3단계. 공정설계 및 개발', pStart: '2023-09-01', pFinish: '2023-12-31', aStart: '2023-09-06', aFinish: '2024-01-05', state: 'G', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '3.10', task: '금형 수정', pStart: '2023-09-01', pFinish: '2023-09-30', aStart: '2023-09-06', aFinish: '2023-09-28', state: 'G', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '3.20', task: 'P-FMEA', pStart: '2023-09-15', pFinish: '2023-10-15', aStart: '2023-09-20', aFinish: '2023-10-12', state: 'G', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '3.30', task: '제조공정도', pStart: '2023-10-01', pFinish: '2023-10-31', aStart: '2023-10-06', aFinish: '2023-10-28', state: 'G', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '3.40', task: '관리계획서', pStart: '2023-10-15', pFinish: '2023-11-15', aStart: '2023-10-20', aFinish: '2023-11-12', state: 'G', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '3.50', task: '작업 표준', pStart: '2023-11-01', pFinish: '2023-11-30', aStart: '2023-11-06', aFinish: '2023-11-28', state: 'G', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '3.60', task: '검사 기준서', pStart: '2023-10-01', pFinish: '2023-10-31', aStart: '2023-10-06', aFinish: '2023-10-28', state: 'G', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '3.70', task: '재료시험', pStart: '2023-10-15', pFinish: '2023-11-15', aStart: '2023-10-20', aFinish: '2023-11-12', state: 'G', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '3.80', task: 'Forming TRY-OUT', pStart: '2023-11-15', pFinish: '2023-12-15', aStart: '2023-11-20', aFinish: '2023-12-12', state: 'G', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '3.90', task: '후공정 TRY-OUT', pStart: '2023-12-01', pFinish: '2023-12-31', aStart: '2023-12-06', aFinish: '2023-12-28', state: 'G', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '3.100', task: '지그 & 치공구', pStart: '2023-12-01', pFinish: '2023-12-31', aStart: '2023-12-06', aFinish: '2023-12-28', state: 'G', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '3.110', task: '설비운전조건 최적화', pStart: '2023-11-01', pFinish: '2023-12-31', aStart: '2023-11-06', aFinish: '2024-01-05', state: 'G', cft: '개발팀', manager: cftMembers['개발팀'] },
    
    // 4단계: 제품 및 공정 유효성 확인 (13~16개월)
    { level: '4', task: '4단계. 제품 및 공정 유효성 확인', pStart: '2024-01-01', pFinish: '2024-04-30', aStart: '2024-01-06', aFinish: '2024-05-05', state: 'R', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '4.1', task: 'Run at Rate 실시', pStart: '2024-01-01', pFinish: '2024-01-31', aStart: '2024-01-06', aFinish: '2024-02-10', state: 'R', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '4.1.1', task: '측정시스템 평가', pStart: '2024-01-15', pFinish: '2024-02-15', aStart: '2024-01-20', aFinish: '2024-02-12', state: 'G', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '4.1.2', task: '초기 공정 능력 평가', pStart: '2024-02-01', pFinish: '2024-03-15', aStart: '2024-02-06', aFinish: '2024-03-25', state: 'R', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '4.1.3', task: '협력사 PPAP 승인', pStart: '2024-02-15', pFinish: '2024-03-31', aStart: '2024-02-20', aFinish: '2024-03-25', state: 'Y', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '4.2', task: '고객 PPAP 서류 준비', pStart: '2024-03-01', pFinish: '2024-04-30', aStart: '2024-03-06', aFinish: '2024-05-10', state: 'R', cft: '개발팀', manager: cftMembers['개발팀'] },
    
    // 5단계: 양산 (17~20개월)
    { level: '5', task: '5단계. 양산', pStart: '2024-05-01', pFinish: '2024-08-31', aStart: '2024-05-06', aFinish: '', state: 'Y', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '5.1', task: 'PPAP 제출', pStart: '2024-05-01', pFinish: '2024-05-31', aStart: '2024-05-06', aFinish: '2024-05-28', state: 'G', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '5.2', task: '개발완료보고서', pStart: '2024-06-01', pFinish: '2024-06-30', aStart: '2024-06-06', aFinish: '2024-06-25', state: 'Y', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '5.3', task: '양산 이관', pStart: '2024-07-01', pFinish: '2024-07-31', aStart: '2024-07-06', aFinish: '', state: 'R', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '5.40', task: '양산 시작', pStart: '2024-08-01', pFinish: '2024-08-31', aStart: '2024-08-06', aFinish: '', state: 'R', cft: '생산팀', manager: cftMembers['생산팀'] },
  ];

  return rawData.map((item, index) => {
    // 계층 구조 계산
    let indentLevel = 0;
    if (item.level.includes('.')) {
        const parts = item.level.split('.');
        if (parts.length === 2 && parts[0] === '0') indentLevel = 1; // 0.1, 0.2 ... (Milestones under Root)
        else if (parts.length === 2 && parts[0] !== '0') indentLevel = 1; // 1.10, 2.10 ... (Tasks under Phase)
        else if (parts.length === 3) indentLevel = 2; // 4.1.1 ...
    } else {
        indentLevel = 0; // 0, 1, 2, 3, 4, 5
    }

    // Milestone Check (0.1 ~ 0.5)
    const isMilestone = ['0.1', '0.2', '0.3', '0.4', '0.5'].includes(item.level);

    // Critical Path 할당 (일부 태스크에만)
    const criticalTasks = ['3.10', '3.80', '4.1', '5.40'];
    const isCritical = criticalTasks.includes(item.level) ? 'C' : '';

    // 부모 ID 계산
    let parentId = null;
    if (item.level.includes('.')) {
        const lastDotIndex = item.level.lastIndexOf('.');
        parentId = item.level.substring(0, lastDotIndex);
    }

    return {
      id: item.level,
      parentId: parentId,
      level: indentLevel,
      taskName: item.task,
      planStart: item.pStart,
      planFinish: item.pFinish,
      actStart: item.aStart,
      actFinish: item.aFinish,
      state: item.state,
      department: item.cft,  // Team으로 표시
      owner: item.manager,
      path: isCritical,
      type: isMilestone ? 'milestone' : 'task', 
    };
  });
};
