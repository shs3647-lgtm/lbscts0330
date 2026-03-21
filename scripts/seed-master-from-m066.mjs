/**
 * Seeds public.master_fmea_reference from pfmea_pfm26_m066 WE chain data,
 * then merges KrIndustryDetection / KrIndustryPrevention by m4/category.
 *
 * Usage: node scripts/seed-master-from-m066.mjs
 * Override: MASTER_SEED_DATABASE_URL=... node scripts/seed-master-from-m066.mjs
 */
import pg from 'pg';
import { randomUUID } from "crypto";

const CONNECTION_STRING =
  process.env.MASTER_SEED_DATABASE_URL ??
  "postgresql://postgres:1234@localhost:5432/fmea_db";

const SOURCE_SCHEMA = "pfmea_pfm26_m066";
const SOURCE_PROJECT = "pfm26-m066";
const SOURCE_TYPE = "m066";
const KEY_SEP = String.fromCharCode(0);

const PRISMA_FIELD_ALIASES = {
  we_name: "weName",
  process_no: "processNo",
  process_name: "processName",
  b2_functions: "b2Functions",
  b3_chars: "b3Chars",
  b4_causes: "b4Causes",
  b5_controls: "b5Controls",
  a6_controls: "a6Controls",
  source_project: "sourceProject",
  source_type: "sourceType",
  usage_count: "usageCount",
  last_used_at: "lastUsedAt",
  is_active: "isActive",
  created_at: "createdAt",
  updated_at: "updatedAt",
};

function sqlIdent(name) {
  if (/^[a-z_][a-z0-9_]*$/.test(name) && name === name.toLowerCase()) {
    return name;
  }
  return '"' + String(name).replace(/"/g, '""') + '"';
}

async function loadColumnSet(client, tableSchema, tableName) {
  const { rows } = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2",
    [tableSchema, tableName],
  );
  return new Set(rows.map((r) => r.column_name));
}

function resolvePhysicalCols(columnSet) {
  const resolve = (logicalSnake) => {
    if (columnSet.has(logicalSnake)) return logicalSnake;
    const alt = PRISMA_FIELD_ALIASES[logicalSnake];
    if (alt && columnSet.has(alt)) return alt;
    return logicalSnake;
  };

  return {
    id: resolve("id"),
    m4: resolve("m4"),
    we_name: resolve("we_name"),
    process_no: resolve("process_no"),
    process_name: resolve("process_name"),
    b2_functions: resolve("b2_functions"),
    b3_chars: resolve("b3_chars"),
    b4_causes: resolve("b4_causes"),
    b5_controls: resolve("b5_controls"),
    a6_controls: resolve("a6_controls"),
    severity: resolve("severity"),
    occurrence: resolve("occurrence"),
    detection: resolve("detection"),
    source_project: resolve("source_project"),
    source_type: resolve("source_type"),
    usage_count: resolve("usage_count"),
    last_used_at: resolve("last_used_at"),
    is_active: resolve("is_active"),
    created_at: resolve("created_at"),
    updated_at: resolve("updated_at"),
  };
}

function avgRounded(nums) {
  const valid = nums.filter((n) => typeof n === "number" && Number.isFinite(n));
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round(sum / valid.length);
}

function buildWeQuery() {
  const S = '"' + SOURCE_SCHEMA + '"';
  return [
    "SELECT",
    "  l2s.no AS process_no, l2s.name AS process_name,",
    "  l3s.id AS l3_id, l3s.name AS we_name, l3s.m4,",
    "  l3f.id AS l3f_id, l3f.\"functionName\" AS l3f_name, l3f.\"processChar\" AS l3f_pc,",
    "  fc.id AS fc_id, fc.cause AS fc_name,",
    "  ra.\"preventionControl\" AS pc, ra.\"detectionControl\" AS dc,",
    "  ra.severity AS s, ra.occurrence AS o, ra.detection AS d",
    "FROM " + S + ".l3_structures l3s",
    "JOIN " + S + ".l2_structures l2s ON l3s.\"l2Id\" = l2s.id",
    "LEFT JOIN " + S + ".l3_functions l3f ON l3f.\"l3StructId\" = l3s.id",
    "LEFT JOIN " + S + ".failure_causes fc ON fc.\"l3StructId\" = l3s.id",
    "LEFT JOIN " + S + ".failure_links fl ON fl.\"fcId\" = fc.id AND fl.\"deletedAt\" IS NULL",
    "LEFT JOIN " + S + ".risk_analyses ra ON ra.\"linkId\" = fl.id",
    "ORDER BY l2s.no::int, l3s.m4, l3s.name",
  ].join("\n");
}

