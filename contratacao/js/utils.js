(function () {
  const { EMAIL_CODE_LENGTH } = window.PONTO_AGIL_CONTRATACAO_CONFIG;

  function onlyDigits(value) {
    return String(value ?? "").replace(/\D/g, "");
  }

  function formatCurrencyBRL(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  async function parseApiError(response) {
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      if (typeof data.mensagem === "string" && data.mensagem) return data.mensagem;
      if (typeof data.message === "string" && data.message) return data.message;
    } catch (_) {
      /* texto não JSON */
    }
    return text || `Erro HTTP ${response.status}`;
  }

  function maskCnpj(value) {
    const d = onlyDigits(value).slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  function maskCpf(value) {
    const d = onlyDigits(value).slice(0, 11);
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  function maskCep(value) {
    const d = onlyDigits(value).slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  function maskPhone(value) {
    const d = onlyDigits(value).slice(0, 11);
    if (d.length <= 10) {
      return d
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function bindMask(input, maskFn) {
    if (!input) return;
    input.addEventListener("input", () => {
      const pos = input.selectionStart;
      const before = input.value;
      input.value = maskFn(before);
      const diff = input.value.length - before.length;
      input.setSelectionRange(pos + diff, pos + diff);
    });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
  }

  function isValidCnpj(value) {
    return onlyDigits(value).length === 14;
  }

  function isValidCpf(value) {
    return onlyDigits(value).length === 11;
  }

  function isValidCep(value) {
    return onlyDigits(value).length === 8;
  }

  function isValidPhone(value) {
    const len = onlyDigits(value).length;
    return len >= 10 && len <= 11;
  }

  function isValidEmailCode(value) {
    return new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`).test(String(value ?? "").trim());
  }

  function formatCountdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function getPlanWeight(name) {
    const normalized = String(name || "").toLowerCase();
    if (normalized.includes("essencial")) return 1;
    if (normalized.includes("profissional")) return 2;
    if (normalized.includes("completo")) return 3;
    return 99;
  }

  function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = `form-message${type ? ` form-message--${type}` : ""}`;
    el.hidden = !text;
  }

  window.ContratacaoUtils = Object.freeze({
    onlyDigits,
    formatCurrencyBRL,
    parseApiError,
    maskCnpj,
    maskCpf,
    maskCep,
    maskPhone,
    bindMask,
    isValidEmail,
    isValidCnpj,
    isValidCpf,
    isValidCep,
    isValidPhone,
    isValidEmailCode,
    formatCountdown,
    getPlanWeight,
    showMessage,
  });
})();
