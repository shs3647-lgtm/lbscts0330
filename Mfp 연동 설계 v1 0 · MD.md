# PFMEA · CP · PFD — Master / Family / Part 완전 설계 플랜

> **버전**: v1.0 | 2026-03-13  
> **목적**: ID 생성 규칙 · 계층 구조 · 동기화 · DB 최적화 종합 설계  
> **현재 플랜의 치명적 오류 5건을 전면 재설계**

---

## ❌ 현재 플랜의 5가지 치명적 오류

| # | 오류 내용 | 영향 |
|---|---------|------|
| E1 | Master/Family FMEA에 Master CP·PFD 없음 | 요구사항 누락 — 구조 자체가 틀림 |
| E2 | CP·PFD를 P타입(Part)만 허용 | cp26-m001, cp26-f001 생성 불가 |
| E3 | Family 생성 시 하위 CP·PFD 즉시 N개 생성 | DB 폭발 → 앱 먹통 |
| E4 | Master PFMEA ↔ Master CP ↔ Master PFD 동기화 규칙 없음 | 3개 문서 데이터 불일치 |
| E5 | 등록화면이 PFMEA 중심 — CP·PFD 독립 등록화면 없음 | 운영 불가 |

---

## 1. 전체 개념 구조

### 1.1 문서 유형 매트릭스 (9가지 조합)

```
           PFMEA         CP            PFD
Master     pfm26-m###    cp26-m###     pfd26-m###
Family     pfm26-f###    cp26-f###     pfd26-f###
Part       pfm26-p###    cp26-p###     pfd26-p###
```

**총 9가지 독립 문서 유형** — 모두 각자의 등록화면 + ID를 가짐.

### 1.2 Triplet (세트) 개념

3개 문서 유형(PFMEA·CP·PFD)이 **같은 레벨에서 동일 정보를 공유**하는 단위를 **Triplet**이라 한다.

```
Master Triplet:   pfm26-m001 + cp26-m001 + pfd26-m001
Family Triplet:   pfm26-f001 + cp26-f001 + pfd26-f001
Part Triplet:     pfm26-p001 + cp26-p001 + pfd26-p001
```

- Triplet 내 3개 문서는 `tripletId`(= Master/Family FMEA의 ID)로 묶임
- "동일한 정보를 가져야 한다" = **핵심 필드(공정명·제품명·개정번호 등)가 triplet 내 동기화 대상**

### 1.3 계층 구조

```
Master Triplet (pfm26-m001 + cp26-m001 + pfd26-m001)
│
│  [전사 표준 공정 정보 — 공정명/제품군/관리 기준]
│
├── Family Triplet A (pfm26-f001 + cp26-f001 + pfd26-f001)
│   │  parentId = pfm26-m001
│   │  [제품군 특화 정보 — 파생 공정 표준]
│   │
│   ├── Part Triplet A-1 (pfm26-p001 + cp26-p001 + pfd26-p001)
│   │   parentId = pfm26-f001
│   │   [실제 부품/Lot 문서 — 양산 관리 대상]
│   │
│   └── Part Triplet A-2 (pfm26-p002 + cp26-p002 + pfd26-p002)
│       parentId = pfm26-f001
│
└── Family Triplet B (pfm26-f002 + cp26-f002 + pfd26-f002)
    │  parentId = pfm26-m001
    │
    └── Part Triplet B-1 (pfm26-p003 + cp26-p003 + pfd26-p003)
        parentId = pfm26-f002
```

> **핵심**: Part Triplet이 **실제 운영 문서**. Master/Family는 템플릿·표준이므로
> 실제 CP/PFD 서식(체크포인트·공정흐름)은 Part 레벨에서만 완성된다.

---

## 2. ID 설계

### 2.1 ID 포맷

```
{prefix}{year}-{typeCode}{serial}[-{linkGroup}]

prefix    : pfm | cp | pfd
year      : 2자리 (26)
typeCode  : m | f | p
serial    : 3자리 (001~999)
linkGroup : 선택. Triplet 묶음 식별자. i{GG} 형식
```

