# 🏗️ PFMEA/DFMEA 하이브리드 모듈화 계획서

> **문서 버전**: 1.5.0
> **최종 업데이트**: 2026-01-20 (5차)
> **목표**: 700행 제한 준수, 완전한 표준화/모듈화, PFMEA↔DFMEA 공용화

---

## 📊 현재 상태 진단 (2026-01-20)

### 🟢 PFMEA 코드 현황 (모듈화 완료)

| 파일 | 행 수 | 상태 | 변화 |
|------|-------|------|------|
| `AllTabEmpty.tsx` | **980** | 🟡 | 섹션 분리 필요 |
| `RiskOptCellRenderer.tsx` | **828** | 🟡 | 분리 필요 |
| `FailureL2Tab.tsx` | **787** | 🟡 | 핸들러 분리 가능 |
| `FunctionL1Tab.tsx` | **783** | 🟡 | 핸들러 분리 가능 |
| `AllTabAtomic.tsx` | **766** | 🟡 | 섹션 분리 필요 |
| `page.tsx` | **725** | 🟡 | 거의 목표 달성 |
| `FailureL3Tab.tsx` | **715** | 🟢 | ✅ -313 |
| `FailureLinkTab.tsx` | **709** | 🟢 | ✅ -796 |
| `FailureL1Tab.tsx` | **651** | 🟢 | ✅ -294 |
| `FunctionL3Tab.tsx` | **586** | 🟢 | ✅ -456 |
| `FunctionL2Tab.tsx` | **580** | 🟢 | ✅ -405 |
| `useWorksheetState.ts` | **406** | 🟢 | ✅ -1,641 |

**PFMEA 700행 초과: 6개 파일**

### 🔴 DFMEA 현황 (모듈화 필요)

| 파일 | 행 수 | 상태 | PFMEA 대비 |
|------|-------|------|-----------|
| `useWorksheetState.ts` | **2,549** | 🔴 | PFMEA 406줄 |
| `FailureLinkTab.tsx` | **1,623** | 🔴 | PFMEA 709줄 |
| `migration.ts` | **1,181** | 🔴 | - |
| `AllTabEmpty.tsx` | **1,121** | 🔴 | PFMEA 980줄 |
| `schema.ts` | **1,094** | 🔴 | - |
| `FailureL1Tab.tsx` | **930** | 🔴 | PFMEA 651줄 |
| `FailureL3Tab.tsx` | **872** | 🔴 | PFMEA 715줄 |
| `FunctionL2Tab.tsx` | **867** | 🔴 | PFMEA 580줄 |
| `FunctionL3Tab.tsx` | **866** | 🔴 | PFMEA 586줄 |
| `page.tsx` | **832** | 🔴 | PFMEA 725줄 |
| `StructureTab.tsx` | **830** | 🔴 | PFMEA 672줄 |
| `RiskOptCellRenderer.tsx` | **804** | 🔴 | PFMEA 828줄 |
| `FailureL2Tab.tsx` | **789** | 🔴 | PFMEA 787줄 |
| `FunctionL1Tab.tsx` | **783** | 🔴 | PFMEA 783줄 |
| `AllTabAtomic.tsx` | **747** | 🔴 | PFMEA 766줄 |

**DFMEA 700행 초과: 15개 파일**

---

## 🚀 DFMEA 최적화 개발 계획

### 🎯 목표
- **700행 초과 파일: 15개 → 0개**
- **PFMEA 미완료 항목 선제 적용**
- **예상 총 감소량: ~6,700줄**

### 📋 작업 단계 (예상 3시간)

| 단계 | 작업 | 시간 | 효과 |
|------|------|------|------|
| **P1** | useWorksheetState 분리 | 30분 | 2,549→400줄 (-2,149줄) |
| **P2** | FailureLinkTab 핸들러 3개 분리 | 25분 | 1,623→700줄 (-923줄) |
| **P3** | Function L1/L2/L3 핸들러 분리 | 25분 | ~2,500→1,500줄 (-1,000줄) |
| **P4** | Failure L1/L2/L3 핸들러 분리 | 25분 | ~2,600→1,500줄 (-1,100줄) |
| **P5** | 공용 헤더 8개 + tabStyles/Utils | 20분 | ~600줄 공용화 |
| **P6** | AllTab 섹션 3개 + 통계 분리 | 20분 | 1,121→600줄 (-521줄) |
| **P7** | RiskOptCellRenderer 분리 | 15분 | 804→400줄 (-404줄) |
| **P8** | 빌드 테스트/커밋 | 20분 | - |

