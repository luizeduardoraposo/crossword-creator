// Calcula a frequência de letras A–Z a partir de words-ptbr.txt
// - Normaliza acentos (á, ã, ç, etc.) para A–Z
// - Conta apenas letras A–Z (ignora dígitos, hífens, espaços, etc.)
// - Retorna um objeto JS com chaves A..Z em ordem decrescente de frequência

const fs = require('fs');
const path = require('path');

/**
 * Remove acentos e marcações diacríticas e converte para A–Z.
 * Exemplos: áàâã -> A, ç -> C, ü -> U
 * @param {string} s
 * @returns {string}
 */
function normalizeToAZ(s) {
	// NFD separa letras de marcas; removemos marcas (0300–036F)
	return s
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toUpperCase();
}

/**
 * Calcula as frequências de A–Z no arquivo fornecido e a porcentagem relativa ao total.
 * @param {string} filePath caminho para words-ptbr.txt
 * @returns {Record<string, { count: number, percent: number }>} objeto ordenado por frequência desc
 */
function calcularFrequenciaLetras(filePath) {
	// Inicializa contadores A–Z com 0 para manter presença de todas as letras
	const counts = {};
	for (let c = 65; c <= 90; c++) counts[String.fromCharCode(c)] = 0;

	const raw = fs.readFileSync(filePath, 'utf8');
	const normalized = normalizeToAZ(raw);

	for (let i = 0; i < normalized.length; i++) {
		const ch = normalized[i];
		if (ch >= 'A' && ch <= 'Z') counts[ch]++;
	}

	// Soma total de letras
	const totalLetters = Object.values(counts).reduce((a, b) => a + b, 0);

	// Ordena por frequência desc, depois por letra asc (para desempate estável)
	const orderedEntries = Object.entries(counts).sort((a, b) => {
		if (b[1] !== a[1]) return b[1] - a[1];
		return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
	});

	// Reconstrói como objeto com ordem de inserção preservada, contendo contagem e porcentagem
	const orderedObject = {};
	for (const [k, v] of orderedEntries) {
		const percent = totalLetters > 0 ? (v / totalLetters) * 100 : 0;
		orderedObject[k] = { count: v, percent };
	}
	return orderedObject;
}

// Executa quando rodado diretamente: calcula e imprime um resumo
if (require.main === module) {
	try {
		const filePath = path.join(__dirname, 'words-ptbr.txt');
		if (!fs.existsSync(filePath)) {
			console.error('Arquivo não encontrado:', filePath);
			process.exit(1);
		}
		const frequencias = calcularFrequenciaLetras(filePath);
		console.log('Frequência de letras (A–Z) e porcentagem do total, do maior para o menor:');
		// Imprime no formato "A: 359503, X%"
		for (const letra of Object.keys(frequencias)) {
			const { count, percent } = frequencias[letra];
			console.log(`${letra}: ${count}, ${percent.toFixed(2)}%`);
		}
	} catch (err) {
		console.error('Erro ao calcular frequências:', err);
		process.exit(1);
	}
}

// Exporta para uso em outros scripts, se necessário
module.exports = { calcularFrequenciaLetras };

