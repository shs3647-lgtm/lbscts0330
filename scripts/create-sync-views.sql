-- ============================================================================
-- PFMEA-CP-PFD 실시간 동기화 통합 뷰 (Polling 기반)
-- ============================================================================
-- 실행: psql -d your_database -f create-sync-views.sql
-- ============================================================================

-- ============================================================================
-- 1. PFMEA → CP 통합 뷰 (CP 앱에서 사용)
-- ============================================================================

CREATE OR REPLACE VIEW v_pfmea_cp_sync AS
SELECT
    -- 공유 공정 정보
    spm.id AS shared_process_id,
    spm.project_id,
    spm.fmea_id,
    spm.process_no,
    spm.process_name,
    spm.process_desc,
    spm.work_element,
    spm.m4,
    spm.version AS process_version,
    spm.updated_at AS process_updated_at,

    -- 공유 특성 정보
    scm.id AS shared_char_id,
    scm.product_characteristic,
    scm.process_characteristic,
    scm.special_characteristic,
    scm.version AS char_version,
    scm.updated_at AS char_updated_at,

    -- 리스크 참조 정보 (CP Read-only)
    srr.severity AS ref_severity,
    srr.occurrence AS ref_occurrence,
    srr.detection AS ref_detection,
    srr.ap AS ref_ap,
    srr.rpn AS ref_rpn,
    srr.failure_effect,
    srr.failure_mode,
    srr.failure_cause,

    -- CP 매핑 정보
    pcm.cp_no,
    pcm.cp_rev,
    pcm.cp_item_id,
    pcm.link_status,
    pcm.change_flag,
    pcm.sync_status,
    pcm.last_sync_at,

    -- CP 연동 가능 여부 (MN 제외)
    CASE WHEN spm.m4 IS NULL OR spm.m4 IN ('MC', 'IM', 'EN') THEN true ELSE false END AS is_cp_eligible

FROM shared_process_master spm
LEFT JOIN shared_characteristics_master scm ON scm.process_id = spm.id
LEFT JOIN shared_risk_references srr ON srr.characteristic_id = scm.id
LEFT JOIN pfmea_cp_mappings pcm ON pcm.shared_process_id = spm.id
ORDER BY spm.process_no, spm.work_element;

-- ============================================================================
-- 2. PFMEA → PFD 통합 뷰 (PFD 앱에서 사용)
-- ============================================================================

CREATE OR REPLACE VIEW v_pfmea_pfd_sync AS
SELECT
    -- 공유 공정 정보
    spm.id AS shared_process_id,
    spm.project_id,
    spm.fmea_id,
    spm.process_no,
    spm.process_name,
    spm.process_desc,
    spm.work_element,
    spm.m4,
    spm.part_name,
    spm.version,
    spm.updated_at,

    -- 특성 정보 (특별특성)
    scm.product_characteristic,
    scm.process_characteristic,
    scm.special_characteristic,

    -- PFD 매핑 정보
    ppm.pfd_no,
    ppm.pfd_item_id,
    ppm.link_status,
    ppm.change_flag

FROM shared_process_master spm
LEFT JOIN shared_characteristics_master scm ON scm.process_id = spm.id
LEFT JOIN pfmea_pfd_mappings ppm ON ppm.shared_process_id = spm.id
ORDER BY spm.process_no, spm.work_element;

-- ============================================================================
-- 3. 동기화 대기 현황 뷰 (모니터링용)
-- ============================================================================

CREATE OR REPLACE VIEW v_sync_pending AS
SELECT
    st.id,
    st.source_type,
    st.source_id,
    st.source_table,
    st.change_type,
    st.target_types,
    st.status,
    st.retry_count,
    st.error_message,
    st.created_at,
    st.processed_at,
    EXTRACT(EPOCH FROM (NOW() - st.created_at)) AS pending_seconds
FROM sync_tracker st
WHERE st.status IN ('pending', 'processing', 'failed')
ORDER BY st.created_at ASC;

-- ============================================================================
-- 4. CP 변경 알림 뷰 (CP 앱에서 변경사항 표시용)
-- ============================================================================

CREATE OR REPLACE VIEW v_cp_change_alerts AS
SELECT
    cp.id AS control_plan_id,
    cp.cp_no,
    cp.fmea_id,
    cp.fmea_no,
    cp.status AS cp_status,
    cp.sync_status,
    cp.change_count,
    cp.last_sync_at,

    -- 변경된 매핑 수
    COUNT(CASE WHEN pcm.change_flag = true THEN 1 END) AS pending_changes,

    -- PFMEA 상태
    psh.to_state AS pfmea_state,
    psh.cp_action,
    psh.created_at AS state_changed_at

