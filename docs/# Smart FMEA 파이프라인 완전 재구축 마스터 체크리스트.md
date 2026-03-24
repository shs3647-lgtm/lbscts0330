# Smart FMEA 파이프라인 완전 재구축 마스터 체크리스트
**버전**: v1.0.0 | **작성일**: 2026-03-25  
**목적**: Import → 파싱 → UUID 부여 → FK 연결 → 고장사슬 완전 재설계  
**사용법**: Forge PLAN 단계에서 이 파일을 전체 로드 후 순서대로 실행

---

## ⚠️ 재발 원인 공식 선언 (이 섹션을 먼저 읽어라)

### 지금까지 반복 실패한 이유

| 실패 패턴 | 원인 | 이번 해결책 |
|----------|------|-----------|
| FK 연결 끊김 | UUID가 위치정보 없는 랜덤 ID | **위치 인코딩 UUID** 도입 |
| 명칭 미스매치로 연결 실패 | FK 매칭이 문자열 비교 의존 | **위치 기반 FK** → 명칭은 중복제거 보조 |
| Import 후 데이터 증가 | upsert where 조건 오류 | **고유 위치 ID**로 where 조건 고정 |
| 카테시안 복제 | A4를 A3 내부에서 복제 생성 | A4 독립 엔티티 + FK 참조만 |
| 검증 통과 후 재발 | 검증이 사후확인, 코드에 제약 없음 | 파이프라인 각 단계에 **불변 조건** 삽입 |
| 고장사슬 39% 매칭 실패 | WE 키 불일치 | WE도 위치 UUID로 연결 |

---

## 0단계: 신규 UUID·FK 체계 설계 (모든 단계의 기반)

### 0-1. 위치 인코딩 UUID 구조

모든 셀은 다음 구조의 **고유 위치 ID**를 가진다.

```
CELL_ID = {sheetCode}_{procNo}_{rowIdx}_{colIdx}_{seqIdx}_{parentId}

예시:
  A5_10_003_001_001_A4_10_001_001_000_ROOT
  ^^^^  ^^ ^^^  ^^^  ^^^  ^^^^^^^^^^^^^^^
  시트  공정 행  열   순서   부모 CELL_ID
```

#### sheetCode 코드표

> **통합시트(IL1/IL2/IL3)**는 개별 시트(A계열/B계열/C계열)의 **SSOT 원본**이다.  
> 개별 시트가 없고 통합시트만 있는 Import 형태에서도 동일한 cellId 체계를 사용한다.  
> 통합시트 행의 cellId는 해당 열이 속하는 **원본 개별 시트 코드(A1~C4)**로 생성한다.

| 시트명 | sheetCode | 엑셀 시트명 | 비고 |
|--------|-----------|------------|------|
| L2-1(A1) 공정번호 | `A1` | `L2-1(A1)` | |
| L2-2(A2) 공정명 | `A2` | `L2-2(A2)` | |
| L2-3(A3) 공정기능 | `A3` | `L2-3(A3)` | |
| L2-4(A4) 제품특성 | `A4` | `L2-4(A4)` | 공정 단위 독립 엔티티 |
| L2-5(A5) 고장형태 | `A5` | `L2-5(A5)` | |
| L2-6(A6) 검출관리 | `A6` | `L2-6(A6)` | |
| L3-1(B1) 작업요소 | `B1` | `L3-1(B1)` | |
| L3-2(B2) 요소기능 | `B2` | `L3-2(B2)` | |
| L3-3(B3) 공정특성 | `B3` | `L3-3(B3)` | |
| L3-4(B4) 고장원인 | `B4` | `L3-4(B4)` | |
| L3-5(B5) 예방관리 | `B5` | `L3-5(B5)` | |
| L1-1(C1) 구분 | `C1` | `L1-1(C1)` | |
| L1-2(C2) 제품기능 | `C2` | `L1-2(C2)` | |
| L1-3(C3) 요구사항 | `C3` | `L1-3(C3)` | |
| L1-4(C4) 고장영향 | `C4` | `L1-4(C4)` | |
| **L1 통합 (C1~C4)** | `IL1` | `L1통합` | 통합시트 — 열별로 C1~C4 코드 사용 |
| **L2 통합 (A1~A6)** | `IL2` | `L2통합` | 통합시트 — 열별로 A1~A6 코드 사용 |
| **L3 통합 (B1~B5)** | `IL3` | `L3통합` | 통합시트 — 열별로 B1~B5 코드 사용 |
| FC 고장사슬 | `FC` | `FC` | |
| FA 통합분석 | `FA` | `FA` | |

#### CELL_ID 생성 규칙

```typescript
function buildCellId(
  sheetCode: string,   // 'A4', 'FC', 'B4' 등
  procNo: string,      // '10', '40' (zero-pad 2자리)
  rowIdx: number,      // 해당 시트 내 데이터 행 번호 (1-based)
  colIdx: number,      // 열 번호 (1-based, 해당 시트 기준)
  seqIdx: number,      // 동일 부모 내 순서 (1-based)
  parentId: string     // 부모 CELL_ID, 최상위는 'ROOT'
): string {
  const pNo = procNo.padStart(2, '0')
  const row = String(rowIdx).padStart(3, '0')
  const col = String(colIdx).padStart(3, '0')
  const seq = String(seqIdx).padStart(3, '0')
  return `${sheetCode}_${pNo}_${row}_${col}_${seq}_${parentId}`
}

// 예시
buildCellId('A4', '10', 1, 1, 1, 'ROOT')
// → 'A4_10_001_001_001_ROOT'

buildCellId('A5', '10', 3, 1, 1, 'A4_10_001_001_001_ROOT')
// → 'A5_10_003_001_001_A4_10_001_001_001_ROOT'
```

### 0-2. FK 연결 체계

FK는 **위치 기반 CELL_ID**로 연결한다. 명칭(문자열)은 중복제거 보조에만 사용.

```
FK 연결 방향:
  A5.parentCellId  → A4.cellId     (고장형태 → 제품특성)
  FC.fmCellId      → A5.cellId     (고장사슬.FM → 고장형태)
  FC.feCellId      → C4.cellId     (고장사슬.FE → 고장영향)
  FC.fcCellId      → B4.cellId     (고장사슬.FC → 고장원인)
  FC.weCellId      → B1.cellId     (고장사슬.WE → 작업요소)
  FC.pcCellId      → B5.cellId     (고장사슬.PC → 예방관리)
  FC.dcCellId      → A6.cellId     (고장사슬.DC → 검출관리)
  B4.parentCellId  → B1.cellId     (고장원인 → 작업요소)
  B5.parentCellId  → B1.cellId     (예방관리 → 작업요소)
```

### 0-3. 중복제거 정책

위치 CELL_ID 부여 후 **동일 cellId를 가진 행만 중복으로 처리**한다.  
명칭이 달라도 위치가 같으면 중복 = 첫 번째 행을 SSOT로 보존.

```typescript
// 중복 제거 순서
// 1. 파싱 완료 후 전체 셀에 CELL_ID 부여
// 2. Map<cellId, CellRecord> 구축
// 3. cellId 충돌 시 → 첫 번째 행 보존, 나머지 제거 + 경고 로그
// 4. DB upsert where 조건 = { cellId: record.cellId }
```

---

## 1단계: Forge 진단 (PLAN)

### 1-1. 전체 파이프라인 파일 목록 수집

```bash
# Forge 실행 전 반드시 확인할 파일 목록
find src/ -name "*.ts" | grep -E \
  "excel-parser|buildWorksheet|failureChain|import.*route|db-storage" \
  | sort
```

#### 체크리스트

- [ ] `excel-parser.ts` 위치 확인 → 현재 파싱 대상 시트 목록 확인
- [ ] `buildWorksheetState.ts` 위치 확인 → A4 독립 엔티티 여부 확인
- [ ] `failureChainInjector.ts` 위치 확인 → FK 연결 방식 확인
- [ ] Import API route 파일 위치 확인 → 트랜잭션 래핑 여부 확인
- [ ] `schema.prisma` 위치 확인 → ProcessProductChar 독립 모델 여부 확인
- [ ] 현재 UUID 생성 함수 위치 확인 → 랜덤 uid() 사용 여부

### 1-2. 현재 UUID 체계 진단

