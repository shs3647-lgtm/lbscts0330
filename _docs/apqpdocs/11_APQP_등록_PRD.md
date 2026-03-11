# APQP 등록 화면 PRD

> **버전**: 1.1.0  
> **화면**: `/apqp/register`  
> **파일**: `src/app/apqp/register/page.tsx`  
> **최종 수정**: 2026-01-24  
> **코드 프리즈**: 2026-01-24

---

## 1. 워크플로우

### 1.1 진입 경로

```
┌─────────────────────────────────────────────────────────────┐
│  진입 경로                                                   │
├─────────────────────────────────────────────────────────────┤
│  1. 메인 메뉴 → APQP → 등록                                 │
│  2. APQP 목록 → 신규 등록 버튼                              │
│  3. APQP 목록 → 기존 항목 클릭 (수정 모드)                  │
│  4. URL 직접 접근: /apqp/register?id={apqpId}               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 사용자 흐름

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

### 1.3 이탈 경로

| 이탈 대상 | 조건 | URL |
|----------|------|-----|
| 워크시트 | 저장 완료 후 | `/apqp/worksheet?id={apqpId}` |
| APQP 목록 | 네비게이션 | `/apqp/list` |

---

## 2. 화면 기능 스펙

### 2.1 컴포넌트 구조

```
APQPRegisterPage
├── APQPTopNav               // 상단 네비게이션
├── HeaderSection            // 제목, 버튼 영역
│   ├── 새로 작성 버튼
│   ├── 편집 버튼
│   └── 저장 버튼
├── RegisterInfoTable        // 기획 및 준비 (1단계) 테이블
│   └── 4행 8열 입력 테이블
├── APQPOptionsTable         // APQP 기초정보 등록 옵션
├── CFTRegistrationTable     // CFT 리스트 (공통 컴포넌트)
├── CFTAccessLogTable        // CFT 접속 로그 (공통 컴포넌트)
└── 모달들
    ├── BizInfoSelectModal   // 고객정보 선택
    ├── UserSelectModal      // 사용자 선택
    ├── DatePickerModal      // 날짜 선택 (PFMEA 공통)
    ├── FmeaSelectModal      // 하위 FMEA 선택
    └── CpSelectModal        // 하위 CP 선택
```

### 2.2 상태 관리

| 상태 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| `apqpInfo` | `APQPInfo` | INITIAL_APQP | 기초정보 객체 |
| `apqpId` | `string` | `''` | APQP ID (자동 생성) |
| `cftMembers` | `CFTMember[]` | 10행 | CFT 멤버 목록 |
| `linkedFmea` | `string \| null` | `null` | 하위 FMEA ID |
| `linkedCp` | `string \| null` | `null` | 하위 CP ID |
| `saveStatus` | `'idle' \| 'saving' \| 'saved'` | `'idle'` | 저장 상태 |

### 2.3 APQPInfo 필드 명세

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `companyName` | string | O | 회사명 |
| `subject` | string | O | APQP명 |
| `customerName` | string | | 고객명 |
| `processResponsibility` | string | | 개발 책임 (부서) |
| `apqpResponsibleName` | string | | APQP 책임자 |
| `apqpStartDate` | string | | 시작 일자 (YYYY-MM-DD) |
| `apqpRevisionDate` | string | | 목표 완료일 |
| `engineeringLocation` | string | | 엔지니어링 위치 |
| `confidentialityLevel` | string | | 기밀유지 수준 |
| `modelYear` | string | | 모델 연식 |
| `developmentLevel` | string | O | 개발레벨 (NEW/MAJOR/MINOR/OTHER) |

### 2.4 API 연동

| 동작 | Method | Endpoint | Body |
|------|--------|----------|------|
| 목록 조회 | GET | `/api/apqp` | - |
| 상세 조회 | GET | `/api/apqp?apqpNo={id}` | - |
| 저장/수정 | POST | `/api/apqp` | `{ apqpNo, apqpInfo, cftMembers, linkedFmea, linkedCp }` |

### 2.5 APQP ID 생성 규칙

```
형식: pj{YY}-{TYPE}{NNN}

예시:
- pj26-n001  (신규개발, 2026년, 1번)
- pj26-ma001 (Major)
- pj26-mi001 (Minor)
- pj26-p001  (기타)

