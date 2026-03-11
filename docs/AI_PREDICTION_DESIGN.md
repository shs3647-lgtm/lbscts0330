# FMEA AI 고장 예측 시스템 설계

## 📊 개요

FMEA 관계형 데이터를 축적하여 AI가 자동으로 고장을 예측/추천하는 시스템

### 핵심 아이디어
```
[관계형 데이터 축적] → [패턴 학습] → [자동 추천] → [시간 단축 + 일관성]
```

---

## 🧠 AI 모델 추천 (단계별)

### 1단계: Rule-Based 시스템 (즉시 구현 가능)
```
장점: 간단, 빠름, 설명 가능
단점: 수동 규칙 정의 필요

구현:
- 동일 요구사항 → 동일 고장영향 (✅ 이미 구현)
- 동일 제품특성 → 동일 고장형태
- 동일 공정특성 → 동일 고장원인
```

### 2단계: 협업 필터링 (Collaborative Filtering)
```
장점: 패턴 자동 발견, 구현 용이
단점: Cold Start 문제

적용:
- "이 제품특성을 선택한 사용자들은 이런 고장형태도 선택했습니다"
- 유사 공정에서 발생한 고장 패턴 추천

라이브러리:
- JavaScript: ml-kmeans, brain.js
- Python API: scikit-learn, surprise
```

### 3단계: Decision Tree / Random Forest
```
장점: 해석 가능, 빠른 학습
단점: 텍스트 처리 별도 필요

적용:
- 입력: [공정유형, 제품유형, 특성유형, 4M분류]
- 출력: [예상 고장형태, 고장원인, 심각도]

라이브러리:
- JavaScript: ml-cart, random-forest
- Python API: scikit-learn RandomForestClassifier
```

### 4단계: 텍스트 유사도 (TF-IDF + Cosine Similarity)
```
장점: 텍스트 기반 추천, 직관적
단점: 의미 이해 한계

적용:
- "타이어 사출" → 유사한 기존 FMEA 검색
- 비슷한 요구사항/특성에서 발생한 고장 추천

라이브러리:
- JavaScript: natural, compromise
- Python API: scikit-learn TfidfVectorizer
```

### 5단계: Word2Vec / Embedding
```
장점: 의미적 유사성 포착
단점: 학습 데이터 필요

적용:
- 단어 임베딩으로 유사 개념 발견
- "균열" ≈ "크랙" ≈ "파손" 자동 인식

라이브러리:
- JavaScript: word2vec (npm)
- Python API: gensim, spacy
```

### 6단계: Knowledge Graph + GNN
```
장점: 관계 구조 학습, 추론 가능
단점: 복잡한 구현

적용:
- 제품특성 → 고장형태 → 고장원인 관계 그래프
- 새로운 연결 예측 (Link Prediction)

라이브러리:
- Python: PyTorch Geometric, DGL
- Neo4j + GraphQL
```

### 7단계: Transformer / LLM (최종)
```
장점: 복잡한 패턴, 자연어 이해
단점: 리소스 많이 필요

적용:
- 자연어로 고장 시나리오 생성
- "이 공정에서 발생 가능한 모든 고장을 예측해줘"

라이브러리:
- OpenAI API, Claude API
- Hugging Face Transformers
- LangChain
```

---

## 🏗️ 추천 구현 순서

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Rule-Based (즉시)                                  │
│  - 동일 이름 자동 선택 ✅                                    │
│  - 빈도 기반 추천 (가장 많이 사용된 항목)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: 패턴 매칭 (1-2주)                                  │
│  - 히스토리 저장 (어떤 조합이 함께 선택되었나)               │
│  - 연관 규칙 마이닝 (Apriori 알고리즘)                       │
│  - "이 항목과 함께 자주 선택되는 항목" 추천                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: ML 기반 추천 (1-2개월)                             │
│  - 텍스트 유사도 (TF-IDF)                                   │
│  - 협업 필터링                                              │
│  - Random Forest 분류기                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: 딥러닝 (3-6개월)                                   │
│  - Knowledge Graph                                          │
│  - GNN (Graph Neural Network)                               │
│  - LLM 연동 (GPT, Claude)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ AI 모델 기술 스택 (Phase 2 구현)

