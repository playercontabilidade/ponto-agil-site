(function () {
  const baseUrl =
    typeof window.PONTO_AGIL_API === "string" && window.PONTO_AGIL_API
      ? window.PONTO_AGIL_API.replace(/\/$/, "")
      : "http://localhost:8080";

  const API_ENDPOINTS = {
    PLANOS_PUBLICO: "/plano/publico",
    CRIAR_CONTRATACAO: "/public/contratacoes",
    VALIDAR_EMAIL: (id) =>
      `/public/contratacoes/${encodeURIComponent(String(id ?? "").trim())}/validar-email`,
    CONTRATO: (id) =>
      `/public/contratacoes/${encodeURIComponent(String(id ?? "").trim())}/contrato`,
    ACEITE_CONTRATO: (id) =>
      `/public/contratacoes/${encodeURIComponent(String(id ?? "").trim())}/aceite-contrato`,
  };

  const STORAGE_KEY = "ponto_agil_contratacao";

  const EMAIL_CODE_LENGTH = 6;
  const EMAIL_MAX_ATTEMPTS = 5;
  const EMAIL_EXPIRY_MS = 10 * 60 * 1000;

  window.PONTO_AGIL_CONTRATACAO_CONFIG = Object.freeze({
    baseUrl,
    API_ENDPOINTS,
    STORAGE_KEY,
    EMAIL_CODE_LENGTH,
    EMAIL_MAX_ATTEMPTS,
    EMAIL_EXPIRY_MS,
  });
})();