```typescript
// 진단 포인트: 아래 패턴이 있으면 위치정보 없는 랜덤 UUID → 교체 대상
// 나쁜 패턴:
const id = uid()          // 랜덤, 위치정보 없음
const id = uuidv4()       // 랜덤, 위치정보 없음
const id = nanoid()       // 랜덤, 위치정보 없음

// 이번 재구축 후 올바른 패턴:
const cellId = buildCellId(sheetCode, procNo, rowIdx, colIdx, seqIdx, parentId)
```

- [ ] 전체 파일에서 `uid()` / `uuidv4()` / `nanoid()` 호출 위치 목록 작성
- [ ] 각 호출이 어떤 엔티티(A3/A4/A5/FC 등)에 대한 것인지 매핑
- [ ] 교체 우선순위: A4 → A5 → FC → B1 → B4 → 나머지 순

### 1-3. 현재 FK 연결 방식 진단

- [ ] `failureChainInjector.ts` FK 연결이 **문자열 비교**인지 **ID 참조**인지 확인
- [ ] `buildWorksheetState.ts` distribute() 함수 사용 여부 확인
- [ ] A5.productCharId가 A4의 실제 DB ID를 참조하는지, 순서 인덱스인지 확인
- [ ] FC 시트의 FM 컬럼이 A5.id를 참조하는지, FM 명칭 문자열을 참조하는지 확인
- [ ] FC 시트의 WE 컬럼이 B1.id를 참조하는지, WE 명칭 문자열을 참조하는지 확인

### 1-4. 현재 파싱 커버리지 진단

- [ ] 파싱 대상 시트가 19개 전체인지 확인 (A1~A6, B1~B5, C1~C4, L1~L3통합, FC, FA)
- [ ] 각 시트에서 **공정번호** 컬럼을 파싱하는지 확인
- [ ] 각 시트에서 **행 인덱스** (엑셀 원본 행 번호)를 보존하는지 확인
- [ ] 각 시트에서 **열 인덱스**를 보존하는지 확인
- [ ] 빈 행 처리: 완전 빈 행 스킵 vs 부분 빈 행 처리 방식 확인
- [ ] 셀병합 처리: 병합 해제 후 각 행에 값 복제하는지 확인

---

## 2단계: Import 엑셀 파싱 재구축

### 2-1. 파싱 대상 시트 전체 목록 및 열 매핑

#### A계열 시트 파싱 스펙

**A1 공정번호 시트**
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | procNo | string (zero-pad) | ✓ |
| 2 | procName | string | ✓ |

- [ ] 파싱 시 procNo zero-padding 정규화 (`'1'` → `'01'`)
- [ ] 파싱 결과에 `rowIdx` (엑셀 행번호) 보존
- [ ] `cellId = buildCellId('A1', procNo, rowIdx, 1, seqInProc, 'ROOT')` 생성

**A2 공정명 시트** (A1과 동일 구조)
- [ ] A1과 procNo 일치 여부 검증
- [ ] `cellId = buildCellId('A2', procNo, rowIdx, 1, seqInProc, a1CellId)` 생성

**A3 공정기능 시트**
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | procNo | string | ✓ |
| 2 | procName | string | ✓ |
| 3 | functionText | string | ✓ |

- [ ] functionText 절차서 나열 금지 검증
- [ ] `cellId = buildCellId('A3', procNo, rowIdx, 3, seqInProc, a1CellId)` 생성
- [ ] `parentCellId = a1CellId` (공정 루트 참조)

**A4 제품특성 시트** ★ 가장 중요
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | procNo | string | ✓ |
| 2 | procName | string | ✓ |
| 3 | charName | string | ✓ |
| 4 | ccFlag | 'CC'/'SC'/'' | 선택 |

- [ ] `cellId = buildCellId('A4', procNo, rowIdx, 3, seqInProc, a1CellId)` 생성
- [ ] **A4는 공정 단위 독립 엔티티**: 동일 procNo의 A4는 하나의 배열로 관리
- [ ] A4 cellId는 A5, FC 시트의 FK 기준이 됨
- [ ] 중복 제거: 동일 procNo + 동일 charName → 첫 번째 보존

**A5 고장형태 시트**
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | procNo | string | ✓ |
| 2 | procName | string | ✓ |
| 3 | fmText | string | ✓ |
| 4 | linkedA4Text | string | ✓ |

- [ ] `cellId = buildCellId('A5', procNo, rowIdx, 3, seqInProc, a4CellId)` 생성
- [ ] `parentCellId = a4CellId` — A4의 cellId를 반드시 FK로 저장
- [ ] linkedA4Text로 해당 공정의 A4 cellId 역조회:
  ```typescript
  const a4CellId = a4Map.get(`${procNo}::${linkedA4Text}`)
  // a4Map = Map<`${procNo}::${charName}`, cellId>
  ```
- [ ] a4CellId 역조회 실패 시 → 오류 로그 + 해당 행 파싱 중단 (DB 저장 금지)

**A6 검출관리 시트**
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | procNo | string | ✓ |
| 2 | procName | string | ✓ |
| 3 | dcMethod | string | ✓ |

- [ ] 동일 procNo 2행 이상 → 오류 처리
- [ ] `cellId = buildCellId('A6', procNo, rowIdx, 3, 1, a1CellId)` 생성

#### B계열 시트 파싱 스펙

**B1 작업요소 시트** ★ WE 연결의 기준
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | procNo | string | ✓ |
| 2 | procName | string | ✓ |
| 3 | category4M | 'Man'/'Machine'/'Material'/'Method' | ✓ |
| 4 | weName | string | ✓ |

- [ ] `cellId = buildCellId('B1', procNo, rowIdx, 4, seqInProc, a1CellId)` 생성
- [ ] `b1Map = Map<`${procNo}::${weName}`, cellId>` → FC 매칭에 사용
- [ ] category4M 허용값 외 입력 시 오류

**B2 요소기능 시트**
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | procNo | string | ✓ |
| 2 | weName | string | ✓ (B1 참조) |
| 3 | functionText | string | ✓ |

- [ ] weName으로 b1CellId 역조회:
  ```typescript
  const b1CellId = b1Map.get(`${procNo}::${weName}`)
  ```
- [ ] b1CellId 역조회 실패 시 → 오류 로그
- [ ] `cellId = buildCellId('B2', procNo, rowIdx, 3, seqInProc, b1CellId)` 생성

**B3 공정특성 시트**
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | procNo | string | ✓ |
| 2 | weName | string | ✓ (B1 참조) |
| 3 | charName | string | ✓ |

- [ ] `parentCellId = b1CellId` (weName으로 역조회)
- [ ] `cellId = buildCellId('B3', procNo, rowIdx, 3, seqInProc, b1CellId)` 생성

**B4 고장원인 시트** ★ FC 연결의 기준
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | procNo | string | ✓ |
| 2 | weName | string | ✓ (B1 참조) |
| 3 | causeText | string | ✓ |

- [ ] 동사형 종결 검증 (`~한다`, `~않음`, `~진행함` 포함 시 경고)
- [ ] `parentCellId = b1CellId`
- [ ] `cellId = buildCellId('B4', procNo, rowIdx, 3, seqInProc, b1CellId)` 생성
- [ ] `b4Map = Map<`${procNo}::${causeText}`, cellId>` → FC 매칭에 사용

**B5 예방관리 시트**
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | procNo | string | ✓ |
| 2 | weName | string | ✓ (B1 참조) |
| 3 | pcMethod | string | ✓ |

- [ ] weName 빈 셀 절대 금지 → 오류 처리
- [ ] `parentCellId = b1CellId`
- [ ] `cellId = buildCellId('B5', procNo, rowIdx, 3, seqInProc, b1CellId)` 생성
- [ ] `b5Map = Map<`${procNo}::${weName}::${pcMethod}`, cellId>` → FC 매칭에 사용

#### C계열 시트 파싱 스펙

**C1 구분 시트**
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | c1Category | 'YP'/'SP'/'USER' | ✓ |
| 2 | requirementText | string | ✓ |

- [ ] 허용값 외 입력 시 오류
- [ ] `cellId = buildCellId('C1', '00', rowIdx, 1, rowIdx, 'ROOT')` (공정번호 없음 → '00')

**C2 제품기능 시트**
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | c1Category | string | ✓ |
| 2 | functionText | string | ✓ |

- [ ] `parentCellId = c1CellId` (c1Category로 역조회)
- [ ] `cellId = buildCellId('C2', '00', rowIdx, 2, seqInGroup, c1CellId)` 생성

**C3 요구사항 시트**
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | c1Category | string | ✓ |
| 2 | requirement | string | ✓ |
| 3 | unit | string | 선택 |

