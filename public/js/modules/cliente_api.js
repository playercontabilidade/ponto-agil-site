function montarUrl(baseUrl, caminho) {
  return new URL(`${baseUrl}${caminho.startsWith('/') ? caminho : `/${caminho}`}`);
}

export async function buscarJsonComBearer(baseUrl, caminho, token) {
  const url = montarUrl(baseUrl, caminho);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const texto = await response.text().catch(() => '');
    throw new Error(texto || `Erro HTTP ${response.status}`);
  }

  return response.json();
}

export async function buscarJson(baseUrl, caminho) {
  const url = montarUrl(baseUrl, caminho);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const texto = await response.text().catch(() => '');
    throw new Error(texto || `Erro HTTP ${response.status}`);
  }

  return response.json();
}

export async function enviarMultipart(baseUrl, caminho, token, campos, arquivos) {
  const url = montarUrl(baseUrl, caminho);
  const formData = new FormData();

  Object.entries(campos || {}).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null) return;
    if (typeof valor === 'boolean') formData.append(chave, valor ? 'true' : 'false');
    else formData.append(chave, String(valor));
  });

  const lista = Array.isArray(arquivos) ? arquivos : Array.from(arquivos || []);
  lista.forEach((arquivo) => formData.append('anexos', arquivo));

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${String(token || '').trim()}`,
  };

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const texto = await response.text().catch(() => '');
    throw new Error(texto || `Erro HTTP ${response.status}`);
  }

  const texto = await response.text().catch(() => '');
  if (!texto) return null;

  try {
    return JSON.parse(texto);
  } catch {
    return { raw: texto };
  }
}

export async function replicarAcompanhamentoMultipart(
  baseUrl,
  caminho,
  token,
  mensagem,
  arquivos,
) {
  const url = montarUrl(baseUrl, caminho);
  url.searchParams.set('token', String(token || '').trim());

  const formData = new FormData();
  formData.append('mensagem', mensagem);

  const lista = Array.isArray(arquivos) ? arquivos : Array.from(arquivos || []);
  lista.forEach((arquivo) => formData.append('anexos', arquivo));

  const headers = { Accept: 'application/json' };
  const tokenBruto = String(token || '').trim();
  if (tokenBruto) headers.Authorization = `Bearer ${tokenBruto}`;

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const texto = await response.text().catch(() => '');
    throw new Error(texto || `Erro HTTP ${response.status}`);
  }

  const texto = await response.text().catch(() => '');
  if (!texto) return null;

  try {
    return JSON.parse(texto);
  } catch {
    return { raw: texto };
  }
}
