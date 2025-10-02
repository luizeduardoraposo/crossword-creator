// Gera 4x4-counts.json a partir de 4x4-solve.json
// Para cada linha "id": "PAL1,PAL2,..." computa a quantidade de palavras
// e grava somente pares chave-valor: { "id": count }

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function toAbs(p, def) {
  const f = p || def;
  return path.isAbsolute(f) ? f : path.join(__dirname, f);
}

function countFromValue(val) {
  if (Array.isArray(val)) return val.length;
  if (typeof val === 'string') {
    if (!val) return 0;
    // Valores vêm como "PAL1,PAL2,..." (sem espaços)
    return val.split(',').filter(Boolean).length;
  }
  return 0;
}

function parseKeyValueLine(line) {
  // Ignora chaves do objeto e linhas vazias
  const t = line.trim();
  if (!t || t === '{' || t === '}') return null;

  const idx = t.indexOf(':');
  if (idx === -1) return null;
  const keyPart = t.slice(0, idx).trim();
  const valPartRaw = t.slice(idx + 1).replace(/,\s*$/, '').trim();

  const mKey = keyPart.match(/^"(\d+)"$/);
  if (!mKey) return null;
  const id = mKey[1];

  let value;
  try {
    // valPartRaw é um JSON válido (ex.: "PAL1,PAL2") ou um array JSON
    value = JSON.parse(valPartRaw);
  } catch (_) {
    // fallback: remove aspas se existirem
    value = valPartRaw.replace(/^"|"$/g, '');
  }

  return { id, value };
}

async function buildCountsFromSolve(from = '4x4-solve.json', out = '4x4-counts.json') {
  const input = toAbs(from, '4x4-solve.json');
  const output = toAbs(out, '4x4-counts.json');
  if (!fs.existsSync(input)) throw new Error(`Arquivo não encontrado: ${input}`);

  const rs = fs.createReadStream(input, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: rs, crlfDelay: Infinity });
  const ws = fs.createWriteStream(output, { encoding: 'utf8' });

  await new Promise(async (resolve, reject) => {
    let wroteAny = false;
    ws.on('error', reject);
    rl.on('error', reject);

    ws.write('{' + '\n');

    for await (const line of rl) {
      const kv = parseKeyValueLine(line);
      if (!kv) continue;
      const count = countFromValue(kv.value);
      const prefix = wroteAny ? ',\n' : '';
      ws.write(prefix + `  "${kv.id}": ${count}`);
      wroteAny = true;
    }

    ws.write('\n}' + '\n');
    ws.end(resolve);
  });

  return { out: output };
}

if (require.main === module) {
  const from = process.argv[2] || '4x4-solve.json';
  const out = process.argv[3] || '4x4-counts.json';
  buildCountsFromSolve(from, out)
    .then((res) => console.log(`Gerado ${res.out}.`))
    .catch((e) => { console.error(e.message || e); process.exit(1); });
}

module.exports = { buildCountsFromSolve, parseKeyValueLine, countFromValue };

