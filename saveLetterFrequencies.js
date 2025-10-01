// saveLetterFrequencies.js
// Gera e salva as frequências de letras (A–Z) em um novo arquivo JavaScript.

const fs = require('fs');
const path = require('path');
const { calcularFrequenciaLetras } = require('./script-test');

function salvarFrequenciasEmArquivo() {
  const wordsPath = path.join(__dirname, 'words-ptbr.txt');
  if (!fs.existsSync(wordsPath)) {
    console.error('Arquivo não encontrado:', wordsPath);
    process.exit(1);
  }

  const frequencias = calcularFrequenciaLetras(wordsPath);
  const outPath = path.join(__dirname, 'letterFrequencies.js');

  const header = [
    '// Arquivo gerado automaticamente. Não editar manualmente.',
    `// Fonte: ${path.basename(wordsPath)}`,
    `// Gerado em: ${new Date().toISOString()}`,
    '// Formato: { [letra]: { count: number, percent: number } }',
  ].join('\n');

  const fileContents = `${header}\n\nmodule.exports = ${JSON.stringify(frequencias, null, 2)};\n`;

  fs.writeFileSync(outPath, fileContents, 'utf8');
  console.log('Frequências salvas em:', outPath);
}

if (require.main === module) {
  try {
    salvarFrequenciasEmArquivo();
  } catch (err) {
    console.error('Erro ao salvar frequências:', err);
    process.exit(1);
  }
}

module.exports = { salvarFrequenciasEmArquivo };