**예시**

| 문서 | ID | 설명 |
|------|-----|------|
| Master PFMEA | `pfm26-m001` | 전사 표준 PFMEA |
| Master CP | `cp26-m001` | 전사 표준 CP |
| Master PFD | `pfd26-m001` | 전사 표준 PFD |
| Family PFMEA | `pfm26-f001` | 제품군 PFMEA |
| Family CP | `cp26-f001` | 제품군 CP |
| Family PFD | `pfd26-f001` | 제품군 PFD |
| Part PFMEA | `pfm26-p001-i01` | 부품 PFMEA (Triplet 1) |
| Part CP | `cp26-p001-i01` | 부품 CP (Triplet 1) |
| Part PFD | `pfd26-p001-i01` | 부품 PFD (Triplet 1) |

> **M/F에는 linkGroup 없음** — 자기 자신이 Triplet의 앵커 역할.  
> **P에는 linkGroup 있음** — 같은 세트를 i{GG}로 식별.

### 2.2 시리얼 계산 규칙

#### M 타입 시리얼

```
각 prefix별 독립 계산 (서로 간섭 없음)
pfm m타입 MAX + 1  →  pfm26-m{NNN}
cp  m타입 MAX + 1  →  cp26-m{NNN}
pfd m타입 MAX + 1  →  pfd26-m{NNN}
```

#### F 타입 시리얼 (M과 동일 방식)

```
각 prefix별 독립 계산
pfm f타입 MAX + 1  →  pfm26-f{NNN}
cp  f타입 MAX + 1  →  cp26-f{NNN}
pfd f타입 MAX + 1  →  pfd26-f{NNN}
```

#### P 타입 시리얼 (**통합 계산** — DB 먹통 핵심 방어선)

```
★★★ P 타입은 pfm/cp/pfd 3개 prefix의 p타입 시리얼을 통합 계산한다

SELECT MAX(serial) FROM (
  SELECT serial FROM pfmea_projects WHERE typeCode='p' AND year='26'
  UNION ALL
  SELECT serial FROM cp_projects    WHERE typeCode='p' AND year='26'
  UNION ALL
  SELECT serial FROM pfd_projects   WHERE typeCode='p' AND year='26'
) AS all_p_serials

→ 통합 MAX + 1부터 새 Triplet serial 부여
→ Triplet 내 3개 문서는 동일 serial 사용
```

#### linkGroup 계산

```
SELECT MAX(linkGroup) FROM triplet_linkages WHERE year='26'
→ MAX + 1부터 부여
→ Triplet 생성 시마다 단조 증가 (prefix/typeCode 무관)
```

### 2.3 시리얼 중복 방지 — DB Lock 전략

```sql
-- Part Triplet 생성 트랜잭션 (의사코드)
BEGIN TRANSACTION;
  SELECT GET_LOCK('p_serial_lock_26', 5);   -- 5초 타임아웃
  
  SET @next_serial = (
    SELECT MAX(serial)+1 FROM (
      SELECT serial FROM pfmea_projects WHERE typeCode='p' AND year='26'
      UNION ALL SELECT serial FROM cp_projects WHERE typeCode='p' AND year='26'
      UNION ALL SELECT serial FROM pfd_projects WHERE typeCode='p' AND year='26'
    ) t
  );
  
  SET @next_group = (SELECT COALESCE(MAX(link_group),0)+1 FROM triplet_linkages WHERE year='26');
  
  INSERT INTO pfmea_projects ...  (serial=@next_serial, linkGroup=@next_group)
  INSERT INTO cp_projects ...     (serial=@next_serial, linkGroup=@next_group)
  INSERT INTO pfd_projects ...    (serial=@next_serial, linkGroup=@next_group)
  INSERT INTO triplet_linkages ...
  
  DO RELEASE_LOCK('p_serial_lock_26');
COMMIT;
```

