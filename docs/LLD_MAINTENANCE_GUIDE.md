# 습득교훈(LLD) 유지보수 가이드

**코드프리즈 태그**: `codefreeze-20260112-lld-risk-integration`
**작성일**: 2026-01-12

---

## 📁 수정 파일 목록

### 1. 신규 파일 (LLD 화면)

| 파일 경로 | 역할 |
|-----------|------|
| `src/app/pfmea/lessons-learned/page.tsx` | LLD 메인 화면 |
| `src/app/pfmea/lessons-learned/types.ts` | LLD 데이터 타입 정의 |
| `src/app/pfmea/lessons-learned/mock-data.ts` | 샘플 데이터 (10건) |
| `src/app/api/lessons-learned/route.ts` | LLD CRUD API |
| `src/components/modals/LLDSelectModal.tsx` | LLD 선택 모달 |

### 2. 수정 파일 (리스크분석 연동)

| 파일 경로 | 수정 위치 | 설명 |
|-----------|-----------|------|
| `src/app/pfmea/worksheet/tabs/all/hooks/useAllTabModals.ts` | `LLDModalState`, `openLldModal`, `handleLldSelect` | LLD 모달 상태 관리 |
| `src/app/pfmea/worksheet/tabs/all/RiskOptCellRenderer.tsx` | `col.name === '습득교훈'` 조건문 | 습득교훈 셀 클릭 처리 |
| `src/app/pfmea/worksheet/tabs/all/AllTabEmpty.tsx` | `import LLDSelectModal`, `<LLDSelectModal />` | LLD 모달 렌더링 |
| `src/components/layout/Sidebar.tsx` | `pfmeaSubItems` 배열 | LLD 메뉴 추가 |
| `prisma/schema.prisma` | `model LessonsLearned` | DB 스키마 |
| `src/app/admin/db-viewer/page.tsx` | `IMPORTANT_TABLES` | DB 뷰어 테이블 추가 |

---

## 🎨 LLD 화면 컬럼 변경

### 컬럼 정의 파일
**파일**: `src/app/pfmea/lessons-learned/types.ts`

```typescript
export const COLUMNS = [
  { key: 'lldNo', name: 'LLD_No', width: 100, align: 'center' },
  { key: 'vehicle', name: '차종', width: 80, align: 'center' },
  { key: 'target', name: '대상', width: 80, align: 'center' },
  { key: 'failureMode', name: '고장형태', width: 200, align: 'left' },
  { key: 'location', name: '발생장소', width: 100, align: 'center' },
  { key: 'cause', name: '발생원인', width: 200, align: 'left' },
  { key: 'category', name: '구분', width: 80, align: 'center' },
  { key: 'improvement', name: '개선대책', width: 200, align: 'left' },
  { key: 'result', name: '적용결과', width: 100, align: 'center' },
  { key: 'status', name: '상태', width: 60, align: 'center' },
  { key: 'date', name: '완료일자', width: 100, align: 'center' },
];
```

### 컬럼 추가/삭제 시
1. `types.ts`의 `LessonsLearnedRow` 인터페이스 수정
2. `types.ts`의 `COLUMNS` 배열 수정
3. `page.tsx`의 테이블 렌더링 부분 수정
4. `prisma/schema.prisma`의 `LessonsLearned` 모델 수정
5. `npx prisma db push` 실행

---

## 🔗 습득교훈 셀 ↔ LLD 연동

### 동작 흐름
1. **습득교훈 셀 클릭 (빈 셀)** → `openLldModal()` 호출
2. **LLD 선택 모달** → 항목 선택 → `handleLldSelect(lldNo)` 호출
3. **riskData에 저장** → `lesson-{fmId}-{fcId}` 또는 `lesson-{rowIndex}` 키
4. **습득교훈 셀 클릭 (LLD_No 있음)** → `/pfmea/lessons-learned` 새 탭 열기

### 키 형식 변경 시
**파일**: `src/app/pfmea/worksheet/tabs/all/RiskOptCellRenderer.tsx`

**검색 키워드**: `col.name === '습득교훈'`

```typescript
// 습득교훈 셀 처리 로직
if (col.name === '습득교훈') {
  const uniqueKey = (fmId && fcId) ? `${fmId}-${fcId}` : String(globalRowIdx);
  const key = `lesson-${uniqueKey}`;
  // ...
}
```

---

