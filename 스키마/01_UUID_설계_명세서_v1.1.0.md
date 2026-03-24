# PFMEA Import 전체 UUID 설계 완전 명세서

> **문서**: PFMEA Import UUID Design Specification (Complete)
> **버전**: v1.1.0 (2026-03-16) — 실제 DB 스키마(fmea_db) 반영 업데이트
> **변경 이력**: v1.0.0 → v1.1.0: failure_links 실제 컬럼 구조 반영, pcId/dcId/weId 추가 마이그레이션 계획 포함
> **시스템**: Smart FMEA OnPremise v5.5+ / 템플릿 v4.0.0
> **표준**: AIAG-VDA FMEA 1st Edition

---

## 0. DB 진단 결과 요약 (2026-03-16 기준)

| 항목 | 상태 | 비고 |
|------|------|------|
| 스키마 | ✅ 정상 | 108개 테이블, id 컬럼 text 타입 |
| FK JOIN 방식 | ✅ UUID 기반 | Map.get(id) 결정론적 — 텍스트 매칭 아님 |
| fmId / feId / fcId | ✅ NOT NULL | failure_links에 존재 |
| pcId / dcId / weId | ❌ 없음 | B5/A6/B1은 텍스트 캐시(fcWorkElem 등)로만 저장 |
| 데이터 | ⚠️ 0건 | Import 미실행 상태 — 리팩토링 전 Import 금지 |
| 운영 환경 고아 | 87건 | 별도 환경(pfm26-m021) — 카테시안 복제가 원인 |

### 핵심 결론

```
현재 아키텍처는 UUID FK 기반으로 올바르게 설계되어 있다.
문제는 두 가지:
  ① pcId/dcId/weId FK 3개 누락 → B5/A6/B1 연결이 텍스트 캐시에 의존
  ② Import 파이프라인의 카테시안 복제 버그 → FM→PC 고아 66건 발생
이 두 가지를 수정하면 고아 0건 달성 가능.
UUID 형식 자체(랜덤 nanoid)도 계층 코드로 교체하면 디버깅·CP연동이 완전해진다.
```

---

## 1. UUID 설계 핵심 원칙

### 1.1 설계 목표

UUID는 Import 파싱 단계에서 각 항목에 **사전 부여**되며, DB 저장 후 FK 연결의 유일한 기준이 된다.
코드 자체에 계층 정보가 내포되어 별도 조회 없이 부모-자식 관계를 결정할 수 있다.

현재 `nanoid` 랜덤 형식 → 제안 계층 코드 형식으로 교체한다.

```
현재: Hk3xQ9mP2...  (불투명, 계층 정보 없음)
제안: PF-L2-040-M-001 (즉시 해석 가능, 계층 내포)
```

### 1.2 코드 구조 5대 원칙

| # | 원칙 | 내용 |
|---|------|------|
| 1 | **문서 유형 최우선** | 첫 세그먼트: PF / CP / PD / DF |
| 2 | **계층 명시** | 두 번째 세그먼트: L1 / L2 / L3 / FC |
| 3 | **부모 포함** | 자식 UUID는 부모 UUID를 prefix로 포함 |
| 4 | **3자리 seq** | 순번 001~999 — 공정번호 200번대 대응 |
| 5 | **코드=식별자** | 행/열 위치는 sheetRow 별도 컬럼으로 분리 |

### 1.3 문서 유형 코드 (DOC)

| 코드 | 문서 | 설명 |
|------|------|------|
| **PF** | PFMEA | 공정 FMEA — 본 명세서 주 대상 |
| **CP** | 관리계획서 | `CP-L2-{PNO}` → `PF-L2-{PNO}` 직접 매핑으로 연동 |
| **PD** | 공정흐름도 | PFD 공정 노드 |
| **DF** | DFMEA | 설계 FMEA — PF와 완전 분리 |

### 1.4 타입 단자 코드 (TYPE) — 1자 고정