---

## 3. DB 스키마

### 3.1 TripletGroup 테이블 (핵심 신규)

```sql
CREATE TABLE triplet_groups (
  id            VARCHAR(30) PRIMARY KEY,   -- tg26-m001, tg26-f001, tg26-p001
  year          CHAR(2)     NOT NULL,
  type_code     CHAR(1)     NOT NULL,      -- m | f | p
  link_group    SMALLINT,                  -- p타입만 사용
  
  pfmea_id      VARCHAR(20) NOT NULL,      -- pfm26-m001
  cp_id         VARCHAR(20),               -- cp26-m001 (null 가능 — 미생성)
  pfd_id        VARCHAR(20),               -- pfd26-m001 (null 가능 — 미생성)
  
  parent_triplet_id VARCHAR(30),           -- 상위 TripletGroup ID (계층)
  
  subject       VARCHAR(200),             -- 공통 문서명 (동기화 기준)
  product_name  VARCHAR(200),             -- 공통 제품명
  revision      VARCHAR(20),              -- 공통 개정번호
  
  sync_status   ENUM('synced','pending','conflict') DEFAULT 'synced',
  
  created_at    DATETIME DEFAULT NOW(),
  updated_at    DATETIME DEFAULT NOW() ON UPDATE NOW(),
  
  INDEX idx_type_year (type_code, year),
  INDEX idx_parent    (parent_triplet_id),
  INDEX idx_pfmea     (pfmea_id),
  INDEX idx_cp        (cp_id),
  INDEX idx_pfd       (pfd_id)
);
```

> **설계 의도**:
> - Triplet을 1개 레코드로 관리 → JOIN 없이 세트 조회
> - `cp_id`, `pfd_id`가 null → **지연 생성(Lazy Creation)** 가능 (DB 먹통 방어)
> - `sync_status`로 3개 문서 동기화 상태 추적

### 3.2 기존 테이블 최소 변경

```sql
-- 기존 fmea_projects에 컬럼 추가만
ALTER TABLE fmea_projects ADD COLUMN triplet_group_id VARCHAR(30);
ALTER TABLE cp_projects   ADD COLUMN triplet_group_id VARCHAR(30);
ALTER TABLE pfd_projects  ADD COLUMN triplet_group_id VARCHAR(30);

-- 인덱스
CREATE INDEX idx_fmea_triplet ON fmea_projects(triplet_group_id);
CREATE INDEX idx_cp_triplet   ON cp_projects(triplet_group_id);
CREATE INDEX idx_pfd_triplet  ON pfd_projects(triplet_group_id);
```

---

## 4. ★ DB 과부하 방지 — Lazy Creation 패턴

### 4.1 문제 재현

**기존 방식 (DB 먹통 원인)**
```
Family FMEA 생성 (1건)
→ 즉시 Part PFMEA 10개 + Part CP 10개 + Part PFD 10개 생성
= 31건 INSERT + 10건 Linkage INSERT = 41건 동시 INSERT
→ 연속 여러 번 → 트랜잭션 큐 폭발
```

**새로운 방식 — Lazy Creation**

```
Family FMEA 생성 (1건)
→ Family Triplet Group 생성 (1건)       ← 여기서 끝
→ cp_id = null, pfd_id = null

Part 생성 요청 시점에:
→ Part Triplet Group 생성 (1건)
→ Part PFMEA 생성 (1건)
→ cp_id, pfd_id는 null (미생성)

사용자가 CP 탭 처음 클릭 시:
→ Part CP 생성 (1건, on-demand)
→ triplet_groups.cp_id 업데이트

사용자가 PFD 탭 처음 클릭 시:
→ Part PFD 생성 (1건, on-demand)
→ triplet_groups.pfd_id 업데이트
```

### 4.2 Lazy Creation 흐름도

