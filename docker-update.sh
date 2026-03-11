#!/bin/bash

##############################################################################
# Docker 업데이트 스크립트
#
# 용도: 로컬 개발 완료 후 Docker 환경 업데이트 (배포 전 최종 확인)
# 실행: ./docker-update.sh
##############################################################################

set -e  # 에러 발생 시 중단

echo "========================================"
echo "🐳 FMEA Docker 업데이트"
echo "========================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 시작 시간 기록
START_TIME=$(date +%s)

# 1. 현재 상태 확인
echo -e "${BLUE}[1/5]${NC} 현재 Docker 상태 확인..."
docker-compose ps

echo ""
read -p "Docker 업데이트를 계속하시겠습니까? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}취소되었습니다.${NC}"
    exit 0
fi

# 2. 앱 이미지 재빌드
echo ""
echo -e "${BLUE}[2/5]${NC} 앱 이미지 재빌드 중..."
docker-compose build app

# 3. 스키마 변경 확인
echo ""
echo -e "${BLUE}[3/5]${NC} 데이터베이스 스키마 변경 여부 확인..."
read -p "Prisma 스키마가 변경되었습니까? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}마이그레이션 실행 중...${NC}"
    docker-compose --profile tools run --rm migrate
else
    echo -e "${GREEN}마이그레이션 건너뜀${NC}"
fi

# 4. 컨테이너 재시작
echo ""
echo -e "${BLUE}[4/5]${NC} 앱 컨테이너 재시작 중..."
docker-compose up -d --no-deps --force-recreate app

# 5. Health Check 대기
echo ""
echo -e "${BLUE}[5/5]${NC} 컨테이너 시작 대기 (최대 30초)..."
RETRY_COUNT=0
MAX_RETRIES=15

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 앱이 정상적으로 시작되었습니다!${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 2
done

echo ""

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}✗ Health check 실패${NC}"
    echo ""
    echo "로그 확인:"
    docker-compose logs app --tail 50
    exit 1
fi

# 6. 최종 상태 확인
echo ""
echo "========================================"
echo -e "${GREEN}✅ Docker 업데이트 완료!${NC}"
echo "========================================"
echo ""

# 종료 시간 계산
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "📊 업데이트 정보:"
echo "  - 소요 시간: ${ELAPSED}초"
echo "  - 앱 URL: http://localhost:3001"
echo ""

# Health check 상세 정보
echo "🏥 Health Check:"
curl -s http://localhost:3001/api/health | python -m json.tool 2>/dev/null || curl -s http://localhost:3001/api/health

echo ""
echo ""
echo "📋 컨테이너 상태:"
docker-compose ps

echo ""
echo -e "${YELLOW}💡 Tip:${NC} 로그 확인: ${BLUE}docker-compose logs -f app${NC}"
echo ""
