# PRD: FMEA 개정관리 시스템 (Revision Management)

> **문서 버전**: 1.0.0
> **작성일**: 2026-02-10
> **상태**: 진단 완료 → 최적화 진행

---

## 1. 현황 진단 요약

### 1.1 전체 플로우 (AS-IS)

```
[PFMEA 리스트] ──── "개정" 버튼 클릭 ────→ [개정관리 페이지]
     │                                           │
     │  ?id={fmeaId}&mode=newrev                  │
     │                                           ├─ 프로젝트 선택/로드
     │                                           ├─ 개정 이력 테이블 편집
     │                                           ├─ 작성/검토/승인 3단계
     │                                           ├─ 변경 이력 조회
     │                                           ├─ 회의록 작성
     │                                           │
     │                                           ├── "등록화면으로 이동" ──→ [등록 페이지]
     │                                           │    ?id={fmeaId}&rev=R01    │
     │                                           │                           ├─ 기초정보 수정
     │                                           │                           └─ 개정번호 배지 표시
     │                                           │
     │                                           └── "저장" ──→ POST /api/fmea/revisions
     │                                                          + localStorage 이중 저장
     │
     └─ revisionNo 표시 (Rev.00)
```

### 1.2 관련 파일 맵

| 영역 | 파일 | 행수 | 상태 |
|------|------|------|------|
| **PFMEA 개정 페이지** | `pfmea/revision/page.tsx` | 305 | 모듈화 완료 |
| **개정 데이터 훅** | `pfmea/revision/hooks/useRevisionData.ts` | 352 | console.log 7개 |
| **개정 핸들러 훅** | `pfmea/revision/hooks/useRevisionHandlers.ts` | 377 | `fmeaInfo: any` |
| **개정 테이블** | `pfmea/revision/components/RevisionTable.tsx` | 362 | CODEFREEZE L2 |
| **프로젝트 정보** | `pfmea/revision/components/ProjectInfoTable.tsx` | 105 | 정상 |
| **변경이력 테이블** | `pfmea/revision/components/ChangeHistoryTable.tsx` | 376 | localStorage 혼용 |
| **타입 정의** | `pfmea/revision/types.ts` | 74 | 정상 |
| **유틸리티** | `pfmea/revision/utils.ts` | 124 | 정상 |
| **DFMEA 개정** | `dfmea/revision/page.tsx` | 354 | 함수명 오류 |
| **SOD 이력 훅** | `hooks/revision/useSODHistory.ts` | 220 | 정상 |
| **개정 API** | `api/fmea/revisions/route.ts` | 139 | ID 충돌 위험 |
| **결재 API** | `api/fmea/approval/route.ts` | 251 | DB 실패 무시 |
| **등록정보 API** | `api/fmea/info/route.ts` | 215 | 정상 |
| **리스트 페이지** | `pfmea/list/page.tsx` | 521 | CODEFREEZE L2 |

### 1.3 DB 모델 구조

```
FmeaProject
├── revisionNo: "Rev.00"
├── revMajor: 0, revMinor: 0
│
├── FmeaRevisionHistory (1:N) ─── 개정 이력 + 3단계 워크플로우
│   ├── revisionNumber, revisionHistory
│   ├── create{Position,Name,Date,Status}
│   ├── review{Position,Name,Date,Status}
│   └── approve{Position,Name,Date,Status}
│
├── FmeaOfficialRevision (1:N) ── 공식 Major 개정 기록
│   ├── revMajor, revisionNote, revisedBy
│   └── sodChangeCount
│
├── FmeaVersionBackup (1:N) ───── 데이터 스냅샷
│   ├── version, backupData, compressed
│   └── versionType, triggerType
│
├── FmeaSodHistory (1:N) ──────── SOD 변경 이력
│   ├── fmId, fcId, changeType
│   └── oldValue, newValue
│
└── FmeaApproval (1:N) ────────── 결재 토큰 관리
    ├── token (unique), status
    └── approverEmail, requesterName
```

---

## 2. 발견된 버그 및 문제점

### 2.1 🔴 심각도 HIGH (즉시 수정)