```
[사용자: Family FMEA 생성]
        ↓
INSERT triplet_groups (type=f, pfmea_id=pfm26-f001, cp_id=null, pfd_id=null)
INSERT fmea_projects  (id=pfm26-f001, triplet_group_id=tg26-f001)
        ↓ 완료 (2건 INSERT만)

[사용자: Part 추가 클릭]
        ↓
INSERT triplet_groups (type=p, pfmea_id=pfm26-p001-i01, cp_id=null, pfd_id=null)
INSERT fmea_projects  (id=pfm26-p001-i01, triplet_group_id=tg26-p001)
        ↓ 완료 (2건 INSERT만)

[사용자: Part CP 탭 클릭]
        ↓
GET triplet_groups WHERE id=tg26-p001 → cp_id IS NULL?
        ↓ YES
INSERT cp_projects (id=cp26-p001-i01, triplet_group_id=tg26-p001)
UPDATE triplet_groups SET cp_id='cp26-p001-i01' WHERE id=tg26-p001
        ↓ 완료 (1건 INSERT + 1건 UPDATE)

[사용자: Part PFD 탭 클릭]
        ↓ 동일 패턴
```

### 4.3 벌크 생성이 필요한 경우 — 배치 분산

Part를 여러 개 한번에 생성하는 경우 (예: 10개 일괄 생성):

```typescript
// ❌ 금지: 한 트랜잭션에 30건 INSERT
await db.transaction(async (tx) => {
  for (let i = 0; i < 10; i++) {
    await tx.insert(pfmea)...
    await tx.insert(cp)...      // 즉시 생성 — 먹통
    await tx.insert(pfd)...
  }
})

// ✅ 권장: 트랜잭션 분리 + PFMEA만 즉시 생성
// Step 1: Triplet Group + PFMEA만 생성 (트랜잭션 1개)
for (let i = 0; i < 10; i++) {
  await createPartTripletShell(parentId)  // 2건 INSERT만
}
// CP/PFD는 사용자 접근 시점에 Lazy 생성
```

---

## 5. 동기화 규칙 (Triplet Sync)

### 5.1 동기화 대상 필드

Triplet 내 3개 문서(PFMEA·CP·PFD)가 **항상 동일하게 유지해야 하는 필드**:

| 필드 | 설명 | 동기화 방향 |
|------|------|-----------|
| `subject` | 문서명 (공정명) | triplet_groups → 3개 문서 |
| `product_name` | 제품명 | triplet_groups → 3개 문서 |
| `revision` | 개정 번호 | triplet_groups → 3개 문서 |
| `process_number` | 공정 번호 | triplet_groups → 3개 문서 |
| `part_number` | 부품 번호 | triplet_groups → 3개 문서 |
| `customer` | 고객사 | triplet_groups → 3개 문서 |
| `approved_by` | 승인자 | triplet_groups → 3개 문서 |

**개별 문서만의 필드** (동기화 대상 아님):

| 문서 | 독자 필드 |
|------|---------|
| PFMEA | failure chains, SOD, AP, 고장사슬 상세 |
| CP | 관리 특성, 측정 방법, 관리 방법, 이상반응 |
| PFD | 공정 흐름도, 기호, 공정 단계 순서 |

### 5.2 동기화 트리거

```
[Rule 1] triplet_groups 헤더 필드 수정
  → PATCH /api/triplet/{tripletGroupId}/header
  → subject/product_name/revision 등 업데이트
  → 연결된 pfmea_id/cp_id/pfd_id 모두 동시 업데이트
  → sync_status = 'synced'

[Rule 2] 개별 문서에서 헤더 필드 직접 수정 시
  → PATCH /api/fmea/{id}/header (또는 cp/pfd)
  → triplet_group_id 조회
  → triplet_groups 업데이트
  → 나머지 연결 문서 업데이트
  → sync_status = 'synced'

[Rule 3] CP/PFD가 아직 Lazy 미생성 상태
  → triplet_groups의 subject/product_name/revision에만 저장
  → 나중에 CP/PFD 생성 시 triplet_groups 값을 읽어 초기화
```

