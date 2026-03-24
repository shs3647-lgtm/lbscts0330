# AGENTS.md — autom-fmea

모든 AI 에이전트(Composer, Agent, Claude Code 등)는 **이 저장소에서 코드를 쓰거나 제안하기 전** 아래를 읽고 적용한다.

## 세션 시작 시 필독 (순서)

1. **Cursor 규칙**: `.cursor/rules/` — 특히 **`01-no-cartesian-name-fallback.mdc`** (`alwaysApply: true`).  
   - 카테시안 복제 · 이름(텍스트) 매칭으로 FK 확정 · 데이터 폴백 **금지**.
2. **저장소 헌법**: 루트 **`CLAUDE.md`** — Rule **0**(중앙 DB/SSoT), **1.5**(자동생성 금지), **1.6**(근본원인), **1.7**(UUID/FK ID-only).

## 위반 시

- 해당 변경은 **롤백** 대상.  
- “추천 UI” 예외는 `CLAUDE.md` Rule **0.9**에 한함.

## 수동 확인

```bash
# 카테시안 탐지 (있으면)
scripts/check-cartesian.sh

# 타입
npx tsc --noEmit
```