| 레벨 | 항목 | 코드 | 이유 |
|------|------|------|------|
| L2 | A3 공정기능 | **F** | Function |
| L2 | A4 제품특성 | **P** | Product characteristic |
| L2 | A5 고장형태 | **M** | failure Mode |
| L2 | A6 검출관리 | **D** | Detection |
| L3 | B1 작업요소 | **(4M코드)** | MC/MN/IM/EN |
| L3 | B2 요소기능 | **G** | Goal — B1 하위 단일 |
| L3 | B3 공정특성 | **C** | process Characteristic |
| L3 | B4 고장원인 | **K** | cause/Kause |
| L3 | B5 예방관리 | **V** | preVention |

---

## 2. L1 완제품 레벨 UUID (C계열)

### 2.1 구조

```
C1:  PF-L1-{DIV}                         예) PF-L1-YP
C2:  PF-L1-{DIV}-{c2seq}                 예) PF-L1-YP-001
C3:  PF-L1-{DIV}-{c2seq}-{c3seq}         예) PF-L1-YP-001-002
C4:  PF-L1-{DIV}-{c2seq}-{c3seq}-{c4seq} 예) PF-L1-YP-001-002-001

DIV: YP | SP | US  (USER → US 단축, 3자 고정)
seq: 001~999 (3자리 zero-padding)
```

### 2.2 FK 관계

```
C2.parent_id = PF-L1-{DIV}
C3.parent_id = PF-L1-{DIV}-{c2seq}
C4.parent_id = PF-L1-{DIV}-{c2seq}-{c3seq}
failure_links.feId → L1FailureEffect(C4).id
```

### 2.3 실제 데이터 예시

| 항목 | UUID | 값 |
|------|------|---|
| C1 | `PF-L1-YP` | YP |
| C2 | `PF-L1-YP-001` | Au Bump 높이가 고객 규격을 만족하는 Wafer를 제공한다 |
| C3 | `PF-L1-YP-001-001` | Au Bump 높이(Bump Height, μm) |
| C4 | `PF-L1-YP-001-001-001` | Bump Height Spec Out으로 인한 제품 특성 이상 |
| C4 | `PF-L1-YP-001-001-002` | 고객 라인 정지, 클레임 |

> **복붙 오류 자동 차단**: C4의 DIV 세그먼트가 C1 DIV와 다르면 Import 단계에서 즉시 E_DIV_MISMATCH 오류

---

## 3. L2 공정 레벨 UUID (A계열)

### 3.1 구조

```
A1/A2: PF-L2-{PNO}           예) PF-L2-040
A3:    PF-L2-{PNO}-F-{seq}   예) PF-L2-040-F-001
A4:    PF-L2-{PNO}-P-{seq}   예) PF-L2-040-P-001
A5:    PF-L2-{PNO}-M-{seq}   예) PF-L2-040-M-001
A6:    PF-L2-{PNO}-D-{seq}   예) PF-L2-040-D-001

PNO: 공정번호 3자리 zero-padding (40 → "040", 100 → "100")
```

### 3.2 A4↔A5 연결 규칙 (고아 66건 원인)

```
❌ 기존 버그: A4 upsert 후 findFirst로 재조회 → 카테시안 복제 시 다른 id 반환
✅ 수정 방법: A4 uuid를 생성 시점에 결정 → A5 저장 시 메모리에서 직접 사용

A5.productCharId = A4.id  (DB 재조회 없이 직접 대입)
A6.failureModeId = A5.id  (동일 원칙)
```

### 3.3 실제 데이터 예시 (공정 040 UBM Sputter)

| 항목 | UUID | 값 |
|------|------|---|
| A1/A2 | `PF-L2-040` | UBM Sputter |
| A3 | `PF-L2-040-F-001` | Ti/Cu UBM 증착으로 Bump 접합층을 형성한다 |
| A4 | `PF-L2-040-P-001` | UBM 두께 (CC) |
| A4 | `PF-L2-040-P-002` | 막질 균일도 |
| A5 | `PF-L2-040-M-001` | UBM 두께 부족 |
| A5 | `PF-L2-040-M-002` | 막질 불균일 |
| A6 | `PF-L2-040-D-001` | SEM 검사, 4-Point Probe, 전수 |

---

## 4. L3 작업요소 레벨 UUID (B계열)

### 4.1 구조

