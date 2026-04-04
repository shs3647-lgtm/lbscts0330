# Rule 1.5 + 1.6 + 1.7: UUID/FK 설계 원칙 — 영구 CODEFREEZE

---

## Rule 1.5: DB UUID 중심 꽂아넣기 — 자동생성/추론 절대 금지

> **모든 데이터 렌더링은 DB에 저장된 근거 데이터에만 근거한다.**
> **fallback 자동생성, 카테시안 추론, 추론 기반 데이터 생성을 절대 적용하지 않는다.**

### 데이터 소스 우선순위 (SSoT 체인)

| 우선순위 | 소스 | 테이블 |
|---------|------|--------|
| 1순위 | **프로젝트 Atomic DB** | L1/L2/L3, FM/FE/FC, FailureLink |
| 2순위 | **Master FMEA DB** | `MasterFmeaReference` |
| 3순위 | **산업 DB** | `KrIndustryDetection`, `KrIndustryPrevention` |
| 4순위 | **LLD DB** | `LLDFilterCode`, `LessonsLearned` |
| ❌ 금지 | **코드 내 자동생성** | `"관리 부적합"`, `"설비가..."`, `inferChar()` |

### 누락 데이터 처리

```
DB 조회 (1→2→3→4순위)
  ├─ 있음 → UUID 생성 + FK 연결 → 꽂아넣기
  └─ 없음 → warn.error('MASTER_MISSING') → Import UI 경고
             → 사용자 "입력" → Master DB 저장 (Living DB)
             → 사용자 "삭제" → cascade 삭제
```

### 절대 금지 패턴

- ❌ `"${name} 부적합"`, `"${name} 관리 특성"`, `"설비가..."`, `"작업자가..."` 문자열 자동생성
- ❌ `inferChar()`, `inferPC()` 등 추론 함수
- ✅ DB 테이블에서 조회한 실제 데이터만 사용

### 위반 코드 검색

```bash
grep -r "부적합\|관리 특성\|설비가\|작업자가\|inferChar" src/
```

---

## Rule 1.6: 근본원인 분석 원칙 — 영구 CODEFREEZE

> **모든 데이터 문제의 근본원인은 UUID, FK, DB 스키마, API 설계, 레거시 데이터에 있다.**
> **이 5가지를 먼저 분석하지 않고 증상만 처방하면 거짓 데이터가 생성된다.**

### 5대 체크리스트 (MANDATORY)

| 순서 | 분석 대상 | 점검 항목 | 위반 증상 |
|------|----------|----------|----------|
| 1 | **UUID 설계** | dedup key에 공정번호/구분 포함? | 데이터 누락/중복 |
| 2 | **FK 설계** | FailureLink에 fmId+fcId+feId 3요소? | 고장연결 소실 |
| 3 | **DB 스키마** | 프로젝트 스키마 분리? 테이블 관계? | 데이터 혼재 |
| 4 | **API 설계** | 저장/로드에 필터/변환 삽입? 트랜잭션? | 데이터 소실 |
| 5 | **레거시 데이터** | JSON blob을 SSoT로 사용? | 렌더링 불일치 |

### 증상 처방 절대 금지 (Anti-Pattern)

```
❌ 증상 처방 (금지):
  데이터 누락 → 자동채움/폴백으로 빈칸 메우기
  FK 깨짐 → 이름 매칭으로 재연결
  중복 → 단어만 보고 삭제
  렌더링 빈칸 → placeholder 자동생성

✅ 근본원인 치료 (필수):
  데이터 누락 → UUID dedup key 점검 → key에 공정번호 누락 → key 수정
  FK 깨짐 → FailureLink FK 3요소 점검 → feId 누락 → FL key 수정
  중복 → dedup key에 컨텍스트 포함 → 동일 텍스트도 별도 엔티티
  렌더링 빈칸 → DB 조회 → Master DB 보충 → 없으면 사용자 입력
```

### 사실 기반 FailureLink 원칙

> **FMEA는 사실에 근거한 엔지니어의 기술적 판단으로 FL이 생성되는 시스템.**
> **자동생성, 이름매칭, 폴백은 거짓 데이터를 만든다.**

| 구분 | 원칙 |
|------|------|
| **FL 생성** | Import/Migration에서 FK 확정된 데이터만 createMany |
| **렌더링** | `Map.get(id)` 조회, 없으면 빈칸 (자동생성 금지) |
| **논리 오류** | 붉은색 경고 표시 → 엔지니어가 수정 |
| **수정 저장** | 엔지니어 수정 → Master DB 자동 업데이트 |

---

## Rule 1.7: UUID/FK 설계 — 영구 CODEFREEZE

> **모든 엔티티의 dedup key에는 컨텍스트(공정번호, 구분)를 반드시 포함.**
> **FK 매칭은 ID 기반만 허용. 텍스트/이름 기반 매칭은 FK 연결에 절대 사용 금지.**

