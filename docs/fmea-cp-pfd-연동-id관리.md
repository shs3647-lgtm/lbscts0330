# FMEA / CP / PFD 연동 ID 관리 체계

**작성일**: 2026-01-28  
**상태**: ✅ 확정  
**버전**: 2.1.0

---

## 1. 개요

### 1.1 목표
FMEA, CP, PFD, APQP 간의 연동 시 ID 생성 및 관리 규칙을 정의합니다.

### 1.2 핵심 원칙
- **기본 ID + 연동 상태 접미사** (`-L{NN}` / `-S`)
- **복수 연동 지원**: 1개 문서가 여러 연동 그룹에 참여 가능
- ID만 보면 연동 여부와 그룹 번호 즉시 파악

---

## 2. ID 체계

### 2.1 ID 구조
```
[접두사][연도]-[유형][일련번호]-[연동상태][연동번호]

예시: pfm26-m001-L01

pfm   = 모듈 (PFMEA)
26    = 연도 (2026)
m     = 유형 (Master)
001   = 일련번호
L     = 연동 상태 (Linked)
01    = 연동 그룹 번호
```

### 2.2 연동 상태 코드

| 코드 | 의미 | 설명 |
|------|------|------|
| **L{NN}** | Linked | 연동됨 - NN번 연동 그룹에 속함 |
| **S** | Solo | 단독 - 독립 문서 (연동 없음) |

### 2.3 모듈별 ID 예시

| 모듈 | 연동 ID 예시 | 단독 ID 예시 | 유형 |
|------|-------------|-------------|------|
| **PFMEA** | `pfm26-m001-L01` | `pfm26-m001-S` | M/F/P |
| **PFD** | `pfd26-m001-L01` | `pfd26-m001-S` | M/F/P |
| **CP** | `cp26-t001-L01` | `cp26-d002-S` | T/R/D/F |
| **APQP** | `apqp26-001-L01` | `apqp26-001-S` | - |
| **DFMEA** | `dfm26-m001-L01` | `dfm26-m001-S` | M/F/P |

### 2.4 유형 코드

#### PFMEA / PFD / DFMEA 유형
| 코드 | 의미 | 설명 |
|------|------|------|
| **M** | Master | 마스터 문서 (여러 Family 포함) |
| **F** | Family | 패밀리 문서 (여러 Part 포함) |
| **P** | Part | 개별 부품 문서 |

#### CP 유형 (4가지)
| 코드 | 의미 | 설명 |
|------|------|------|
| **T** | proTotype | 시작품 단계 |
| **L** | preLaunch | 양산 전 단계 |
| **P** | Production | 양산 단계 |
| **S** | Safe-launch | 안전 런치 단계 |

---

## 3. 연동 규칙

### 3.1 연동 그룹 개념
```
┌─────────────────────────────────────────────────────────────────┐
│                    연동 그룹 예시                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [연동 그룹 L01] - 첫 번째 프로젝트                              │
│   PFMEA: pfm26-m001-L01                                         │
│      ↔ PFD: pfd26-m001-L01                                      │
│      ↔ CP: cp26-m001-L01                                        │
│                                                                 │
│  [연동 그룹 L02] - 두 번째 프로젝트 (같은 PFMEA 재사용)          │
│   PFMEA: pfm26-m001-L02 (참조)                                  │
│      ↔ PFD: pfd26-m001-L02                                      │
│      ↔ CP: cp26-m001-L02                                        │
│      ↔ CP: cp26-m001-L03 (추가 CP)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 1:N 연동 지원
- 1개 PFMEA → 여러 PFD → 각각 여러 CP
- 연동 그룹 번호로 구분: `-L01`, `-L02`, `-L03` ...

### 3.3 레벨 매칭 (동일 레벨끼리만 연동)
```
M-PFMEA ↔ M-PFD ↔ M-CP
F-PFMEA ↔ F-PFD ↔ F-CP
P-PFMEA ↔ P-PFD ↔ P-CP
```

---

## 4. ID 생성 함수

### 4.1 기본 ID 생성
```typescript
/**
 * 새 ID 생성
 * @param module - 모듈명 ('pfm', 'pfd', 'cp', 'apqp', 'dfm')
 * @param type - 유형 ('m', 'f', 'p')
 * @param serialNo - 일련번호
 * @param linkGroupNo - 연동 그룹 번호 (0 = Solo, 1~99 = Linked)
 */