### 5.3 충돌 방지

```
동시 수정 방지 (Optimistic Locking):
  - triplet_groups에 version INT 컬럼 추가
  - 수정 시 WHERE id=? AND version=? 조건
  - 불일치 시 409 Conflict → 프론트에서 재시도 유도

sync_status = 'conflict' 발생 조건:
  - 개별 문서 직접 수정 중 네트워크 오류로 triplet 업데이트 실패
  - → 배경 작업(background job)으로 5분마다 conflict 상태 재동기화
```

---

## 6. 생성 시나리오별 상세 흐름

### 6.1 Master Triplet 생성

**사용자 입력**: 문서 유형=Master, 문서명="Au Bump 공정 표준"

```
Step 1. 시리얼 계산 (각 prefix 독립)
  pfm m타입 MAX = 0  → pfm26-m001
  cp  m타입 MAX = 0  → cp26-m001
  pfd m타입 MAX = 0  → pfd26-m001
  triplet group id   → tg26-m001

Step 2. DB INSERT (3건 + 1건 = 4건)
  INSERT triplet_groups {
    id: 'tg26-m001',
    type_code: 'm',
    pfmea_id: 'pfm26-m001',
    cp_id: 'cp26-m001',       ← Master는 즉시 3개 모두 생성
    pfd_id: 'pfd26-m001',
    subject: 'Au Bump 공정 표준',
    sync_status: 'synced'
  }
  INSERT fmea_projects { id: 'pfm26-m001', triplet_group_id: 'tg26-m001' }
  INSERT cp_projects   { id: 'cp26-m001',  triplet_group_id: 'tg26-m001' }
  INSERT pfd_projects  { id: 'pfd26-m001', triplet_group_id: 'tg26-m001' }

Step 3. 응답
  {
    tripletGroupId: 'tg26-m001',
    pfmeaId: 'pfm26-m001',
    cpId:    'cp26-m001',
    pfdId:   'pfd26-m001'
  }
```

> **Master는 4건 즉시 생성**: 전사 표준이므로 3개 문서가 처음부터 존재해야 함.

### 6.2 Family Triplet 생성

**사용자 입력**: 문서 유형=Family, 상위 Master=tg26-m001, 문서명="Au Bump 12인치"

```
Step 1. 시리얼 계산
  pfm f타입 MAX = 0  → pfm26-f001
  cp  f타입 MAX = 0  → cp26-f001
  pfd f타입 MAX = 0  → pfd26-f001
  triplet group id   → tg26-f001

Step 2. DB INSERT (2건만 — Lazy CP/PFD)
  INSERT triplet_groups {
    id: 'tg26-f001',
    type_code: 'f',
    pfmea_id: 'pfm26-f001',
    cp_id:  null,     ← 미생성 (Lazy)
    pfd_id: null,     ← 미생성 (Lazy)
    parent_triplet_id: 'tg26-m001',
    subject: 'Au Bump 12인치',
    sync_status: 'synced'
  }
  INSERT fmea_projects { id: 'pfm26-f001', triplet_group_id: 'tg26-f001' }

  ← cp/pfd는 미생성. 탭 접근 시 on-demand 생성.

Step 3. 사용자가 Family CP 탭 클릭 시
  → cp_id IS NULL 확인
  → INSERT cp_projects { id: 'cp26-f001', triplet_group_id: 'tg26-f001' }
  → UPDATE triplet_groups SET cp_id='cp26-f001' WHERE id='tg26-f001'
```

### 6.3 Part Triplet 생성

**사용자 입력**: 상위 Family=tg26-f001, Part 추가