### 엔티티별 dedup key 필수 구성

| 엔티티 | dedup key | 필수 포함 |
|--------|----------|----------|
| **FailureLink** | `fmId\|fcId\|feId` | 3요소 필수 |
| **FailureCause** | `l2StructId\|l3StructId\|cause` | l2StructId (=공정) |
| **A4 (ProductChar)** | `pno\|char` | pno (공정번호) |
| **A5 (FailureMode)** | `pno\|fm` | pno |
| **B1 (L3Structure)** | `pno\|m4\|we` | pno |
| **B4 (FailureCause)** | `pno\|m4\|we\|fm\|fc` | pno + m4 + we |
| **C4 (FailureEffect)** | `procNo\|scope\|fe` | procNo + scope |

### FK 매칭: ID-ONLY 원칙

| 허용 | 금지 |
|------|------|
| `Map.get(id)`, FK 직접 참조 | `.find(x => x.name === ...)` |
| `fmId`/`fcId`/`feId` UUID FK | 텍스트 유사도 매칭 |
| Prisma `where: { id }` | `where: { name: ... }` |
| `productCharId` FK 직접 참조 | 텍스트 재매칭 |

### 핵심: "동일 텍스트 ≠ 동일 엔티티"

```
"작업숙련도부족" (FC)
  공정 10 (PR Coating) → FC-001 (별도 UUID)
  공정 15 (Develop)    → FC-002 (별도 UUID)
  공정 20 (Etch)       → FC-003 (별도 UUID)
  → 18개 공정에 동일 텍스트 = 18개 별도 FC
```

### parentItemId 필수 규칙

| 엔티티 | parentItemId 대상 | 규칙 |
|--------|------------------|------|
| B2 (요소기능) | B1.id (L3Structure) | 없으면 스킵 |
| B3 (공정특성) | B1.id (L3Structure) | 없으면 스킵 |
| B4 (고장원인) | **B3.id** (L3Function) | B1이 아닌 **B3** |
| A5 (고장형태) | A4.id (L2Function) | 없으면 스킵 |
| C3 (요구사항) | C2.id (L1Function) | 없으면 스킵 |

- ❌ parentItemId 없이 엔티티 생성 금지
- ❌ UUID v4로 B1/B4 ID 생성 금지 — `genB1()`/`genB4()` 결정론적 함수만
- ✅ 모든 ID는 `uuid-generator.ts`의 genXxx() 함수로 생성

### 13개 보호 레이어 (fmea-core)

| # | 시스템 | 파일 |
|---|--------|------|
| 1 | UUID 검증 유틸리티 | `src/lib/uuid-rules.ts` |
| 2 | FK 무결성 검증 API | `src/app/api/fmea/validate-fk/route.ts` |
| 2b | FK 수선 API | `src/app/api/fmea/repair-fk/route.ts` |
| 3 | Import 사전검증 | `src/lib/fmea-core/validate-import.ts` |
| 4 | CP UUID 생성기 | `src/lib/uuid-generator.ts` |
| 5 | PFD FK 검증 | `src/lib/fmea-core/validate-pfd-fk.ts` |
| 6 | Export 전 검증 | `src/lib/fmea-core/validate-export.ts` |
| 7 | Optimistic Locking | `src/lib/fmea-core/optimistic-lock.ts` |
| 8 | Audit Trail | `src/lib/fmea-core/audit-trail.ts` |
| 9 | Atomic Cell Save | `src/lib/fmea-core/atomic-cell-save.ts` |
| 10 | Atomic Risk Map | `src/lib/fmea-core/atomic-risk-map.ts` |
| 11 | Project Clone | `src/lib/fmea-core/project-clone.ts` |
| 12 | Undo/Redo | `src/lib/fmea-core/undo-redo.ts` |
| 13 | DC/PC FK 추적 | `src/lib/fmea-core/dc-pc-source-tracker.ts` |

### FailureLink는 엔지니어의 기술적 판단 (영구 기록)

> **이 문제는 매번 반복 발생하므로 반드시 기억해야 한다.**

```
★ 미연결 FC/FM 원인:
  1. FC 시트 파서가 원본 엑셀 체인 누락 파싱
  2. 체인 FK 할당(fmId/fcId/feId 매칭) 실패
  3. 원본 엑셀에 실제로 해당 연결 없음

★ 올바른 해결:
  ✅ FC 시트 파서(buildFailureChainsFromFlat) 수정
  ✅ FK 할당 로직 보완 (processNo 정규화, m4 매칭 개선)
  ✅ 원본에 없는 연결은 미연결 유지 → 워크시트 경고 표시

★ 금지:
  ❌ FM×FE 크로스프로덕트로 FL 자동 생성 (카테시안)
  ❌ 미연결 FC에 임의 FM/FE 할당
  ❌ placeholder FL 자동 생성
```

> **상세 명세서**: `docs/UUID_FK_SPECIFICATION.md`
