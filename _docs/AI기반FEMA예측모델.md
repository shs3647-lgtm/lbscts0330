사용자의 요구사항인 **"빈도 기반 FMEA 예측 모델"** 개발을 위해, 현재 단계에서 가장 적합한 모델과 구체적인 구현 방안을 정리해 드립니다.

FMEA 데이터는 전형적인 **계층적 구조(Hierarchical)**와 **인과 관계(Causal Relationship)**를 가지므로, 거대 언어 모델(LLM)로 바로 가기보다 **통계적 빈도 분석**과 **연관 규칙 마이닝**을 먼저 적용하는 것이 효율적입니다.

---

## 🚀 추천 모델: 단계별 적용 전략

빈도 기반 예측을 위해 다음 순서로 모델을 고도화하는 것을 추천합니다.

### 1순위: 연관 규칙 마이닝 (Association Rule Mining)

> **"이 공정 특성을 선택한 경우, 80% 확률로 이 고장 형태가 발생했다."**

* **알고리즘:** **Apriori** 또는 **FP-Growth**
* **이유:** 쇼핑몰의 "장바구니 분석(맥주를 산 사람은 기저귀도 샀다)"과 원리가 같습니다. FMEA에서 `[공정요소]`와 `[고장형태]`가 함께 등장하는 빈도를 분석하여 규칙을 찾아냅니다.
* **장점:** 결과가 매우 직관적이고 설명 가능(Explainable)합니다.
* **적합도:** ⭐⭐⭐⭐⭐ (빈도 기반 예측에 최적)

### 2순위: 나이브 베이즈 분류기 (Naive Bayes Classifier)

> **"입력된 텍스트 단어들의 빈도를 볼 때, 이 고장은 '치수 불량'일 확률이 높다."**

* **이유:** 데이터 간의 독립성을 가정하고 빈도(확률) 기반으로 가장 가능성 높은 클래스를 예측합니다. 데이터가 적을 때도 잘 작동합니다.
* **장점:** 학습 속도가 빠르고 텍스트 데이터 처리에 강함.
* **적합도:** ⭐⭐⭐⭐

### 3순위: 랜덤 포레스트 (Random Forest)

> **"공정, 설비, 재질 정보를 종합했을 때, 예상되는 심각도는 8점이다."**

* **이유:** 의사결정나무(Decision Tree)를 여러 개 만들어 다수결로 결과를 냅니다. 범주형 데이터(Category)가 많은 FMEA 특성상 매우 높은 성능을 보입니다.
* **장점:** 과적합(Overfitting) 방지, 변수 중요도 파악 가능.
* **적합도:** ⭐⭐⭐⭐ (데이터가 좀 더 쌓인 후 적용 권장)

---

## 🛠️ 시스템 설계 및 코드 추천

웹 기반 시스템(JavaScript/TypeScript)을 가정하고 작성하였습니다. 파이썬 백엔드가 있다면 `scikit-learn`을 사용하면 되지만, 여기서는 프론트엔드/Node.js 환경에서도 가능한 **빈도/연관 규칙 로직**을 제안합니다.

### 1. 데이터 구조 설계 (Schema)

AI 학습을 위해서는 데이터가 '관계형'으로 저장되어야 합니다.

```typescript
// FMEA 관계 데이터 인터페이스
interface FMEARelation {
  id: string;
  processType: string;    // 공정 (예: 사출, 용접)
  productChar: string;    // 제품특성 (예: 두께, 인장강도)
  failureMode: string;    // 고장형태 (예: 크랙, 미성형)
  failureCause: string;   // 고장원인 (예: 온도 과다)
  frequency: number;      // 발생/선택 빈도 (가중치)
}

// 예측 요청 컨텍스트
interface PredictionContext {
  currentProcess?: string;
  currentProductChar?: string;
}

```

### 2. 빈도 기반 추천 로직 (Simple Frequency)

가장 기초적이지만 강력한 "가장 많이 선택된 항목" 추천입니다.

