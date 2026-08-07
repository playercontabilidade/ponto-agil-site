(function () {
  const { baseUrl, API_ENDPOINTS } = window.PONTO_AGIL_CONTRATACAO_CONFIG;
  const { parseApiError, parseApiBody } = window.ContratacaoUtils;

  function createApiError(response, body, message) {
    const err = new Error(message || `Erro HTTP ${response.status}`);
    err.status = response.status;
    err.body = body;
    return err;
  }

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

    const body = await parseApiBody(response);

    if (!response.ok) {
      const message =
        (typeof body?.mensagem === "string" && body.mensagem) ||
        (await parseApiError(response, body));
      throw createApiError(response, body, message);
    }

    if (response.status === 204) return null;
    return body;
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

  function getStatus(contratacaoId) {
    return request(API_ENDPOINTS.STATUS(contratacaoId), { method: "GET" });
  }

  function reenviarCodigo(contratacaoId) {
    return request(API_ENDPOINTS.REENVIAR_CODIGO(contratacaoId), {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  function cancelarContratacao(contratacaoId) {
    return request(API_ENDPOINTS.CANCELAR(contratacaoId), {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  window.ContratacaoApi = Object.freeze({
    getPlanosPublicos,
    criarContratacao,
    validarEmail,
    getContrato,
    aceitarContrato,
    getStatus,
    reenviarCodigo,
    cancelarContratacao,
  });
})();