규칙:
- YY: 연도 뒤 2자리
- TYPE: 개발레벨 (n=신규, ma=Major, mi=Minor, p=기타)
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
│ apqp-projects │                     │ APQPProject │
│ apqp-last-edited │                  │ APQPCft     │
│ apqp-temp-data │                    └─────────────┘
└─────────────┘
```

---

## 3. QA 체크리스트

### 3.1 화면 로드

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 1-1 | `/apqp/register` 접근 | 등록 화면 정상 표시 | [ ] | [ ] |
| 1-2 | 마지막 작업 APQP 자동 로드 | DB/localStorage에서 마지막 ID 로드 | [ ] | [ ] |
| 1-3 | `?id=pj26-n001` 파라미터로 접근 | 해당 APQP 데이터 로드 | [ ] | [ ] |
| 1-4 | 존재하지 않는 ID로 접근 | 빈 폼 표시 또는 경고 | [ ] | [ ] |

### 3.2 기초정보 입력

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 2-1 | 회사명 입력 | 텍스트 입력 가능 | [ ] | [ ] |
| 2-2 | APQP명 입력 | 텍스트 입력 가능 | [ ] | [ ] |
| 2-3 | APQP ID 자동 생성 | 개발레벨 변경 시 ID 재생성 | [ ] | [ ] |
| 2-4 | 개발레벨 변경 | 드롭다운 선택, ID 변경 | [ ] | [ ] |
| 2-5 | 하위 FMEA 선택 | 모달 오픈, 선택 후 표시 | [ ] | [ ] |
| 2-6 | 하위 CP 선택 | 모달 오픈, 선택 후 표시 | [ ] | [ ] |
| 2-7 | 책임자 검색 (🔍) | UserSelectModal 오픈 | [ ] | [ ] |
| 2-8 | 고객 검색 (🔍) | BizInfoSelectModal 오픈 | [ ] | [ ] |
| 2-9 | 시작 일자 선택 (📅) | DatePickerModal 오픈 | [ ] | [ ] |
| 2-10 | 목표 완료일 선택 (📅) | DatePickerModal 오픈 | [ ] | [ ] |

### 3.3 저장 기능

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 3-1 | 저장 버튼 클릭 (APQP명 미입력) | 경고 메시지 표시 | [ ] | [ ] |
| 3-2 | 저장 버튼 클릭 (정상) | "저장됨" 표시, DB 저장 | [ ] | [ ] |
| 3-3 | 저장 후 URL 업데이트 | `?id={apqpId}` 추가 | [ ] | [ ] |
| 3-4 | localStorage 동기화 | apqp-temp-data 업데이트 | [ ] | [ ] |
| 3-5 | 새로 작성 버튼 클릭 | 폼 초기화, 새 ID 생성 | [ ] | [ ] |
| 3-6 | 편집 버튼 클릭 | DB에서 데이터 불러오기 | [ ] | [ ] |

### 3.4 CFT 구성

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 4-1 | CFT 테이블 표시 | 10행 기본 표시 | [ ] | [ ] |
| 4-2 | 역할 선택 | 드롭다운 정상 동작 | [ ] | [ ] |
| 4-3 | 성명 검색 (🔍) | UserSelectModal 오픈 | [ ] | [ ] |
| 4-4 | 사용자 선택 후 반영 | 이름, 부서, 직급 자동 입력 | [ ] | [ ] |
| 4-5 | 행 추가 | + 버튼으로 행 추가 | [ ] | [ ] |
| 4-6 | 행 삭제 | - 버튼으로 행 삭제 | [ ] | [ ] |

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
src/app/apqp/register/
└── page.tsx              # 메인 페이지

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
| 1.1.0 | 2026-01-24 | CFT 독립 저장, CFT 미등록 표시 기능 추가 |

---

## 6. 코드 프리즈 선언

> **코드 프리즈 일시**: 2026-01-24  
> **대상 파일**: `src/app/apqp/register/page.tsx`

### 6.1 프리즈 완료 기능

| 기능 | 상태 | 설명 |
|------|------|------|
| 기초정보 입력 | ✅ 완료 | 회사명, APQP명, 고객명 등 12개 필드 |
| APQP ID 자동 생성 | ✅ 완료 | 개발레벨별 자동 채번 (n/ma/mi/p) |
| CFT 구성 | ✅ 완료 | 10행 기본, 역할 드롭다운, 미등록 표시 |
| CFT 독립 저장 | ✅ 완료 | APQP/CFT 독립 저장, 빈 CFT 허용 |
| 하위 FMEA 선택 | ✅ 완료 | FMEA 목록 모달 |
| 하위 CP 선택 | ✅ 완료 | CP 목록 모달 |
| 데이터 영구 유지 | ✅ 완료 | localStorage (apqp-temp-data) |
| 변경 이력 기록 | ✅ 완료 | 편집 시 필드별 변경 추적 |
| 모달 통합 | ✅ 완료 | 사용자, 고객, 날짜, FMEA, CP 선택 |
| DatePickerModal | ✅ 완료 | PFMEA와 동일한 달력 모달 |

### 6.2 변경 금지 항목

1. **레이아웃**: 화면 구조 및 패딩 변경 금지
2. **API 엔드포인트**: 기존 API 형식 유지
3. **상태 구조**: apqpInfo, cftMembers 구조 유지
4. **저장 로직**: localStorage/DB 동기화 로직 유지

---

## 7. TODO (PFMEA 추가 개발 후 수평전개 필요)

| # | 항목 | 우선순위 | 설명 |
|---|------|---------|------|
| 1 | 변경 히스토리 테이블 | 중 | ChangeHistoryTable 컴포넌트 추가 |
| 2 | APQP명 중복 체크 | 중 | 기존 APQP명 목록 조회 및 경고 |
| 3 | AI 예측 시스템 | 낮 | PFMEA AI 기능 수평전개 |
| 4 | 접속 로그 API 연동 | 중 | /api/auth/access-log 연동 |
| 5 | 워크시트 이동 버튼 | 중 | 저장 후 워크시트 이동 기능 |
