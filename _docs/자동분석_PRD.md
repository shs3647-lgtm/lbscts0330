# PFMEA 자동매핑 문지기(Gatekeeper) + 구조불변 원칙 PRD

> **문서 버전**: 1.0 (2026-02-17)
> **상태**: 설계 완료 → 구현 진행 중

---

## 1. 문제 정의

### 1.1 현재 문제점
| 문제 | 원인 | 영향 |
|------|------|------|
| 구조 붕괴 | 자동모드가 마스터 데이터로 구조(L2/L3 계층)까지 덮어씌움 | 시스템 붕괴 — 복구 불가 |
| 잘못된 매핑 | B2/B3 시트의 m4 파싱 실패 → 모든 작업요소에 동일 기능 복사 | 데이터 무결성 파괴 |
| 데이터 0건 | sourceFmeaId 불일치 → 다른 FMEA의 데이터 매핑 | 빈 화면 또는 오염된 데이터 |
| 검증 부재 | API 응답을 무조건 신뢰하고 검증 없이 매핑 | 오류 감지 불가 |

### 1.2 핵심 원칙
> **"데이터가 잘못 들어오는 것은 수동으로 수정 가능하지만, 구조가 깨지면 시스템이 붕괴된 것이다"**

---

## 2. 해결 방향

### 2.1 호텔-자물쇠-키 아키텍처

```
호텔(Hotel)     = 구조분석에서 확정된 워크시트 구조 (L1/L2/L3 계층)
방(Room)        = 각 셀의 위치 (공정번호 + 4M + itemCode)
자물쇠(Lock)    = 셀이 기대하는 데이터 매핑 기준
키(Key)         = 마스터에서 가져온 데이터 (processNo + m4 + itemCode + value)

★ 호텔은 먼저 지어놓고, 키가 자물쇠에 맞으면 열어주는 방식
★ 호텔 구조를 키로 변경하는 것은 불가
```

### 2.2 3대 원칙

| 원칙 | 설명 | 위반 시 |
|------|------|---------|
| **구조불변** | 구조분석에서 확정된 L2/L3 계층은 자동매핑으로 절대 변경 불가 | 자동매핑 거부 |
| **데이터 문지기** | 지정된 기준(processNo + m4 + itemCode)에 맞는 데이터만 매핑 | 불일치 데이터 거부 |
| **행추가만 허용** | 자동매핑은 기존 구조 내에서 데이터 행추가만 가능 | 구조 변경 시도 차단 |

---

## 3. 상세 설계

### 3.1 컬럼-데이터 매핑 정의서

각 탭별 셀에 어떤 마스터 데이터(itemCode)가 매핑되어야 하는지 정의:

| 탭 | itemCode | 컬럼명 | 매칭 키 |
|----|----------|--------|---------|
| 기능 1L | C1 | 구분 (YP/SP/USER) | value 자체 |
| 기능 1L | C2 | 완제품기능 | processNo (=카테고리) |
| 기능 1L | C3 | 요구사항 | processNo (=카테고리) |
| 기능 2L | A3 | 공정기능 | processNo |
| 기능 2L | A4 | 제품특성 | processNo |
| 기능 3L | B2 | 작업기능 | processNo + m4 |
| 기능 3L | B3 | 공정특성 | processNo + m4 |
| 고장 1L | C4 | 고장영향(FE) | processNo (=카테고리) |
| 고장 2L | A5 | 고장형태(FM) | processNo |
| 고장 3L | B4 | 고장원인(FC) | processNo |

**파일**: `src/app/pfmea/worksheet/autoMapping/columnSchema.ts`

### 3.2 자물쇠-키 매칭 흐름

