INSERT INTO lld_filter_code (id, "lldNo", classification, "applyTo", "processNo", "processName", "productName", "failureMode", cause, occurrence, detection, improvement, vehicle, target, "m4Category", location, "completedDate", status, "sourceType", priority, "fmeaId", "appliedDate", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  ll."lldNo",
  'FieldIssue',
  CASE WHEN ll.category = E'\uAC80\uCD9C\uAD00\uB9AC' THEN 'detection' ELSE 'prevention' END,
  '',
  COALESCE(ll.location, ''),
  COALESCE(ll.vehicle, ''),
  COALESCE(ll."failureMode", ''),
  COALESCE(ll.cause, ''),
  CASE WHEN ll.category != E'\uAC80\uCD9C\uAD00\uB9AC' THEN 5 ELSE NULL END,
  CASE WHEN ll.category = E'\uAC80\uCD9C\uAD00\uB9AC' THEN 5 ELSE NULL END,
  COALESCE(ll.improvement, ''),
  COALESCE(ll.vehicle, ''),
  COALESCE(ll.target, E'\uC81C\uC870'),
  CASE
    WHEN ll.cause ~ '^(MN|MC|IM|EN)-' THEN substring(ll.cause from '^(MN|MC|IM|EN)')
    ELSE NULL
  END,
  ll.location,
  ll."completedDate",
  COALESCE(ll.status, 'R'),
  'migrated',
  0,
  ll."fmeaId",
  ll."appliedDate",
  NOW(),
  NOW()
FROM lessons_learned ll
WHERE ll."lldNo" NOT IN (SELECT "lldNo" FROM lld_filter_code);
