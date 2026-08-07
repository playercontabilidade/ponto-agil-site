export function isUuid(valor) {
  const texto = String(valor || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    texto,
  );
}

export function normalizarUuid(valor) {
  const texto = String(valor || '')
    .trim()
    .replace(/^\{/, '')
    .replace(/\}$/, '');

  const correspondencia =
    /^([0-9a-f]{7})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i.exec(
      texto,
    );
  if (correspondencia) {
    return `0${correspondencia[1]}-${correspondencia[2]}-${correspondencia[3]}-${correspondencia[4]}-${correspondencia[5]}`;
  }

  return texto;
}

export function arquivoBloqueado(arquivo, tiposMimePermitidos, extensoesPermitidas) {
  if (!(arquivo instanceof File)) return false;

  const tipoMime = (arquivo.type || '').toLowerCase().trim();
  const nomeArquivo = (arquivo.name || '').toLowerCase();

  if (tipoMime && !tiposMimePermitidos.some((permitido) => tipoMime === permitido)) {
    return true;
  }

  if (!tipoMime) {
    return !extensoesPermitidas.some((extensao) =>
      nomeArquivo.endsWith(extensao.toLowerCase()),
    );
  }

  return false;
}

export function validarAnexosAcompanhamento(arquivos) {
  const lista = Array.isArray(arquivos) ? arquivos : Array.from(arquivos || []);
  const limiteMb = 20;
  const limiteQuantidade = 5;

  if (lista.length > limiteQuantidade) {
    return { ok: false, msg: `Envie no máximo ${limiteQuantidade} anexos.` };
  }

  for (const arquivo of lista) {
    if (arquivo.size > limiteMb * 1024 * 1024) {
      return {
        ok: false,
        msg: `Cada anexo deve ter no máximo ${limiteMb} MB.`,
      };
    }
  }

  return { ok: true, msg: '' };
}
