(function () {
  /** Status retornados pela API pública de contratação. */
  const STATUS = Object.freeze({
    AGUARDANDO_VALIDACAO_EMAIL: "AGUARDANDO_VALIDACAO_EMAIL",
    AGUARDANDO_ASSINATURA: "AGUARDANDO_ASSINATURA",
    CONTRATO_ASSINADO: "CONTRATO_ASSINADO",
    AGUARDANDO_PAGAMENTO: "AGUARDANDO_PAGAMENTO",
    PAGAMENTO_CONFIRMADO: "PAGAMENTO_CONFIRMADO",
    CONCLUIDA: "CONCLUIDA",
    CANCELADA: "CANCELADA",
    EXPIRADA: "EXPIRADA",
    // legado — compatibilidade com sessões antigas
    EMAIL_VALIDADO: "EMAIL_VALIDADO",
    CONTRATO_ACEITO: "CONTRATO_ACEITO",
    EMPRESA_ATIVADA: "EMPRESA_ATIVADA",
  });

  const LABELS = {
    [STATUS.AGUARDANDO_VALIDACAO_EMAIL]: "Aguardando validação de e-mail",
    [STATUS.AGUARDANDO_ASSINATURA]: "Aguardando assinatura do contrato",
    [STATUS.CONTRATO_ASSINADO]: "Contrato assinado",
    [STATUS.AGUARDANDO_PAGAMENTO]: "Aguardando pagamento",
    [STATUS.PAGAMENTO_CONFIRMADO]: "Pagamento confirmado",
    [STATUS.CONCLUIDA]: "Contratação concluída",
    [STATUS.CANCELADA]: "Contratação cancelada",
    [STATUS.EXPIRADA]: "Contratação expirada",
    [STATUS.EMAIL_VALIDADO]: "E-mail validado",
    [STATUS.CONTRATO_ACEITO]: "Contrato aceito",
    [STATUS.EMPRESA_ATIVADA]: "Empresa ativada",
  };

  function normalizeStatus(status) {
    const value = String(status ?? "").trim();
    if (value === STATUS.EMAIL_VALIDADO) return STATUS.AGUARDANDO_ASSINATURA;
    if (value === STATUS.CONTRATO_ACEITO) return STATUS.CONTRATO_ASSINADO;
    if (value === STATUS.EMPRESA_ATIVADA) return STATUS.CONCLUIDA;
    return value;
  }

  function getLabel(status) {
    return LABELS[normalizeStatus(status)] || "Em andamento";
  }

  function isTerminal(status) {
    const s = normalizeStatus(status);
    return s === STATUS.CONCLUIDA || s === STATUS.CANCELADA || s === STATUS.EXPIRADA;
  }

  function isExpired(status) {
    const s = normalizeStatus(status);
    return s === STATUS.CANCELADA || s === STATUS.EXPIRADA;
  }

  function canValidateEmail(status) {
    return normalizeStatus(status) === STATUS.AGUARDANDO_VALIDACAO_EMAIL;
  }

  function canViewContract(status) {
    const s = normalizeStatus(status);
    return [
      STATUS.AGUARDANDO_ASSINATURA,
      STATUS.CONTRATO_ASSINADO,
      STATUS.AGUARDANDO_PAGAMENTO,
      STATUS.PAGAMENTO_CONFIRMADO,
      STATUS.CONCLUIDA,
    ].includes(s);
  }

  function canAcceptContract(status) {
    const s = normalizeStatus(status);
    return s === STATUS.AGUARDANDO_ASSINATURA || s === STATUS.CONTRATO_ASSINADO;
  }

  function canOpenCheckout(status) {
    return normalizeStatus(status) === STATUS.AGUARDANDO_PAGAMENTO;
  }

  function shouldPollStatus(status, concluida) {
    if (concluida) return false;
    const s = normalizeStatus(status);
    return s === STATUS.AGUARDANDO_PAGAMENTO || s === STATUS.PAGAMENTO_CONFIRMADO;
  }

  function resolveStep(status, concluida) {
    if (concluida || normalizeStatus(status) === STATUS.CONCLUIDA) return "acompanhamento";
    const s = normalizeStatus(status);

    switch (s) {
      case STATUS.AGUARDANDO_VALIDACAO_EMAIL:
        return "email";
      case STATUS.AGUARDANDO_ASSINATURA:
        return "contrato";
      case STATUS.CONTRATO_ASSINADO:
        return "plano-resumo";
      case STATUS.AGUARDANDO_PAGAMENTO:
        return "pagamento";
      case STATUS.PAGAMENTO_CONFIRMADO:
        return "acompanhamento";
      case STATUS.CANCELADA:
      case STATUS.EXPIRADA:
        return "plano";
      default:
        return null;
    }
  }

  const TRACKER_STEPS = [
    { key: "dados", label: "Dados informados" },
    { key: "email", label: "E-mail validado" },
    { key: "contrato", label: "Contrato assinado" },
    { key: "pagamento", label: "Pagamento confirmado" },
    { key: "concluida", label: "Acesso liberado" },
  ];

  function getTrackerProgress(status, concluida) {
    const s = normalizeStatus(status);
    if (concluida || s === STATUS.CONCLUIDA) {
      return TRACKER_STEPS.map((step) => ({ ...step, state: "done" }));
    }

    const order = ["dados", "email", "contrato", "pagamento", "concluida"];
    let activeIndex = 0;

    if (s === STATUS.AGUARDANDO_VALIDACAO_EMAIL) activeIndex = 1;
    else if (s === STATUS.AGUARDANDO_ASSINATURA) activeIndex = 2;
    else if (s === STATUS.CONTRATO_ASSINADO || s === STATUS.AGUARDANDO_PAGAMENTO) activeIndex = 3;
    else if (s === STATUS.PAGAMENTO_CONFIRMADO) activeIndex = 4;

    return TRACKER_STEPS.map((step, index) => ({
      ...step,
      state: index < activeIndex ? "done" : index === activeIndex ? "active" : "pending",
    }));
  }

  window.ContratacaoStatus = Object.freeze({
    STATUS,
    normalizeStatus,
    getLabel,
    isTerminal,
    isExpired,
    canValidateEmail,
    canViewContract,
    canAcceptContract,
    canOpenCheckout,
    shouldPollStatus,
    resolveStep,
    getTrackerProgress,
    TRACKER_STEPS,
  });
})();
