/**
 * PROJECT DASHBOARD 타입 정의
 * 
 * @file project-dashboard.ts
 * @description ProjectDashboard 관련 타입 및 상수 정의
 */

export type ModuleStatus = 'Open' | 'Progress' | 'Complete' | 'Delay';

export interface ProjectDashboardData {
    projectId: string;
    createdAt: string;
    projectName: string;
    customer: string;
    factory: string;
    modelYear: string;
    program: string;
    startDate: string;
    endDate: string;
    duration: number;
    progress: number;
    pfdStatus: ModuleStatus;
    fmeaStatus: ModuleStatus;
    cpStatus: ModuleStatus;
    wsStatus: ModuleStatus;
    pmStatus: ModuleStatus;
    overallStatus: ModuleStatus;
    scheduleCompliance: number;
    delayedTasks: number;
    upcomingMilestones?: number | string[];
    id?: number;
}

// 대시보드 컬럼 정의
export const DASHBOARD_COLUMNS = [
    { data: 'projectId', header: 'Project ID', width: 130, type: 'text', readOnly: true },
    { data: 'projectName', header: '프로젝트명', width: 180, type: 'text', readOnly: true },
    { data: 'customer', header: '고객사', width: 100, type: 'text', readOnly: true },
    { data: 'progress', header: '진행률', width: 80, type: 'numeric', readOnly: true, renderer: 'progress' },
    { data: 'pfdStatus', header: 'PFD', width: 70, type: 'text', readOnly: true, renderer: 'status' },
    { data: 'fmeaStatus', header: 'FMEA', width: 70, type: 'text', readOnly: true, renderer: 'status' },
    { data: 'cpStatus', header: 'CP', width: 70, type: 'text', readOnly: true, renderer: 'status' },
    { data: 'wsStatus', header: 'WS', width: 70, type: 'text', readOnly: true, renderer: 'status' },
    { data: 'pmStatus', header: 'PM', width: 70, type: 'text', readOnly: true, renderer: 'status' },
    { data: 'overallStatus', header: '상태', width: 80, type: 'text', readOnly: true, renderer: 'status' },
    { data: 'startDate', header: '시작일', width: 90, type: 'text', readOnly: true },
    { data: 'scheduleCompliance', header: '일정준수율', width: 100, type: 'numeric', readOnly: true, renderer: 'compliance' },
    { data: 'delayedTasks', header: '지연작업', width: 80, type: 'numeric', readOnly: true, renderer: 'delayed' },
];

// 진행률 색상
export const getProgressColor = (progress: number): { bg: string; text: string } => {
    if (progress >= 90) return { bg: '#dcfce7', text: '#166534' };
    if (progress >= 70) return { bg: '#fef3c7', text: '#92400e' };
    if (progress >= 40) return { bg: '#dbeafe', text: '#1e40af' };
    return { bg: '#fee2e2', text: '#991b1b' };
};

// 상태 색상
export const getStatusColor = (status: ModuleStatus): { bg: string; text: string } => {
    switch (status) {
        case 'Complete': return { bg: '#dcfce7', text: '#166534' };
        case 'Progress': return { bg: '#dbeafe', text: '#1e40af' };
        case 'Open': return { bg: '#f3f4f6', text: '#374151' };
        case 'Delay': return { bg: '#fee2e2', text: '#991b1b' };
        default: return { bg: '#f3f4f6', text: '#374151' };
    }
};

// 일정 준수율 색상
export const getComplianceColor = (compliance: number): { bg: string; text: string } => {
    if (compliance >= 90) return { bg: '#dcfce7', text: '#166534' };
    if (compliance >= 70) return { bg: '#fef3c7', text: '#92400e' };
    return { bg: '#fee2e2', text: '#991b1b' };
};

// 지연 작업 색상
export const getDelayedTasksColor = (delayed: number): { bg: string; text: string } => {
    if (delayed === 0) return { bg: '#dcfce7', text: '#166534' };
    if (delayed <= 2) return { bg: '#fef3c7', text: '#92400e' };
    return { bg: '#fee2e2', text: '#991b1b' };
};
