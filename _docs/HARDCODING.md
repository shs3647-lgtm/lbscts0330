# 🔒 앱 안정화 전략: 하드코딩 / 코드프리즈 / 랩핑

> **목적**: 배포 단계에서 앱 안정성을 확보하기 위한 세 가지 핵심 전략
> **적용 시점**: 2026-02-04 (배포 직전 단계)

---

## 📋 목차
1. [용어 정의](#용어-정의)
2. [적용 기준](#적용-기준)
3. [하드코딩 규칙](#1-하드코딩-hardcoding)
4. [코드프리즈 규칙](#2-코드프리즈-code-freeze)
5. [랩핑 규칙](#3-랩핑-wrapping)
6. [파일별 상태 관리](#파일별-상태-관리)
7. [워크플로우](#워크플로우)

---

## 용어 정의

| 용어 | 정의 | 목적 |
|------|------|------|
| **하드코딩** | 동적 로직을 정적 값으로 고정 | 예측 가능한 동작 보장 |
| **코드프리즈** | 특정 파일/기능의 수정 금지 | 안정된 코드 보호 |
| **랩핑** | 기존 함수를 안전한 wrapper로 감싸기 | 에러 격리 및 폴백 제공 |

---

## 적용 기준

### 언제 적용하는가?

```
✅ 적용 대상:
- 핵심 비즈니스 로직 (FMEA 워크시트, CP 연동 등)
- 사용자가 자주 사용하는 기능
- 이전에 정상 작동이 확인된 기능
- 배포 직전 안정화가 필요한 기능

❌ 제외 대상:
- 아직 개발 중인 기능
- 실험적 기능
- 설정/환경 파일
```

---

## 1. 하드코딩 (Hardcoding)

### 정의
동적으로 계산되거나 API에서 가져오는 값을 **정적 상수로 고정**하는 것

### 규칙

```typescript
// ❌ 동적 (불안정)
const columns = await fetchColumnConfig();
const themeColor = user.preferences.theme;

// ✅ 하드코딩 (안정)
const COLUMNS = ['No', '작성일', 'FMEA ID', 'Rev', 'TYPE', '단계', ...]; // HARDCODED
const THEME_COLOR = '#00587a'; // HARDCODED
```

### 표시 규칙
```typescript
// 하드코딩된 값에는 반드시 주석 추가
const CONFIG = {
  moduleName: 'PFMEA',        // HARDCODED - 변경 금지
  modulePrefix: 'pfm',        // HARDCODED
  themeColor: '#00587a',      // HARDCODED
  apiEndpoint: '/api/fmea/projects',  // HARDCODED
};
```

### 하드코딩 체크리스트
- [ ] 컬럼 정의 (헤더, 순서, 너비)
- [ ] API 엔드포인트
- [ ] 테마 색상
- [ ] 기본값 (default values)
- [ ] 라우팅 경로

---

## 2. 코드프리즈 (Code Freeze)

### 정의
특정 파일이나 컴포넌트를 **수정 금지 상태**로 표시

### 규칙

#### 파일 헤더에 표시
```typescript
/**
 * @file page.tsx
 * @description PFMEA 리스트 페이지
 * @version 3.1.0
 * @status CODE_FREEZE 🔒
 * @frozen_date 2026-02-04
 * @frozen_by AI Assistant
 * @reason 배포 직전 안정화
 * 
 * ⚠️ 이 파일은 코드프리즈 상태입니다.
 * 수정이 필요한 경우 반드시 팀 리더 승인 필요
 */
```

#### 코드프리즈 레벨

| 레벨 | 설명 | 허용된 수정 |
|------|------|-------------|
| 🔴 **LEVEL 1 (Critical)** | 핵심 기능, 절대 수정 금지 | 없음 |
| 🟡 **LEVEL 2 (Important)** | 주요 기능, 버그 수정만 허용 | 버그 수정, 주석 |
| 🟢 **LEVEL 3 (Stable)** | 안정화 완료, 신중한 수정 | 버그 수정, 스타일링 |

### 코드프리즈 파일 목록

```markdown
## 🔴 LEVEL 1 - 절대 수정 금지
- src/app/pfmea/list/page.tsx
- src/components/list/ListActionBar.tsx
- src/app/api/fmea/projects/route.ts

## 🟡 LEVEL 2 - 버그 수정만 허용
- src/app/pfmea/worksheet/page.tsx
- src/app/control-plan/worksheet/page.tsx

## 🟢 LEVEL 3 - 신중한 수정
- src/components/layout/*.tsx
- src/styles/*.css
```

---

## 3. 랩핑 (Wrapping)

### 정의
기존 함수를 **안전한 wrapper 함수로 감싸서** 에러를 격리하고 폴백을 제공

### 규칙

#### 기본 패턴
```typescript
// ❌ 직접 호출 (위험)
const data = await fetchData();

// ✅ 랩핑 (안전)
const safeWrapper = async <T>(
  fn: () => Promise<T>,
  fallback: T,
  errorHandler?: (e: Error) => void
): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    console.error('[SafeWrapper] Error:', e);
    errorHandler?.(e as Error);
    return fallback;
  }
};

// 사용
const data = await safeWrapper(
  () => fetchData(),
  DEFAULT_DATA,  // 폴백 값
  (e) => logError(e)
);
```

#### 랩핑 대상

| 대상 | 랩핑 방식 | 폴백 값 |
|------|----------|---------|
| API 호출 | try-catch + fallback | 빈 배열/객체 |
| 데이터 파싱 | JSON.parse wrapper | 기본값 |
| localStorage | safeLocalStorage | 메모리 저장 |
| 이벤트 핸들러 | error boundary | 에러 토스트 |

#### 실제 적용 예시
```typescript
// 안전한 삭제 핸들러
const handleDelete = async () => {
  console.log('[삭제] 시작 - selectedRows.size:', selectedRows.size);  // 디버그 로그
  
  if (selectedRows.size === 0) {
    return alert('삭제할 항목을 선택해주세요.');
  }
  
  try {  // WRAPPED
    const confirmed = confirm(`${selectedRows.size}개 항목을 삭제하시겠습니까?`);
    if (!confirmed) return;
    
    // 삭제 로직...
  } catch (e) {
    console.error('[삭제] 오류:', e);
    alert('삭제 중 오류가 발생했습니다.');
  }
};
```

---

## 파일별 상태 관리

### 상태 표시 파일 생성
`docs/CODE_STATUS.md` 파일에서 전체 상태 관리

```markdown
# 코드 상태 현황

| 파일 | 상태 | 레벨 | 최종 확인 | 담당자 |
|------|------|------|----------|--------|
| pfmea/list/page.tsx | 🔒 FROZEN | L1 | 2026-02-04 | - |
| pfmea/worksheet/page.tsx | 🔒 FROZEN | L2 | 2026-02-04 | - |
| control-plan/list/page.tsx | ⚠️ HARDCODED | - | 2026-02-04 | - |
| components/list/ListActionBar.tsx | 🔒 FROZEN | L1 | 2026-02-04 | - |
```

---

## 워크플로우

### 배포 전 체크리스트

```
□ 1. 핵심 기능 하드코딩 완료
□ 2. 주요 파일 코드프리즈 적용
□ 3. API 호출부 랩핑 적용
□ 4. console.log 디버그 로그 추가
□ 5. 전체 기능 테스트 완료
□ 6. 상태 문서 업데이트
□ 7. 최종 커밋 & 푸시
```

### 수정 요청 프로세스

```
1. 수정 필요성 확인
   ↓
2. 파일 상태 확인 (CODE_STATUS.md)
   ↓
3. 코드프리즈 레벨 확인
   ↓
4. 레벨에 따른 승인 프로세스
   - L1: 팀 리더 승인 필수
   - L2: 시니어 개발자 승인
   - L3: 자체 판단 (단, 기록 필수)
   ↓
5. 수정 후 테스트
   ↓
6. 상태 문서 업데이트
```

---

## 🚨 긴급 상황 대응

### 배포 후 버그 발생 시

1. **즉시 롤백 가능 여부 확인**
2. **핫픽스 적용 시**:
   - 최소한의 변경만 적용
   - 하드코딩으로 임시 해결
   - 디버그 로그 추가
   - 즉시 테스트
3. **상태 문서에 핫픽스 기록**

---

## 📦 하드코딩된 비즈니스 로직

### CFT 역할 매핑 (HARDCODED)

```typescript
// 파일: src/components/tables/CFTRegistrationTable.tsx

// ★ 기본 역할 목록 (순서 고정)
const CFT_ROLES = ['Champion', 'Technical Leader', 'Leader', 'PM', 'Moderator', 'CFT 팀원'];

// ★ 단일 역할 (각각 1명만 허용)
const SINGLE_ROLE_LIST = ['Champion', 'Technical Leader', 'Leader', 'PM', 'Moderator'];
```

| 순서 | CFT 역할 | 개정관리 역할 | 등록화면 역할 | 설명 |
|------|----------|--------------|--------------|------|
| 1 | **Champion** | 승인자 | - | 최종 승인권자 |
| 2 | **Technical Leader** | 검토자 | - | 기술 검토 담당 |
| 3 | **Leader** | 작성자 | 책임자 | FMEA 작성 책임자 |
| 4 | **PM** | - | - | 프로젝트 매니저 |
| 5 | **Moderator** | - | - | 회의 진행자 |
| 6 | **CFT 팀원** | - | - | 다중 추가 가능 |

### 개정관리 로직 (HARDCODED)

```typescript
// 파일: src/app/pfmea/revision/components/RevisionTable.tsx

// ★ 신규 추가 건 판단
const isNewEntry = !revision.createDate && !revision.reviewDate && !revision.approveDate;

// ★ 입력 필요 경고 (주황색)
const needsInput = isNewEntry && !revision.revisionHistory;

// ★ 수정 불가 조건
const isApproved = revision.approveStatus === '승인';
```

| 상태 | 조건 | UI 표시 | 수정 가능 |
|------|------|---------|----------|
| 신규 추가 건 | 작성일/검토일/승인일 없음 + 이력 비어있음 | 🟠 주황색 배경 | ✅ 가능 |
| 작성 중 | 날짜 있음 + 이력 있음 | 일반 | ✅ 가능 |
| 승인 완료 | `approveStatus === '승인'` | 회색 비활성화 | ❌ 불가 |

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-02-05 | 1.3.0 | CFT 역할 매핑, 개정관리 로직 하드코딩 문서화 | AI Assistant |
| 2026-02-05 | 1.2.0 | RevisionTable, MyJob page 코드프리즈 L2 적용 (지연 자동 감지) | AI Assistant |
| 2026-02-05 | 1.1.0 | DatePickerModal, ListActionBar, PFMEA register page 코드프리즈 L2 적용 | AI Assistant |
| 2026-02-04 | 1.0.0 | 초기 문서 작성 | AI Assistant |

---

> **⚠️ 주의**: 이 문서에 정의된 규칙을 따르지 않으면 배포 안정성이 보장되지 않습니다.
