# CP ↔ PFMEA 연동 PRD (Product Requirements Document)

> **버전**: 2.0  
> **작성일**: 2026-01-26  
> **목적**: Control Plan(관리계획서)과 PFMEA 간 데이터 연동 구현

---

## 1. 핵심 매핑 정리

### 1.1 CP → PFMEA 컬럼 매핑 (확정)

| CP 컬럼 | PFMEA 위치 | 단계 | 연동 방향 | 비고 |
|---------|-----------|------|----------|------|
| **공정번호** | 메인공정명 (NO) | 2단계 구조분석 | ↔ 양방향 | 공통 키 |
| **공정명** | 메인공정명 | 2단계 구조분석 | ↔ 양방향 | 공통 키 |
| **설비/TOOL** | **작업요소 (4M=MC)** | 2단계 구조분석 | ↔ 양방향 | 4M 중 MC=Machine=설비 |
| **부품명** | ❌ PFMEA 표시 안함 | - | - | CP/PFD 전용 |
| **공정설명** | **공정기능** | 3단계 기능분석 | ↔ 양방향 | |
| **제품특성** | 제품특성 | 3단계 기능분석 | ↔ 양방향 | |
| **공정특성** | 공정특성 | 3단계 기능분석 | ↔ 양방향 | |
| **특별특성** | 특별특성 | 5단계 리스크분석 | ↔ 양방향 | IC/CC/SC |
| **EP** | **예방관리(PC)** | 5단계 리스크분석 | CP→PFMEA | Error Proofing |
| **자동검사장치** | **검출관리(DC)** | 5단계 리스크분석 | CP→PFMEA | |
| 관리방법 | - | CP 전용 | - | |
| 대응계획 | - | CP 전용 | - | |

### ⚠️ 제약사항: PFMEA 컬럼 절대 변경 불가

```
★★★ PFMEA 컬럼 고정 ★★★

- PFMEA 워크시트의 컬럼 구조는 현재 상태로 고정
- 신규 컬럼 추가 불가
- CP 연동은 기존 PFMEA 컬럼에만 매핑
```

### 1.2 4M 체계와 설비 연동

```
★★★ PFMEA 4M 체계 ★★★

4M 코드   | 의미        | CP 연동
----------|-------------|------------------
MC        | Machine     | ✅ 설비/금형/JIG → CP "설비/TOOL"
MN        | Man         | ❌ CP 연동 X
IM        | In-Material | 연동 가능 (부자재)
EN        | Environment | 연동 가능 (환경)

→ CP의 "설비/TOOL" = PFMEA "작업요소" 중 4M=MC인 행과 동기화
```

### 1.3 EP/자동검사 연동

```
★★★ 검사장치 연동 ★★★

CP             | PFMEA              | 설명
---------------|--------------------|-----------------
EP 체크 (●)    | 예방관리(PC)       | Error Proofing 장치
자동검사 (●)   | 검출관리(DC)       | 자동검사 장치

→ EP 장치가 있으면 PFMEA 예방관리에 "Poka-Yoke" 등 표시
→ 자동검사 장치가 있으면 PFMEA 검출관리에 장치명 표시
```

---

## 2. 화면 설계

### 2.1 PFMEA 워크시트 수정 후 구조

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                2단계 구조분석                      │       3단계 기능분석            │
├────────────┬──────────┬────┬───────────┬──────────┼────┬──────┬──────┬──────┬───────┤
│완제품공정명│NO+공정명 │ 4M │ 작업요소   │ 부품명   │구분│완제품│요구  │공정  │제품   │
│            │          │    │ (설비포함) │ (노란)   │    │기능  │사항  │기능  │특성   │
│            │          │    │ [MC]설비명 │ CP연동   │    │      │      │(=CP  │       │
│            │          │    │            │          │    │      │      │공정설명)│    │
└────────────┴──────────┴────┴───────────┴──────────┴────┴──────┴──────┴──────┴───────┘
                             ↑              ↑                        ↑
                          설비 연동      부품명 연동            공정설명 연동


┌──────────────────────────────────────────────────────────────────────────────────────┐
│                             5단계 리스크분석                                         │
├─────────────────────────┬─────────────────────────┬──────────────────────────────────┤
│      현재 예방관리       │      현재 검출관리       │         리스크 평가              │
├────────────┬────────────┼────────────┬────────────┼────┬────┬────────┬──────────────┤
│ 예방관리(PC)│   발생도   │ 검출관리(DC)│   검출도   │ AP │ S  │특별특성│   습득교훈   │
│ (=CP EP)   │            │ (=CP자동검사)│           │    │    │        │              │
└────────────┴────────────┴────────────┴────────────┴────┴────┴────────┴──────────────┘
       ↑                          ↑                                ↑
    EP 연동                 자동검사 연동                     특별특성 연동
```

### 2.2 노란색 배경 스타일 (CP 연동 컬럼)

```css
/* CP 연동 컬럼 - 부품명만 신규 추가 */
.cp-sync-column {
  background: #fff9c4 !important;  /* 연한 노란색 */
  border-color: #fbc02d;
}

.cp-sync-header {
  background: #fdd835 !important;  /* 진한 노란색 */
  color: #333;
}
```

---

## 3. 데이터 모델

### 3.1 CP Item (현재 + 확장)

```typescript
export interface CPItem {
  id: string;
  cpId: string;
  
