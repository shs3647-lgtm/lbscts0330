/**
 * @file create-snapshot.js
 * @description 커밋 시 자동 스냅샷 생성 스크립트
 * @created 2026-02-05
 * 
 * 실행: node scripts/create-snapshot.js [--full]
 * 
 * 기능:
 * 1. 현재 시점의 파일 구조 스냅샷
 * 2. API 엔드포인트 목록 추출
 * 3. 테스트 케이스 체크리스트 생성
 * 4. 변경된 파일 목록 저장
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 스냅샷 저장 폴더
const SNAPSHOTS_DIR = path.join(__dirname, '..', 'snapshots');
const MAX_SNAPSHOTS = 10;  // 최대 보존 스냅샷 수

// 현재 시간 포맷
function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// Git 정보 가져오기
function getGitInfo() {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const lastCommit = execSync('git log -1 --format="%H|%s|%an|%ai"', { encoding: 'utf8' }).trim();
    const [hash, message, author, date] = lastCommit.split('|');
    const changedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const stagedFiles = execSync('git diff --name-only', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    
    return {
      branch,
      lastCommit: { hash, message, author, date },
      changedFiles,
      stagedFiles,
    };
  } catch (e) {
    return {
      branch: 'unknown',
      lastCommit: { hash: '', message: '', author: '', date: '' },
      changedFiles: [],
      stagedFiles: [],
    };
  }
}

// API 엔드포인트 추출
function extractApiEndpoints() {
  const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
  const endpoints = [];
  
  function scanDir(dir, basePath = '/api') {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // [id] 같은 동적 라우트 처리
        const routePath = item.startsWith('[') ? `${basePath}/:${item.slice(1, -1)}` : `${basePath}/${item}`;
        scanDir(fullPath, routePath);
      } else if (item === 'route.ts' || item === 'route.js') {
        // route.ts 파일에서 HTTP 메서드 추출
        const content = fs.readFileSync(fullPath, 'utf8');
        const methods = [];
        if (content.includes('export async function GET') || content.includes('export function GET')) methods.push('GET');
        if (content.includes('export async function POST') || content.includes('export function POST')) methods.push('POST');
        if (content.includes('export async function PUT') || content.includes('export function PUT')) methods.push('PUT');
        if (content.includes('export async function DELETE') || content.includes('export function DELETE')) methods.push('DELETE');
        if (content.includes('export async function PATCH') || content.includes('export function PATCH')) methods.push('PATCH');
        
        endpoints.push({
          path: basePath,
          methods,
          file: fullPath.replace(path.join(__dirname, '..'), ''),
        });
      }
    }
  }
  
  scanDir(apiDir);
  return endpoints;
}

// 주요 폴더 구조 추출
function extractFileStructure() {
  const srcDir = path.join(__dirname, '..', 'src', 'app');
  const structure = [];
  
  function scanDir(dir, depth = 0, prefix = '') {
    if (depth > 3) return;  // 최대 깊이 제한
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir).sort();
    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules') continue;
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        structure.push(`${prefix}${item}/`);
        scanDir(fullPath, depth + 1, prefix + '  ');
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        const size = stat.size;
        const sizeLabel = size > 50000 ? ' [LARGE]' : size > 20000 ? ' [MEDIUM]' : '';
        structure.push(`${prefix}${item}${sizeLabel}`);
      }
    }
  }
  
  structure.push('src/app/');
  scanDir(srcDir, 0, '  ');
  return structure;
}

// ★★★ 도움말 매뉴얼 생성 (2026-02-06 추가) ★★★
function generateUserManual() {
  return `# FMEA 시스템 사용자 도움말 매뉴얼
생성일: ${new Date().toISOString()}

---

## 1. 컨텍스트 메뉴 (우클릭 메뉴)

워크시트에서 우클릭하면 컨텍스트 메뉴가 표시됩니다.

### 1.1 행 추가 메뉴

| 메뉴 | 아이콘 | 설명 |
|------|--------|------|
| **위로 새 행 추가** | ⬆️ | 현재 행 위에 독립적인 새 행 추가 (병합 영역 밖) |
| **아래로 새 행 추가** | ⬇️ | 현재 행 아래에 독립적인 새 행 추가 (병합 영역 밖) |

### 1.2 병합 내 추가 메뉴

| 메뉴 | 아이콘 | 설명 |
|------|--------|------|
| **병합 위로 추가** | ⬆️➕ | 클릭한 위치 위에 항목 추가 |
| **병합 아래 추가** | ⬇️➕ | 클릭한 위치 아래에 항목 추가 |

#### 병합 추가 동작 (클릭 위치에 따라)
- **공정 셀 클릭** → 새 공정 추가 (병합 밖으로)
- **기능 셀 클릭** → 같은 공정 내에 새 기능 추가
- **특성 셀 클릭** → 같은 기능 내에 새 특성 추가

### 1.3 기타 메뉴

| 메뉴 | 아이콘 | 설명 |
|------|--------|------|
| **행 삭제** | 🗑️ | 빈 행만 즉시 삭제, 데이터 있으면 확인 필요 |
| **위 행과 병합** | 🔗 | 현재 셀을 위쪽 행의 셀과 합침 |
| **아래 행과 병합** | 🔗 | 현재 셀을 아래쪽 행의 셀과 합침 |
| **실행취소** | ↩️ | 최근 작업 취소 |
| **다시실행** | ↪️ | 취소한 작업 복원 |
| **도움말** | ❓ | 메뉴 기능 설명 표시 |

---

## 2. PFMEA 워크시트 탭

### 2.1 구조분석 탭
- **L1 완제품**: 완제품 공정명 입력
- **L2 공정**: 메인 공정 추가/수정/삭제
- **L3 작업요소**: 세부 작업요소 추가/수정/삭제

### 2.2 기능분석 탭
- **1L 기능**: 완제품 구분/기능/요구사항
- **2L 기능**: 공정기능/제품특성
- **3L 기능**: 작업기능/공정특성

### 2.3 고장분석 탭
- **1L 영향**: 고장영향(FE) 입력
- **2L 형태**: 고장형태(FM) 입력
- **3L 원인**: 고장원인(FC) 입력

### 2.4 고장연결 탭
- FM-FE-FC 연결 관계 설정
- 연결 다이어그램 시각화

### 2.5 ALL 탭
- 전체 데이터 통합 뷰
- 인라인 편집 지원

### 2.6 최적화 탭
- S/O/D 점수 입력
- AP (Action Priority) 자동 계산
- 리스크 분석

---

## 3. 모드 전환

### 3.1 자동 모드 (기본)
- 마스터 데이터에서 항목 선택
- 정형화된 데이터 입력

### 3.2 수동 모드
- 직접 텍스트 입력 가능
- 컨텍스트 메뉴로 행 추가/삭제
- 더블클릭으로 인라인 편집

**모드 전환 방법**: 헤더의 "자동/수동" 토글 버튼 클릭

---

## 4. 데이터 저장

### 4.1 자동 저장
- 데이터 변경 시 자동으로 localStorage에 저장
- 주기적으로 DB에 동기화

### 4.2 수동 저장
- "저장" 버튼 클릭
- 확정 후 변경 불가 (개정 필요)

---

## 5. 엑셀 연동

### 5.1 임포트
- 기초정보 임포트: 엑셀에서 구조 데이터 불러오기
- 워크시트 임포트: 전체 FMEA 데이터 불러오기

### 5.2 내보내기
- 워크시트 내보내기: 현재 데이터를 엑셀로 저장
- FMEA4 형식 내보내기: 표준 양식으로 출력

---

## 6. 단축키

| 단축키 | 기능 |
|--------|------|
| Ctrl+S | 저장 |
| Ctrl+Z | 실행취소 |
| Ctrl+Y | 다시실행 |
| Delete | 선택 셀 내용 삭제 |
| Enter | 셀 편집 확정 |
| Esc | 셀 편집 취소 |

---

## 7. 문제 해결

### 7.1 데이터가 저장되지 않을 때
1. 브라우저 새로고침 후 재시도
2. localStorage 용량 확인
3. 네트워크 연결 상태 확인

### 7.2 화면이 로드되지 않을 때
1. 브라우저 캐시 삭제
2. 다른 브라우저에서 시도
3. 개발자 도구(F12)에서 오류 확인

---

*이 매뉴얼은 커밋 시 자동 생성됩니다.*
`;
}

// 테스트 케이스 체크리스트 생성
function generateTestCases() {
  return `# 테스트 케이스 체크리스트
생성일: ${new Date().toISOString()}

## PFMEA 모듈

### 등록 (Register)
- [ ] 등록 화면 로드 정상
- [ ] 기초정보 입력 및 저장
- [ ] CFT 멤버 추가/수정/삭제
- [ ] 연동 설정 (CP, PFD, DFMEA)
- [ ] 저장 후 리스트 반영

### 리스트 (List)
- [ ] FMEA 리스트 조회
- [ ] 검색/필터 동작
- [ ] 삭제 기능
- [ ] 개정 이력 조회

### 기초정보 임포트 (Import)
- [ ] 엑셀 파일 업로드
- [ ] 미리보기 표시
- [ ] 데이터 임포트 완료
- [ ] 임포트 후 워크시트 반영

### 워크시트 - 구조분석
- [ ] 구조분석 탭 로드
- [ ] L1 완제품 입력
- [ ] L2 공정 추가/수정/삭제
- [ ] L3 작업요소 추가/수정/삭제
- [ ] 작업요소 모달 동작
- [ ] 공통 MN 작업요소 표시
- [ ] 구조분석 확정

### 워크시트 - 기능분석
- [ ] L1 기능분석 (구분/기능/요구사항)
- [ ] L2 기능분석 (공정기능/제품특성)
- [ ] L3 기능분석 (작업기능/공정특성)
- [ ] 각 레벨 확정

### 워크시트 - 고장분석
- [ ] L1 고장영향 입력
- [ ] L2 고장형태 입력
- [ ] L3 고장원인 입력
- [ ] 각 레벨 확정

### 워크시트 - 고장연결
- [ ] FM-FE-FC 연결
- [ ] 연결 다이어그램 표시
- [ ] 연결 테이블 동작
- [ ] 고장연결 확정

### 워크시트 - ALL 화면
- [ ] ALL 탭 로드
- [ ] 전체 데이터 표시
- [ ] 인라인 편집
- [ ] 셀 병합 표시

### 워크시트 - 최적화/리스크
- [ ] S/O/D 입력
- [ ] AP 자동 계산
- [ ] 리스크 분석 확정

### 엑셀 내보내기
- [ ] 워크시트 엑셀 내보내기
- [ ] FMEA4 엑셀 내보내기

## CP 모듈

### Control Plan
- [ ] CP 등록 화면
- [ ] CP 리스트 조회
- [ ] PFMEA 연동
- [ ] CP 워크시트 저장
- [ ] 엑셀 임포트/내보내기

## PFD 모듈

### Process Flow Diagram
- [ ] PFD 등록
- [ ] PFD 리스트 조회
- [ ] PFMEA 연동
- [ ] PFD 워크시트

## 원자성 DB 저장

### 데이터 정합성
- [ ] L2Structure rowIndex 저장
- [ ] L3Structure rowIndex 저장
- [ ] parentId 연결 정상
- [ ] mergeGroupId 설정
- [ ] UnifiedProcessItem 동기화
- [ ] productChar/processChar 연동

---

## 테스트 결과 요약

| 영역 | 테스트 항목 | 통과 | 실패 | 미테스트 |
|------|-----------|------|------|---------|
| PFMEA 등록 | 5 | - | - | - |
| PFMEA 리스트 | 4 | - | - | - |
| 기초정보 임포트 | 4 | - | - | - |
| 구조분석 | 7 | - | - | - |
| 기능분석 | 4 | - | - | - |
| 고장분석 | 4 | - | - | - |
| 고장연결 | 4 | - | - | - |
| ALL 화면 | 4 | - | - | - |
| 최적화/리스크 | 3 | - | - | - |
| CP | 5 | - | - | - |
| PFD | 4 | - | - | - |
| 원자성 DB | 6 | - | - | - |

**총계**: 54개 항목

---

## 참고사항
- 실패한 테스트 항목은 커밋 전 수정 필요
- 미테스트 항목은 배포 전 반드시 확인
`;
}

// 오래된 스냅샷 정리
function cleanupOldSnapshots() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) return;
  
  const snapshots = fs.readdirSync(SNAPSHOTS_DIR)
    .filter(f => fs.statSync(path.join(SNAPSHOTS_DIR, f)).isDirectory())
    .sort()
    .reverse();
  
  // 최대 개수 초과 시 오래된 것 삭제
  if (snapshots.length > MAX_SNAPSHOTS) {
    const toDelete = snapshots.slice(MAX_SNAPSHOTS);
    for (const dir of toDelete) {
      const fullPath = path.join(SNAPSHOTS_DIR, dir);
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`🗑️  오래된 스냅샷 삭제: ${dir}`);
    }
  }
}

// 메인 실행
function main() {
  console.log('📸 스냅샷 생성 시작...\n');
  
  const timestamp = getTimestamp();
  const snapshotDir = path.join(SNAPSHOTS_DIR, timestamp);
  
  // 스냅샷 폴더 생성
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
  fs.mkdirSync(snapshotDir, { recursive: true });
  
  // 1. Git 정보
  console.log('📋 Git 정보 수집...');
  const gitInfo = getGitInfo();
  
  // 2. 스냅샷 정보 저장
  const snapshotInfo = {
    timestamp,
    createdAt: new Date().toISOString(),
    git: gitInfo,
    nodeVersion: process.version,
  };
  fs.writeFileSync(
    path.join(snapshotDir, 'snapshot-info.json'),
    JSON.stringify(snapshotInfo, null, 2)
  );
  console.log('  ✓ snapshot-info.json');
  
  // 3. API 엔드포인트 추출
  console.log('🔌 API 엔드포인트 추출...');
  const endpoints = extractApiEndpoints();
  fs.writeFileSync(
    path.join(snapshotDir, 'api-endpoints.json'),
    JSON.stringify(endpoints, null, 2)
  );
  console.log(`  ✓ api-endpoints.json (${endpoints.length}개)`);
  
  // 4. 파일 구조 추출
  console.log('📂 파일 구조 추출...');
  const structure = extractFileStructure();
  fs.writeFileSync(
    path.join(snapshotDir, 'file-structure.txt'),
    structure.join('\n')
  );
  console.log(`  ✓ file-structure.txt`);
  
  // 5. 테스트 케이스 생성
  console.log('📝 테스트 케이스 생성...');
  const testCases = generateTestCases();
  fs.writeFileSync(
    path.join(snapshotDir, 'test-cases.md'),
    testCases
  );
  console.log('  ✓ test-cases.md');
  
  // 6. 사용자 도움말 매뉴얼 생성
  console.log('📖 사용자 도움말 매뉴얼 생성...');
  const userManual = generateUserManual();
  fs.writeFileSync(
    path.join(snapshotDir, 'user-manual.md'),
    userManual
  );
  console.log('  ✓ user-manual.md');
  
  // 7. 변경된 파일 목록
  if (gitInfo.changedFiles.length > 0 || gitInfo.stagedFiles.length > 0) {
    const changedContent = [
      '# 변경된 파일 목록',
      '',
      '## Staged (커밋 예정)',
      ...gitInfo.changedFiles.map(f => `- ${f}`),
      '',
      '## Unstaged (미커밋)',
      ...gitInfo.stagedFiles.map(f => `- ${f}`),
    ].join('\n');
    fs.writeFileSync(
      path.join(snapshotDir, 'changed-files.txt'),
      changedContent
    );
    console.log('  ✓ changed-files.txt');
  }
  
  // 7. 오래된 스냅샷 정리
  cleanupOldSnapshots();
  
  console.log(`\n✅ 스냅샷 생성 완료: snapshots/${timestamp}/`);
  console.log('━'.repeat(50));
  console.log(`📁 스냅샷 위치: ${snapshotDir}`);
  console.log(`📊 API 엔드포인트: ${endpoints.length}개`);
  console.log(`📝 테스트 케이스: 54개 항목`);
  console.log('━'.repeat(50));
  
  return snapshotDir;
}

// 실행
if (require.main === module) {
  main();
}

module.exports = { main, getTimestamp, extractApiEndpoints };