- [ ] YP → SP → USER 순서 검증
- [ ] `cellId = buildCellId('C3', '00', rowIdx, 2, seqInGroup, c1CellId)` 생성
- [ ] `c3Map = Map<`${c1Category}::${requirement}`, cellId>` → FC.FE 매칭에 사용

**C4 고장영향 시트**
| 열 | 필드명 | 타입 | 필수 |
|----|--------|------|------|
| 1 | c1Category | string | ✓ |
| 2 | effectText | string | ✓ |

- [ ] `parentCellId = c1CellId`
- [ ] `cellId = buildCellId('C4', '00', rowIdx, 2, seqInGroup, c1CellId)` 생성
- [ ] `c4Map = Map<`${c1Category}::${effectText}`, cellId>` → FC.FE 매칭에 사용

### 2-1-b. 통합시트 파싱 스펙 (IL1 / IL2 / IL3)

> **통합시트**는 개별 시트(A계열/B계열/C계열)가 하나의 엑셀 시트에 합쳐진 형태다.  
> **파싱 원칙**: 통합시트의 각 열을 해당 원본 시트 코드로 분해하여 cellId를 생성한다.  
> 개별 시트와 통합시트가 **동시에 존재하면 통합시트를 SSOT로 우선한다.**

---

#### IL1 통합시트 (L1통합: C1~C4) 열 구조

**헤더 열 매핑 (4열)**

| 열 번호 | 헤더명 | 원본 시트 | 필드명 | 필수 | cellId 생성 기준 |
|---------|--------|----------|--------|------|----------------|
| 1 | C1.구분 | `C1` | c1Category | ✓ | `C1_00_{row}_001_{seq}_ROOT` |
| 2 | C2.제품기능 | `C2` | functionText | ✓ | `C2_00_{row}_002_{seq}_{c1CellId}` |
| 3 | C3.요구사항 | `C3` | requirement | ✓ | `C3_00_{row}_003_{seq}_{c1CellId}` |
| 4 | C4.고장영향 | `C4` | effectText | ✓ | `C4_00_{row}_004_{seq}_{c1CellId}` |

**IL1 행 파싱 규칙**

```typescript
// IL1 한 행 → C1/C2/C3/C4 각각의 cellId 생성
for (const [rowIdx, row] of il1Rows.entries()) {
  const c1CellId = buildCellId('C1', '00', rowIdx+1, 1, seqC1, 'ROOT')
  const c2CellId = buildCellId('C2', '00', rowIdx+1, 2, seqC2, c1CellId)
  const c3CellId = buildCellId('C3', '00', rowIdx+1, 3, seqC3, c1CellId)
  const c4CellId = buildCellId('C4', '00', rowIdx+1, 4, seqC4, c1CellId)

  // Map 등록 (FC 파싱에 사용)
  c1Map.set(row.c1Category, c1CellId)
  c4Map.set(`${row.c1Category}::${row.effectText}`, c4CellId)
}
```

**IL1 파싱 체크리스트**

- [ ] 헤더 행 스킵 후 데이터 2행부터 파싱
- [ ] C4 있는 행에 C2, C3 모두 기재 여부 검증
- [ ] C1 허용값 ('YP'/'SP'/'USER') 외 입력 시 오류
- [ ] YP → SP → USER 순서 검증
- [ ] C1/C2/C3/C4 각각 별도 cellId 생성 (동일 행이라도 4개 cellId 생성)
- [ ] `c1Map`, `c4Map` 구축 완료 후 FC 파싱 허용

---

#### IL2 통합시트 (L2통합: A1~A6) 열 구조

**헤더 열 매핑 (7열)**

| 열 번호 | 헤더명 | 원본 시트 | 필드명 | 필수 | cellId 생성 기준 |
|---------|--------|----------|--------|------|----------------|
| 1 | A1.공정번호 | `A1` | procNo | ✓ | `A1_{procNo}_001_001_001_ROOT` |
| 2 | A2.공정명 | `A2` | procName | ✓ | `A2_{procNo}_{row}_002_{seq}_{a1CellId}` |
| 3 | A3.공정기능 | `A3` | functionText | ✓ | `A3_{procNo}_{row}_003_{seq}_{a1CellId}` |
| 4 | A4.제품특성 | `A4` | charName | ✓ | `A4_{procNo}_{row}_004_{seq}_{a1CellId}` |
| 5 | A5.고장형태 | `A5` | fmText | ✓ | `A5_{procNo}_{row}_005_{seq}_{a4CellId}` |
| 6 | A6.검출관리 | `A6` | dcMethod | 선택 | `A6_{procNo}_{row}_006_001_{a1CellId}` |
| 7 | *(CC 표기 열)* | `A4` 속성 | ccFlag | 선택 | A4 cellId에 속성으로 포함 |

> **A6열 주의**: 동일 공정번호(A1열)의 A6 행이 2개 이상이면 오류 — 첫 번째만 보존

**IL2 행 파싱 규칙**

```typescript
// IL2는 상위값이 반복 기입된 형태 → 공정번호/공정명이 같은 연속 행을 그룹핑
// A4가 다른 행 = 새 A4 그룹
// A5가 다른 행 = 새 A5 (A4 그룹 내 여러 A5 가능)

for (const [rowIdx, row] of il2Rows.entries()) {
  const procNo = normalizeProcNo(row.procNo)  // zero-pad
  const a1CellId = a1Map.get(procNo)
    ?? buildCellId('A1', procNo, 1, 1, 1, 'ROOT')  // 최초 등장 시 생성

  // A4: 동일 공정 내 동일 charName이면 기존 cellId 재사용 (복제 금지)
  const a4Key = `${procNo}::${row.charName}`
  let a4CellId = a4Map.get(a4Key)
  if (!a4CellId) {
    a4CellId = buildCellId('A4', procNo, rowIdx+1, 4, seqA4InProc, a1CellId)
    a4Map.set(a4Key, a4CellId)
  }

  // A5: FM 텍스트 + 부모 A4 cellId 조합으로 고유성 판단
  const a5Key = `${procNo}::${row.fmText}`
  const a5CellId = buildCellId('A5', procNo, rowIdx+1, 5, seqA5InA4, a4CellId)
  a5Map.set(a5Key, a5CellId)

  // A6: 공정 당 1개, 이미 있으면 스킵
  if (row.dcMethod && !a6Map.has(procNo)) {
    const a6CellId = buildCellId('A6', procNo, rowIdx+1, 6, 1, a1CellId)
    a6Map.set(procNo, a6CellId)
  }
}
```

**IL2 파싱 체크리스트**

- [ ] 공정번호 zero-padding 정규화
- [ ] A4 중복 방지: 동일 procNo + 동일 charName → 첫 번째 행의 cellId를 a4Map에 등록, 이후 행은 재사용
- [ ] A4 cellId를 a4Map에 등록 완료 후 해당 행의 A5 cellId 생성
- [ ] A6 동일 공정번호 2행 이상 → 첫 번째만 a6Map 등록, 나머지 경고 처리
- [ ] `a1Map`, `a4Map`, `a5Map`, `a6Map` 모두 구축 완료 후 FC 파싱 허용

---

#### IL3 통합시트 (L3통합: B1~B5) 열 구조

**헤더 열 매핑 (8열)**

| 열 번호 | 헤더명 | 원본 시트 | 필드명 | 필수 | cellId 생성 기준 |
|---------|--------|----------|--------|------|----------------|
| 1 | B1.작업요소 | `B1` | weName | ✓ | `B1_{procNo}_{row}_001_{seq}_{a1CellId}` |
| 2 | 4M구분 | `B1` 속성 | category4M | ✓ | B1 cellId에 속성으로 포함 |
| 3 | 공정번호 | `A1` 참조 | procNo | ✓ | a1Map 역조회에 사용 |
| 4 | B2.요소기능 | `B2` | functionText | ✓ | `B2_{procNo}_{row}_004_{seq}_{b1CellId}` |
| 5 | B3.공정특성 | `B3` | charName | ✓ | `B3_{procNo}_{row}_005_{seq}_{b1CellId}` |
| 6 | B4.고장원인 | `B4` | causeText | ✓ | `B4_{procNo}_{row}_006_{seq}_{b1CellId}` |
| 7 | B5.예방관리(발생 전 방지) | `B5` | pcMethod | 선택 | `B5_{procNo}_{row}_007_{seq}_{b1CellId}` |
| 8 | *(B5 작업요소 연결 확인열)* | `B5` 속성 | b5WeName | ✓ | B5 cellId에 속성으로 포함 |

