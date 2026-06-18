(function () {
  const baseUrl =
    typeof window.PONTO_AGIL_API === "string" && window.PONTO_AGIL_API
      ? window.PONTO_AGIL_API.replace(/\/$/, "")
      : "https://pontoagil.playercontabilidade.com";

  const API_ENDPOINTS = {
    OUVIDORIA_ENVIAR: "/ouvidoria/public/enviar",
    OUVIDORIA_CATEGORIAS: "/ouvidoria/public/categorias",
    DEPARTAMENTO_POR_TOKEN_LISTAR: "/departamento/por-token/listar",
    OUVIDORIA_ACOMPANHAMENTO: (uuid) =>
      `/ouvidoria/public/acompanhamento/${encodeURIComponent(String(uuid ?? "").trim())}`,
    OUVIDORIA_ACOMPANHAMENTO_REPLICAR: (uuid) =>
      `/ouvidoria/public/acompanhamento/replicar/${encodeURIComponent(
        String(uuid ?? "").trim(),
      )}`,
    OUVIDORIA_ANEXO: (id) =>
      `/ouvidoria/public/anexo/${encodeURIComponent(String(id ?? "").trim())}`,
    OUVIDORIA_ACOMPANHAMENTO_ANEXO: (id) =>
      `/ouvidoria/public/acompanhamento/anexo/${encodeURIComponent(String(id ?? "").trim())}`,
  };

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

  const ALLOWED_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

  /** Tipo fixo enquanto só denúncia está disponível no formulário. */
  const TIPO_MANIFESTACAO = "DENUNCIA";

  window.PONTO_AGIL_CONFIG = Object.freeze({
    baseUrl,
    API_ENDPOINTS,
    ALLOWED_MIME_TYPES,
    ALLOWED_FILE_EXTENSIONS,
    TIPO_MANIFESTACAO,
  });
})();