  // ===== 공정정보 (PFMEA 연동) =====
  processNo: string;        // → PFMEA 메인공정 NO
  processName: string;      // → PFMEA 메인공정명
  processLevel: string;     // Main/Sub/외주
  processDesc: string;      // → PFMEA 공정기능
  
  // ===== CP 신규 필드 (PFMEA 연동) =====
  partName: string;         // ✅ 부품명 → PFMEA 신규 컬럼 (노란색)
  equipment: string;        // ✅ 설비/TOOL → PFMEA 작업요소 (4M=MC)
  
  workElement: string;      // 작업요소명
  
  // ===== 검출장치 (PFMEA 리스크분석 연동) =====
  detectorEp: boolean;      // ✅ EP → PFMEA 예방관리(PC)
  detectorAuto: boolean;    // ✅ 자동검사 → PFMEA 검출관리(DC)
  epDeviceIds?: string[];   // EP 장치 ID 목록
  autoDeviceIds?: string[]; // 자동검사 장치 ID 목록
  
  // ===== 관리항목 (PFMEA 연동) =====
  productChar: string;      // → PFMEA 제품특성
  processChar: string;      // → PFMEA 공정특성
  specialChar: string;      // → PFMEA 특별특성 (IC/CC/SC)
  
  // ... CP 전용 필드들
}
```

### 3.2 동기화 매핑 테이블

```typescript
const CP_PFMEA_SYNC_MAP = {
  // 구조분석 (2단계)
  'processNo': { pfmeaField: 'l2No', direction: 'bidirectional' },
  'processName': { pfmeaField: 'l2Name', direction: 'bidirectional' },
  'equipment': { pfmeaField: 'l3Name', condition: '4M=MC', direction: 'bidirectional' },
  'partName': { pfmeaField: 'cpPartName', direction: 'cp-to-pfmea', display: 'yellow' },
  
  // 기능분석 (3단계)
  'processDesc': { pfmeaField: 'l2FuncName', direction: 'bidirectional' },
  'productChar': { pfmeaField: 'l2ProductChar', direction: 'bidirectional' },
  'processChar': { pfmeaField: 'l3ProcessChar', direction: 'bidirectional' },
  
  // 리스크분석 (5단계)
  'specialChar': { pfmeaField: 'specialChar', direction: 'bidirectional' },
  'detectorEp': { pfmeaField: 'preventionControl', direction: 'cp-to-pfmea' },
  'detectorAuto': { pfmeaField: 'detectionControl', direction: 'cp-to-pfmea' },
};
```

---

## 4. 구현 계획

### Phase 1: 기본 연동 (완료 ✅)

| 순서 | 작업 | 파일 | 상태 |
|------|------|------|------|
| 1 | CPItem에 partName 필드 추가 | `types.ts` | ✅ 완료 |
| 2 | CP 워크시트에 부품명 컬럼 UI 추가 | `cpConstants.ts` | ✅ 완료 |
| 3 | createEmptyItem에 partName 기본값 추가 | `utils/index.ts` | ✅ 완료 |
| 4 | syncPfmeaCP.ts에 EP/자동검사 연동 로직 추가 | `syncPfmeaCP.ts` | ✅ 완료 |

### Phase 2: EP/자동검사 연동 (완료 ✅)

| 순서 | 작업 | 파일 | 상태 |
|------|------|------|------|
| 1 | EP 체크 시 예방관리에 "Poka-Yoke" 표시 | `syncPfmeaCP.ts` | ✅ 완료 |
| 2 | 자동검사 체크 시 검출관리에 "자동검사" 표시 | `syncPfmeaCP.ts` | ✅ 완료 |

---

## 5. 테스트 시나리오

### TC-1: CP에서 설비 입력 → PFMEA 작업요소 확인
1. CP 워크시트에서 설비/TOOL 입력 (예: "Cutting MC")
2. 동기화 실행
3. PFMEA 워크시트에서 작업요소 컬럼 확인
4. **예상 결과**: "[MC] Cutting MC"로 표시됨

### TC-2: CP 부품명 → PFMEA 노란색 컬럼
1. CP에서 부품명 입력 (예: "스틸 파이프")
2. PFMEA 전체보기 탭 열기
3. **예상 결과**: 부품명 컬럼이 노란색 배경으로 표시되고 "스틸 파이프" 표시

### TC-3: CP EP → PFMEA 예방관리
1. CP에서 EP 체크하고 장치 선택
2. PFMEA 리스크분석 확인
3. **예상 결과**: 예방관리(PC)에 "Poka-Yoke: [장치명]" 표시

### TC-4: CP 자동검사 → PFMEA 검출관리
1. CP에서 자동검사 체크하고 장치 선택
2. PFMEA 리스크분석 확인
3. **예상 결과**: 검출관리(DC)에 "[장치명] 자동검사" 표시

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-01-26 | 2.0 | 전체 매핑 재정의 (설비=작업요소, 공정설명=공정기능, EP=예방관리, 자동검사=검출관리) |
| 2026-01-26 | 1.0 | 초안 작성 |

---

**작성자**: AI Assistant  
**검토자**: -  
**승인자**: -
