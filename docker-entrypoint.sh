#!/bin/sh
set -e

echo "================================================"
echo "FMEA On-Premise Docker Container Starting..."
echo "================================================"

# 환경 변수 확인
echo "📝 Environment:"
echo "  - NODE_ENV: $NODE_ENV"
echo "  - PORT: $PORT"
echo "  - DATABASE_URL: ${DATABASE_URL:0:30}..."

# PostgreSQL 대기 (nc 사용)
echo ""
echo "⏳ Waiting for PostgreSQL..."

# DATABASE_URL에서 호스트와 포트 추출
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

MAX_TRIES=30
TRY_COUNT=0

while [ $TRY_COUNT -lt $MAX_TRIES ]; do
  if nc -z $DB_HOST $DB_PORT 2>/dev/null; then
    echo "✅ PostgreSQL is reachable at $DB_HOST:$DB_PORT"
    break
  fi

  TRY_COUNT=$((TRY_COUNT + 1))
  echo "  Attempt $TRY_COUNT/$MAX_TRIES - waiting for $DB_HOST:$DB_PORT..."
  sleep 2
done

if [ $TRY_COUNT -eq $MAX_TRIES ]; then
  echo "⚠️  PostgreSQL not reachable after $MAX_TRIES attempts"
  echo "⚠️  Application will start anyway and attempt to connect at runtime"
fi

echo ""
echo "ℹ️  Database migrations should be run separately using the 'migrate' service"
echo "   Run: docker-compose run --rm migrate"
echo ""
echo "🚀 Starting Next.js application..."
echo "================================================"

# Next.js 시작
exec node server.js
