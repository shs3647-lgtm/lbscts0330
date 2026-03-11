# FMEA On-Premise Docker 배포 가이드

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# .env 파일 생성 (템플릿에서 복사)
cp .env.production .env

# .env 파일 수정 (필수!)
# - DB_PASSWORD 변경
# - REDIS_PASSWORD 변경
# - JWT_SECRET 변경
# - SESSION_SECRET 변경
```

### 2. Docker 빌드 및 실행

```bash
# 전체 빌드 및 시작
docker-compose build
docker-compose up -d

# 또는 배포 스크립트 사용
chmod +x docker-deploy.sh
./docker-deploy.sh
```

### 3. 확인

```bash
# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f app

# Health check
curl http://localhost:3001/api/health
```

---

## 🔄 개발 워크플로우

### 일상 개발 (로컬)
```bash
# Hot Reload로 빠른 개발
npm run dev
# → http://localhost:3000
# → 코드 변경 시 1-2초 내 자동 반영
```

### Docker 업데이트 (배포 전 확인, 하루 1-2회)
```bash
# 간편 업데이트 스크립트
./docker-update.bat        # Windows
./docker-update.sh         # Linux/Mac

# 또는 수동으로
docker-compose build app
docker-compose up -d --force-recreate app
```

**docker-update 스크립트 기능**:
- ✅ 자동 빌드 및 재시작
- ✅ 스키마 변경 시 마이그레이션 선택 실행
- ✅ Health check 자동 확인
- ✅ 소요 시간 및 상태 리포트

### 프로덕션 배포 (주 1회 또는 릴리즈 시)
```bash
git push origin main

# 서버에서
git pull origin main
docker-compose build
docker-compose --profile tools run --rm migrate
docker-compose up -d --force-recreate app
```

## 📦 포함된 서비스

| 서비스 | 포트 | 설명 |
|--------|------|------|
| **app** | 3001 | Next.js 애플리케이션 |
| **postgres** | 5432 | PostgreSQL 데이터베이스 |
| **redis** | 6379 | Redis 캐시 |
| **nginx** | 80, 443 | 리버스 프록시 (옵션) |

## 🔧 주요 기능

### ✅ 데이터베이스 마이그레이션

**중요**: 마이그레이션은 별도 서비스로 분리되어 있어 수동으로 실행해야 합니다.

```bash
# 최초 배포 또는 스키마 변경 후 실행
docker-compose --profile tools run --rm migrate
```

마이그레이션 서비스는:
1. PostgreSQL 연결 대기
2. Prisma 마이그레이션 실행 (`prisma migrate deploy`)
3. 마이그레이션 없으면 `prisma db push` 실행
4. 데이터베이스 테이블 목록 출력

앱 컨테이너는 시작 시 PostgreSQL 연결 확인만 수행합니다

### ✅ Health Check

- `/api/health` 엔드포인트로 상태 확인
- 데이터베이스 연결 체크
- 메모리 사용량 모니터링

### ✅ 데이터 영속성

Docker Volumes로 데이터 보관:
- `fmea_postgres_data` - 데이터베이스
- `fmea_redis_data` - Redis 캐시
- `fmea_uploads` - 업로드 파일
- `fmea_logs` - 로그 파일

## 📋 명령어 모음

### 기본 명령어

```bash
# 시작
docker-compose up -d

# 중지
docker-compose down

# 재시작
docker-compose restart app

# 로그 확인
docker-compose logs -f app
docker-compose logs -f postgres

# 상태 확인
docker-compose ps
```

### 데이터베이스 관리

```bash
# PostgreSQL 접속
docker exec -it fmea-postgres psql -U postgres -d fmea_db

# 데이터베이스 백업
docker exec fmea-postgres pg_dump -U postgres fmea_db > backup.sql

# 데이터베이스 복원
cat backup.sql | docker exec -i fmea-postgres psql -U postgres -d fmea_db
```

### 컨테이너 접속

```bash
# 앱 컨테이너 접속
docker exec -it fmea-app sh

# Prisma Studio 실행 (개발용)
docker exec -it fmea-app npx prisma studio
```

## 🔄 업데이트 배포

```bash
# 1. 새 코드 가져오기
git pull origin main