### 🏗️ DFMEA 목표 파일 구조

```
src/app/dfmea/worksheet/
├── hooks/
│   ├── useWorksheetState.ts (~400줄) ← 메인 통합
│   ├── useWorksheetDataLoader.ts (~850줄) ← 데이터 로드
│   ├── useWorksheetSave.ts (~400줄) ← 저장 로직
│   ├── useRowsCalculation.ts (~220줄) ← 행 계산
│   └── useFailureLinkUtils.ts (~180줄) ← 연결 유틸
│
├── tabs/
│   ├── shared/
│   │   ├── tabStyles.ts (~55줄)
│   │   ├── tabUtils.ts (~124줄)
│   │   ├── FunctionL1Header.tsx (~83줄)
│   │   ├── FunctionL2Header.tsx (~80줄)
│   │   ├── FunctionL3Header.tsx (~135줄)
│   │   ├── FailureL1Header.tsx (~95줄)
│   │   ├── FailureL2Header.tsx (~92줄)
│   │   └── FailureL3Header.tsx (~104줄)
│   │
│   ├── function/hooks/
│   │   ├── useFunctionL1Handlers.ts (~200줄) ← PFMEA 미적용 선제적용
│   │   ├── useFunctionL2Handlers.ts (~370줄)
│   │   └── useFunctionL3Handlers.ts (~313줄)
│   │
│   ├── failure/hooks/
│   │   ├── useLinkData.ts (~404줄)
│   │   ├── useLinkHandlers.ts (~545줄)
│   │   ├── useLinkConfirm.ts (~271줄)
│   │   ├── useFailureL1Handlers.ts (~230줄)
│   │   ├── useFailureL2Handlers.ts (~200줄) ← PFMEA 미적용 선제적용
│   │   └── useFailureL3Handlers.ts (~320줄)
│   │
│   └── all/
│       ├── hooks/
│       │   └── useAllTabStats.ts (~257줄)
│       ├── sections/ ← PFMEA 미적용 선제적용
│       │   ├── StructureSection.tsx (~200줄)
│       │   ├── FunctionSection.tsx (~200줄)
│       │   └── FailureSection.tsx (~200줄)
│       └── renderers/ ← PFMEA 미적용 선제적용
│           ├── RiskCellRenderer.tsx (~300줄)
│           └── OptCellRenderer.tsx (~300줄)
```

### 📊 예상 결과 비교

| 지표 | PFMEA 현재 | DFMEA 목표 |
|------|-----------|-----------|
| 700줄 초과 파일 | 6개 | **0개** |
| useWorksheetState | 406줄 | ~400줄 |
| FailureLinkTab | 709줄 | ~650줄 |
| AllTabEmpty | 980줄 | ~600줄 |
| RiskOptCellRenderer | 828줄 | ~400줄 |
| FunctionL1Tab | 783줄 | ~550줄 |
| FailureL2Tab | 787줄 | ~550줄 |

### ✅ PFMEA 미적용 → DFMEA 선제 적용 목록

| 항목 | PFMEA 상태 | DFMEA 계획 |
|------|-----------|-----------|
| FunctionL1Handlers | ❌ 미적용 | ✅ 선제 적용 |
| FailureL2Handlers | ❌ 미적용 | ✅ 선제 적용 |
| AllTab 섹션 분리 | ❌ 미적용 | ✅ 선제 적용 |
| RiskOptCellRenderer 분리 | ❌ 미적용 | ✅ 선제 적용 |

---

## ✅ PFMEA 완료된 모듈화 작업

### 1. 공용 헤더 컴포넌트

| 컴포넌트 | 행 수 | 적용 대상 |
|---------|-------|----------|
| `FunctionL1Header.tsx` | 83 | FunctionL1Tab |
| `FunctionL2Header.tsx` | 80 | FunctionL2Tab |
| `L3TabHeader.tsx` | 135 | FunctionL3Tab |
| `FailureL1Header.tsx` | 95 | FailureL1Tab |
| `FailureL2Header.tsx` | 92 | FailureL2Tab |
| `FailureL3Header.tsx` | 104 | FailureL3Tab |

