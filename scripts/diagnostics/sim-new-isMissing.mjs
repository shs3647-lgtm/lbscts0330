/**
 * 수정된 isMissing/isMeaningful로 시뮬레이션
 */
const PLACEHOLDERS_MISSING = [
  '고장원인 선택', '클릭하여 추가', '여기를 클릭하여 추가',
  '고장원인을 입력하세요', '고장원인 추가', '선택하세요',
  '입력하세요', '추가하세요', '클릭하여 선택',
  '고장형태 선택', '고장영향 선택', '요구사항 선택',
  '(기능분석에서 입력)', '기능 입력 필요',
];

const PLACEHOLDERS_MEANINGFUL = [
  '클릭하여 추가', '여기를 클릭하여 추가', '클릭하여 선택',
  '요구사항 선택', '고장원인 선택', '고장형태 선택', '고장영향 선택',
  '선택하세요', '입력하세요', '추가하세요',
  '고장원인을 입력하세요', '(기능분석에서 입력)', '기능 입력 필요',
];

const isMissing = (name) => {
  if (name === null || name === undefined) return true;
  if (!name) return true;
  const trimmed = String(name).trim();
  if (trimmed === '' || trimmed === '-') return true;
  return PLACEHOLDERS_MISSING.includes(trimmed);
};

const isMeaningful = (name) => {
  if (!name) return false;
  const trimmed = String(name).trim();
  if (trimmed === '') return false;
  return !PLACEHOLDERS_MEANINGFUL.includes(trimmed);
};

async function main() {
  const resp = await fetch('http://localhost:3000/api/fmea?fmeaId=pfm26-m059&format=atomic');
  const data = await resp.json();

  const l3FuncsByL3Id = new Map();
  for (const f of data.l3Functions || []) {
    if (!l3FuncsByL3Id.has(f.l3StructId)) l3FuncsByL3Id.set(f.l3StructId, []);
    l3FuncsByL3Id.get(f.l3StructId).push(f);
  }
  const l3sByL2Id = new Map();
  for (const l3 of data.l3Structures || []) {
    if (!l3sByL2Id.has(l3.l2Id)) l3sByL2Id.set(l3.l2Id, []);
    l3sByL2Id.get(l3.l2Id).push(l3);
  }
  const fcsByL2Id = new Map();
  for (const fc of data.failureCauses || []) {
    if (!fcsByL2Id.has(fc.l2StructId)) fcsByL2Id.set(fc.l2StructId, []);
    fcsByL2Id.get(fc.l2StructId).push(fc);
  }

  let total = 0;
  const missing = [];

  for (const l2 of data.l2Structures || []) {
    if (!isMeaningful(l2.name)) continue;
    const l3s = l3sByL2Id.get(l2.id) || [];
    const allFCs = (fcsByL2Id.get(l2.id) || []).map(fc => ({
      id: fc.id, name: fc.cause, processCharId: fc.processCharId || '',
    }));

    const charIdsByName = new Map();
    for (const l3 of l3s) {
      const funcs = l3FuncsByL3Id.get(l3.id) || [];
      for (const f of funcs) {
        const n = String(f.processChar || '').trim();
        const id = String(f.id || '').trim();
        if (!n || !id) continue;
        if (!charIdsByName.has(n)) charIdsByName.set(n, new Set());
        charIdsByName.get(n).add(id);
      }
    }

    for (const l3 of l3s) {
      if (!isMeaningful(l3.name)) continue;
      const funcs = l3FuncsByL3Id.get(l3.id) || [];
      const funcGroups = new Map();
      for (const f of funcs) {
        if (!funcGroups.has(f.functionName)) funcGroups.set(f.functionName, []);
        funcGroups.get(f.functionName).push(f);
      }

      const hasMeaningfulFunc = [...funcGroups.keys()].some(fn => isMeaningful(fn));
      let weHasAnyMeaningfulChar = false;

      for (const [funcName, fGroup] of funcGroups) {
        const processChars = fGroup.map(f => ({ id: f.id, name: f.processChar }));
        const hasChars = processChars.some(c => isMeaningful(c.name));
        if (!isMeaningful(funcName) && !hasChars) continue;

        const displayedInFunc = new Set();
        for (const pc of processChars) {
          if (!isMeaningful(pc.name)) continue;
          weHasAnyMeaningfulChar = true;
          const charName = String(pc.name || '').trim();
          if (displayedInFunc.has(charName)) continue;
          displayedInFunc.add(charName);

          const ids = charIdsByName.get(charName) || new Set([String(pc.id)]);
          const linked = allFCs.filter(c => ids.has(String(c.processCharId || '').trim()));
          const seenNames = new Set();
          const uniqueLinked = linked.filter(c => {
            const n = String(c?.name || '').trim();
            if (!n) return true;
            if (seenNames.has(n)) return false;
            seenNames.add(n);
            return true;
          });

          if (uniqueLinked.length === 0) {
            total++;
            missing.push({ type: 'NO_FC', proc: `${l2.no}(${l2.name})`, we: l3.name, pc: charName });
          } else {
            for (const c of uniqueLinked) {
              if (isMissing(c.name)) {
                total++;
                missing.push({ type: 'PH', proc: `${l2.no}(${l2.name})`, we: l3.name, pc: charName, fc: c.name });
              }
            }
          }
        }
      }

      if (hasMeaningfulFunc && !weHasAnyMeaningfulChar) {
        total++;
        missing.push({ type: 'NO_PC', proc: `${l2.no}(${l2.name})`, we: l3.name });
      }
    }
  }

  console.log(`=== NEW isMissing/isMeaningful → missingCount = ${total} ===`);
  for (const m of missing) {
    console.log(`  ${m.type}: ${m.proc} → WE="${m.we}" PC="${m.pc || ''}" FC="${m.fc || ''}" `);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