> **B5열 주의**: B5 행에서 `작업요소(WE)` 열이 빈 셀이면 **Import 불가 오류** — B1 cellId를 FK로 연결할 수 없음

**IL3 행 파싱 규칙**

```typescript
for (const [rowIdx, row] of il3Rows.entries()) {
  const procNo = normalizeProcNo(row.procNo)
  const a1CellId = a1Map.get(procNo)
    ?? error(`IL3[${rowIdx}]: 공정번호 '${procNo}' → IL2/A1에 없음`)

  // B1: WE명 + 공정번호 조합으로 고유성 판단
  const b1Key = `${procNo}::${row.weName}`
  let b1CellId = b1Map.get(b1Key)
  if (!b1CellId) {
    b1CellId = buildCellId('B1', procNo, rowIdx+1, 1, seqB1InProc, a1CellId)
    b1Map.set(b1Key, b1CellId)
  }

  // B4: 고장원인 cellId → b4Map 등록
  const b4Key = `${procNo}::${row.causeText}`
  const b4CellId = buildCellId('B4', procNo, rowIdx+1, 6, seqB4InB1, b1CellId)
  b4Map.set(b4Key, b4CellId)

  // B5: WE 빈 셀 오류 처리 필수
  if (row.pcMethod) {
    if (!row.b5WeName) {
      error(`IL3[${rowIdx}]: B5.pcMethod 있으나 작업요소 빈 셀 — Import 불가`)
    }
    const b5Key = `${procNo}::${row.b5WeName}::${row.pcMethod}`
    const b5CellId = buildCellId('B5', procNo, rowIdx+1, 7, seqB5InB1, b1CellId)
    b5Map.set(b5Key, b5CellId)
  }
}
```

**IL3 파싱 체크리스트**

- [ ] IL2/A1 파싱 완료 후 IL3 파싱 시작 (a1Map 필요)
- [ ] B1 중복 방지: 동일 procNo + 동일 weName → 기존 b1CellId 재사용
- [ ] B5 weName(작업요소) 빈 셀 → **오류** (경고 아님)
- [ ] `b1Map`, `b4Map`, `b5Map` 모두 구축 완료 후 FC 파싱 허용
- [ ] IL3의 4M 열 값 허용값 검증 ('Man'/'Machine'/'Material'/'Method')

---

#### 통합시트 파싱 완료 후 Map 구축 확인

FC 파싱 시작 전 아래 8개 Map이 모두 구축되어야 한다.

```typescript
// FC 파싱 사전 조건 검증 (이 검증이 실패하면 FC 파싱 중단)
function assertMapsReady(maps: {
  a1Map: Map<string, string>        // procNo → A1 cellId
  a4Map: Map<string, string>        // `${procNo}::${charName}` → A4 cellId
  a5Map: Map<string, string>        // `${procNo}::${fmText}` → A5 cellId
  a6Map: Map<string, string>        // procNo → A6 cellId
  b1Map: Map<string, string>        // `${procNo}::${weName}` → B1 cellId
  b4Map: Map<string, string>        // `${procNo}::${causeText}` → B4 cellId
  b5Map: Map<string, string>        // `${procNo}::${weName}::${pcMethod}` → B5 cellId
  c1Map: Map<string, string>        // feCategory → C1 cellId
  c4Map: Map<string, string>        // `${feCategory}::${effectText}` → C4 cellId
}): void {
  const required = ['a1Map','a4Map','a5Map','a6Map','b1Map','b4Map','b5Map','c1Map','c4Map']
  for (const name of required) {
    if ((maps as any)[name].size === 0) {
      throw new Error(`FC 파싱 사전 조건 실패: ${name}이 비어 있음`)
    }
  }
}
```

- [ ] `assertMapsReady()` 통과 후 FC 파싱 시작
- [ ] 각 Map의 size를 Import 리포트에 포함 (파싱 건수 확인용)

---

### 2-2. FC 고장사슬 시트 파싱 스펙 ★ 핵심

#### FC 시트 실제 열 구조 (9열) — 헤더명 기준

| 열 번호 | 실제 헤더명 | 필드명 | 타입 | 필수 | FK 대상 시트 | cellId 포함 여부 |
|---------|------------|--------|------|------|-------------|----------------|
| 1 | FE구분 | feCategory | 'YP'/'SP'/'USER' | ✓ | C1 | → `feCategoryCellId` (C1 cellId) |
| 2 | FE(고장영향) | feText | string | ✓ | C4 | → `feCellId` (C4 cellId) |
| 3 | L2-1.공정번호 | procNo | string | ✓ | A1 | → `procCellId` (A1 cellId) |
| 4 | FM(고장형태) | fmText | string | ✓ | A5 | → `fmCellId` (A5 cellId) |
| 5 | 4M | category4M | 'Man'/'Machine'/'Material'/'Method' | ✓ | B1.category4M | → `category4M` (문자열, FK 아님) |
| 6 | 작업요소(WE) | weText | string | ✓ | B1 | → `weCellId` (B1 cellId) |
| 7 | FC(고장원인) | causeText | string | ✓ | B4 | → `causeCellId` (B4 cellId) |
| 8 | B5.예방관리(발생 전 방지) | pcText | string | 선택 | B5 | → `pcCellId` (B5 cellId) |
| 9 | A6.검출관리(발생 후 검출) | dcText | string | 선택 | A6 | → `dcCellId` (A6 cellId) |

> **SOD/AP는 FC 시트에 없다.** SOD(심각도·발생도·검출도)와 AP(조치우선순위)는  
> **FA(통합분석) 시트**에서 별도 파싱한다.

#### FC 행의 cellId 완전 구조

FC 한 행(row)은 9개 열의 값 + **7개 FK cellId**를 모두 품어야 한다.

```typescript
interface FCRowRecord {
  // ── 위치 정보 ──────────────────────────────────────────
  cellId:          string   // FC 행 자신의 고유 ID
  // buildCellId('FC', procNo, rowIdx, 4, seqInFM, fmCellId)
  // 열 번호는 4(FM열)를 기준으로 고정 — FC 행은 FM 단위로 그룹핑되므로
  parentCellId:    string   // = fmCellId (FM이 FC 행의 부모)
  procNo:          string   // L2-1.공정번호 (zero-pad)
  rowIdx:          number   // 엑셀 원본 행 인덱스 (1-based)
  seqInFM:         number   // 동일 FM 내 FC 행 순서 (1-based)

  // ── 열 1: FE구분 ────────────────────────────────────────
  feCategory:      'YP' | 'SP' | 'USER'
  feCategoryCellId: string  // C1 cellId — `C1_00_{row}_{col}_{seq}_ROOT`

  // ── 열 2: FE(고장영향) ──────────────────────────────────
  feText:          string
  feCellId:        string   // C4 cellId — `C4_00_{row}_002_{seq}_{c1CellId}`

  // ── 열 3: L2-1.공정번호 ─────────────────────────────────
  // procNo 이미 위에 선언
  procCellId:      string   // A1 cellId — `A1_{procNo}_001_001_001_ROOT`

  // ── 열 4: FM(고장형태) ──────────────────────────────────
  fmText:          string
  fmCellId:        string   // A5 cellId — `A5_{procNo}_{row}_001_{seq}_{a4CellId}`

  // ── 열 5: 4M ────────────────────────────────────────────
  category4M:      'Man' | 'Machine' | 'Material' | 'Method'
  // ※ 4M은 B1의 속성이므로 별도 cellId 없음 — weCellId로 B1 엔티티 전체 참조

  // ── 열 6: 작업요소(WE) ──────────────────────────────────
  weText:          string
  weCellId:        string   // B1 cellId — `B1_{procNo}_{row}_004_{seq}_{a1CellId}`

  // ── 열 7: FC(고장원인) ──────────────────────────────────
  causeText:       string
  causeCellId:     string   // B4 cellId — `B4_{procNo}_{row}_003_{seq}_{b1CellId}`

  // ── 열 8: B5.예방관리(발생 전 방지) ────────────────────
  pcText:          string | null
  pcCellId:        string | null  // B5 cellId — nullable
  // `B5_{procNo}_{row}_003_{seq}_{b1CellId}`

  // ── 열 9: A6.검출관리(발생 후 검출) ────────────────────
  dcText:          string | null
  dcCellId:        string | null  // A6 cellId — nullable
  // `A6_{procNo}_{row}_003_001_{a1CellId}`
}
```