FROM control_plans cp
LEFT JOIN pfmea_cp_mappings pcm ON pcm.cp_no = cp.cp_no AND pcm.link_status = 'active'
LEFT JOIN pfmea_state_history psh ON psh.fmea_id = cp.fmea_id
    AND psh.created_at = (
        SELECT MAX(created_at) FROM pfmea_state_history WHERE fmea_id = cp.fmea_id
    )
GROUP BY cp.id, cp.cp_no, cp.fmea_id, cp.fmea_no, cp.status, cp.sync_status,
         cp.change_count, cp.last_sync_at, psh.to_state, psh.cp_action, psh.created_at
HAVING COUNT(CASE WHEN pcm.change_flag = true THEN 1 END) > 0
   OR cp.sync_status IN ('modified', 'pending')
ORDER BY pending_changes DESC, cp.cp_no;

-- ============================================================================
-- 5. PFMEA-CP 완전 매핑 뷰 (추적성 심사용)
-- ============================================================================

CREATE OR REPLACE VIEW v_pfmea_cp_traceability AS
SELECT
    -- PFMEA 측
    spm.fmea_id,
    pcm.fmea_rev,
    pcm.pfmea_row_uid,
    spm.process_no AS pfmea_process_no,
    spm.process_name AS pfmea_process_name,
    spm.work_element AS pfmea_work_element,
    scm.product_characteristic AS pfmea_product_char,
    scm.process_characteristic AS pfmea_process_char,
    scm.special_characteristic AS pfmea_special_char,

    -- CP 측
    pcm.cp_no,
    pcm.cp_rev,
    cpi.process_no AS cp_process_no,
    cpi.process_name AS cp_process_name,
    cpi.work_element AS cp_work_element,
    cpi.product_char AS cp_product_char,
    cpi.process_char AS cp_process_char,
    cpi.special_char AS cp_special_char,

    -- 매핑 상태
    pcm.link_status,
    pcm.sync_status,
    pcm.change_flag,
    pcm.last_sync_at,

    -- 일치 여부 검증
    CASE
        WHEN spm.process_no = cpi.process_no
         AND spm.process_name = cpi.process_name
         AND COALESCE(scm.product_characteristic, '') = COALESCE(cpi.product_char, '')
         AND COALESCE(scm.process_characteristic, '') = COALESCE(cpi.process_char, '')
        THEN true
        ELSE false
    END AS is_synced

FROM pfmea_cp_mappings pcm
JOIN shared_process_master spm ON spm.id = pcm.shared_process_id
LEFT JOIN shared_characteristics_master scm ON scm.process_id = spm.id
LEFT JOIN control_plan_items cpi ON cpi.id = pcm.cp_item_id
WHERE pcm.link_status = 'active'
ORDER BY spm.fmea_id, spm.process_no, pcm.cp_no;

-- ============================================================================
-- 6. 폴링 상태 모니터링 뷰
-- ============================================================================

CREATE OR REPLACE VIEW v_polling_status AS
SELECT
    pss.client_id,
    pss.app_type,
    pss.document_id,
    pss.last_polled_at,
    pss.last_synced_id,
    EXTRACT(EPOCH FROM (NOW() - pss.last_polled_at)) AS seconds_since_poll,

    -- 미처리 변경사항 수
    (
        SELECT COUNT(*)
        FROM sync_tracker st
        WHERE st.created_at > pss.last_polled_at
          AND st.status = 'pending'
          AND st.target_types LIKE '%' || pss.app_type || '%'
    ) AS pending_count

FROM polling_sync_states pss
ORDER BY pss.last_polled_at DESC;

-- ============================================================================
-- 인덱스 추가 (성능 최적화)
-- ============================================================================

-- sync_tracker 테이블 인덱스 (이미 Prisma에서 생성되었을 수 있음)
CREATE INDEX IF NOT EXISTS idx_sync_tracker_polling
ON sync_tracker (created_at, status, target_types);

-- shared_process_master 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_shared_process_polling
ON shared_process_master (updated_at, fmea_id);

-- pfmea_cp_mappings 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_pfmea_cp_mapping_sync
ON pfmea_cp_mappings (sync_status, change_flag, cp_no);

-- ============================================================================
-- 완료 메시지
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '======================================';
    RAISE NOTICE 'PFMEA-CP-PFD 동기화 뷰 생성 완료';
    RAISE NOTICE '======================================';
    RAISE NOTICE '생성된 뷰:';
    RAISE NOTICE '  - v_pfmea_cp_sync: CP 앱용 통합 뷰';
    RAISE NOTICE '  - v_pfmea_pfd_sync: PFD 앱용 통합 뷰';
    RAISE NOTICE '  - v_sync_pending: 동기화 대기 현황';
    RAISE NOTICE '  - v_cp_change_alerts: CP 변경 알림';
    RAISE NOTICE '  - v_pfmea_cp_traceability: 추적성 심사용';
    RAISE NOTICE '  - v_polling_status: 폴링 상태 모니터링';
    RAISE NOTICE '======================================';
END $$;
