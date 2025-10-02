// Versão simples: encontra pares chave/valor e grava um JSON compacto.
// Origem: matrix4x4.js com linhas como
//   MATRICES['matrix4x4-1'] = ['D','T','S','N', ...];
// Destino (4x4.json):
//   { "1": "DTSN...", "2": "..." }

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function toAbs(p, def) {
  const f = p || def;
  return path.isAbsolute(f) ? f : path.join(__dirname, f);
}

// Extrai {id, letters} de uma linha contendo MATRICES['matrix4x4-<n>'] = [ ... ];
function pick(line) {
  if (!line || line.indexOf('MATRICES[') === -1) return null;
  const m = line.match(/MATRICES\s*\[\s*['"]matrix4x4-(\d+)['"]\s*\]\s*=\s*\[([^\]]*)\]/);
  if (!m) return null;
  const id = m[1];
  const inside = m[2];
  // Concatena apenas letras A-Z do conteúdo do array
  const letters = (inside.match(/[A-Za-z]/g) || []).join('').toUpperCase();
  if (letters.length !== 16) return null; // 4x4 => 16 letras
  return { id, letters };
}

async function buildFinalMatrix(from = 'matrix4x4.js', out = '4x4.json') {
  const input = toAbs(from, 'matrix4x4.js');
  const output = toAbs(out, '4x4.json');
  if (!fs.existsSync(input)) throw new Error(`Arquivo não encontrado: ${input}`);

  const rs = fs.createReadStream(input, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: rs, crlfDelay: Infinity });

  const map = Object.create(null);
  for await (const line of rl) {
    const item = pick(line);
    if (item) map[item.id] = item.letters;
  }

  // Ordena por id numérico ascendente e grava JSON compacto, sem cabeçalho JS
  const ordered = Object.keys(map).sort((a, b) => Number(a) - Number(b))
    .reduce((acc, k) => { acc[k] = map[k]; return acc; }, {});

  fs.writeFileSync(output, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
  return { out: output, count: Object.keys(ordered).length };
}

if (require.main === module) {
  const from = process.argv[2] || 'matrix4x4.js';
  const out = process.argv[3] || '4x4.json';
  buildFinalMatrix(from, out)
    .then((res) => console.log(`Gerado ${res.out} com ${res.count} matrizes.`))
    .catch((e) => { console.error(e.message || e); process.exit(1); });
}

module.exports = { buildFinalMatrix, pick };

