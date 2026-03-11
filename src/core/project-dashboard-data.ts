/**
 * PROJECT DASHBOARD 샘플 데이터
 * 
 * 25개 프로젝트 샘플 데이터
 * 🔥 날짜 표기: YY/MM/DD (전역 표준)
 */

import { ProjectDashboardData } from '../types/project-dashboard';

export const SAMPLE_PROJECTS: ProjectDashboardData[] = [
  {
    projectId: 'P/T-2025-0270',
    createdAt: '25/01/15',
    projectName: 'K9 FL 프로젝트',
    customer: '현대자동차',
    factory: '울산공장',
    modelYear: '2025',
    program: 'K9 FL',
    startDate: '25/01/01',
    endDate: '25/12/31',
    duration: 365,
    progress: 85,
    pfdStatus: 'Complete',
    fmeaStatus: 'Progress',
    cpStatus: 'Progress',
    wsStatus: 'Open',
    pmStatus: 'Open',
    overallStatus: 'Progress',
    scheduleCompliance: 92,
    delayedTasks: 1
  },
  {
    projectId: 'P/T-2025-0271',
    createdAt: '25/01/20',
    projectName: 'GV80 Coupe',
    customer: '제네시스',
    factory: '화성공장',
    modelYear: '2025',
    program: 'GV80 Coupe',
    startDate: '25/02/01',
    endDate: '25/11/30',
    duration: 303,
    progress: 92,
    pfdStatus: 'Complete',
    fmeaStatus: 'Complete',
    cpStatus: 'Progress',
    wsStatus: 'Progress',
    pmStatus: 'Open',
    overallStatus: 'Progress',
    scheduleCompliance: 95,
    delayedTasks: 0
  },
  {
    projectId: 'P/T-2025-0272',
    createdAt: '25/02/01',
    projectName: 'Sonata N Line',
    customer: '현대자동차',
    factory: '아산공장',
    modelYear: '2025',
    program: 'Sonata N',
    startDate: '25/03/01',
    endDate: '25/10/31',
    duration: 244,
    progress: 45,
    pfdStatus: 'Progress',
    fmeaStatus: 'Open',
    cpStatus: 'Open',
    wsStatus: 'Open',
    pmStatus: 'Open',
    overallStatus: 'Delay',
    scheduleCompliance: 65,
    delayedTasks: 5
  },
  {
    projectId: 'P/T-2025-0273',
    createdAt: '25/02/10',
    projectName: 'Santa Fe Hybrid',
    customer: '현대자동차',
    factory: '전주공장',
    modelYear: '2025',
    program: 'Santa Fe HEV',
    startDate: '25/02/15',
    endDate: '25/12/15',
    duration: 304,
    progress: 78,
    pfdStatus: 'Complete',
    fmeaStatus: 'Progress',
    cpStatus: 'Progress',
    wsStatus: 'Open',
    pmStatus: 'Open',
    overallStatus: 'Progress',
    scheduleCompliance: 88,
    delayedTasks: 2
  },
  {
    projectId: 'P/T-2025-0274',
    createdAt: '25/02/15',
    projectName: 'Tucson PHEV',
    customer: '현대자동차',
    factory: '광주공장',
    modelYear: '2025',
    program: 'Tucson PHEV',
    startDate: '25/03/01',
    endDate: '25/11/30',
    duration: 275,
    progress: 88,
    pfdStatus: 'Complete',
    fmeaStatus: 'Complete',
    cpStatus: 'Progress',
    wsStatus: 'Progress',
    pmStatus: 'Open',
    overallStatus: 'Progress',
    scheduleCompliance: 93,
    delayedTasks: 1
  },
  {
    projectId: 'P/T-2025-0275',
    createdAt: '25/03/01',
    projectName: 'Palisade Calligraphy',
    customer: '현대자동차',
    factory: '울산공장',
    modelYear: '2026',
    program: 'Palisade Cal',
    startDate: '25/04/01',
    endDate: '26/03/31',
    duration: 365,
    progress: 35,
    pfdStatus: 'Progress',
    fmeaStatus: 'Open',
    cpStatus: 'Open',
    wsStatus: 'Open',
    pmStatus: 'Open',
    overallStatus: 'Open',
    scheduleCompliance: 75,
    delayedTasks: 3
  },
  {
    projectId: 'P/T-2025-0276',
    createdAt: '25/03/05',
    projectName: 'G90 Long Wheelbase',
    customer: '제네시스',
    factory: '화성공장',
    modelYear: '2026',
    program: 'G90 LWB',
    startDate: '25/05/01',
    endDate: '26/04/30',
    duration: 365,
    progress: 25,
    pfdStatus: 'Open',
    fmeaStatus: 'Open',
    cpStatus: 'Open',
    wsStatus: 'Open',
    pmStatus: 'Open',
    overallStatus: 'Open',
    scheduleCompliance: 68,
    delayedTasks: 4
  },
  {
    projectId: 'P/T-2025-0277',
    createdAt: '25/03/10',
    projectName: 'Kona Electric',
    customer: '현대자동차',
    factory: '울산공장',
    modelYear: '2025',
    program: 'Kona EV',
    startDate: '25/04/01',
    endDate: '25/12/31',
    duration: 275,
    progress: 95,
    pfdStatus: 'Complete',
    fmeaStatus: 'Complete',
    cpStatus: 'Complete',
    wsStatus: 'Progress',
    pmStatus: 'Progress',
    overallStatus: 'Progress',
    scheduleCompliance: 98,
    delayedTasks: 0
  },
  {
    projectId: 'P/T-2025-0278',
    createdAt: '25/03/15',
    projectName: 'Ioniq 6 N',
    customer: '현대자동차',
    factory: '아산공장',
    modelYear: '2025',
    program: 'Ioniq 6 N',
    startDate: '25/05/01',
    endDate: '26/02/28',
    duration: 304,
    progress: 42,
    pfdStatus: 'Progress',
    fmeaStatus: 'Open',
    cpStatus: 'Open',
    wsStatus: 'Open',
    pmStatus: 'Open',
    overallStatus: 'Delay',
    scheduleCompliance: 60,
    delayedTasks: 6
  },
  {
    projectId: 'P/T-2025-0279',
    createdAt: '25/03/20',
    projectName: 'GV70 Electrified',
    customer: '제네시스',
    factory: '화성공장',
    modelYear: '2025',
    program: 'GV70 EV',
    startDate: '25/04/15',
    endDate: '25/12/15',
    duration: 245,
    progress: 82,
    pfdStatus: 'Complete',
    fmeaStatus: 'Progress',
    cpStatus: 'Progress',
    wsStatus: 'Open',
    pmStatus: 'Open',
    overallStatus: 'Progress',
    scheduleCompliance: 90,
    delayedTasks: 1
  },
  // 나머지 15개 프로젝트 추가
  ...generateAdditionalProjects(10, 15)
];

