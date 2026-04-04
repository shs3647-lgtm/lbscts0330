# 과거 버그 이력 + 안티패턴 + 재발 방지

> **이 문서는 과거 발생한 버그의 근본원인과 교훈을 기록하여 재발을 방지한다.**
> **새 코드 작성 전 반드시 확인하여 동일 실수를 반복하지 않는다.**

---

## 버그 이력 테이블

| 날짜 | 증상 | 근본원인 | 수정 | 교훈 |
|------|------|---------|------|------|
| 03-17 | RA DC/PC NULL → 마스터 누락 | rebuild-atomic `deleteMany` 누락 → 중복 208건 | `rebuild-atomic/route.ts` | deleteMany 후 재생성 |
| 03-17 | 통합시트 A6/B5 파싱 누락 | 개별시트 존재 시 통합시트 전체 스킵 | `excel-parser.ts` | 개별+통합 모두 파싱 |
| 03-18 | LLD추천 저장 후 사라짐 (1차) | ATOMIC DIRECT 로드에서 legacy 6ST 키 미병합 | `useWorksheetDataLoader.ts` | OPT_PREFIXES 병합 |
| 03-19 | LLD추천 재발 (2차) | API POST에서 optimizations→riskData 역매핑 누락 | `route.ts` step 13.5 | 역매핑 추가 |
| 03-19 | rowSpan NULL 2765건 | FlatItem 생성 시 rowSpan 미설정 | DB UPDATE rowSpan=1 | 생성 시 기본값 필수 |
| 03-19 | 자동수정이 orphanPC 악화 | placeholder FC/FL/RA 생성 → 불일치 확대 | 자동생성 비활성화 | 경고만 표시, 자동생성 금지 |
| 03-19 | orphanPC 근본원인 | B4.parentItemId=B1 (B3이어야) | `import-builder.ts` | B4→**B3** ID 연결 |
| 03-20 | emptyPC=1 재발 | B4 dedup key에 WE 미포함 | `import-builder.ts` | key에 WE 추가 |
| 03-21 | FL 유효 체인 8건 삭제 | FL dedup key에 feId 누락 | `rebuild-atomic/route.ts` | FL key=`fmId\|fcId\|feId` |
| 03-21 | UUID/FK 반복 누락 | dedup key에 공정번호 미포함 | Rule 1.6+1.7 제정 | 영구 CODEFREEZE |
| 03-22 | 워크시트 빈 placeholder | 로더 게이트 `l2Structures.length>0` | `useWorksheetDataLoader.ts` | `if (atomicData)` |
| 03-22 | 고장매칭 후 DB 미반영 | `saveTemp`만 호출, `saveAtomicDB` 미호출 | `useLinkHandlers.ts` | 매칭 후 DB 저장 동반 |
| 03-22 | m001 DC/PC 156건 null | 레거시 Import flat=[] + 체인 미전달 | 레거시 flat 복원 로직 | 레거시 호환 유지 |
| 03-23 | 행 추가 시 2줄 중복 | React StrictMode splice 이중 적용 | `strictModeStateUpdater.ts` | 멱등 업데이터 |
| 03-23 | B3 행 한 줄로 합침 | 이름 기준 dedup → 동일명 다른 공정 합침 | `functionL3Utils.ts` | id 중복만 제거 |
| 03-23 | 가짜 FC 누락 수십건 | atomicToLegacy에서 processCharId 우선 | `atomicToLegacyAdapter.ts` | **l3FuncId 우선** |
| 03-23 | FK 필드 23개 제거 (사고) | "런타임 호환성" 명목 | 전수 복원 | Rule 3.1 제정 |
| 03-23 | "통합" 차단으로 FC 106건 누락 | isPositionBasedFormat 오라우팅 | 차단 코드 제거 | Rule 3.2 제정 |
| 03-24 | FC 연결됨인데 FM 누락 표시 | useLinkData polled processCharId로 스킵 | `useLinkData.ts` | seenIds로만 중복 방지 |
| 03-24 | FA검증바 빨간 FAIL 과다 | 통합시트 체인 COUNT ≠ chainCount | `faVerificationSpecRelax.ts` | 파싱>0이면 NG 제외 |
| 03-25 | Import 후 미연결 FC/FM | L3 고아 + FC 시트 체인 파서 누락 | cascade 삭제 + skipDuplicates | 파서 정확성 우선 |

---

## 반복 발생 안티패턴 (절대 금지)

### 1. 카테시안 복제

```
❌ a3Items.map(a3 => a4Items.map(a4 => ({ id: uid() })))
✅ sharedPCs 1회 생성 → 동일 ID FK 참조
```

**재발 방지**: `scripts/check-cartesian.sh` 실행

### 2. 이름 기반 FK 연결

```
❌ .find(x => x.name === targetName)
✅ Map.get(targetId) — ID 기반만
```

**재발 방지**: 코드 리뷰에서 `.find(x => x.name` 패턴 검색

### 3. FK 필드 제거

```
❌ // parentId: s.parentId  (주석 처리)
✅ parentId: s.parentId || null  (null fallback)
```

**재발 방지**: Guard Test (`tests/guard/save-position-import-fk.guard.test.ts`)

### 4. 자동 데이터 생성

```
❌ `"${name} 부적합"`, inferChar(), placeholder 자동생성
✅ DB 조회 → 없으면 사용자 입력 유도
```

**재발 방지**: `grep -r "부적합\|inferChar" src/`

### 5. dedup key에 공정번호 누락

```
❌ key = `${fcName}` (동일 텍스트 = 동일 엔티티로 합침)
✅ key = `${processNo}|${fcName}` (공정별 별도 엔티티)
```

**재발 방지**: Rule 1.7 dedup key 테이블 참조

### 6. 데이터 로드 경로에 필터 삽입

```
❌ l2: atomicData.l2.filter(x => x.name !== '')
✅ l2: atomicData.l2  (원본 불변, 별도 useMemo에서 필터)
```

**재발 방지**: Rule 10.5 + `tests/e2e/manual-mode-guard.spec.ts`

### 7. saveTemp만 호출 (DB 미저장)

```
❌ handleAutoMatch → saveTemp() 만
✅ handleAutoMatch → saveTemp() + saveAtomicDB(true)
```

**재발 방지**: 모든 데이터 변경은 DB 저장 동반 확인

### 8. FailureLink 자동 생성 (카테시안 크로스프로덕트)

```
❌ 같은 공정 FM × FE로 FL 자동 생성
✅ FC 시트 파서에서 확정된 체인만 FL 생성
```

**재발 방지**: Rule 0.5 + FailureLink 영구 기록

---

## 세션 시작 시 확인 사항

1. 이 문서의 안티패턴을 숙지
2. 수정 대상 파일이 Guard Test 보호 대상인지 확인
3. dedup key에 공정번호 포함 여부 확인
4. FK 필드가 모두 보존되는지 확인
5. 데이터 로드 경로가 불변인지 확인
