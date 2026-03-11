# PFMEA 등록 화면 PRD

> **버전**: 1.1.0  
> **화면**: `/pfmea/register`  
> **파일**: `src/app/pfmea/register/page.tsx` (500행)  
> **최종 수정**: 2026-01-23  
> **코드 프리즈**: 2026-01-23

---

## 1. 워크플로우

### 1.1 진입 경로

```
┌─────────────────────────────────────────────────────────────┐
│  진입 경로                                                   │
├─────────────────────────────────────────────────────────────┤
│  1. 메인 메뉴 → PFMEA → 등록                                │
│  2. PFMEA 목록 → 신규 등록 버튼                             │
│  3. PFMEA 목록 → 기존 항목 클릭 (수정 모드)                 │
│  4. URL 직접 접근: /pfmea/register?id={fmeaId}              │
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
| 워크시트 | 저장 완료 후 | `/pfmea/worksheet?id={fmeaId}` |
| Import | 엑셀 Import 클릭 | `/pfmea/import?id={fmeaId}` |
| PFMEA 목록 | 네비게이션 | `/pfmea` |

---

## 2. 화면 기능 스펙

### 2.1 컴포넌트 구조

```
PFMEARegisterPage
├── PFMEATopNav              // 상단 네비게이션
├── HeaderSection            // 제목, 버튼 영역
│   ├── 불러오기 버튼
│   ├── 새로 등록 버튼
│   └── 저장 버튼
├── RegisterInfoTable        // 기획 및 준비 (1단계) 테이블
│   └── 4행 8열 입력 테이블
├── FmeaOptionsTable         // FMEA 기초정보 등록 옵션
├── AiPredictionTable        // AI 예측 FMEA 섹션
├── CFTRegistrationTable     // CFT 리스트 (공통 컴포넌트)
├── CFTAccessLogTable        // CFT 접속 로그 (공통 컴포넌트)
└── 모달들
    ├── BizInfoSelectModal   // 고객정보 선택
    ├── UserSelectModal      // 사용자 선택
    ├── FmeaSelectModal      // FMEA 선택 (공통)
    ├── ApqpSelectModal      // APQP 선택 (공통)
    └── DatePickerModal      // 날짜 선택
```

### 2.2 상태 관리

| 상태 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| `fmeaInfo` | `FMEAInfo` | INITIAL_FMEA | 기초정보 객체 |
| `fmeaId` | `string` | `''` | FMEA ID (자동 생성) |
| `cftMembers` | `CFTMember[]` | 10행 | CFT 멤버 목록 |
| `selectedBaseFmea` | `string \| null` | `null` | 상위 FMEA ID |
| `selectedParentApqp` | `string \| null` | `null` | 상위 APQP No |
| `saveStatus` | `'idle' \| 'saving' \| 'saved'` | `'idle'` | 저장 상태 |

### 2.3 FMEAInfo 필드 명세

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `companyName` | string | O | 회사명 |
| `subject` | string | O | FMEA명 |
| `customerName` | string | | 고객명 |
| `designResponsibility` | string | | 공정 책임 (부서) |
| `fmeaResponsibleName` | string | | FMEA 책임자 |
| `fmeaStartDate` | string | | 시작 일자 (YYYY-MM-DD) |
| `fmeaRevisionDate` | string | | 개정 일자 |
| `engineeringLocation` | string | | 엔지니어링 위치 |
| `confidentialityLevel` | string | | 기밀유지 수준 |
| `modelYear` | string | | 모델 연식 |
| `fmeaType` | `'M' \| 'F' \| 'P'` | O | FMEA 유형 |

### 2.4 API 연동

| 동작 | Method | Endpoint | Body |
|------|--------|----------|------|
| 목록 조회 | GET | `/api/fmea/projects` | - |
| 상세 조회 | GET | `/api/fmea/projects?id={id}` | - |
| 저장/수정 | POST | `/api/fmea/projects` | `{ fmeaId, fmeaType, project, fmeaInfo, cftMembers, parentApqpNo, parentFmeaId }` |
| APQP 목록 | GET | `/api/apqp` | - |
| 접속 로그 | GET | `/api/auth/access-log?projectId={id}` | - |

### 2.5 FMEA ID 생성 규칙

```
형식: pfm{YY}-{t}{NNN}