#### FC cellId 생성 기준

```
FC cellId 공식:
  buildCellId('FC', procNo, rowIdx, 4, seqInFM, fmCellId)
                              ↑
              열 번호는 4(FM열) 고정 — FC 행의 정체성은 FM에 귀속

seqInFM: 동일 FM 그룹 내 FC 행이 여러 개일 때 순서
  예) FM = '범프 높이 편차' 아래 FC 행 3개 → seqInFM = 1, 2, 3

예시:
  공정 10번, 엑셀 5행, FM그룹 내 2번째 FC 행, 부모 fmCellId = 'A5_10_003_001_001_A4_10_001_001_001_ROOT'
  → FC cellId = 'FC_10_005_004_002_A5_10_003_001_001_A4_10_001_001_001_ROOT'
```

**FC 행 파싱 상세 체크리스트**

- [ ] 셀병합 해제 후 각 행에 값 복제 처리 (FM열 병합, FE열 병합, 공정번호열 병합)
- [ ] 공정번호 빈 셀 → 직전 유효 공정번호 상속
- [ ] FM 빈 셀 → 직전 유효 FM 상속
- [ ] FE 빈 셀 → 직전 유효 FE 상속 (FE 수 < FC 수 상황)
- [ ] 공정번호 zero-padding 정규화 (`'1'` → `'01'`)

**FC 행의 FK 역조회 체크리스트**

각 FC 행에 대해 아래 **7개 FK cellId**를 반드시 역조회:

```typescript
// FC 한 행의 FK 역조회 순서 (Map은 모두 사전 구축 완료 상태여야 함)
const fcRow: FCRowRecord = {
  // ── 열 3: 공정번호 → A1 cellId ─────────────────────────
  procCellId: a1Map.get(procNo)
    ?? error(`FC[${rowIdx}]: 공정번호 '${procNo}' → A1에 없음`),

  // ── 열 4: FM → A5 cellId ───────────────────────────────
  fmCellId: a5Map.get(`${procNo}::${fmText}`)
    ?? error(`FC[${rowIdx}]: FM '${fmText}' (공정 ${procNo}) → A5에 없음`),

  // ── 열 1: FE구분 → C1 cellId ───────────────────────────
  feCategoryCellId: c1Map.get(feCategory)
    ?? error(`FC[${rowIdx}]: FE구분 '${feCategory}' → C1에 없음`),

  // ── 열 2: FE → C4 cellId ───────────────────────────────
  feCellId: c4Map.get(`${feCategory}::${feText}`)
    ?? error(`FC[${rowIdx}]: FE '${feText}' (${feCategory}) → C4에 없음`),

  // ── 열 6: WE → B1 cellId ───────────────────────────────
  weCellId: b1Map.get(`${procNo}::${weText}`)
    ?? error(`FC[${rowIdx}]: WE '${weText}' (공정 ${procNo}) → B1에 없음`),

  // ── 열 7: 고장원인 → B4 cellId ─────────────────────────
  causeCellId: b4Map.get(`${procNo}::${causeText}`)
    ?? error(`FC[${rowIdx}]: 고장원인 '${causeText}' (공정 ${procNo}) → B4에 없음`),

  // ── 열 8: 예방관리 → B5 cellId (선택) ──────────────────
  pcCellId: pcText
    ? (b5Map.get(`${procNo}::${weText}::${pcText}`)
        ?? warn(`FC[${rowIdx}]: PC '${pcText}' → B5에 없음`))
    : null,

  // ── 열 9: 검출관리 → A6 cellId (선택) ──────────────────
  dcCellId: dcText
    ? (a6Map.get(procNo)
        ?? warn(`FC[${rowIdx}]: DC '${dcText}' (공정 ${procNo}) → A6에 없음`))
    : null,

  // ── FC 자신의 cellId (fmCellId 역조회 성공 후 생성) ────
  cellId: buildCellId('FC', procNo, rowIdx, 4, seqInFM,
            a5Map.get(`${procNo}::${fmText}`) ?? 'ORPHAN'),
  parentCellId: a5Map.get(`${procNo}::${fmText}`) ?? 'ORPHAN',
}
```

- [ ] `a1Map = Map<procNo, cellId>` 구축 완료 후 FC 파싱 시작
- [ ] `a5Map = Map<`${procNo}::${fmText}`, cellId>` 구축 완료 후 FC 파싱 시작
- [ ] `c1Map = Map<feCategory, cellId>` 구축 완료 후 FC 파싱 시작
- [ ] `c4Map = Map<`${feCategory}::${feText}`, cellId>` 구축 완료 후 FC 파싱 시작
- [ ] `b1Map = Map<`${procNo}::${weName}`, cellId>` 구축 완료 후 FC 파싱 시작
- [ ] `b4Map = Map<`${procNo}::${causeText}`, cellId>` 구축 완료 후 FC 파싱 시작
- [ ] `b5Map = Map<`${procNo}::${weName}::${pcMethod}`, cellId>` 구축 완료 후 FC 파싱 시작
- [ ] `a6Map = Map<procNo, cellId>` 구축 완료 후 FC 파싱 시작
- [ ] FK 역조회 실패 행 → **해당 행만** 오류 로그 + 스킵 (전체 중단 금지)
- [ ] FK 역조회 실패 건수 / 전체 FC 행 수 → 파싱 완료 후 리포트 출력

### 2-3. 파싱 결과 데이터 구조

```typescript
interface ParsedSheet<T> {
  sheetName: string
  sheetCode: string
  rows: T[]
  errors: ParseError[]   // 파싱 오류 목록
  warnings: ParseWarn[]  // 경고 목록
}

interface CellRecord {
  cellId: string          // 위치 인코딩 고유 ID
  parentCellId: string    // 부모 cellId
  sheetCode: string       // 시트 코드
  procNo: string          // 공정번호
  rowIdx: number          // 엑셀 원본 행 인덱스
  colIdx: number          // 주요 값의 열 인덱스
  seqIdx: number          // 부모 내 순서
  value: string           // 셀 주요 값
  rawRow: Record<string, string>  // 원본 행 전체
}

interface FCRecord extends CellRecord {
  fmCellId: string        // A5 FK
  feCellId: string        // C4 FK
  weCellId: string        // B1 FK
  causeCellId: string     // B4 FK
  pcCellId: string | null // B5 FK
  dcCellId: string | null // A6 FK
  severity: number
  occurrence: number
  detection: number
  ap: 'H' | 'M' | 'L'
}
```

**파싱 전체 실행 순서 (이 순서 절대 준수)**

```
[개별 시트 모드]         [통합시트 모드]
개별 시트 존재 시         통합시트 존재 시 (개별 시트 없거나 통합시트 우선)

1. A1 파싱               1. IL2(L2통합) 파싱
   → a1Map 구축             - A1열: → a1Map 구축
                             - A4열: → a4Map 구축
2. A2 파싱                   - A5열: → a5Map 구축
3. A3 파싱                   - A6열: → a6Map 구축
4. A4 파싱               2. IL3(L3통합) 파싱 (a1Map 필요)
   → a4Map 구축              - B1열: → b1Map 구축
5. A5 파싱                   - B4열: → b4Map 구축
   → a5Map 구축              - B5열: → b5Map 구축
6. A6 파싱               3. IL1(L1통합) 파싱
   → a6Map 구축              - C1열: → c1Map 구축
7. B1 파싱                   - C4열: → c4Map 구축
   → b1Map 구축
8. B2 파싱
9. B3 파싱
10. B4 파싱
    → b4Map 구축
11. B5 파싱
    → b5Map 구축
12. C1 파싱
    → c1Map 구축
13. C2 파싱
14. C3 파싱
    → c3Map 구축
15. C4 파싱
    → c4Map 구축

─────────────────────────────────────────────────────
공통: assertMapsReady() 실행 (9개 Map 모두 size > 0 확인)
─────────────────────────────────────────────────────

16/4. FC 파싱 (a1Map, a4Map, a5Map, a6Map, b1Map, b4Map, b5Map, c1Map, c4Map 모두 필요)
      → 9열 전체 FK cellId 역조회 + FCRowRecord 생성
17/5. FA 파싱 (FC 결과 참조)
```

- [ ] 통합시트 모드/개별 시트 모드 자동 감지 로직 구현
- [ ] 통합시트와 개별 시트 동시 존재 시 → 통합시트 우선 + 경고 로그
- [ ] 위 순서가 코드에 명시적으로 고정되어 있는지 확인
- [ ] 각 Map이 다음 단계 시작 전에 완전히 구축되었는지 확인
- [ ] `assertMapsReady()` 가 FC 파싱 직전에 반드시 호출되는지 확인