```typescript
/**
 * 단순 빈도 기반 추천: 특정 제품특성에서 가장 많이 발생한 고장형태 Top N 반환
 */
function recommendByFrequency(
  historyData: FMEARelation[], 
  targetChar: string, 
  topN: number = 3
): { mode: string, score: number }[] {
  
  // 1. 해당 특성과 관련된 데이터 필터링
  const relevantData = historyData.filter(d => d.productChar === targetChar);
  
  // 2. 고장형태별 빈도 집계
  const frequencyMap: Record<string, number> = {};
  
  relevantData.forEach(item => {
    if (frequencyMap[item.failureMode]) {
      frequencyMap[item.failureMode] += item.frequency;
    } else {
      frequencyMap[item.failureMode] = item.frequency;
    }
  });

  // 3. 정렬 및 Top N 추출
  return Object.entries(frequencyMap)
    .sort(([, a], [, b]) => b - a) // 내림차순 정렬
    .slice(0, topN)
    .map(([mode, score]) => ({ mode, score }));
}

```

### 3. 연관 규칙 알고리즘 (Apriori Logic)

`공정특성`이 주어졌을 때 `고장형태`가 나올 조건부 확률(신뢰도)을 계산합니다.

```typescript
/**
 * 연관 규칙 기반 추천 (Association Rule Learning)
 * 규칙: IF [제품특성 A] THEN [고장형태 B] (신뢰도 %)
 */
function recommendByAssociationRule(
  historyData: FMEARelation[],
  targetChar: string
) {
  const totalCount = historyData.length;
  
  // A: 제품특성이 targetChar인 경우의 수 (Support A)
  const countA = historyData.filter(d => d.productChar === targetChar).length;
  
  if (countA === 0) return []; // 데이터 없음

  // 고장형태별로 그룹화하여 (A ∩ B) 계산
  const failureModes = [...new Set(historyData.map(d => d.failureMode))];
  
  const rules = failureModes.map(mode => {
    // A와 B가 같이 등장한 횟수
    const countAB = historyData.filter(
        d => d.productChar === targetChar && d.failureMode === mode
    ).length;

    if (countAB === 0) return null;

    // 신뢰도 (Confidence) = P(B|A) = count(A∩B) / count(A)
    const confidence = countAB / countA;
    
    // 지지도 (Support) = P(A∩B) = count(A∩B) / Total
    const support = countAB / totalCount;

    return {
      rule: `${targetChar} → ${mode}`,
      result: mode,
      confidence: parseFloat(confidence.toFixed(2)), // 예: 0.85 (85%)
      support: parseFloat(support.toFixed(4)),
      count: countAB
    };
  });

  // 신뢰도가 높은 순서대로 정렬 (예: 0.5 이상만 추천)
  return rules
    .filter(r => r !== null && r.confidence > 0.3) // 최소 임계값 설정
    .sort((a, b) => b!.confidence - a!.confidence);
}

```

### 4. 텍스트 유사도 기반 추천 (Levenshtein)

사용자가 새로운 단어를 입력했을 때, 기존 데이터베이스의 유사한 표준 용어를 추천합니다.

```typescript
// npm install fast-levenshtein 필요
import { get } from 'fast-levenshtein';

function recommendSimilarTerm(input: string, dbTerms: string[]) {
  return dbTerms
    .map(term => ({
      term,
      distance: get(input, term) // 편집 거리 (작을수록 유사)
    }))
    .filter(item => item.distance <= 2) // 철자가 2개 이내로 다른 것만 필터
    .sort((a, b) => a.distance - b.distance);
}

// 예시: 사용자가 "크랙" 입력 -> DB의 "Crack", "균열" 등 추천 가능

```

---

## 📅 로드맵 제안

**1단계: 데이터 축적기 (현재)**

* 기능: 사용자가 선택한 FMEA 관계(특성-고장-원인)를 DB에 저장합니다.
* 구현: 위 `FMEARelation` 구조로 로그를 쌓습니다.
* **Action:** 사용자 입력 시 "표준 용어"를 선택하게 유도하여 데이터 품질을 높이세요.

**2단계: 통계적 추천기 (1~2개월 차)**

