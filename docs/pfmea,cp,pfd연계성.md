/**
 * @file pfmea,cp,pfd연계성.md
 * @description PFMEA-CP-PFD 양방향 연계 테스트 가이드
 * @created 2026-01-29
 */

# 📊 PFMEA-CP-PFD 양방향 연계 테스트 가이드

## 1. 연계 아키텍처 개요

```
┌─────────────┐
│    APQP     │  (최상위 프로젝트)
│  apq26-001  │
└──────┬──────┘
       ↓
┌─────────────┐
│   PFMEA     │  (공정 FMEA)
│  pfm26-m001 │
└──────┬──────┘
       ↓
┌───────────────────────────────────────┐
│       양방향 연계 (1:N 관계)           │
│  ┌─────────┐        ┌─────────┐       │
│  │   PFD   │◀──────▶│   CP    │       │
│  │pfdl26-f001│      │cpl26-f001│       │
│  └─────────┘        └─────────┘       │
└───────────────────────────────────────┘
```

---

## 2. DB 스키마 연계 필드 현황 ✅

### 2.1 PfdRegistration (pfd_registrations)

| 필드명 | 타입 | 설명 | 상태 |
|--------|------|------|------|
| `pfdNo` | String | PFD 번호 (PK) | ✅ |
| `fmeaId` | String? | 상위 FMEA ID | ✅ |
| `cpNo` | String? | 연결된 CP 번호 (기존 호환) | ✅ |
| `apqpProjectId` | String? | 상위 APQP ID | ✅ |
| `linkedCpNos` | String? | 연동 CP 목록 (JSON array) | ✅ |

### 2.2 CpRegistration (cp_registrations)

| 필드명 | 타입 | 설명 | 상태 |
|--------|------|------|------|
| `cpNo` | String | CP 번호 (PK) | ✅ |
| `parentApqpNo` | String? | 상위 APQP 번호 | ✅ |
| `fmeaId` | String? | 상위 FMEA ID | ✅ |
| `fmeaNo` | String? | 상위 FMEA 번호 | ✅ |
| `parentCpId` | String? | 상위 CP ID | ✅ |
| `linkedPfdNo` | String? | 연동 PFD 번호 | ✅ |

### 2.3 ProjectLinkage (project_linkages) - 중앙 연동 테이블

| 필드명 | 타입 | 설명 | 상태 |
|--------|------|------|------|
| `id` | String | UUID | ✅ |
| `apqpNo` | String? | APQP 번호 | ✅ |
| `pfmeaId` | String? | PFMEA ID | ✅ |
| `pfdNo` | String? | PFD 번호 | ✅ |
| `cpNo` | String? | CP 번호 | ✅ |
| `projectName` | String? | 프로젝트명 | ✅ |
| `customerName` | String? | 고객명 | ✅ |
| `linkType` | String | auto / manual | ✅ |
| `status` | String | active / draft / deleted | ✅ |

---

## 3. API 연계 코드 현황 ✅

### 3.1 PFD API (`/api/pfd/route.ts`)

| 기능 | 메서드 | 연계 처리 | 상태 |
|------|--------|----------|------|
| 목록 조회 | GET | ProjectLinkage에서 연동 CP 병합 조회 | ✅ |
| 저장 | POST | linkedCpNos 처리 + ProjectLinkage 저장 | ✅ |
| 삭제 | DELETE | DocumentLink 연동 삭제 | ✅ |

**연계 코드 (77~105행):**
```typescript
// ★★★ ProjectLinkage(중앙 연동DB)에서 연동 CP 조회 ★★★
const linkages = await prisma.projectLinkage.findMany({
  where: { pfdNo: { in: pfdNos }, status: 'active' },
  select: { pfdNo: true, cpNo: true },
});
```

**저장 시 연계 (324~361행):**
```typescript
// ★★★ ProjectLinkage에 PFD-CP 연동 저장 ★★★
await prisma.projectLinkage.create({
  data: { cpNo, pfdNo, pfmeaId, apqpNo, linkType: 'auto', status: 'active' },
});
```