예시:
- pfm26-m001  (Master FMEA, 2026년, 1번)
- pfm26-f001  (Family FMEA)
- pfm26-p001  (Part FMEA)

규칙:
- YY: 연도 뒤 2자리
- t: 유형 (m=Master, f=Family, p=Part) 소문자
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
│ pfmea-projects │                    │ FMEAProject │
│ pfmea-last-edited │                 │ FMEACft     │
└─────────────┘                       └─────────────┘
```

---

## 3. QA 체크리스트

### 3.1 화면 로드

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 1-1 | `/pfmea/register` 접근 | 등록 화면 정상 표시 | [ ] | [ ] |
| 1-2 | 마지막 작업 FMEA 자동 로드 | localStorage에 저장된 마지막 ID 로드 | [ ] | [ ] |
| 1-3 | `?id=pfm26-p001` 파라미터로 접근 | 해당 FMEA 데이터 로드 | [ ] | [ ] |
| 1-4 | 존재하지 않는 ID로 접근 | 빈 폼 표시 또는 경고 | [ ] | [ ] |

### 3.2 기초정보 입력

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 2-1 | 회사명 입력 | 텍스트 입력 가능 | [ ] | [ ] |
| 2-2 | FMEA명 입력 | 텍스트 입력 가능 | [ ] | [ ] |
| 2-3 | FMEA ID 자동 생성 | 유형 변경 시 ID 재생성 | [ ] | [ ] |
| 2-4 | FMEA 유형 변경 (M/F/P) | 드롭다운 선택, ID 변경 | [ ] | [ ] |
| 2-5 | 상위 APQP 선택 | 모달 오픈, 선택 후 표시 | [ ] | [ ] |
| 2-6 | 상위 FMEA 선택 | 모달 오픈, 선택 후 표시 | [ ] | [ ] |
| 2-7 | 책임자 검색 (🔍) | UserSelectModal 오픈 | [ ] | [ ] |
| 2-8 | 고객 검색 (🔍) | BizInfoSelectModal 오픈 | [ ] | [ ] |
| 2-9 | 시작 일자 선택 (📅) | DatePickerModal 오픈 | [ ] | [ ] |
| 2-10 | 개정 일자 선택 (📅) | DatePickerModal 오픈 | [ ] | [ ] |

### 3.3 FMEA 기초정보 등록 옵션

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 3-1 | Master FMEA DATA 사용 클릭 | FmeaSelectModal(M) 오픈 | [ ] | [ ] |
| 3-2 | Family FMEA Data 사용 클릭 | FmeaSelectModal(F) 오픈 | [ ] | [ ] |
| 3-3 | Part FMEA Data 사용 클릭 | FmeaSelectModal(P) 오픈 | [ ] | [ ] |
| 3-4 | 신규 입력 클릭 | Import 페이지로 이동 | [ ] | [ ] |
| 3-5 | FMEA 선택 후 워크시트 이동 | `/pfmea/worksheet?id={id}&baseId={baseId}&mode=inherit` | [ ] | [ ] |

### 3.4 저장 기능

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 4-1 | 저장 버튼 클릭 (FMEA명 미입력) | 경고 메시지 표시 | [ ] | [ ] |
| 4-2 | 저장 버튼 클릭 (정상) | "저장됨" 표시, DB 저장 | [ ] | [ ] |
| 4-3 | 저장 후 URL 업데이트 | `?id={fmeaId}` 추가 | [ ] | [ ] |
| 4-4 | localStorage 동기화 | pfmea-projects 업데이트 | [ ] | [ ] |
| 4-5 | 새로 등록 버튼 클릭 | 폼 초기화, 새 ID 생성 | [ ] | [ ] |
| 4-6 | 불러오기 버튼 클릭 | FmeaSelectModal(LOAD) 오픈 | [ ] | [ ] |

### 3.5 CFT 구성

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 5-1 | CFT 테이블 표시 | 10행 기본 표시 | [ ] | [ ] |
| 5-2 | 역할 선택 | 드롭다운 정상 동작 | [ ] | [ ] |
| 5-3 | 성명 검색 (🔍) | UserSelectModal 오픈 | [ ] | [ ] |
| 5-4 | 사용자 선택 후 반영 | 이름, 부서, 직급 자동 입력 | [ ] | [ ] |
| 5-5 | 행 추가 | + 버튼으로 행 추가 | [ ] | [ ] |
| 5-6 | 행 삭제 | - 버튼으로 행 삭제 | [ ] | [ ] |

### 3.6 접속 로그

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 6-1 | 접속 로그 표시 | 최근 5건 표시 | [ ] | [ ] |
| 6-2 | 화면 진입 시 로그 기록 | action='access' 기록 | [ ] | [ ] |
| 6-3 | 저장 시 로그 기록 | action='save' 기록 | [ ] | [ ] |

### 3.7 모달 동작

| # | 테스트 항목 | 예상 결과 | PASS | FAIL |
|---|------------|----------|------|------|
| 7-1 | 모달 외부 클릭 | 모달 닫힘 | [ ] | [ ] |
| 7-2 | 모달 X 버튼 클릭 | 모달 닫힘 | [ ] | [ ] |
| 7-3 | 모달 검색 기능 | 검색어로 필터링 | [ ] | [ ] |
| 7-4 | 모달 항목 선택 | 값 반영 후 모달 닫힘 | [ ] | [ ] |

---

## 4. 파일 구조

```
src/app/pfmea/register/
├── page.tsx              # 메인 페이지 (459행)
├── types.ts              # 타입 정의
├── utils.ts              # 유틸리티 함수
├── hooks/
│   ├── index.ts
│   ├── useRegisterState.ts
│   ├── useModalState.ts
│   ├── useFmeaApi.ts
│   └── useRegisterHandlers.ts
└── components/
    ├── index.ts
    ├── RegisterInfoSection.tsx
    ├── CFTSection.tsx
    └── AccessLogSection.tsx