| # | 문제 | 위치 | 영향 |
|---|------|------|------|
| B1 | **DFMEA 함수명 한글 혼용**: `Revision부품agementPageInner` | `dfmea/revision/page.tsx:58` | 가독성, 검색 불가 |
| B2 | **개정번호 계산 버그**: `split('.')[0]` → 항상 major=1 | `pfmea/revision/page.tsx:106` | 신규 개정 항상 Rev.2 |
| B3 | **삭제 시 DB 미반영**: `handleDeleteSelected`가 localStorage만 업데이트 | `useRevisionHandlers.ts:101-108` | DB/localStorage 불일치 |
| B4 | **API POST에서 ID 전달**: `rev.id` 그대로 전달 → UUID 충돌 가능 | `api/fmea/revisions/route.ts:93` | 저장 실패 위험 |

### 2.2 🟠 심각도 MEDIUM (개선 필요)

| # | 문제 | 위치 | 영향 |
|---|------|------|------|
| M1 | **이중 저장**: DB + localStorage 동시 저장, 실패 시 불일치 | `useRevisionData.ts:305-334` | 데이터 신뢰성 저하 |
| M2 | **변경이력 3소스 분산**: SOD=API, confirm/register=localStorage | `ChangeHistoryTable.tsx:103-136` | 이력 누락 위험 |
| M3 | **등록 페이지에서 revisionNo 미저장**: UI 표시만, DB 미반영 | `register/page.tsx` | 개정번호 추적 불가 |
| M4 | **결재 API DB 실패 무시**: DB 저장 실패해도 이메일 발송 진행 | `api/fmea/approval/route.ts` | 감사 추적 불가 |
| M5 | **`fmeaInfo: any` 타입** | `useRevisionHandlers.ts:19` | 타입 안정성 부족 |

### 2.3 🟡 심각도 LOW (코드 품질)

| # | 문제 | 위치 | 영향 |
|---|------|------|------|
| L1 | **console.log 15개** 산재 | `useRevisionData.ts` 7개 등 | 프로덕션 로그 오염 |
| L2 | **빈 행 17개 고정 생성** (7+10) | `ChangeHistoryTable.tsx:306-318` | UI 공간 낭비 |
| L3 | **지연 상태 중복**: 자동 계산 + 수동 선택 혼재 | `RevisionTable.tsx:63-83` | UX 혼란 |

---

## 3. 개정 플로우 상세 분석

### 3.1 리스트 → 개정관리 진입

```typescript
// pfmea/list/page.tsx:307-313
const handleRevision = () => {
    if (selectedRows.size !== 1) return alert('한 번에 하나만 가능');
    const selectedId = Array.from(selectedRows)[0];
    window.location.href = `/pfmea/revision?id=${selectedId}&mode=newrev`;
};
```

**상태**: ✅ 정상 동작

### 3.2 개정관리 → 등록화면 이동

```typescript
// pfmea/revision/page.tsx:104-111
const latestRev = revisions.length > 0
    ? Math.max(...revisions.map(r => parseInt(r.revisionNumber.split('.')[0]) || 1))
    : 1;  // ❌ BUG: "1.03".split('.')[0] = "1" → 항상 1
const newRevNo = isNewRevMode ? latestRev + 1 : latestRev;  // 항상 2
window.location.href = `/pfmea/register?id=${id}&rev=R${String(newRevNo).padStart(2,'0')}`;
```

**버그**: Major 버전만 추출 → Minor 무시 → 개정번호 부정확

### 3.3 등록화면에서 개정번호 활용

```typescript
// pfmea/register/page.tsx:148-154
{revParam && (
    <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">
        {revParam}  // UI 표시만
    </span>
)}
// ❌ DB 저장 로직 없음 - revisionNo 업데이트 안함
```

**문제**: 개정번호가 DB의 `FmeaProject.revisionNo`에 반영되지 않음

### 3.4 개정 저장 (이중 저장 문제)

