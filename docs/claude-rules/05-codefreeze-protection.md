# Rule 3 + 10 + 10.5 + 12: 코드프리즈, 기존 코드 보호, 롤백

---

## Rule 3: 코드프리즈 — 2026-04-03 해제

> **사용자 선언(2026-04-03):** `CODEFREEZE` 주석이 있어도 업무상 필요 시 수정 가능.
> 상단 배너는 사고 이력/주의사항 안내로 유지.

### 여전히 적용되는 기술 금지

| 규칙 | 내용 |
|------|------|
| **Rule 3.1** | `save-position-import` 등에서 FK 필드 제거 금지 |
| **Rule 3.2** | `isPositionBasedFormat`에 "통합" 차단 코드 재삽입 금지 |
| **Rule 0.5** | 카테시안 복제 금지 |
| **Rule 1.7** | 이름만으로 FK 확정 금지 |
| **Rule 10** | 고장연결 핵심 별도 보호 |

### 코드프리즈 적용 흐름

```
기능 개발 완료 → 검증 통과 → 코드프리즈 적용
  ├── 파일 상단 CODEFREEZE 주석 추가 (사고 이력 포함)
  ├── Guard Test 작성 (불변식 검증)
  └── 스냅샷 생성 (npm run snapshot)
```

---

## Rule 10: 기존 핵심 로직 손상 금지

> 새 기능 추가 시 기존 핵심 로직을 절대 수정하지 않는다.

### 절대 수정 금지 (고장연결)

- ⛔ `useSVGLines.ts` — SVG 연결선 로직
- ⛔ `linkedFEs`/`linkedFCs` 상태 — 고장 연결 상태
- ⛔ FM 선택 useEffect — 고장형태 선택 로직

### 안전한 방법

- ✅ 기존 상태는 **읽기만**
- ✅ 수정은 `savedLinks`만
- ✅ 별도 상태 사용
- 위반 시 **즉시 롤백**

---

## Rule 10.5: 데이터 로드 파이프라인 불변 원칙

> **사고 경위**: 데이터 로드 경로에 필터 함수 삽입 → 수동모드 placeholder 삭제 → 기능 파괴

### 불변 규칙

1. `useWorksheetDataLoader.ts`의 `l2:` 할당 라인에 **필터/변환 함수 삽입 절대 금지**
2. 빈 이름(`''`)의 L3를 **삭제하는 로직 추가 금지** (수동모드 placeholder)
3. 새 로직 필요 시 → 별도 `useEffect`/`useMemo`에서 처리 (원본 불변)
4. 위반 시 → `tests/e2e/manual-mode-guard.spec.ts` 실행

---

## Rule 12: 온프레미스 에러 제로 정책

1. **어떤 에러든 완벽 수정** (`tsc --noEmit` 에러 0개)
2. 관련 앱 전체(PFMEA/DFMEA/CP/PFD/PM/WS/APQP) 병렬 진단/수정
3. 수정 완료 → 즉시 코드프리즈
4. 빌드/타입체크 통과 → 커밋

---

## 스냅샷 & 롤백 포인트

### 스냅샷 생성

```bash
npm run snapshot          # DB 스냅샷 생성
npm run snapshot:list     # 스냅샷 목록 조회
```

### 롤백 포인트 전략

```
기능 개발 시작 전:
  1. git tag rollback-{날짜}-{기능명}
  2. npm run snapshot (DB 상태 보존)
  3. 개발 시작

검증 실패 시:
  1. git diff → 변경 범위 확인
  2. 영향 범위가 넓으면 → git revert (롤백)
  3. npm run snapshot (복원)
  4. 원인 분석 후 재시도
```

### 기존 코드 보호 (새 기능 개발 시)

```
새 기능 개발 시 보호 체크리스트:
  [ ] 기존 Guard Test 실행 → 전체 PASS 확인
  [ ] 기존 파이프라인 검증 → allGreen 확인
  [ ] CODEFREEZE 주석 파일 목록 확인 (수정 대상 아닌지)
  [ ] 수정 후 기존 Guard Test 재실행 → 회귀 없음 확인
  [ ] 기존 파이프라인 재검증 → allGreen 유지 확인
```

---

## Rule 13: 배포환경 코드 품질

1. **`createSample*()` 자동 호출 금지** (개발 모드 전용)
2. **DB 비어있으면 빈 상태 유지** → 사용자가 Import/추가
3. **미사용 export/import 즉시 제거** (dead code 방치 금지)
4. 기능 삭제 시 관련 함수/타입/import **모두 연쇄 제거**

---

## 과거 코드프리즈 관련 실패 사례

| 날짜 | 증상 | 원인 | 교훈 |
|------|------|------|------|
| 03-22 | 워크시트 빈 placeholder 전체 누락 | 로더에 `l2Structures.length>0` 게이트 | 로드 파이프라인 불변 (Rule 10.5) |
| 03-22 | 고장매칭 후 DB 미반영 | `saveTemp`만 호출, `saveAtomicDB` 미호출 | 항상 DB 저장 동반 |
| 03-23 | React StrictMode 2줄 중복 | `splice` 이중 적용 | `createStrictModeDedupedUpdater` 사용 |
| 03-23 | `setStateSynced` 불일치 | `updater(stateRef)` + `setState(객체)` 분리 | `setState(prev=>…)` 통일 |
