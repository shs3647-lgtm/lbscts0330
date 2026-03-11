/**
 * @file ai-recommendation.ts
 * @description AI 기반 FMEA 예측 시스템 - Phase 2 구현
 * @version 1.0.0
 * @created 2026-01-03
 * 
 * 핵심 기능:
 * 1. 히스토리 저장 - 모든 FMEA 관계 데이터 자동 저장
 * 2. 빈도 기반 추천 - 가장 많이 사용된 고장 항목 추천
 * 3. 연관 규칙 마이닝 - 함께 자주 사용되는 패턴 발견
 * 4. 컨텍스트 기반 추천 - 현재 맥락에 맞는 추천
 */

// =====================================================
// 타입 정의
// =====================================================

/** 고장 관계 데이터 */
export interface FailureRelation {
  id: string;
  
  // 구조 컨텍스트
  processType: string;      // 공정 유형 (사출, 조립, 도장 등)
  processName: string;      // 공정명
  workElement: string;      // 작업요소
  m4Category: string;       // 4M 분류 (MN, MC, MT, ME)
  
  // 기능 컨텍스트
  categoryType: string;     // 구분 (YP, SP, User)
  functionName: string;     // 기능명
  requirement: string;      // 요구사항
  productChar: string;      // 제품특성
  processChar: string;      // 공정특성
  
  // 고장 데이터
  failureEffect: string;    // 고장영향 (FE)
  failureMode: string;      // 고장형태 (FM)
  failureCause: string;     // 고장원인 (FC)
  
  // 위험 평가
  severity: number;         // 심각도 (1-10)
  occurrence: number;       // 발생도 (1-10)
  detection: number;        // 검출도 (1-10)
  
  // 메타데이터
  projectId: string;
  createdAt: string;
  frequency: number;        // 사용 빈도 (동일 패턴 횟수)
}

/** 연관 규칙 */
export interface AssociationRule {
  id: string;
  antecedent: string[];     // 조건 (예: ['타이어', '사출', 'MN'])
  consequent: string[];     // 결과 (예: ['균열', '치수불량'])
  ruleType: 'mode' | 'cause' | 'effect';  // 규칙 유형
  support: number;          // 지지도 (0-1)
  confidence: number;       // 신뢰도 (0-1)
  lift: number;             // 향상도 (>1 이면 유의미)
  createdAt: string;
}

/** 추천 컨텍스트 */
export interface RecommendContext {
  processType?: string;
  processName?: string;
  workElement?: string;
  m4Category?: string;
  categoryType?: string;
  functionName?: string;
  requirement?: string;
  productChar?: string;
}

/** 추천 결과 아이템 */
export interface RankedItem {
  value: string;
  frequency: number;
  confidence: number;
  source: 'history' | 'rule' | 'similar';
  relatedItems?: string[];  // 연관된 다른 항목들
}

/** 전체 추천 결과 */
export interface FullRecommendation {
  failureEffects: RankedItem[];
  failureModes: RankedItem[];
  failureCauses: RankedItem[];
  suggestedSeverity?: number;
  suggestedOccurrence?: number;
  suggestedDetection?: number;
}

// =====================================================
// 상수
// =====================================================
const STORAGE_KEY_HISTORY = 'fmea-ai-history';
const STORAGE_KEY_RULES = 'fmea-ai-rules';
const MIN_SUPPORT = 0.01;      // 최소 지지도 1%
const MIN_CONFIDENCE = 0.3;    // 최소 신뢰도 30%
const MAX_RECOMMENDATIONS = 10; // 최대 추천 개수
const MAX_HISTORY_SIZE = 10000; // ✅ 최대 히스토리 개수 (10,000건)
const CLEANUP_THRESHOLD = 12000; // ✅ 정리 임계값 (12,000건 이상 시 정리)