### 3.2 CP API (`/api/control-plan/route.ts`)

| 기능 | 메서드 | 연계 처리 | 상태 |
|------|--------|----------|------|
| 목록 조회 | GET | ProjectLinkage에서 연동 PFD 병합 조회 | ✅ |
| 저장 | POST | linkedPfdNo 처리 + ProjectLinkage 저장 | ✅ |
| 삭제 | DELETE | 연관 테이블 Cascade 삭제 | ✅ |

**연계 코드 (353~377행):**
```typescript
// ★★★ ProjectLinkage(중앙 연동DB)에서 연동 PFD 조회 ★★★
const linkages = await prisma.projectLinkage.findMany({
  where: { cpNo: { in: cpNos }, status: 'active' },
  select: { cpNo: true, pfdNo: true },
});
```

**저장 시 연계 (155~216행):**
```typescript
// ★★★ 4. ProjectLinkage에 CP-PFD 연동 저장 ★★★
await prisma.projectLinkage.upsert({ ... });
```

### 3.3 ProjectLinkage API (`/api/project-linkage/route.ts`)

| 기능 | 메서드 | 설명 | 상태 |
|------|--------|------|------|
| 조회 | GET | apqpNo/pfmeaId/pfdNo/cpNo 기준 조회 | ✅ |
| 생성/수정 | POST | Upsert 처리 | ✅ |
| 삭제 | DELETE | Soft delete (status='deleted') | ✅ |

---

## 4. 양방향 연계 테스트 시나리오

### 4.1 테스트 케이스 #1: PFD → CP 연동 생성

**순서:**
1. PFD 등록화면 (`/pfd/register`) 접속
2. 새 PFD 생성 (예: `pfdl26-f001`)
3. 저장 버튼 클릭
4. → 자동으로 연동 CP 생성 (`cpl26-f001`)
5. → ProjectLinkage에 연동 레코드 생성

**확인 사항:**
- [ ] PFD 저장 시 `linkedCpNos` 필드 업데이트
- [ ] ProjectLinkage 테이블에 레코드 생성
- [ ] CP 리스트에서 `linkedPfdNo` 표시

### 4.2 테스트 케이스 #2: CP → PFD 연동 조회

**순서:**
1. CP 리스트 (`/control-plan/list`) 접속
2. 연동 PFD 컬럼 확인
3. PFD 버튼 클릭 → PFD 등록화면 이동

**확인 사항:**
- [ ] CP 리스트에서 `linkedPfdNo` 표시
- [ ] PFD 버튼 클릭 시 정상 이동

### 4.3 테스트 케이스 #3: PFMEA → PFD/CP 자동 생성

**순서:**
1. PFMEA 등록화면 (`/pfmea/register`) 접속
2. 새 PFMEA 생성 (예: `pfm26-m001`)
3. 저장 버튼 클릭
4. → 자동으로 연동 PFD 생성 (`pfdl26-m001`)
5. → 자동으로 연동 CP 생성 (`cpl26-m001`)

**확인 사항:**
- [ ] PFMEA 저장 시 연동 PFD/CP 표시
- [ ] ProjectLinkage에 연동 레코드 생성
- [ ] 연동 버튼 클릭 시 정상 이동

### 4.4 테스트 케이스 #4: 양방향 동기화

**순서:**
1. PFD 등록화면에서 연동 CP 클릭
2. CP 등록화면에서 연동 PFD 확인
3. CP에서 정보 수정 후 저장
4. PFD로 돌아가서 연동 정보 확인

**확인 사항:**
- [ ] 양방향 탐색 정상 동작
- [ ] 연동 ID 표시 일관성

---

## 5. Prisma Studio 테스트

### 5.1 테이블 확인

```bash
# Prisma Studio 실행
npx prisma studio
```

**확인할 테이블:**
- `pfd_registrations` - PFD 등록 정보
- `cp_registrations` - CP 등록 정보
- `project_linkages` - 연동 관계 테이블

