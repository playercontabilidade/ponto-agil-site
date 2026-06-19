(function () {
  const baseUrl =
    typeof window.PONTO_AGIL_API === "string" && window.PONTO_AGIL_API
      ? window.PONTO_AGIL_API.replace(/\/$/, "")
      : "https://pontoagil.playercontabilidade.com";

  const API_ENDPOINTS = {
    OUVIDORIA_ENVIAR: "/ouvidoria/public/enviar",
    OUVIDORIA_CATEGORIAS: "/ouvidoria/public/categorias",
    OUVIDORIA_PRAZO_RESPOSTA: "/ouvidoria/public/prazo-resposta",
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

  const TIPOS_MANIFESTACAO = ["DENUNCIA", "ELOGIO", "RECLAMACAO", "SUGESTAO"];

  /** Padrão até o menu de tipos no app Flutter escolher outro via ?tipoManifestacao= */
  const TIPO_MANIFESTACAO_PADRAO = "DENUNCIA";

  /** @deprecated use TIPO_MANIFESTACAO_PADRAO */
  const TIPO_MANIFESTACAO = TIPO_MANIFESTACAO_PADRAO;

  const ROTULOS_TIPO_MANIFESTACAO = Object.freeze({
    DENUNCIA: "Denúncia",
    ELOGIO: "Elogio",
    RECLAMACAO: "Reclamação",
    SUGESTAO: "Sugestão",
  });

  window.PONTO_AGIL_CONFIG = Object.freeze({
    baseUrl,
    API_ENDPOINTS,
    ALLOWED_MIME_TYPES,
    ALLOWED_FILE_EXTENSIONS,
    TIPOS_MANIFESTACAO,
    TIPO_MANIFESTACAO_PADRAO,
    TIPO_MANIFESTACAO,
    ROTULOS_TIPO_MANIFESTACAO,
  });
})();
