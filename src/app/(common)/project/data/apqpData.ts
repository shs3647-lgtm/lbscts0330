
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

  // 🔥 2025-01 ~ 2026-11 (23개월 일정)
  const rawData = [
    // Level 0: 현대차 개발일정 - 23개월 전체
    { level: '0', task: '■ 현대차 EV 신차 개발', pStart: '2025-01-01', pFinish: '2026-11-30', aStart: '2025-01-06', aFinish: '', state: 'Y', cft: 'PM팀', manager: cftMembers['PM팀'] },

    // 마일스톤들 - 23개월에 분산
    { level: '0.1', task: 'PROTO', pStart: '2025-01-01', pFinish: '2025-04-30', aStart: '2025-01-06', aFinish: '2025-05-05', state: 'G', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '0.2', task: 'P1', pStart: '2025-05-01', pFinish: '2025-09-30', aStart: '2025-05-06', aFinish: '2025-10-05', state: 'G', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '0.3', task: 'P2', pStart: '2025-10-01', pFinish: '2026-02-28', aStart: '2025-10-06', aFinish: '', state: 'Y', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '0.4', task: 'PPAP', pStart: '2026-03-01', pFinish: '2026-07-31', aStart: '', aFinish: '', state: 'R', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '0.5', task: 'SOP', pStart: '2026-08-01', pFinish: '2026-11-30', aStart: '', aFinish: '', state: 'R', cft: '생산팀', manager: cftMembers['생산팀'] },

    // 1단계: 제품기획 (2025-01 ~ 2025-04)
    { level: '1', task: '1 단계. 제품기획', pStart: '2025-01-02', pFinish: '2025-04-30', aStart: '2025-01-07', aFinish: '2025-05-05', state: 'G', cft: 'PM팀', manager: cftMembers['PM팀'] },
    { level: '1.10', task: 'Kick-off 회의', pStart: '2025-01-02', pFinish: '2025-01-15', aStart: '2025-01-07', aFinish: '2025-01-14', state: 'G', cft: 'PM팀', manager: cftMembers['PM팀'] },
    { level: '1.20', task: '고객 요구사항 분석', pStart: '2025-01-16', pFinish: '2025-02-15', aStart: '2025-01-20', aFinish: '2025-02-12', state: 'G', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '1.30', task: '도면 검토 및 승인', pStart: '2025-02-01', pFinish: '2025-02-28', aStart: '2025-02-06', aFinish: '2025-03-05', state: 'G', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '1.40', task: '제조 타당성 검토', pStart: '2025-02-15', pFinish: '2025-03-15', aStart: '2025-02-20', aFinish: '2025-03-12', state: 'G', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '1.50', task: '특별 특성 목록 작성', pStart: '2025-03-01', pFinish: '2025-03-31', aStart: '2025-03-06', aFinish: '2025-03-28', state: 'G', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '1.60', task: '협력업체 선정', pStart: '2025-03-15', pFinish: '2025-04-15', aStart: '2025-03-20', aFinish: '2025-04-12', state: 'G', cft: '구매팀', manager: cftMembers['구매팀'] },
    { level: '1.70', task: '설비 Capa 분석', pStart: '2025-04-01', pFinish: '2025-04-30', aStart: '2025-04-06', aFinish: '2025-04-28', state: 'G', cft: '생산팀', manager: cftMembers['생산팀'] },

    // 2단계: 제품설계 및 개발 (2025-05 ~ 2025-09)
    { level: '2', task: '2단계. 제품설계 및 개발', pStart: '2025-05-01', pFinish: '2025-09-30', aStart: '2025-05-06', aFinish: '2025-10-05', state: 'G', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '2.10', task: 'D-FMEA 작성', pStart: '2025-05-01', pFinish: '2025-05-31', aStart: '2025-05-06', aFinish: '2025-05-28', state: 'G', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '2.20', task: '금형 설계', pStart: '2025-05-15', pFinish: '2025-06-30', aStart: '2025-05-20', aFinish: '2025-06-28', state: 'G', cft: '설계팀', manager: cftMembers['설계팀'] },
    { level: '2.30', task: '금형 제작', pStart: '2025-06-15', pFinish: '2025-08-15', aStart: '2025-06-20', aFinish: '2025-08-20', state: 'G', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '2.40', task: '시제품 제작', pStart: '2025-08-01', pFinish: '2025-09-15', aStart: '2025-08-06', aFinish: '2025-09-18', state: 'G', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '2.50', task: '시제품 검증', pStart: '2025-09-01', pFinish: '2025-09-30', aStart: '2025-09-06', aFinish: '2025-10-05', state: 'G', cft: '품질팀', manager: cftMembers['품질팀'] },

    // 3단계: 공정설계 및 개발 (2025-10 ~ 2026-02)
    { level: '3', task: '3단계. 공정설계 및 개발', pStart: '2025-10-01', pFinish: '2026-02-28', aStart: '2025-10-06', aFinish: '', state: 'Y', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '3.10', task: 'P-FMEA 작성', pStart: '2025-10-01', pFinish: '2025-10-31', aStart: '2025-10-06', aFinish: '2025-10-28', state: 'G', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '3.20', task: '공정흐름도(PFD)', pStart: '2025-10-15', pFinish: '2025-11-15', aStart: '2025-10-20', aFinish: '2025-11-12', state: 'G', cft: '개발팀', manager: cftMembers['개발팀'] },
    { level: '3.30', task: '관리계획서(CP)', pStart: '2025-11-01', pFinish: '2025-11-30', aStart: '2025-11-06', aFinish: '2025-11-28', state: 'G', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '3.40', task: '작업표준서', pStart: '2025-11-15', pFinish: '2025-12-15', aStart: '2025-11-20', aFinish: '2025-12-12', state: 'G', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '3.50', task: '검사기준서', pStart: '2025-12-01', pFinish: '2025-12-31', aStart: '2025-12-06', aFinish: '', state: 'Y', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '3.60', task: 'Forming TRY-OUT', pStart: '2026-01-02', pFinish: '2026-01-31', aStart: '', aFinish: '', state: 'R', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '3.70', task: '후공정 TRY-OUT', pStart: '2026-01-15', pFinish: '2026-02-15', aStart: '', aFinish: '', state: 'R', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '3.80', task: '지그 & 치공구', pStart: '2026-02-01', pFinish: '2026-02-28', aStart: '', aFinish: '', state: 'R', cft: '설계팀', manager: cftMembers['설계팀'] },

    // 4단계: 제품 및 공정 유효성 확인 (2026-03 ~ 2026-07)
    { level: '4', task: '4단계. 제품 및 공정 유효성 확인', pStart: '2026-03-01', pFinish: '2026-07-31', aStart: '', aFinish: '', state: 'R', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '4.10', task: 'Run at Rate', pStart: '2026-03-01', pFinish: '2026-03-31', aStart: '', aFinish: '', state: 'R', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '4.20', task: 'MSA(측정시스템분석)', pStart: '2026-03-15', pFinish: '2026-04-15', aStart: '', aFinish: '', state: 'R', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '4.30', task: 'SPC(공정능력분석)', pStart: '2026-04-01', pFinish: '2026-05-31', aStart: '', aFinish: '', state: 'R', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '4.40', task: '협력사 PPAP 승인', pStart: '2026-05-01', pFinish: '2026-06-15', aStart: '', aFinish: '', state: 'R', cft: '구매팀', manager: cftMembers['구매팀'] },
    { level: '4.50', task: '고객사 PPAP 서류 준비', pStart: '2026-06-01', pFinish: '2026-07-15', aStart: '', aFinish: '', state: 'R', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '4.60', task: '고객 승인', pStart: '2026-07-01', pFinish: '2026-07-31', aStart: '', aFinish: '', state: 'R', cft: '영업팀', manager: cftMembers['영업팀'] },

    // 5단계: 양산 (2026-08 ~ 2026-11)
    { level: '5', task: '5단계. 양산', pStart: '2026-08-01', pFinish: '2026-11-30', aStart: '', aFinish: '', state: 'R', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '5.10', task: 'PPAP 제출', pStart: '2026-08-01', pFinish: '2026-08-31', aStart: '', aFinish: '', state: 'R', cft: '품질팀', manager: cftMembers['품질팀'] },
    { level: '5.20', task: '개발완료보고서', pStart: '2026-09-01', pFinish: '2026-09-30', aStart: '', aFinish: '', state: 'R', cft: 'PM팀', manager: cftMembers['PM팀'] },
    { level: '5.30', task: '양산 이관', pStart: '2026-10-01', pFinish: '2026-10-31', aStart: '', aFinish: '', state: 'R', cft: '생산팀', manager: cftMembers['생산팀'] },
    { level: '5.40', task: 'SOP (양산 시작)', pStart: '2026-11-01', pFinish: '2026-11-30', aStart: '', aFinish: '', state: 'R', cft: '생산팀', manager: cftMembers['생산팀'] },
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
    const criticalTasks = ['3.60', '3.80', '4.10', '5.40'];
    const isCritical = criticalTasks.includes(item.level) ? 'C' : '';

    // 부모 ID 계산
    let parentId = null;
    if (item.level.includes('.')) {
      const lastDotIndex = item.level.lastIndexOf('.');
      parentId = item.level.substring(0, lastDotIndex);
    }

    // 진척율 계산 (초기값: 상태 기반)
    let progress = 0;
    if (item.state === 'G') progress = 100;
    else if (item.state === 'Y') progress = 50;
    else if (item.state === 'R') progress = 20;

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
      progress: progress, // 🔥 진척율 필드 추가
    };
  });
};
