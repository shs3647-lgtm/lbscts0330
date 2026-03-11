# CP 등록 화면 PRD

> **버전**: 1.0.0  
> **화면**: `/control-plan/register`  
> **파일**: `src/app/control-plan/register/page.tsx`  
> **최종 수정**: 2026-01-24  
> **코드 프리즈**: 2026-01-24

---

## 1. 워크플로우

### 1.1 진입 경로

```
┌─────────────────────────────────────────────────────────────┐
│  진입 경로                                                   │
├─────────────────────────────────────────────────────────────┤
│  1. 메인 메뉴 → Control Plan → 등록                         │
│  2. CP 목록 → 신규 등록 버튼                                │
│  3. CP 목록 → 기존 항목 클릭 (수정 모드)                    │
│  4. URL 직접 접근: /control-plan/register?id={cpId}         │
│  5. FMEA 워크시트 → CP 연결                                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 데이터 계층 구조

```
┌─────────────┐
│    APQP     │  ← 최상위 (프로젝트)
│  (부모)     │
└──────┬──────┘
       │
  ┌────┴────┐
  │         │
  ↓         ↓
┌─────┐   ┌─────┐
│FMEA │   │ CP  │  ← 형제 관계
│     │   │     │
└─────┘   └─────┘
```

### 1.3 사용자 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  화면 진입   │ ──→ │  기초정보    │ ──→ │  CFT 구성   │
│  (신규/수정) │     │  입력       │     │  (선택)     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           ↓                    ↓
                    ┌─────────────┐     ┌─────────────┐
                    │  저장       │ ──→ │  워크시트   │
                    │             │     │  이동       │
                    └─────────────┘     └─────────────┘
```

### 1.4 이탈 경로

| 이탈 대상 | 조건 | URL |
|----------|------|-----|
| 워크시트 | 저장 완료 후 | `/control-plan/worksheet?cpNo={cpId}` |
| CP 목록 | 네비게이션 | `/control-plan/list` |
| Import | 신규 입력 클릭 | `/control-plan/import?id={cpId}` |

---

## 2. 화면 기능 스펙

### 2.1 컴포넌트 구조

```
CPRegisterPage
├── CPTopNav                 // 상단 네비게이션
├── HeaderSection            // 제목, 버튼 영역
│   ├── 불러오기 버튼
│   ├── 작성화면 버튼
│   ├── 새로 등록 버튼
│   └── 저장 버튼
├── CPInfoTable              // CP 기본정보 테이블
│   └── 4행 8열 입력 테이블
├── CPOptionsTable           // CP 작성 옵션
│   ├── Master Data 사용
│   ├── Family Data 사용
│   ├── Part CP 사용
│   └── 신규 입력
├── CFTRegistrationTable     // CFT 리스트 (공통 컴포넌트)
├── CFTAccessLogTable        // CFT 접속 로그 (공통 컴포넌트)
└── 모달들
    ├── BizInfoSelectModal   // 고객정보 선택
    ├── UserSelectModal      // 사용자 선택
    ├── DatePickerModal      // 날짜 선택 (PFMEA 공통)
    ├── FmeaSelectModal      // 상위 FMEA 선택
    ├── CpSelectModal        // 상위 CP 선택
    └── ApqpSelectModal      // 상위 APQP 선택 (인라인)
```

### 2.2 상태 관리

| 상태 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| `cpInfo` | `CPInfo` | INITIAL_CP | 기초정보 객체 |
| `cpId` | `string` | `''` | CP ID (자동 생성) |
| `cftMembers` | `CFTMember[]` | 10행 | CFT 멤버 목록 |
| `selectedParentApqp` | `string \| null` | `null` | 상위 APQP ID |
| `selectedParentFmea` | `string \| null` | `null` | 상위 FMEA ID |
| `selectedBaseCp` | `string \| null` | `null` | 상위 CP ID |
| `saveStatus` | `'idle' \| 'saving' \| 'saved'` | `'idle'` | 저장 상태 |

### 2.3 CPInfo 필드 명세

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `companyName` | string | O | 회사명 |
| `subject` | string | O | CP명 (품명) |
| `customerName` | string | | 고객명 |
| `processResponsibility` | string | | 공정 책임 (부서) |
| `cpResponsibleName` | string | | CP 책임자 |
| `cpStartDate` | string | | 시작 일자 (YYYY-MM-DD) |
| `cpRevisionDate` | string | | 목표 완료일 |
| `engineeringLocation` | string | | 엔지니어링 위치 |
| `confidentialityLevel` | string | | CP 종류 (Prototype/Pre-Launch/Production/Safe Launch) |
| `modelYear` | string | | 모델 연식 |
| `cpType` | string | O | CP 유형 (M/F/P) |

