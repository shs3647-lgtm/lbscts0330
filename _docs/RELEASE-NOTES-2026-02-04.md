# 🚀 릴리즈 노트 (2026-02-04)

**브랜치**: `main`  
**최신 커밋**: `e859dc48`  
**작업 기간**: 2026-02-02 ~ 2026-02-04

---

## 📦 풀(Pull) 방법

```bash
git checkout main
git pull origin main
npm install          # 의존성 업데이트 (Prisma 변경 있음)
npx prisma generate  # Prisma 클라이언트 재생성
npm run dev          # 개발 서버 실행
```

---

## ✨ 주요 신규 기능

### 1. PFMEA → CP 순차 연동 기능 (5단계 위저드)
- **파일**: `src/app/pfmea/components/SyncWizardModal.tsx`
- **API 엔드포인트**:
  - `/api/pfmea/sync-to-cp/structure` - 구조 연동
  - `/api/pfmea/sync-to-cp/product-char` - 제품특성 연동
  - `/api/pfmea/sync-to-cp/process-char` - 공정특성 연동
  - `/api/pfmea/sync-to-cp/special-char` - 특별특성 연동
- **동작**: linkedCpNo가 있으면 기존 CP에 순차적으로 데이터 연동
- **UI**: 5단계 위저드 모달 (pending/ready/syncing/done/error 상태 표시)

### 2. PM 설비/TOOL 관리 탭 개선
- **파일**: `src/app/ws/worksheet/components/WsEquipmentTab.tsx`
- **변경사항**:
  - 모달에서 전용 탭으로 전환
  - 컴팩트한 테이블+패널 레이아웃
  - 인라인 상태 요약 카드
  - 점검 초과 경고 표시

### 3. PFMEA 가져오기 개선
- **파일**: `src/app/pfmea/components/ImportFromExcel.tsx`
- **변경사항**:
  - 4M 컬럼(Man, Machine, Material, Method) 추가
  - Excel 파싱 로직 개선

### 4. ALL 화면 개선
- **동적 정렬**: 긴 텍스트(10자 이상) 좌측정렬, 짧은 텍스트 중앙정렬
- **헤더 구분선**: 3행 헤더에 2px 파란색 구분선 추가
- **엑셀 내보내기**: 병합 및 데이터 누락 수정

### 5. 예방관리 자동연결 개선
- 동적 정렬 적용
- 자동연결 로직 개선

---

## 🐛 버그 수정

| 커밋 | 수정 내용 |
|------|----------|
| `e859dc48` | Prisma 7 호환성 - pg 어댑터 사용 |
| `776b58c4` | 구분(feCategory) 누락 수정 - feScope fallback 추가 |
| `fbf14223` | ALL 화면 엑셀 내보내기 병합 및 데이터 누락 수정 |
| `6307e2d5` | CP 연동 시 데이터 trim() 처리 추가 |
| `80e23359` | MC 필터링을 공정번호 기반으로 변경 |
| `64cae6e8` | 예방관리/검출관리 데이터 DB 저장 누락 수정 |
| `597bf598` | 새로고침 시 탭 유지 개선 |

---

## ⚠️ 주의사항

### Prisma 변경
- Prisma 7 호환성을 위해 pg 어댑터 방식으로 변경됨
- **반드시 `npx prisma generate` 실행 필요**

### 환경 변수
- `DATABASE_URL` 환경 변수 필요 (PostgreSQL 연결)
- `.env` 파일 예시:
  ```
  DATABASE_URL="postgresql://user:password@localhost:5432/fmea_db"
  ```

---

## 📁 주요 변경 파일 목록

```
src/
├── app/
│   ├── pfmea/
│   │   ├── components/
│   │   │   ├── SyncWizardModal.tsx          # 신규: CP 연동 위저드
│   │   │   └── ImportFromExcel.tsx          # 수정: 4M 컬럼 추가
│   │   └── hooks/
│   │       └── useCpSync.ts                 # 수정: 위저드 상태 추가
│   ├── ws/
│   │   └── worksheet/
│   │       └── components/
│   │           └── WsEquipmentTab.tsx       # 수정: 컴팩트 레이아웃
│   └── api/
│       └── pfmea/
│           └── sync-to-cp/
│               ├── structure/route.ts       # 신규: 구조 연동 API
│               ├── product-char/route.ts    # 신규: 제품특성 연동 API
│               ├── process-char/route.ts    # 신규: 공정특성 연동 API
│               └── special-char/route.ts    # 신규: 특별특성 연동 API
├── lib/
│   └── prisma.ts                            # 수정: pg 어댑터 적용
└── utils/
    └── allTabConstants.ts                   # 수정: getDynamicAlign 추가
```

---

## 🔄 커밋 이력 (최신순)

```
e859dc48 fix(prisma): Prisma 7 호환성 - pg 어댑터 사용
0bf8f2a0 feat(pfmea-import): 4M 컬럼 추가 및 Excel 파싱 개선
164ac4f6 feat(PM): 설비/TOOL 관리를 전용 탭으로 개선
843c6b61 docs: TODO 주석 추가 - 4M을 원자성 DB에 저장 필요
80e23359 fix: MC 필터링을 공정번호 기반으로 변경
d1c4f7df fix: MC만 정확히 필터링 및 TODO 주석 추가
c46cc6cf fix: MC만 필터링하고 equipment 필드 비움
b2628077 fix: 구조연동 단순화 및 TODO 주석 추가
c3953e62 fix: 구조연동을 Upsert 방식으로 변경 - 기존 데이터 유지
743583c5 fix: processDesc를 L2.functions에서 생성
afcffb10 fix: product-char API processDesc 덮어쓰기 방지
6307e2d5 fix: CP 연동 시 데이터 trim() 처리 추가
8abef2f1 fix: CP 검색 로직을 공통 유틸리티로 분리
f104982d feat: CP 연동 버튼에 순차 연동 위저드 연결
87122bbf feat: PFMEA → CP 순차 연동 기능 구현
776b58c4 fix: 구분(feCategory) 누락 수정
fbf14223 fix: ALL 화면 엑셀 내보내기 병합 및 데이터 누락 수정
597bf598 fix(TabPersistence): 새로고침 시 탭 유지 개선
1b6e1e1d feat: 3행 헤더에 2px 파란색 구분선 추가, AP OD 개선안 기능 추가
d174968b feat: 예방관리 자동연결 개선 및 동적정렬
94d7200f feat(ALL): 동적 정렬 적용
64cae6e8 fix: 예방관리/검출관리 데이터 DB 저장 누락 수정
```

---

## 📞 문의

문제 발생 시 연락 주세요!
