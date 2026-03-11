# 간트 차트(Gantt Chart) 코드 검토 및 UI 개선 TODO

## 📋 검토 일자: 2026-02-01

---

## 🎯 목표
- **기능 검증**: 간트 차트 핵심 기능이 제대로 작동하는지 확인
- **UI 일관성**: APQP 테마 컬러 및 CP WORKSHEET와 일관된 디자인으로 개선
- **화려함 줄이기**: 과도한 색상/효과 제거, 깔끔하고 전문적인 느낌

---

## 🎨 현재 색상 분석

### 📊 APQP/CP 워크시트 표준 색상
```
Primary Header:   #004d7a (진한 청록색 - No 컬럼)
Secondary Header: #005a8d (밝은 청록색 - WBS 헤더, 년도 헤더)
Light Blue:       #e1f5fe (밝은 파란색 - 월 헤더)
Dark Slate:       #slate-700/800 (어두운 회색 - WBS 컬럼, 기간 컬럼)
```

### 🎨 현재 간트 차트 색상 (과도하게 화려함)
```typescript
MILESTONE_COLORS:
  PROTO:  rgba(100, 116, 139, 0.85)  // 회색톤 ❌ 너무 어둡고 무거움
  PILOT1: rgba(59, 130, 246, 0.8)    // 파란색 ❌ 너무 밝고 강렬함
  PILOT2: rgba(59, 130, 246, 0.7)    // 연한 파란색 ❌ PILOT1과 구분 어려움
  PPAP:   rgba(37, 99, 235, 0.8)     // 진한 파란색 ❌ 과도한 블루 계열
  SOP:    rgba(22, 163, 74, 0.8)     // 녹색 ⚠️ 사용 가능하나 투명도 조정 필요

간트 바 색상:
  Plan Bar Background: #e2e8f0 (연한 회색) ✅ 괜찮음
  Plan Bar Border:     #64748b (회색) ✅ 괜찮음
  Actual Bar (G):      #22c55e (녹색) ⚠️ 너무 밝음
  Actual Bar (Y):      #3b82f6 (파란색) ⚠️ 너무 밝음
  Actual Bar (R):      #ef4444 (빨간색) ⚠️ 너무 밝음

드래그 핸들:
  Plan Start:   #22c55e (녹색) ❌ 너무 밝음
  Plan Finish:  #ef4444 (빨간색) ❌ 너무 밝음  
  Actual Finish: #f97316 (주황색) ❌ 너무 밝음

배경:
  Root Row:     bg-blue-600 ❌ 너무 강렬함
  Phase Row:    bg-yellow-300 ❌ 너무 밝고 눈부심
  Zebra Stripe: bg-[#f0f8ff] ⚠️ 사용 가능하나 좀 더 연하게
```

---

## ✅ 기능 확인 체크리스트

### 1. 핵심 기능 (우선순위 높음)
- [ ] **데이터 로드/저장**: JSON 파일 저장/불러오기 기능 테스트
- [ ] **Excel Import/Export**: Excel 파일 가져오기/내보내기 기능 테스트
- [ ] **드래그 앤 드롭**: Plan Start/Finish, Actual Finish 드래그 동작 확인
- [ ] **최소 기간 제약**: Start-Finish 간 최소 7일 제약 확인
- [ ] **Rollup 계산**: 부모 태스크의 날짜가 자식 기준으로 자동 계산되는지 확인
- [ ] **접기/펼치기**: 그룹 접기/펼치기(Collapse/Expand) 기능 확인
- [ ] **컬럼 토글**: 컬럼 보기/숨기기 기능 확인

### 2. UI/UX 기능
- [ ] **사이드바 리사이즈**: 좌측 테이블 너비 조정 기능 확인
- [ ] **컬럼 리사이즈**: WBS 컬럼 너비 조정 기능 확인
- [ ] **스크롤 동기화**: 테이블과 차트의 세로 스크롤 동기화 확인
- [ ] **Today 라인**: 오늘 날짜 표시 라인 확인
- [ ] **마일스톤 표시**: 마일스톤 마커(다이아몬드) 표시 확인
- [ ] **상태(St) 토글**: G/Y/R 상태 토글 기능 확인
- [ ] **중요(★) 토글**: 중요 항목 마크 토글 기능 확인

### 3. 데이터 무결성
- [ ] **날짜 유효성**: Start > Finish 시 자동 보정 확인
- [ ] **계층 구조**: Root → Phase → Task 계층 구조 유지 확인
- [ ] **드래그 제약**: 자식이 있는 태스크는 드래그 불가 확인

---

## 🎨 UI 개선 TODO (우선순위 순)

### Priority 1: 색상 테마 통일 (필수)