```
B1: PF-L3-{PNO}-{4M}-{b1seq}               예) PF-L3-040-MC-001
B2: PF-L3-{PNO}-{4M}-{b1seq}-G             예) PF-L3-040-MC-001-G
B3: PF-L3-{PNO}-{4M}-{b1seq}-C-{cseq}      예) PF-L3-040-MC-001-C-001
B4: PF-L3-{PNO}-{4M}-{b1seq}-K-{kseq}      예) PF-L3-040-MC-001-K-001
B5: PF-L3-{PNO}-{4M}-{b1seq}-V-{vseq}      예) PF-L3-040-MC-001-V-001
```

### 4.2 4M 코드

| 코드 | 분류 | 예시 |
|------|------|------|
| **MC** | Machine | Sputter 장비, Au Plating 장비 |
| **MN** | Man | Sputter공정 Technician, 검사원 |
| **IM** | Input Material | Ti Target, Au 도금액 |
| **EN** | Environment | 진공 챔버, 온습도 모니터링 장비 |

### 4.3 B2 특별 규칙

- B2는 B1 하위에 **단일 항목**만 존재 → seq 없이 `-G` 접미만 추가
- DB에서 `workElementId @unique` 제약으로 1:1 강제

### 4.4 실제 데이터 예시 (공정040 전체 B계열)

| 항목 | UUID | 값 |
|------|------|---|
| B1-MC | `PF-L3-040-MC-001` | Sputter 장비 |
| B2 | `PF-L3-040-MC-001-G` | Sputter 장비가 Ti/Cu를 증착하여 UBM층을 형성한다 |
| B3 | `PF-L3-040-MC-001-C-001` | DC Power (CC) |
| B4 | `PF-L3-040-MC-001-K-001` | Power 변동 |
| B5 | `PF-L3-040-MC-001-V-001` | Sputter 장비 PM, Power 실시간 모니터링 |
| B1-MN | `PF-L3-040-MN-001` | Sputter공정 Technician |
| B4 | `PF-L3-040-MN-001-K-001` | 작업표준 미숙지에 의한 작업 절차 이탈 |
| B1-IM | `PF-L3-040-IM-001` | Ti Target |
| B4 | `PF-L3-040-IM-001-K-001` | Target 소진 |
| B1-EN | `PF-L3-040-EN-001` | 진공 챔버 |
| B4 | `PF-L3-040-EN-001-K-001` | 진공 누설 |

---

## 5. FC 고장사슬 UUID (failure_links)

### 5.1 현재 실제 컬럼 구조와 UUID 매핑

```
failure_links 실제 컬럼 (fmea_db 기준):

[UUID FK — NOT NULL]          [UUID FK 추가 필요]
fmId  → FailureMode.id        pcId → L3PreventCtrl.id  ← 추가 필요
feId  → L1FailureEffect.id    dcId → L2DetectionCtrl.id ← 추가 필요
fcId  → FailureCause.id       weId → L3WorkElement.id   ← 추가 필요

[텍스트 캐시 — NULLABLE]
fmText, fmProcess              (A5 캐시)
feText, feScope                (C4 캐시)
fcText, fcWorkElem, fcM4      (B4/B1 캐시)

[렌더링 보조]
fmPath, fePath, fcPath         (계층 경로 캐시)
fmSeq, feSeq, fcSeq           (순번 캐시)
rowSpan, colSpan, mergeGroupId (병합 정보 — UUID 도입 후 불필요)
parentId                       (계층 — UUID prefix 파싱으로 대체)
```

### 5.2 FC 행 UUID 구조

```
형식: PF-FC-{PNO}-M{mseq}-{4M}{b1seq}-K{kseq}

예시: PF-FC-040-M001-MC001-K001
      → 공정040, FM 1번, MC 첫 번째 작업요소, 원인 1번 조합
```

### 5.3 5개(+3개 추가) FK 완전 명세

| FK 컬럼 | 참조 | 현재 상태 | 비고 |
|---------|------|---------|------|
| `fmId` | FailureMode.id (A5) | ✅ NOT NULL 존재 | |
| `feId` | L1FailureEffect.id (C4) | ✅ NOT NULL 존재 | |
| `fcId` | FailureCause.id (B4) | ✅ NOT NULL 존재 | |
| `weId` | L3WorkElement.id (B1) | ❌ 없음 → 추가 필요 | fcWorkElem 캐시로 대체 중 |
| `pcId` | L3PreventCtrl.id (B5) | ❌ 없음 → 추가 필요 | 텍스트 캐시 없음 |
| `dcId` | L2DetectionCtrl.id (A6) | ❌ 없음 → 추가 필요 | 텍스트 캐시 없음 |