```
Step 1. P타입 통합 시리얼 계산
  pfm p타입 MAX = 0
  cp  p타입 MAX = 0
  pfd p타입 MAX = 0
  → 통합 MAX = 0 → serial = 001

  linkGroup MAX = 0 → linkGroup = 01

Step 2. DB INSERT (2건만 — Lazy CP/PFD)
  INSERT triplet_groups {
    id: 'tg26-p001',
    type_code: 'p',
    link_group: 1,
    pfmea_id: 'pfm26-p001-i01',
    cp_id:  null,
    pfd_id: null,
    parent_triplet_id: 'tg26-f001',
    subject: 'Au Bump 12인치 #1'
  }
  INSERT fmea_projects { id: 'pfm26-p001-i01', triplet_group_id: 'tg26-p001' }

Step 3. 사용자가 Part CP 탭 클릭
  → INSERT cp_projects { id: 'cp26-p001-i01', triplet_group_id: 'tg26-p001' }
  → UPDATE triplet_groups SET cp_id='cp26-p001-i01'

Step 4. 사용자가 Part PFD 탭 클릭
  → INSERT pfd_projects { id: 'pfd26-p001-i01', triplet_group_id: 'tg26-p001' }
  → UPDATE triplet_groups SET pfd_id='pfd26-p001-i01'
```

### 6.4 Master → 하위 Part N개 일괄 생성

**사용자 입력**: Master Triplet에서 "Part 추가" × 3개

```
★ 반드시 순차 생성 (동시 병렬 금지 — 시리얼 충돌 원인)

for i in 1..3:
  await createPartTripletShell(parentTripletId='tg26-m001', idx=i)
  // 각 호출 = 2건 INSERT만 (triplet_groups + fmea_projects)
  // CP/PFD는 Lazy

결과:
  tg26-p002 { pfmea_id:'pfm26-p002-i02', cp_id:null, pfd_id:null }
  tg26-p003 { pfmea_id:'pfm26-p003-i03', cp_id:null, pfd_id:null }
  tg26-p004 { pfmea_id:'pfm26-p004-i04', cp_id:null, pfd_id:null }

총 DB 작업: 6건 INSERT (3 triplet_groups + 3 fmea_projects)
기존 방식: 30건 INSERT → 6건으로 80% 감소
```

---

## 7. API 설계

### 7.1 Triplet 생성 API

```
POST /api/triplet/create

Body:
{
  "docType": "master" | "family" | "part",
  "subject": "공정명",
  "parentTripletId": "tg26-m001",   // family/part 시 필수
  "partCount": 3                     // master/family 생성 시 하위 part 즉시 생성 수 (선택)
}

Response:
{
  "tripletGroupId": "tg26-m001",
  "pfmeaId": "pfm26-m001",
  "cpId": "cp26-m001",    // Master는 즉시, Family/Part는 null
  "pfdId": "pfd26-m001",  // Master는 즉시, Family/Part는 null
  "childTriplets": [...]   // partCount > 0 시 포함
}
```

### 7.2 Lazy 문서 생성 API

```
POST /api/triplet/{tripletGroupId}/materialize

Body:
{
  "docKind": "cp" | "pfd"  // 생성할 문서 종류
}

Response:
{
  "id": "cp26-f001",
  "tripletGroupId": "tg26-f001"
}
```

### 7.3 헤더 동기화 API

```
PATCH /api/triplet/{tripletGroupId}/header

Body:
{
  "subject": "수정된 공정명",
  "product_name": "수정된 제품명",
  "revision": "B"
}

→ triplet_groups 업데이트
→ 연결된 pfmea/cp/pfd 모두 동시 업데이트
→ sync_status = 'synced'
```

### 7.4 Triplet 조회 API

```
GET /api/triplet/{tripletGroupId}

Response:
{
  "id": "tg26-f001",
  "typeCode": "f",
  "subject": "Au Bump 12인치",
  "pfmea": { "id": "pfm26-f001", "status": "active" },
  "cp":    { "id": "cp26-f001",  "status": "materialized" },  // 생성됨
  "pfd":   { "id": null,         "status": "pending" },        // 미생성
  "parent": { "id": "tg26-m001", "subject": "Au Bump 공정 표준" },
  "children": [
    { "id": "tg26-p001", "subject": "Au Bump 12인치 #1" }
  ]
}
```