```typescript
// useRevisionData.ts:305-334
// 1) DB 저장 시도
await fetch('/api/fmea/revisions', { method: 'POST', ... });
// 2) localStorage에도 무조건 저장 (DB 실패 여부 무관)
localStorage.setItem('fmea-revisions', JSON.stringify([...otherRevisions, ...revisions]));
```

**문제**: DB 실패해도 localStorage에 저장 → 불일치

### 3.5 개정 삭제 (DB 미반영)

```typescript
// useRevisionHandlers.ts:101-108
const updated = revisions.filter(r => !selectedRows.has(r.id));
setRevisions(updated);
// ❌ DB API 호출 없이 localStorage만 업데이트
localStorage.setItem('fmea-revisions', JSON.stringify([...otherRevisions, ...updated]));
```

**문제**: 삭제가 DB에 반영되지 않아 새로고침 시 삭제 취소됨

---

## 4. 최적화 계획 (TO-BE)

### 4.1 즉시 수정 (P0)

| # | 작업 | 대상 파일 |
|---|------|----------|
| 1 | DFMEA 함수명 수정: `RevisionManagementPageInner` | `dfmea/revision/page.tsx` |
| 2 | 개정번호 계산 로직 수정: minor 기반 | `pfmea/revision/page.tsx` |
| 3 | 삭제 핸들러에 DB API 호출 추가 | `useRevisionHandlers.ts` |
| 4 | API POST에서 `rev.id` 제외 (UUID 자동 생성) | `api/fmea/revisions/route.ts` |

### 4.2 코드 품질 개선 (P1)

| # | 작업 | 대상 파일 |
|---|------|----------|
| 5 | `fmeaInfo: any` → `FMEAInfoData \| null` 타입 지정 | `useRevisionHandlers.ts` |
| 6 | console.log 15개 → 에러만 유지 | `useRevisionData.ts`, `ChangeHistoryTable.tsx` |
| 7 | 이중 저장 → DB Only 전환 (localStorage 폴백 제거) | `useRevisionData.ts` |

### 4.3 아키텍처 개선 (P2 - 추후)

| # | 작업 | 영향 범위 |
|---|------|----------|
| 8 | 변경이력 localStorage → DB 통합 | ChangeHistoryTable, API 신규 |
| 9 | 등록화면에서 revisionNo DB 저장 | register page, API |
| 10 | DFMEA 개정 페이지 컴포넌트 분리 (PFMEA 구조 복제) | dfmea/revision/ |

---

## 5. 개정번호 체계 표준화

### 현재 상태 (불일치)

| 모듈 | API/DB 포맷 | UI 표시 포맷 | 변환 |
|------|------------|-------------|------|
| PFMEA | `Rev.00` ~ `Rev.09` | `1.00` ~ `1.09` | `normalizeRevisionNumber()` |
| DFMEA | 동일 | 동일 | 동일 |
| CP | `A`, `B`, `C` | `A`, `B`, `C` | 없음 |
| PFD | `pfdNo-01` | `Rev.01` | 없음 |

### 표준안 (TO-BE)

```
FMEA: Rev.{major}.{minor} → 표시: {major}.{minor}
  예: Rev.1.00 → 1.00 (초판)
      Rev.1.01 → 1.01 (소규모 변경)
      Rev.2.00 → 2.00 (대규모 개정)
```

---

## 6. 데이터 흐름 다이어그램 (TO-BE)

```
[리스트] → [개정관리] → [등록화면] → [워크시트]
   │           │             │            │
   │     DB 저장 Only        │      개정번호 반영
   │     (localStorage X)    │      DB update
   │           │             │            │
   └───── GET /api/fmea/revisions ────────┘
          POST /api/fmea/revisions
          DELETE 포함 (현재 미구현)
```

---

## 7. 구현 우선순위

1. **P0 버그 수정** (B1~B4): DFMEA 함수명, 개정번호 계산, 삭제 DB 동기화, API ID 처리
2. **P1 코드 품질** (M5, L1): 타입 수정, console.log 정리, 이중 저장 제거
3. **P2 아키텍처** (M1~M3): DB Only 전환, 변경이력 통합, revisionNo 동기화