```
Step 1: 호텔 건설 (buildRoomLocks)
        현재 구조(state)에서 방 목록(RoomLock[]) 자동 생성

        L2 탭 예시:
        state.l2 = [{no:'10', name:'SMT'}, {no:'20', name:'수삽'}]
        → RoomLock[] = [
            {processNo:'10', itemCode:'A3'},  // 10번 공정의 공정기능 방
            {processNo:'10', itemCode:'A4'},  // 10번 공정의 제품특성 방
            {processNo:'20', itemCode:'A3'},
            {processNo:'20', itemCode:'A4'},
          ]

        L3 탭 예시:
        state.l2[0].l3 = [{name:'작업자', m4:'MN'}, {name:'납땜기', m4:'MC'}]
        → RoomLock[] = [
            {processNo:'10', m4:'MN', itemCode:'B2'},  // 10번-사람의 작업기능 방
            {processNo:'10', m4:'MN', itemCode:'B3'},  // 10번-사람의 공정특성 방
            {processNo:'10', m4:'MC', itemCode:'B2'},  // 10번-설비의 작업기능 방
            {processNo:'10', m4:'MC', itemCode:'B3'},  // 10번-설비의 공정특성 방
          ]

Step 2: 키 검증 (validateKeys)
        마스터 데이터 각 항목을 RoomLock 목록에 대조

        ✅ {processNo:'10', m4:'MN', itemCode:'B2', value:'나사조임'}
           → RoomLock{processNo:'10', m4:'MN', itemCode:'B2'} 존재 → matched

        ❌ {processNo:'99', m4:'MN', itemCode:'B2', value:'???'}
           → RoomLock{processNo:'99'} 없음 → rejected (NO_ROOM)

        ❌ {processNo:'10', m4:'', itemCode:'B2', value:'???'}
           → RoomLock{processNo:'10', m4:''} 없음 → rejected (WRONG_ROOM)

Step 3: 결과 분류 및 처리
        matched → 해당 셀에 행추가로 렌더링
        rejected → 사용자에게 오류 목록 표시 → 수동 수정 유도
```

### 3.3 거부 사유 코드

| 코드 | 한국어 | 설명 |
|------|--------|------|
| `NO_ROOM` | 해당 방 없음 | 구조분석에 없는 공정번호 |
| `WRONG_FLOOR` | 층 불일치 | 공정번호가 다름 |
| `WRONG_ROOM` | 호수 불일치 | 4M 값이 다르거나 누락 |
| `EMPTY_KEY` | 빈 키 | value가 비어있음 |
| `WRONG_KEY_TYPE` | 키 타입 불일치 | 기대하지 않는 itemCode |
| `HOTEL_MISMATCH` | 호텔 불일치 | sourceFmeaId 불일치 |

### 3.4 결과 처리 정책

| 상황 | 처리 | 사용자 메시지 |
|------|------|--------------|
| 전체 통과 (rejected=0) | 데이터 행추가 매핑 | "✅ 마스터 데이터 로드 완료!" |
| 일부 통과 (matched>0, rejected>0) | 유효 데이터만 매핑 + 오류 표시 | "⚠️ N건 검증 실패, M건 매핑 완료" |
| 전체 실패 (matched=0) | 자동매핑 거부 → 수동모드 강제 | "❌ 자동매핑 불가! 수동 모드로 입력해주세요" |

---

## 4. 구조불변 보호

### 4.1 보호 대상

| 필드 | 보호 수준 | 설명 |
|------|----------|------|
| `state.l1.name` | **IMMUTABLE** | 완제품명 (구조분석 확정) |
| `state.l2[].no` | **IMMUTABLE** | 공정번호 |
| `state.l2[].name` | **IMMUTABLE** | 공정명 |
| `state.l2[].l3[].name` | **IMMUTABLE** | 작업요소명 |
| `state.l2[].l3[].m4` | **IMMUTABLE** | 4M 분류 |
| `state.l2[].functions[]` | APPENDABLE | 행추가만 허용 |
| `state.l2[].l3[].functions[]` | APPENDABLE | 행추가만 허용 |
| `state.l1.types[].functions[]` | APPENDABLE | 행추가만 허용 |

### 4.2 기존 vs 변경

