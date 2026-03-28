/**
 * One-off / repeatable: remove CODEFREEZE-related comment blocks and lines from src/**/*.ts(x)
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src');
const MARKER = /CODEFREEZE|CODE\s*FREEZE|codefreeze|코드프리즈|코드\s*프리즈|@codefreeze|@CODEFREEZE|@status\s+CODEFREEZE/i;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function stripBlockComments(content) {
  let out = '';
  let i = 0;
  while (i < content.length) {
    if (content[i] === '/' && content[i + 1] === '*') {
      const end = content.indexOf('*/', i + 2);
      if (end === -1) {
        out += content[i++];
        continue;
      }
      const block = content.slice(i, end + 2);
      if (MARKER.test(block)) {
        i = end + 2;
        if (content[i] === '\r') i++;
        if (content[i] === '\n') i++;
        continue;
      }
      out += block;
      i = end + 2;
      continue;
    }
    out += content[i++];
  }
  return out;
}

function stripLineComments(content) {
  const lines = content.split(/\r?\n/);
  return lines
    .filter((line) => {
      const t = line.trim();
      if (!MARKER.test(line)) return true;
      if (t.startsWith('//')) return false;
      if (t.startsWith('*') && !t.includes('*/')) return false;
      return true;
    })
    .join('\n');
}

function processFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');
  const before = s;
  s = stripBlockComments(s);
  s = stripLineComments(s);
  if (s !== before) {
    fs.writeFileSync(filePath, s, 'utf8');
    return true;
  }
  return false;
}

const files = walk(ROOT);
let n = 0;
for (const f of files) {
  if (processFile(f)) n++;
}
console.log(`strip-codefreeze: updated ${n} files under src/`);