### 2. 공용 유틸/스타일

| 파일 | 행 수 | 용도 |
|------|-------|------|
| `tabStyles.ts` | 55 | 공용 스타일 상수 |
| `tabUtils.ts` | 124 | 공용 유틸리티 함수 |
| `columnConfig.ts` | 155 | 컬럼 설정 |
| `BaseWorksheetComponents.tsx` | 360 | 기본 워크시트 컴포넌트 |
| `TableHeader.tsx` | 179 | 테이블 헤더 공용 |

### 3. hooks 분리 (17개)

| hook | 행 수 | 상태 |
|------|-------|------|
| `useWorksheetDataLoader.ts` | 866 | ✅ 신규 |
| `useLinkHandlers.ts` | 545 | ✅ 신규 |
| `useLinkData.ts` | 404 | ✅ 신규 |
| `useWorksheetState.ts` | 406 | ✅ 완료 |
| `useWorksheetSave.ts` | 391 | ✅ 신규 |
| `useFunctionL2Handlers.ts` | 370 | ✅ 신규 |
| `useFailureL3Handlers.ts` | 320 | ✅ 신규 |
| `useFunctionL3Handlers.ts` | 313 | ✅ 신규 |
| `useLinkConfirm.ts` | 271 | ✅ 신규 |
| `useAllTabStats.ts` | 257 | ✅ 신규 |
| `useFailureL1Handlers.ts` | 230 | ✅ 신규 |
| `useRowsCalculation.ts` | 220 | ✅ 완료 |
| `usePageHandlers.ts` | 222 | ✅ |
| `useProcessHandlers.ts` | 201 | ✅ |
| `useFailureLinkUtils.ts` | 179 | ✅ 완료 |
| `useCpSync.ts` | 167 | ✅ |
| `useExcelHandlers.ts` | 126 | ✅ |

---

## 📊 모듈화 성과 요약

### PFMEA 행 수 감소 통계

| 항목 | 감소량 |
|------|--------|
| useWorksheetState.ts | **-1,641줄** (2,047→406) |
| FailureLinkTab.tsx | **-796줄** |
| FunctionL3Tab.tsx | **-456줄** |
| FunctionL2Tab.tsx | **-405줄** |
| FailureL3Tab.tsx | **-313줄** |
| FailureL1Tab.tsx | **-294줄** |
| **총 감소** | **~3,900줄** |

### DFMEA 예상 감소량

| 항목 | 예상 감소량 |
|------|------------|
| useWorksheetState.ts | **~2,149줄** |
| FailureLinkTab.tsx | **~923줄** |
| Function L1/L2/L3 | **~1,000줄** |
| Failure L1/L2/L3 | **~1,100줄** |
| AllTab 분리 | **~521줄** |
| RiskOptCellRenderer | **~404줄** |
| 공용화 | **~600줄** |
| **예상 총 감소** | **~6,700줄** |

---

## ⚠️ 코드프리즈 영역 (절대 수정 금지)

```
⛔ 고장연결 핵심 로직:
├── useSVGLines.ts: SVG 화살표 좌표 계산
├── linkedFEs/linkedFCs useEffect
├── confirmLink 병합 로직
└── 화살표 스타일 (strokeWidth, stroke, markerEnd)
```

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-19 | 1.0.0 | 초기 작성 |
| 2026-01-20 | 1.1.0 | 헤더 공용화 완료, hooks 분리 진행상황 업데이트 |
| 2026-01-20 | 1.2.0 | useLinkData.ts, useAllTabStats.ts 분리 완료 |
| 2026-01-20 | 1.3.0 | useLinkHandlers.ts, useLinkConfirm.ts 분리 |
| 2026-01-20 | 1.4.0 | useWorksheetState 대규모 분리 완료 (-1,641줄) |
| 2026-01-20 | 1.5.0 | **DFMEA 최적화 개발 계획 추가** |

---

**작성자**: Claude AI
**다음 검토**: 2026-01-21