src/components/modals/
├── FmeaSelectModal.tsx   # FMEA 선택 (공통)
├── ApqpSelectModal.tsx   # APQP 선택 (공통)
├── BizInfoSelectModal.tsx
├── UserSelectModal.tsx
└── DatePickerModal.tsx
```

---

## 5. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.1.0 | 2026-01-23 | 변경 히스토리 기능 추가, 데이터 영구 유지 (localStorage), FMEA 유형별 ID 재생성, 코드 프리즈 |
| 1.0.0 | 2026-01-22 | 초기 작성, 코드 최적화 완료 (1688→459행) |

---

## 6. 코드 프리즈 선언

> **코드 프리즈 일시**: 2026-01-23  
> **대상 파일**: `src/app/pfmea/register/page.tsx`

### 6.1 프리즈 완료 기능

| 기능 | 상태 | 설명 |
|------|------|------|
| 기초정보 입력 | ✅ 완료 | 회사명, FMEA명, 고객명 등 17개 필드 |
| FMEA ID 자동 생성 | ✅ 완료 | 유형별 자동 채번 (M/F/P) |
| CFT 구성 | ✅ 완료 | 10행 기본, 역할 드롭다운 |
| 상위 FMEA 선택 | ✅ 완료 | Master는 자기 자신 |
| 변경 이력 기록 | ✅ 완료 | 편집 시 필드별 변경 추적 |
| 데이터 영구 유지 | ✅ 완료 | localStorage로 새로고침 후에도 유지 |
| 모달 통합 | ✅ 완료 | 사용자, 고객, 날짜, FMEA, APQP 선택 |

### 6.2 변경 금지 항목

1. **레이아웃**: 화면 구조 및 패딩 변경 금지
2. **API 엔드포인트**: 기존 API 형식 유지
3. **상태 구조**: fmeaInfo, cftMembers 구조 유지
4. **저장 로직**: localStorage/DB 동기화 로직 유지
