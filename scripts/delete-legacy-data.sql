-- ============================================================================
-- FMEA Legacy Data Deletion Script
-- Date: 2026-01-17
-- Purpose: Delete all data from fmea_legacy_data, fmea_worksheet_data tables
-- ============================================================================

-- WARNING: This operation cannot be undone!
-- Backup recommended before execution.

-- Set client encoding to UTF8
SET client_encoding = 'UTF8';

BEGIN;

-- 1. Delete fmea_legacy_data table data
DELETE FROM fmea_legacy_data;
SELECT 'fmea_legacy_data deleted' AS status;

-- 2. Delete fmea_worksheet_data table data
DELETE FROM fmea_worksheet_data;
SELECT 'fmea_worksheet_data deleted' AS status;

-- 3. Verify deletion
SELECT 'fmea_legacy_data' AS table_name, COUNT(*) AS remaining_count FROM fmea_legacy_data
UNION ALL
SELECT 'fmea_worksheet_data' AS table_name, COUNT(*) AS remaining_count FROM fmea_worksheet_data;

COMMIT;

-- Completion message
SELECT 'Legacy data deletion completed' AS result;