# 2. 이미지 재빌드
docker-compose build app

# 3. 서비스 재시작
docker-compose up -d --no-deps --force-recreate app

# 4. 로그 확인
docker-compose logs -f app
```

## 🐛 트러블슈팅

### 문제 1: 포트 충돌

```bash
# 포트 변경 (.env 파일)
APP_PORT=3002
DB_PORT=5433
```

### 문제 2: 데이터베이스 연결 실패

```bash
# PostgreSQL 로그 확인
docker-compose logs postgres

# 연결 테스트
docker exec fmea-postgres pg_isready -U postgres
```

### 문제 3: 테이블이 존재하지 않음 (apqp_registrations 등)

**증상**: 앱 로그에 `The table 'public.apqp_registrations' does not exist` 에러

**원인**: 데이터베이스 마이그레이션이 실행되지 않았거나, 앱이 시작된 후 마이그레이션을 실행함

**해결 방법**:
```bash
# 1. 마이그레이션 실행 (최초 1회 필수)
docker-compose --profile tools run --rm migrate

# 2. 테이블 생성 확인
docker exec fmea-postgres psql -U postgres -d fmea_db -c "\dt public.apqp*"

# 3. 앱 컨테이너 재시작
docker-compose restart app

# 4. 상태 확인
docker-compose ps
curl http://localhost:3001/api/health
```

**권장 배포 순서**:
```bash
# 올바른 순서
docker-compose up -d postgres redis        # 1. DB 서비스만 먼저 시작
docker-compose --profile tools run --rm migrate  # 2. 마이그레이션 실행
docker-compose up -d app                   # 3. 앱 시작
```

### 문제 4: 마이그레이션 실패

```bash
# 마이그레이션 서비스 재실행
docker-compose --profile tools run --rm migrate

# 로그 확인
docker-compose --profile tools logs migrate

# 수동 접근 (고급)
docker-compose --profile tools run --rm migrate sh

# migrate 이미지 재빌드 (스크립트 수정 후)
docker-compose build migrate
```

**참고**: 앱 컨테이너에서 직접 Prisma CLI 사용은 지원되지 않습니다 (standalone 빌드).
마이그레이션은 반드시 별도 migrate 서비스를 사용하세요

**마이그레이션 스크립트 주요 수정사항**:
- Prisma 7.2 호환: `--skip-generate` 옵션 제거
- 마이그레이션 파일 존재 여부 체크 로직 추가
- 마이그레이션 파일 없으면 `prisma db push` 자동 실행

### 문제 5: Docker 빌드 캐시 오류

**증상**: `failed to prepare extraction snapshot` 에러

```bash
# Docker 빌드 캐시 정리
docker builder prune -f

# 캐시 없이 재빌드
docker-compose build --no-cache migrate
docker-compose build --no-cache app
```

### 문제 6: 컨테이너 unhealthy

```bash
# Health check 확인
docker exec fmea-app node healthcheck.js

# Health API 확인
docker exec fmea-app wget -O- http://localhost:3000/api/health

# 앱 로그 확인
docker logs fmea-app --tail 100

# 컨테이너 재시작
docker-compose restart app
```

## 🔐 보안 체크리스트

- [ ] .env 파일에 강력한 비밀번호 설정
- [ ] JWT_SECRET 및 SESSION_SECRET 변경
- [ ] 외부 노출 포트 최소화
- [ ] Nginx HTTPS 설정 (프로덕션)
- [ ] 정기 백업 설정

## 📚 관련 문서

- [도커구성.md](docs/도커구성.md) - 상세 Docker 구성 가이드
- [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) - Docker 빠른 시작
- [DOCKER_STATUS.md](DOCKER_STATUS.md) - Docker 구성 상태

## 🆘 도움말

문제가 발생하면:
1. 로그 확인: `docker-compose logs -f app`
2. 컨테이너 상태: `docker-compose ps`
3. Health check: `curl http://localhost:3001/api/health`

---

**마지막 업데이트**: 2026-01-30
**버전**: 1.0.0
