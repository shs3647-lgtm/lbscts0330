import 'dotenv/config';
import { Pool } from 'pg';

function fixEncoding(str: string): string {
  if (!str) return str;
  if (!str.includes('Ã') && !str.includes('Â')) return str;
  try {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xFF;
    }
    const decoded = new TextDecoder('utf-8').decode(bytes);
    if (/[\uAC00-\uD7AF\u3131-\u3163]/.test(decoded)) return decoded;
  } catch {}
  return str;
}

function fixEncodingDeep(obj: unknown): unknown {
  if (typeof obj === 'string') return fixEncoding(obj);
  if (Array.isArray(obj)) return obj.map(fixEncodingDeep);
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = fixEncodingDeep(value);
    }
    return result;
  }
  return obj;
}

async function main() {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('=== DFMEA 인코딩 복구 시작 ===\n');

  // DFMEA 프로젝트 스키마 목록
  const schemas = await p.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'dfmea_%' ORDER BY schema_name");
  console.log(`DFMEA 스키마 수: ${schemas.rows.length}`);

  let totalFixed = 0;

  for (const schemaRow of schemas.rows) {
    const schema = schemaRow.schema_name as string;
    console.log(`\n--- ${schema} ---`);

    // 해당 스키마의 모든 테이블 조회
    const tables = await p.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1", [schema]
    );

    for (const tblRow of tables.rows) {
      const table = tblRow.table_name as string;

      // name 컬럼이 있는 테이블 찾기
      const nameCols = await p.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND data_type IN ('text','character varying')",
        [schema, table]
      );
      
      const textCols = nameCols.rows.map((r: any) => r.column_name as string)
        .filter((c: string) => !['id', 'fmeaId', 'l2Id', 'l3Id', 'funcId', 'createdAt', 'updatedAt'].includes(c));

      if (textCols.length === 0) continue;

      // 모든 행 가져오기
      const rows = await p.query(`SELECT id, ${textCols.map((c: string) => `"${c}"`).join(', ')} FROM "${schema}"."${table}"`);
      
      let tblFixed = 0;
      for (const row of rows.rows) {
        const updates: string[] = [];
        const values: string[] = [];
        let paramIdx = 1;

        for (const col of textCols) {
          const original = row[col];
          if (typeof original !== 'string' || !original) continue;
          const fixed = fixEncoding(original);
          if (fixed !== original) {
            updates.push(`"${col}" = $${paramIdx}`);
            values.push(fixed);
            paramIdx++;
          }
        }

        if (updates.length > 0) {
          values.push(row.id);
          await p.query(
            `UPDATE "${schema}"."${table}" SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
            values
          );
          tblFixed++;
          // 첫 수정 항목 표시
          if (tblFixed <= 3) {
            const origName = row.name || row[textCols[0]] || '';
            const fixedName = fixEncoding(origName);
            console.log(`  ✅ ${table}: "${origName.slice(0,40)}" → "${fixedName.slice(0,40)}"`);
          }
        }
      }

      if (tblFixed > 0) {
        console.log(`  📦 ${table}: ${tblFixed}/${rows.rows.length}개 수정`);
        totalFixed += tblFixed;
      }
    }
  }

  console.log(`\n=== 총 ${totalFixed}개 레코드 수정 완료 ===`);
  await p.end();
}

main().catch(e => { console.error('❌', e); process.exit(1); });
