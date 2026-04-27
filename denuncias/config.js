(function () {
  const baseUrl =
    typeof window.PONTO_AGIL_API === "string" && window.PONTO_AGIL_API
      ? window.PONTO_AGIL_API.replace(/\/$/, "")
      : "http://localhost:8080";

  const API_ENDPOINTS = {
    DENUNCIA_ENVIAR: "/denuncia/public/enviar",
    DENUNCIA_CATEGORIAS: "/denuncia/public/categorias",
    DEPARTAMENTO_POR_TOKEN_LISTAR: "/departamento/por-token/listar",
    DENUNCIA_ACOMPANHAMENTO: (uuid) =>
      `/denuncia/public/acompanhamento/${encodeURIComponent(String(uuid ?? "").trim())}`,
    DENUNCIA_ACOMPANHAMENTO_REPLICAR: (uuid) =>
      `/denuncia/public/acompanhamento/replicar/${encodeURIComponent(
        String(uuid ?? "").trim(),
      )}`,
    DENUNCIA_ANEXO: (id) =>
      `/denuncia/public/anexo/${encodeURIComponent(String(id ?? "").trim())}`,
    DENUNCIA_ACOMPANHAMENTO_ANEXO: (id) =>
      `/denuncia/public/acompanhamento/anexo/${encodeURIComponent(String(id ?? "").trim())}`,
  };

  const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'application/pdf',
  ];

  const ALLOWED_FILE_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.pdf',
  ];

  window.PONTO_AGIL_CONFIG = Object.freeze({
    baseUrl,
    API_ENDPOINTS,
    ALLOWED_MIME_TYPES,
    ALLOWED_FILE_EXTENSIONS,
  });
})();
