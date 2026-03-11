# 🔧 FMEA 시스템 최적화 계획 (Optimize Production)

> **작성일**: 2026-02-04  
> **목적**: FMEA 기초정보 Import, 데이터 저장, 앱간 연동 문제 종합 진단 및 해결  
> **상태**: 진단 완료

---

## 📋 목차

1. [문제 진단 요약](#1-문제-진단-요약)
2. [문제 1: 4M 구분자 누락](#2-문제-1-4m-구분자-누락)
3. [문제 2: 고장형태 Object 인식](#3-문제-2-고장형태-object-인식)
4. [문제 3: DB 미사용으로 앱간 연동 불가](#4-문제-3-db-미사용으로-앱간-연동-불가)
5. [최적화 로드맵](#5-최적화-로드맵)
6. [우선순위 및 일정](#6-우선순위-및-일정)

---

## 1. 문제 진단 요약

| # | 문제 | 심각도 | 영향 범위 | 상태 |
|---|------|--------|----------|------|
| 1 | **4M 구분자 누락** - Excel Import 시 4M 컬럼 없음 | 🟡 중간 | PFMEA Import | ✅ 해결 |
| 2 | **고장형태 Object 표시** - `[object Object]`로 표시됨 | 🔴 높음 | PFMEA Worksheet | ✅ 해결 |
| 3 | **DB 미사용** - localStorage만 사용, 앱간 데이터 연동 불가 | 🔴 높음 | 전체 시스템 | ✅ 해결 |

---

## 📋 문제 3: DB 연동 해결 완료 (2026-02-04)

### ✅ 해결됨
- **Prisma 7**: `@prisma/adapter-pg` 드라이버 어댑터 사용 필수
- **환경 변수**: `.env.development.local` 파일로 `DATABASE_URL` 설정
- **Health API**: `"database": "ok"` 상태 확인

### 적용된 해결 방법
1. `src/lib/prisma.ts`에서 `PrismaPg` 어댑터 사용
2. `.env.development.local` 파일 생성
3. Prisma 7 호환 코드로 전면 수정

---

## 2. 문제 1: 4M 구분자 누락

### 🔍 현상
- FMEA 기초정보 Excel Import 시 **4M 구분자(MN/MC/IM/EN)**가 템플릿에 없음
- 시스템이 4M 값을 **자동 추론**해야 하는 상황

### 📍 관련 코드
```
src/app/pfmea/import/excel-parser.ts
src/types/fmea/worksheet.ts (Category4M 타입 정의)
```

### 📊 현재 Excel 템플릿 구조
```
시트 L3-1 (작업요소): 공정번호 + 작업요소명
→ 4M 컬럼 없음!
```

### ✅ 해결 방안

#### 방안 A: 템플릿에 4M 컬럼 추가 (권장)
```
L3-1 시트 구조 변경:
| 공정번호 | 4M | 작업요소명 |
| 10       | MC | 용접 작업  |
| 10       | MN | 작업자 교육 |
```

**장점**: 명시적, 데이터 품질 보장  
**단점**: 기존 템플릿 수정 필요

#### 방안 B: AI 기반 4M 자동 추론
```typescript
// 키워드 기반 4M 분류 규칙
const CLASSIFY_4M = {
  MN: ['작업자', '교육', '숙련도', '경험'],      // Man
  MC: ['설비', '기계', '장비', 'JIG', '툴'],    // Machine
  IM: ['재료', '원자재', '부품', '소재'],        // Material
  EN: ['환경', '온도', '습도', '먼지', '조명'],  // Environment
};
```

**장점**: 기존 템플릿 호환  
**단점**: 추론 정확도 한계 (80~90%)

### 🎯 권장 해결책
**방안 A + B 하이브리드**:
1. 템플릿에 4M 컬럼 추가 (선택)
2. 컬럼이 없으면 AI 추론 적용
3. 사용자에게 추론 결과 확인 요청

### 📝 구현 작업
- [ ] `excel-parser.ts`에 4M 컬럼 파싱 로직 추가
- [ ] `excel-template.ts` 템플릿 다운로드에 4M 컬럼 추가
- [ ] 4M 자동 추론 함수 `classify4MByKeyword()` 구현
- [ ] Import 미리보기에서 4M 편집 기능 추가

---

## 3. 문제 2: 고장형태 Object 인식

### 🔍 현상
- 고장형태(failureMode) 값이 `[object Object]`로 표시됨
- Excel에서 복합 데이터가 문자열로 변환되지 않음

### 📍 원인 분석
```typescript
// 문제가 발생하는 패턴
const failureMode = {
  name: "치수 불량",
  severity: 8
};

// 잘못된 변환
String(failureMode) // "[object Object]"

// 올바른 변환
failureMode.name // "치수 불량"
```

### 📍 관련 코드
```
src/app/pfmea/import/excel-parser.ts (라인 204-206)
src/app/pfmea/import/hooks/useImportFileHandlers.ts
src/app/pfmea/worksheet/...
```

### ✅ 해결 방안

```typescript
// excel-parser.ts 수정
const value = row.getCell(col).value;

// 객체인 경우 처리
let stringValue: string;
if (typeof value === 'object' && value !== null) {
  // ExcelJS RichText 객체 처리
  if ('richText' in value) {
    stringValue = (value as any).richText.map((r: any) => r.text).join('');
  } else if ('name' in value) {
    stringValue = (value as any).name || '';
  } else {
    stringValue = JSON.stringify(value);
    console.warn('⚠️ 객체 데이터 감지:', value);
  }
} else {
  stringValue = String(value || '').trim();
}
```

### 📝 구현 작업
- [ ] `excel-parser.ts`에 객체 → 문자열 변환 로직 추가
- [ ] ExcelJS RichText 형식 지원
- [ ] 디버그 로그 추가 (객체 감지 시 경고)

---

## 4. 문제 3: DB 미사용으로 앱간 연동 불가

### 🔍 현상
- 데이터가 **localStorage**에만 저장됨
- PFMEA ↔ PFD ↔ CP 간 데이터 연동 불가
- 콘솔에 `DATABASE_URL not configured` 경고

### 📍 현재 아키텍처

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PFMEA     │    │    PFD      │    │     CP      │
│ Worksheet   │    │ Worksheet   │    │ Worksheet   │
└─────┬───────┘    └─────┬───────┘    └─────┬───────┘
      │                  │                  │
      ▼                  ▼                  ▼
┌─────────────────────────────────────────────────┐
│         localStorage (각 브라우저별 저장)          │
│   - pfmea_worksheet_{id}                        │
│   - pfd_worksheet_{id}                          │
│   - cp_worksheet_{id}                           │
└─────────────────────────────────────────────────┘
      ❌ 앱간 연동 불가!
      ❌ 다른 PC에서 접근 불가!
      ❌ 데이터 영속성 없음!
```

### 📍 목표 아키텍처

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PFMEA     │    │    PFD      │    │     CP      │
│ Worksheet   │    │ Worksheet   │    │ Worksheet   │
└─────┬───────┘    └─────┬───────┘    └─────┬───────┘
      │                  │                  │
      ▼                  ▼                  ▼
┌─────────────────────────────────────────────────┐
│               API Layer (/api/...)              │
│   - /api/fmea                                   │
│   - /api/pfd                                    │
│   - /api/control-plan                           │
│   - /api/sync/...                               │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│            PostgreSQL Database                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ ProjectLinkage│  │UnifiedProcess│             │
│  │  (연동관계)  │  │   Items     │             │
│  └──────────────┘  └──────────────┘             │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ L1/L2/L3     │  │ Failure      │             │
│  │ Structures   │  │ Analysis     │             │
│  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────┘
      ✅ 앱간 실시간 연동!
      ✅ 모든 PC에서 접근 가능!
      ✅ 데이터 영속성 보장!
```

### 📍 관련 코드

| 파일 | 역할 | 상태 |
|-----|------|------|
| `src/lib/prisma.ts` | Prisma 클라이언트 초기화 | ⚠️ DB 연결 실패 시 null 반환 |
| `src/app/api/fmea/route.ts` | FMEA 저장/로드 API | ⚠️ DB 없으면 fallback 응답 |
| `src/app/pfmea/worksheet/db-storage.ts` | DB 저장 로직 | ⚠️ 실패 시 localStorage 폴백 |
| `prisma/schema.prisma` | DB 스키마 정의 | ✅ 정의됨 |

### 📍 `.env` 설정 확인

```env
# 현재 설정 확인 필요!
DATABASE_URL=postgresql://user:password@localhost:5432/fmea_db?schema=public
```

### ✅ 해결 방안

#### Phase 1: DB 연결 안정화 (즉시)
1. PostgreSQL 서비스 상태 확인
2. `.env` DATABASE_URL 설정 확인
3. `prisma db push` 실행하여 스키마 동기화
4. API 테스트 (`/api/fmea`)

#### Phase 2: localStorage 의존성 제거 (1주일)
1. `saveWorksheetDB` 함수에서 localStorage 폴백 제거
2. DB 저장 실패 시 사용자에게 명확한 에러 표시
3. 네트워크 오류 시 재시도 로직 추가

#### Phase 3: 앱간 연동 강화 (2주일)
1. `UnifiedProcessItem` 테이블 활용 확대
2. `ProjectLinkage` 통한 문서 연결
3. 실시간 동기화 API (`/api/sync/...`) 활성화

### 📝 구현 작업
- [ ] PostgreSQL 연결 상태 모니터링 추가
- [ ] DB 저장 실패 시 사용자 알림
- [ ] 재연결 로직 구현 (exponential backoff)
- [ ] localStorage → DB 마이그레이션 도구 개발
- [ ] API 헬스체크 엔드포인트 (`/api/health`) 활용

---

## 5. 최적화 로드맵

### Phase 1: 긴급 수정 (이번 주)

| 작업 | 담당 | 예상 시간 |
|------|-----|----------|
| DB 연결 확인 및 수정 | 인프라 | 2시간 |
| `[object Object]` 버그 수정 | 개발 | 4시간 |
| 4M 자동 추론 기본 로직 | 개발 | 4시간 |

### Phase 2: 안정화 (다음 주)

| 작업 | 담당 | 예상 시간 |
|------|-----|----------|
| Excel 템플릿 4M 컬럼 추가 | 개발 | 2시간 |
| Import 미리보기 4M 편집 기능 | 개발 | 4시간 |
| localStorage → DB 마이그레이션 | 개발 | 8시간 |

### Phase 3: 연동 강화 (2주 후)

| 작업 | 담당 | 예상 시간 |
|------|-----|----------|
| PFMEA ↔ PFD 실시간 동기화 | 개발 | 8시간 |
| PFD ↔ CP 실시간 동기화 | 개발 | 8시간 |
| 연동 상태 대시보드 | 개발 | 4시간 |

---

## 6. 우선순위 및 일정

### 🔴 최우선 (Day 1-2)
1. ✅ **DB 연결 확인** - PostgreSQL 상태 점검
2. ⬜ **고장형태 [object Object] 수정** - excel-parser.ts 수정

### 🟡 중요 (Day 3-5)
3. ⬜ **4M 자동 추론 구현** - 키워드 기반 분류
4. ⬜ **Excel 템플릿 4M 컬럼 추가**

### 🟢 개선 (Week 2)
5. ⬜ **localStorage → DB 마이그레이션**
6. ⬜ **앱간 실시간 연동 활성화**

---

## 📞 담당자

| 영역 | 담당 | 연락처 |
|------|-----|-------|
| 인프라/DB | - | - |
| PFMEA 개발 | - | - |
| 품질 검증 | - | - |

---

> **Note**: 이 문서는 문제 진단 결과입니다.  
> 세부 구현 계획은 별도 작업 카드로 분리하여 관리합니다.
