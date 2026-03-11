# Docker 트러블슈팅 가이드

## 📋 목차

1. [빌드 관련 문제](#빌드-관련-문제)
2. [마이그레이션 문제](#마이그레이션-문제)
3. [데이터베이스 문제](#데이터베이스-문제)
4. [컨테이너 실행 문제](#컨테이너-실행-문제)
5. [네트워크 문제](#네트워크-문제)

---

## 빌드 관련 문제

### 1. Docker 빌드 캐시 오류

**증상**:
```
failed to prepare extraction snapshot
parent snapshot does not exist: not found
```

**원인**: Docker 빌드 캐시 손상

**해결 방법**:
```bash
# 1. 빌드 캐시 정리
docker builder prune -f

# 2. 캐시 없이 재빌드
docker-compose build --no-cache app
docker-compose build --no-cache migrate

# 3. 전체 시스템 정리 (주의: 모든 미사용 리소스 삭제)
docker system prune -a -f
```

### 2. reset-password 페이지 빌드 실패

**증상**:
```
useSearchParams() should be wrapped in a suspense boundary at page "/reset-password"
Error occurred prerendering page "/reset-password"
```

**원인**: Next.js 동적 렌더링 설정 누락

**해결 방법**: `src/app/reset-password/page.tsx`에 다음 추가
```typescript
// 파일 상단에 추가
export const dynamic = 'force-dynamic';
```

**참고**: 이미 수정되어 있음 (2026-01-30)

### 3. Prisma Client 생성 실패

**증상**:
```
Prisma Client could not be generated
```

**해결 방법**:
```bash
# 로컬에서 Prisma Client 재생성
npx prisma generate

# Docker 이미지 재빌드
docker-compose build app migrate
```

---

## 마이그레이션 문제

### 1. 테이블이 생성되지 않음

**증상**:
```
The table 'public.apqp_registrations' does not exist in the current database
```

**원인**:
- 마이그레이션이 실행되지 않음
- 앱이 먼저 시작된 후 마이그레이션 실행

**해결 방법**:
```bash
# 1. 현재 상태 확인
docker-compose ps

# 2. 마이그레이션 실행
docker-compose --profile tools run --rm migrate

# 3. 테이블 생성 확인
docker exec fmea-postgres psql -U postgres -d fmea_db -c "\dt public.*" | head -20

# 4. 앱 재시작
docker-compose restart app

# 5. 상태 확인
curl http://localhost:3001/api/health
```

### 2. 마이그레이션 스크립트 오류

**증상** (구버전):
```
unknown or unexpected option: --skip-generate
```

**원인**: Prisma 7.2에서 `--skip-generate` 옵션 제거됨

**해결 방법**: `migrate-entrypoint.sh` 수정 (이미 수정됨)
```bash
# Before (오류)
npx prisma db push --accept-data-loss --skip-generate

# After (정상)
npx prisma db push --accept-data-loss
```

### 3. 마이그레이션 파일 감지 실패

**증상**: 마이그레이션 파일이 없는데도 `prisma migrate deploy` 실행

**원인**: 마이그레이션 파일 존재 여부 체크 로직 부재

**해결 방법**: `migrate-entrypoint.sh`에 체크 로직 추가 (이미 수정됨)
```bash
# 마이그레이션 파일 확인
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  npx prisma db push --accept-data-loss
fi
```

---

## 데이터베이스 문제

### 1. PostgreSQL 연결 실패

**증상**:
```
Failed to connect to PostgreSQL
Can't reach database server
```

**해결 방법**:
```bash
# 1. PostgreSQL 컨테이너 상태 확인
docker-compose ps postgres

# 2. PostgreSQL 로그 확인
docker-compose logs postgres

# 3. 연결 테스트
docker exec fmea-postgres pg_isready -U postgres

# 4. 재시작
docker-compose restart postgres

# 5. 포트 확인 (로컬 PostgreSQL과 충돌 방지)
netstat -an | grep 5432
```

### 2. 데이터베이스 초기화

**전체 데이터 삭제 및 재생성**:
```bash
# 주의: 모든 데이터가 삭제됩니다!

# 1. 모든 컨테이너 중지 및 삭제
docker-compose down

# 2. 볼륨 삭제
docker volume rm fmea_postgres_data

# 3. 재시작 및 마이그레이션
docker-compose up -d postgres redis
sleep 10
docker-compose --profile tools run --rm migrate
docker-compose up -d app
```

### 3. 데이터베이스 백업 및 복원

**백업**:
```bash
# SQL 덤프 생성
docker exec fmea-postgres pg_dump -U postgres fmea_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 압축 백업
docker exec fmea-postgres pg_dump -U postgres fmea_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

**복원**:
```bash
# SQL 파일에서 복원
cat backup.sql | docker exec -i fmea-postgres psql -U postgres -d fmea_db

# 압축 파일에서 복원
gunzip -c backup.sql.gz | docker exec -i fmea-postgres psql -U postgres -d fmea_db
```

---

## 컨테이너 실행 문제

### 1. 컨테이너 Unhealthy 상태

**증상**: `docker-compose ps`에서 `unhealthy` 표시

**해결 방법**:
```bash
# 1. Health check 직접 실행
docker exec fmea-app node healthcheck.js

# 2. Health API 확인
curl http://localhost:3001/api/health

# 3. 앱 로그 확인
docker logs fmea-app --tail 100

# 4. 재시작
docker-compose restart app

# 5. 강제 재생성
docker-compose up -d --force-recreate app
```

### 2. 포트 충돌

**증상**:
```
Bind for 0.0.0.0:3001 failed: port is already allocated
```

**해결 방법**:
```bash
# 1. 포트 사용 프로세스 확인
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Linux/Mac

# 2. .env 파일에서 포트 변경
APP_PORT=3002

# 3. docker-compose.yml에서 포트 매핑 변경
# ports:
#   - "3002:3000"

# 4. 재시작
docker-compose down
docker-compose up -d
```

### 3. 메모리 부족

**증상**: 컨테이너가 자주 재시작되거나 느려짐

**해결 방법**:
```bash
# 1. 메모리 사용량 확인
docker stats

# 2. docker-compose.yml에서 메모리 제한 조정
# deploy:
#   resources:
#     limits:
#       memory: 2G  # 증가

# 3. 불필요한 컨테이너 정리
docker container prune -f
docker image prune -a -f
```

---

## 네트워크 문제

### 1. 컨테이너 간 통신 실패

**증상**: 앱에서 PostgreSQL/Redis 연결 실패

**해결 방법**:
```bash
# 1. 네트워크 확인
docker network ls
docker network inspect fmea-onpremise_fmea-network

# 2. 네트워크 재생성
docker-compose down
docker network prune -f
docker-compose up -d

# 3. DNS 확인
docker exec fmea-app ping postgres
docker exec fmea-app ping redis
```

### 2. 외부 접근 불가

**증상**: 브라우저에서 localhost:3001 접근 안됨

**해결 방법**:
```bash
# 1. 컨테이너 포트 바인딩 확인
docker-compose ps

# 2. 방화벽 확인 (Windows)
netsh advfirewall firewall show rule name=all | findstr 3001

# 3. 로컬호스트 대신 127.0.0.1 시도
curl http://127.0.0.1:3001/api/health

# 4. 컨테이너 내부에서 테스트
docker exec fmea-app wget -O- http://localhost:3000/api/health
```

---

## 권장 배포 절차

### 최초 배포 (Fresh Install)

```bash
# 1. 환경 설정
cp .env.production .env
# .env 파일 수정

# 2. 이미지 빌드
docker-compose build

# 3. DB 서비스 먼저 시작
docker-compose up -d postgres redis

# 4. DB 준비 대기 (10초)
sleep 10

# 5. 마이그레이션 실행
docker-compose --profile tools run --rm migrate

# 6. 앱 시작
docker-compose up -d app

# 7. 상태 확인
docker-compose ps
curl http://localhost:3001/api/health
```

### 업데이트 배포

```bash
# 1. 코드 업데이트
git pull origin main

# 2. 이미지 재빌드 (변경사항 있을 경우)
docker-compose build app

# 3. 스키마 변경 시 마이그레이션
docker-compose --profile tools run --rm migrate

# 4. 앱 재시작
docker-compose up -d --no-deps --force-recreate app

# 5. 로그 모니터링
docker-compose logs -f app
```

### 문제 발생 시 진단 순서

```bash
# 1. 컨테이너 상태 확인
docker-compose ps

# 2. 로그 확인
docker-compose logs app --tail 100
docker-compose logs postgres --tail 50

# 3. Health check
curl http://localhost:3001/api/health

# 4. 데이터베이스 연결 확인
docker exec fmea-postgres pg_isready -U postgres

# 5. 테이블 확인
docker exec fmea-postgres psql -U postgres -d fmea_db -c "\dt" | head -20

# 6. 필요시 재시작
docker-compose restart app
```

---

## 로그 분석

### 주요 로그 패턴

**정상 시작**:
```
✓ Starting...
✓ Ready in XXXms
Database connection successful
```

**마이그레이션 필요**:
```
The table 'public.xxx' does not exist
Invalid prisma.xxx.findMany() invocation
```

**메모리 부족**:
```
JavaScript heap out of memory
FATAL ERROR: Reached heap limit
```

**네트워크 문제**:
```
Can't reach database server
getaddrinfo ENOTFOUND postgres
```

---

## 추가 리소스

- [DOCKER_README.md](DOCKER_README.md) - 기본 사용 가이드
- [docs/도커구성.md](docs/도커구성.md) - 상세 구성 설명
- [migrate-entrypoint.sh](migrate-entrypoint.sh) - 마이그레이션 스크립트
- [docker-compose.yml](docker-compose.yml) - 서비스 정의

---

**마지막 업데이트**: 2026-01-30
**작성자**: Claude Code
**버전**: 1.0.0
