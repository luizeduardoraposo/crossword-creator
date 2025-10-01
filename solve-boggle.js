// Boggle solver for Portuguese word list (words-ptbr.txt)
// - CommonJS, sync I/O (consistent with repo conventions)
// - Supports 8-direction adjacency, no cell reuse within a word
// - Accepts matrices as 2D arrays of letters or flattened 1D arrays of length N*N
// - Can load and solve many matrices from external .js files

const fs = require('fs');
const path = require('path');

// ----------------------------------------
// Utils: normalization, I/O, parsing
// ----------------------------------------

function normalizeString(str) {
  if (!str) return '';
  return String(str)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^A-Z]/g, ''); // keep A-Z only
}

function isSquare(n) {
  const r = Math.sqrt(n);
  return Number.isInteger(r) ? r : 0;
}

// Converts an input matrix to 2D form [[A, B, ...], [...]]
// Accepts: 2D array already, or 1D flattened array of length N*N
function to2D(matrix) {
  if (!Array.isArray(matrix)) {
    throw new Error('Matrix must be an array');
  }
  if (matrix.length === 0) throw new Error('Matrix cannot be empty');
  if (Array.isArray(matrix[0])) {
    // Assume already 2D; validate rectangular
    const rows = matrix.length;
    const cols = matrix[0].length;
    for (let r = 1; r < rows; r++) {
      if (!Array.isArray(matrix[r]) || matrix[r].length !== cols) {
        throw new Error('2D matrix must be rectangular');
      }
    }
    // Normalize letters
    return matrix.map(row => row.map(c => normalizeString(c).slice(0, 1)));
  }
  const N = isSquare(matrix.length);
  if (!N) {
    throw new Error(`1D matrix length ${matrix.length} is not a perfect square`);
  }
  const grid = [];
  for (let r = 0; r < N; r++) {
    const row = [];
    for (let c = 0; c < N; c++) {
      const ch = normalizeString(matrix[r * N + c]).slice(0, 1);
      row.push(ch);
    }
    grid.push(row);
  }
  return grid;
}

function printGrid(grid) {
  const N = grid.length;
  const lines = [];
  for (let r = 0; r < N; r++) {
    lines.push(grid[r].map(c => (c && c.length ? c[0] : '.')).join(' '));
  }
  return lines.join('\n');
}

// ----------------------------------------
// Dictionary load and prefix set
// ----------------------------------------

function loadDictionary(dictPath = 'words-ptbr.txt', { minLen = 3 } = {}) {
  const abs = path.isAbsolute(dictPath) ? dictPath : path.join(__dirname, dictPath);
  const raw = fs.readFileSync(abs, 'utf8');
  const words = new Set();
  const prefixes = new Set();

  function addPrefixes(w) {
    for (let i = 1; i < w.length; i++) prefixes.add(w.slice(0, i));
  }

  for (const line of raw.split(/\r?\n/)) {
    const w = normalizeString(line);
    if (!w || w.length < minLen) continue;
    words.add(w);
  }
  for (const w of words) addPrefixes(w);
  return { words, prefixes };
}

// ----------------------------------------
// Boggle solver core (DFS with prefix pruning)
// ----------------------------------------

function getNeighbors(r, c, N) {
  const res = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N) res.push([nr, nc]);
    }
  }
  return res;
}

function solveBoggleGrid(grid2D, dict, { minLen = 3 } = {}) {
  const grid = to2D(grid2D); // ensures 2D + normalization
  const N = grid.length;
  const { words, prefixes } = dict;
  const found = new Set();
  const visited = new Uint8Array(N * N); // 0/1 flags

  function dfs(r, c, buf) {
    const idx = r * N + c;
    if (visited[idx]) return;
    const ch = grid[r][c];
    if (!ch) return;
    const next = buf + ch;
    // prune
    if (!prefixes.has(next) && !words.has(next)) {
      // If neither a prefix nor a full word, stop early
      return;
    }
    visited[idx] = 1;
    if (next.length >= minLen && words.has(next)) found.add(next);
    const neigh = getNeighbors(r, c, N);
    for (const [nr, nc] of neigh) dfs(nr, nc, next);
    visited[idx] = 0;
  }

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) dfs(r, c, '');
  }
  return { words: Array.from(found).sort((a, b) => a.localeCompare(b)), count: found.size, size: N, grid };
}