```typescript
// ❌ 기존: 마스터 데이터로 구조까지 생성/교체
newState.l2 = newState.l2.map(proc => ({
  ...proc,
  l3: proc.l3.map(we => ({
    ...we,
    functions: funcNames.map(...)  // ← 기존 functions 배열을 완전 교체
  }))
}));

// ✅ 변경: 기존 구조 유지, 검증된 데이터 행만 추가
newState.l2 = newState.l2.map(proc => ({
  ...proc,  // ← no, name 불변
  l3: proc.l3.map(we => ({
    ...we,  // ← name, m4 불변
    functions: [
      ...we.functions,               // 기존 데이터 유지
      ...gatekeeperResult.matched    // 검증 통과 데이터만 추가
        .filter(m => m.room.processNo === procNo && m.room.m4 === weM4)
        .map(m => createFunctionRow(m.data))
    ]
  }))
}));
```

---

## 5. 자동모드 새 흐름

```
사용자: "자동" 버튼 클릭
  │
  ├─ Step 1: 구조 확인 (호텔이 지어져 있는가?)
  │   └─ 구조분석 미확정 → "⚠️ 구조분석을 먼저 확정해주세요" → 종료
  │
  ├─ Step 2: API 호출 (키 묶음 가져오기)
  │   └─ GET /api/pfmea/master?includeItems=true
  │
  ├─ Step 3: 방 목록 생성 (buildRoomLocks)
  │   └─ 현재 state에서 공정번호 + m4 + itemCode 조합 추출
  │
  ├─ Step 4: 키-자물쇠 매칭 (validateKeys)
  │   ├─ matched[] : 키가 맞는 데이터
  │   └─ rejected[] : 키가 안 맞는 데이터
  │
  ├─ Step 5: 결과 처리
  │   ├─ matched만 행추가로 렌더링 (구조 불변)
  │   └─ rejected 목록 사용자에게 표시
  │
  └─ 종료
```

---

## 6. 파일 변경 목록

| 파일 | 변경 | 신규/수정 |
|------|------|----------|
| `src/app/pfmea/worksheet/autoMapping/columnSchema.ts` | 탭별 컬럼-itemCode 매핑 정의 | **신규** |
| `src/app/pfmea/worksheet/autoMapping/gatekeeper.ts` | 자물쇠-키 검증 로직 | **신규** |
| `src/app/pfmea/worksheet/autoMapping/index.ts` | 모듈 re-export | **신규** |
| `.../function/hooks/useFunctionL1Handlers.ts` | Gatekeeper 적용 + 구조불변 | 수정 |
| `.../function/hooks/useFunctionL2Handlers.ts` | Gatekeeper 적용 + 구조불변 | 수정 |
| `.../function/hooks/useFunctionL3Handlers.ts` | Gatekeeper 적용 + 구조불변 | 수정 |
| `.../failure/hooks/useFailureL1Handlers.ts` | Gatekeeper 적용 + 구조불변 | 수정 |
| `.../failure/FailureL2Tab.tsx` | Gatekeeper 적용 + 구조불변 | 수정 |
| `.../failure/hooks/useFailureL3Handlers.ts` | Gatekeeper 적용 + 구조불변 | 수정 |

**신규 3개 + 수정 6개 = 총 9개 파일**

---

## 7. 검증 계획

1. `npx tsc --noEmit` → 0 에러
2. 자동모드 전환 → console에서 Gatekeeper 검증 로그 확인
3. 잘못된 processNo 데이터 → NO_ROOM 거부 확인
4. m4 빈 값 데이터 → WRONG_ROOM 거부 확인
5. 정상 데이터 → 행추가로만 렌더링, 구조(L2/L3 계층) 불변 확인
6. 수동모드에서 오류 데이터 직접 수정 가능 확인

---

## 8. 향후 확장

- DFMEA 자동매핑에도 동일한 Gatekeeper 적용
- 최적화 탭(A6 검출관리, B5 예방관리)에도 적용
- 자동 수정 루프: rejected 데이터의 패턴 분석 → 자동 보정 제안
