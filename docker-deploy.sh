#!/bin/bash

# ===========================================
# FMEA On-Premise Docker 배포 스크립트
# ===========================================

set -e

echo "================================================"
echo "  FMEA On-Premise Docker Deployment Script"
echo "================================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 환경 변수 파일 확인
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create .env file from .env.production template"
    exit 1
fi

# Docker 및 Docker Compose 확인
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Docker Compose 명령어 결정
if docker compose version &> /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo ""
echo "📋 Deployment Options:"
echo "  1. Fresh deploy (remove old volumes)"
echo "  2. Update deploy (keep volumes)"
echo "  3. Build only (no deploy)"
echo "  4. Stop services"
echo ""
read -p "Select option (1-4): " option

case $option in
    1)
        echo -e "${YELLOW}⚠️  Warning: This will remove all volumes (data will be lost)${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Cancelled"
            exit 0
        fi

        echo ""
        echo "🗑️  Stopping and removing containers..."
        $DOCKER_COMPOSE down -v

        echo ""
        echo "🔨 Building images..."
        $DOCKER_COMPOSE build --no-cache

        echo ""
        echo "🚀 Starting services..."
        $DOCKER_COMPOSE up -d

        echo ""
        echo -e "${GREEN}✅ Fresh deployment completed${NC}"
        ;;

    2)
        echo ""
        echo "🔨 Building images..."
        $DOCKER_COMPOSE build

        echo ""
        echo "🚀 Updating services..."
        $DOCKER_COMPOSE up -d --force-recreate

        echo ""
        echo -e "${GREEN}✅ Update deployment completed${NC}"
        ;;

    3)
        echo ""
        echo "🔨 Building images..."
        $DOCKER_COMPOSE build --no-cache

        echo ""
        echo -e "${GREEN}✅ Build completed${NC}"
        ;;

    4)
        echo ""
        echo "🛑 Stopping services..."
        $DOCKER_COMPOSE down

        echo ""
        echo -e "${GREEN}✅ Services stopped${NC}"
        exit 0
        ;;

    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac

# 컨테이너 상태 확인
echo ""
echo "📊 Container Status:"
$DOCKER_COMPOSE ps

# 로그 확인 옵션
echo ""
read -p "Show logs? (yes/no): " show_logs
if [ "$show_logs" = "yes" ]; then
    echo ""
    echo "📜 Application logs (Ctrl+C to exit):"
    $DOCKER_COMPOSE logs -f app
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "📍 Access URLs:"
echo "  - Application: http://localhost:\${APP_PORT:-3001}"
echo "  - Health Check: http://localhost:\${APP_PORT:-3001}/api/health"
echo ""
echo "💡 Useful commands:"
echo "  - View logs: $DOCKER_COMPOSE logs -f app"
echo "  - Stop: $DOCKER_COMPOSE down"
echo "  - Restart: $DOCKER_COMPOSE restart app"
echo ""
