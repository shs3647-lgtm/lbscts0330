# PFD 등록 화면 모듈화 및 리팩토링 계획

## 1. 개요
*   **목표**: `src/app/pfd/register/page.tsx`의 비대화를 해소하고, 핵심 기능인 **CP-PFD 연동 로직**을 독립된 모듈로 분리하여 유지보수성과 안정성을 확보함.
*   **작업 브랜치**: `feature/pfd-cp-sync` (또는 `feature/refactor-pfd-register`)
*   **대상 파일**: `src/app/pfd/register/page.tsx` (현재 약 1,200라인)

## 2. 분리 대상 컴포넌트

### 2.1 UI 컴포넌트 (`src/app/pfd/register/components/`)
| 컴포넌트명 | 역할 | 비고 |
|---|---|---|
| **`CpManageModal.tsx`** | 연동 CP 목록을 관리(추가/삭제)하고 상태를 시각화하는 모달 | **핵심 기능** |
| `PfdSelectModal.tsx` | Master/Family/Part PFD 선택 및 로드 기능 | 재사용 가능 |
| `FmeaSelectModal.tsx` | 상위 FMEA를 검색하고 선택하여 연결하는 모달 | |
| `CpSelectModal.tsx` | 기존 CP 목록을 단순 조회(참고용)하는 모달 | |

### 2.2 로직 및 상태 관리 (`src/app/pfd/register/hooks/`)
| 훅 이름 | 역할 | 포함 로직 |
|---|---|---|
| **`usePfdRegister.ts`** | 등록 화면의 전체 상태 관리 및 이벤트 핸들링 | - Form State (`pfdInfo`)<br>- `handleSave` (API 호출)<br>- `loadData` (초기화) |
| `useCpLinkage.ts` | CP 연동 관련 특화 로직 | - `linkedCpList` 관리<br>- `addLinkedCp`<br>- `generateLinkedCpNo` |

### 2.3 유틸리티 (`src/app/pfd/utils/`)
| 파일명 | 역할 |
|---|---|
| `pfdIdUtils.ts` | ID 생성, 유효성 검사, 연동 ID 변환 로직 (`generatePFDId`, `generateLinkedCpNo` 등) |

## 3. 리팩토링 후 기대 효과
1.  **가독성 향상**: `page.tsx`의 코드가 300라인 이내로 축소되어 메인 로직 파악이 쉬워짐.
2.  **재사용성**: ID 생성 로직이나 모달들이 다른 곳(예: 워크시트)에서도 재사용 가능해짐.
3.  **안전성**: 핵심 로직(`useCpLinkage`)이 분리되어, UI 수정 시 실수로 로직을 건드릴 위험이 감소함.

## 4. 진행 순서
1.  디렉토리 생성: `components`, `hooks`, `utils`
2.  유틸리티 함수 분리 (`pfdIdUtils.ts`)
3.  하위 모달 컴포넌트 분리 (`CpManageModal` 등)
4.  메인 로직 훅 분리 (`usePfdRegister.ts`)
5.  `page.tsx`에서 분리된 모듈 조립 및 테스트

## 5. 중요 알림
현재 **등록 화면 연동(Linkage)** 기능은 구현되어 테스트 가능하나, **워크시트 임포트(Import)** 기능은 아직 구현 전입니다. 리팩토링 완료 후 워크시트 구현을 진행할 예정입니다.