---

## 3단계: DB 저장 (Prisma) 재구축

### 3-1. Prisma Schema 변경 체크리스트

**ProcessProductChar (A4) 독립 모델**

```prisma
model ProcessProductChar {
  cellId       String  @id  // 위치 인코딩 CELL_ID
  parentCellId String       // A1의 cellId
  procNo       String
  rowIdx       Int
  colIdx       Int
  seqIdx       Int
  charName     String
  ccFlag       String?
  processId    String       // Process FK (기존 UUID 방식과 병행)

  failureModes FailureMode[]
  process      Process      @relation(fields: [processId], references: [id])

  @@index([procNo])
  @@index([procNo, charName])  // 명칭 기반 역조회 보조 인덱스
}
```

- [ ] `cellId @id` → PK가 위치 인코딩 ID
- [ ] 기존 `id String @default(uuid())` → `cellId String @id`로 교체
- [ ] migration 실행: `npx prisma migrate dev --name add_cellId_as_pk`
- [ ] 기존 데이터 migration 스크립트 작성 (cellId 역산 불가 → 전체 재import 필요)

**FailureMode (A5)**

```prisma
model FailureMode {
  cellId            String  @id
  parentCellId      String  // A4의 cellId
  procNo            String
  rowIdx            Int
  seqIdx            Int
  fmText            String
  productCharCellId String  // ProcessProductChar FK

  productChar ProcessProductChar @relation(fields: [productCharCellId], references: [cellId])
  failureChains FailureChain[]

  @@index([procNo, fmText])  // FC 역조회 보조
}
```

- [ ] `productCharCellId` = A4.cellId (위치 기반 FK)
- [ ] `distribute()` 함수 완전 제거

**FailureChain (FC)**

```prisma
model FailureChain {
  cellId       String  @id
  procNo       String
  rowIdx       Int
  seqIdx       Int

  fmCellId     String   // A5 FK
  feCellId     String   // C4 FK
  weCellId     String   // B1 FK
  causeCellId  String   // B4 FK
  pcCellId     String?  // B5 FK
  dcCellId     String?  // A6 FK

  severity   Int
  occurrence Int
  detection  Int
  ap         String

  failureMode     FailureMode        @relation(fields: [fmCellId], references: [cellId])
  // ... 나머지 relation 정의
}
```

- [ ] 모든 FK가 cellId 참조 (문자열 매칭 FK 없음)
- [ ] FK 누락 불가 구조: `fmCellId`, `feCellId`, `weCellId`, `causeCellId`는 NOT NULL
- [ ] PC/DC는 선택이므로 nullable

### 3-2. Import API Route 재구축

**단일 트랜잭션 필수 패턴**

```typescript
// app/api/import/route.ts

export async function POST(req: Request) {
  const parsed = await parseImportFile(req)  // 2단계 파싱 결과

  // 파싱 오류가 임계값 초과 시 전체 중단
  if (parsed.errors.length > parsed.totalRows * 0.1) {
    return Response.json({ error: '파싱 오류 10% 초과', details: parsed.errors }, { status: 400 })
  }

  const result = await prisma.$transaction(async (tx) => {
    // 저장 순서: A1 → A2 → A3 → A4 → A5 → A6 → B1 → B2 → B3 → B4 → B5
    //         → C1 → C2 → C3 → C4 → FC → FA

    // 1. A4 저장 (가장 먼저 - A5의 FK 기준)
    await tx.processProductChar.createMany({
      data: parsed.a4.rows.map(r => ({
        cellId: r.cellId,
        parentCellId: r.parentCellId,
        procNo: r.procNo,
        rowIdx: r.rowIdx,
        colIdx: r.colIdx,
        seqIdx: r.seqIdx,
        charName: r.value,
        processId: getProcessId(r.procNo),
      })),
      skipDuplicates: false,  // cellId PK 충돌 = 중복 = 오류로 처리
    })

    // 2. A5 저장
    await tx.failureMode.createMany({
      data: parsed.a5.rows.map(r => ({
        cellId: r.cellId,
        parentCellId: r.parentCellId,
        procNo: r.procNo,
        rowIdx: r.rowIdx,
        seqIdx: r.seqIdx,
        fmText: r.value,
        productCharCellId: r.parentCellId,  // A4의 cellId
      })),
    })

    // ... B1 → B4 → B5 → C4 저장 ...

    // 마지막: FC 저장 (모든 FK 참조 대상이 이미 저장됨)
    await tx.failureChain.createMany({
      data: parsed.fc.rows.map(r => ({
        cellId: r.cellId,
        fmCellId: r.fmCellId,
        feCellId: r.feCellId,
        weCellId: r.weCellId,
        causeCellId: r.causeCellId,
        pcCellId: r.pcCellId,
        dcCellId: r.dcCellId,
        severity: r.severity,
        occurrence: r.occurrence,
        detection: r.detection,
        ap: r.ap,
      })),
    })

    return { success: true, summary: buildImportSummary(parsed) }
  }, {
    isolationLevel: 'Serializable',  // 동시 import 방지
    timeout: 30000,
  })

  return Response.json(result)
}
```

- [ ] 전체 Import를 단일 `prisma.$transaction` 으로 래핑
- [ ] `isolationLevel: 'Serializable'` 적용
- [ ] 저장 순서가 파싱 순서와 일치 (A4 먼저, FC 마지막)
- [ ] `createMany` 사용 (개별 create 루프 금지)
- [ ] `skipDuplicates: false` — cellId PK 중복은 파싱 단계에서 이미 제거됨
- [ ] 트랜잭션 실패 시 전체 롤백 (부분 저장 없음)

### 3-3. Upsert 방지 정책

```typescript
// ❌ 금지: skipDuplicates + upsert 혼용
await tx.processProductChar.createMany({ skipDuplicates: true })

// ✅ 올바른 정책:
// 1. 파싱 단계에서 cellId 중복 제거 완료
// 2. DB에는 createMany만 사용 (upsert 금지)
// 3. 재import 시 해당 procNo 데이터 전체 삭제 후 재생성
```

- [ ] `upsert` 사용 금지 → 재import = DELETE + createMany
- [ ] 재import 전 삭제 범위: 해당 procNo의 모든 엔티티 (cascade delete)
- [ ] 삭제 범위 확인 순서: FC → FA → A5/A6 → A4 → B4/B5 → B1 → A3 → A2 → A1

---

## 4단계: buildWorksheetState 재구축

### 4-1. A4 카테시안 복제 완전 제거

```typescript
// ❌ 절대 금지 패턴 (카테시안 버그 원인)
const worksheetState = functions.flatMap(a3 => ({
  ...a3,
  productChars: a4Items.map(a4 => ({
    id: uid(),          // ← 매 A3마다 A4 복제 → 고아 PC 발생
    ...a4
  }))
}))

// ✅ 올바른 패턴
// A4는 공정 단위로 DB에서 1회만 조회
const sharedA4s = await tx.processProductChar.findMany({
  where: { procNo: processNo }
})
// A3은 sharedA4s의 cellId를 FK로만 참조
const worksheetState = {
  process: processRecord,
  sharedProductChars: sharedA4s,   // 공유 엔티티
  functions: a3Records,             // A4 복제 없음
  failureModes: a5Records.map(fm => ({
    ...fm,
    productChar: sharedA4s.find(a4 => a4.cellId === fm.productCharCellId)
  }))
}
```

- [ ] `buildWorksheetState.ts` 에서 `a4Items.map(a4 => ({ id: uid() }))` 패턴 완전 제거
- [ ] `distribute()` 함수 호출 완전 제거
- [ ] A4는 DB에서 조회한 `cellId` 기준으로 참조
- [ ] FM과 A4 연결: `fm.productCharCellId === a4.cellId` 비교

### 4-2. 워크시트 렌더링 FK 검증

