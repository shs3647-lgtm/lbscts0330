# FMEA-CP-PFD 연동 및 모듈화 전략

## 1. 개요
본 문서는 FMEA, Control Plan(CP), Process Flow Diagram(PFD) 간의 데이터 연동 시스템을 구축하고, 비대해진 코드를 모듈화하여 유지보수성과 확장성을 확보하기 위한 기술적 전략을 정의합니다.

## 2. 모듈화 목표 및 구조 (Refactoring)
PFD 및 관련 모듈의 코드가 방대해짐에 따라(God Component 문제 해결), 다음과 같이 UI, 로직, 유틸리티를 분리합니다.

### 2.1 PFD 모듈 폴더 구조
```text
src/app/pfd/
├── utils/                 # [Utils] 공통 유틸리티
│   └── pfdIdUtils.ts      # ID 생성, 패턴 분석, 연동 ID 변환(pfd->cp)
└── register/
    ├── page.tsx           # [View] 메인 컨테이너 (Layout & Assembly)
    ├── hooks/             # [Logic] 비즈니스 로직 (Custom Hooks)
    │   ├── usePfdRegister.ts  # 폼 상태 관리, 데이터 로드/저장
    │   └── useCpLinkage.ts    # CP 연동, 1:N 관계 관리
    └── components/        # [UI] 컴포넌트
        ├── CpManageModal.tsx  # 연동 CP 추가/삭제/상태표시
        ├── FmeaSelectModal.tsx
        ├── PfdSelectModal.tsx
        └── CpSelectModal.tsx
```

## 3. 데이터 연동 (Linkage) 전략
각 문서는 고유 ID 체계를 가지며, 상호 참조를 통해 연결됩니다.

### 3.1 ID 관리 체계
*   **PFD**: `pfd26-p001` (Master/Family/Part)
*   **연동 CP**: `cpl26-p001` (PFD ID 기반 자동 생성, 접두어 `cpl`)
*   **연동 FMEA**: FMEA ID(`pfm26-m001`)를 PFD에 외래키(`fmeaId`)로 저장

### 3.2 데이터 흐름 (Data Flow)
1.  **등록 단계 (Registration)**
    *   사용자가 PFD 등록 시 '상위 FMEA'와 '연동 CP'를 지정.
    *   API는 `PfdRegistration` 테이블의 `fmeaId`, `cpNo` 필드에 관계 정보를 저장하여 DB 원자성 보장.
2.  **워크시트 단계 (Worksheet)**
    *   **Import**: PFD 워크시트 진입 시 연동된 CP/FMEA 데이터를 불러와 병합.
    *   **Sync**: 연결된 문서의 변경 사항이 발생하면, 사용자 승인 하에 동기화(추후 구현).

## 4. 단계별 구현 계획 (Roadmap)

### Phase 1: 모듈화 (Refactoring) - ✅ 완료
*   [x] Utils 분리 (`pfdIdUtils.ts`)
*   [x] UI 컴포넌트 분리 (`CpManageModal`, `PfdBasicInfoTable` 등)
*   [x] Logic Hook 분리 (`usePfdRegister.ts`, `useCpLinkage.ts`)
*   [x] `page.tsx` 경량화 (846줄 → 350줄)

### Phase 2: 기본 연동 (Linkage) - 완료
*   [x] PFD 등록 스키마에 `linkedCpNo` 등 필드 추가
*   [x] API 및 저장 로직 구현
*   [x] TDD 기반 검증 시나리오 확보

### Phase 3: 워크시트 통합 (Worksheet Import)
*   [ ] 워크시트용 데이터 Import 모듈 구현
*   [ ] CP 데이터 -> PFD 구조 변환 로직 구현
*   [ ] 워크시트 UI 내 'CP 데이터 가져오기' 기능 탑재

## 5. 결론
이 구조는 단순히 기능을 구현하는 것을 넘어, 향후 유지보수 비용을 획기적으로 줄이고 시스템의 안정성을 보장하기 위한 필수적인 조치입니다. Phase 1(모듈화) 완료 후 Phase 3(워크시트 통합)로 넘어갑니다.

---

## 6. 등록화면 연동 섹션 통합 계획 (Phase 4)

### 6.1 현재 문제점
- **일관성 부족**: 4개 등록화면(APQP, PFMEA, PFD, CP)마다 연동 UI가 다름
- **분산된 코드**: 각 화면마다 연동 태그 렌더링 코드가 중복
- **유지보수 어려움**: 스타일/동작 변경 시 4곳 모두 수정 필요

### 6.2 목표
1. **통일된 연동 섹션 컴포넌트** 생성
2. **4개 등록화면**에서 동일한 UI/UX 제공
3. **클릭 → 이동** 기능 표준화
4. **1:N 연동 지원** (하나의 PFMEA → 여러 CP)

### 6.3 통합 연동 섹션 UI 설계