* 기능: 위 `recommendByAssociationRule` 코드를 적용합니다.
* 효과: "이 공정에서는 주로 이런 불량이 발생합니다"라고 랭킹을 보여줍니다.

**3단계: 머신러닝 도입기 (3개월~ )**

* 기능: Python 서버(Flask/FastAPI)를 구축하고 `scikit-learn`의 **RandomForest**나 **XGBoost**를 도입합니다.
* 효과: 단순 빈도가 아니라, 공정 조건(온도, 압력 등 수치 데이터)까지 포함하여 고장 확률을 예측합니다.

### 💡 팁: Cold Start 문제 해결

처음에는 데이터가 없어서 추천이 안 됩니다. 이 경우 **"산업 표준(Generic) FMEA 데이터"**를 미리 시스템에 넣어두세요 (예: 사출 공정 일반 불량 리스트). 이것을 **기본 규칙(Base Rule)**으로 사용하다가, 실제 데이터가 쌓이면 **사내 데이터(Company Specific)** 비중을 높이는 하이브리드 방식이 가장 좋습니다.

---

## 🌳 Tree View 기반 AI 추천 UX (Phase 2 핵심)

### 설계 철학

기존 모달 방식이 아닌 **Tree View 인라인 추천** 방식을 채택합니다.
FMEA의 계층적 구조(공정 → 작업요소 → 4M → 고장)에 자연스럽게 녹아드는 UX를 제공합니다.

### UI/UX 플로우

```
┌─────────────────────────────────────────────────────────────┐
│  🌳 FMEA 구조 트리                                          │
├─────────────────────────────────────────────────────────────┤
│  📦 타이어제조공정 (완제품)                                  │
│  └─📁 C1 사출성형 (메인공정)                                │
│     └─🔧 금형온도관리 (작업요소)                            │
│        └─⚙️ MN (4M - 사람)                                 │
│           │                                                 │
│           ├─ 작업자 실수 ✓ (기존 입력)                      │
│           │                                                 │
│           └─✨ AI 추천 (TOP 3):                             │
│              ├─🥇 교육 미흡 (87%) [수용]                    │
│              ├─🥈 숙련도 부족 (72%) [수용]                  │
│              └─🥉 작업표준 미준수 (65%) [수용]              │
│              └─➕ 직접 입력...                              │
└─────────────────────────────────────────────────────────────┘
```

### 상호작용 방식

| 액션 | 동작 | 결과 |
|------|------|------|
| **[수용] 클릭** | 추천 항목 즉시 추가 | Tree에 노드 추가 + AI 학습 데이터 저장 |
| **더블클릭** | 인라인 편집 모드 | 추천 텍스트 수정 후 Enter로 확정 |
| **➕ 직접 입력** | 새 항목 입력창 | 추천에 없는 항목 직접 추가 |
| **무시** | 아무 동작 안함 | 추천은 유지, 다음 컨텍스트로 이동 |

### 추천 알고리즘 흐름

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  상위 노드      │     │  컨텍스트       │     │  AI 엔진        │
│  선택/확정      │────▶│  수집           │────▶│  추천 계산      │
│  (공정,4M 등)   │     │  (processName,  │     │  (빈도+연관)    │
└─────────────────┘     │   m4Category)   │     └─────────────────┘
                        └─────────────────┘              │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Tree 노드에    │◀────│  TOP 3 추출     │◀────│  랭킹 정렬      │
│  추천 표시      │     │  + 신뢰도 계산  │     │  (신뢰도 기준)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 컴포넌트 구조

```typescript
// 1. TreeAIRecommend.tsx - AI 추천 표시 컴포넌트
interface TreeAIRecommendProps {
  context: {
    processName?: string;
    workElement?: string;
    m4Category?: string;
    parentItem?: string;
  };
  recommendType: 'cause' | 'mode' | 'effect';
  onAccept: (value: string) => void;    // 수용 시
  onModify: (original: string, modified: string) => void;  // 수정 시
  onAddNew: (value: string) => void;    // 직접 입력 시
}

// 2. 추천 결과 타입
interface AIRecommendation {
  rank: 1 | 2 | 3;
  value: string;
  confidence: number;   // 0.0 ~ 1.0 (신뢰도)
  frequency: number;    // 빈도 수
  source: 'history' | 'rule' | 'default';
}
```

