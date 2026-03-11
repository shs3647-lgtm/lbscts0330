# 🔒 코드프리즈 파일 목록 (룰 1번)

> ⚠️ **2026-01-10 기준 전체 UI 코드프리즈**
> 
> 이 목록의 파일들은 **절대 수정 금지**입니다.
> 사용자의 명시적 승인 없이 수정 시 즉시 작업 중단합니다.

---

## 📌 룰 1번 핵심 원칙

### ⚠️ UI 수정 시 필수 프로세스 (2단계 승인)

**1단계: 수정 여부 확인**
> "이 파일은 코드프리즈입니다. 수정하시겠습니까?"

**2단계: 수정 범위 확인** (1단계 승인 후)
> "어디까지 수정할까요?"
> - 이 함수만
> - 이 컴포넌트만
> - 전체 파일
> - 기타 (구체적으로 지정)

**3단계: 범위 내에서만 수정**
> 승인된 범위 외 수정 절대 금지

### 핵심 규칙
1. **UI는 반드시 사용자 허락 후에만 변경**
2. **수정 전 반드시 범위 확인**
3. **승인된 범위만 수정**
4. **위반 시 즉시 `git checkout`으로 복원**
5. **인라인 스타일(style={{}}) 사용 금지** - Tailwind 클래스만 사용
   - ❌ `style={{ width: '500px' }}`
   - ✅ `className="w-[500px]"`
   - 예외: 동적 계산값(줄무늬 색상 등)만 허용
6. **⚠️ FMEA 워크시트 레이블명 절대 수정 금지** (DB/다른 앱 연계성)
   - 완제품명, 메인공정명, 작업요소, 4M, 기능, 특성 등 모든 컬럼/헤더 레이블명
   - DB 스키마, API 응답, 다른 앱(APQP, DFMEA, CP 등)과의 연계성
   - 태그: `codefreeze-20260111-label-names-frozen`

---

## 🚫 절대 수정 금지 파일 (전체 목록)

### 0-1. CP 공정명 입력 모달 (2026-01-14)
| 파일 | 코드프리즈 태그 |
|------|----------------|
| `src/app/control-plan/worksheet/components/ProcessFlowInputModal.tsx` | codefreeze-20260114-cp-process-input-modal |
| `src/app/control-plan/worksheet/page.tsx` (모달 통합 부분) | codefreeze-20260114-cp-process-input-modal |
| `src/app/control-plan/worksheet/renderers/index.tsx` (공정명 셀 클릭) | codefreeze-20260114-cp-process-input-modal |

**⚠️ 중요: CP 공정명 입력 모달 절대 변경 금지**
- 우측 350px 고정 위치
- 전체 공정 선택 시 모든 공정 워크시트 반영 로직
- 상세 내용: `docs/CODEFREEZE_CP_PROCESS_INPUT_MODAL_20260114.md` 참조

### 0-2. CP 공정설명 입력 모달 (2026-01-14)
| 파일 | 코드프리즈 태그 |
|------|----------------|
| `src/app/control-plan/worksheet/components/ProcessDescInputModal.tsx` | codefreeze-20260114-cp-process-desc-input-modal |
| `src/app/control-plan/worksheet/page.tsx` (모달 통합 부분) | codefreeze-20260114-cp-process-desc-input-modal |
| `src/app/control-plan/worksheet/renderers/index.tsx` (공정설명 셀 클릭) | codefreeze-20260114-cp-process-desc-input-modal |

**⚠️ 중요: CP 공정설명 입력 모달 절대 변경 금지**
- 우측 350px 고정 위치
- 단일 선택 (라디오 버튼)
- 공정 정보 표시 영역 유지
- 상세 내용: `docs/CODEFREEZE_CP_PROCESS_DESC_INPUT_MODAL_20260114.md` 참조