---

## 8. 등록 화면 (UI) 설계

### 8.1 3개 등록화면 공통 구조

PFMEA 등록화면 · CP 등록화면 · PFD 등록화면은 **완전히 동일한 레이아웃**을 사용한다.

```
┌─────────────────────────────────────────────────────┐
│  새 문서 만들기                                      │
├─────────────────────────────────────────────────────┤
│  문서 종류:  [PFMEA ▼]  ← pfmea/cp/pfd 선택        │
│  문서 유형:  [● Master]  [○ Family]  [○ Part]       │
├─────────────────────────────────────────────────────┤
│  공통 정보 (Triplet 헤더)                           │
│  문서명:    [Au Bump 12인치 공정                   ] │
│  제품명:    [Au Bump Wafer                        ] │
│  공정번호:  [AB-01                                ] │
│  고객사:    [                                     ] │
├─────────────────────────────────────────────────────┤
│  ── Master 선택 시 ──────────────────────────────── │
│  상위 없음 (전사 최상위)                            │
│  연동 생성:  ☑ Master CP  ☑ Master PFD             │
│             (체크 해제 = 나중에 별도 생성 가능)      │
│                                                     │
│  ── Family 선택 시 ──────────────────────────────── │
│  상위 Master:  [pfm26-m001 Au Bump 공정 표준  ▼]   │
│  연동 생성:    □ Family CP  □ Family PFD            │
│               (기본 미체크 — Lazy 생성 권장)         │
│                                                     │
│  ── Part 선택 시 ────────────────────────────────── │
│  상위:  [tg26-f001 Au Bump 12인치  ▼]              │
│  연동 생성:  □ Part CP  □ Part PFD                  │
│             (기본 미체크 — Lazy 생성 권장)           │
│                                                     │
├─────────────────────────────────────────────────────┤
│           [생성]  [취소]                             │
└─────────────────────────────────────────────────────┘
```

### 8.2 Triplet 상태 표시 (문서 목록 화면)

```
[Au Bump 12인치 공정]  tg26-f001
 ├── PFMEA  pfm26-f001  ● 작성중
 ├── CP     cp26-f001   ● 작성중
 └── PFD    (미생성)    ○ [생성] ← 클릭 시 Lazy 생성

[Au Bump 12인치 #1]   tg26-p001
 ├── PFMEA  pfm26-p001-i01  ✓ 확정
 ├── CP     (미생성)        ○ [생성]
 └── PFD    (미생성)        ○ [생성]
```

---

## 9. 전체 ID 예시 — AU Bump 실제 운영 시나리오

```
tg26-m001 [Master] Au Bump 공정 표준
  pfm26-m001  Master PFMEA
  cp26-m001   Master CP
  pfd26-m001  Master PFD

  tg26-f001 [Family] Au Bump 8인치
    pfm26-f001  Family PFMEA
    cp26-f001   Family CP  (Lazy: 접근 시 생성)
    pfd26-f001  null        (Lazy: 접근 시 생성)

    tg26-p001 [Part] Au Bump 8인치 Lot-A
      pfm26-p001-i01
      cp26-p001-i01   (Lazy)
      pfd26-p001-i01  (Lazy)

    tg26-p002 [Part] Au Bump 8인치 Lot-B
      pfm26-p002-i02
      cp26-p002-i02   (Lazy)
      pfd26-p002-i02  (Lazy)

  tg26-f002 [Family] Au Bump 12인치
    pfm26-f002  Family PFMEA
    cp26-f002   null  (Lazy)
    pfd26-f002  null  (Lazy)

    tg26-p003 [Part] Au Bump 12인치 Rev.A
      pfm26-p003-i03
      cp26-p003-i03   (Lazy)
      pfd26-p003-i03  (Lazy)
```

---

## 10. 현재 플랜 → 신규 플랜 변경 대조표

