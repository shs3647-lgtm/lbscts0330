# 고장연결(Failure Link) UI 유지보수 가이드

**코드프리즈 태그**: `codefreeze-20260112-failure-link-ui`  
**작성일**: 2026-01-12

---

## 📁 수정된 파일 목록

| 파일 경로 | 역할 |
|-----------|------|
| `src/app/pfmea/worksheet/tabs/failure/FailureLinkTab.tsx` | 고장연결 메인 컴포넌트, FM 선택 로직 |
| `src/app/pfmea/worksheet/tabs/failure/FailureLinkTables.tsx` | FE/FM/FC 3개 테이블 렌더링 |
| `src/app/pfmea/worksheet/tabs/failure/FailureLinkResult.tsx` | 분석결과 테이블 렌더링 |

---

## 🎨 색상 팔레트

### FM(고장형태) 테이블
| 상태 | 배경색 | 설명 |
|------|--------|------|
| 기본 (홀수행) | `#fff3e0` | 연한 주황색 |
| 기본 (짝수행) | `#ffe0b2` | 진한 주황색 |
| **선택됨** | `#bbdefb` | 하늘색 |
| No열 (선택됨) | `#1976d2` | 파란색 |

### FE(고장영향) 테이블 - 구분별 색상
| 구분 | Light | Dark |
|------|-------|------|
| YP (Your Plant) | `#e3f2fd` | `#bbdefb` |
| SP (Ship to Plant) | `#f3e5f5` | `#e1bee7` |
| USER | `#e8f5e9` | `#c8e6c9` |

### FC(고장원인) 테이블 - 공정별 색상
| 순서 | Light | Dark | 예시 공정 |
|------|-------|------|-----------|
| 1 | `#e8f5e9` | `#c8e6c9` | 자재입고 |
| 2 | `#e3f2fd` | `#bbdefb` | 수입검사 |
| 3 | `#fff3e0` | `#ffe0b2` | MB Mixing |
| 4 | `#f3e5f5` | `#e1bee7` | 추가 공정 |
| 5 | `#e0f7fa` | `#b2ebf2` | 추가 공정 |
| 6 | `#fce4ec` | `#f8bbd9` | 추가 공정 |

### 연결 상태 표시
| 상태 | 배경색 | 아이콘 | 테두리 |
|------|--------|--------|--------|
| 현재 FM에 연결됨 | `#bbdefb` | `▶` | 파란 박스섀도우 |
| 다른 FM에 연결됨 | `#c8e6c9` | `●` | 없음 |

---

## 🔧 색상 변경 방법

### 1. FM 선택 색상 변경
**파일**: `FailureLinkTables.tsx`  
**검색어**: `isSelected ? '#bbdefb'`

```typescript
// 현재 코드 (라인 ~224)
const cellBg = isSelected ? '#bbdefb' : (idx % 2 === 1 ? '#ffe0b2' : '#fff3e0');
```

### 2. FE 구분별 색상 변경
**파일**: `FailureLinkTables.tsx`  
**검색어**: `scopeColorMap`

```typescript
// 현재 코드 (라인 ~171-175)
const scopeColorMap: Record<string, { light: string; dark: string }> = {
  'YP': { light: '#e3f2fd', dark: '#bbdefb' },   // 파란색 (Your Plant)
  'SP': { light: '#f3e5f5', dark: '#e1bee7' },   // 보라색 (Ship to Plant)
  'USER': { light: '#e8f5e9', dark: '#c8e6c9' }, // 녹색 (User)
};
```

### 3. FC 공정별 색상 변경
**파일**: `FailureLinkTables.tsx`  
**검색어**: `processColorPalette`

```typescript
// 현재 코드 (라인 ~323-330)
const processColorPalette = [
  { light: '#e8f5e9', dark: '#c8e6c9' },   // 녹색 1
  { light: '#e3f2fd', dark: '#bbdefb' },   // 파란색
  { light: '#fff3e0', dark: '#ffe0b2' },   // 주황색
  { light: '#f3e5f5', dark: '#e1bee7' },   // 보라색
  { light: '#e0f7fa', dark: '#b2ebf2' },   // 시안
  { light: '#fce4ec', dark: '#f8bbd9' },   // 핑크
];
```

### 4. 헤더 연결/누락 텍스트 색상 변경
**파일**: `FailureLinkTables.tsx`  
**검색어**: `연결:`, `누락:`

```typescript
// 현재 코드 (라인 ~156-158)
<span className="ml-2" style={{ color: '#fff', fontWeight: 700 }}>연결:{linkStats.feLinkedCount}</span>
<span className="ml-1" style={{ color: '#fff', fontWeight: 700 }}>누락:{...}</span>
```

---

## 🔄 FM 텍스트 동기화 로직

**파일**: `FailureLinkResult.tsx`  
**검색어**: `fmText: fm?.text`

```typescript
// 현재 코드 (라인 ~47-49)
// savedLinks의 오래된 텍스트 대신 fmData에서 최신 값 가져오기
fmText: fm?.text || group.fmText,           // ★ 최신 텍스트 우선
fmProcess: fm?.processName || group.fmProcess, // ★ 최신 공정명 우선
```

**동작 방식**:
1. `fmData`에서 해당 FM ID로 검색
2. 찾으면 최신 텍스트/공정명 사용
3. 못 찾으면 `savedLinks`의 기존 값 사용 (fallback)

---

## 🔄 FM 텍스트 실시간 동기화

### ALL화면
**파일**: `tabs/all/processFailureLinks.ts`  
**검색어**: `latestFMTextMap`

```typescript
// state.l2에서 최신 FM 텍스트 맵 생성
const latestFMTextMap = new Map<string, { text: string; processName: string }>();
l2Data?.forEach(proc => {
  proc.failureModes?.forEach(fm => {
    latestFMTextMap.set(fm.id, { text: fm.name, processName: proc.name });
  });
});
```

**호출 위치**: `AllTabEmpty.tsx`
```typescript
const processedFMGroups = React.useMemo(
  () => processFailureLinks(failureLinks, state?.l2), 
  [failureLinks, state?.l2]
);
```

### 고장사슬 결과화면
**파일**: `tabs/failure/FailureLinkResult.tsx`  
**검색어**: `fm?.text`

```typescript
// fmData에서 최신 FM 텍스트 가져오기
fmText: fm?.text || group.fmText,
fmProcess: fm?.processName || group.fmProcess,
```

---

## ⚠️ 주의사항

1. **줄무늬 패턴**: `scopeIdx % 2` 또는 `processRowIdx % 2`로 계산됨. 그룹 변경 시 인덱스 리셋.
2. **연결 상태 표시**: `linkedFEIds`/`linkedFCIds`는 `linkedFEs.keys()`/`linkedFCs.keys()`에서 생성됨.
3. **FM 선택 시 boxShadow**: `inset 0 0 0 3px #1976d2` 적용됨.
4. **FM 데이터 구조**: `state.l2[].failureModes[].name` (text가 아님!)

---

## 📋 테스트 체크리스트

- [ ] FM 클릭 시 하늘색 배경 변경 확인
- [ ] FE/FC 연결 시 하늘색 배경 + ▶ 아이콘 표시 확인
- [ ] FE 테이블에서 YP/SP/USER 구분별 줄무늬 확인
- [ ] FC 테이블에서 공정별 줄무늬 확인
- [ ] 고장분석에서 FM 수정 후 분석결과에 반영 확인
- [ ] 해당공정 드롭다운으로 필터링 확인

