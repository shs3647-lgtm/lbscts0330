# PFMEA 수동모드 PRD (Product Requirements Document)

> **Version**: 1.0.0  
> **작성일**: 2026-01-26  
> **Status**: 📝 개발 예정  
> **Author**: FMEA Development Team

---

## 📋 목차

1. [개요](#1-개요)
2. [모드 전환](#2-모드-전환)
3. [자동모드 vs 수동모드](#3-자동모드-vs-수동모드)
4. [컨텍스트 메뉴](#4-컨텍스트-메뉴)
5. [행 추가/삭제](#5-행-추가삭제)
6. [셀 병합 로직](#6-셀-병합-로직)
7. [데이터 입력 방식](#7-데이터-입력-방식)
8. [UI 구현 상세](#8-ui-구현-상세)
9. [파일 구조](#9-파일-구조)
10. [개발 계획](#10-개발-계획)

---

## 1. 개요

### 1.1 목적
FMEA 수동모드는 CP(관리계획서)와 동일한 방식으로 사용자가 직접 행을 추가/삭제하고 데이터를 입력할 수 있는 기능입니다.

### 1.2 필요성
- **자동모드**: 모달 기반 데이터 선택 (마스터 데이터 연동)
- **수동모드**: 자유로운 수작업 입력 (데이터 연동 없음)

### 1.3 참조 문서
- CP 워크시트 PRD (docs/cpdocs/16_CP_워크시트_PRD.md)
- PFMEA 워크시트 PRD (docs/fmeadocs/12_PFMEA_워크시트_PRD.md)

---

## 2. 모드 전환

### 2.1 모드 전환 UI
```
┌────────────────────────────────────────────────────────────────┐
│ [자동 🤖]  [수동 ✋]  │  [구조] [1L기능] [2L기능] ...          │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 모드 전환 버튼
| 버튼 | 활성 상태 | 비활성 상태 |
|------|----------|------------|
| 자동 | `bg-blue-600 text-white` | `bg-gray-200 text-gray-600` |
| 수동 | `bg-orange-600 text-white` | `bg-gray-200 text-gray-600` |

### 2.3 모드 저장
- 모드 선택은 `state.inputMode: 'auto' | 'manual'`로 저장
- localStorage에 즉시 저장
- 탭 전환 시에도 모드 유지

---

## 3. 자동모드 vs 수동모드

### 3.1 기능 비교

| 기능 | 자동모드 | 수동모드 |
|------|---------|---------|
| 데이터 입력 | 모달 선택 | 직접 입력 |
| 마스터 연동 | ✅ | ❌ |
| 행 추가 | 모달에서 다중 선택 | 컨텍스트 메뉴 |
| 행 삭제 | 모달에서 삭제 | 컨텍스트 메뉴 |
| 셀 병합 | 자동 | 자동 (상위 병합) |
| 더블클릭 | 직접 편집 | 직접 편집 |

### 3.2 자동모드 (기존)
```
1. 셀 클릭 → 모달 열림
2. 마스터 데이터에서 항목 선택
3. 다중 선택 시 자동 행 추가
4. 모달 닫기 → 저장
```

### 3.3 수동모드 (신규)
```
1. 우클릭 → 컨텍스트 메뉴
2. "행 추가" 선택 → 새 행 삽입
3. 셀 직접 입력 (input 직접 편집)
4. 상위 셀 자동 병합
```

---

## 4. 컨텍스트 메뉴

### 4.1 메뉴 구성 (CP 참조)
```
┌──────────────────┐
│ 📋 행 위에 추가  │
│ 📋 행 아래 추가  │
├──────────────────┤
│ 🗑️ 행 삭제       │
├──────────────────┤
│ 📑 행 복사       │
│ 📥 행 붙여넣기   │
└──────────────────┘
```

### 4.2 메뉴 항목

| 항목 | 단축키 | 설명 |
|------|--------|------|
| 행 위에 추가 | `Ctrl+Shift+↑` | 현재 행 위에 새 행 삽입 |
| 행 아래 추가 | `Ctrl+Shift+↓` | 현재 행 아래에 새 행 삽입 |
| 행 삭제 | `Ctrl+Delete` | 현재 행 삭제 |
| 행 복사 | `Ctrl+C` | 현재 행 클립보드 복사 |
| 행 붙여넣기 | `Ctrl+V` | 클립보드 행 붙여넣기 |

### 4.3 컨텍스트 메뉴 스타일
```typescript
const contextMenuStyle: CSSProperties = {
  position: 'fixed',
  background: '#ffffff',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  padding: '4px 0',
  minWidth: '160px',
  zIndex: 9999,
};

const menuItemStyle: CSSProperties = {
  padding: '8px 16px',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const menuItemHover: CSSProperties = {
  background: '#f5f5f5',
};
```

---

## 5. 행 추가/삭제

### 5.1 행 추가 로직

#### 5.1.1 구조분석
```typescript
// 메인공정 행 추가
const addL2Row = (index: number) => {
  const newProcess = {
    id: uid(),
    no: String((index + 1) * 10),  // 10, 20, 30...
    name: '',
    l3: []  // 작업요소 빈 배열
  };
  state.l2.splice(index, 0, newProcess);
};

// 작업요소 행 추가 (상위 공정 병합)
const addL3Row = (procIndex: number, weIndex: number) => {
  const newWE = {
    id: uid(),
    name: '',
    m4: 'MN'  // 기본값
  };
  state.l2[procIndex].l3.splice(weIndex, 0, newWE);
  // → 상위 메인공정 rowSpan 자동 증가
};
```

#### 5.1.2 기능분석
```typescript
// 기능 행 추가 (상위 공정 병합)
const addFunctionRow = (procIndex: number, funcIndex: number) => {
  const newFunc = {
    id: uid(),
    name: '',
    productChars: []  // or processChars
  };
  state.l2[procIndex].functions.splice(funcIndex, 0, newFunc);
};

// 특성 행 추가 (상위 기능 병합)
const addCharRow = (procIndex: number, funcIndex: number, charIndex: number) => {
  const newChar = {
    id: uid(),
    name: '',
    specialChar: ''
  };
  state.l2[procIndex].functions[funcIndex].productChars.splice(charIndex, 0, newChar);
  // → 상위 기능/공정 rowSpan 자동 증가
};
```

### 5.2 행 삭제 로직

```typescript
// 삭제 확인
const confirmDelete = (type: string, name: string) => {
  return confirm(`"${name}" ${type}을(를) 삭제하시겠습니까?\n\n하위 데이터도 함께 삭제됩니다.`);
};

// 삭제 후 rowSpan 재계산
const recalculateRowSpans = (procIndex: number) => {
  // 상위 셀 rowSpan 업데이트
};
```

---

## 6. 셀 병합 로직

### 6.1 rowSpan 계산 (CP 방식)

```typescript
// useProcessRowSpan 훅 (CP 참조)
const useProcessRowSpan = (l2: L2Structure[]) => {
  const rowSpans = useMemo(() => {
    const spans: number[] = [];
    l2.forEach(proc => {
      let totalRows = 0;
      (proc.functions || []).forEach(func => {
        totalRows += Math.max(1, (func.productChars || []).length);
      });
      spans.push(Math.max(1, totalRows));
    });
    return spans;
  }, [l2]);
  return rowSpans;
};
```

### 6.2 행 추가 시 병합

```
행 추가 전:
┌────────────┬────────────┬────────────┐
│  공정A     │  기능1     │  특성1     │
│  (rowSpan  ├────────────┼────────────┤
│   = 2)     │  기능2     │  특성2     │
└────────────┴────────────┴────────────┘

행 추가 후 (특성3 추가):
┌────────────┬────────────┬────────────┐
│  공정A     │  기능1     │  특성1     │
│  (rowSpan  ├────────────┼────────────┤
│   = 3)     │  기능2     │  특성2     │
│            │ (rowSpan   ├────────────┤
│            │   = 2)     │  특성3     │  ← 새 행
└────────────┴────────────┴────────────┘
```

---

## 7. 데이터 입력 방식

### 7.1 수동모드 셀 입력

```typescript
// ManualInputCell 컴포넌트
interface ManualInputCellProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ManualInputCell: React.FC<ManualInputCellProps> = ({
  value,
  onChange,
  placeholder,
  disabled
}) => {
  const [localValue, setLocalValue] = useState(value);
  
  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };
  
  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: 'transparent',
        padding: '4px 6px',
        fontSize: '11px',
      }}
    />
  );
};
```

### 7.2 자동모드 셀 (기존)

```typescript
// SelectableCell (기존 유지)
<SelectableCell
  value={data.name}
  placeholder="클릭하여 선택"
  onClick={() => openModal(...)}
  onDoubleClickEdit={(newValue) => handleInlineEdit(...)}
/>
```

### 7.3 하이브리드 모드

```typescript
// 모드에 따른 셀 렌더링
{inputMode === 'auto' ? (
  <SelectableCell
    value={data.name}
    onClick={() => openModal(...)}
  />
) : (
  <ManualInputCell
    value={data.name}
    onChange={(newValue) => updateData(newValue)}
  />
)}
```

---

## 8. UI 구현 상세

### 8.1 모드 전환 컴포넌트

```typescript
// InputModeToggle.tsx
interface InputModeToggleProps {
  mode: 'auto' | 'manual';
  onModeChange: (mode: 'auto' | 'manual') => void;
}

const InputModeToggle: React.FC<InputModeToggleProps> = ({
  mode,
  onModeChange
}) => (
  <div className="flex gap-1 mr-4">
    <button
      onClick={() => onModeChange('auto')}
      className={`px-3 py-1 text-xs font-semibold rounded ${
        mode === 'auto'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
      }`}
    >
      🤖 자동
    </button>
    <button
      onClick={() => onModeChange('manual')}
      className={`px-3 py-1 text-xs font-semibold rounded ${
        mode === 'manual'
          ? 'bg-orange-600 text-white'
          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
      }`}
    >
      ✋ 수동
    </button>
  </div>
);
```

### 8.2 컨텍스트 메뉴 컴포넌트

```typescript
// FMEAContextMenu.tsx
interface FMEAContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddRowAbove: () => void;
  onAddRowBelow: () => void;
  onDeleteRow: () => void;
  onCopyRow: () => void;
  onPasteRow: () => void;
  canPaste: boolean;
}

const FMEAContextMenu: React.FC<FMEAContextMenuProps> = ({
  x, y, onClose, ...handlers
}) => (
  <div
    style={{ left: x, top: y, ...contextMenuStyle }}
    onMouseLeave={onClose}
  >
    <MenuItem icon="📋" label="행 위에 추가" onClick={handlers.onAddRowAbove} />
    <MenuItem icon="📋" label="행 아래 추가" onClick={handlers.onAddRowBelow} />
    <Divider />
    <MenuItem icon="🗑️" label="행 삭제" onClick={handlers.onDeleteRow} danger />
    <Divider />
    <MenuItem icon="📑" label="행 복사" onClick={handlers.onCopyRow} />
    <MenuItem
      icon="📥"
      label="행 붙여넣기"
      onClick={handlers.onPasteRow}
      disabled={!handlers.canPaste}
    />
  </div>
);
```

---

## 9. 파일 구조

```
src/app/pfmea/worksheet/
├── components/
│   ├── InputModeToggle.tsx      # 모드 전환 버튼
│   ├── FMEAContextMenu.tsx      # 컨텍스트 메뉴
│   ├── ManualInputCell.tsx      # 수동 입력 셀
│   └── ...
├── hooks/
│   ├── useContextMenu.ts        # 컨텍스트 메뉴 훅
│   ├── useRowOperations.ts      # 행 추가/삭제 훅
│   ├── useRowSpan.ts            # rowSpan 계산 훅
│   ├── useClipboard.ts          # 복사/붙여넣기 훅
│   └── ...
├── tabs/
│   ├── structure/
│   │   ├── StructureTabAuto.tsx   # 자동모드
│   │   └── StructureTabManual.tsx # 수동모드
│   ├── function/
│   │   ├── FunctionL1TabAuto.tsx
│   │   ├── FunctionL1TabManual.tsx
│   │   └── ...
│   └── ...
└── ...
```

---

## 10. 개발 계획

### 10.1 Phase 1: 기반 컴포넌트 (1일)
- [ ] InputModeToggle 컴포넌트
- [ ] FMEAContextMenu 컴포넌트
- [ ] ManualInputCell 컴포넌트
- [ ] useContextMenu 훅

### 10.2 Phase 2: 구조분석 수동모드 (1일)
- [ ] StructureTabManual 구현
- [ ] 메인공정 행 추가/삭제
- [ ] 작업요소 행 추가/삭제
- [ ] rowSpan 자동 계산

### 10.3 Phase 3: 기능분석 수동모드 (2일)
- [ ] FunctionL1TabManual 구현
- [ ] FunctionL2TabManual 구현
- [ ] FunctionL3TabManual 구현

### 10.4 Phase 4: 고장분석 수동모드 (2일)
- [ ] FailureL1TabManual 구현
- [ ] FailureL2TabManual 구현
- [ ] FailureL3TabManual 구현

### 10.5 Phase 5: 테스트 및 완료 (1일)
- [ ] E2E 테스트 작성
- [ ] 버그 수정
- [ ] 문서 업데이트

---

## 변경 이력

| 버전 | 일자 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-26 | 초기 작성 (PRD) |

---

> **Note**: 이 문서는 FMEA 수동모드의 요구사항 정의서입니다. CP 워크시트의 구현을 참조하여 개발합니다.
