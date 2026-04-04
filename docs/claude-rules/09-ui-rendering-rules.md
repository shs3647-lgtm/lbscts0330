# Rule 2 + 11 + 14: UI / 렌더링 규칙

---

## Rule 2: 기존 UI 변경 금지

> 기존 UI는 절대 변경하지 않는다. 사용자가 **명시적으로** UI 변경을 요청한 경우에만 수정.

- ❌ "아마 괜찮을 것 같아서" 수정 → 금지
- ✅ "이 파일의 이 부분을 수정해도 될까요?" → 필수

---

## Rule 11: UI 슬림화 및 패딩 최소화

1. 모든 테이블 셀 내 불필요한 아이콘(드롭다운 꺽쇄, 날짜 아이콘 등)은 **기본 숨김**
2. 행 높이 및 패딩을 최소화 (100% 배율에서 더 많은 정보 표시, 패딩 0~2px)
3. 상호작용(드롭다운, 날짜 선택)은 **호버 시에만 표시**하여 화면 깔끔하게 유지

---

## Rule 14: Handsontable 사용 금지

> 마이그레이션 완료: Handsontable → HTML `<table>` + Tailwind CSS (2026-02-20)

1. **Handsontable 신규 도입/재설치 절대 금지** (`npm install handsontable` 금지)
2. **모든 데이터 그리드는 HTML `<table>` + Tailwind CSS로 구현**
3. 정렬: `useState(sortKey/sortDir)` + `useMemo` (BdStatusTable 참조)
4. 셀 렌더러: React 인라인 컴포넌트 (ProgressCell, StatusCell 등)
5. **금지 사유**: 라이선스(`non-commercial-and-evaluation`), 번들 크기(~550KB), deprecated

---

## 렌더링 원칙: DB 데이터만

> **화면에 표시되는 모든 데이터는 Atomic DB에서 로드한 것만 허용.**
> **JSON blob 직접 렌더링, 메모리 state만 보존은 금지.**

### 렌더링 흐름

```
DB (Atomic) → API 로드 → State → 렌더링
  ↑ 편집 시 즉시 반영 (큐 패턴)
```

### 금지 패턴

- ❌ `FmeaLegacyData`의 JSON blob을 직접 렌더링
- ❌ 메모리 state만 수정 후 나중에 일괄 저장
- ❌ 로드 경로에 필터/변환 삽입 (Rule 10.5)
- ❌ 빈 데이터를 placeholder로 자동 채움

### 허용 패턴

- ✅ Atomic DB에서 `Map.get(id)` 조회 후 렌더링
- ✅ 없으면 빈칸 (경고 표시 가능)
- ✅ 편집 → `setStateSynced` + `saveAtomicDB` → DB 즉시 반영

---

## 워크시트 디자인 원칙

1. 메뉴바는 상단 고정 (스크롤 불가)
2. 수평 스크롤바는 컨테이너당 1개만
3. 수직 스크롤바는 워크시트만 제어
4. 1440px 브라우저 너비 기준 설계
5. **700행 초과 시 파일 분리 필수**

### 워크시트 모듈 구조

```
worksheet/
├── page.tsx          # 메인 (<700행)
├── constants.ts
├── utils.ts
├── components/
├── hooks/
├── tabs/             # 탭별 컴포넌트
└── panels/           # 우측 패널 (AP Table, RPN Chart, Tree)
```

---

## React 관련 주의사항

| 주의 | 내용 |
|------|------|
| `React.memo` 유지 | `SelectableCell`, `SpecialCharBadge`, `AllViewRow` 해제 금지 |
| StrictMode 대응 | `createStrictModeDedupedUpdater` 사용 (splice 이중 적용 방지) |
| `setStateSynced` | `setState(prev=>…)` 패턴으로 통일 (stateRef 직접 조작 금지) |
| 빈 데이터 | `items.length === 0` 시 안내 메시지 표시 |
| 새 페이지 | `error.tsx` 추가 필수 |

## 과거 UI 관련 실패 사례

| 증상 | 원인 | 교훈 |
|------|------|------|
| 행 추가 시 2줄 중복 | StrictMode + splice 이중 적용 | 멱등 업데이터 필수 |
| `setStateSynced` 불일치 | `updater(stateRef)` + `setState(객체)` 분리 | `setState(prev=>…)` 통일 |
| 워크시트 빈 화면 | 로더 게이트 불일치 | `if (atomicData)` 단일 게이트 |
| 수동모드 placeholder 삭제 | 로드 경로에 빈 이름 필터 삽입 | 로드 경로 불변 (Rule 10.5) |
