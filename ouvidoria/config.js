(function () {
  const baseUrl =
    typeof window.PONTO_AGIL_API === "string" && window.PONTO_AGIL_API
      ? window.PONTO_AGIL_API.replace(/\/$/, "")
      : "https://pontoagil.playercontabilidade.com";

  const API_ENDPOINTS = {
    OUVIDORIA_ENVIAR: "/denuncia/public/enviar",
    OUVIDORIA_CATEGORIAS: "/denuncia/public/categorias",
    DEPARTAMENTO_POR_TOKEN_LISTAR: "/departamento/por-token/listar",
    OUVIDORIA_ACOMPANHAMENTO: (uuid) =>
      `/denuncia/public/acompanhamento/${encodeURIComponent(String(uuid ?? "").trim())}`,
    OUVIDORIA_ACOMPANHAMENTO_REPLICAR: (uuid) =>
      `/denuncia/public/acompanhamento/replicar/${encodeURIComponent(
        String(uuid ?? "").trim(),
      )}`,
    OUVIDORIA_ANEXO: (id) =>
      `/denuncia/public/anexo/${encodeURIComponent(String(id ?? "").trim())}`,
    OUVIDORIA_ACOMPANHAMENTO_ANEXO: (id) =>
      `/denuncia/public/acompanhamento/anexo/${encodeURIComponent(String(id ?? "").trim())}`,
  };

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

  const ALLOWED_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

  window.PONTO_AGIL_CONFIG = Object.freeze({
    baseUrl,
    API_ENDPOINTS,
    ALLOWED_MIME_TYPES,
    ALLOWED_FILE_EXTENSIONS,
  });
})();