### 추천 위치별 적용

| FMEA 단계 | Tree 위치 | 추천 대상 |
|-----------|-----------|-----------|
| 구조분석 (2단계) | 메인공정 하위 | 작업요소 TOP 3 |
| 기능분석 (3단계) | 기능 하위 | 요구사항 TOP 3 |
| 기능분석 (3단계) | 요구사항 하위 | 제품특성 TOP 3 |
| 고장분석-1L | 요구사항 하위 | 고장영향(FE) TOP 3 |
| 고장분석-2L | 제품특성 하위 | 고장형태(FM) TOP 3 |
| 고장분석-3L | 고장형태 하위 | 고장원인(FC) TOP 3 |

### 시각적 디자인

```css
/* AI 추천 영역 스타일 */
.ai-recommend-section {
  margin-left: 24px;
  padding: 8px;
  background: linear-gradient(to right, #f3e5f5, #ede7f6);
  border-left: 3px solid #9c27b0;
  border-radius: 4px;
}

/* 추천 항목 스타일 */
.ai-recommend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: white;
  border: 1px dashed #ce93d8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-recommend-item:hover {
  background: #f3e5f5;
  border-style: solid;
}

/* 순위 뱃지 */
.rank-badge-1 { background: #ffd700; } /* 금 */
.rank-badge-2 { background: #c0c0c0; } /* 은 */
.rank-badge-3 { background: #cd7f32; } /* 동 */

/* 신뢰도 바 */
.confidence-bar {
  width: 40px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}
.confidence-fill {
  height: 100%;
  background: #4caf50;
  border-radius: 2px;
}
```

### Cold Start 해결 전략

신규 시스템에서 학습 데이터가 없을 때:

1. **산업 표준 데이터 사전 로드**
   - 자동차 산업 FMEA 표준 불량 유형 100선
   - 제조업 공통 4M 원인 분류 체계

2. **기본 추천 규칙 (Default Rules)**
   ```typescript
   const DEFAULT_RULES = {
     'MN': ['작업자 실수', '교육 미흡', '숙련도 부족'],
     'MC': ['설비 마모', '설비 고장', '정비 미흡'],
     'IM': ['원자재 불량', '부자재 불량', '재료 혼입'],
     'EN': ['온도 부적합', '습도 부적합', '이물 혼입'],
   };
   ```

3. **하이브리드 가중치 적용**
   ```
   최종점수 = (사내 데이터 점수 × 0.7) + (산업 표준 점수 × 0.3)
   
   → 데이터가 쌓일수록 사내 데이터 가중치를 0.9까지 자동 상향
   ```

---

## ⚡ Phase 2 구현 범위 (즉시 개발)

### 필수 구현 항목

| No | 항목 | 예상 시간 | 우선순위 |
|----|------|----------|----------|
| 1 | `TreeAIRecommend.tsx` 컴포넌트 생성 | 2시간 | 🔴 |
| 2 | Tree Panel에 AI 추천 섹션 통합 | 1시간 | 🔴 |
| 3 | 추천 클릭 → 즉시 추가 로직 | 1시간 | 🔴 |
| 4 | 인라인 수정 기능 | 1시간 | 🟡 |
| 5 | AI 학습 데이터 저장 (수용 시) | 30분 | 🔴 |
| 6 | Default Rules 초기 데이터 | 30분 | 🟡 |
| 7 | 신뢰도 시각화 (진행바) | 30분 | 🟢 |
| 8 | 테스트 및 커밋 | 30분 | 🔴 |

**총 예상 시간: 7-8시간**

### 개발 순서

```
1. TreeAIRecommend.tsx 컴포넌트 생성
   ↓
2. 기존 TreePanel.tsx에 AI 추천 섹션 렌더링 추가
   ↓
3. 추천 항목 클릭 시 handleAccept() → 부모 컴포넌트로 콜백
   ↓
4. 워크시트 상태에 새 노드 추가 + AI 히스토리 저장
   ↓
5. 테스트 → 커밋 → 코드프리즈
```