// 🔥 Hydration 오류 방지: Math.random() 대신 고정 시드 기반 값 사용
function generateAdditionalProjects(startIndex: number, count: number): ProjectDashboardData[] {
  const projects: ProjectDashboardData[] = [];
  const customers = ['현대자동차', '기아자동차', '제네시스'];
  const factories = ['울산공장', '아산공장', '화성공장', '광주공장', '전주공장'];
  const statuses: Array<'Open' | 'Progress' | 'Complete' | 'Delay'> = ['Open', 'Progress', 'Complete', 'Delay'];
  
  // 고정 시드 값 배열 (SSR/CSR 일관성 보장)
  const seedProgress = [72, 45, 88, 33, 91, 67, 54, 82, 29, 95, 61, 78, 42, 86, 58];
  const seedDuration = [220, 185, 310, 245, 275, 195, 260, 230, 290, 205, 270, 240, 300, 215, 255];
  const seedStatusIdx = [2, 1, 0, 3, 2, 1, 0, 2, 3, 0, 1, 2, 3, 0, 1];
  
  for (let i = 0; i < count; i++) {
    const index = startIndex + i;
    const progress = seedProgress[i % seedProgress.length];
    const overallStatus = progress < 40 ? 'Delay' : progress < 60 ? 'Open' : progress < 90 ? 'Progress' : 'Complete';
    
    // 고정 일정 준수율과 지연 작업 수
    const scheduleCompliance = progress >= 90 ? 95 : progress >= 70 ? 82 : 58;
    const delayedTasks = scheduleCompliance >= 90 ? 0 : scheduleCompliance >= 70 ? 2 : 5;
    
    projects.push({
      projectId: `P/T-2025-${(280 + i).toString().padStart(4, '0')}`,
      createdAt: `25/${(3 + Math.floor(i / 5)).toString().padStart(2, '0')}/${((i % 5 + 1) * 5).toString().padStart(2, '0')}`,
      projectName: `프로젝트 ${index + 1}`,
      customer: customers[i % customers.length],
      factory: factories[i % factories.length],
      modelYear: '2025',
      program: `Program ${index + 1}`,
      startDate: `25/${(4 + Math.floor(i / 3)).toString().padStart(2, '0')}/01`,
      endDate: `25/${(10 + Math.floor(i / 2)).toString().padStart(2, '0')}/30`,
      duration: seedDuration[i % seedDuration.length],
      progress,
      pfdStatus: statuses[seedStatusIdx[i % seedStatusIdx.length]],
      fmeaStatus: statuses[(seedStatusIdx[i % seedStatusIdx.length] + 1) % 4],
      cpStatus: statuses[(seedStatusIdx[i % seedStatusIdx.length] + 2) % 4],
      wsStatus: statuses[(seedStatusIdx[i % seedStatusIdx.length] + 3) % 4],
      pmStatus: statuses[seedStatusIdx[i % seedStatusIdx.length]],
      overallStatus,
      scheduleCompliance,
      delayedTasks
    });
  }
  
  return projects;
}