// =====================================================
// 유틸리티 함수
// =====================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setStorage<T extends { createdAt?: string; frequency?: number }>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    // ✅ 데이터 크기 제한: MAX_HISTORY_SIZE를 초과하면 오래된 항목 삭제
    let dataToSave = data;
    
    if (data.length > MAX_HISTORY_SIZE) {
      // 빈도 높은 항목 우선 유지, 나머지는 최신순 정렬 후 오래된 것 삭제
      dataToSave = data
        .sort((a, b) => {
          // 빈도 높은 순 우선
          const freqA = (a.frequency || 0);
          const freqB = (b.frequency || 0);
          if (freqB !== freqA) return freqB - freqA;
          
          // 빈도 같으면 최신순
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, MAX_HISTORY_SIZE);
      
      console.warn(`[AI 히스토리] 용량 제한 초과: ${data.length}건 → ${dataToSave.length}건으로 정리`);
    }
    
    localStorage.setItem(key, JSON.stringify(dataToSave));
  } catch (e: any) {
    // ✅ QuotaExceededError 처리: 오래된 데이터 삭제 후 재시도
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      console.warn('[AI 히스토리] localStorage 용량 초과, 오래된 데이터 정리 중...');
      
      try {
        // 데이터를 빈도 높은 순 + 최신순으로 정렬
        const sortedData = [...data].sort((a, b) => {
          const freqA = (a.frequency || 0);
          const freqB = (b.frequency || 0);
          if (freqB !== freqA) return freqB - freqA;
          
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        
        // 상위 50%만 유지 (빈도 높고 최신 데이터 우선)
        const reducedData = sortedData.slice(0, Math.floor(sortedData.length * 0.5));
        
        console.warn(`[AI 히스토리] 용량 초과로 인한 정리: ${data.length}건 → ${reducedData.length}건으로 축소`);
        localStorage.setItem(key, JSON.stringify(reducedData));
        
        // 재시도 후에도 실패하면 빈 배열로 초기화
        try {
          localStorage.setItem(key, JSON.stringify(reducedData));
        } catch (retryError) {
          console.error('[AI 히스토리] 재시도 실패, 빈 배열로 초기화');
          localStorage.setItem(key, JSON.stringify([]));
        }
      } catch (cleanupError) {
        console.error('[AI 히스토리] 정리 실패, 빈 배열로 초기화:', cleanupError);
        localStorage.setItem(key, JSON.stringify([]));
      }
    } else {
      console.error('[AI 히스토리] Storage error:', e);
    }
  }
}

// =====================================================
// AI 추천 엔진 클래스
// =====================================================