---

---

## 🤖 AI 모델 선택 전략

### Phase별 모델 적용 로드맵

데이터 축적 수준과 시스템 성숙도에 따라 **점진적으로 모델을 고도화**합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│  [현재] Phase 1-2: 통계 기반 (프론트엔드 Only)                  │
├─────────────────────────────────────────────────────────────────┤
│  • 빈도 분석 + 연관 규칙 마이닝 (JavaScript)                    │
│  • localStorage 기반 학습 데이터 저장                           │
│  • 서버 없이 브라우저에서 모두 처리                             │
│  • 비용: 무료                                                   │
└─────────────────────────────────────────────────────────────────┘
                             ↓ (3개월 후)
┌─────────────────────────────────────────────────────────────────┐
│  [중기] Phase 3: ML 모델 (Python 백엔드)                        │
├─────────────────────────────────────────────────────────────────┤
│  • FastAPI + scikit-learn                                       │
│  • Random Forest / XGBoost 분류기                               │
│  • TF-IDF 기반 텍스트 유사도                                    │
│  • PostgreSQL 학습 데이터 저장                                  │
│  • 비용: 서버 운영비                                            │
└─────────────────────────────────────────────────────────────────┘
                             ↓ (6개월 후)
┌─────────────────────────────────────────────────────────────────┐
│  [장기] Phase 4: LLM 연동 (선택)                                │
├─────────────────────────────────────────────────────────────────┤
│  • OpenAI GPT-4 또는 Claude API                                 │
│  • 자연어 → FMEA 구조 자동 변환                                 │
│  • "이 공정에서 예상되는 고장 시나리오를 작성해줘"              │
│  • 비용: API 호출 비용 (토큰당 과금)                            │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 1-2: 통계 기반 모델 (현재 구현)

| 모델 | 알고리즘 | 용도 | 구현 상태 |
|------|----------|------|----------|
| **빈도 분석** | 단순 집계 | 가장 많이 사용된 항목 추천 | ✅ 완료 |
| **연관 규칙** | Apriori | 함께 자주 선택되는 패턴 발견 | ✅ 완료 |
| **조건부 확률** | P(B\|A) | 특정 조건에서 발생 확률 계산 | ✅ 완료 |

```typescript
// 구현된 함수 (ai-recommendation.ts)
getFrequentFailureModes(context)   // 빈도 기반 FM 추천
getFrequentFailureCauses(context)  // 빈도 기반 FC 추천
getFrequentFailureEffects(context) // 빈도 기반 FE 추천
getAssociatedItems(antecedent, type) // 연관 규칙 기반 추천
recommendByContext(context)        // 통합 추천 (빈도+규칙)
```

**선택 이유**:
- ✅ 데이터가 적어도 작동 (Cold Start 대응)
- ✅ 결과가 직관적이고 설명 가능 (Explainable AI)
- ✅ 프론트엔드만으로 구현 가능 (서버 불필요)
- ✅ 실시간 추천 가능 (계산 속도 빠름)

### Phase 3: ML 모델 (중기)

| 모델 | 라이브러리 | 용도 | 적합도 |
|------|-----------|------|--------|
| **Naive Bayes** | `natural` (JS), `scikit-learn` (Python) | 텍스트 분류 | ⭐⭐⭐⭐ |
| **Random Forest** | `ml-cart` (JS), `scikit-learn` (Python) | 다중 조건 분류 | ⭐⭐⭐⭐⭐ |
| **XGBoost** | `xgboost` (Python) | 고성능 분류 | ⭐⭐⭐⭐⭐ |
| **TF-IDF + 코사인 유사도** | `natural` (JS), `gensim` (Python) | 유사 항목 검색 | ⭐⭐⭐⭐ |

**Random Forest 선택 이유**:
- FMEA 데이터는 **범주형(Categorical)** 변수가 많음
- 의사결정나무 기반 → 범주형 데이터에 최적
- 과적합 방지 + 변수 중요도 파악 가능

