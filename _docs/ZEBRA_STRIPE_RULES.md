# 🎨 FMEA 워크시트 줄무늬(Zebra Stripe) 규칙

> **⚠️ CODE FREEZE - 이 규칙은 모든 워크시트 개발에서 필수 준수**
> 
> 📅 등록일: 2026-01-05
> 📌 적용범위: 구조분석 ~ 고장원인분석 전체

---

## 1. 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **인덱스 기반** | 모든 워크시트 행은 `globalRowIdx` 기준으로 줄무늬 자동 적용 |
| **짝수/홀수** | 짝수 행(0,2,4...) = **dark 색상** / 홀수 행(1,3,5...) = **light 색상** |
| **rowSpan 병합** | 병합 셀도 첫 행의 인덱스 기준으로 색상 결정 |
| **투명 상속** | 셀 내부 `input/select`는 `bg-transparent` 사용하여 줄무늬 상속 |

---

## 2. 색상 타입 (열별 적용)

| 타입 | 색상 | 적용 열 |
|------|------|---------|
| **structure** | 🔵 파란색 | 완제품공정명, 메인공정명, 4M, 작업요소 |
| **function** | 🟢 녹색 | 기능, 공정기능, 작업요소기능 |
| **failure** | 🟠 주황색 | 요구사항, 제품특성, 공정특성, 고장영향/형태/원인 |

### 색상 값

```typescript
export const ZEBRA_COLORS = {
  structure: { light: '#e3f2fd', dark: '#bbdefb' },  // 파란색 줄무늬
  function: { light: '#e8f5e9', dark: '#c8e6c9' },   // 녹색 줄무늬
  failure: { light: '#fff3e0', dark: '#ffe0b2' },    // 주황색 줄무늬
};
```

---

## 3. 필수 사용법

### ✅ 올바른 패턴

```tsx
import { getZebraColors, getZebra } from '@/styles/level-colors';

// 1. 전역 행 인덱스 초기화
let globalRowIdx = 0;

return items.map((item, idx) => {
  // 2. 행 인덱스 캡처 (중요!)
  const rowIdx = globalRowIdx++;
  
  // 3. 줄무늬 색상 가져오기
  const zebra = getZebraColors(rowIdx);
  
  return (
    // 4. 행 배경에 줄무늬 적용
    <tr key={item.id} style={{ background: zebra.function }}>
      
      {/* 5. 구조 관련 셀 - structure 색상 */}
      <td style={{ background: zebra.structure }}>
        {item.processName}
      </td>
      
      {/* 6. 기능 관련 셀 - function 색상 */}
      <td style={{ background: zebra.function }}>
        {item.functionName}
      </td>
      
      {/* 7. SelectableCell - bgColor prop 사용 */}
      <SelectableCell 
        value={item.value} 
        bgColor={zebra.function} 
      />
      
      {/* 8. input 태그 - bg-transparent 필수 */}
      <td style={{ background: zebra.structure }}>
        <input 
          className="bg-transparent w-full" 
          value={item.name}
        />
      </td>
    </tr>
  );
});
```

### ❌ 금지된 패턴

```tsx
// ❌ className에 hex 색상 사용 (작동 안함!)
<td className={`... ${zebraBg}`}>  // zebraBg = '#bbdefb' → 유효하지 않은 CSS 클래스

// ❌ 고정 배경색 사용 (줄무늬 무시됨!)
<td className="bg-[#e3f2fd]">  // 줄무늬 대신 고정색

// ❌ input에 bg-white 사용 (줄무늬 덮어씌움!)
<input className="bg-white">  // 줄무늬가 보이지 않음

// ❌ 행 인덱스 캡처 없이 직접 증가
<tr className={globalRowIdx++ % 2 === 0 ? '...' : '...'}>  // 셀에서 재사용 불가
```

---

## 4. 유틸리티 함수

### `getZebraColors(idx: number)`
모든 타입의 줄무늬 색상을 한 번에 반환

```typescript
const zebra = getZebraColors(rowIdx);
// 반환값: { structure: '#bbdefb', function: '#c8e6c9', failure: '#ffe0b2' }
```

### `getZebra(type, idx)`
특정 타입의 줄무늬 색상만 반환

```typescript
const structureBg = getZebra('structure', rowIdx);
// 반환값: '#bbdefb' 또는 '#e3f2fd'
```

### `getZebraRowStyle(idx, type)`
행 스타일 객체 반환

```typescript
<tr style={getZebraRowStyle(rowIdx, 'function')}>
```