### 2.4 API 연동

| 동작 | Method | Endpoint | Body |
|------|--------|----------|------|
| 목록 조회 | GET | `/api/control-plan` | - |
| 상세 조회 | GET | `/api/control-plan?cpNo={id}` | - |
| 저장/수정 | POST | `/api/control-plan` | `{ cpNo, cpInfo, cftMembers, parentApqpNo, parentFmeaId, baseCpId }` |

### 2.5 CP ID 생성 규칙

```
형식: cp{YY}-{type}{NNN}

예시:
- cp26-m001  (Master CP, 2026년, 1번)
- cp26-f001  (Family CP)
- cp26-p001  (Part CP)

규칙:
- YY: 연도 뒤 2자리
- type: CP 유형 (m=Master, f=Family, p=Part)
- NNN: 해당 유형 내 순차 번호 (001~999)
```

### 2.6 데이터 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ localStorage │ ←─→ │   page.tsx  │ ←─→ │  DB (API)   │
│ (폴백 저장) │     │  (상태관리)  │     │ (주 저장소) │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      │    ┌───────────────┴────────────────┐   │
      │    │                                │   │
      ↓    ↓                                ↓   ↓
┌─────────────┐                       ┌─────────────┐
│ cp-projects │                       │CpRegistration│
│ cp-last-edited │                    │ CpCftMember │
│ cp-temp-data │                      └─────────────┘
└─────────────┘
```

---

## 3. QA 체크리스트

### 3.1 화면 로드

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 1-1 | `/control-plan/register` 접근 | 등록 화면 정상 표시 | [ ] | [ ] |
| 1-2 | 마지막 작업 CP 자동 로드 | DB/localStorage에서 마지막 ID 로드 | [ ] | [ ] |
| 1-3 | `?id=cp26-p001` 파라미터로 접근 | 해당 CP 데이터 로드 | [ ] | [ ] |
| 1-4 | 존재하지 않는 ID로 접근 | 빈 폼 표시 또는 경고 | [ ] | [ ] |

### 3.2 기초정보 입력

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 2-1 | 회사명 입력 | 텍스트 입력 가능 | [ ] | [ ] |
| 2-2 | CP명 입력 | 텍스트 입력 가능 | [ ] | [ ] |
| 2-3 | CP ID 자동 생성 | CP 유형 변경 시 ID 재생성 | [ ] | [ ] |
| 2-4 | CP 유형 변경 | 드롭다운 선택, ID 변경 | [ ] | [ ] |
| 2-5 | 상위 APQP 선택 | 모달 오픈, 선택 후 표시 | [ ] | [ ] |
| 2-6 | 상위 FMEA 선택 | 모달 오픈, 선택 후 표시 | [ ] | [ ] |
| 2-7 | 상위 CP 선택 | 모달 오픈, 선택 후 표시 | [ ] | [ ] |
| 2-8 | 책임자 검색 (🔍) | UserSelectModal 오픈 | [ ] | [ ] |
| 2-9 | 고객 검색 (🔍) | BizInfoSelectModal 오픈 | [ ] | [ ] |
| 2-10 | 시작 일자 선택 (📅) | DatePickerModal 오픈 | [ ] | [ ] |
| 2-11 | 목표 완료일 선택 (📅) | DatePickerModal 오픈 | [ ] | [ ] |

### 3.3 저장 기능

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 3-1 | 저장 버튼 클릭 (CP명 미입력) | 경고 메시지 표시 | [ ] | [ ] |
| 3-2 | 저장 버튼 클릭 (CFT 없음) | 정상 저장 (CFT 미등록 표시) | [ ] | [ ] |
| 3-3 | 저장 버튼 클릭 (정상) | "저장됨" 표시, DB 저장 | [ ] | [ ] |
| 3-4 | 저장 후 URL 업데이트 | `?id={cpId}` 추가 | [ ] | [ ] |
| 3-5 | localStorage 동기화 | cp-temp-data 업데이트 | [ ] | [ ] |
| 3-6 | 새로 등록 버튼 클릭 | 폼 초기화, 새 ID 생성 | [ ] | [ ] |
| 3-7 | 불러오기 버튼 클릭 | DB에서 데이터 불러오기 | [ ] | [ ] |

### 3.4 CFT 구성

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 4-1 | CFT 테이블 표시 | 10행 기본 표시 | [ ] | [ ] |
| 4-2 | CFT 미등록 표시 | "CFT 리스트 ⚠️ (미등록)" 표시 | [ ] | [ ] |
| 4-3 | CFT 등록 시 | "CFT 리스트 (N명)" 표시 | [ ] | [ ] |
| 4-4 | 역할 선택 | 드롭다운 정상 동작 | [ ] | [ ] |
| 4-5 | 성명 검색 (🔍) | UserSelectModal 오픈 | [ ] | [ ] |
| 4-6 | 사용자 선택 후 반영 | 이름, 부서, 직급 자동 입력 | [ ] | [ ] |
| 4-7 | 행 추가 | + 버튼으로 행 추가 | [ ] | [ ] |
| 4-8 | 행 삭제 | - 버튼으로 행 삭제 | [ ] | [ ] |

### 3.5 모달 동작

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 5-1 | 모달 외부 클릭 | 모달 닫힘 | [ ] | [ ] |
| 5-2 | 모달 X 버튼 클릭 | 모달 닫힘 | [ ] | [ ] |
| 5-3 | 날짜 선택 모달 | 달력 표시, 오늘/닫기 버튼 | [ ] | [ ] |
| 5-4 | 모달 항목 선택 | 값 반영 후 모달 닫힘 | [ ] | [ ] |

---

## 4. 파일 구조

```
src/app/control-plan/register/
├── page.tsx              # 메인 페이지
├── types.ts              # 타입 정의
├── hooks/
│   ├── index.ts
│   └── useRegisterHandlers.ts  # 핸들러 훅
└── components/
    ├── index.ts
    ├── FmeaSelectModal.tsx
    └── CpSelectModal.tsx