### 5.4 실제 FC 행 예시

| 컬럼 | 값 |
|------|---|
| **id** | `PF-FC-040-M001-MC001-K001` |
| **fmId** | `PF-L2-040-M-001` |
| **feId** | `PF-L1-YP-001-001-001` |
| **fcId** | `PF-L3-040-MC-001-K-001` |
| **weId** | `PF-L3-040-MC-001` ← 추가 후 |
| **pcId** | `PF-L3-040-MC-001-V-001` ← 추가 후 |
| **dcId** | `PF-L2-040-D-001` ← 추가 후 |
| fmText | UBM 두께 부족 (캐시) |
| fcWorkElem | Sputter 장비 (캐시) |
| fcM4 | MC (캐시) |
| severity | 8 |
| sodO | 4 |
| sodD | 3 |

---

## 6. 4개 통합시트 파싱 → UUID 부여 절차

### 6.1 L1 통합시트

```
1. C1열 DIV 결정 (YP/SP/USER→US)
2. C2 고유값 변경 시 c2Seq++, DIV 변경 시 c2Seq 초기화
3. C3 고유값 변경 시 c3Seq++, c2Seq 변경 시 초기화
4. C4 고유값 변경 시 c4Seq++, c3Seq 변경 시 초기화
5. 각 행에 UUID 부여 → upsert
```

### 6.2 L2 통합시트

```
1. 공정번호 3자리 zero-pad → PNO
2. PNO 내 A3 고유값 순서 → F-seq
3. PNO 내 A4 고유값 순서 → P-seq
4. A4 upsert → a4Id 메모리 보관
5. A5: productCharId = a4Id (메모리 직접 사용, DB 재조회 금지)
6. A6: failureModeId = a5Id (동일 원칙)
```

### 6.3 L3 통합시트

```
1. 공정번호+4M 그룹화
2. B1 고유값 순서 → b1Seq
3. B2: B1 UUID + "-G"
4. B3/B4/B5: B1 UUID 하위 cSeq/kSeq/vSeq
```

### 6.4 FC 시트 — 6개 UUID 매핑

```
1. FM값  → l2Map 조회 → fmId  (실패: E_FC_FM_NOT_FOUND)
2. WE값  → b1Map 조회 → weId  (실패: orphan 리포트)
3. FC값  → l3Map 조회 → fcId  (실패: E_FC_CAUSE_NOT_FOUND)
4. FE값  → l1Map 조회 → feId  (실패: E_FC_FE_NOT_FOUND)
5. PC값  → b5Map 조회 → pcId  (실패: E_FC_PC_NOT_FOUND)
6. DC값  → a6Map 조회 → dcId  (실패: E_FC_DC_NOT_FOUND)
7. 6개 UUID → genFC() → FailureLink.id 생성
```

### 6.5 기능계층 vs 영향계층

| 구분 | UUID 계열 |
|------|----------|
| **1L 기능** (C2 제품기능) | `PF-L1-{DIV}-{c2}` |
| **2L 기능** (A3 공정기능) | `PF-L2-{PNO}-F-{seq}` |
| **3L 기능** (B2 요소기능) | `PF-L3-{PNO}-{4M}-{seq}-G` |
| **1L 영향** (C4 고장영향) | `PF-L1-{DIV}-{c2}-{c3}-{c4}` |
| **2L 형태** (A5 고장형태) | `PF-L2-{PNO}-M-{seq}` |
| **3L 원인** (B4 고장원인) | `PF-L3-{PNO}-{4M}-{seq}-K-{kseq}` |

---

## 7. UUID 생성 함수 (TypeScript)

