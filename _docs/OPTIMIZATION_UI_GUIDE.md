# 최적화 단계 UI 유지보수 가이드

**코드프리즈 태그**: `codefreeze-20260112-optimization-ui`

## 핵심 변경 내용

### 1. 효과평가 조건부 표시 (목표완료일자 필수)
**목표완료일자가 입력된 행만** 다음 셀들이 활성화됩니다:
- 발생도 / 검출도
- 특별특성
- 완료일자
- 상태
- 책임자성명
- 비고

### 2. 입력 방식
| 컬럼 | 입력 방식 | 자동저장 |
|------|----------|---------|
| 목표완료일자 | 📅 달력 (input type="date") | ✅ |
| 완료일자 | 📅 달력 (input type="date") | ✅ |
| 상태 | 🔽 드롭다운 (대기/진행중/완료/보류) | ✅ |
| 개선결과근거 | ✏️ 인라인 텍스트 | ✅ (onBlur) |
| 책임자성명 | 👤 사용자 선택 모달 | ✅ |
| 비고 | ✏️ 인라인 텍스트 | ✅ (onBlur) |

### 3. 고장영향 심각도 표시 변경
- **이전**: `(S4)` - 카테고리 구분 없음
- **변경**: `(Y:4)`, `(S:4)`, `(U:4)` - YP/SP/USER 구분

| 구분 | 표시 | 의미 |
|------|------|------|
| Your Plant | `(Y:4)` | 자사 공장 영향 |
| Ship to Plant | `(S:4)` | 출하처 영향 |
| User | `(U:4)` | 최종 사용자 영향 |

---

## 수정 파일 목록

### 1. `src/app/pfmea/worksheet/tabs/all/RiskOptCellRenderer.tsx`
**역할**: 최적화 단계 셀 렌더링

**주요 수정 위치**:
- `// ★★★ 책임자성명 셀 - 사용자 선택 모달 연동 ★★★` (약 630줄)
- `// ★★★ 개선결과근거/비고 - 인라인 텍스트 입력 ★★★` (약 650줄)
- `// ★★★ 날짜 입력 셀 (목표완료일자, 완료일자) ★★★` (약 690줄)
- `// ★★★ 상태 셀 - 드롭다운 선택 ★★★` (약 720줄)

**목표완료일자 체크 패턴**:
```typescript
const targetDateKey = `targetDate-opt-${uniqueKey}`;
const hasTargetDate = !!state?.riskData?.[targetDateKey];
if (!hasTargetDate) {
  return <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, cursor: 'default' }} />;
}
```

### 2. `src/app/pfmea/worksheet/tabs/all/FailureCellRenderer.tsx`
**역할**: 고장영향(FE) 셀 렌더링

**주요 수정 위치**:
- `// ★ 고장영향(FE) - FE별 병합, 클릭하여 점수 부여` (약 117줄)

**카테고리 접두어 함수**:
```typescript
const getCategoryPrefix = (category: string): string => {
  if (!category) return 'S';  // 기본값
  const cat = category.toLowerCase();
  if (cat.includes('your') || cat === 'yp') return 'Y';
  if (cat.includes('ship') || cat === 'sp') return 'S';
  if (cat.includes('user') || cat === 'u') return 'U';
  return 'S';  // 기본값
};
```

### 3. `src/app/pfmea/worksheet/tabs/all/hooks/useAllTabModals.ts`
**역할**: 모달 상태 관리

**주요 수정 위치**:
- `openUserModal` 함수 (약 429줄)
- `handleUserSelect` 함수 (약 440줄)

### 4. `src/app/pfmea/worksheet/tabs/all/AllTabEmpty.tsx`
**역할**: ALL 탭 메인 컴포넌트

**주요 수정 위치**:
- `import { UserSelectModal }` 추가 (19줄)
- `openUserModal, closeUserModal, handleUserSelect, userModal` 추가 (약 85줄)
- `<UserSelectModal />` 렌더링 (약 1000줄)

---

## 수정 가이드

### 상태 옵션 변경 시
`RiskOptCellRenderer.tsx` 파일에서 검색:
```typescript
const STATUS_OPTIONS = ['대기', '진행중', '완료', '보류'];
const statusColors: Record<string, string> = {
  '대기': '#9e9e9e',
  '진행중': '#2196f3',
  '완료': '#4caf50',
  '보류': '#ff9800'
};
```

### 날짜 형식 변경 시
`input type="date"` 사용 중 - HTML5 표준 날짜 포맷 (YYYY-MM-DD)

### 목표완료일자 조건 추가/제거 시
`hasTargetDate` 체크 패턴 검색:
```bash
grep -n "hasTargetDate" src/app/pfmea/worksheet/tabs/all/RiskOptCellRenderer.tsx
```

---

## 테스트 항목

1. **목표완료일자 입력 전**: 발생도/검출도/특별특성/완료일자/상태/책임자/비고 모두 빈 셀
2. **목표완료일자 입력 후**: 해당 행의 모든 효과평가 셀 활성화
3. **상태 드롭다운**: 4개 옵션 표시, 선택 시 즉시 저장
4. **책임자성명**: 클릭 시 사용자 선택 모달, 선택 시 이름 표시
5. **고장영향 심각도**: YP→Y:N, SP→S:N, USER→U:N 형태로 표시

---

## 롤백 방법

```bash
git checkout codefreeze-20260112-optimization-ui~1 -- \
  src/app/pfmea/worksheet/tabs/all/RiskOptCellRenderer.tsx \
  src/app/pfmea/worksheet/tabs/all/FailureCellRenderer.tsx \
  src/app/pfmea/worksheet/tabs/all/hooks/useAllTabModals.ts \
  src/app/pfmea/worksheet/tabs/all/AllTabEmpty.tsx
```






