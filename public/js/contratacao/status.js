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
    const statusNormalizado = normalizeStatus(status);
    return statusNormalizado === STATUS.CONCLUIDA || statusNormalizado === STATUS.CANCELADA || statusNormalizado === STATUS.EXPIRADA;
  }

  function isExpired(status) {
    const statusNormalizado = normalizeStatus(status);
    return statusNormalizado === STATUS.CANCELADA || statusNormalizado === STATUS.EXPIRADA;
  }

  function canValidateEmail(status) {
    return normalizeStatus(status) === STATUS.AGUARDANDO_VALIDACAO_EMAIL;
  }

  function canViewContract(status) {
    const statusNormalizado = normalizeStatus(status);
    return [
      STATUS.AGUARDANDO_ASSINATURA,
      STATUS.CONTRATO_ASSINADO,
      STATUS.AGUARDANDO_PAGAMENTO,
      STATUS.PAGAMENTO_CONFIRMADO,
      STATUS.CONCLUIDA,
    ].includes(statusNormalizado);
  }

  function canAcceptContract(status) {
    const statusNormalizado = normalizeStatus(status);
    return statusNormalizado === STATUS.AGUARDANDO_ASSINATURA || statusNormalizado === STATUS.CONTRATO_ASSINADO;
  }

  function canOpenCheckout(status) {
    return normalizeStatus(status) === STATUS.AGUARDANDO_PAGAMENTO;
  }

  function shouldPollStatus(status, concluida) {
    if (concluida) return false;
    const statusNormalizado = normalizeStatus(status);
    return statusNormalizado === STATUS.AGUARDANDO_PAGAMENTO || statusNormalizado === STATUS.PAGAMENTO_CONFIRMADO;
  }

  function resolveStep(status, concluida) {
    if (concluida || normalizeStatus(status) === STATUS.CONCLUIDA) return "acompanhamento";
    const statusNormalizado = normalizeStatus(status);

    switch (statusNormalizado) {
      case STATUS.AGUARDANDO_VALIDACAO_EMAIL:
        return "email";
      case STATUS.AGUARDANDO_ASSINATURA:
        return "contrato";
      case STATUS.CONTRATO_ASSINADO:
        return "pagamento";
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
    const statusNormalizado = normalizeStatus(status);
    if (concluida || statusNormalizado === STATUS.CONCLUIDA) {
      return TRACKER_STEPS.map((step) => ({ ...step, state: "done" }));
    }

    let indiceEtapaAtiva = 0;

    if (statusNormalizado === STATUS.AGUARDANDO_VALIDACAO_EMAIL) indiceEtapaAtiva = 1;
    else if (statusNormalizado === STATUS.AGUARDANDO_ASSINATURA) indiceEtapaAtiva = 2;
    else if (
      statusNormalizado === STATUS.CONTRATO_ASSINADO ||
      statusNormalizado === STATUS.AGUARDANDO_PAGAMENTO
    ) indiceEtapaAtiva = 3;
    else if (statusNormalizado === STATUS.PAGAMENTO_CONFIRMADO) indiceEtapaAtiva = 4;

    return TRACKER_STEPS.map((step, index) => ({
      ...step,
      state:
        index < indiceEtapaAtiva
          ? "done"
          : index === indiceEtapaAtiva
            ? "active"
            : "pending",
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
