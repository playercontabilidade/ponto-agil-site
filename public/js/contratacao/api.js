(function () {
  const { baseUrl, API_ENDPOINTS } = window.PONTO_AGIL_CONTRATACAO_CONFIG;
  const { parseApiError, parseApiBody } = window.ContratacaoUtils;
  const parametrosUrl = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const parametrosQuery = new URLSearchParams(window.location.search);
  const publicIdDaUrl = window.location.pathname.match(/^\/contratacao\/([^/]+)\/?$/)?.[1] ||
    parametrosUrl.get("publicId") || parametrosUrl.get("contratacaoId") ||
    parametrosQuery.get("publicId") || parametrosQuery.get("contratacaoId") || "global";
  const tokenStorageKey = `ponto_agil_contratacao_token_${publicIdDaUrl}`;
  let sessionToken =
    parametrosUrl.get("previewToken") || parametrosQuery.get("previewToken") ||
    parametrosUrl.get("sessionToken") || parametrosQuery.get("sessionToken") ||
    sessionStorage.getItem(tokenStorageKey) || null;

  function createApiError(response, body, message) {
    const erroApi = new Error(message || `Erro HTTP ${response.status}`);
    erroApi.status = response.status;
    erroApi.body = body;
    return erroApi;
  }

  async function request(path, options) {
    const urlRequisicao = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const { semAutorizacao = false, ...opcoesFetch } = options || {};
    const response = await fetch(urlRequisicao, {
      ...opcoesFetch,
      headers: {
        Accept: "application/json",
        ...(!semAutorizacao && sessionToken
          ? { Authorization: `Bearer ${sessionToken}` }
          : {}),
        ...(opcoesFetch.body ? { "Content-Type": "application/json" } : {}),
        ...opcoesFetch.headers,
      },
    });

    const body = await parseApiBody(response);

    if (response.status === 401) {
      sessionToken = null;
      sessionStorage.removeItem(tokenStorageKey);
      window.dispatchEvent(new CustomEvent("contratacao-sessao-expirada"));
    }

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
    return request(API_ENDPOINTS.PLANOS_PUBLICO, {
      method: "GET",
      semAutorizacao: true,
    });
  }

  function criarContratacao(payload) {
    return request(API_ENDPOINTS.CRIAR_CONTRATACAO, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function acessarPorLink(accessToken) {
    const parametros = new URLSearchParams({ accessToken });
    return request(`${API_ENDPOINTS.ACESSAR_POR_LINK}?${parametros.toString()}`, {
      method: "GET",
      semAutorizacao: true,
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

  function regularizarCortesia(contratacaoId, exigePagamento) {
    return request(API_ENDPOINTS.REGULARIZAR_CORTESIA(contratacaoId), {
      method: "POST",
      body: JSON.stringify({ exigePagamento: Boolean(exigePagamento) }),
    });
  }

  function definirSessaoTemporaria(token, expiresAt) {
    sessionToken = token || null;
    if (sessionToken) {
      sessionStorage.setItem(tokenStorageKey, sessionToken);
      if (expiresAt) sessionStorage.setItem(`${tokenStorageKey}_expiresAt`, expiresAt);
    } else {
      sessionStorage.removeItem(tokenStorageKey);
      sessionStorage.removeItem(`${tokenStorageKey}_expiresAt`);
    }
  }

  function temSessaoTemporaria() {
    return Boolean(sessionToken);
  }

  window.ContratacaoApi = Object.freeze({
    getPlanosPublicos,
    criarContratacao,
    acessarPorLink,
    validarEmail,
    getContrato,
    aceitarContrato,
    getStatus,
    reenviarCodigo,
    cancelarContratacao,
    regularizarCortesia,
    definirSessaoTemporaria,
    temSessaoTemporaria,
  });
})();
