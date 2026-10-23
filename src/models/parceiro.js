const CHAVE_LOCAL_STORAGE = 'codigoConsultor';

function normalizarCodigo(valor) {
  const codigo = String(valor ?? '').trim();
  return codigo || null;
}

function obterDaQuery(query) {
  return normalizarCodigo(query?.codigoConsultor ?? query?.partner);
}

module.exports = {
  CHAVE_LOCAL_STORAGE,
  normalizarCodigo,
  obterDaQuery,
};