#### 1.1 헤더 색상 통일
```typescript
// 변경 전 (line 555, 736)
bg-[#005a8d]  // 년도/테이블 헤더

// ✅ 유지: APQP 테마 컬러와 일치
```

#### 1.2 마일스톤 색상 단순화 (line 21-47)
```typescript
// ❌ 현재: 5가지 색상, 투명도 사용 → 과도하게 화려함
// ✅ 개선안: APQP 테마 색상 기반, 단색 사용

const MILESTONE_COLORS = {
  'PROTO': { 
    bg: '#b0bec5',        // 연한 회색 (Slate-300 계열)
    border: '#90a4ae',
    text: '#263238'        // 어두운 회색 텍스트
  },
  'PILOT1': { 
    bg: '#80deea',        // 연한 청록색 (Cyan-300)
    border: '#4dd0e1',
    text: '#004d40'
  },
  'PILOT2': { 
    bg: '#a7ffeb',        // 더 연한 청록색 (Teal-A100)
    border: '#64ffda',
    text: '#004d40'
  },
  'PPAP': { 
    bg: '#81d4fa',        // 연한 하늘색 (Light Blue-300)
    border: '#4fc3f7',
    text: '#01579b'
  },
  'SOP': { 
    bg: '#a5d6a7',        // 연한 녹색 (Green-300)
    border: '#81c784',
    text: '#1b5e20'
  },
};
```

#### 1.3 Root/Phase 배경색 톤다운 (line 627, 768)
```typescript
// ❌ 현재
isRoot: 'bg-blue-600'      // 너무 강렬함
isPhase: 'bg-yellow-300'   // 너무 밝음

// ✅ 개선안
isRoot: 'bg-[#005a8d]'     // APQP 헤더와 동일
isPhase: 'bg-[#fff9c4]'    // 연한 노란색 (Yellow-100)
```

#### 1.4 간트 바 상태 색상 톤다운 (line 834-839)
```typescript
// ❌ 현재
const fillColors = {
  G: '#22c55e',  // 너무 밝은 녹색
  Y: '#3b82f6',  // 너무 밝은 파란색
  R: '#ef4444',  // 너무 밝은 빨간색
};

// ✅ 개선안 (채도 낮춤)
const fillColors = {
  G: '#66bb6a',  // Green-400 (중간 톤)
  Y: '#42a5f5',  // Blue-400 (중간 톤)
  R: '#ef5350',  // Red-400 (중간 톤)
};
```

#### 1.5 드래그 핸들 색상 단순화 (line 861-925)
```typescript
// ❌ 현재: 녹색/빨강/주황 → 너무 다채로움

// ✅ 개선안: APQP 청록색 계열로 통일
Plan Start Handle:   #00796b (Teal-700)
Plan Finish Handle:  #004d40 (Teal-900)
Actual Finish Handle: #f57c00 (Orange-700) - 시각적 구분용
```

### Priority 2: 과도한 효과 제거

#### 2.1 Zebra Stripe 톤다운 (line 629, 769)
```typescript
// ❌ 현재
bg-[#f0f8ff]  // 너무 밝은 파란색

// ✅ 개선안
bg-[#fafafa]  // 매우 연한 회색 (Gray-50)
```

#### 2.2 호버 효과 단순화 (line 626, 767)
```typescript
// ❌ 현재
hover:brightness-110

// ✅ 개선안
hover:bg-gray-50  // 미묘한 회색으로 변경
```

#### 2.3 그림자 효과 제거/축소
```typescript
// 검토 대상:
- line 728: shadow-[2px_0_10px_rgba(0,0,0,0.1)] → shadow-sm
- line 803: textShadow 제거
- line 872, 889, 921: boxShadow 간소화
```

### Priority 3: 타이포그래피 개선

#### 3.1 폰트 크기 일관성
```typescript
// 현재: 8px ~ 15px까지 다양 → 혼란스러움
// ✅ 개선안: 3가지로 통일
- 헤더: 13px (Root), 12px (Phase, 테이블 헤더)
- 본문: 11px (일반 셀)
- 보조: 10px (마일스톤 라벨, 상태 아이콘)
```

#### 3.2 폰트 굵기 일관성
```typescript
// 현재: font-bold, font-extrabold, font-semibold 혼용
// ✅ 개선안
- Root: font-bold
- Phase: font-semibold
- 일반: font-normal
```

### Priority 4: 컴포넌트 정리

#### 4.1 중복 파일 통합
```
📁 src/app/project/components/  (메인 버전)
  - GanttChartView.tsx
  - GanttSettingsPanel.tsx

📁 src/components/project/  (구 버전 - 삭제 필요)
  - GanttChartView.tsx ❌
  - GanttSettingsPanel.tsx ❌

📁 src/utils/
  - gantt-data-reader.ts
  - ganttDateUtils.ts (중복)
  - ganttExcelUtils.ts (중복)

📁 src/app/project/utils/
  - ganttDateUtils.ts ✅
  - ganttExcelUtils.ts ✅
```