function generateDocId(
  module: string, 
  type: string, 
  serialNo: number,
  linkGroupNo: number = 0
): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const serial = String(serialNo).padStart(3, '0');
  
  // 연동 상태 접미사
  const linkSuffix = linkGroupNo > 0 
    ? `L${String(linkGroupNo).padStart(2, '0')}`
    : 'S';
  
  // APQP는 유형 코드 없음
  if (module === 'apqp') {
    return `${module}${year}-${serial}-${linkSuffix}`;
  }
  
  return `${module}${year}-${type}${serial}-${linkSuffix}`;
}

// 예시
generateDocId('pfm', 'm', 1, 1);   // 'pfm26-m001-L01'
generateDocId('pfd', 'f', 2, 2);   // 'pfd26-f002-L02'
generateDocId('cp', 'p', 3, 0);    // 'cp26-p003-S' (단독)
generateDocId('apqp', '', 1, 1);   // 'apqp26-001-L01'
```

### 4.2 연동 상태 확인
```typescript
/**
 * ID에서 연동 상태 확인
 */
function isLinked(id: string): boolean {
  return /-L\d{2}$/.test(id);
}

function isSolo(id: string): boolean {
  return /-S$/.test(id);
}

/**
 * 연동 그룹 번호 추출
 * pfm26-m001-L01 → 1
 * pfm26-m001-S → 0
 */
function getLinkGroupNo(id: string): number {
  const match = id.match(/-L(\d{2})$/);
  return match ? parseInt(match[1], 10) : 0;
}
```

### 4.3 연동 문서 ID 생성
```typescript
/**
 * 연동 문서 ID 생성 (같은 그룹 번호 유지)
 * pfm26-m001-L01 → pfd26-m001-L01
 */
function generateLinkedDocId(sourceId: string, targetModule: string): string {
  return sourceId.replace(/^(pfm|pfd|cp|dfm|apqp)/, targetModule);
}

// 예시
generateLinkedDocId('pfm26-m001-L01', 'pfd');  // 'pfd26-m001-L01'
generateLinkedDocId('pfm26-m001-L01', 'cp');   // 'cp26-m001-L01'
```

### 4.4 다음 연동 그룹 번호 생성
```typescript
/**
 * 다음 연동 그룹 번호 계산
 */
function getNextLinkGroupNo(existingIds: string[]): number {
  const linkNos = existingIds
    .filter(id => /-L\d{2}$/.test(id))
    .map(id => {
      const match = id.match(/-L(\d{2})$/);
      return match ? parseInt(match[1], 10) : 0;
    });
  
  return linkNos.length > 0 ? Math.max(...linkNos) + 1 : 1;
}

// 예시
getNextLinkGroupNo(['pfm26-m001-L01', 'pfm26-m001-L02']);  // 3
getNextLinkGroupNo(['pfm26-m001-S']);  // 1
```

---

## 5. DB 스키마

### 5.1 ProjectLinkage 테이블
```sql
CREATE TABLE project_linkages (
  id VARCHAR(50) PRIMARY KEY,
  
  -- 연동 그룹 번호
  link_group_no INT NOT NULL,  -- 1~99
  
  -- 연동 ID들
  apqp_no VARCHAR(25),
  pfmea_id VARCHAR(25),
  pfd_no VARCHAR(25),
  cp_no VARCHAR(25),
  dfmea_id VARCHAR(25),
  
  -- 공통 정보
  project_name VARCHAR(100),
  customer_name VARCHAR(100),
  model_year VARCHAR(20),
  
  -- 상태
  status VARCHAR(10) DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. 마이그레이션

### 6.1 기존 ID 변환 규칙
```
기존 ID            →  새 ID
pfm26-m001         →  pfm26-m001-S (단독)
pfm26-m001 (연동)  →  pfm26-m001-L01
pfdl26-f001        →  pfd26-f001-L01
cpl26-p001         →  cp26-p001-L01
pfm26-m001-L       →  pfm26-m001-L01 (번호 보정)
```

---

## 7. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-27 | 초기 버전 (pfdl, cpl 접두사 방식) |
| 2.0.0 | 2026-01-28 | -L/-S 접미사 방식으로 변경 |
| 2.1.0 | 2026-01-28 | -L{NN} 연동 그룹 번호 추가 (복수 연동 지원) |
