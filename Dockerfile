# ===========================================
# FMEA On-Premise Dockerfile
# Multi-stage build for production deployment
# ===========================================

# --------------------------------------------
# Stage 1: Dependencies
# --------------------------------------------
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# package.json 및 lock 파일 복사
COPY package.json package-lock.json* ./

# 종속성 설치 (peer dependency 충돌 우회)
RUN npm ci --legacy-peer-deps --ignore-scripts

# --------------------------------------------
# Stage 2: Builder
# --------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# 종속성 복사
COPY --from=deps /app/node_modules ./node_modules

# 소스 코드 복사
COPY . .

# Prisma 클라이언트 생성
RUN npx prisma generate

# Next.js 빌드 (Standalone 모드)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npx next build

# --------------------------------------------
# Stage 3: Runner (Production)
# --------------------------------------------
FROM node:20-alpine AS runner

# 시스템 패키지 설치
RUN apk add --no-cache \
    ca-certificates \
    curl \
    wget \
    bash

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 시스템 사용자 생성 (보안)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 빌드된 파일 복사
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma 관련 파일 복사 (마이그레이션 포함!)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI 복사 (마이그레이션 실행용 - wasm 파일 포함 전체 .bin 복사)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Healthcheck 및 Entrypoint 스크립트 복사
COPY --from=builder --chown=nextjs:nodejs /app/healthcheck.js ./healthcheck.js
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

# Entrypoint 스크립트 실행 권한
RUN chmod +x ./docker-entrypoint.sh

# 포트 노출
EXPOSE 3000

# Healthcheck 설정
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node healthcheck.js || exit 1

# nextjs 사용자로 전환
USER nextjs

# 직접 Node.js로 시작 (shell script 이슈 우회)
CMD ["node", "server.js"]