### Phase 4: 딥러닝/LLM (장기)

| 모델 | 용도 | 비용 | 적합도 |
|------|------|------|--------|
| **Word2Vec / FastText** | 의미적 유사도 계산 | 무료 (자체 학습) | ⭐⭐⭐ |
| **Knowledge Graph + GNN** | FMEA 관계 추론 | 무료 (자체 구축) | ⭐⭐⭐⭐ |
| **GPT-4 / Claude API** | 자연어 시나리오 생성 | 유료 (토큰당) | ⭐⭐⭐⭐⭐ |

**LLM 활용 시나리오**:
```
입력: "사출 공정에서 금형 온도가 높을 때 예상되는 고장을 알려줘"

출력:
- 고장형태: 제품 변형, 버(Burr) 발생, 미성형
- 고장원인: 냉각수 온도 이상, 냉각 시간 부족
- 고장영향: 치수 불량, 외관 불량
- 권장 조치: 금형 온도 모니터링 강화, 냉각 시스템 점검
```

### 모델 선택 의사결정 트리

```
Q1. 데이터가 100건 이상인가?
    │
    ├─ NO → 빈도 분석 + 기본 규칙 (Phase 1)
    │
    └─ YES → Q2. 서버 인프라가 있는가?
              │
              ├─ NO → 연관 규칙 마이닝 (Phase 2)
              │
              └─ YES → Q3. 정확도가 90% 이상 필요한가?
                        │
                        ├─ NO → Random Forest (Phase 3)
                        │
                        └─ YES → Q4. 자연어 생성이 필요한가?
                                  │
                                  ├─ NO → XGBoost + TF-IDF (Phase 3)
                                  │
                                  └─ YES → LLM API (Phase 4)
```

### 모델별 성능 비교 (예상)

| 모델 | 정확도 | 속도 | 비용 | 설명가능성 |
|------|--------|------|------|-----------|
| 빈도 분석 | 60-70% | ⚡ 매우 빠름 | 무료 | ⭐⭐⭐⭐⭐ |
| 연관 규칙 | 70-80% | ⚡ 빠름 | 무료 | ⭐⭐⭐⭐⭐ |
| Naive Bayes | 75-85% | ⚡ 빠름 | 서버비 | ⭐⭐⭐⭐ |
| Random Forest | 80-90% | 보통 | 서버비 | ⭐⭐⭐⭐ |
| XGBoost | 85-95% | 보통 | 서버비 | ⭐⭐⭐ |
| LLM (GPT-4) | 90-95% | 느림 | API비용 | ⭐⭐ |

### 권장 기술 스택 요약

| 단계 | 모델 | 환경 | 라이브러리 | 비용 |
|------|------|------|-----------|------|
| **Phase 1-2 (현재)** | 빈도 + 연관규칙 | JavaScript (프론트) | 자체 구현 | 무료 |
| **Phase 3 (3개월)** | Random Forest | Python (백엔드) | scikit-learn | 서버비 |
| **Phase 4 (6개월)** | GPT-4 / Claude | API 연동 | OpenAI / Anthropic | API비용 |

---

## 💡 결론

### 현재 구현된 AI (Phase 1-2)
- ✅ **빈도 기반 추천**: 가장 많이 사용된 항목 TOP 3 추천
- ✅ **연관 규칙 추천**: 함께 자주 선택되는 패턴 발견
- ✅ **Tree View 인라인 추천**: 모달 없이 즉시 추천 표시

### 향후 개발 계획
| 시기 | 목표 | 예상 효과 |
|------|------|----------|
| 3개월 | Random Forest 도입 | 정확도 80→90% 향상 |
| 6개월 | LLM 연동 | 자연어 시나리오 자동 생성 |

**현재 구현된 통계 기반 모델만으로도 실무에서 충분히 유용합니다.**
데이터가 축적될수록 추천 정확도가 자동으로 향상됩니다.

---

이 구조로 개발을 시작하시겠습니까? 아니면 특정 언어(Python/Java 등)에 맞는 라이브러리 추천이 더 필요하신가요?