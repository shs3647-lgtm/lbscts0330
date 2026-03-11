/**
 * @file types.ts
 * @description FMEA Dashboard 타입 정의
 */

// AP 분포 데이터
export interface APDistribution {
  high: number;
  medium: number;
  low: number;
  total: number;
}

// 개선조치 현황
export interface ImprovementStatus {
  completed: number;
  inProgress: number;
  planned: number;
  delayed: number;
}

// Top RPN 항목
export interface TopRPNItem {
  id: string;
  name: string;
  processName: string;
  failureMode: string;
  rpn: number;
  severity: number;
  occurrence: number;
  detection: number;
  ap: 'H' | 'M' | 'L';
}

// S/O/D 개선 비교
export interface SODComparison {
  before: { s: number; o: number; d: number };
  after: { s: number; o: number; d: number };
}

// 대시보드 전체 통계
export interface DashboardStats {
  apDistribution: APDistribution;
  improvementStatus: ImprovementStatus;
  topRPNItems: TopRPNItem[];
  sodComparison: SODComparison;
  totalItems: number;
  avgRPN: number;
  highRiskCount: number;
  improvementRate: number;
}

// 차트 색상
export const CHART_COLORS = {
  // AP 등급
  high: '#ef4444',      // 빨강
  medium: '#f59e0b',    // 주황
  low: '#22c55e',       // 초록
  
  // 개선 상태
  completed: '#10b981',
  inProgress: '#3b82f6',
  planned: '#8b5cf6',
  delayed: '#ef4444',
  
  // S/O/D
  severity: '#dc2626',
  occurrence: '#f97316',
  detection: '#8b5cf6',
  
  // 개선 전후
  before: '#94a3b8',
  after: '#22c55e',
  
  // 그라데이션
  primary: '#0ea5e9',
  secondary: '#6366f1',
  accent: '#f43f5e',
};

// 그라데이션 정의
export const GRADIENTS = {
  header: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0ea5e9 100%)',
  card: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
  chartBg: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)',
};