**액션**: `src/components/project/` 및 `src/utils/gantt*` 파일 삭제

#### 4.2 SettingsPanel 개선
- 현재 매우 단순함 (32줄)
- 컬럼 토글 버튼이 이미 메인 UI에 있어 중복됨
- **검토 필요**: SettingsPanel 패널 자체 제거 고려

---

## 🧪 테스트 시나리오

### 1. 드래그 기능 테스트
```
1. 최하위 태스크의 Plan Start 핸들 드래그 → 날짜 변경 확인
2. Plan Finish 드래그 → Start와 7일 이상 거리 유지 확인
3. Actual Finish 드래그 → Actual Start 이후 날짜만 가능 확인
4. Phase 또는 Root 드래그 시도 → 드래그 불가 확인
```

### 2. Excel Import/Export 테스트
```
1. Excel Export → 파일 생성 확인, 내용 확인
2. 생성된 Excel 파일 수정 후 Import → 데이터 반영 확인
3. 잘못된 형식 Import → 오류 처리 확인
```

### 3. UI 인터랙션 테스트
```
1. 컬럼 보기/숨기기 버튼 클릭 → 즉시 반영 확인
2. 사이드바 리사이즈 → 부드러운 동작 확인
3. 접기/펼치기 → 계층 구조 유지 확인
```

---

## 📝 개선 작업 단계

### Step 1: 기능 검증 (우선)
1. 로컬 서버 실행: `npm run dev`
2. `/project?view=gantt` 접속
3. 위 테스트 시나리오 실행
4. 버그 발견 시 Issues 문서화

### Step 2: 색상 테마 통일
1. `MILESTONE_COLORS` 객체 수정
2. Root/Phase 배경색 수정
3. 간트 바 상태 색상 수정
4. 드래그 핸들 색상 수정
5. Zebra stripe 색상 수정

### Step 3: UI 정리
1. 호버 효과 단순화
2. 그림자 효과 축소
3. 폰트 크기/굵기 통일
4. 불필요한 애니메이션 제거

### Step 4: 리팩토링
1. 중복 파일 삭제
2. SettingsPanel 제거 또는 개선
3. 주석 정리
4. 코드 최적화

### Step 5: 테스트 및 검증
1. 브라우저 테스트 (Chrome, Edge, Firefox)
2. 반응형 레이아웃 확인
3. 성능 측정 (큰 데이터셋)
4. 사용자 피드백 수집

---

## 🔍 주요 발견사항

### ✅ 잘 된 부분
1. **기능적 완성도**: 드래그, Excel, 데이터 관리 등 핵심 기능 구현 완료
2. **데이터 구조**: Rollup 계산, 계층 구조 관리 잘 설계됨
3. **UI 레이아웃**: 테이블/차트 분할, 리사이즈, 스크롤 동기화 우수
4. **APQP 색상 일부 적용**: #004d7a, #005a8d 등 표준 색상 일부 사용

### ⚠️ 개선 필요 부분
1. **색상 과다**: 마일스톤별 5가지 색상 + 투명도 → 너무 화려함
2. **Root/Phase 강조**: 파란색, 노란색 배경이 너무 강렬함
3. **드래그 핸들**: 3가지 색상 사용 → 통일성 부족
4. **중복 파일**: components/project/, utils/ 중복 파일 존재
5. **폰트 크기**: 8px~15px까지 너무 다양함

### 🚨 잠재적 이슈
1. **성능**: 큰 프로젝트(1000+ 태스크)에서 드래그 시 렉 가능성
2. **접근성**: 색상 의존도가 높아 색맹 사용자 고려 필요
3. **모바일**: 드래그 핸들이 작아서 터치 조작 어려울 수 있음

---

## 📚 참고 자료
- APQP 테마 색상: `src/app/pfmea/worksheet/tabs/shared/BaseWorksheetComponents.tsx`
- CP 워크시트: `src/app/cp/*` (색상 참고용)
- 현재 간트 차트: `src/app/project/components/GanttChartView.tsx`

---

## 🎯 최종 목표
**"APQP 워크시트와 CP 워크시트처럼 깔끔하고 전문적이며, 시각적으로 일관된 간트 차트"**

- 과도한 색상 제거
- APQP 테마 컬러 기반 통일
- 명확한 정보 전달
- 직관적인 조작성
- 성능 최적화

---

**작성자**: AI Assistant  
**검토 대상**: Gantt Chart v1.0 (apqp 브랜치)  
**다음 단계**: 사용자 승인 후 개선 작업 착수