### 0. DFMEA 모듈 재작성 (2026-01-14)
| 파일 | 코드프리즈 태그 |
|------|----------------|
| `src/app/dfmea/worksheet/tabs/StructureTab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/function/FunctionTab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/function/FunctionL1Tab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/function/FunctionL2Tab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/function/FunctionL3Tab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/failure/FailureTab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/failure/FailureL1Tab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/failure/FailureL2Tab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/failure/FailureL3Tab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/failure/FailureLinkTab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/failure/FailureLinkTables.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/failure/FailureLinkResult.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/RiskTab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/OptTab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/DocTab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/AllViewTab.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/all/allTabConstants.ts` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/all/processFailureLinks.ts` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/all/AllTabRenderer.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/all/AllTabBasic.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/all/AllTabAtomic.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/all/StructureCellRenderer.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/tabs/all/FunctionCellRenderer.tsx` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/columns.ts` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/constants.ts` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/schema.ts` | codefreeze-20260114-dfmea-rewrite-complete |
| `src/app/dfmea/worksheet/terminology.ts` | codefreeze-20260114-dfmea-rewrite-complete |

**⚠️ 중요: DFMEA 용어 및 구조 절대 변경 금지**
- "제품명", "A'SSY", "부품 또는 특성", "부품 특성" 등 DFMEA 전용 용어
- 4M 관련 코드 완전 제거 (재추가 금지)
- 공정번호 관련 필드 완전 제거 (재추가 금지)
- 컬럼 수: 34개 (4M 제거)
- 상세 내용: `docs/CODEFREEZE_DFMEA_REWRITE_20260114.md` 참조

### 1. PFMEA 화면
| 파일 | 코드프리즈 태그 |
|------|----------------|
| `src/app/pfmea/register/page.tsx` | codefreeze-20260110-register-final<br/>codefreeze-20260113-apqp-string-unified |
| `src/app/pfmea/list/page.tsx` | codefreeze-20260110-full-system |
| `src/app/pfmea/worksheet/page.tsx` | codefreeze-20260110-all-ui-freeze<br/>codefreeze-20260111-worksheet-110percent (110% 배율) |
| `src/app/pfmea/import/page.tsx` | codefreeze-20260110-pfmea-import |
| `src/app/pfmea/revision/page.tsx` | codefreeze-20260110-revision-approval |

### 2. 워크시트 탭 (2ST~6ST 전체)
| 파일 | 코드프리즈 태그 |
|------|----------------|
| `src/app/pfmea/worksheet/tabs/StructureTab.tsx` | codefreeze-20260110-structure-final<br/>codefreeze-20260111-structure-zebra (메인공정명 줄무늬) ⚠️ **UI 절대 변경 금지** |
| `src/app/pfmea/worksheet/tabs/function/FunctionL1Tab.tsx` | codefreeze-20260104-worksheet-complete |
| `src/app/pfmea/worksheet/tabs/function/FunctionL2Tab.tsx` | codefreeze-20260104-worksheet-complete<br/>codefreeze-20260111-function-l2-final (최종 확정) |
| `src/app/pfmea/worksheet/tabs/function/FunctionL3Tab.tsx` | codefreeze-20260104-worksheet-complete<br/>codefreeze-20260111-function-l3-zebra (메인공정명 줄무늬 최종) |
| `src/app/pfmea/worksheet/tabs/failure/FailureL1Tab.tsx` | codefreeze-20260104-worksheet-complete<br/>codefreeze-20260112-failure-l1-doubleclick-edit (더블클릭 인라인 수정)<br/>codefreeze-20260110-sod-scope-mapping (SOD scope SP/YP 약어 처리) |
| `src/app/pfmea/worksheet/tabs/failure/FailureL2Tab.tsx` | codefreeze-20260104-worksheet-complete |
| `src/app/pfmea/worksheet/tabs/failure/FailureL3Tab.tsx` | codefreeze-20260104-worksheet-complete |
| `src/app/pfmea/worksheet/tabs/failure/FailureLinkTab.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/tabs/failure/FailureLinkTables.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/tabs/failure/FailureLinkDiagram.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/tabs/RiskTab.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/tabs/RiskTabConfirmable.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/tabs/OptTab.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/tabs/OptTabConfirmable.tsx` | codefreeze-20260110-failure-link-all |

### 2-1. ALL 화면 (전체보기)
| 파일 | 코드프리즈 태그 |
|------|----------------|
| `src/app/pfmea/worksheet/tabs/all/AllTabAtomic.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/tabs/all/AllTabWithLinks.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/tabs/all/AllTabRenderer.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/tabs/all/AllTabBasic.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/tabs/AllViewTab.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/components/AllViewRightPanel.tsx` | codefreeze-20260110-failure-link-all |
| `src/app/pfmea/worksheet/components/AllTabRightPanel.tsx` | codefreeze-20260110-failure-link-all |

### 3. 모달 (350px 고정, pt-200px 위치)
| 파일 | 크기/위치 | 코드프리즈 태그 |
|------|----------|----------------|
| `src/app/pfmea/worksheet/ProcessSelectModal.tsx` | **350px, pt-[200px]** | codefreeze-20260110-modal-treeview-350px |
| `src/app/pfmea/worksheet/WorkElementSelectModal.tsx` | **350px, pt-[200px]** | codefreeze-20260110-modal-treeview-350px |
| `src/components/modals/BaseSelectModal.tsx` | **350px** | codefreeze-20260110-modal-treeview-350px |
| `src/components/modals/StandardSelectModal.tsx` | **350px** | codefreeze-20260110-modal-treeview-350px |

### 4. 사이드바 & 레이아웃
| 파일 | 코드프리즈 태그 |
|------|----------------|
| `src/components/layout/Sidebar.tsx` | codefreeze-20260110-sidebar |
| `src/styles/layout.ts` | codefreeze-20260110-350px-unified |

### 4-1. 트리뷰 & 우측 패널 (350px 고정)
| 파일 | 크기 | 코드프리즈 태그 |
|------|------|----------------|
| `src/app/pfmea/worksheet/page.tsx` (트리뷰 영역) | **350px** | codefreeze-20260110-modal-treeview-350px |
| `src/app/pfmea/worksheet/panels/APTable/APTable5.tsx` | **350px** (RIGHT_PANEL_WIDTH) | codefreeze-20260110-modal-treeview-350px |
| `src/app/pfmea/worksheet/panels/APTable/APTable6.tsx` | **350px** (RIGHT_PANEL_WIDTH) | codefreeze-20260110-modal-treeview-350px |

### 5. Control Plan (CP) 화면
| 파일 | 코드프리즈 태그 |
|------|----------------|
| `src/app/control-plan/layout.tsx` | **codefreeze-20260113-cp-layout-alignment** ⚠️ UI 절대 변경 금지 |
| `src/app/control-plan/worksheet/page.tsx` | **codefreeze-20260113-cp-layout-alignment**<br/>**codefreeze-20260113-cp-enter-key-row-add** ⚠️ UI 절대 변경 금지 |
| `src/app/control-plan/worksheet/components/CPTopMenuBar.tsx` | **codefreeze-20260113-cp-layout-alignment** ⚠️ UI 절대 변경 금지 |
| `src/app/control-plan/worksheet/components/CPTabMenu.tsx` | **codefreeze-20260113-cp-layout-alignment** ⚠️ UI 절대 변경 금지 |
| `src/app/control-plan/worksheet/renderers/index.tsx` | **codefreeze-20260113-cp-enter-key-row-add** ⚠️ UI 절대 변경 금지 |
| `src/app/control-plan/worksheet/hooks/useRowSpan.ts` | **codefreeze-20260113-cp-rowspan-logic** ⚠️ 로직 절대 변경 금지 |
| `src/app/control-plan/worksheet/hooks/useWorksheetHandlers.ts` | **codefreeze-20260113-cp-row-add-logic** ⚠️ 로직 절대 변경 금지 |
| `src/app/control-plan/worksheet/utils/index.ts` | **codefreeze-20260113-cp-utils** ⚠️ 로직 절대 변경 금지 |
| `src/components/layout/CommonTopNav.tsx` | **codefreeze-20260113-cp-layout-alignment** ⚠️ UI 절대 변경 금지 |
| `src/app/globals.css` | **codefreeze-20260113-cp-scrollbar** ⚠️ 스타일 절대 변경 금지 |
| `src/app/layout.tsx` | **codefreeze-20260113-cp-layout-padding** ⚠️ 레이아웃 절대 변경 금지 |
| `src/components/layout/StatusBar.tsx` | **codefreeze-20260113-cp-statusbar** ⚠️ UI 절대 변경 금지 |
| `src/app/control-plan/import/page.tsx` | **codefreeze-20260114-cp-import-modularization**<br/>**codefreeze-20260114-cp-import-layout** ⚠️ 모듈화 구조 절대 변경 금지 |
| `src/app/control-plan/import/components/PreviewTable.tsx` | **codefreeze-20260114-cp-import-modularization** ⚠️ 컴포넌트 구조 절대 변경 금지 |
| `src/app/control-plan/import/components/PreviewTabs.tsx` | **codefreeze-20260114-cp-import-modularization** ⚠️ 컴포넌트 구조 절대 변경 금지 |
| `src/app/control-plan/import/components/ImportStatusBar.tsx` | **codefreeze-20260114-cp-import-modularization** ⚠️ 컴포넌트 구조 절대 변경 금지 |
| `src/app/control-plan/import/components/ImportMenuBar.tsx` | **codefreeze-20260114-cp-import-modularization** ⚠️ 컴포넌트 구조 절대 변경 금지 |
| `src/app/control-plan/import/hooks/useEditHandlers.ts` | **codefreeze-20260114-cp-import-modularization** ⚠️ 훅 구조 절대 변경 금지 |

**⚠️ 중요: CP 화면 레이아웃 절대 변경 금지**
- 사이드바 간격: 5px (53px 위치)
- 메뉴바 좌측 정렬: left-[53px] 통일
- 워크시트: fixed 레이아웃 (top-[100px])
- FMEA와 동일한 구조 유지 필수

**⚠️ 중요: CP 워크시트 행 추가 로직 절대 변경 금지**
- 엔터 키 행 추가 기능: D열에서 C~S열만 독립 행으로 추가
- A/B열은 부모 값 상속하여 rowSpan 병합
- rowSpan 계산: 빈 값은 병합하지 않음
- 컨텍스트 메뉴 위/아래 행 추가도 동일 로직

### 6. 기초정보
| 파일 | 코드프리즈 태그 |
|------|----------------|
| `src/app/master/user/page.tsx` | codefreeze-20260110-master-info |
| `src/app/master/customer/page.tsx` | codefreeze-20260110-master-info |

### 6. 웰컴보드
| 파일 | 코드프리즈 태그 |
|------|----------------|
| `src/app/welcomeboard/page.tsx` | codefreeze-20260110-all-ui-freeze |

### 7. Import 관련
| 파일 | 코드프리즈 태그 |
|------|----------------|
| `src/app/pfmea/import/excel-parser.ts` | codefreeze-20260110-excel-sheet |
| `src/app/pfmea/import/excel-template.ts` | codefreeze-20260110-excel-sheet |
| `src/app/pfmea/import/constants.ts` | codefreeze-20260110-excel-sheet |

---

## ✅ 수정 허용 조건

1. 사용자가 **명시적으로** "이 파일 수정해"라고 요청
2. **버그 수정**이 필요한 경우 (사용자 승인 후)
3. **API 파일**은 기능 개선 가능 (UI 변경 없이)

---

## 🔄 수정 전 체크리스트 (필수 - 2단계 승인)

파일 수정 전 반드시 확인:

- [ ] 이 문서에서 해당 파일이 코드프리즈인지 확인
- [ ] **1단계**: "이 파일은 코드프리즈입니다. 수정하시겠습니까?" 질문
- [ ] 승인 없으면 → **수정 금지**
- [ ] **2단계**: "어디까지 수정할까요? (함수/컴포넌트/파일)" 범위 질문
- [ ] 범위 승인 후 → **승인된 범위만 수정**
- [ ] 범위 외 수정 → **절대 금지**

---

## 🏷️ 마스터 코드프리즈 태그

```
codefreeze-20260110-all-ui-freeze  (전체 UI 코드프리즈)
codefreeze-20260111-worksheet-110percent  (워크시트 110% 배율 확정)
codefreeze-20260111-function-l2-final  (기능2L 최종 확정)
codefreeze-20260111-function-l3-zebra  (기능3L 메인공정명 줄무늬)
codefreeze-20260111-structure-zebra  (구조분석 메인공정명 줄무늬)
codefreeze-20260111-label-names-frozen  (⚠️ 레이블명 절대 수정 금지)
codefreeze-20260111-batch-freeze  (일괄 코드프리즈 - 2026-01-11)
codefreeze-20260111-pre-fmea-new-write  (FMEA 새로 작성 전 전체 시스템 코드프리즈)
```

---

## ✅ 최근 코드프리즈 내역 (2026-01-11)

### 1. 워크시트 기본 배율 110% 확정
- `src/app/pfmea/worksheet/page.tsx` - 워크시트 영역 zoom: 1.1 고정
- 구조분석 화면과 동일한 배율 유지

### 2. 작업요소 돋보기 표시 로직 표준화
- `src/app/pfmea/worksheet/tabs/StructureTab.tsx` - SelectableCell과 동일하게 value 있을 때 돋보기 숨김
- 메인공정기능과 일관성 유지

### 3. 기능2L(메인공정기능) 최종 코드프리즈
- `src/app/pfmea/worksheet/tabs/function/FunctionL2Tab.tsx` - 태그: `codefreeze-20260111-function-l2-final`
- 작업요소 돋보기 표시 로직 표준화 완료

### 4. 기능3L 메인공정명 줄무늬 최종 확정
- `src/app/pfmea/worksheet/tabs/function/FunctionL3Tab.tsx` - 태그: `codefreeze-20260111-function-l3-zebra`
- 공정 인덱스 기준 홀수/짝수 줄무늬 적용 (자재입고/수입검사 색상 구분)

### 5. 구조분석 메인공정명 줄무늬 최종 확정
- `src/app/pfmea/worksheet/tabs/StructureTab.tsx` - 태그: `codefreeze-20260111-structure-zebra`
- 공정 인덱스 기준 홀수/짝수 줄무늬 적용

### 6. ⚠️ FMEA 워크시트 레이블명 절대 수정 금지
- **태그**: `codefreeze-20260111-label-names-frozen`
- **규칙**: 모든 컬럼/헤더 레이블명 절대 수정 금지
  - 완제품명, 메인공정명, 작업요소, 4M, 기능, 특성 등
  - 이유: DB 스키마, API 응답, 다른 앱(APQP, DFMEA, CP 등)과의 연계성
  - 수정 시: DB 마이그레이션, API 버전 관리, 다른 앱 동기화 등 복잡한 영향

---

### 7. FMEA 새로 작성 전 전체 시스템 코드프리즈
- **태그**: `codefreeze-20260111-pre-fmea-new-write`
- **날짜**: 2026-01-11 15:53
- **내용**: 
  - DB 백업 가이드 추가 (`docs/DB_BACKUP_GUIDE.md`)
  - 백업 스크립트 추가 (`scripts/backup-db.js`, `scripts/backup-db.ps1`)
  - 복원 스크립트 추가 (`scripts/restore-db.js`)
  - 백업 정리 스크립트 추가 (`scripts/cleanup-backups.js`)
  - 코드 정리 및 문서 업데이트
- **백업 태그**: `backup-20260111-1553`

---

---

## ✅ 최근 코드프리즈 내역 (2026-01-13)

### 8. CP 워크시트 엔터 키 행 추가 기능 및 rowSpan 병합 로직 확정
- **태그**: `codefreeze-20260113-cp-enter-key-row-add`, `codefreeze-20260113-cp-rowspan-logic`, `codefreeze-20260113-cp-row-add-logic`
- **날짜**: 2026-01-13
- **내용**:
  - 엔터 키로 행 추가 기능 구현 (수동 모드)
  - D열(공정설명)에서 행 추가 시 C~S열만 독립 행으로 추가
  - A/B열은 부모 값 상속하여 rowSpan 병합
  - rowSpan 계산 로직 개선: 빈 값은 병합하지 않도록 수정
  - 컨텍스트 메뉴 위/아래 행 추가도 동일 로직 적용
- **파일**:
  - `src/app/control-plan/worksheet/page.tsx`
  - `src/app/control-plan/worksheet/renderers/index.tsx`
  - `src/app/control-plan/worksheet/hooks/useRowSpan.ts`
  - `src/app/control-plan/worksheet/hooks/useWorksheetHandlers.ts`
  - `src/app/control-plan/worksheet/utils/index.ts`
  - `src/app/globals.css`
  - `src/app/layout.tsx`
  - `src/components/layout/StatusBar.tsx`

---

## ✅ 최근 코드프리즈 내역 (2026-01-14)

### 9. DFMEA 모듈 재작성 완료
- **태그**: `codefreeze-20260114-dfmea-rewrite-complete`
- **날짜**: 2026-01-14
- **내용**:
  - Phase 1-5 완료: PFMEA 구조 복사, 컬럼 정의, 탭 재작성, 인라인 스타일 제거, 검증
  - 모든 PFMEA 용어를 DFMEA 용어로 변경 (제품명, A'SSY, 부품 또는 특성 등)
  - 4M 및 공정번호 관련 코드 완전 제거
  - 컬럼 수: 35개 → 34개 (4M 제거)
  - P-FMEA → D-FMEA 텍스트 변경
  - 인라인 스타일 제거 (고정 스타일만 Tailwind CSS로 변환)
- **파일**: DFMEA 워크시트 탭 파일 전체 (27개 파일)
- **문서**: `docs/CODEFREEZE_DFMEA_REWRITE_20260114.md`, `docs/DFMEA_REWRITE_COMPLETION_REPORT.md`

---

## ✅ 최근 코드프리즈 내역 (2026-01-24)

### 11. 리스트 페이지 모듈화 완료
- **태그**: `codefreeze-20260124-list-modularization`
- **날짜**: 2026-01-24
- **커밋**: `466f255`, `6b92b76`
- **내용**:
  - 5개 모듈 리스트 페이지 모듈화 완료 (PFMEA, DFMEA, CP, PFD, APQP)
  - 공통 컴포넌트 추출: StepBadge, TypeBadge, ListActionBar, ListStatusBar, useListSelection
  - 코드 감소: 2,159줄 → 1,163줄 (-46%)
- **파일**:
  - `src/app/pfmea/list/page.tsx` (291줄)
  - `src/app/dfmea/list/page.tsx` (157줄)
  - `src/app/pfd/list/page.tsx` (158줄)
  - `src/app/control-plan/list/page.tsx` (149줄)
  - `src/app/apqp/list/page.tsx` (138줄)
  - `src/components/list/StepBadge.tsx` (34줄)
  - `src/components/list/TypeBadge.tsx` (42줄)
  - `src/components/list/ListActionBar.tsx` (101줄)
  - `src/components/list/ListStatusBar.tsx` (29줄)
  - `src/components/list/hooks/useListSelection.ts` (64줄)
  - `src/components/list/index.ts`

---

## ✅ 최근 코드프리즈 내역 (2026-01-16)

### 10. 워크시트 기능 개선 (사용자 승인)
- **태그**: `codefreeze-20260116-worksheet-improvements`
- **날짜**: 2026-01-16
- **내용**:
  1. **모달 삭제 시 모달 유지**: 항목 삭제 후에도 모달이 닫히지 않고 유지
     - `DataSelectModal.tsx`, `BaseSelectModal.tsx` 수정
  2. **누락 발생 시 자동 수정 모드 전환**: 확정 상태에서 누락건 발생 시 자동으로 수정 모드로 전환
     - `StructureTab.tsx`, `FunctionL1Tab.tsx`, `FunctionL2Tab.tsx`, `FunctionL3Tab.tsx`
     - `FailureL1Tab.tsx`, `FailureL2Tab.tsx`, `FailureL3Tab.tsx`
  3. **"(자동생성)" 플레이스홀더 데이터 완전 제거**:
     - API 저장/로드 시 `cleanAutoGeneratedData()` 함수로 필터링 (`api/fmea/route.ts`)
     - 프론트엔드 렌더링 시 필터링 (Function 탭들의 `isMeaningfulFunc`, `getMeaningfulChars`)
- **파일**:
  - `src/app/api/fmea/route.ts`
  - `src/components/modals/DataSelectModal.tsx`
  - `src/components/modals/BaseSelectModal.tsx`
  - `src/app/pfmea/worksheet/tabs/StructureTab.tsx`
  - `src/app/pfmea/worksheet/tabs/function/FunctionL1Tab.tsx`
  - `src/app/pfmea/worksheet/tabs/function/FunctionL2Tab.tsx`
  - `src/app/pfmea/worksheet/tabs/function/FunctionL3Tab.tsx`
  - `src/app/pfmea/worksheet/tabs/failure/FailureL1Tab.tsx`
  - `src/app/pfmea/worksheet/tabs/failure/FailureL2Tab.tsx`
  - `src/app/pfmea/worksheet/tabs/failure/FailureL3Tab.tsx`

---

## 📅 마지막 업데이트: 2026-01-24
