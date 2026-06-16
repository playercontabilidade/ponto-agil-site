(function () {
  const { baseUrl, API_ENDPOINTS } = window.PONTO_AGIL_CONTRATACAO_CONFIG;
  const { parseApiError } = window.ContratacaoUtils;

  async function request(path, options) {
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    if (response.status === 204) return null;
    return response.json();
  }

  function getPlanosPublicos() {
    return request(API_ENDPOINTS.PLANOS_PUBLICO, { method: "GET" });
  }

  function criarContratacao(payload) {
    return request(API_ENDPOINTS.CRIAR_CONTRATACAO, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function validarEmail(contratacaoId, codigo) {
    return request(API_ENDPOINTS.VALIDAR_EMAIL(contratacaoId), {
      method: "POST",
      body: JSON.stringify({ codigo }),
    });
  }

  function getContrato(contratacaoId) {
    return request(API_ENDPOINTS.CONTRATO(contratacaoId), { method: "GET" });
  }

  function aceitarContrato(contratacaoId) {
    return request(API_ENDPOINTS.ACEITE_CONTRATO(contratacaoId), {
      method: "POST",
      body: JSON.stringify({ liAceito: true }),
    });
  }

  window.ContratacaoApi = Object.freeze({
    getPlanosPublicos,
    criarContratacao,
    validarEmail,
    getContrato,
    aceitarContrato,
  });
})();
