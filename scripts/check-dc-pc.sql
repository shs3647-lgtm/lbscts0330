SELECT 
  length(data::text) as data_len,
  (data::text LIKE '%detection-%')::text as has_detection,
  (data::text LIKE '%prevention-%')::text as has_prevention,
  (data::text LIKE '%riskData%')::text as has_riskData
FROM pfmea_pfm26_m066.fmea_legacy_data 
WHERE "fmeaId" = 'pfm26-m066' 
LIMIT 1;