### `getZebraCellStyle(idx, type)`
셀 스타일 객체 반환

```typescript
<td style={getZebraCellStyle(rowIdx, 'structure')}>
```

---

## 5. 탭별 적용 가이드 (3L기능 스타일 v2.1)

> **⭐ 2026-01-05 업데이트**: 블록 단위 줄무늬 적용
> 
> rowSpan(병합) 셀은 **블록 인덱스** 기준, 일반 셀은 **행 인덱스** 기준으로 줄무늬 적용

### 기능분석 1L (FunctionL1Tab)
| 열 | 병합 | 줄무늬 기준 | 색상 타입 |
|---|---|---|---|
| 완제품공정명 | rowSpan | `tIdx` (타입 블록) | structure |
| 구분(YP/SP/User) | rowSpan | 타입별 고유 색상 | - |
| 완제품기능 | rowSpan | `funcCounter` (기능 블록) | function |
| 요구사항 | 개별 행 | `rowIdx` | failure |

### 기능분석 2L (FunctionL2Tab)
| 열 | 병합 | 줄무늬 기준 | 색상 타입 |
|---|---|---|---|
| 공정NO+공정명 | rowSpan | `pIdx` (공정 블록) | structure |
| 메인공정기능 | rowSpan | `funcCounter` (기능 블록) | function |
| 제품특성 | 개별 행 | `rowIdx` | failure |
| 특별특성 | 개별 행 | `rowIdx` | failure (고정 주황) |

### 기능분석 3L (FunctionL3Tab) - 표준 모델
| 열 | 병합 | 줄무늬 기준 | 색상 타입 |
|---|---|---|---|
| 메인공정명 | rowSpan | `pIdx` (공정 블록) | structure |
| 4M | rowSpan | 블록 기준 | structure |
| 작업요소 | rowSpan | `weIdx` (작업요소 블록) | structure |
| 작업요소기능 | 개별 행 | `rowIdx` | function |
| 공정특성 | 개별 행 | `rowIdx` | failure |
| 특별특성 | 개별 행 | `rowIdx` | failure (고정 주황) |

### 고장영향 1L (FailureL1Tab)
| 열 | 병합 | 줄무늬 기준 | 색상 타입 |
|---|---|---|---|
| 완제품공정명 | rowSpan | `productIdx` (블록) | structure |
| 구분 | rowSpan | 타입별 고유 색상 | - |
| 완제품기능 | rowSpan | `funcIdx` (블록) | function |
| 요구사항 | rowSpan | `reqIdx` (블록) | failure |
| 고장영향 | 개별 행 | `idx` | failure |
| 심각도 | 개별 행 | `idx` | failure |

### 고장분석 2L/3L (FailureL2/L3Tab)
- 상위 구조/기능 열: `zebra.structure` 또는 `zebra.function` (블록 기준)
- 고장형태/원인: `zebra.failure` (행 기준)

---

## 6. 체크리스트

새 탭 개발 또는 기존 탭 수정 시 반드시 확인:

- [ ] `getZebraColors` 또는 `getZebra` import 되었는가?
- [ ] `let globalRowIdx = 0;` 초기화 되었는가?
- [ ] 각 행에서 `const rowIdx = globalRowIdx++;` 캡처 하는가?
- [ ] `<tr>` 태그에 `style={{ background: zebra.xxx }}` 적용했는가?
- [ ] 모든 `<td>`에 `style={{ background: zebra.xxx }}` 적용했는가?
- [ ] `SelectableCell`에 `bgColor={zebra.xxx}` 전달했는가?
- [ ] `<input>` 태그에 `className="bg-transparent"` 적용했는가?
- [ ] `className`에 hex 색상 직접 사용하지 않았는가?

---

## 7. 관련 파일

| 파일 | 역할 |
|------|------|
| `src/styles/level-colors.ts` | 줄무늬 색상 정의 및 유틸리티 함수 |
| `docs/ZEBRA_STRIPE_RULES.md` | 이 문서 (줄무늬 규칙) |

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-05 | v2.1 | **3L기능 스타일 적용**: 블록 단위 줄무늬 (rowSpan 셀은 블록 인덱스 기준) |
| 2026-01-05 | v2.0 | 글로벌 줄무늬 시스템 구축, 문서화 |
| 2026-01-03 | v1.0 | 초기 줄무늬 색상 정의 |

---

> **🚨 이 규칙을 위반하면 줄무늬가 표시되지 않습니다!**
> 
> 모든 워크시트 개발 시 이 문서를 참조하세요.