```
┌─────────────────────────────────────────────────────────────────┐
│                    📎 프로젝트 연동 정보                         │
├─────────────────────────────────────────────────────────────────┤
│  상위 APQP  │ [APQP] pj26-001 ×     │ 클릭 시 APQP 등록화면 이동 │
├─────────────────────────────────────────────────────────────────┤
│  상위 FMEA  │ [FMEA] pfm26-m001 ×   │ 클릭 시 PFMEA 등록화면 이동│
├─────────────────────────────────────────────────────────────────┤
│  연동 PFD   │ [PFDL] pfdl26-p001 ×  │ 클릭 시 PFD 등록화면 이동  │
├─────────────────────────────────────────────────────────────────┤
│  연동 CP    │ [CP] cpl26-p001 × +   │ 클릭 시 CP 등록화면 이동   │
│             │ [CP] cpl26-p002 × +   │ 1:N 지원 (여러 CP)        │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 컴포넌트 구조

```
src/components/linkage/
├── LinkageSection.tsx        # 통합 연동 섹션 컴포넌트
├── LinkageTag.tsx            # 연동 태그 (클릭 이동 포함)
├── LinkageModal.tsx          # 연동 선택 모달
├── types.ts                  # 타입 정의
└── hooks/
    └── useLinkage.ts         # 연동 상태 관리 훅
```

### 6.5 LinkageTag 컴포넌트 사양

```tsx
interface LinkageTagProps {
  type: 'APQP' | 'FMEA' | 'PFDL' | 'CP';
  id: string;                  // 연동 ID (예: pfm26-m001)
  locked?: boolean;            // 잠금 상태 (변경 불가)
  onRemove?: () => void;       // 연동 해제 콜백
  onNavigate?: () => void;     // (선택) 커스텀 이동 핸들러
}
```

**색상 규칙:**
| 타입 | 배경색 | 텍스트색 | 이동 URL |
|------|--------|----------|----------|
| APQP | green-500 | green-600 | /apqp/register?id={id} |
| FMEA | yellow-500 | yellow-700 | /pfmea/register?id={id} |
| PFDL | violet-500 | violet-700 | /pfd/register?id={id} |
| CP   | teal-500 | teal-700 | /control-plan/register?id={id} |

### 6.6 LinkageSection 컴포넌트 사양

```tsx
interface LinkageSectionProps {
  currentModule: 'APQP' | 'PFMEA' | 'PFD' | 'CP';
  currentId: string;
  apqpNo?: string | null;
  pfmeaId?: string | null;
  pfdNo?: string | null;
  cpNos?: string[];            // 1:N 지원
  onApqpChange?: (id: string | null) => void;
  onFmeaChange?: (id: string | null) => void;
  onPfdChange?: (id: string | null) => void;
  onCpAdd?: (id: string) => void;
  onCpRemove?: (id: string) => void;
  locked?: {                   // 잠금 상태
    apqp?: boolean;
    fmea?: boolean;
    pfd?: boolean;
    cp?: boolean;
  };
}
```

### 6.7 구현 우선순위

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 1 | `LinkageTag.tsx` 생성 | 30분 |
| 2 | `LinkageSection.tsx` 생성 | 1시간 |
| 3 | `useLinkage.ts` 훅 생성 | 30분 |
| 4 | PFMEA 등록화면 적용 | 30분 |
| 5 | PFD 등록화면 적용 | 30분 |
| 6 | CP 등록화면 적용 | 30분 |
| 7 | APQP 등록화면 적용 | 30분 |
| 8 | 테스트 및 검증 | 30분 |
| **합계** | | **5시간** |

### 6.8 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                    ProjectLinkage 테이블                        │
│         (중앙 집중식 연동 관리 - Single Source of Truth)        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │ PFMEA 등록    │ │ PFD 등록      │ │ CP 등록       │
    │ ┌───────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐ │
    │ │ Linkage   │ │ │ │ Linkage   │ │ │ │ Linkage   │ │
    │ │ Section   │ │ │ │ Section   │ │ │ │ Section   │ │
    │ └───────────┘ │ │ └───────────┘ │ │ └───────────┘ │
    └───────────────┘ └───────────────┘ └───────────────┘
```

### 6.9 예상 효과

1. **코드 중복 90% 감소**: 4개 화면에서 공통 컴포넌트 사용
2. **일관된 UX**: 모든 등록화면에서 동일한 연동 경험
3. **유지보수 용이**: 변경 사항 1곳만 수정
4. **확장성**: 새 모듈 추가 시 쉽게 연동 가능

### 6.10 Phase 4 마일스톤

- [ ] **6.10.1** LinkageTag 컴포넌트 생성 ✅
- [ ] **6.10.2** LinkageSection 컴포넌트 생성 ✅
- [ ] **6.10.3** useLinkage 훅 생성
- [ ] **6.10.4** 4개 등록화면에 적용 (진행 중)
- [ ] **6.10.5** E2E 테스트 작성
- [ ] **6.10.6** 문서화 완료
- [ ] **6.10.7** PFMEA page.tsx 인라인 코드 → PfmeaBasicInfoTable 교체

---

## 7. 업데이트 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-27 | ProjectLinkage 테이블 및 API 생성 |
| 2026-01-27 | 1:N 관계 지원 추가 |
| 2026-01-27 | 4개 리스트 화면 연동 정보 병합 |
| 2026-01-27 | 4개 등록화면 클릭 이동 기능 추가 |
| 2026-01-27 | Phase 4: 통합 연동 섹션 계획 수립 |
