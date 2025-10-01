// Gera matrizes 4x4 com letras sorteadas das 12 mais frequentes em letter-freq.js
// Uso em código:
//   const { sortedLetters, createMatrixBoggle, generateMatrices } = require('./matrix');
//   const result = generateMatrices(3); // { matrix1: [...], matrix2: [...], matrix3: [...], matrices: [[...], ...] }
// CLI (Windows cmd):
//   node matrix.js --count 4 --size 4 --print
//   node matrix.js --count 4 --size 5 --save --out matrix.output.js

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

// 5) Persistência incremental: arquivo acumulador com um único objeto MATRICES
// - Nomes: MATRICES['matrix{S}x{S}-{k}'] = ['A',...]; (permite hífen via chave string)
// - Se o arquivo não existir, cria com cabeçalho e module.exports = MATRICES
// - Se existir, apenas anexa novas entradas

function getNextIndexForSize(filePath, size) {
  if (!fs.existsSync(filePath)) return 1;
  const content = fs.readFileSync(filePath, 'utf8');
  const prefix = `MATRICES['matrix${size}x${size}-`;
  let max = 0;
  let pos = 0;
  while (true) {
    const i = content.indexOf(prefix, pos);
    if (i === -1) break;
    const start = i + prefix.length;
    let j = start;
    while (j < content.length && content[j] >= '0' && content[j] <= '9') j++;
    const numStr = content.slice(start, j);
    const num = parseInt(numStr, 10);
    if (!Number.isNaN(num) && num > max) max = num;
    pos = j;
  }
  return max + 1;
}

function ensureMatricesFile(filePath) {
  if (fs.existsSync(filePath)) return;
  const header = [
    '// Arquivo gerado automaticamente por matrix.js (acumulador)',
    `// Data: ${new Date().toISOString()}`,
    'const MATRICES = {};',
    'module.exports = MATRICES;',
    ''
  ].join('\n');
  fs.writeFileSync(filePath, header, 'utf8');
}

function appendMatricesToFile(filePath, size, matrices) {
  ensureMatricesFile(filePath);
  const startIdx = getNextIndexForSize(filePath, size);
  const lines = [];
  for (let i = 0; i < matrices.length; i++) {
    const arr = matrices[i].map(ch => `'${ch}'`).join(', ');
    const name = `matrix${size}x${size}-${startIdx + i}`;
    lines.push(`MATRICES['${name}'] = [${arr}];`);
  }
  lines.push('');
  fs.appendFileSync(filePath, lines.join('\n'), 'utf8');
  return startIdx; // para impressão coerente
}

// Exports de uso em código
module.exports = {
  sortedLetters,
  getTopLetters12,
  createMatrixBoggle,
  generateMatrices,
  serializeMatricesJS: undefined // legado (removido na persistência incremental)
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
  const size = Math.max(2, parseInt(getArg('size', '4'), 10) || 4);
  const outPath = getArg('out', path.join(__dirname, 'matrix.generated.js'));
  const shouldSave = args.includes('--save');
  const shouldPrint = args.includes('--print') || !shouldSave;

  const { generateMatrices } = module.exports;
  const generated = generateMatrices(count, size);

  if (shouldSave) {
    const startIdx = appendMatricesToFile(outPath, size, generated.matrices);
    console.log(`Matrizes ${size}x${size} adicionadas em:`, outPath);
    if (shouldPrint) {
      for (let i = 0; i < generated.matrices.length; i++) {
        const name = `matrix${size}x${size}-${startIdx + i}`;
        const arr = generated.matrices[i].map(ch => `'${ch}'`).join(', ');
        console.log(`MATRICES['${name}'] = [${arr}];`);
      }
    }
  } else if (shouldPrint) {
    // Impressão sem salvar: ainda respeita a convenção dos nomes com size
    for (let i = 0; i < generated.matrices.length; i++) {
      const name = `matrix${size}x${size}-${i + 1}`; // numeração local (não lê arquivo)
      const arr = generated.matrices[i].map(ch => `'${ch}'`).join(', ');
      console.log(`MATRICES['${name}'] = [${arr}];`);
    }
  }
}