### 5.2 연동 데이터 확인 쿼리

**PFD-CP 연동 확인:**
```sql
SELECT 
  pfd."pfdNo", pfd."linkedCpNos", pfd."fmeaId",
  pl."cpNo" as "linkageCpNo", pl.status
FROM pfd_registrations pfd
LEFT JOIN project_linkages pl ON LOWER(pfd."pfdNo") = LOWER(pl."pfdNo")
WHERE pl.status = 'active' OR pl.status IS NULL;
```

**CP-PFD 연동 확인:**
```sql
SELECT 
  cp."cpNo", cp."linkedPfdNo", cp."fmeaId",
  pl."pfdNo" as "linkagePfdNo", pl.status
FROM cp_registrations cp
LEFT JOIN project_linkages pl ON LOWER(cp."cpNo") = LOWER(pl."cpNo")
WHERE pl.status = 'active' OR pl.status IS NULL;
```

---

## 6. 연계 준비 상태 점검 결과

### ✅ DB 스키마 준비 완료

| 항목 | 상태 | 비고 |
|------|------|------|
| PfdRegistration.linkedCpNos | ✅ | JSON array 형태 |
| CpRegistration.linkedPfdNo | ✅ | 단일 PFD 참조 |
| ProjectLinkage 테이블 | ✅ | 중앙 연동 관리 |
| 인덱스 설정 | ✅ | pfdNo, cpNo, pfmeaId 인덱스 |

### ✅ API 코드 준비 완료

| API | GET 연동 조회 | POST 연동 저장 | 비고 |
|-----|-------------|---------------|------|
| /api/pfd | ✅ | ✅ | ProjectLinkage 병합 |
| /api/control-plan | ✅ | ✅ | ProjectLinkage 병합 |
| /api/project-linkage | ✅ | ✅ | 중앙 API |

### ✅ UI 연동 버튼 준비 완료

| 화면 | 연동 PFD | 연동 CP | 버튼 동작 |
|------|---------|---------|----------|
| PFMEA 등록 | ✅ | ✅ | 무조건 이동 |
| PFD 등록 | N/A | ✅ | 무조건 이동 |
| CP 등록 | ✅ | N/A | 무조건 이동 |

---

## 7. 테스트 체크리스트

### Phase 1: 기본 연동 테스트
- [ ] PFD 생성 시 linkedCpNos 저장 확인
- [ ] CP 생성 시 linkedPfdNo 저장 확인
- [ ] ProjectLinkage 레코드 생성 확인

### Phase 2: 조회 연동 테스트
- [ ] PFD 리스트에서 연동 CP 표시
- [ ] CP 리스트에서 연동 PFD 표시
- [ ] PFMEA에서 연동 PFD/CP 표시

### Phase 3: 양방향 탐색 테스트
- [ ] PFD → CP 이동 정상
- [ ] CP → PFD 이동 정상
- [ ] PFMEA → PFD/CP 이동 정상

### Phase 4: 데이터 일관성 테스트
- [ ] 연동 삭제 시 양쪽 정리
- [ ] ID 변경 시 연동 유지
- [ ] 대소문자 정규화 확인

---

## 8. 문제 발생 시 디버깅

### 8.1 콘솔 로그 확인

```javascript
// PFD API 로그
console.log('🔗 PFD-CP 연동 (ProjectLinkage):', ...);
console.log('✅ ProjectLinkage 저장: PFD=xxx ↔ CP=xxx');

// CP API 로그
console.log('🔗 CP-PFD 연동 (ProjectLinkage):', ...);
console.log('✅ ProjectLinkage 저장: CP=xxx ↔ PFD=xxx');
```

### 8.2 API 직접 호출 테스트

```bash
# PFD 조회
curl http://localhost:3000/api/pfd

# CP 조회
curl http://localhost:3000/api/control-plan

# 연동 현황 조회
curl http://localhost:3000/api/project-linkage
```

---

## 9. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-29 | 1.0 | 초기 문서 작성, 연계 준비 상태 점검 완료 |