```typescript
// buildWorksheetState 완료 후 불변 조건 검증
function assertWorksheetInvariants(ws: WorksheetState): void {
  // 불변 1: 모든 FM에 유효한 productChar 존재
  for (const fm of ws.failureModes) {
    if (!fm.productChar) {
      throw new Error(`FM[${fm.cellId}]: productChar 연결 없음 (고아 FM)`)
    }
  }

  // 불변 2: 고아 A4 없음 (FM이 없는 A4)
  const fmProductCharIds = new Set(ws.failureModes.map(fm => fm.productCharCellId))
  for (const a4 of ws.sharedProductChars) {
    if (!fmProductCharIds.has(a4.cellId)) {
      console.warn(`A4[${a4.cellId}]: 연결된 FM 없음 (고아 A4)`)
      // 경고만 (오류 아님 - A4만 있고 FM 없는 경우 허용)
    }
  }

  // 불변 3: FC의 모든 FK가 유효
  for (const fc of ws.failureChains) {
    if (!ws.failureModes.find(fm => fm.cellId === fc.fmCellId)) {
      throw new Error(`FC[${fc.cellId}]: fmCellId[${fc.fmCellId}] 연결 없음`)
    }
  }
}
```

- [ ] `buildWorksheetState.ts` 마지막에 `assertWorksheetInvariants()` 호출
- [ ] 불변 조건 실패 시 상위 호출자에 오류 throw (무시 금지)

---

## 5단계: 고장사슬 연결 (failureChainInjector) 재구축

### 5-1. FK 기반 고장사슬 주입

```typescript
// failureChainInjector.ts 핵심 로직

export function injectFailureChains(
  worksheetState: WorksheetState,
  fcRecords: FCRecord[]   // DB에서 조회한 FC 레코드 (FK 포함)
): WorksheetState {
  // FM에 FC 주입 - cellId 기준 매칭 (문자열 비교 아님)
  const enrichedFMs = worksheetState.failureModes.map(fm => {
    const linkedFCs = fcRecords.filter(fc => fc.fmCellId === fm.cellId)
    return {
      ...fm,
      failureChains: linkedFCs.map(fc => ({
        ...fc,
        // FK resolve: cellId → 실제 엔티티
        workElement: worksheetState.workElements.find(b1 => b1.cellId === fc.weCellId),
        cause: worksheetState.causes.find(b4 => b4.cellId === fc.causeCellId),
        prevControl: fc.pcCellId
          ? worksheetState.prevControls.find(b5 => b5.cellId === fc.pcCellId)
          : null,
        detControl: fc.dcCellId
          ? worksheetState.detControls.find(a6 => a6.cellId === fc.dcCellId)
          : null,
      }))
    }
  })

  return { ...worksheetState, failureModes: enrichedFMs }
}
```

- [ ] FK 매칭이 `cellId === cellId` 비교 (문자열 명칭 비교 없음)
- [ ] FK resolve 실패 시 → 경고 로그 (null로 처리, 오류 throw 아님)
- [ ] FC 주입 후 FM별 고장사슬 수 검증 로그 출력

### 5-2. 고장사슬 매칭률 검증

```typescript
// 고장사슬 주입 완료 후 매칭률 계산
function validateChainLinkage(
  fcRecords: FCRecord[],
  enrichedFMs: FailureModeWithChains[]
): ChainLinkageReport {
  const totalFC = fcRecords.length
  const linkedFC = enrichedFMs.flatMap(fm => fm.failureChains).length
  const orphanFC = fcRecords.filter(fc =>
    !enrichedFMs.find(fm => fm.cellId === fc.fmCellId)
  ).length

  return {
    totalFC,
    linkedFC,
    orphanFC,
    matchRate: (linkedFC / totalFC * 100).toFixed(1) + '%',
    // 목표: 100% (이전 39%에서 100%로)
  }
}
```

- [ ] 매칭률 100% 달성 확인
- [ ] 미연결 FC 목록 로그 출력 (0건이어야 함)
- [ ] 고아 FC (fmCellId가 없거나 매칭 안 되는 FC) 0건 확인

---

## 6단계: 통합 검증 체크리스트

### 6-1. 파싱 단계 검증

- [ ] 19개 시트 모두 파싱됨
- [ ] 모든 행에 cellId, parentCellId, procNo, rowIdx, colIdx, seqIdx 존재
- [ ] Map 7개 (`a4Map`, `a5Map`, `b1Map`, `b4Map`, `b5Map`, `c4Map`, `a6Map`) 모두 구축됨
- [ ] FC 파싱 후 FK 역조회 실패 0건 (또는 실패 목록 출력)
- [ ] 공정번호 zero-padding 정규화 완료
- [ ] A6 공정번호 중복 없음
- [ ] B5 weName 빈 셀 없음

### 6-2. DB 저장 검증

```sql
-- 저장 완료 후 실행할 검증 쿼리

-- 1. 고아 A4 확인 (FM이 없는 A4 - 경고만)
SELECT pc.cell_id, pc.char_name, pc.proc_no
FROM process_product_chars pc
LEFT JOIN failure_modes fm ON fm.product_char_cell_id = pc.cell_id
WHERE fm.cell_id IS NULL;

-- 2. 고아 FM 확인 (A4 없는 FM - 오류)
SELECT fm.cell_id, fm.fm_text, fm.proc_no
FROM failure_modes fm
LEFT JOIN process_product_chars pc ON pc.cell_id = fm.product_char_cell_id
WHERE pc.cell_id IS NULL;
-- 결과: 0건이어야 함

-- 3. FK 없는 FC 확인 (오류)
SELECT fc.cell_id, fc.proc_no
FROM failure_chains fc
LEFT JOIN failure_modes fm ON fm.cell_id = fc.fm_cell_id
WHERE fm.cell_id IS NULL;
-- 결과: 0건이어야 함

-- 4. WE 없는 FC 확인 (오류)
SELECT fc.cell_id
FROM failure_chains fc
LEFT JOIN work_elements we ON we.cell_id = fc.we_cell_id
WHERE we.cell_id IS NULL;
-- 결과: 0건이어야 함

-- 5. 데이터 건수 비교 (재import 후 증감 없어야 함)
SELECT 'A4' as sheet, COUNT(*) FROM process_product_chars
UNION ALL SELECT 'A5', COUNT(*) FROM failure_modes
UNION ALL SELECT 'FC', COUNT(*) FROM failure_chains
UNION ALL SELECT 'B1', COUNT(*) FROM work_elements;
```

- [ ] 고아 FM: 0건
- [ ] FK 없는 FC: 0건
- [ ] WE 없는 FC: 0건
- [ ] 재import 후 데이터 건수 동일 (증감 없음)

### 6-3. buildWorksheetState 검증

- [ ] `assertWorksheetInvariants()` 통과 (오류 0건)
- [ ] A4 UUID 수 = DB ProcessProductChar 수 (복제 없음)
- [ ] 각 공정별 FM 수 = Import 엑셀 A5 행 수

### 6-4. 고장사슬 연결 검증

- [ ] FC 매칭률 100%
- [ ] 고아 FC 0건
- [ ] WE 연결 실패 0건
- [ ] PC 연결 실패 0건 (PC가 있는 FC 한정)
- [ ] DC 연결 실패 0건 (DC가 있는 FC 한정)

### 6-5. TypeScript 컴파일 검증

```bash
npx tsc --noEmit
# 오류 0건

npx jest --testPathPattern="import|pipeline|failureChain|cellId"
# 테스트 전체 통과
```

- [ ] TypeScript 컴파일 오류 0건
- [ ] 관련 Jest 테스트 전체 통과
- [ ] `distribute()` 함수 참조 0건 (`grep -r "distribute(" src/`)
- [ ] 랜덤 UUID 생성 참조 0건 (`grep -r "uid()\|uuidv4()\|nanoid()" src/lib/import`)

---

## 7단계: Forge 실행 프로토콜

### Forge PLAN 단계

```
1. 이 파일(SMART_FMEA_REBUILD_MASTER.md) 전체 로드
2. fmea-bug-fix SKILL.md 로드
3. 현재 코드베이스 파일 목록 수집 (1-1 체크리스트 실행)
4. 각 파일별 현재 UUID 생성 방식 확인 (1-2 체크리스트 실행)
5. 수정 범위 확정 후 PLAN 완료 선언
```

### Forge EXECUTE 단계

```
순서:
1. buildCellId() 함수 구현 및 유틸 파일 생성
2. 7개 Map 구축 로직 구현 (a4Map ~ a6Map)
3. 각 시트 파서 수정 (A4 → A5 → B1 → B4 → B5 → C4 → FC 순)
4. schema.prisma 수정 (cellId @id 적용)
5. migration 실행
6. Import route.ts 수정 (트랜잭션 + createMany)
7. buildWorksheetState.ts 수정 (카테시안 제거 + assertInvariants)
8. failureChainInjector.ts 수정 (cellId 기반 FK 매칭)
```

