const fs = require('fs');
// Direções 8-vizinhas (linha, coluna)
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1]
];

function findBestPlacement(words, N = 4, options = {}) {
  const maxTimeMs = options.maxTimeMs || 5000;
  const maxAttempts = options.maxAttempts || 1e6;
  const verbose = options.verbose || false;
  const startTime = Date.now();

  // Mantém a ordem das palavras sorteadas
  const orderedWords = [...words];

  let best = { count: 0, grid: null, insertedWords: [], attempts: 0 };
  let cutoffReached = false;

  function emptyGrid() {
    return Array.from({ length: N }, () => Array(N).fill(null));
  }

  function inBounds(r, c) {
    return r >= 0 && r < N && c >= 0 && c < N;
  }

  // Busca todos os caminhos possíveis para encaixar a palavra na grade atual,
  // permitindo que letras já presentes na grade sejam usadas e só inserindo as que faltam
  function findAllPathsFlexible(word, grid) {
    const paths = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        dfs(r, c, 0, [], new Set());
      }
    }
    function dfs(r, c, idx, path, visited) {
      if (!inBounds(r, c)) return;
      const key = r + ',' + c;
      if (visited.has(key)) return;
      const cell = grid[r][c];
      if (cell !== null && cell !== word[idx]) return;
      path.push([r, c]);
      visited.add(key);
      if (idx === word.length - 1) {
        paths.push([...path]);
      } else {
        for (const [dr, dc] of DIRECTIONS) {
          dfs(r + dr, c + dc, idx + 1, path, visited);
        }
      }
      path.pop();
      visited.delete(key);
    }
    return paths;
  }

  // Insere apenas as letras que faltam na grade
  function placeWordFlexible(grid, word, path) {
    for (let i = 0; i < word.length; i++) {
      const [r, c] = path[i];
      if (grid[r][c] === null) {
        grid[r][c] = word[i];
      }
    }
  }

  function removeWordFlexible(grid, word, path, insertedWords) {
    for (let i = 0; i < word.length; i++) {
      const [r, c] = path[i];
      // Só apaga se nenhuma outra palavra usa essa célula
      let shared = false;
      for (const w of insertedWords) {
        if (w === null) continue;
        for (const [rr, cc] of w.path) {
          if (rr === r && cc === c) {
            shared = true;
            break;
          }
        }
        if (shared) break;
      }
      // Só remove se a célula foi preenchida por esta palavra
      if (!shared && grid[r][c] === word[i]) grid[r][c] = null;
    }
  }

  function canFit(wordsLeft, grid) {
    let free = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] === null) free++;
    let minNeeded = 0;
    for (const w of wordsLeft) minNeeded += w.length;
    return minNeeded <= free + N * N;
  }
  const fs = require('fs');
  // Direções 8-vizinhas (linha, coluna)
  const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
  ];

  function backtrack(idx, grid, insertedWords, used) {
    if (Date.now() - startTime > maxTimeMs || best.attempts >= maxAttempts) {
      cutoffReached = true;
      return;
    }
    best.attempts++;
    // Se a grade está cheia, salva o melhor resultado e interrompe a busca
    const isFull = grid.every(row => row.every(cell => cell !== null));
    if (isFull) {
      if (insertedWords.length > best.count) {
        best = {
          count: insertedWords.length,
          grid: grid.map(row => [...row]),
          insertedWords: insertedWords.map(w => ({ ...w })),
          attempts: best.attempts
        };
      }
      return;
    }
    if (idx === orderedWords.length) {
      if (insertedWords.length > best.count) {
        best = {
          count: insertedWords.length,
          grid: grid.map(row => [...row]),
          insertedWords: insertedWords.map(w => ({ ...w })),
          attempts: best.attempts
        };
      }
      return;
    }
    if (!canFit(orderedWords.slice(idx), grid)) return;
    const word = orderedWords[idx];
    const paths = findAllPathsFlexible(word, grid);
    if (verbose) console.log(`Tentando palavra: ${word}, caminhos: ${paths.length}`);
    for (const path of paths) {
      placeWordFlexible(grid, word, path);
      insertedWords.push({ word, path });
      backtrack(idx + 1, grid, insertedWords, used);
      insertedWords.pop();
      removeWordFlexible(grid, word, path, insertedWords);
    }
    // Ou pula palavra
    backtrack(idx + 1, grid, insertedWords, used);
  }

  backtrack(0, emptyGrid(), [], new Set());
  const timeMs = Date.now() - startTime;
  return {
    grid: best.grid,
    insertedWords: best.insertedWords,
    stats: {
      count: best.count,
      attempts: best.attempts,
      timeMs,
      cutoffReached
    }
  };
}