### 프론트엔드 (JavaScript/TypeScript)
```
┌─────────────────────────────────────────────────────────────────────┐
│  📦 Core Libraries                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  • ml-matrix        : 행렬 연산, 유사도 계산                         │
│  • simple-statistics: 통계 분석, 빈도 계산                           │
│  • ml-cart          : Decision Tree 분류기                          │
│  • apriori          : 연관 규칙 마이닝                               │
│  • lodash           : 데이터 처리 유틸리티                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 자체 구현 모듈 (Phase 2)
```typescript
// src/lib/ai-recommendation.ts
export interface AIRecommendationEngine {
  // 1. 히스토리 관리
  saveFailureRelation(relation: FailureRelation): void;
  getHistory(): FailureRelation[];
  
  // 2. 빈도 기반 추천
  getFrequentFailureModes(context: RecommendContext): RankedItem[];
  getFrequentFailureCauses(context: RecommendContext): RankedItem[];
  getFrequentFailureEffects(context: RecommendContext): RankedItem[];
  
  // 3. 연관 규칙 추천
  getAssociatedItems(antecedent: string[], type: 'mode' | 'cause' | 'effect'): AssociationResult[];
  
  // 4. 컨텍스트 기반 추천
  recommendByContext(context: FMEAContext): FullRecommendation;
}

// 추천 컨텍스트
interface RecommendContext {
  processType?: string;      // 공정 유형
  workElement?: string;      // 작업요소
  m4Category?: string;       // 4M
  functionType?: string;     // 기능 유형
  requirement?: string;      // 요구사항
}

// 추천 결과
interface RankedItem {
  value: string;
  frequency: number;
  confidence: number;
  source: 'history' | 'rule' | 'similar';
}
```

### 데이터 흐름
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   FMEA 작성     │────▶│   관계 저장     │────▶│   히스토리 DB   │
│   (사용자)      │     │   (자동)        │     │   (localStorage)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   추천 표시     │◀────│   AI 엔진       │◀────│   패턴 분석     │
│   (모달/셀)     │     │   (실시간)      │     │   (빈도/연관)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 📦 데이터 구조 설계

### 관계형 데이터 스키마
```typescript
// 고장 관계 데이터
interface FailureRelation {
  id: string;
  
  // 구조
  processType: string;      // 공정 유형 (사출, 조립, 도장 등)
  workElementType: string;  // 작업요소 유형
  m4Category: string;       // 4M 분류
  
  // 기능
  functionType: string;     // 기능 유형
  requirementType: string;  // 요구사항 유형
  productCharType: string;  // 제품특성 유형
  processCharType: string;  // 공정특성 유형
  
  // 고장
  failureEffect: string;    // 고장영향
  failureMode: string;      // 고장형태
  failureCause: string;     // 고장원인
  
  // 위험
  severity: number;         // 심각도
  occurrence: number;       // 발생도
  detection: number;        // 검출도
  
  // 메타
  projectId: string;
  createdAt: Date;
  frequency: number;        // 사용 빈도
}

// 연관 규칙
interface AssociationRule {
  antecedent: string[];     // 조건 (예: ['타이어', '사출'])
  consequent: string[];     // 결과 (예: ['균열', '변형'])
  support: number;          // 지지도
  confidence: number;       // 신뢰도
  lift: number;             // 향상도
}
```

### 추천 API 인터페이스
```typescript
interface PredictionRequest {
  context: {
    processName?: string;
    workElement?: string;
    productChar?: string;
    processChar?: string;
    requirement?: string;
  };
  type: 'failureEffect' | 'failureMode' | 'failureCause' | 'severity';
  limit?: number;
}

