# crossword-creator

Pequenos scripts Node.js para:
- Analisar frequências de letras (A–Z) em um dicionário de palavras em português (`words-ptbr.txt`)
- Sortear palavras e tentar encaixá‑las em uma grade N×N (estilo caça‑palavras)
- Gerar matrizes NxN ("boggle") com letras sorteadas das 12 mais frequentes

Sem dependências externas. Módulos CommonJS (`require`/`module.exports`).

## Requisitos
- Node.js (qualquer versão moderna; os scripts usam apenas APIs padrão)
- Windows (exemplos de comandos em PowerShell/cmd), mas funciona igualmente em outros SOs

## Estrutura
- `words-ptbr.txt` — Lista de palavras (UTF‑8, uma por linha; pode conter acentos/diacríticos)
- `script-calc-freq.js` — Calcula frequências A–Z a partir do dicionário
- `letter-freq.js` — Arquivo gerado por `script-calc-freq.js` com as frequências (não editar manualmente)
- `script.js` — `drawRandomWords()` sorteia 300 palavras do dicionário
- `wordgrid-bruteforce.js` — Colocador/brute force de palavras em grade N×N
- `matrix.js` — Geração de matrizes NxN (boggle) a partir das 12 letras mais frequentes
- `matrix4x4.js`, `matrix5x5.js`, ... — Arquivos acumuladores de matrizes geradas por tamanho (criados sob demanda)

## Uso rápido (CLI)

Frequências (A–Z) a partir de `words-ptbr.txt`:

```powershell
# Imprime as frequências ordenadas
node script-calc-freq.js

# Gera/atualiza letter-freq.js
node script-calc-freq.js --save
```

Gerar e salvar matrizes boggle (NxN) a partir das 12 letras mais frequentes:

```powershell
# Imprime 2 matrizes 4×4 (não salva)
node matrix.js --count 2 --size 4 --print

# Salva 4 matrizes 5×5 em matrix5x5.js (append incremental)
node matrix.js --count 4 --size 5 --save

# Salva 97 matrizes 4×4 em matrix4x4.js (silencioso)
node matrix.js --count 97 --size 4 --save

# Salvar em arquivo customizado (ignora roteamento por tamanho)
node matrix.js --count 3 --size 5 --save --out matrix.custom.js
```

Tentar encaixar palavras na grade (brute force, N padrão = 4):

```powershell
node wordgrid-bruteforce.js
```

## API (uso em código)

Frequências:

```js
const { calcularFrequenciaLetras, salvarResultadoComoObjetoJS } = require('./script-calc-freq');
const freq = calcularFrequenciaLetras('words-ptbr.txt');
// salvarResultadoComoObjetoJS('words-ptbr.txt'); // gera letter-freq.js
```

Sorteio de palavras:

```js
const { drawRandomWords } = require('./script');
const words = drawRandomWords(); // 300 palavras únicas
```

Brute force de grade:

```js
const { findBestPlacement } = require('./wordgrid-bruteforce');
const res = findBestPlacement([ 'CASA', 'RUA', 'SOL' ], 4, { maxTimeMs: 10000 });
// res = { grid, insertedWords, stats: { count, attempts, timeMs, cutoffReached } }
```

Geração de matrizes (boggle):

```js
const { sortedLetters, getTopLetters12, createMatrixBoggle, generateMatrices } = require('./matrix');
console.log(sortedLetters); // 12 letras mais frequentes (ordem de letter-freq.js)
const m = createMatrixBoggle(4); // 16 letras (4x4), pode repetir
const { matrices } = generateMatrices(3, 5); // três matrizes 5x5
```

## Formato dos arquivos de matrizes por tamanho

Cada arquivo por tamanho (ex.: `matrix4x4.js`, `matrix5x5.js`) é um acumulador e exporta um único objeto `MATRICES`:

```js
// Cabeçalho (gerado automaticamente)
const MATRICES = {};
module.exports = MATRICES;

// Entradas anexadas ao longo do tempo
MATRICES['matrix4x4-1'] = ['A', 'B', 'C', /* ... 16 letras ... */];
MATRICES['matrix4x4-2'] = ['A', 'B', 'C', /* ... */];
// ...
```

- Convenção de nomes: `matrix{S}x{S}-{k}` (ex.: `matrix5x5-12`).
- O próximo índice `{k}` é calculado automaticamente lendo o arquivo; o script sempre “append”, nunca sobrescreve entradas existentes.

## Notas e pegadinhas
- `letter-freq.js` é gerado por script; para atualizar, rode `node script-calc-freq.js --save`.
- `script.js` usa `totalLines = 245300` hard‑coded (0‑based). Se o tamanho de `words-ptbr.txt` mudar, atualize esse valor.
- `wordgrid-bruteforce.js` tem heurística simples (`canFit`) e algum código duplicado (constantes/direções); o API exportado deve permanecer estável.
- Os scripts usam leitura síncrona de arquivos por simplicidade; se alterar para streaming, mantenha o mesmo shape de saída e efeitos colaterais.
- Matrizes boggle são vetores achatados de tamanho `size*size`, letras maiúsculas, e podem repetir; sorteio uniforme sobre as 12 letras mais frequentes (usa `crypto.randomInt` quando disponível).

## Desenvolvimento
Sem `package.json`; você pode executar diretamente com `node`. Se desejar criar automações, uma ideia:

```powershell
# Exemplo: gerar 100 matrizes 4x4 diariamente
node matrix.js --count 100 --size 4 --save
```

Sinta‑se à vontade para abrir issues/melhorias (ex.: parametrizar brute force via flags, logs de progresso, tarefas VS Code, etc.).