## 📊 DB 스키마

### Prisma 모델
**파일**: `prisma/schema.prisma`

```prisma
model LessonsLearned {
  id          String   @id @default(uuid())
  lldNo       String   @unique  // LLD26-001
  vehicle     String             // 차종
  target      String             // 설계/부품/제조
  failureMode String             // 고장형태
  location    String?            // 발생장소
  cause       String             // 발생원인
  category    String             // 예방관리/검출관리
  improvement String             // 개선대책
  result      String?            // FMEA/CP/PM
  status      String             // G/Y/R
  date        String?            // 완료일자
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("lessons_learned")
}
```

### DB 마이그레이션
```bash
cd fmea-onpremise
npx prisma db push
```

---

## 🎨 색상/스타일 변경

### LLD 모달 헤더 색상
**파일**: `src/components/modals/LLDSelectModal.tsx`

**검색 키워드**: `bg-[#00587a]`

```tsx
// 헤더 배경색
<div className="... bg-[#00587a] text-white ...">
```

### LLD_No 링크 색상
**파일**: `src/app/pfmea/worksheet/tabs/all/RiskOptCellRenderer.tsx`

**검색 키워드**: `isLldNo ? '#00587a'`

```tsx
style={{ 
  color: isLldNo ? '#00587a' : '#666',  // LLD_No 링크 색상
  fontWeight: isLldNo ? 600 : 400,
  textDecoration: isLldNo ? 'underline' : 'none',
}}
```

---

## 🧪 테스트 체크리스트

- [ ] LLD 화면 접근 (`/pfmea/lessons-learned`)
- [ ] LLD 테이블 렌더링 (10건 샘플)
- [ ] LLD Excel Export
- [ ] LLD Excel Import
- [ ] 리스크분석 습득교훈 셀 클릭 → LLD 모달 열림
- [ ] LLD 선택 완료 → 셀에 LLD_No 입력
- [ ] LLD_No 클릭 → LLD 화면 새 탭
- [ ] DB 저장 확인 (`/admin/db-viewer`)

---

## 🔄 롤백 방법

```bash
cd C:\01_new_sdd\fmea-onpremise
git checkout codefreeze-20260112-lld-risk-integration~1 -- .
```

---

## 📋 관련 코드프리즈

| 태그 | 내용 |
|------|------|
| `codefreeze-20260112-lld-fmea-integration` | **LLD 스키마 변경 및 FMEA 연동 완성** |
| `codefreeze-20260112-lld-risk-integration` | 습득교훈(LLD) 화면 및 리스크분석 연동 |
| `codefreeze-20260112-color-system` | 색상 시스템 변경 (요구사항/제품특성 보라색) |

---

## 📊 LLD 필드 구조 (2026-01-12)

| 필드 | 한글명 | 설명 | 입력 방식 |
|------|--------|------|-----------|
| `lldNo` | LLD_No | LLD 시리얼 번호 (LLD26-001) | 자동 생성 |
| `vehicle` | 차종 | 차량 모델명 | 수동 |
| `target` | 대상 | 설계/부품/제조 | 수동 |
| `failureMode` | 고장형태 | 문제 설명 | 수동 |
| `location` | 발생장소 | FIELD/고객공장/양산라인 | 수동 |
| `cause` | 발생원인 | 원인 설명 | 수동 |
| `category` | 구분 | 예방관리/검출관리 | 수동 |
| `improvement` | 개선대책 | 개선 내용 | 수동 |
| `completedDate` | **완료일자** | LLD 완료된 날짜 | ✏️ 수동 |
| `fmeaId` | **적용결과** | FMEA ID (pfm26-001) | 🤖 자동 |
| `status` | 상태 | G(완료)/Y(진행중)/R(미완료) | 수동 |
| `appliedDate` | **적용일자** | FMEA에 입력된 날짜 | 🤖 자동 |

---

## 🔗 FMEA → LLD 자동 연동 흐름

1. FMEA 리스크분석 → 습득교훈 셀 클릭
2. LLD 선택 모달 열림
3. LLD_No 선택 → 확인 클릭
4. **자동 처리**:
   - FMEA 셀에 LLD_No 입력
   - LLD DB의 `fmeaId` 필드에 현재 FMEA ID 저장
   - LLD DB의 `appliedDate` 필드에 오늘 날짜 저장
   - `/api/lessons-learned/apply` API 호출