```typescript
// /lib/uuid-generator.ts

const pad = (n: number, size = 3) => String(n).padStart(size, '0');

// L1
export const genC1 = (doc: string, div: string) =>
  `${doc}-L1-${div === 'USER' ? 'US' : div}`;
export const genC2 = (doc: string, div: string, c2: number) =>
  `${genC1(doc, div)}-${pad(c2)}`;
export const genC3 = (doc: string, div: string, c2: number, c3: number) =>
  `${genC2(doc, div, c2)}-${pad(c3)}`;
export const genC4 = (doc: string, div: string, c2: number, c3: number, c4: number) =>
  `${genC3(doc, div, c2, c3)}-${pad(c4)}`;

// L2
export const genA1 = (doc: string, pno: number) =>
  `${doc}-L2-${pad(pno)}`;
export const genA3 = (doc: string, pno: number, seq: number) =>
  `${genA1(doc, pno)}-F-${pad(seq)}`;
export const genA4 = (doc: string, pno: number, seq: number) =>
  `${genA1(doc, pno)}-P-${pad(seq)}`;
export const genA5 = (doc: string, pno: number, seq: number) =>
  `${genA1(doc, pno)}-M-${pad(seq)}`;
export const genA6 = (doc: string, pno: number, seq: number) =>
  `${genA1(doc, pno)}-D-${pad(seq)}`;

// L3
export const genB1 = (doc: string, pno: number, m4: string, b1seq: number) =>
  `${doc}-L3-${pad(pno)}-${m4}-${pad(b1seq)}`;
export const genB2 = (doc: string, pno: number, m4: string, b1seq: number) =>
  `${genB1(doc, pno, m4, b1seq)}-G`;
export const genB3 = (doc: string, pno: number, m4: string, b1seq: number, cseq: number) =>
  `${genB1(doc, pno, m4, b1seq)}-C-${pad(cseq)}`;
export const genB4 = (doc: string, pno: number, m4: string, b1seq: number, kseq: number) =>
  `${genB1(doc, pno, m4, b1seq)}-K-${pad(kseq)}`;
export const genB5 = (doc: string, pno: number, m4: string, b1seq: number, vseq: number) =>
  `${genB1(doc, pno, m4, b1seq)}-V-${pad(vseq)}`;

// FC
export const genFC = (
  doc: string, pno: number,
  mseq: number, m4: string, b1seq: number, kseq: number
) => `${doc}-FC-${pad(pno)}-M${pad(mseq)}-${m4}${pad(b1seq)}-K${pad(kseq)}`;

// 부모 UUID 추출 (코드 파싱)
export const getParentId = (id: string): string | null => {
  const segs = id.split('-');
  return segs.length <= 3 ? null : segs.slice(0, -1).join('-');
};
```

---

## 8. 전체 UUID 빠른 참조표

| 항목 | UUID 패턴 | parent_id |
|------|----------|----------|
| **C1** | `PF-L1-YP` | — |
| **C2** | `PF-L1-YP-001` | `PF-L1-YP` |
| **C3** | `PF-L1-YP-001-001` | `PF-L1-YP-001` |
| **C4** | `PF-L1-YP-001-001-001` | `PF-L1-YP-001-001` |
| **A1/A2** | `PF-L2-040` | — |
| **A3** | `PF-L2-040-F-001` | `PF-L2-040` |
| **A4** | `PF-L2-040-P-001` | `PF-L2-040` |
| **A5** | `PF-L2-040-M-001` | `PF-L2-040-P-001` (연결 A4) |
| **A6** | `PF-L2-040-D-001` | `PF-L2-040-M-001` (연결 A5) |
| **B1** | `PF-L3-040-MC-001` | `PF-L2-040` |
| **B2** | `PF-L3-040-MC-001-G` | `PF-L3-040-MC-001` |
| **B3** | `PF-L3-040-MC-001-C-001` | `PF-L3-040-MC-001` |
| **B4** | `PF-L3-040-MC-001-K-001` | `PF-L3-040-MC-001` |
| **B5** | `PF-L3-040-MC-001-V-001` | `PF-L3-040-MC-001` |
| **FC행** | `PF-FC-040-M001-MC001-K001` | (링크 레코드) |

> `{DIV}`: YP / SP / US | `{PNO}`: 001~200 | `{seq}`: 001~999
> DOC: PF(PFMEA) / CP(Control Plan) / PD(PFD) / DF(DFMEA)

---

*Smart FMEA OnPremise v5.5+ — UUID Design Specification v1.1.0*
*DB 진단 결과(fmea_db, 2026-03-16) 반영*
