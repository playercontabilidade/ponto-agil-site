(function () {
  const baseUrl = window.PONTO_AGIL_CONFIG.api.replace(/\/$/, "");

  const API_ENDPOINTS = {
    PLANOS_PUBLICO: "/plano/publico",
    CRIAR_CONTRATACAO: "/public/contratacoes",
    VALIDAR_EMAIL: (id) =>
      `/public/contratacoes/${encodeURIComponent(String(id ?? "").trim())}/validar-email`,
    CONTRATO: (id) =>
      `/public/contratacoes/${encodeURIComponent(String(id ?? "").trim())}/contrato`,
    ACEITE_CONTRATO: (id) =>
      `/public/contratacoes/${encodeURIComponent(String(id ?? "").trim())}/aceite-contrato`,
    STATUS: (id) =>
      `/public/contratacoes/${encodeURIComponent(String(id ?? "").trim())}/status`,
    REENVIAR_CODIGO: (id) =>
      `/public/contratacoes/${encodeURIComponent(String(id ?? "").trim())}/reenviar-codigo`,
    CANCELAR: (id) =>
      `/public/contratacoes/${encodeURIComponent(String(id ?? "").trim())}/cancelar`,
  };

  const STATUS_POLL_INTERVAL_MS = 10_000;

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
    STATUS_POLL_INTERVAL_MS,
  });
})();
