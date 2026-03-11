# FMEA On-Premise 프로젝트 설정 가이드

## 📋 프로젝트 개요
- **프로젝트명**: FMEA On-Premise System
- **기술 스택**: Next.js 14, TypeScript, Prisma, PostgreSQL
- **Node 버전**: v18.x 이상 권장
- **패키지 매니저**: npm

## 🔧 필수 설치 항목

### 1. Node.js 및 npm
```bash
# Node.js 18.x 이상 설치 확인
node --version
npm --version
```

### 2. PostgreSQL 데이터베이스
- **버전**: PostgreSQL 14.x 이상
- **설치 위치**: 로컬 또는 원격 서버
- **기본 포트**: 5432

## 📦 프로젝트 초기 설정

### 1. 저장소 클론
```bash
git clone <repository-url>
cd fmea-onpremise
```

### 2. 의존성 설치
```bash
# 모든 npm 패키지 설치
npm install

# 또는 clean install (권장)
npm ci
```

### 3. 환경 변수 설정
프로젝트 루트에 `.env` 파일 생성:

```env
# Database Connection
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

# Example:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/fmea_db?schema=public"

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
```

**⚠️ 중요**: `.env` 파일은 `.gitignore`에 포함되어 있으므로 각 환경에서 직접 생성해야 합니다.

### 4. Prisma 설정

#### 4.1 Prisma Client 생성
```bash
npx prisma generate
```

#### 4.2 데이터베이스 마이그레이션
```bash
# 개발 환경 - 마이그레이션 적용
npx prisma migrate dev

# 프로덕션 환경 - 마이그레이션 배포
npx prisma migrate deploy
```

#### 4.3 Prisma Studio (선택사항)
```bash
# 데이터베이스 GUI 도구 실행
npx prisma studio
```

### 5. 개발 서버 실행
```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 📚 주요 의존성 라이브러리

### Core Dependencies
```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.0.0"
}
```

### Database & ORM
```json
{
  "@prisma/client": "^5.x.x",
  "prisma": "^5.x.x"
}
```

### UI & Styling
```json
{
  "tailwindcss": "^3.x.x",
  "autoprefixer": "^10.x.x",
  "postcss": "^8.x.x"
}
```

### Testing
```json
{
  "@playwright/test": "^1.40.0",
  "vitest": "^1.x.x"
}
```

### Utilities
```json
{
  "date-fns": "^2.x.x",
  "xlsx": "^0.18.x",
  "react-beautiful-dnd": "^13.x.x"
}
```

## 🗄️ 데이터베이스 스키마

### 주요 테이블
- `ApqpRegistration` - APQP 등록 정보
- `PfmeaRegistration` - PFMEA 등록 정보
- `DfmeaRegistration` - DFMEA 등록 정보
- `PfdRegistration` - PFD 등록 정보
- `CpRegistration` - CP 등록 정보
- `WsRegistration` - WS 등록 정보
- `User` - 사용자 정보
- `Project` - 프로젝트 정보

### 스키마 확인
```bash
# Prisma 스키마 파일 위치
# prisma/schema.prisma
```

## 🧪 테스트 실행

### E2E 테스트 (Playwright)
```bash
# 모든 테스트 실행
npx playwright test

# 특정 테스트 파일 실행
npx playwright test tests/ws-equipment-parts-modal.spec.ts

# UI 모드로 테스트 실행
npx playwright test --ui

# 테스트 리포트 보기
npx playwright show-report
```

### Unit 테스트 (Vitest)
```bash
# Unit 테스트 실행
npm run test

# Watch 모드
npm run test:watch
```

## 🔨 빌드 및 배포

### 개발 빌드
```bash
npm run build
```

### 프로덕션 실행
```bash
npm run start
```

### 타입 체크
```bash
npm run type-check
```

### Lint
```bash
npm run lint
```

## 📁 프로젝트 구조

```
fmea-onpremise/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── apqp/              # APQP 모듈
│   │   ├── pfmea/             # PFMEA 모듈
│   │   ├── dfmea/             # DFMEA 모듈
│   │   ├── pfd/               # PFD 모듈
│   │   ├── control-plan/     # CP 모듈
│   │   ├── ws/                # WS 모듈
│   │   └── api/               # API Routes
│   ├── components/            # 공통 컴포넌트
│   │   ├── layout/           # 레이아웃 컴포넌트
│   │   └── ui/               # UI 컴포넌트
│   ├── lib/                   # 유틸리티 함수
│   ├── types/                 # TypeScript 타입 정의
│   └── styles/                # 전역 스타일
├── prisma/
│   ├── schema.prisma         # Prisma 스키마
│   └── migrations/           # 마이그레이션 파일
├── tests/                     # E2E 테스트
├── public/                    # 정적 파일
├── .env                       # 환경 변수 (생성 필요)
├── .env.example              # 환경 변수 예시
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.js
```

## 🔄 Git 워크플로우

### 브랜치 전략
- `main` - 프로덕션 브랜치
- `develop` - 개발 브랜치
- `feature/*` - 기능 개발 브랜치
- `hotfix/*` - 긴급 수정 브랜치

### 커밋 컨벤션
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅, 세미콜론 누락 등
refactor: 코드 리팩토링
test: 테스트 코드 추가/수정
chore: 빌드 업무 수정, 패키지 매니저 수정 등
```

## 🚨 트러블슈팅

### 1. Prisma Client 에러
```bash
# Prisma Client 재생성
npx prisma generate

# 캐시 클리어 후 재생성
rm -rf node_modules/.prisma
npx prisma generate
```

### 2. 데이터베이스 연결 실패
- `.env` 파일의 `DATABASE_URL` 확인
- PostgreSQL 서버 실행 상태 확인
- 방화벽 설정 확인

### 3. npm install 실패
```bash
# node_modules 및 package-lock.json 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### 4. 포트 충돌
```bash
# 3000 포트 사용 중인 프로세스 확인 (Windows)
netstat -ano | findstr :3000

# 프로세스 종료
taskkill /PID <PID> /F

# 다른 포트로 실행
PORT=3001 npm run dev
```

### 5. Playwright 브라우저 설치
```bash
# Playwright 브라우저 설치
npx playwright install

# 특정 브라우저만 설치
npx playwright install chromium
```

## 📝 환경별 설정

### 개발 환경 (.env.development)
```env
DATABASE_URL="postgresql://postgres:dev_password@localhost:5432/fmea_dev?schema=public"
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

### 프로덕션 환경 (.env.production)
```env
DATABASE_URL="postgresql://prod_user:prod_password@prod-server:5432/fmea_prod?schema=public"
NEXT_PUBLIC_API_URL=https://your-domain.com
NODE_ENV=production
```

## 🔐 보안 주의사항

1. **절대 커밋하지 말 것**:
   - `.env` 파일
   - 데이터베이스 백업 파일
   - API 키 및 비밀번호

2. **`.gitignore` 확인**:
   - `.env*` (`.env.example` 제외)
   - `node_modules/`
   - `.next/`
   - `dist/`
   - `*.log`

## 📞 지원 및 문의

- **이슈 트래킹**: GitHub Issues
- **문서**: 프로젝트 Wiki
- **코드 리뷰**: Pull Request

---

**최종 업데이트**: 2026-02-01
**버전**: 1.0.0
