# FMEA On-Premise

FMEA 온프레미스 개발 환경 - 로컬 노트북에서 개발하기

## 📐 워크시트 설계 원칙

**⚠️ 모든 워크시트 개발 시 필수 준수**

1. **메뉴바 크기**: 브라우저 크기에 맞춰서 개발한다 (1440px 기준)
2. **메뉴바 고정**: 메뉴바는 항상 고정되어 가로세로 스크롤에도 움직이지 않는다
3. **가로 스크롤바**: 좌우 스크롤바는 컨테이너에 1개만 사용한다
4. **세로 스크롤바**: 세로 스크롤바는 워크시트만 조정하게 만든다

자세한 내용은 [`docs/WORKSHEET_DESIGN_PRINCIPLES.md`](./docs/WORKSHEET_DESIGN_PRINCIPLES.md) 참조

---

## 🚀 빠른 시작

### 1. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일 생성:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

`.env` 파일 편집:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fmea_db"
PORT=3000
NODE_ENV=development
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:migrate
```

### 4. 개발 서버 실행

```bash
# 기본 포트(3000)로 실행
npm run dev

# 또는 다른 포트로 실행
npm run dev:4000
```

### 5. 브라우저 접속

```
http://localhost:3000/pfmea/register
```

## 📚 상세 가이드

로컬 개발 환경 구축에 대한 자세한 내용은 [로컬 개발 환경 구축 가이드](./docs/LOCAL_DEVELOPMENT_SETUP.md)를 참조하세요.

## 🛠️ 사용 가능한 명령어

```bash
# 개발 서버
npm run dev              # 포트 3000
npm run dev:4000         # 포트 4000
npm run dev:5000         # 포트 5000

# 프로덕션
npm run build            # 빌드
npm start                # 프로덕션 서버 실행 (포트 3000)
npm run start:4000       # 프로덕션 서버 실행 (포트 4000)

# 데이터베이스
npm run db:studio        # Prisma Studio (DB 뷰어)
npm run db:generate      # Prisma 클라이언트 생성
npm run db:migrate       # 마이그레이션
npm run db:push          # DB 스키마 강제 적용

# 기타
npm run lint             # 코드 린트
```

## 📁 프로젝트 구조

```
fmea-onpremise/
├── .env.example         # 환경 변수 템플릿
├── .env                 # 환경 변수 (로컬에 생성)
├── prisma/
│   └── schema.prisma    # 데이터베이스 스키마
├── src/
│   ├── app/            # Next.js 앱 라우터
│   ├── components/     # React 컴포넌트
│   ├── lib/            # 공용 라이브러리
│   └── types/          # TypeScript 타입
└── docs/               # 문서
```

## 🔒 S추천 (Severity Recommendation) 아키텍처

S추천 시스템은 **Public DB 단일 소스(SSoT)** 로 운영됩니다.

| 구성요소 | 설명 |
|---|---|
| DB 모델 | `SeverityUsageRecord` (prisma/schema.prisma) |
| API | `/api/severity-recommend` (GET/POST/PUT) |
| Sync API | `/api/severity-recommend/sync` (워크시트 저장 후 자동 동기화) |
| UI | 워크시트 → 고장분석 → S추천 탭 |

**운영 규칙:**
- localStorage 사용 **금지** — 모든 읽기/쓰기는 DB API 경유
- FMEA 작성 시 새 고장영향-심각도 사례가 자동 DB 누적
- 모든 프로젝트가 동일 S추천 DB 공유 (전사 지식 활용)
- 관련 파일은 **CODEFREEZE L4** — `scripts/guard/protected-paths.config.json` 참조
- 스냅샷 백업: `prisma/snapshots/2026-03-28_pre-severity-db-migration/`

---

## 📖 관련 문서

- [로컬 개발 환경 구축 가이드](./docs/LOCAL_DEVELOPMENT_SETUP.md)
- [FMEA 작성 순서](./docs/중요_ONPREMISE_MASTER_PLAN.md)
- [DB 백업 가이드](./docs/DB_BACKUP_GUIDE.md)
- [모듈화 가이드](./docs/MODULARIZATION_GUIDE.md)

## 🐛 문제 해결

포트 충돌이나 데이터베이스 연결 문제가 있으면 [로컬 개발 환경 구축 가이드](./docs/LOCAL_DEVELOPMENT_SETUP.md#-문제-해결)의 문제 해결 섹션을 참조하세요.

## 📅 최종 업데이트
- 날짜: 2026-01-11
- 상태: ✅ 로컬 개발 환경 지원 완료
