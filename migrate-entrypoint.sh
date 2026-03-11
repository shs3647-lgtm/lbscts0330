#!/bin/bash
set -e

echo "========================================"
echo "FMEA Database Migration Tool"
echo "========================================"

# 환경 변수 확인
echo "📝 Environment:"
echo "  - NODE_ENV: ${NODE_ENV:-production}"
echo "  - DATABASE_URL: ${DATABASE_URL:0:30}..."

# DATABASE_URL에서 호스트와 포트 추출
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

# PostgreSQL 대기
echo ""
echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
MAX_TRIES=30
TRY_COUNT=0

while [ $TRY_COUNT -lt $MAX_TRIES ]; do
  if nc -z $DB_HOST $DB_PORT 2>/dev/null; then
    echo "✅ PostgreSQL is ready!"
    break
  fi

  TRY_COUNT=$((TRY_COUNT + 1))
  echo "  Attempt $TRY_COUNT/$MAX_TRIES - waiting..."
  sleep 2
done

if [ $TRY_COUNT -eq $MAX_TRIES ]; then
  echo "❌ Failed to connect to PostgreSQL after $MAX_TRIES attempts"
  exit 1
fi

# 마이그레이션 실행
echo ""
echo "🔄 Running Prisma migrations..."
echo "========================================"

# 마이그레이션 파일 확인
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "📂 Found migration files, using 'prisma migrate deploy'..."
  if npx prisma migrate deploy; then
    echo "✅ Migrations applied successfully"
  else
    echo "❌ Migration failed"
    exit 1
  fi
else
  echo "📂 No migration files found, using 'prisma db push'..."
  if npx prisma db push --accept-data-loss; then
    echo "✅ Database schema pushed successfully"
  else
    echo "❌ Failed to push database schema"
    exit 1
  fi
fi

# 데이터베이스 상태 확인
echo ""
echo "📊 Database status:"
echo "========================================"

# PostgreSQL 명령으로 테이블 수 확인
PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p') \
  psql -h $DB_HOST -p $DB_PORT \
  -U $(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p') \
  -d $(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p') \
  -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 10;" \
  || echo "  Could not check database tables"

echo ""
echo "✅ Migration completed successfully!"
echo "========================================"