async function main() {
  const client = new pg.Client({ connectionString: CONNECTION_STRING });
  await client.connect();

  try {
    const masterColsSet = await loadColumnSet(client, "public", "master_fmea_reference");
    if (masterColsSet.size === 0) {
      throw new Error(
        "public.master_fmea_reference not found (0 columns). Run migrations / prisma db push.",
      );
    }
    const C = resolvePhysicalCols(masterColsSet);
    const WE_QUERY = buildWeQuery();

    const { rows: weRows } = await client.query(WE_QUERY);
    const groups = new Map();

    for (const r of weRows) {
      const processNo = r.process_no != null ? String(r.process_no).trim() : "";
      const m4 = r.m4 != null ? String(r.m4).trim() : "";
      const weName = r.we_name != null ? String(r.we_name).trim() : "";
      const key = m4 + KEY_SEP + weName + KEY_SEP + processNo;

      let g = groups.get(key);
      if (!g) {
        g = {
          processNo,
          processName: r.process_name != null ? String(r.process_name).trim() : "",
          m4,
          weName,
          b2: new Set(),
          b3: new Set(),
          b4: new Set(),
          b5: new Set(),
          a6: new Set(),
          s: [],
          o: [],
          d: [],
        };
        groups.set(key, g);
      }

      if (r.l3f_name != null && String(r.l3f_name).trim()) g.b2.add(String(r.l3f_name).trim());
      if (r.l3f_pc != null && String(r.l3f_pc).trim()) g.b3.add(String(r.l3f_pc).trim());
      if (r.fc_name != null && String(r.fc_name).trim()) g.b4.add(String(r.fc_name).trim());
      if (r.pc != null && String(r.pc).trim()) g.b5.add(String(r.pc).trim());
      if (r.dc != null && String(r.dc).trim()) g.a6.add(String(r.dc).trim());

      if (r.s != null && Number.isFinite(Number(r.s))) g.s.push(Number(r.s));
      if (r.o != null && Number.isFinite(Number(r.o))) g.o.push(Number(r.o));
      if (r.d != null && Number.isFinite(Number(r.d))) g.d.push(Number(r.d));
    }

    const insertKeys = [
      "id",
      "m4",
      "we_name",
      "process_no",
      "process_name",
      "b2_functions",
      "b3_chars",
      "b4_causes",
      "b5_controls",
      "a6_controls",
      "severity",
      "occurrence",
      "detection",
      "source_project",
      "source_type",
      "usage_count",
      "is_active",
      "created_at",
      "updated_at",
    ];

    const insertIdents = insertKeys.map((k) => sqlIdent(C[k]));
    const conflictTargets = [sqlIdent(C.m4), sqlIdent(C.we_name), sqlIdent(C.process_no)];

    const upsertSql = [
      "INSERT INTO public.master_fmea_reference (" + insertIdents.join(", ") + ")",
      "VALUES (" + insertKeys.map((_, i) => "$" + (i + 1)).join(", ") + ")",
      "ON CONFLICT (" + conflictTargets.join(", ") + ") DO UPDATE SET",
      "  " + sqlIdent(C.process_name) + " = EXCLUDED." + sqlIdent(C.process_name) + ",",
      "  " + sqlIdent(C.b2_functions) + " = EXCLUDED." + sqlIdent(C.b2_functions) + ",",
      "  " + sqlIdent(C.b3_chars) + " = EXCLUDED." + sqlIdent(C.b3_chars) + ",",
      "  " + sqlIdent(C.b4_causes) + " = EXCLUDED." + sqlIdent(C.b4_causes) + ",",
      "  " + sqlIdent(C.b5_controls) + " = EXCLUDED." + sqlIdent(C.b5_controls) + ",",
      "  " + sqlIdent(C.a6_controls) + " = EXCLUDED." + sqlIdent(C.a6_controls) + ",",
      "  " + sqlIdent(C.severity) + " = EXCLUDED." + sqlIdent(C.severity) + ",",
      "  " + sqlIdent(C.occurrence) + " = EXCLUDED." + sqlIdent(C.occurrence) + ",",
      "  " + sqlIdent(C.detection) + " = EXCLUDED." + sqlIdent(C.detection) + ",",
      "  " + sqlIdent(C.source_project) + " = EXCLUDED." + sqlIdent(C.source_project) + ",",
      "  " + sqlIdent(C.source_type) + " = EXCLUDED." + sqlIdent(C.source_type) + ",",
      "  " + sqlIdent(C.updated_at) + " = EXCLUDED." + sqlIdent(C.updated_at),
    ].join("\n");

    await client.query("BEGIN");
    let seeded = 0;

    try {
      for (const g of groups.values()) {
        const b2 = [...g.b2];
        const b3 = [...g.b3];
        const b4 = [...g.b4];
        const b5 = [...g.b5];
        const a6 = [...g.a6];
        const severity = avgRounded(g.s);
        const occurrence = avgRounded(g.o);
        const detection = avgRounded(g.d);
        const now = new Date();

        const values = [
          randomUUID(),
          g.m4,
          g.weName,
          g.processNo,
          g.processName,
          b2,
          b3,
          b4,
          b5,
          a6,
          severity,
          occurrence,
          detection,
          SOURCE_PROJECT,
          SOURCE_TYPE,
          0,
          true,
          now,
          now,
        ];

        await client.query(upsertSql, values);
        seeded += 1;
      }

      const prevCols = await loadColumnSet(client, "public", "kr_industry_prevention");
      if (prevCols.size > 0) {
        const m4CatCol = prevCols.has("m4Category")
          ? "m4Category"
          : prevCols.has("m4_category")
            ? "m4_category"
            : null;
        const activeCol = prevCols.has("isActive")
          ? "isActive"
          : prevCols.has("is_active")
            ? "is_active"
            : null;

        if (m4CatCol) {
          let prevSql =
            "SELECT " +
            sqlIdent(m4CatCol) +
            " AS m4_cat, " +
            sqlIdent("method") +
            " AS method FROM public.kr_industry_prevention WHERE " +
            sqlIdent(m4CatCol) +
            " IS NOT NULL AND LENGTH(TRIM(" +
            sqlIdent(m4CatCol) +
            "::text)) > 0";
          if (activeCol) {
            prevSql += " AND " + sqlIdent(activeCol) + " = true";
          }
          const { rows: prevRows } = await client.query(prevSql);

          const selectMastersSql =
            "SELECT " +
            sqlIdent(C.id) +
            " AS id, " +
            sqlIdent(C.b5_controls) +
            " AS b5_controls FROM public.master_fmea_reference WHERE " +
            sqlIdent(C.m4) +
            " = $1";

          for (const pr of prevRows) {
            const m4Cat = pr.m4_cat != null ? String(pr.m4_cat).trim() : "";
            const method = pr.method != null ? String(pr.method).trim() : "";
            if (!m4Cat || !method) continue;

            const { rows: masters } = await client.query(selectMastersSql, [m4Cat]);
            for (const m of masters) {
              const cur = Array.isArray(m.b5_controls) ? m.b5_controls : [];
              if (cur.includes(method)) continue;
              const merged = [...cur, method];
              await client.query(
                "UPDATE public.master_fmea_reference SET " +
                  sqlIdent(C.b5_controls) +
                  " = $2::text[], " +
                  sqlIdent(C.updated_at) +
                  " = NOW() WHERE " +
                  sqlIdent(C.id) +
                  " = $1",
                [m.id, merged],
              );
            }
          }
        }
      }

      const detCols = await loadColumnSet(client, "public", "kr_industry_detection");
      if (detCols.size > 0) {
        const activeCol = detCols.has("isActive")
          ? "isActive"
          : detCols.has("is_active")
            ? "is_active"
            : null;

        let detSql =
          "SELECT " +
          sqlIdent("category") +
          " AS category, " +
          sqlIdent("method") +
          " AS method FROM public.kr_industry_detection WHERE LENGTH(TRIM(" +
          sqlIdent("category") +
          "::text)) > 0";
        if (activeCol) {
          detSql += " AND " + sqlIdent(activeCol) + " = true";
        }
        const { rows: detRows } = await client.query(detSql);

        const selectMastersByM4Sql =
          "SELECT " +
          sqlIdent(C.id) +
          " AS id, " +
          sqlIdent(C.a6_controls) +
          " AS a6_controls FROM public.master_fmea_reference WHERE UPPER(TRIM(" +
          sqlIdent(C.m4) +
          "::text)) = UPPER(TRIM($1::text))";

        for (const dr of detRows) {
          const category = dr.category != null ? String(dr.category).trim() : "";
          const method = dr.method != null ? String(dr.method).trim() : "";
          if (!category || !method) continue;

          const { rows: masters } = await client.query(selectMastersByM4Sql, [category]);
          for (const m of masters) {
            const cur = Array.isArray(m.a6_controls) ? m.a6_controls : [];
            if (cur.includes(method)) continue;
            const merged = [...cur, method];
            await client.query(
              "UPDATE public.master_fmea_reference SET " +
                sqlIdent(C.a6_controls) +
                " = $2::text[], " +
                sqlIdent(C.updated_at) +
                " = NOW() WHERE " +
                sqlIdent(C.id) +
                " = $1",
              [m.id, merged],
            );
          }
        }
      }

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }

    const card = (physCol) =>
      "cardinality(COALESCE(" + sqlIdent(physCol) + ", ARRAY[]::text[]))";

    const sumSql = [
      "SELECT",
      "  COUNT(*)::int AS total,",
      "  COUNT(*) FILTER (WHERE " + card(C.b4_causes) + " > 0)::int AS with_b4,",
      "  COUNT(*) FILTER (WHERE " + card(C.b5_controls) + " > 0)::int AS with_b5,",
      "  COUNT(*) FILTER (WHERE " + card(C.a6_controls) + " > 0)::int AS with_a6,",
      "  COUNT(*) FILTER (WHERE " +
        sqlIdent(C.severity) +
        " IS NOT NULL AND " +
        sqlIdent(C.occurrence) +
        " IS NOT NULL AND " +
        sqlIdent(C.detection) +
        " IS NOT NULL)::int AS with_sod",
      "FROM public.master_fmea_reference",
      "WHERE " + sqlIdent(C.source_project) + " = $1 AND " + sqlIdent(C.source_type) + " = $2",
    ].join("\n");

    const { rows: sums } = await client.query(sumSql, [SOURCE_PROJECT, SOURCE_TYPE]);
    const s0 = sums[0] ?? {};

    console.log("--- seed-master-from-m066 summary ---");
    console.log("Source schema: " + SOURCE_SCHEMA);
    console.log("WE groups upserted this run: " + seeded);
    console.log(
      "Total rows (source_project=" +
        SOURCE_PROJECT +
        ", source_type=" +
        SOURCE_TYPE +
        "): " +
        (s0.total ?? 0),
    );
    console.log("Total with B4 (causes): " + (s0.with_b4 ?? 0));
    console.log("Total with B5 (PC): " + (s0.with_b5 ?? 0));
    console.log("Total with A6 (DC): " + (s0.with_a6 ?? 0));
    console.log("Total with SOD defaults (S+O+D non-null): " + (s0.with_sod ?? 0));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