| 항목 | 현재 플랜 (오류) | 신규 플랜 |
|------|--------------|---------|
| Master CP·PFD | 없음 | **있음** — cp26-m{NNN}, pfd26-m{NNN} |
| Family CP·PFD | 없음 | **있음** — cp26-f{NNN}, pfd26-f{NNN} (Lazy) |
| CP/PFD 타입코드 | p만 허용 | **m/f/p 모두 허용** |
| 동기화 단위 | 없음 | **TripletGroup** 1레코드 = 3개 문서 헤더 공유 |
| 생성 방식 | 즉시 전체 생성 | **Lazy Creation** — PFMEA만 즉시, CP/PFD는 접근 시 |
| 시리얼 계산 | prefix별 독립 | **p타입 통합 계산** (pfm+cp+pfd MAX) |
| 동시 생성 | 병렬 허용 | **순차 생성** + DB Lock |
| 생성 건수 (Part 1개) | 3건 INSERT | **2건 INSERT** (CP/PFD Lazy) |
| 생성 건수 (Part 10개) | 30건 INSERT | **20건 INSERT** (80% 감소) |
| DB 먹통 방어 | 없음 | Lazy Creation + 순차 트랜잭션 + Lock |

---

## 11. 수정 대상 파일 목록

| # | 파일 | 변경 내용 |
|---|------|---------|
| 1 | `prisma/schema.prisma` | `TripletGroup` 테이블 추가, 기존 테이블에 `tripletGroupId` 컬럼 추가 |
| 2 | `src/app/api/triplet/create/route.ts` | **신규** — Triplet 생성 통합 API |
| 3 | `src/app/api/triplet/[id]/materialize/route.ts` | **신규** — Lazy CP/PFD 생성 API |
| 4 | `src/app/api/triplet/[id]/header/route.ts` | **신규** — 헤더 동기화 API |
| 5 | `src/lib/utils/tripletIdGenerator.ts` | **신규** — 통합 시리얼/linkGroup 계산 |
| 6 | `src/components/modals/CreateDocumentModal.tsx` | 등록화면 공통화 (PFMEA/CP/PFD 동일 구조) |
| 7 | `src/app/api/project/create-linked/route.ts` | 기존 Part 생성 → triplet API로 리다이렉트 |
| 8 | `src/app/api/fmea/next-id/route.ts` | M/F 타입 linkSuffix 제거 확인 |
| 9 | `src/components/TripletStatusBadge.tsx` | **신규** — 미생성(Lazy) 상태 표시 + 생성 버튼 |

---

## 12. 마이그레이션 전략

### 기존 데이터 처리

```sql
-- Step 1. 기존 P타입 데이터로 TripletGroup 생성
INSERT INTO triplet_groups (id, type_code, pfmea_id, cp_id, pfd_id, ...)
SELECT 
  CONCAT('tg', year, '-p', serial),
  'p',
  pl.pfmeaId,
  pl.cpId,
  pl.pfdId,
  ...
FROM project_linkages pl
WHERE pl.pfmeaId LIKE 'pfm%-p%';

-- Step 2. 기존 M타입 PFMEA (cp_id=null, pfd_id=null로 시작)
INSERT INTO triplet_groups (id, type_code, pfmea_id, cp_id, pfd_id)
SELECT 
  CONCAT('tg', year, '-m', serial),
  'm',
  id,
  null,
  null
FROM fmea_projects WHERE typeCode='m';

-- Step 3. tripletGroupId 역참조 업데이트
UPDATE fmea_projects fp
JOIN triplet_groups tg ON tg.pfmea_id = fp.id
SET fp.triplet_group_id = tg.id;
```

---

> **구현 우선순위**:  
> P1 — TripletGroup 스키마 + tripletIdGenerator.ts  
> P2 — Triplet 생성 API (create + materialize)  
> P3 — 헤더 동기화 API  
> P4 — CreateDocumentModal UI 공통화  
> P5 — 마이그레이션 스크립트