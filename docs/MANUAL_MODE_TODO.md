# 수동모드 보완 TODO

> 최종 업데이트: 2026-03-29
> 전체 22건 (HIGH 5 / MEDIUM 12 / LOW 5)

---

## HIGH (5건) -- 즉시 수정

### COM-1: 모든 기능 API에 parentFmeaId fallback 통일
- **현황**: `master-processes`, `work-elements`만 적용 완료 (06a0893)
- **미적용**: `l1-functions`, `l2-functions` API
- **수정**: 두 API에 동일 패턴 추가 (자체→부모→isActive 3단계)
- **파일**: `src/app/api/fmea/l1-functions/route.ts`, `src/app/api/fmea/l2-functions/route.ts`

### COM-4: FE/FM/FC 마스터 DB 연동 (하드코딩 → DB 기반 목록)
- **현황**: FE 기본 10개, FM 기본 15개, FC 기본 11개가 코드에 하드코딩
- **수정**: 마스터 DB (MasterFmeaReference 또는 pfmeaMasterFlatItem)에서 조회
- **파일**: `FailureEffectSelectModal.tsx`, `FailureModeSelectModal.tsx`, `FailureCauseSelectModal.tsx`

### L1-F2: l1-functions API에 parentFmeaId fallback 추가
- COM-1에 포함

### L2-F1: l2-functions API에 parentFmeaId fallback 추가
- COM-1에 포함

### FE-F2 / FM-F2 / FC-F2: 고장 모달 마스터 DB 자동 로드
- COM-4에 포함

---

## MEDIUM (12건) -- 안정성/UX 개선

### COM-2: 모든 인라인 편집 fetch에 에러 toast 추가
- **현황**: fire-and-forget (에러 시 console.error만)
- **수정**: `.catch()` 에서 `toast.error()` 호출
- **대상 파일**:
  - `useFunctionL1Handlers.ts` (L1 C2/C3 인라인 편집)
  - `useFunctionL2Handlers.ts` (L2 A3/A4 인라인 편집)
  - `useFunctionL3Handlers.ts` (L3 B2/B3 인라인 편집)

### COM-3: FE/FM/FC 모달 UX 통일
- **현황**: 메인공정/작업요소 모달은 적용됨/미적용 섹션 분리 완료
- **수정**: FE/FM/FC 모달도 동일 패턴 적용 (적용/미적용, 검색, Enter 추가)
- **대상**: `FailureEffectSelectModal.tsx`, `FailureModeSelectModal.tsx`, `FailureCauseSelectModal.tsx`

### COM-5: 각 탭 단위 테스트 추가
- **현황**: L1/L2/L3 handler에 단위 테스트 0건
- **수정**: 핵심 handler (add/delete/edit/dedup) 검증 테스트 작성
- **대상**: `useFunctionL1Handlers.ts`, `useFunctionL2Handlers.ts`, `useFunctionL3Handlers.ts`

### S-1: 정렬 버튼 클릭 시 atomicDB L3 순서도 L2와 동기화 확인
- **현황**: handleSortByProcessNo가 L2만 정렬, L3 order는 미확인
- **수정**: L2 정렬 후 각 L2의 L3도 order 재배정

### L1-F1 / L2-F2 / L2-F3 / L3-F1: 인라인 편집 에러 핸들링
- COM-2에 포함

### FE-F1 / FM-F1 / FC-F1: 고장 모달 적용됨/미적용 섹션 분리
- COM-3에 포함

### L3-F2: B3↔ControlPlan sync 경로 검증
- **현황**: `sync-to-cp/process-char` API 존재하나 동작 미검증
- **수정**: API 호출 경로 추적 + 동작 테스트

---

## LOW (5건) -- 편의 기능

### S-2: 공정번호 직접 편집 기능
- **현황**: No 셀은 읽기전용 (모달/자동부여만)
- **수정**: No 셀 더블클릭 → 번호 수정 → 정규화 → DB 저장

### L1-F3: 모달 닫기 시 미저장 변경 경고
- **현황**: 닫기 버튼 클릭 시 바로 닫힘
- **수정**: 미저장 선택/편집 있으면 confirm 다이얼로그

### L1-F4: C2/C3 대소문자 정규화 중복 감지
- **현황**: "Function"과 "function"을 별도 항목으로 저장
- **수정**: DB 저장 시 lowercase 비교 (표시는 원본 유지)

### FL-F1: FailureLink 변경 이력 추적 (audit trail)
- **현황**: 변경 이력 없음
- **수정**: FL 생성/삭제/수정 시 이력 테이블에 기록

---

## 작업 순서 (권장)

```
1차 (HIGH): COM-1 → COM-4
   - l1-functions, l2-functions API에 parentFmeaId fallback 추가
   - FE/FM/FC 모달 하드코딩 → DB 조회 전환

2차 (MEDIUM-안정성): COM-2
   - 전체 인라인 편집 에러 toast 일괄 추가

3차 (MEDIUM-UX): COM-3
   - FE/FM/FC 모달 적용/미적용 섹션 분리

4차 (MEDIUM-품질): COM-5 + S-1 + L3-F2
   - 단위 테스트 + 정렬 L3 동기화 + CP sync 검증

5차 (LOW): S-2 + L1-F3 + L1-F4 + FL-F1
   - 편의 기능
```

---

## 완료 이력

| 날짜 | ID | 내용 | 커밋 |
|------|-----|------|------|
| 2026-03-29 | (구조분석 전체) | 공정번호 분리, 정렬, 모달 적용/미적용, 더블클릭 DB 저장, 부모 fallback | 2eb9d78~06a0893 |
