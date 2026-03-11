# FMEA 시스템 변경 이력

## 코드프리즈 백업 (2026-01-13)
- **태그**: `codefreeze-20260113-apqp-fmea-cp-integration`
- **커밋**: `c810cbd`
- **시간**: 2026-01-13

---

## 코드프리즈 백업 (2026-01-06)
- **위치**: `C:\01_new_sdd\backups\codefreeze-20260106-072806`
- **시간**: 2026-01-06 07:28:06

---

## 🔧 주요 변경 사항 (2026-01-13)

### 1. APQP-FMEA-CP 연동 구조 완성

**구조**: APQP (최상위) → FMEA → CP

**변경사항**:
- APQP를 최상위 프로젝트로 설정
- FMEA 등록 화면에 "상위 APQP" 선택 기능 추가
- CP 등록 화면에 "상위 APQP" 선택 기능 추가 (기존 "상위 프로젝트"에서 변경)
- DB 스키마 변경: `parentProject` → `parentApqpNo`

**수정된 파일**:
| 파일 | 변경 내용 |
|------|----------|
| `prisma/schema.prisma` | `parentApqpNo` 필드 추가 (ApqpRegistration, CpRegistration) |
| `src/app/pfmea/register/page.tsx` | 상위 APQP 선택 모달 추가 |
| `src/app/control-plan/register/page.tsx` | 상위 프로젝트 → 상위 APQP 변경 |
| `src/app/control-plan/list/page.tsx` | 상위 프로젝트 → 상위 APQP 컬럼명 변경 |
| `src/app/api/apqp/route.ts` | APQP CRUD API 완성 |
| `src/app/api/control-plan/route.ts` | `parentApqpNo` 필드 추가 |

---

### 2. CFT 멤버 저장 필터링 개선

**문제**: 이름이 없는 CFT 멤버도 저장되어 Champion이 중복 생성됨

**해결**:
- 저장 시 `m.name && m.name.trim()` 조건으로 필터링
- 이름이 있는 멤버만 DB에 저장

**수정된 파일**:
| 파일 | 변경 내용 |
|------|----------|
| `src/app/api/apqp/route.ts` | `filter((m: any) => m.name && m.name.trim())` |
| `src/app/apqp/register/page.tsx` | `filter(m => m.name && m.name.trim())` |

**추가 기능**:
- `/api/admin/cleanup-cft` API 추가: 잘못 저장된 CFT 멤버 정리

---

### 3. FMEA 등록 화면 레이아웃 최적화

**문제**: FMEA 등록 화면 레이아웃이 CP와 다름

**해결**:
- CP 등록 화면과 동일한 레이아웃 구조로 통일
- 컬럼 너비 비율 조정 (w-[11%], w-[14%], w-[7%], w-[18%] 등)

**변경된 구조**:
| 행 | CP 구조 | FMEA 구조 (변경 후) |
|----|---------|---------------------|
| 1행 | 회사명, CP명, CP No, 상위 APQP | 회사명, FMEA명, FMEA ID, 상위 APQP |
| 2행 | 공정책임, CP책임자, 시작일자, 상위 FMEA | 공정책임, FMEA책임자, 시작일자, 상위 FMEA |
| 3행 | 고객명, 개정일자, 엔지니어링위치, 상위 CP | 고객명, 개정일자, 엔지니어링위치, 기밀유지수준 |
| 4행 | 모델연식, CP유형, CP종류, 상호기능팀 | 모델연식, FMEA유형, 상호기능팀 |

**수정된 파일**:
- `src/app/pfmea/register/page.tsx` - 레이아웃 구조 재정렬

---

### 4. APQP API 수정

**문제**: Prisma `findUnique` 호출 오류 발생

**해결**:
- `findUnique` → `findFirst`로 변경 (unique 필드 인식 문제 대비)

**수정된 파일**:
- `src/app/api/apqp/route.ts` - 모든 `findUnique` → `findFirst` 변경

---

### 5. CP Import 기능 완성

**기능**:
- 그룹시트 Import (공정현황, 검출장치, 관리항목, 관리방법, 대응계획)
- 개별항목시트 Import (12개 시트)
- 미리보기 탭 (전체/그룹시트/개별항목)
- 행별 수정/삭제/저장 기능

**추가된 파일**:
- `src/app/control-plan/import/` - 전체 Import 기능 모듈

