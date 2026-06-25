export function formatarMoedaBrl(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function normalizarChaveFaixa(nome) {
  return String(nome || '').trim().toLowerCase();
}

export function obterPesoPlano(nome) {
  const normalizado = String(nome || '').toLowerCase();
  if (normalizado.includes('essencial')) return 1;
  if (normalizado.includes('profissional')) return 2;
  if (normalizado.includes('completo')) return 3;
  return 99;
}

export function faixaEhAcimaDe100(nomeFaixa) {
  const nome = String(nomeFaixa || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const acima = nome.match(/(?:acima|mais)\s+de\s+(\d+)/);
  if (acima) return Number(acima[1]) >= 100;

  const mais = nome.match(/(\d+)\s*\+/);
  if (mais) return Number(mais[1]) >= 100;

  const intervalo = nome.match(/(\d+)\s*(?:a|ate|-)\s*(\d+)/);
  if (intervalo) return Number(intervalo[1]) > 100;

  const numeros = (nome.match(/\d+/g) || []).map(Number);
  if (numeros.length === 0) return false;
  return Math.min(...numeros) > 100;
}

export async function interpretarErroApi(response) {
  const texto = await response.text();

  try {
    const dados = JSON.parse(texto);
    if (typeof dados.mensagem === 'string' && dados.mensagem) return dados.mensagem;
    if (typeof dados.message === 'string' && dados.message) return dados.message;
    if (Array.isArray(dados.errors)) {
      return (
        dados.errors
          .map((erro) =>
            typeof erro === 'string' ? erro : erro.defaultMessage || erro.message || '',
          )
          .filter(Boolean)
          .join(' ') || texto
      );
    }
    if (dados.errors && typeof dados.errors === 'object' && !Array.isArray(dados.errors)) {
      return Object.entries(dados.errors)
        .map(([chave, valor]) => `${chave}: ${valor}`)
        .join('; ');
    }
    if (typeof dados.error === 'string') return dados.error;
  } catch {
    /* não JSON */
  }

  return texto || `Erro HTTP ${response.status}`;
}
