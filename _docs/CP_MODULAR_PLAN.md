# 🏗️ CP 모듈화 계획서 (Control Plan Modularization Plan)

> 생성일: 2026-01-13
> 목적: 500줄 규칙 준수, 유지보수성 향상, FMEA 패턴 재사용

---

## 📊 현재 상태 (2026-01-13 리팩토링 완료)

| 파일 | 이전 줄 수 | 현재 줄 수 | 감소율 | 상태 |
|------|-----------|------------|--------|------|
| `worksheet/page.tsx` | 1,029 | 372 | 64% | ✅ 완료 |
| `register/page.tsx` | 816 | 301 | 63% | ✅ 완료 |
| `import/page.tsx` | 637 | 249 | 61% | ✅ 완료 |
| `revision/page.tsx` | 524 | 524 | - | ⚠️ 선택적 |

---

## 🗂️ 목표 폴더 구조

```
src/app/control-plan/
├── worksheet/
│   ├── page.tsx              # < 150줄 (메인 진입점)
│   ├── cpConstants.ts        # 상수 정의
│   ├── types.ts              # 타입 정의
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useWorksheetState.ts      # 상태 관리
│   │   ├── useRowSpan.ts             # rowSpan 계산
│   │   ├── useContextMenu.ts         # 컨텍스트 메뉴
│   │   └── useCellHandlers.ts        # 셀 이벤트 핸들러
│   ├── components/
│   │   ├── index.ts
│   │   ├── CPTopMenuBar.tsx
│   │   ├── CPTabMenu.tsx
│   │   ├── CPTableHeader.tsx         # 테이블 헤더
│   │   ├── CPContextMenu.tsx         # 컨텍스트 메뉴 UI
│   │   └── AutoInputModal.tsx        # 자동 입력 모달
│   ├── renderers/
│   │   ├── index.ts
│   │   ├── ProcessCellRenderer.tsx   # 공정번호/공정명
│   │   ├── LevelCellRenderer.tsx     # 레벨/공정설명
│   │   ├── CharCellRenderer.tsx      # 특성 관련
│   │   └── ControlCellRenderer.tsx   # 관리항목
│   └── utils/
│       ├── index.ts
│       ├── cellStyles.ts             # 셀 스타일 유틸
│       └── validation.ts             # 데이터 검증
│
├── register/
│   ├── page.tsx              # < 150줄
│   ├── types.ts
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useRegisterState.ts
│   │   ├── useFormHandlers.ts
│   │   └── useCFTHandlers.ts
│   ├── components/
│   │   ├── index.ts
│   │   ├── BasicInfoTable.tsx        # 기본정보 테이블
│   │   ├── AIFMEATable.tsx           # AI 예측 테이블
│   │   └── OptionSelector.tsx        # 옵션 선택기
│   └── utils/
│       └── idGenerator.ts            # ID 생성기
│
├── import/
│   ├── page.tsx              # < 150줄
│   ├── types.ts
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useImportState.ts
│   │   ├── useExcelHandlers.ts
│   │   └── usePreviewHandlers.ts
│   ├── components/
│   │   ├── index.ts
│   │   ├── ImportControls.tsx        # 임포트 컨트롤
│   │   ├── PreviewTable.tsx          # 미리보기 테이블
│   │   └── TemplateDownload.tsx      # 템플릿 다운로드
│   └── utils/
│       ├── excelParser.ts
│       └── templateGenerator.ts
│
└── components/               # CP 공통 컴포넌트
    ├── index.ts
    ├── CPTopMenuBar.tsx
    └── CPTabMenu.tsx
```

---

## 🔌 공통 모듈 재사용 (src/components)

### 기존 모달 재사용
```typescript
// 이미 개발된 공통 모달
import { BaseModal } from '@/components/modals/BaseModal';
import { UserSelectModal } from '@/components/modals/UserSelectModal';
import { BizInfoSelectModal } from '@/components/modals/BizInfoSelectModal';
```

### CP 전용 모달 (필요 시 생성)
```typescript
// src/components/modals/cp/
├── CPAutoInputModal.tsx      # CP 자동입력 모달
├── ProcessSelectModal.tsx    # 공정 선택 모달
└── CharSelectModal.tsx       # 특성 선택 모달
```

---

## 📐 모듈화 패턴 (FMEA 벤치마킹)

### 1. Hook 패턴
```typescript
// hooks/useWorksheetState.ts
export function useWorksheetState() {
  const [rows, setRows] = useState<CPRow[]>([]);
  const [inputMode, setInputMode] = useState<'manual' | 'auto'>('manual');
  // ...
  return { rows, setRows, inputMode, setInputMode, ... };
}
```

### 2. Renderer 패턴
```typescript
// renderers/ProcessCellRenderer.tsx
interface Props {
  row: CPRow;
  rowIdx: number;
  spanInfo: SpanInfo;
  onChange: (field: string, value: any) => void;
}
export function ProcessCellRenderer({ row, rowIdx, spanInfo, onChange }: Props) {
  // 셀 렌더링 로직
}
```

### 3. Utils 패턴
```typescript
// utils/cellStyles.ts
export const getCellStyle = (col: CPColumn) => ({
  minWidth: col.width,
  textAlign: col.align,
  ...
});
```

---

## ⏱️ 리팩토링 우선순위

1. **worksheet/page.tsx** (1,029줄) - 가장 큼, 먼저 분리
2. **register/page.tsx** (785줄)
3. **import/page.tsx** (637줄)
4. **revision/page.tsx** (600+줄)

---

## 🎯 분리 기준

| 분리 대상 | 기준 | 예시 |
|----------|------|------|
| **hooks** | useState, useEffect, useMemo | `useRowSpan`, `useContextMenu` |
| **renderers** | JSX 반환 함수 | `renderCell`, `renderRow` |
| **components** | 독립 UI 컴포넌트 | `AutoInputModal`, `ContextMenu` |
| **utils** | 순수 함수 | `getCellStyle`, `validateRow` |
| **types** | interface, type | `CPRow`, `CPColumn` |

---

## 📝 리팩토링 체크리스트

- [ ] worksheet/page.tsx → hooks/ 분리
- [ ] worksheet/page.tsx → renderers/ 분리
- [ ] worksheet/page.tsx → components/ 분리
- [ ] register/page.tsx → hooks/ 분리
- [ ] register/page.tsx → components/ 분리
- [ ] import/page.tsx → hooks/ 분리
- [ ] import/page.tsx → components/ 분리
- [ ] 공통 컴포넌트 → src/components/cp/
- [ ] 500줄 이하 검증
- [ ] 린트 오류 0개 확인

---

## 🚀 적용 규칙

1. **새 파일 생성 시 500줄 이하 유지**
2. **각 hook은 단일 책임**
3. **renderer는 순수 함수로 작성**
4. **공통 로직은 즉시 utils로 분리**
5. **타입은 types.ts에 집중**

