// Gera matrizes 4x4 com letras sorteadas das 12 mais frequentes em letter-freq.js
// Uso em código:
//   const { sortedLetters, createMatrixBoggle, generateMatrices } = require('./matrix');
//   const result = generateMatrices(3); // { matrix1: [...], matrix2: [...], matrix3: [...], matrices: [[...], ...] }
// CLI (Windows cmd):
//   node matrix.js --count 4 --print
//   node matrix.js --count 4 --save --out matrix.output.js

const fs = require('fs');
const path = require('path');
const { randomInt } = require('crypto');
const LETTER_FREQUENCIES = require('./letter-freq');

// 1) Seleciona as 12 primeiras letras (ordem preservada do arquivo gerado)
function getTopLetters12() {
  return Object.keys(LETTER_FREQUENCIES).slice(0, 12);
}

// Array de letras ordenadas por frequência (top 12)
const sortedLetters = getTopLetters12();

// 2) Utilitários de aleatoriedade
function rndInt(maxExclusive) {
  // Usa crypto.randomInt quando possível; fallback para Math.random
  try {
    return randomInt(0, maxExclusive);
  } catch {
    return Math.floor(Math.random() * maxExclusive);
  }
}

function sampleOne(arr) {
  return arr[rndInt(arr.length)];
}

// 3) Cria uma "matrixBoggle" 4x4 (achatada em ordem de sorteio: 16 letras)
function createMatrixBoggle(size = 4, letters = sortedLetters) {
  const total = size * size;
  const draws = [];
  for (let i = 0; i < total; i++) {
    draws.push(sampleOne(letters)); // pode repetir letras; sorteio uniforme sobre top-12
  }
  return draws; // formato: ['A','E','S', ...] com 16 itens
}

// 4) Gera N matrizes e as expõe como matrix1, matrix2, ... além de um array agregado
function generateMatrices(count = 1, size = 4, letters = sortedLetters) {
  const result = { matrices: [] };
  for (let i = 1; i <= count; i++) {
    const m = createMatrixBoggle(size, letters);
    result[`matrix${i}`] = m;
    result.matrices.push(m);
  }
  return result;
}

// 5) Helper para serializar como arquivo JS no formato solicitado: matrix1 = [A, B, C, ...];
// Para ser um JS válido, as letras são escritas como strings: 'A', 'B', ...
function serializeMatricesJS(obj, headerComment = true) {
  const lines = [];
  if (headerComment) {
    lines.push('// Arquivo gerado automaticamente por matrix.js');
    lines.push(`// Data: ${new Date().toISOString()}`);
  }
  const keys = Object.keys(obj).filter(k => /^matrix\d+$/.test(k)).sort((a, b) => {
    const na = parseInt(a.replace('matrix', ''), 10);
    const nb = parseInt(b.replace('matrix', ''), 10);
    return na - nb;
  });
  for (const k of keys) {
    const arr = obj[k].map(ch => `'${ch}'`).join(', ');
    lines.push(`const ${k} = [${arr}];`);
  }
  if (keys.length) {
    lines.push('');
    lines.push(`module.exports = { ${keys.join(', ')}, matrices: [${keys.join(', ')}] };`);
  } else {
    lines.push('module.exports = { matrices: [] };');
  }
  lines.push('');
  return lines.join('\n');
}

// Exports de uso em código
module.exports = {
  sortedLetters,
  getTopLetters12,
  createMatrixBoggle,
  generateMatrices,
  serializeMatricesJS
};

// 6) CLI: permite escolher quantas vezes executar e opcionalmente salvar em arquivo
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (name, def) => {
    const idx = args.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
    if (idx === -1) return def;
    const a = args[idx];
    const eq = a.indexOf('=');
    if (eq !== -1) return a.slice(eq + 1);
    const next = args[idx + 1];
    if (next && !next.startsWith('--')) return next;
    return def;
  };

  const count = parseInt(getArg('count', '1'), 10) || 1;
  const outPath = getArg('out', path.join(__dirname, 'matrix.generated.js'));
  const shouldSave = args.includes('--save');
  const shouldPrint = args.includes('--print') || !shouldSave;

  const { generateMatrices } = module.exports;
  const generated = generateMatrices(count);

  if (shouldPrint) {
    // Imprime em formato JS para fácil cópia
    const txt = serializeMatricesJS(generated);
    console.log(txt);
  }

  if (shouldSave) {
    const txt = serializeMatricesJS(generated);
    fs.writeFileSync(outPath, txt, 'utf8');
    console.log('Matrizes salvas em:', outPath);
  }
}
