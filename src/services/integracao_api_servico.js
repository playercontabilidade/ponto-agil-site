const api = require('../config/api');

async function interpretarErro(response) {
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
    if (typeof dados.error === 'string') return dados.error;
  } catch {
    /* resposta não JSON */
  }

  return texto || `Erro HTTP ${response.status}`;
}

async function getJson(caminho) {
  const url = `${api.baseUrl}${caminho}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await interpretarErro(response));
  }

  return response.json();
}

async function postJson(caminho, corpo) {
  const url = `${api.baseUrl}${caminho}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(corpo),
  });

  if (!response.ok) {
    throw new Error(await interpretarErro(response));
  }

  return response.json();
}

module.exports = {
  getJson,
  postJson,
  interpretarErro,
};
