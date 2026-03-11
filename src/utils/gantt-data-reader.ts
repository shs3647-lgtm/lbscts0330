/**
 * Gantt Chart 데이터 리더 유틸리티
 * 
 * 프로젝트 일정 데이터를 읽고 분석합니다.
 */

export interface ScheduleMetrics {
    scheduleCompliance: number;  // 일정 준수율 (%)
    delayedTasks: number;        // 지연 작업 수
    upcomingMilestones: number;  // 다가오는 마일스톤 수
}

/**
 * 프로젝트별 일정 메트릭 계산
 * @param projectId 프로젝트 ID
 * @returns 일정 관련 메트릭
 */
export function calculateScheduleMetrics(projectId: string): ScheduleMetrics {
    // TODO: 실제 Gantt 데이터베이스 연동 시 구현
    // 현재는 샘플 데이터 반환

    // 프로젝트 ID 기반 샘플 데이터 (해시값으로 일관된 값 생성)
    const hash = projectId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const scheduleCompliance = 60 + (hash % 40);  // 60~99%
    const delayedTasks = hash % 5;                 // 0~4개
    const upcomingMilestones = 1 + (hash % 3);     // 1~3개

    return {
        scheduleCompliance,
        delayedTasks,
        upcomingMilestones,
    };
}

/**
 * Gantt 차트 데이터 로드 (향후 API 연동용)
 * @param projectId 프로젝트 ID
 */
export async function loadGanttData(projectId: string) {
    // TODO: API 연동 구현
    return null;
}