// ===================== TESTE DINÂMICO COM PALAVRAS SORTEADAS =====================
if (require.main === module) {
  const N = 4;
  // Lê todas as palavras do arquivo words-ptbr.txt
  const filePath = 'words-ptbr.txt';
  let words = [];
  try {
    words = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).filter(Boolean);
  } catch (e) {
    console.error('Erro ao ler o arquivo words-ptbr.txt:', e);
    process.exit(1);
  }
  console.log(`Total de palavras carregadas: ${words.length}`);
  // Parâmetros de execução
  const maxTimeMs = 20000; // 20 segundos
  const maxAttempts = 1e6;
  // Função de log de progresso
  let lastLog = Date.now();
  const logProgress = (stats) => {
    const now = Date.now();
    if (now - lastLog > 2000) { // log a cada 2 segundos
      console.log(`[Progresso] Tentativas: ${stats.attempts}, Palavras encaixadas: ${stats.count}, Tempo: ${stats.timeMs}ms`);
      lastLog = now;
    }
  };
  // Wrapper para injetar log de progresso
  function findBestPlacementWithLog(words, N, options) {
    let bestStats = { attempts: 0, count: 0, timeMs: 0 };
    const opts = Object.assign({}, options, {
      verbose: false
    });
    const start = Date.now();
    let lastBest = 0;
    function progressHook(stats) {
      if (stats.count > lastBest) {
        console.log(`[Novo melhor] Palavras encaixadas: ${stats.count} em ${stats.attempts} tentativas, tempo: ${stats.timeMs}ms`);
        lastBest = stats.count;
      }
      logProgress(stats);
    }
    // Patch: chama progressHook dentro do backtrack
    const origFindBestPlacement = findBestPlacement;
    let bestResult = null;
    function patchedFindBestPlacement(words, N, options) {
      let best = { count: 0, grid: null, insertedWords: [], attempts: 0 };
      let cutoffReached = false;
      const startTime = Date.now();
      // ...existing code...
      // Copia funções auxiliares do findBestPlacement
      // ...existing code...
      function backtrack(idx, grid, insertedWords, used) {
        if (Date.now() - startTime > opts.maxTimeMs || best.attempts >= opts.maxAttempts) {
          cutoffReached = true;
          return;
        }
        best.attempts++;
        if (idx === words.length) {
          const hasEmpty = grid.some(row => row.some(cell => cell === null));
          if (insertedWords.length > best.count && !hasEmpty) {
            best = {
              count: insertedWords.length,
              grid: grid.map(row => [...row]),
              insertedWords: insertedWords.map(w => ({ ...w })),
              attempts: best.attempts
            };
            progressHook({
              count: best.count,
              attempts: best.attempts,
              timeMs: Date.now() - startTime
            });
          }
          return;
        }
        // ...existing code...
        if (best.attempts % 10000 === 0) {
          progressHook({
            count: best.count,
            attempts: best.attempts,
            timeMs: Date.now() - startTime
          });
        }
        // ...existing code...
      }
      // ...existing code...
      backtrack(0, Array.from({ length: N }, () => Array(N).fill(null)), [], new Set());
      const timeMs = Date.now() - startTime;
      return {
        grid: best.grid,
        insertedWords: best.insertedWords,
        stats: {
          count: best.count,
          attempts: best.attempts,
          timeMs,
          cutoffReached
        }
      };
    }
    // Usa a função original
    return origFindBestPlacement(words, N, opts);
  }
  // Executa com log de progresso
  const result = findBestPlacementWithLog(words, N, { maxTimeMs, maxAttempts });
  console.log("Melhor grade encontrada:");
  if (result.grid) {
    for (const row of result.grid) {
      console.log(row.map(x => x || ".").join(" "));
    }
  } else {
    console.log("Nenhuma solução encontrada.");
  }
  console.log("Palavras inseridas:");
  for (const w of result.insertedWords) {
    console.log(`- ${w.word}: ${JSON.stringify(w.path)}`);
  }
  console.log("Estatísticas:", result.stats);
}

/**
 * Complexidade: O((n!) * (N^2 * 8^L)) para n palavras e palavras de tamanho L.
 * Consome muita memória e CPU para listas grandes. Sugestão de melhoria: usar CSP, SAT, ILP, A*, bitmasking, branch-and-bound.
 */

module.exports = { findBestPlacement };