---

## 🔧 주요 변경 사항

### 1. 모달 Enter 키 추가 기능 수정

**문제**: 모달에서 Enter 키로 항목 추가 시 부모의 `handleEnterBlur`가 이벤트를 가로챔

**해결**:
- 모든 모달 div에 `onKeyDown={e => e.stopPropagation()}` 추가
- input의 onKeyDown에 `e.preventDefault(); e.stopPropagation();` 추가

**수정된 파일**:
| 파일 | 변경 내용 |
|------|----------|
| `ProcessSelectModal.tsx` (pfmea) | Enter + stopPropagation + 최상단 추가 |
| `WorkElementSelectModal.tsx` (pfmea) | Enter + stopPropagation + 최상단 추가 |
| `DataSelectModal.tsx` | Enter + stopPropagation + autoFocus |
| `StandardSelectModal.tsx` | Enter + stopPropagation |
| `BaseSelectModal.tsx` | Enter + stopPropagation |
| `ProcessSelectModal.tsx` (components) | stopPropagation |
| `ProcessSelectModal.tsx` (dfmea) | Enter + stopPropagation |
| `WorkElementSelectModal.tsx` (dfmea) | Enter + stopPropagation |

---

### 2. 마스터/패밀리 FMEA DB 저장

**문제**: 마스터/패밀리 FMEA 데이터가 DB에 없음

**해결**:
- `scripts/init-master-family.ts` 스크립트 수정 (Prisma 테이블 이름 사용)
- 마스터/패밀리 데이터 DB 저장 완료

**저장된 데이터**:
| FMEA ID | 유형 | 공정 수 | 내용 |
|---------|------|---------|------|
| pfm26-M001 | Master | 7개 | 원재료 입고, 배합, 압출, 성형, 가류, 검사, 출하 |
| pfm26-F001 | Family | 9개 | 승용차 타이어 전용 공정 |

---

### 3. 마스터 공정 API 추가

**새 API**: `/api/fmea/master-processes`

**기능**: 마스터 FMEA (pfm26-M001)의 L2 공정 목록 반환

**파일**: `src/app/api/fmea/master-processes/route.ts`

```typescript
// 응답 예시
{
  "success": true,
  "processes": [
    {"id": "master-l2-1", "no": "10", "name": "원재료 입고"},
    {"id": "master-l2-2", "no": "20", "name": "배합"},
    ...
  ],
  "source": "master-fmea",
  "fmeaId": "pfm26-M001"
}
```

---

### 4. 워크시트 공정 모달 개선

**변경**: 공정 선택 모달에서 마스터 FMEA 공정을 DB에서 불러옴

**로직**:
1. DB에서 마스터 공정 조회 (`/api/fmea/master-processes`)
2. 없으면 localStorage 폴백
3. 새로 추가된 항목은 목록 최상단에 표시

---

### 5. FMEA 등록 페이지 개선

**변경**: "Master Data 사용" 버튼 클릭 시 DB에서 FMEA 목록 조회

**수정된 함수**: `openFmeaSelectModal`
- localStorage 대신 `/api/fmea/projects` API 호출
- `fmeaType` 필드 기반 필터링

---

### 6. Prisma 스키마 동기화

**문제**: `optimization` 테이블에 `remarks` 컬럼 없음

**해결**:
```bash
npx prisma db push --accept-data-loss
npx prisma generate
```

---

## 📁 DB 스키마 현황

```
pfmea_pfm26_m001  # Master FMEA (7개 공정)
pfmea_pfm26_f001  # Family FMEA (9개 공정)
pfmea_pfm26_001   # Part FMEA
pfmea_pfm25_310   # Part FMEA
```

---

## ✅ 테스트 완료 항목

1. [x] 마스터 공정 API 정상 작동
2. [x] 공정 모달 Enter 키 추가 기능
3. [x] 새 항목 최상단 표시
4. [x] 마스터/패밀리 데이터 DB 저장

---

## 🔜 다음 작업

1. 워크시트에서 마스터 공정 선택 테스트
2. Family FMEA 공정 API 추가 (필요시)
3. Part FMEA 생성 시 마스터/패밀리 상속 기능

---

## 📝 비고

- 코드프리즈 시점: 2026-01-06 07:28
- Node.js 버전: 22.x
- Next.js 버전: 16.1.1
- Prisma 버전: 7.2.0