interface PredictionResponse {
  recommendations: {
    value: string;
    confidence: number;     // 0-1
    reason: string;         // 추천 이유
    source: 'rule' | 'pattern' | 'ml' | 'llm';
  }[];
}
```

---

## 🔧 즉시 구현 가능한 기능

### 1. 빈도 기반 추천
```typescript
// 가장 많이 사용된 고장형태 추천
function getTopFailureModes(productChar: string, limit = 5): string[] {
  const history = getHistoryByProductChar(productChar);
  return history
    .reduce((acc, h) => {
      acc[h.failureMode] = (acc[h.failureMode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([mode]) => mode);
}
```

### 2. 연관 규칙 기반 추천
```typescript
// "이 제품특성 선택 시 자주 함께 선택되는 고장형태"
function getAssociatedFailureModes(productChar: string): string[] {
  const rules = getAssociationRules();
  return rules
    .filter(r => r.antecedent.includes(productChar))
    .filter(r => r.confidence > 0.7)
    .flatMap(r => r.consequent);
}
```

### 3. 유사 프로젝트 기반 추천
```typescript
// 비슷한 공정에서 발생한 고장 패턴 추천
function getSimilarProjectFailures(processName: string): FailureRelation[] {
  const projects = getAllProjects();
  return projects
    .filter(p => calculateSimilarity(p.processName, processName) > 0.8)
    .flatMap(p => p.failures);
}
```

---

## 📚 추천 라이브러리

### JavaScript (프론트엔드)
| 라이브러리 | 용도 | 난이도 |
|-----------|------|--------|
| `natural` | NLP, TF-IDF, 토큰화 | ⭐⭐ |
| `brain.js` | 신경망 | ⭐⭐⭐ |
| `ml-kmeans` | 클러스터링 | ⭐⭐ |
| `ml-cart` | Decision Tree | ⭐⭐ |
| `compromise` | NLP, 텍스트 분석 | ⭐ |

### Python (백엔드 API)
| 라이브러리 | 용도 | 난이도 |
|-----------|------|--------|
| `scikit-learn` | ML 전반 | ⭐⭐ |
| `gensim` | Word2Vec, Doc2Vec | ⭐⭐⭐ |
| `spacy` | NLP | ⭐⭐ |
| `mlxtend` | 연관 규칙 | ⭐⭐ |
| `PyTorch Geometric` | GNN | ⭐⭐⭐⭐ |
| `LangChain` | LLM 연동 | ⭐⭐⭐ |

### 클라우드 서비스
| 서비스 | 용도 | 난이도 |
|--------|------|--------|
| OpenAI API | GPT 기반 예측 | ⭐ |
| Claude API | 추론 기반 예측 | ⭐ |
| AWS SageMaker | 커스텀 ML | ⭐⭐⭐⭐ |
| Google AutoML | 자동 ML | ⭐⭐ |

---

## 🎯 권장 로드맵

```
[현재] ─────────────────────────────────────────────────────────►
   │
   ├── Week 1-2: 히스토리 저장 구조 설계
   │   - FailureRelation 스키마 구현
   │   - localStorage → IndexedDB 마이그레이션
   │
   ├── Week 3-4: 빈도 기반 추천
   │   - 가장 많이 사용된 항목 추천
   │   - UI에 "추천" 배지 표시
   │
   ├── Month 2: 연관 규칙
   │   - Apriori 알고리즘 구현
   │   - "함께 자주 선택되는 항목" 추천
   │
   ├── Month 3: 텍스트 유사도
   │   - TF-IDF 기반 유사 항목 검색
   │   - 유사 프로젝트 추천
   │
   ├── Month 4-6: ML 모델
   │   - Random Forest 분류기
   │   - Python 백엔드 API
   │
   └── Month 6+: LLM 연동
       - GPT/Claude API 연동
       - 자연어 기반 고장 시나리오 생성
```

---

## 🌳 Tree View 기반 AI 추천 UX (Phase 2 핵심)

### 설계 방향

기존 **모달 팝업** 방식 대신 **Tree View 인라인** 방식으로 AI 추천을 제공합니다.
FMEA의 계층적 구조에 자연스럽게 녹아드는 직관적인 UX를 구현합니다.

### 비교: 모달 vs Tree View

| 구분 | 모달 방식 | Tree View 방식 (채택) |
|------|----------|----------------------|
| 작업 단계 | 셀 클릭 → 모달 열림 → 검색 → 선택 | Tree에서 TOP 3 바로 표시 → 클릭 |
| 맥락 인식 | 현재 위치와 분리됨 | 계층 구조에서 자연스러운 흐름 |
| 속도 | 느림 (팝업 대기) | 빠름 (즉시 표시) |
| 수정 용이성 | 다시 모달 열어야 함 | 인라인에서 바로 수정 |

### UI 플로우

```
┌──────────────────────────────────────────────────────────┐
│  🌳 FMEA 구조 트리                                       │
├──────────────────────────────────────────────────────────┤
│  📦 타이어제조공정 (완제품)                               │
│  └─📁 C1 사출성형 (메인공정)                             │
│     └─🔧 금형온도관리 (작업요소)                         │
│        └─⚙️ MN (4M - 사람)                              │
│           │                                              │
│           ├─ 작업자 실수 ✓ (기존 입력)                   │
│           │                                              │
│           └─🤖 AI 추천 TOP 3:                            │
│              ├─🥇 교육 미흡 (87%) [+]                    │
│              ├─🥈 숙련도 부족 (72%) [+]                  │
│              └─🥉 작업표준 미준수 (65%) [+]              │
│              └─➕ 직접 입력...                           │
└──────────────────────────────────────────────────────────┘
```

### 상호작용

| 액션 | 동작 | 결과 |
|------|------|------|
| **[+] 클릭** | 추천 항목 수용 | Tree에 노드 추가 + AI 학습 저장 |
| **더블클릭** | 인라인 편집 | 텍스트 수정 후 Enter로 확정 |
| **➕ 직접 입력** | 새 항목 추가 | 추천에 없는 항목 입력 |

### 추천 적용 위치

| FMEA 단계 | Tree 위치 | 추천 대상 |
|-----------|-----------|-----------|
| 구조분석 | 메인공정 하위 | 작업요소 TOP 3 |
| 기능분석 1L | 기능 하위 | 요구사항 TOP 3 |
| 기능분석 2L | 요구사항 하위 | 제품특성 TOP 3 |
| 고장분석 1L | 요구사항 하위 | 고장영향(FE) TOP 3 |
| 고장분석 2L | 제품특성 하위 | 고장형태(FM) TOP 3 |
| 고장분석 3L | 고장형태 하위 | 고장원인(FC) TOP 3 |

### 컴포넌트 설계

```typescript
// TreeAIRecommend.tsx
interface TreeAIRecommendProps {
  context: {
    processName?: string;
    workElement?: string;
    m4Category?: string;
    parentItem?: string;
  };
  type: 'cause' | 'mode' | 'effect' | 'requirement' | 'workElement';
  onAccept: (value: string) => void;
  onModify: (original: string, modified: string) => void;
  onAddNew: (value: string) => void;
  maxItems?: number; // 기본값: 3
}

// 사용 예시
<TreeAIRecommend
  context={{ processName: '사출성형', m4Category: 'MN' }}
  type="cause"
  onAccept={(val) => addCauseToWorksheet(val)}
/>
```

### Cold Start 해결

```typescript
// 초기 데이터가 없을 때 사용할 기본 규칙
const DEFAULT_RULES = {
  MN: ['작업자 실수', '교육 미흡', '숙련도 부족'],
  MC: ['설비 마모', '설비 고장', '정비 미흡'],
  IM: ['원자재 불량', '부자재 불량', '재료 혼입'],
  EN: ['온도 부적합', '습도 부적합', '이물 혼입'],
};

// 가중치 공식
최종점수 = (사내 데이터 × 0.7) + (산업 표준 × 0.3)
→ 데이터 축적 시 사내 데이터 가중치 자동 상향 (최대 0.9)
```

---

## ⚡ Phase 2 구현 체크리스트

| No | 항목 | 예상 시간 | 상태 |
|----|------|----------|------|
| 1 | `TreeAIRecommend.tsx` 컴포넌트 | 2시간 | ⬜ |
| 2 | TreePanel에 AI 섹션 통합 | 1시간 | ⬜ |
| 3 | 추천 클릭 → 즉시 추가 | 1시간 | ⬜ |
| 4 | 인라인 수정 기능 | 1시간 | ⬜ |
| 5 | AI 학습 데이터 저장 | 30분 | ⬜ |
| 6 | Default Rules 초기 데이터 | 30분 | ⬜ |
| 7 | 신뢰도 시각화 | 30분 | ⬜ |
| 8 | 테스트 및 커밋 | 30분 | ⬜ |

**총 예상: 7-8시간**

---

## 💡 결론

### 즉시 구현 (이미 완료)
✅ 동일 요구사항 → 동일 고장영향 자동 선택
✅ AI 추천 엔진 코어 (`ai-recommendation.ts`)
✅ 히스토리 저장 구조 (`FailureRelation`)

### Phase 2 (7시 이후 개발)
1. **Tree View AI 추천**: TOP 3 인라인 표시
2. **수용/수정 UX**: 클릭으로 즉시 추가, 더블클릭으로 수정
3. **Cold Start 해결**: 기본 규칙 데이터 사전 로드

### 중기 추천 (1-3개월)
4. **연관 규칙 고도화**: Apriori 알고리즘 최적화
5. **텍스트 유사도**: TF-IDF 기반 유사 항목 추천

### 장기 추천 (3-6개월)
6. **ML 모델**: Random Forest 기반 예측
7. **LLM 연동**: GPT/Claude로 시나리오 생성

---

*작성일: 2026-01-03*
*버전: 2.0.0 - Tree View 기반 추천 UX 추가*