class AIRecommendationEngine {
  private history: FailureRelation[] = [];
  private rules: AssociationRule[] = [];
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined') return;
    this.history = getStorage<FailureRelation>(STORAGE_KEY_HISTORY);
    this.rules = getStorage<AssociationRule>(STORAGE_KEY_RULES);
    this.isInitialized = true;
  }

  // =====================================================
  // 1. 히스토리 관리
  // =====================================================

  /**
   * 고장 관계 저장
   * - 새로운 FMEA 데이터가 입력될 때마다 호출
   * - 동일 패턴이 있으면 빈도 증가, 없으면 새로 추가
   * - ✅ 히스토리 크기 제한 및 자동 정리
   */
  saveFailureRelation(relation: Partial<FailureRelation>): void {
    if (!this.isInitialized) this.initialize();

    // 필수 필드 체크
    if (!relation.failureMode && !relation.failureCause && !relation.failureEffect) {
      return;
    }

    // ✅ 히스토리 크기 확인 및 정리 (CLEANUP_THRESHOLD 초과 시)
    if (this.history.length >= CLEANUP_THRESHOLD) {
      // 빈도 높은 항목 우선 유지, 나머지는 최신순 정렬 후 오래된 것 삭제
      this.history = this.history
        .sort((a, b) => {
          const freqA = a.frequency || 0;
          const freqB = b.frequency || 0;
          if (freqB !== freqA) return freqB - freqA;
          
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, MAX_HISTORY_SIZE);
      
      console.log(`[AI 히스토리] 자동 정리: ${CLEANUP_THRESHOLD}건 → ${this.history.length}건`);
    }

    // 동일 패턴 찾기 (공정+작업요소+4M+고장형태 기준)
    const existingIdx = this.history.findIndex(h =>
      h.processName === relation.processName &&
      h.workElement === relation.workElement &&
      h.m4Category === relation.m4Category &&
      h.failureMode === relation.failureMode
    );

    if (existingIdx >= 0) {
      // 빈도 증가
      this.history[existingIdx].frequency += 1;
      this.history[existingIdx].createdAt = new Date().toISOString();
    } else {
      // 새 관계 추가
      const newRelation: FailureRelation = {
        id: generateId(),
        processType: relation.processType || '',
        processName: relation.processName || '',
        workElement: relation.workElement || '',
        m4Category: relation.m4Category || '',
        categoryType: relation.categoryType || '',
        functionName: relation.functionName || '',
        requirement: relation.requirement || '',
        productChar: relation.productChar || '',
        processChar: relation.processChar || '',
        failureEffect: relation.failureEffect || '',
        failureMode: relation.failureMode || '',
        failureCause: relation.failureCause || '',
        severity: relation.severity || 0,
        occurrence: relation.occurrence || 0,
        detection: relation.detection || 0,
        projectId: relation.projectId || '',
        createdAt: new Date().toISOString(),
        frequency: 1,
      };
      this.history.unshift(newRelation);
    }

    // 저장 (자동 정리 로직 포함)
    setStorage(STORAGE_KEY_HISTORY, this.history);
    
    // 저장 후 히스토리 다시 로드 (정리된 데이터 반영)
    this.history = getStorage<FailureRelation>(STORAGE_KEY_HISTORY);
    
    // 일정 주기로 연관 규칙 업데이트 (100건마다)
    if (this.history.length % 100 === 0) {
      this.updateAssociationRules();
    }
  }

  /**
   * 히스토리 조회
   */
  getHistory(): FailureRelation[] {
    if (!this.isInitialized) this.initialize();
    return this.history;
  }

  /**
   * 히스토리 통계
   */
  getHistoryStats(): { total: number; uniqueModes: number; uniqueCauses: number; uniqueEffects: number } {
    const modes = new Set(this.history.map(h => h.failureMode).filter(Boolean));
    const causes = new Set(this.history.map(h => h.failureCause).filter(Boolean));
    const effects = new Set(this.history.map(h => h.failureEffect).filter(Boolean));
    
    return {
      total: this.history.length,
      uniqueModes: modes.size,
      uniqueCauses: causes.size,
      uniqueEffects: effects.size,
    };
  }

  // =====================================================
  // 2. 빈도 기반 추천
  // =====================================================

  /**
   * 가장 많이 사용된 고장형태 추천
   */
  getFrequentFailureModes(context: RecommendContext): RankedItem[] {
    return this.getFrequentItems(context, 'failureMode');
  }

  /**
   * 가장 많이 사용된 고장원인 추천
   */
  getFrequentFailureCauses(context: RecommendContext): RankedItem[] {
    return this.getFrequentItems(context, 'failureCause');
  }

  /**
   * 가장 많이 사용된 고장영향 추천
   */
  getFrequentFailureEffects(context: RecommendContext): RankedItem[] {
    return this.getFrequentItems(context, 'failureEffect');
  }

  private getFrequentItems(
    context: RecommendContext, 
    field: 'failureMode' | 'failureCause' | 'failureEffect'
  ): RankedItem[] {
    if (!this.isInitialized) this.initialize();
    if (this.history.length === 0) return [];

    // 컨텍스트에 맞는 히스토리 필터링
    let filtered = this.history;
    
    if (context.processType) {
      filtered = filtered.filter(h => h.processType === context.processType);
    }
    if (context.processName) {
      filtered = filtered.filter(h => h.processName === context.processName);
    }
    if (context.workElement) {
      filtered = filtered.filter(h => h.workElement === context.workElement);
    }
    if (context.m4Category) {
      filtered = filtered.filter(h => h.m4Category === context.m4Category);
    }
    if (context.categoryType) {
      filtered = filtered.filter(h => h.categoryType === context.categoryType);
    }
    if (context.requirement) {
      filtered = filtered.filter(h => h.requirement === context.requirement);
    }

    // 빈도 집계
    const freqMap = new Map<string, number>();
    const relatedMap = new Map<string, Set<string>>();
    
    for (const item of filtered) {
      const value = item[field];
      if (!value) continue;
      
      freqMap.set(value, (freqMap.get(value) || 0) + item.frequency);
      
      // 연관 항목 수집
      if (!relatedMap.has(value)) {
        relatedMap.set(value, new Set());
      }
      if (field === 'failureMode') {
        if (item.failureCause) relatedMap.get(value)!.add(item.failureCause);
        if (item.failureEffect) relatedMap.get(value)!.add(item.failureEffect);
      } else if (field === 'failureCause') {
        if (item.failureMode) relatedMap.get(value)!.add(item.failureMode);
      } else if (field === 'failureEffect') {
        if (item.failureMode) relatedMap.get(value)!.add(item.failureMode);
      }
    }

    // 정렬 및 변환
    const totalFreq = Array.from(freqMap.values()).reduce((a, b) => a + b, 0);
    
    const ranked: RankedItem[] = Array.from(freqMap.entries())
      .map(([value, freq]) => ({
        value,
        frequency: freq,
        confidence: totalFreq > 0 ? freq / totalFreq : 0,
        source: 'history' as const,
        relatedItems: Array.from(relatedMap.get(value) || []).slice(0, 3),
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, MAX_RECOMMENDATIONS);

    return ranked;
  }

  // =====================================================
  // 3. 연관 규칙 마이닝 (Apriori-like)
  // =====================================================

  /**
   * 연관 규칙 업데이트
   * - 히스토리 데이터로부터 연관 규칙 생성
   */
  updateAssociationRules(): void {
    if (this.history.length < 10) return; // 최소 10건 이상 필요

    const newRules: AssociationRule[] = [];
    const totalTransactions = this.history.length;

    // 1. 아이템셋 빈도 계산
    const itemsetFreq = new Map<string, number>();
    const pairFreq = new Map<string, Map<string, number>>();

    for (const h of this.history) {
      // 단일 아이템 빈도
      const items = [
        h.processType && `P:${h.processType}`,
        h.m4Category && `M:${h.m4Category}`,
        h.failureMode && `FM:${h.failureMode}`,
        h.failureCause && `FC:${h.failureCause}`,
        h.failureEffect && `FE:${h.failureEffect}`,
      ].filter(Boolean) as string[];

      for (const item of items) {
        itemsetFreq.set(item, (itemsetFreq.get(item) || 0) + h.frequency);
      }

      // 페어 빈도 (2-아이템셋)
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const key = items[i];
          const target = items[j];
          
          if (!pairFreq.has(key)) pairFreq.set(key, new Map());
          const subMap = pairFreq.get(key)!;
          subMap.set(target, (subMap.get(target) || 0) + h.frequency);
        }
      }
    }

    // 2. 연관 규칙 생성 (A → B 형태)
    for (const [antecedentKey, antecedentFreq] of itemsetFreq.entries()) {
      const pairMap = pairFreq.get(antecedentKey);
      if (!pairMap) continue;

      for (const [consequentKey, pairCount] of pairMap.entries()) {
        const support = pairCount / totalTransactions;
        const confidence = pairCount / antecedentFreq;
        const consequentFreq = itemsetFreq.get(consequentKey) || 1;
        const expectedSupport = (antecedentFreq / totalTransactions) * (consequentFreq / totalTransactions);
        const lift = support / expectedSupport;

        // 필터링: 최소 지지도/신뢰도 충족 & 고장 관련 규칙만
        if (support >= MIN_SUPPORT && confidence >= MIN_CONFIDENCE) {
          // 규칙 유형 결정
          let ruleType: 'mode' | 'cause' | 'effect' = 'mode';
          if (consequentKey.startsWith('FC:')) ruleType = 'cause';
          if (consequentKey.startsWith('FE:')) ruleType = 'effect';

          // 조건/결과에서 접두사 제거
          const antecedent = [antecedentKey.replace(/^[A-Z]+:/, '')];
          const consequent = [consequentKey.replace(/^[A-Z]+:/, '')];

          newRules.push({
            id: generateId(),
            antecedent,
            consequent,
            ruleType,
            support,
            confidence,
            lift,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // 상위 규칙만 저장 (lift 기준 상위 100개)
    this.rules = newRules
      .sort((a, b) => b.lift - a.lift)
      .slice(0, 100);
    
    setStorage(STORAGE_KEY_RULES, this.rules);
  }

  /**
   * 연관 항목 추천
   */
  getAssociatedItems(
    antecedent: string[], 
    type: 'mode' | 'cause' | 'effect'
  ): RankedItem[] {
    if (!this.isInitialized) this.initialize();
    if (this.rules.length === 0) return [];

    // 조건에 맞는 규칙 필터링
    const matchingRules = this.rules.filter(rule => {
      if (rule.ruleType !== type) return false;
      // 조건 중 하나라도 일치하면 포함
      return antecedent.some(a => 
        rule.antecedent.some(ra => 
          ra.toLowerCase().includes(a.toLowerCase()) ||
          a.toLowerCase().includes(ra.toLowerCase())
        )
      );
    });

    // 결과 집계
    const resultMap = new Map<string, { confidence: number; lift: number }>();
    
    for (const rule of matchingRules) {
      for (const c of rule.consequent) {
        const existing = resultMap.get(c);
        if (!existing || rule.confidence > existing.confidence) {
          resultMap.set(c, { confidence: rule.confidence, lift: rule.lift });
        }
      }
    }

    // 변환 및 정렬
    return Array.from(resultMap.entries())
      .map(([value, stats]) => ({
        value,
        frequency: Math.round(stats.lift * 100), // lift를 빈도처럼 표시
        confidence: stats.confidence,
        source: 'rule' as const,
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_RECOMMENDATIONS);
  }

  // =====================================================
  // 4. 통합 추천 (컨텍스트 기반)
  // =====================================================

  /**
   * 컨텍스트 기반 전체 추천
   * - 빈도 + 연관규칙 결합
   */
  recommendByContext(context: RecommendContext): FullRecommendation {
    // 빈도 기반 추천
    const freqModes = this.getFrequentFailureModes(context);
    const freqCauses = this.getFrequentFailureCauses(context);
    const freqEffects = this.getFrequentFailureEffects(context);

    // 연관 규칙 기반 추천
    const antecedent = [
      context.processType,
      context.processName,
      context.workElement,
      context.m4Category,
      context.requirement,
    ].filter(Boolean) as string[];

    const ruleModes = this.getAssociatedItems(antecedent, 'mode');
    const ruleCauses = this.getAssociatedItems(antecedent, 'cause');
    const ruleEffects = this.getAssociatedItems(antecedent, 'effect');

    // 결합 (빈도 우선, 규칙으로 보완)
    const mergeResults = (freq: RankedItem[], rule: RankedItem[]): RankedItem[] => {
      const merged = new Map<string, RankedItem>();
      
      // 빈도 기반 먼저 추가
      for (const item of freq) {
        merged.set(item.value, item);
      }
      
      // 규칙 기반으로 보완 (없는 것만 추가)
      for (const item of rule) {
        if (!merged.has(item.value)) {
          merged.set(item.value, item);
        }
      }
      
      return Array.from(merged.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, MAX_RECOMMENDATIONS);
    };

    // 심각도/발생도/검출도 평균 계산
    const contextHistory = this.history.filter(h => {
      if (context.processName && h.processName !== context.processName) return false;
      if (context.m4Category && h.m4Category !== context.m4Category) return false;
      return true;
    });

    let avgSeverity: number | undefined;
    let avgOccurrence: number | undefined;
    let avgDetection: number | undefined;

    if (contextHistory.length > 0) {
      const validSev = contextHistory.filter(h => h.severity > 0);
      const validOcc = contextHistory.filter(h => h.occurrence > 0);
      const validDet = contextHistory.filter(h => h.detection > 0);

      if (validSev.length > 0) {
        avgSeverity = Math.round(validSev.reduce((s, h) => s + h.severity, 0) / validSev.length);
      }
      if (validOcc.length > 0) {
        avgOccurrence = Math.round(validOcc.reduce((s, h) => s + h.occurrence, 0) / validOcc.length);
      }
      if (validDet.length > 0) {
        avgDetection = Math.round(validDet.reduce((s, h) => s + h.detection, 0) / validDet.length);
      }
    }

    return {
      failureEffects: mergeResults(freqEffects, ruleEffects),
      failureModes: mergeResults(freqModes, ruleModes),
      failureCauses: mergeResults(freqCauses, ruleCauses),
      suggestedSeverity: avgSeverity,
      suggestedOccurrence: avgOccurrence,
      suggestedDetection: avgDetection,
    };
  }

  // =====================================================
  // 5. 데이터 관리
  // =====================================================

  /**
   * 전체 초기화 (테스트/리셋용)
   */
  clearAll(): void {
    this.history = [];
    this.rules = [];
    setStorage(STORAGE_KEY_HISTORY, []);
    setStorage(STORAGE_KEY_RULES, []);
  }

  /**
   * 히스토리 내보내기
   */
  exportHistory(): string {
    return JSON.stringify({
      history: this.history,
      rules: this.rules,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * 히스토리 가져오기
   */
  importHistory(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (Array.isArray(data.history)) {
        this.history = data.history;
        setStorage(STORAGE_KEY_HISTORY, this.history);
      }
      if (Array.isArray(data.rules)) {
        this.rules = data.rules;
        setStorage(STORAGE_KEY_RULES, this.rules);
      }
      return true;
    } catch {
      return false;
    }
  }
}

// =====================================================
// 싱글톤 인스턴스 내보내기
// =====================================================
export const aiEngine = new AIRecommendationEngine();

// =====================================================
// 편의 함수들
// =====================================================

/**
 * FMEA 데이터 저장 (워크시트에서 호출)
 * ✅ AI 히스토리 저장 기능 비활성화 (QuotaExceededError 방지 및 DB 중심 설계)
 */
export function saveToAIHistory(data: Partial<FailureRelation>): void {
  // 로직 제거: 더 이상 localStorage에 데이터를 쌓지 않음
  // aiEngine.saveFailureRelation(data);
  console.log('[AI 히스토리] 저장 건너뜀 (DB 데이터 우선 원칙)');
}

/**
 * 추천 가져오기 (모달에서 호출)
 */
export function getAIRecommendations(context: RecommendContext): FullRecommendation {
  return aiEngine.recommendByContext(context);
}

/**
 * 특정 유형 추천 가져오기
 */
export function getRecommendedItems(
  context: RecommendContext, 
  type: 'mode' | 'cause' | 'effect'
): RankedItem[] {
  switch (type) {
    case 'mode':
      return aiEngine.getFrequentFailureModes(context);
    case 'cause':
      return aiEngine.getFrequentFailureCauses(context);
    case 'effect':
      return aiEngine.getFrequentFailureEffects(context);
  }
}

/**
 * AI 학습 상태 조회
 */
export function getAIStatus(): { 
  historyCount: number; 
  ruleCount: number; 
  isReady: boolean;
  stats: { uniqueModes: number; uniqueCauses: number; uniqueEffects: number };
} {
  const stats = aiEngine.getHistoryStats();
  return {
    historyCount: stats.total,
    ruleCount: aiEngine['rules'].length,
    isReady: stats.total >= 10,
    stats,
  };
}





