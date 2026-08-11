const CHAVE_LOCAL_STORAGE = 'partner';

function normalizarCodigo(valor) {
  const codigo = String(valor ?? '').trim();
  return codigo || null;
}

function obterDaQuery(query) {
  return normalizarCodigo(query?.partner);
}

module.exports = {
  CHAVE_LOCAL_STORAGE,
  normalizarCodigo,
  obterDaQuery,
};