src/components/
├── DatePickerModal.tsx   # 날짜 선택 모달 (공통)
├── modals/
│   ├── BizInfoSelectModal.tsx
│   └── UserSelectModal.tsx
└── tables/
    ├── CFTRegistrationTable.tsx
    └── CFTAccessLogTable.tsx
```

---

## 5. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-24 | 초기 작성, PFMEA 구조 수평전개 완료 |

---

## 6. 코드 프리즈 선언

> **코드 프리즈 일시**: 2026-01-24  
> **대상 파일**: `src/app/control-plan/register/page.tsx`

### 6.1 프리즈 완료 기능

| 기능 | 상태 | 설명 |
|------|------|------|
| 기초정보 입력 | ✅ 완료 | 회사명, CP명, 고객명 등 12개 필드 |
| CP ID 자동 생성 | ✅ 완료 | 유형별 자동 채번 (m/f/p) |
| CFT 구성 | ✅ 완료 | 10행 기본, 역할 드롭다운, 미등록 표시 |
| CFT 독립 저장 | ✅ 완료 | CP/CFT 독립 저장, 빈 CFT 허용 |
| 상위 APQP 선택 | ✅ 완료 | APQP 목록 모달 |
| 상위 FMEA 선택 | ✅ 완료 | FMEA 목록 모달 |
| 상위 CP 선택 | ✅ 완료 | CP 목록 모달 |
| 데이터 영구 유지 | ✅ 완료 | localStorage (cp-temp-data) |
| 변경 이력 기록 | ✅ 완료 | 편집 시 필드별 변경 추적 |
| 모달 통합 | ✅ 완료 | 사용자, 고객, 날짜, FMEA, CP, APQP 선택 |
| DatePickerModal | ✅ 완료 | PFMEA와 동일한 달력 모달 |

### 6.2 변경 금지 항목

1. **레이아웃**: 화면 구조 및 패딩 변경 금지
2. **API 엔드포인트**: 기존 API 형식 유지
3. **상태 구조**: cpInfo, cftMembers 구조 유지
4. **저장 로직**: localStorage/DB 동기화 로직 유지

---

## 7. TODO (PFMEA 추가 개발 후 수평전개 필요)

| # | 항목 | 우선순위 | 설명 |
|---|------|---------|------|
| 1 | 변경 히스토리 테이블 | 중 | ChangeHistoryTable 컴포넌트 추가 |
| 2 | CP명 중복 체크 | 중 | 기존 CP명 목록 조회 및 경고 |
| 3 | AI 예측 시스템 | 낮 | PFMEA AI 기능 수평전개 |
| 4 | 접속 로그 API 연동 | 중 | /api/auth/access-log 연동 |
| 5 | 워크시트 이동 버튼 | 중 | 저장 후 워크시트 이동 기능 |
