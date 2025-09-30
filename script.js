const fs = require('fs');

/**
 * Sorteia 300 palavras únicas do arquivo words-ptbr.txt, baseado nas linhas 1 a 245300.
 * As palavras sorteadas são armazenadas no array drawnWords.
 */
function drawRandomWords() {
  const filePath = 'words-ptbr.txt';
  const totalLines = 245300;
  const drawCount = 300;
  const drawnWords = [];

  // Gera 300 números de linha únicos entre 1 e 245300
  const drawnIndexes = new Set();
  while (drawnIndexes.size < drawCount) {
    const idx = Math.floor(Math.random() * totalLines);
    drawnIndexes.add(idx);
  }

  // Lê o arquivo e coleta as palavras sorteadas
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  for (const idx of drawnIndexes) {
    if (lines[idx]) {
      drawnWords.push(lines[idx]);
    }
  }
  return drawnWords;
}

module.exports = { drawRandomWords };