// Solve a list of matrices (mixed 1D or 2D). Accepts optional IDs.
// matricesInput: Array of { id?: string, grid: (2D|1D) } OR array of (2D|1D)
function solveBoggleMatrices(matricesInput, dict, { minLen = 3, limit = Infinity, verbose = false } = {}) {
  let items = [];
  if (!Array.isArray(matricesInput)) throw new Error('matricesInput must be an array');
  for (let i = 0; i < matricesInput.length; i++) {
    const m = matricesInput[i];
    if (m == null) continue;
    if (Array.isArray(m)) {
      items.push({ id: String(i + 1), grid: m });
    } else if (typeof m === 'object' && Array.isArray(m.grid)) {
      items.push({ id: m.id != null ? String(m.id) : String(i + 1), grid: m.grid });
    }
  }

  const results = [];
  const max = Math.min(items.length, isFinite(limit) ? limit : items.length);
  for (let i = 0; i < max; i++) {
    const { id, grid } = items[i];
    const res = solveBoggleGrid(grid, dict, { minLen });
    if (verbose) {
      console.log(`\n=== Matrix ${id} (${res.size}x${res.size}) ===`);
      console.log(printGrid(res.grid));
      console.log(`Found ${res.count} words`);
    }
    results.push({ id, ...res });
  }
  return results;
}

// Load matrices from a .js external file. Supports:
// - module.exports = { key: [flattened], ... }
// - module.exports = { key: [[2D]], ... }
// - module.exports = [ [flattened], [[2D]], ... ]
function loadMatricesFromFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const mod = require(abs);
  const out = [];
  if (Array.isArray(mod)) {
    for (let i = 0; i < mod.length; i++) {
      const grid = mod[i];
      if (Array.isArray(grid)) out.push({ id: String(i + 1), grid });
    }
  } else if (mod && typeof mod === 'object') {
    const keys = Object.keys(mod);
    for (const k of keys) {
      const grid = mod[k];
      if (Array.isArray(grid)) out.push({ id: k, grid });
    }
  } else {
    throw new Error('Unsupported matrices module format');
  }
  return out;
}

// ----------------------------------------
// CLI
// ----------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const n = (k) => (i + 1 < argv.length ? argv[i + 1] : undefined);
    switch (a) {
      case '--help':
      case '-h':
        args.help = true; break;
      case '--file':
      case '--from':
      case '--matrices':
        args.file = n(); i++; break;
      case '--count':
      case '--limit':
        args.count = parseInt(n(), 10); i++; break;
      case '--minLen':
      case '--min':
        args.minLen = parseInt(n(), 10); i++; break;
      case '--words':
        args.words = n(); i++; break;
      case '--save':
      case '--save-solutions':
        args.saveSolutions = true; break;
      case '--out':
        args.out = n(); i++; break;
      case '--skip-existing':
        args.skipExisting = true; break;
      case '--verbose':
      case '-v':
        args.verbose = true; break;
      case '--all':
        args.all = true; break;
      default:
        args._.push(a);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Boggle solver (PT-BR)

Usage:
	node solve-boggle.js --file matrix4x4.js --count 3 [--minLen 3] [--words words-ptbr.txt]
	node solve-boggle.js --file caminho/externo.js --all

Options:
	--file|--from|--matrices   Arquivo .js com matrizes (1D flattened ou 2D). Pode ser relativo ao repo.
	--count|--limit N          Quantas matrizes resolver (padrão: todas ou até 50 se não usar --all).
	--all                      Resolver todas as matrizes do arquivo.
	--minLen N                 Tamanho mínimo da palavra (padrão: 3).
	--words CAMINHO            Dicionário (padrão: words-ptbr.txt).
  --save|--save-solutions    Salva as soluções em um arquivo .js acumulador (formato MATRICES['id'] = { ... }).
  --out CAMINHO              Caminho do arquivo de saída (padrão: <arquivo-matrizes>-solutions.js no mesmo diretório).
  --skip-existing            Não sobrescreve entradas já existentes no arquivo de saída (pula IDs já presentes).
	--verbose|-v               Imprime a grade e estatísticas.
	--help|-h                  Mostra esta ajuda.

Exemplos:
	node solve-boggle.js --file matrix4x4.js --count 2 -v
	node solve-boggle.js --file matrix5x5.js --all --minLen 4
	node solve-boggle.js --file caminho/custom.js --words words-ptbr.txt
	node solve-boggle.js --file matrix4x4.js --count 3 --save --out matrix4x4-solutions.js
`);
}

// ----------------------------------------
// Persistência das soluções como arquivo acumulador JS
// ----------------------------------------

function defaultSolutionsOutPath(matricesFile) {
  const dir = path.dirname(path.isAbsolute(matricesFile) ? matricesFile : path.join(__dirname, matricesFile));
  const base = path.basename(matricesFile, path.extname(matricesFile));
  return path.join(dir, `${base}-solutions.js`);
}

function ensureSolutionsHeader(outPath) {
  const exists = fs.existsSync(outPath);
  if (!exists) {
    const header = [
      '// Arquivo gerado automaticamente por solve-boggle.js (soluções)',
      `// Data: ${new Date().toISOString()}`,
      'const MATRICES = {};',
      'module.exports = MATRICES;',
      '',
    ].join('\n');
    fs.writeFileSync(outPath, header, 'utf8');
    return;
  }
  // If exists, do nothing (acumulador). Assumimos formato compatível.
}

