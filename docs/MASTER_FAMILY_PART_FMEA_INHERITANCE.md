# 📚 마스터/Family/Part FMEA 상속관계 설계 문서

> **작성일**: 2026-01-10  
> **버전**: 1.0.0  
> **상태**: 개발 진행 중

---

## 📋 목차

1. [개요](#1-개요)
2. [FMEA 유형 정의](#2-fmea-유형-정의)
3. [상속 관계](#3-상속-관계)
4. [상속 데이터 범위](#4-상속-데이터-범위)
5. [UI 표시 규격](#5-ui-표시-규격)
6. [API 설계](#6-api-설계)
7. [DB 스키마](#7-db-스키마)
8. [구현 체크리스트](#8-구현-체크리스트)

---

## 1. 개요

### 1.1 목적

FMEA(Failure Mode and Effects Analysis)는 제조 현장에서 **표준화**와 **재사용**이 핵심입니다.  
Master → Family → Part 계층 구조를 통해:

- ✅ 표준 공정/기능/고장 데이터 재사용
- ✅ 일관된 분석 품질 유지
- ✅ 신규 FMEA 작성 시간 단축 (80% 이상)
- ✅ Lessons Learned 자동 전파

### 1.2 적용 범위

| 범위 | 설명 |
|------|------|
| PFMEA | 공정 FMEA (Process FMEA) |
| DFMEA | 설계 FMEA (향후 확장) |

---

## 2. FMEA 유형 정의

### 2.1 유형별 역할

| 유형 | 코드 | 색상 | 역할 | 예시 |
|------|------|------|------|------|
| **Master** | M | 🟣 보라 | 전사 표준 공정 템플릿 | 타이어 제조 마스터 |
| **Family** | F | 🔵 파랑 | 제품군별 템플릿 | 승용차 타이어, 트럭 타이어 |
| **Part** | P | 🟢 초록 | 실제 부품/제품별 FMEA | 205/55R16 타이어 |

### 2.2 ID 생성 규칙

```
형식: pfm{YY}-{T}{NNN}

- pfm: PFMEA 약어 (소문자)
- YY: 연도 2자리 (예: 26 = 2026년)
- T: 유형 구분자 (M/F/P)
- NNN: 시리얼 번호 3자리

예시:
- pfm26-M001: 2026년 첫 번째 Master FMEA
- pfm26-F001: 2026년 첫 번째 Family FMEA
- pfm26-P001: 2026년 첫 번째 Part FMEA
```

---

## 3. 상속 관계

### 3.1 계층 구조

```
                    ┌─────────────────────┐
                    │  🟣 Master FMEA     │
                    │  (전사 표준)         │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ 🔵 Family FMEA  │ │ 🔵 Family FMEA  │ │ 🟢 Part FMEA   │
│ (승용차 타이어)  │ │ (트럭 타이어)    │ │ (직접 상속)    │
└────────┬────────┘ └────────┬────────┘ └─────────────────┘
         │                   │
    ┌────┴────┐         ┌────┴────┐
    ▼         ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│🟢 Part│ │🟢 Part│ │🟢 Part│ │🟢 Part│
│P001   │ │P002   │ │P003   │ │P004   │
└───────┘ └───────┘ └───────┘ └───────┘
```

### 3.2 상속 규칙

| 규칙 | 설명 |
|------|------|
| **Master → Family** | Family는 Master를 상속받아 제품군 특화 |
| **Master → Part** | Part가 Master를 직접 상속 가능 |
| **Family → Part** | Part가 Family를 상속받아 부품 특화 |
| **Part → Part** | 유사 부품끼리 상속 가능 |
| **Family → Family** | ❌ 불가 (Master만 상속 가능) |
| **Part → Master** | ❌ 불가 (역방향 상속 불가) |

### 3.3 상속 필드

```typescript
interface FMEAProject {
  id: string;               // pfm26-P001
  fmeaType: 'M' | 'F' | 'P';
  
  // ✅ 상속 관계 필드 (신규)
  parentFmeaId: string | null;     // 상위 FMEA ID (예: pfm26-M001)
  parentFmeaType: string | null;   // 상위 FMEA 유형 (M/F/P)
  inheritedAt: Date | null;        // 상속 일시
  
  // 기존 필드
  project: {...};
  fmeaInfo: {...};
}
```

---

## 4. 상속 데이터 범위

### 4.1 상속 대상

| 단계 | 데이터 | 상속 여부 | 설명 |
|------|--------|----------|------|
| 1단계 | 기본정보 | ❌ | 새 FMEA 고유 정보 |
| 2단계 | L1 구조 (완제품) | ✅ | 완제품명, 유형 |
| 2단계 | L2 구조 (공정) | ✅ | 공정번호, 공정명 |
| 2단계 | L3 구조 (작업요소) | ✅ | 4M, 작업요소명 |
| 3단계 | L1 기능 | ✅ | 기능, 요구사항 |
| 3단계 | L2 기능 | ✅ | 기능, 제품특성 |
| 3단계 | L3 기능 | ✅ | 기능, 공정특성 |
| 4단계 | 고장영향 (FE) | ✅ | 영향, 심각도 기준 |
| 4단계 | 고장형태 (FM) | ✅ | 형태 목록 |
| 4단계 | 고장원인 (FC) | ✅ | 원인, 발생도 기준 |
| 4단계 | 고장연결 | ✅ | FE-FM-FC 연결 |
| 5단계 | 현 예방관리 | ⚙️ 선택 | 사용자 선택 |
| 5단계 | 현 검출관리 | ⚙️ 선택 | 사용자 선택 |
| 5단계 | SOD 평가값 | ❌ | 새로 평가 필요 |
| 6단계 | 개선 조치 | ❌ | 새로 작성 필요 |

### 4.2 상속 시 ID 재생성

```
원본 (Master):
- l2-m001-proc-001 → l2-p002-proc-001 (새 ID)
- l3-m001-we-001   → l3-p002-we-001   (새 ID)
- func-m001-001    → func-p002-001    (새 ID)
- fc-m001-001      → fc-p002-001      (새 ID)

✅ 모든 내부 참조(FK)도 함께 업데이트
```

---

## 5. UI 표시 규격

### 5.1 등록 화면

```
┌─────────────────────────────────────────────────────────────────┐
│ 기획 및 준비 (1단계)                                             │
├─────────────────────────────────────────────────────────────────┤
│ FMEA ID    │ pfm26-P002           │                             │
│            │ 🔵 ← pfm26-M001 기반  │  ← 상속 정보 표시           │
├─────────────────────────────────────────────────────────────────┤
│ 자동생성   │ (상속받은 경우 "기반 FMEA: pfm26-M001" 표시)        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 리스트 화면

```
┌────┬──────┬────────────┬────────────────┬───────────────────────┐
│ No │ TYPE │ FMEA ID    │ 상위 FMEA      │ FMEA명                │
├────┼──────┼────────────┼────────────────┼───────────────────────┤
│ 1  │ 🟣 M │ pfm26-M001 │ -              │ 타이어 공정 마스터    │
│ 2  │ 🔵 F │ pfm26-F001 │ 🟣 pfm26-M001  │ 승용차 타이어         │
│ 3  │ 🟢 P │ pfm26-P001 │ 🔵 pfm26-F001  │ 205/55R16 타이어      │
│ 4  │ 🟢 P │ pfm26-P002 │ 🟣 pfm26-M001  │ 직접 상속 테스트      │
└────┴──────┴────────────┴────────────────┴───────────────────────┘
```

### 5.3 워크시트 상단 배너

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔵 상속 모드 | 기반: pfm26-M001 (타이어 공정 마스터)            │
│              | 공정 7개, 작업요소 21개, 기능 35개 상속됨        │
│              | [원본 보기] [상속 해제]                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. API 설계

### 6.1 상속 API

```
GET /api/fmea/inherit

Query Parameters:
- sourceId: 원본 FMEA ID (예: pfm26-M001)
- targetId: 대상 FMEA ID (예: pfm26-P002)

Response:
{
  "success": true,
  "inherited": {
    "l1": { "name": "타이어 제조라인", "type": "완제품" },
    "l2": [
      { "id": "...", "no": "10", "name": "원재료 입고", ... },
      { "id": "...", "no": "20", "name": "배합", ... }
    ],
    "functions": [...],
    "failures": [...],
    "failureLinks": [...]
  },
  "source": {
    "fmeaId": "pfm26-M001",
    "fmeaType": "M",
    "subject": "타이어 공정 마스터"
  },
  "stats": {
    "processes": 7,
    "workElements": 21,
    "functions": 35,
    "failureEffects": 12,
    "failureModes": 28,
    "failureCauses": 45
  }
}
```

### 6.2 프로젝트 API 수정

```typescript
// POST /api/fmea/projects
{
  "fmeaId": "pfm26-P002",
  "fmeaType": "P",
  "parentFmeaId": "pfm26-M001",  // ✅ 신규 필드
  "parentFmeaType": "M",         // ✅ 신규 필드
  "project": {...},
  "fmeaInfo": {...}
}
```

---

## 7. DB 스키마

### 7.1 FmeaInfo 테이블 수정

```sql
-- 기존 테이블에 컬럼 추가
ALTER TABLE "FmeaInfo" ADD COLUMN "parentFmeaId" TEXT;
ALTER TABLE "FmeaInfo" ADD COLUMN "parentFmeaType" TEXT;
ALTER TABLE "FmeaInfo" ADD COLUMN "inheritedAt" TIMESTAMP;

-- 인덱스 추가
CREATE INDEX idx_fmea_parent ON "FmeaInfo"("parentFmeaId");
```

### 7.2 상속 이력 테이블 (선택)

```sql
CREATE TABLE "FmeaInheritanceLog" (
  id TEXT PRIMARY KEY,
  "sourceFmeaId" TEXT NOT NULL,
  "targetFmeaId" TEXT NOT NULL,
  "inheritedData" JSONB,  -- 상속된 데이터 스냅샷
  "inheritedAt" TIMESTAMP DEFAULT NOW(),
  "inheritedBy" TEXT      -- 작업자
);
```

---

## 8. 구현 체크리스트

### 8.1 Phase 1: 핵심 기능 (필수)

- [ ] 상속 API 생성 (`/api/fmea/inherit/route.ts`)
- [ ] useWorksheetState에 baseId, mode 파라미터 처리
- [ ] 상속 데이터 복사 로직
- [ ] DB 스키마 수정 (parentFmeaId 추가)
- [ ] 리스트 화면 "상위 FMEA" 컬럼 추가
- [ ] 등록 화면 상속 정보 표시

### 8.2 Phase 2: UX 개선 (권장)

- [ ] 워크시트 상속 모드 배너
- [ ] 상속 확인 모달
- [ ] 상속 통계 표시
- [ ] 원본 FMEA 보기 링크

### 8.3 Phase 3: 고급 기능 (선택)

- [ ] 계층 트리뷰
- [ ] 상속 이력 로그
- [ ] Master 변경 시 하위 FMEA 알림
- [ ] 부분 상속 선택 기능

---

## 📝 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-10 | 최초 작성 |

---

## 🔗 관련 문서

- [DEVELOPMENT_HISTORY.md](./DEVELOPMENT_HISTORY.md)
- [DB_SCHEMA.md](./DB_SCHEMA.md)
- [ZEBRA_STRIPE_RULES.md](./ZEBRA_STRIPE_RULES.md)











