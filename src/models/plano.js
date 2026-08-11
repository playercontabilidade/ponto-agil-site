const FAIXA_ENTERPRISE = 'Acima de 100 colaboradores';

function normalizarChaveFaixa(nome) {
  return String(nome || '').trim().toLowerCase();
}

function obterPesoPlano(nome) {
  const normalizado = String(nome || '').toLowerCase();
  if (normalizado.includes('essencial')) return 1;
  if (normalizado.includes('profissional')) return 2;
  if (normalizado.includes('completo')) return 3;
  return 99;
}

function ordenarPlanos(planos) {
  return [...planos].sort(
    (a, b) => obterPesoPlano(a.nome) - obterPesoPlano(b.nome),
  );
}

function obterIndiceDestaque(planos) {
  const indice = planos.findIndex((plano) =>
    String(plano.nome || '').toLowerCase().includes('profissional'),
  );
  return indice >= 0 ? indice : Math.min(1, planos.length - 1);
}

function faixaEhAcimaDe100(nomeFaixa) {
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

function extrairFaixas(planos) {
  const mapa = new Map();

  planos.forEach((plano) => {
    (Array.isArray(plano.faixas) ? plano.faixas : []).forEach((faixa) => {
      const chave = normalizarChaveFaixa(faixa.nome);
      if (!mapa.has(chave)) {
        mapa.set(chave, faixa.nome);
      }
    });
  });

  const faixas = Array.from(mapa.values());
  if (!faixas.some((nome) => normalizarChaveFaixa(nome) === normalizarChaveFaixa(FAIXA_ENTERPRISE))) {
    faixas.push(FAIXA_ENTERPRISE);
  }

  return faixas;
}

function normalizarLista(payload) {
  if (!Array.isArray(payload)) return [];
  return ordenarPlanos(payload);
}

function montarPrecificacao(planos) {
  const lista = normalizarLista(planos);
  if (lista.length === 0) return null;

  const faixas = extrairFaixas(lista);
  const indiceDestaque = obterIndiceDestaque(lista);

  const paineis = faixas.map((nomeFaixa, indiceFaixa) => {
    const chave = normalizarChaveFaixa(nomeFaixa);
    const acimaDe100 = faixaEhAcimaDe100(nomeFaixa);

    if (acimaDe100) {
      return {
        nomeFaixa,
        chave,
        acimaDe100: true,
        ativo: indiceFaixa === 0,
        cards: [],
      };
    }

    const cards = lista
      .map((plano, indicePlano) => {
        const faixa = (Array.isArray(plano.faixas) ? plano.faixas : []).find(
          (item) => normalizarChaveFaixa(item.nome) === chave,
        );
        if (!faixa) return null;
        return {
          plano,
          faixa,
          emDestaque: indicePlano === indiceDestaque,
        };
      })
      .filter(Boolean);

    return {
      nomeFaixa,
      chave,
      acimaDe100: false,
      ativo: indiceFaixa === 0,
      cards,
    };
  });

  return {
    planos: lista,
    faixas,
    indiceDestaque,
    paineis,
  };
}

module.exports = {
  FAIXA_ENTERPRISE,
  normalizarChaveFaixa,
  obterPesoPlano,
  ordenarPlanos,
  obterIndiceDestaque,
  faixaEhAcimaDe100,
  extrairFaixas,
  normalizarLista,
  montarPrecificacao,
};
