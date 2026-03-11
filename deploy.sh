#!/bin/bash
# ===========================================
# FMEA On-Premise 원클릭 배포 스크립트
# 사용법: bash deploy.sh
# ===========================================

set -e

SERVER="192.168.219.41"
REMOTE_DIR="/home/nest/SDD_FMEA"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo " FMEA 배포 시작"
echo " 서버: $SERVER"
echo " 경로: $REMOTE_DIR"
echo "=========================================="

# 1. 소스 코드 동기화 (rsync 사용, 없으면 git push/pull)
echo ""
echo "[1/4] 소스 코드 동기화 중..."

if command -v rsync &>/dev/null; then
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude '.git' \
        --exclude '.env' \
        --exclude '.env*.local' \
        --exclude 'uploads' \
        --exclude 'logs' \
        --exclude 'backups' \
        --exclude 'coverage' \
        --exclude '.vscode' \
        --exclude '*.log' \
        --exclude 'tmp' \
        "$LOCAL_DIR/" "$SERVER:$REMOTE_DIR/"
    echo "  rsync 동기화 완료"
else
    echo "  rsync 없음 - git push/pull 방식 사용"
    echo "  로컬 git push..."
    cd "$LOCAL_DIR"
    git push origin main 2>&1 || echo "  (push 스킵 - 이미 최신)"
    echo "  서버 git pull..."
    ssh "$SERVER" "cd $REMOTE_DIR && git pull origin main 2>&1"
    echo "  git 동기화 완료"
fi

# 2. Docker 이미지 빌드
echo ""
echo "[2/4] Docker 이미지 빌드 중... (시간이 걸릴 수 있습니다)"
ssh "$SERVER" "cd $REMOTE_DIR && docker compose build app 2>&1 | tail -5"
echo "  빌드 완료"

# 3. 컨테이너 재시작
echo ""
echo "[3/4] 컨테이너 재시작 중..."
ssh "$SERVER" "cd $REMOTE_DIR && docker compose up -d 2>&1 | grep -E '(Started|Running|Created)'"
echo "  재시작 완료"

# 4. 헬스체크 대기
echo ""
echo "[4/4] 헬스체크 대기 중..."
for i in $(seq 1 12); do
    STATUS=$(ssh "$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001" 2>/dev/null)
    if [ "$STATUS" = "200" ]; then
        echo "  앱 정상 응답 (HTTP 200)"
        break
    fi
    echo "  대기 중... ($i/12)"
    sleep 5
done

# 결과 출력
echo ""
echo "=========================================="
echo " 배포 완료!"
echo "=========================================="
ssh "$SERVER" "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" 2>/dev/null
echo ""
echo " 접속: http://$SERVER:3001"
echo "=========================================="