function fileHasEntry(outPath, id) {
  if (!fs.existsSync(outPath)) return false;
  const txt = fs.readFileSync(outPath, 'utf8');
  return txt.includes(`MATRICES['${id}']`) || txt.includes(`MATRICES["${id}"]`);
}

function appendSolution(outPath, id, solution) {
  const line = `MATRICES['${id}'] = { size: ${solution.size}, count: ${solution.count}, words: ${JSON.stringify(solution.words)} };\n`;
  fs.appendFileSync(outPath, line, 'utf8');
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const dictPath = args.words || 'words-ptbr.txt';
  const minLen = Number.isInteger(args.minLen) && args.minLen > 0 ? args.minLen : 3;
  const file = args.file || 'matrix4x4.js';

  if (!fs.existsSync(path.isAbsolute(file) ? file : path.join(__dirname, file))) {
    console.error(`Arquivo de matrizes não encontrado: ${file}`);
    printHelp();
    process.exit(1);
  }

  const limit = args.all ? Infinity : (Number.isInteger(args.count) && args.count > 0 ? args.count : Infinity);

  const started = Date.now();
  const dict = loadDictionary(dictPath, { minLen });
  const matrices = loadMatricesFromFile(file);
  const results = solveBoggleMatrices(matrices, dict, { minLen, limit, verbose: !!args.verbose });
  const elapsed = Date.now() - started;

  // Summary
  let totalWords = 0;
  for (const r of results) totalWords += r.count;
  console.log(`\nResolvido ${results.length} matriz(es) em ${elapsed} ms | Palavras totais: ${totalWords}`);

  // Print compact results per matrix
  for (const r of results) {
    console.log(`\n[${r.id}] ${r.size}x${r.size} -> ${r.count} palavra(s)`);
  }

  // Persist solutions if requested
  if (args.saveSolutions) {
    const outPath = args.out ? (path.isAbsolute(args.out) ? args.out : path.join(__dirname, args.out)) : defaultSolutionsOutPath(file);
    ensureSolutionsHeader(outPath);
    let wrote = 0;
    for (const r of results) {
      const id = r.id;
      if (args.skipExisting && fileHasEntry(outPath, id)) continue;
      appendSolution(outPath, id, { size: r.size, count: r.count, words: r.words });
      wrote++;
    }
    console.log(`\nSoluções salvas em: ${outPath} (${wrote} entrad${wrote === 1 ? 'a' : 'as'} adicionad${wrote === 1 ? 'a' : 'as'})`);
  }
}

// ----------------------------------------
// Exports (programmatic API)
// ----------------------------------------
module.exports = {
  normalizeString,
  loadDictionary,
  to2D,
  printGrid,
  solveBoggleGrid,
  solveBoggleMatrices,
  loadMatricesFromFile,
};