### Forge VERIFY 단계

```
순서:
1. npx tsc --noEmit → 오류 0건
2. 6-2 검증 쿼리 전체 실행 → 0건 확인
3. 6-4 매칭률 확인 → 100%
4. 재import 후 데이터 건수 비교 → 증감 없음
```

---

## 8단계: 재발방지 영구 규칙

### 코드에 박아야 할 불변 규칙

```typescript
// invariants.ts - 이 파일은 절대 수정 금지

export const IMMUTABLE_RULES = {
  // 규칙 1: A4는 복제 금지
  NO_A4_CLONE: 'A4(ProcessProductChar)를 A3 내부에서 복제 생성 금지',
  // 규칙 2: FK는 cellId 기반
  FK_BY_CELLID: 'FK 연결은 반드시 cellId 기준, 문자열 명칭 비교 금지',
  // 규칙 3: 트랜잭션 필수
  SINGLE_TX: 'Import는 단일 prisma.$transaction 내에서 완료',
  // 규칙 4: distribute() 금지
  NO_DISTRIBUTE: 'distribute() 함수를 FM-PC 연결에 사용 금지',
  // 규칙 5: 파싱 순서 고정
  PARSE_ORDER: 'A4 파싱 완료 후 A5, B1 완료 후 B4/B5, 모두 완료 후 FC',
} as const
```

### PR/커밋 전 자동 검증 (Git Hook)

```bash
# .git/hooks/pre-commit
#!/bin/bash
# distribute() 사용 금지
if grep -r "distribute(" src/lib/import; then
  echo "❌ distribute() 사용 금지 (invariants.ts 참조)"
  exit 1
fi
# 랜덤 UUID 금지 (import 경로에서)
if grep -r "uid()\|uuidv4()\|nanoid()" src/lib/import; then
  echo "❌ 랜덤 UUID 금지 — buildCellId() 사용"
  exit 1
fi
echo "✅ 불변 규칙 검사 통과"
```

- [ ] `invariants.ts` 파일 생성
- [ ] Git pre-commit hook 설정
- [ ] `IMMUTABLE_RULES` 를 코드 리뷰 기준으로 등록

---

## 빠른 참조: 시트별 cellId 생성 공식 요약

### 개별 시트

| 시트 | cellId 공식 | parentCellId | Map 키 |
|------|------------|-------------|--------|
| A1 | `A1_{procNo}_{row}_001_{seq}_ROOT` | ROOT | `procNo` |
| A2 | `A2_{procNo}_{row}_002_{seq}_{a1CellId}` | A1 cellId | - |
| A3 | `A3_{procNo}_{row}_003_{seq}_{a1CellId}` | A1 cellId | - |
| A4 | `A4_{procNo}_{row}_004_{seq}_{a1CellId}` | A1 cellId | `${procNo}::${charName}` |
| A5 | `A5_{procNo}_{row}_005_{seq}_{a4CellId}` | **A4 cellId** | `${procNo}::${fmText}` |
| A6 | `A6_{procNo}_{row}_006_001_{a1CellId}` | A1 cellId | `procNo` |
| B1 | `B1_{procNo}_{row}_001_{seq}_{a1CellId}` | A1 cellId | `${procNo}::${weName}` |
| B2 | `B2_{procNo}_{row}_004_{seq}_{b1CellId}` | B1 cellId | - |
| B3 | `B3_{procNo}_{row}_005_{seq}_{b1CellId}` | B1 cellId | - |
| B4 | `B4_{procNo}_{row}_006_{seq}_{b1CellId}` | **B1 cellId** | `${procNo}::${causeText}` |
| B5 | `B5_{procNo}_{row}_007_{seq}_{b1CellId}` | **B1 cellId** | `${procNo}::${weName}::${pcMethod}` |
| C1 | `C1_00_{row}_001_{seq}_ROOT` | ROOT | `feCategory` |
| C2 | `C2_00_{row}_002_{seq}_{c1CellId}` | C1 cellId | - |
| C3 | `C3_00_{row}_003_{seq}_{c1CellId}` | C1 cellId | - |
| C4 | `C4_00_{row}_004_{seq}_{c1CellId}` | C1 cellId | `${feCategory}::${effectText}` |
| FC | `FC_{procNo}_{row}_004_{seq}_{fmCellId}` | **A5 cellId** | - |
| FA | `FA_{procNo}_{row}_001_{seq}_{fcCellId}` | FC cellId | - |

### 통합시트 — 열별 원본 시트 코드 분해

| 통합시트 | 열 번호 | 헤더명 | 분해 시트 | cellId 공식 |
|---------|---------|--------|----------|------------|
| **IL1 (L1통합)** | 1 | C1.구분 | `C1` | `C1_00_{row}_001_{seq}_ROOT` |
| IL1 | 2 | C2.제품기능 | `C2` | `C2_00_{row}_002_{seq}_{c1CellId}` |
| IL1 | 3 | C3.요구사항 | `C3` | `C3_00_{row}_003_{seq}_{c1CellId}` |
| IL1 | 4 | C4.고장영향 | `C4` | `C4_00_{row}_004_{seq}_{c1CellId}` |
| **IL2 (L2통합)** | 1 | A1.공정번호 | `A1` | `A1_{procNo}_001_001_001_ROOT` |
| IL2 | 2 | A2.공정명 | `A2` | `A2_{procNo}_{row}_002_{seq}_{a1CellId}` |
| IL2 | 3 | A3.공정기능 | `A3` | `A3_{procNo}_{row}_003_{seq}_{a1CellId}` |
| IL2 | 4 | A4.제품특성 | `A4` | `A4_{procNo}_{row}_004_{seq}_{a1CellId}` |
| IL2 | 5 | A5.고장형태 | `A5` | `A5_{procNo}_{row}_005_{seq}_{a4CellId}` |
| IL2 | 6 | A6.검출관리 | `A6` | `A6_{procNo}_{row}_006_001_{a1CellId}` |
| **IL3 (L3통합)** | 1 | B1.작업요소 | `B1` | `B1_{procNo}_{row}_001_{seq}_{a1CellId}` |
| IL3 | 2 | 4M구분 | `B1` 속성 | B1 cellId에 category4M 속성 포함 |
| IL3 | 3 | 공정번호 | A1 참조 | a1Map 역조회 키 |
| IL3 | 4 | B2.요소기능 | `B2` | `B2_{procNo}_{row}_004_{seq}_{b1CellId}` |
| IL3 | 5 | B3.공정특성 | `B3` | `B3_{procNo}_{row}_005_{seq}_{b1CellId}` |
| IL3 | 6 | B4.고장원인 | `B4` | `B4_{procNo}_{row}_006_{seq}_{b1CellId}` |
| IL3 | 7 | B5.예방관리(발생 전 방지) | `B5` | `B5_{procNo}_{row}_007_{seq}_{b1CellId}` |

### FC 시트 — 9열 전체 FK cellId 매핑

| FC 열 | 헤더명 | 필드명 | FK cellId 필드 | 역조회 Map |
|-------|--------|--------|--------------|-----------|
| 1 | FE구분 | feCategory | `feCategoryCellId` | `c1Map.get(feCategory)` |
| 2 | FE(고장영향) | feText | `feCellId` | `c4Map.get(`${feCategory}::${feText}`)` |
| 3 | L2-1.공정번호 | procNo | `procCellId` | `a1Map.get(procNo)` |
| 4 | FM(고장형태) | fmText | `fmCellId` | `a5Map.get(`${procNo}::${fmText}`)` |
| 5 | 4M | category4M | *(FK 없음, B1 속성)* | weCellId로 B1 전체 참조 |
| 6 | 작업요소(WE) | weText | `weCellId` | `b1Map.get(`${procNo}::${weText}`)` |
| 7 | FC(고장원인) | causeText | `causeCellId` | `b4Map.get(`${procNo}::${causeText}`)` |
| 8 | B5.예방관리(발생 전 방지) | pcText | `pcCellId` *(nullable)* | `b5Map.get(`${procNo}::${weText}::${pcText}`)` |
| 9 | A6.검출관리(발생 후 검출) | dcText | `dcCellId` *(nullable)* | `a6Map.get(procNo)` |

---

*이 파일은 Forge PLAN 시작 전 반드시 전체 로드할 것.*  
*수정 시 버전을 올리고 변경 이력을 기록할 것.*  
*최종 목표: Import 1회 완료 후 FC 매칭률 100%, 재import 후 데이터 증감 0.*