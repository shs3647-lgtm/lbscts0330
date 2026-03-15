# 버그 수정 요청 템플릿 (Fix Request Template)

> 용도: AI에게 버그 수정을 요청할 때 아래 템플릿을 복사하여 사용
> 근거: 재현 → 근본원인 → 파급범위 → 불변조건 순서로 강제

---

## 템플릿

```markdown
## 버그 수정 요청

### 1. 재현 조건
- **어떤 데이터로**: (예: Au BUMP 템플릿, FC시트 107행)
- **어떤 동작에서**: (예: Import 확정 → 워크시트 이동)
- **어떤 증상이**: (예: C4 고장영향 0건, 빈 화면)

### 2. 근본 원인 특정
- **어느 파일**: (예: buildWorksheetState.ts)
- **어느 함수/라인**: (예: fillL1Data() 120행)
- **왜 틀린 건지**: (예: FE를 processNo 루프 안에서 생성 → L1 레벨인데 공정별로 분리됨)

### 3. 파급 파일 목록
이 수정이 영향을 주는 인접 파일을 먼저 나열해줘:
- [ ] 파일1 — 영향 내용
- [ ] 파일2 — 영향 내용

### 4. 불변 조건 확인
아래 조건이 수정 후에도 유지되는지 확인해줘:
(docs/PIPELINE_INVARIANTS.md에서 해당 단계 조건 복사)

- S2-1: A4는 공정 단위 1회 생성
- S2-6: 모든 FM에 productCharId 할당
- S4-1: Link는 FE+FM+FC 3요소 모두 매칭 시에만 생성
- ...

### 5. 검증 명령
수정 후 아래를 순서대로 실행해줘:
1. `npx tsc --noEmit` — 타입 에러 0개
2. `npx vitest run src/__tests__/invariants/` — 불변 조건 테스트 통과
3. `npx vitest run src/__tests__/import/` — Import 회귀 테스트 통과
4. (UI 변경 시) Playwright 브라우저 확인
```

---

## 버그 유형별 체크리스트

### Import 파싱 버그

```markdown
확인할 불변 조건: S1-1 ~ S1-5
파급 범위:
- [ ] supplementMissingItems.ts — 보충 로직에 영향?
- [ ] buildWorksheetState.ts — 구조 생성에 영향?
- [ ] excel-parser-fc.ts — FC 파싱에 영향?

재발 패턴 확인 (docs/BUG_RECURRENCE_MAP.md):
- [ ] processNo 포맷 불일치 패턴인가? → normalizePno() 전면 적용
- [ ] Phase 타이밍 패턴인가? → supplement → build 순서 확인
```

### 구조 생성 버그

```markdown
확인할 불변 조건: S2-1 ~ S2-9
파급 범위:
- [ ] failureChainInjector.ts — FM/FC/FE 매칭에 영향?
- [ ] route.ts POST — DB 저장에 영향?
- [ ] WorksheetState 타입 — 인터페이스 변경?

재발 패턴 확인:
- [ ] 카테시안 복제 패턴인가? → 공유 엔티티 1회 생성 확인
- [ ] B1 공정별 갭 패턴인가? → 전 공정 순회 확인
```

### 고장연결 버그

```markdown
확인할 불변 조건: S4-1 ~ S4-9
파급 범위:
- [ ] buildWorksheetState.ts — 엔티티 생성에 영향?
- [ ] riskData 키 형식 — 키 불일치?
- [ ] AllTabAtomic.tsx — 화면 표시에 영향?

재발 패턴 확인:
- [ ] FE 0건 패턴인가? → FE가 L1 레벨인지 확인
- [ ] round-robin 패턴인가? → 자동배분 코드 없는지 확인
- [ ] ★ Chain-Driven 전환으로 자동 해결되는 유형인가?
```

### DB 저장 버그

```markdown
확인할 불변 조건: S6-1 ~ S6-7
파급 범위:
- [ ] db-storage.ts — 저장 큐에 영향?
- [ ] useWorksheetDataLoader.ts — 로드에 영향?
- [ ] 다른 모듈 API — CP/PFD 연동에 영향?

재발 패턴 확인:
- [ ] FK 단절 패턴인가? → prisma.$transaction 래핑 확인
- [ ] Schema 동기화 패턴인가? → npm run db:generate 실행
```

---

## 수정 완료 보고 형식

```markdown
## 수정 완료 보고

### 수정 내용
- 파일: `xxx.ts` 라인 120
- 변경: FE 생성을 processNo 루프 밖으로 이동

### 검증 결과
- [x] `npx tsc --noEmit` → 에러 0개
- [x] `npx vitest run src/__tests__/invariants/` → 22/22 PASS
- [x] `npx vitest run src/__tests__/import/` → 280/280 PASS

### 불변 조건 확인
- [x] S2-8: FE는 L1 레벨 ✅
- [x] S4-1: 3요소 매칭 ✅
- [x] S6-5: link.feId FK 존재 ✅

### 파급 영향
- failureChainInjector.ts → 영향 없음 (FE 매칭 입력만 변경)
- route.ts → 영향 없음 (DB 구조 동일)
```
