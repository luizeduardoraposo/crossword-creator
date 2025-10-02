// Versão para soluções: extrai id -> palavras (words[]) de matrix4x4-solutions.js
// Origem: matrix4x4-solutions.js com linhas como
//   MATRICES['matrix4x4-1'] = { count: 123, words: ["PAL1","PAL2", ...] };
// Destino (4x4-solve.json):
//   { "1": "PAL1,PAL2,...", "2": "..." }

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function toAbs(p, def) {
  const f = p || def;
  return path.isAbsolute(f) ? f : path.join(__dirname, f);
}

// Utilitário: tenta detectar id em uma linha com MATRICES['matrix4x4-<n>']
function pickId(line) {
  if (!line || line.indexOf('MATRICES[') === -1) return null;
  const m = line.match(/MATRICES\s*\[\s*['"]matrix4x4-(\d+)['"]\s*\]\s*=\s*\{/);
  return m ? m[1] : null;
}

// Converte um trecho dentro de [ ... ] para array de palavras usando as strings entre aspas
function parseWordsArray(text) {
  if (!text) return [];
  const out = [];
  const rx = /"([^"]+)"/g; // captura strings com aspas duplas
  let m;
  while ((m = rx.exec(text)) !== null) out.push(m[1]);
  return out;
}

async function buildFinalSolutions(from = 'matrix4x4-solutions.js', out = '4x4-solve.json') {
  const input = toAbs(from, 'matrix4x4-solutions.js');
  const output = toAbs(out, '4x4-solve.json');
  if (!fs.existsSync(input)) throw new Error(`Arquivo não encontrado: ${input}`);

  const rs = fs.createReadStream(input, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: rs, crlfDelay: Infinity });

  const map = Object.create(null);

  let currentId = null;
  let capturing = false;
  let buffer = '';

  for await (const rawLine of rl) {
    const line = String(rawLine);

    // Detecta início de um novo bloco
    const foundId = pickId(line);
    if (foundId) {
      currentId = foundId;
      capturing = false;
      buffer = '';
    }

    if (!currentId) continue; // ainda não dentro de nenhum bloco

    if (!capturing) {
      // Procura pelo início de words: [
      const wordsIdx = line.indexOf('words');
      if (wordsIdx !== -1) {
        // Busca primeiro '[' após 'words'
        const after = line.slice(wordsIdx);
        const openIdx = after.indexOf('[');
        if (openIdx !== -1) {
          // Inicia captura após '['
          const rest = after.slice(openIdx + 1);
          const closeIdx = rest.indexOf(']');
          if (closeIdx !== -1) {
            // Array fecha na mesma linha
            buffer += rest.slice(0, closeIdx);
            const words = parseWordsArray(buffer);
            map[currentId] = words.join(',');
            // Reseta para próximo bloco
            currentId = null;
            buffer = '';
            capturing = false;
          } else {
            // Continua capturando nas próximas linhas
            buffer += rest + '\n';
            capturing = true;
          }
        }
      }
    } else {
      // Já estamos capturando; procuramos o fechamento ']'
      const closeIdx = line.indexOf(']');
      if (closeIdx !== -1) {
        buffer += line.slice(0, closeIdx);
        const words = parseWordsArray(buffer);
        map[currentId] = words.join(',');
        // Reseta para próximo bloco
        currentId = null;
        buffer = '';
        capturing = false;
      } else {
        buffer += line + '\n';
      }
    }
  }

  // Ordena por id numérico ascendente e grava JSON de forma incremental (um par por linha)
  const keys = Object.keys(map).sort((a, b) => Number(a) - Number(b));
  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(output, { encoding: 'utf8' });
    ws.on('error', reject);
    ws.on('finish', resolve);
    ws.write('{' + '\n');
    keys.forEach((k, i) => {
      const line = `  "${k}": ${JSON.stringify(map[k])}`;
      const suffix = (i === keys.length - 1) ? '\n' : ',\n';
      ws.write(line + suffix);
    });
    ws.write('}' + '\n');
    ws.end();
  });
  return { out: output, count: keys.length };
}

if (require.main === module) {
  const from = process.argv[2] || 'matrix4x4-solutions.js';
  const out = process.argv[3] || '4x4-solve.json';
  buildFinalSolutions(from, out)
    .then((res) => console.log(`Gerado ${res.out} com ${res.count} entradas (id -> palavras).`))
    .catch((e) => { console.error(e.message || e); process.exit(1); });
}

module.exports = { buildFinalSolutions, pickId, parseWordsArray };

