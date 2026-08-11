const {
  EMAIL_CODE_LENGTH,
  EMAIL_MAX_ATTEMPTS,
  EMAIL_EXPIRY_MS,
  STATUS_POLL_INTERVAL_MS,
} = window.PONTO_AGIL_CONTRATACAO_CONFIG;

const UtilitariosContratacao = window.ContratacaoUtils;
const EstadoContratacao = window.ContratacaoState;
const ApiContratacao = window.ContratacaoApi;
const StatusContratacao = window.ContratacaoStatus;

const ETAPAS = {
  PLANO: "plano",
  EMPRESA: "empresa",
  RESPONSAVEL: "responsavel",
  EMAIL: "email",
  CONTRATO: "contrato",
  PAGAMENTO: "pagamento",
  ACOMPANHAMENTO: "acompanhamento",
};

const MAPA_ETAPAS_INDICADOR = {
  [ETAPAS.EMPRESA]: "empresa",
  [ETAPAS.RESPONSAVEL]: "responsavel",
  [ETAPAS.EMAIL]: "responsavel",
  [ETAPAS.CONTRATO]: "contrato",
  [ETAPAS.PAGAMENTO]: "pagamento",
  [ETAPAS.ACOMPANHAMENTO]: "enviado",
};

const ORDEM_INDICADOR_ETAPAS = ["empresa", "responsavel", "contrato", "pagamento", "enviado"];

let etapaAtual = ETAPAS.PLANO;
let planosEmCache = [];
let identificadorTemporizadorEmail = null;
let identificadorConsultaStatus = null;
let contratoCarregado = false;
let zoomContrato = 100;
let zoomModalContrato = 100;
let htmlContratoEmCache = "";
let envioEmAndamento = false;
let checkoutAberto = false;

const elementos = {
  stepper: document.getElementById("stepper"),
  planosContainer: document.getElementById("planosContainer"),
  planoMessage: document.getElementById("planoMessage"),
  formEmpresa: document.getElementById("formEmpresa"),
  formResponsavel: document.getElementById("formResponsavel"),
  formEmail: document.getElementById("formEmail"),
  empresaMessage: document.getElementById("empresaMessage"),
  responsavelMessage: document.getElementById("responsavelMessage"),
  emailMessage: document.getElementById("emailMessage"),
  contratoMessage: document.getElementById("contratoMessage"),
  emailDestino: document.getElementById("emailDestino"),
  emailTimer: document.getElementById("emailTimer"),
  emailAttemptsLeft: document.getElementById("emailAttemptsLeft"),
  contractContent: document.getElementById("contractContent"),
  contractViewer: document.getElementById("contractViewer"),
  contractZoomLabel: document.getElementById("contractZoomLabel"),
  btnContractZoomIn: document.getElementById("btnContractZoomIn"),
  btnContractZoomOut: document.getElementById("btnContractZoomOut"),
  btnContractDownload: document.getElementById("btnContractDownload"),
  btnContractFullscreen: document.getElementById("btnContractFullscreen"),
  contractModal: document.getElementById("contractModal"),
  contractContentModal: document.getElementById("contractContentModal"),
  modalZoomLabel: document.getElementById("modalZoomLabel"),
  btnModalZoomIn: document.getElementById("btnModalZoomIn"),
  btnModalZoomOut: document.getElementById("btnModalZoomOut"),
  btnModalDownload: document.getElementById("btnModalDownload"),
  btnCloseContractModal: document.getElementById("btnCloseContractModal"),
  hashDocumento: document.getElementById("hashDocumento"),
  aceiteContrato: document.getElementById("aceiteContrato"),
  btnAceitarContrato: document.getElementById("btnAceitarContrato"),
  btnAbrirCheckout: document.getElementById("btnAbrirCheckout"),
  btnAtualizarStatus: document.getElementById("btnAtualizarStatus"),
  pagamentoDescricao: document.getElementById("pagamentoDescricao"),
  pagamentoStatusChip: document.getElementById("pagamentoStatusChip"),
  statusTracker: document.getElementById("statusTracker"),
  acompanhamentoIcon: document.getElementById("acompanhamentoIcon"),
  acompanhamentoTitulo: document.getElementById("acompanhamentoTitulo"),
  acompanhamentoDescricao: document.getElementById("acompanhamentoDescricao"),
  acompanhamentoStatusChip: document.getElementById("acompanhamentoStatusChip"),
  acompanhamentoId: document.getElementById("acompanhamentoId"),
  btnAtualizarAcompanhamento: document.getElementById("btnAtualizarAcompanhamento"),
  btnIrLogin: document.getElementById("btnIrLogin"),
  btnBaixarContrato: document.getElementById("btnBaixarContrato"),
  successPanel: document.getElementById("successPanel"),
  processingPanel: document.getElementById("processingPanel"),
  ctrSidebar: document.getElementById("ctrSidebar"),
  ctrFooterNote: document.getElementById("ctrFooterNote"),
  ctrIntro: document.getElementById("ctrIntro"),
  ctrShell: document.querySelector(".ctr-shell"),
  sidebarPlanoNome: document.getElementById("sidebarPlanoNome"),
  sidebarFaixa: document.getElementById("sidebarFaixa"),
  sidebarPreco: document.getElementById("sidebarPreco"),
  sidebarRecommended: document.getElementById("sidebarRecommended"),
  conflictPanel: document.getElementById("conflictPanel"),
  conflictMessage: document.getElementById("conflictMessage"),
  conflictEmail: document.getElementById("conflictEmail"),
  btnContinuarContratacao: document.getElementById("btnContinuarContratacao"),
  btnReenviarCodigoConflict: document.getElementById("btnReenviarCodigoConflict"),
  btnCancelarContratacao: document.getElementById("btnCancelarContratacao"),
  responsavelActions: document.getElementById("responsavelActions"),
  btnReenviarCodigoEmail: document.getElementById("btnReenviarCodigoEmail"),
  btnCancelarRecomecar: document.getElementById("btnCancelarRecomecar"),
  btnRecomecarLocal: document.getElementById("btnRecomecarLocal"),
};

function $(id) {
  return document.getElementById(id);
}

function showStep(step) {
  if (etapaAtual === ETAPAS.CONTRATO && step !== ETAPAS.CONTRATO) {
    closeContractModal();
  }

  etapaAtual = step;
  document.querySelectorAll(".ctr-step").forEach((section) => {
    section.hidden = section.id !== `step-${step}`;
  });

  const hideStepper = step === ETAPAS.PLANO;
  elementos.stepper.classList.toggle("is-hidden", hideStepper);
  updateStepper(step);
  updateLayoutForStep(step);

  if (step === ETAPAS.EMAIL) updateEmailActionButtons();

  if (step === ETAPAS.PAGAMENTO || step === ETAPAS.ACOMPANHAMENTO) {
    startStatusPolling();
  } else {
    stopStatusPolling();
  }
}

function updateLayoutForStep(step) {
  const showSidebar =
    step !== ETAPAS.PLANO &&
    step !== ETAPAS.ACOMPANHAMENTO &&
    EstadoContratacao.hasPlanoSelecionado();
  if (elementos.ctrSidebar) elementos.ctrSidebar.hidden = !showSidebar;
  if (elementos.ctrIntro) elementos.ctrIntro.hidden = step !== ETAPAS.PLANO;
  if (elementos.ctrFooterNote) {
    elementos.ctrFooterNote.hidden = step === ETAPAS.ACOMPANHAMENTO;
  }
  if (elementos.ctrShell) {
    elementos.ctrShell.classList.toggle("ctr-shell--single", !showSidebar);
  }
  if (showSidebar) renderSidebarSummary();
}

function updateStepper(step) {
  const activeKey = MAPA_ETAPAS_INDICADOR[step];
  const activeIndex = ORDEM_INDICADOR_ETAPAS.indexOf(activeKey);

  document.querySelectorAll("[data-stepper]").forEach((item) => {
    const chaveEtapa = item.getAttribute("data-stepper");
    const index = ORDEM_INDICADOR_ETAPAS.indexOf(chaveEtapa);
    item.classList.remove("is-active", "is-done");

    if (index < activeIndex) item.classList.add("is-done");
    else if (index === activeIndex) item.classList.add("is-active");
  });

  if (step === ETAPAS.EMAIL) {
    document.querySelector('[data-stepper="responsavel"]')?.classList.remove("is-done");
    document.querySelector('[data-stepper="responsavel"]')?.classList.add("is-active");
  }

  if (step === ETAPAS.ACOMPANHAMENTO) {
    const state = EstadoContratacao.load();
    const concluida =
      Boolean(state.concluida) || StatusContratacao.normalizeStatus(state.status) === StatusContratacao.STATUS.CONCLUIDA;
    document.querySelectorAll("[data-stepper]").forEach((item) => {
      item.classList.remove("is-active", "is-done");
      if (concluida) item.classList.add("is-done");
      else if (item.getAttribute("data-stepper") === "enviado") item.classList.add("is-active");
      else if (ORDEM_INDICADOR_ETAPAS.indexOf(item.getAttribute("data-stepper")) < 4) {
        item.classList.add("is-done");
      }
    });
  }
}

function renderSidebarSummary() {
  const state = EstadoContratacao.load();
  if (!EstadoContratacao.hasPlanoSelecionado()) return;

  if (elementos.sidebarPlanoNome) elementos.sidebarPlanoNome.textContent = state.planoNome || "—";
  if (elementos.sidebarFaixa) elementos.sidebarFaixa.textContent = state.faixaNome || "—";
  if (elementos.sidebarPreco) {
    elementos.sidebarPreco.textContent = `R$ ${UtilitariosContratacao.formatCurrencyBRL(state.planoPreco)}`;
  }

  const nome = String(state.planoNome || "").toLowerCase();
  const isRecommended =
    nome.includes("essencial") || nome.includes("profissional") || nome.includes("recomend");
  if (elementos.sidebarRecommended) elementos.sidebarRecommended.hidden = !isRecommended;
}

function applyStatusPayload(payload) {
  const status = StatusContratacao.normalizeStatus(payload?.status);
  const checkoutUrl = payload?.checkoutUrl ?? payload?.checkout_url ?? null;
  return EstadoContratacao.save({
    status,
    concluida: Boolean(payload?.concluida),
    checkoutUrl: checkoutUrl || EstadoContratacao.load().checkoutUrl,
  });
}

function renderStatusTracker(status, concluida) {
  const steps = StatusContratacao.getTrackerProgress(status, concluida);
  elementos.statusTracker.innerHTML = steps
    .map((step) => {
      const icon =
        step.state === "done"
          ? '<i class="fa-solid fa-check" aria-hidden="true"></i>'
          : step.state === "active"
            ? '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-circle" aria-hidden="true"></i>';
      return `
        <div class="status-tracker__item is-${step.state}">
          <span class="status-tracker__dot">${icon}</span>
          <span>${step.label}</span>
        </div>
      `;
    })
    .join("");
}

function renderPagamentoStep(state) {
  const status = StatusContratacao.normalizeStatus(state.status);
  elementos.pagamentoStatusChip.hidden = false;
  elementos.pagamentoStatusChip.textContent = StatusContratacao.getLabel(status);
  elementos.pagamentoStatusChip.className = "status-chip";

  const hasCheckout = Boolean(state.checkoutUrl);
  elementos.btnAbrirCheckout.hidden = !hasCheckout;
  elementos.btnAtualizarStatus.hidden = false;

  if (hasCheckout) {
    elementos.btnAbrirCheckout.textContent = checkoutAberto ? "Abrir pagamento novamente" : "Ir para pagamento";
    elementos.btnAbrirCheckout.onclick = () => openCheckout(state.checkoutUrl);
  }

  elementos.pagamentoDescricao.textContent = hasCheckout
    ? "Conclua o pagamento no ambiente seguro do Asaas. Assim que for confirmado, seguiremos com a ativação da sua empresa."
    : "Aguardando geração do link de pagamento. Atualize o status em instantes.";
}

function renderAcompanhamentoStep(state) {
  const status = StatusContratacao.normalizeStatus(state.status);
  const concluida = Boolean(state.concluida) || status === StatusContratacao.STATUS.CONCLUIDA;

  if (concluida) {
    if (elementos.successPanel) elementos.successPanel.hidden = false;
    if (elementos.processingPanel) elementos.processingPanel.hidden = true;
    if (elementos.btnIrLogin) elementos.btnIrLogin.hidden = false;
    stopStatusPolling();
    return;
  }

  if (elementos.successPanel) elementos.successPanel.hidden = true;
  if (elementos.processingPanel) elementos.processingPanel.hidden = false;

  renderStatusTracker(status, concluida);

  elementos.acompanhamentoStatusChip.textContent = StatusContratacao.getLabel(status);
  elementos.acompanhamentoStatusChip.className = "status-chip";

  if (state.contratacaoId) {
    elementos.acompanhamentoId.hidden = false;
    elementos.acompanhamentoId.textContent = `Contratação: ${state.contratacaoId}`;
  }

  elementos.acompanhamentoIcon.className = "payment-wait__icon";
  elementos.acompanhamentoIcon.innerHTML = '<i class="fa-solid fa-hourglass-half" aria-hidden="true"></i>';
  elementos.btnIrLogin.hidden = true;
  elementos.btnAtualizarAcompanhamento.hidden = false;

  if (status === StatusContratacao.STATUS.PAGAMENTO_CONFIRMADO) {
    elementos.acompanhamentoTitulo.textContent = "Pagamento confirmado";
    elementos.acompanhamentoDescricao.textContent =
      "Estamos criando sua empresa e enviando o acesso. Isso pode levar alguns instantes.";
  } else {
    elementos.acompanhamentoTitulo.textContent = "Processando contratação";
    elementos.acompanhamentoDescricao.textContent =
      "Estamos finalizando sua contratação. Você receberá as credenciais por e-mail assim que tudo estiver pronto.";
  }
}

function openCheckout(checkoutUrl) {
  if (!checkoutUrl) return;
  checkoutAberto = true;
  window.open(checkoutUrl, "_blank", "noopener,noreferrer");
}

async function syncWithServer() {
  const state = EstadoContratacao.load();
  if (!state.contratacaoId) return null;

  const payload = await ApiContratacao.getStatus(state.contratacaoId);
  return applyStatusPayload(payload);
}

async function navigateByStatus(preferredStep) {
  const state = EstadoContratacao.load();
  const status = StatusContratacao.normalizeStatus(state.status);
  const concluida = Boolean(state.concluida);

  if (StatusContratacao.isExpired(status)) {
    handleExpiredContratacao(
      status === StatusContratacao.STATUS.CANCELADA
        ? "Esta contratação foi cancelada. Inicie uma nova contratação."
        : "Esta contratação expirou. Inicie uma nova contratação.",
    );
    return;
  }

  if (concluida || status === StatusContratacao.STATUS.CONCLUIDA) {
    renderAcompanhamentoStep(state);
    showStep(ETAPAS.ACOMPANHAMENTO);
    return;
  }

  const step = preferredStep || StatusContratacao.resolveStep(status, concluida);
  if (!step) return;

  switch (step) {
    case "email":
      elementos.emailDestino.textContent =
        state.responsavel.responsavelEmail ||
        state.responsavelEmailMascarado ||
        state.empresa.emailCorporativo;
      if (StatusContratacao.canValidateEmail(status)) {
        if (!state.podeReenviarCodigo && !state.podeCancelar) {
          EstadoContratacao.save({ podeReenviarCodigo: true, podeCancelar: true });
        }
        startEmailTimer();
      }
      showStep(ETAPAS.EMAIL);
      break;

    case "contrato":
      if (!StatusContratacao.canViewContract(status)) {
        showStep(ETAPAS.EMAIL);
        break;
      }
      showStep(ETAPAS.CONTRATO);
      await loadContract();
      break;

    case "pagamento":
      renderPagamentoStep(state);
      showStep(ETAPAS.PAGAMENTO);
      if (state.checkoutUrl && !checkoutAberto) {
        openCheckout(state.checkoutUrl);
      }
      break;

    case "acompanhamento":
      renderAcompanhamentoStep(state);
      showStep(ETAPAS.ACOMPANHAMENTO);
      break;

    default:
      break;
  }
}

function startStatusPolling() {
  stopStatusPolling();
  const state = EstadoContratacao.load();
  if (!state.contratacaoId) return;
  if (!StatusContratacao.shouldPollStatus(state.status, state.concluida)) return;

  identificadorConsultaStatus = setInterval(async () => {
    try {
      const updated = await syncWithServer();
      if (!updated) return;

      const status = StatusContratacao.normalizeStatus(updated.status);
      if (StatusContratacao.isExpired(status)) {
        handleExpiredContratacao();
        return;
      }

      if (updated.concluida || status === StatusContratacao.STATUS.CONCLUIDA) {
        renderAcompanhamentoStep(updated);
        showStep(ETAPAS.ACOMPANHAMENTO);
        return;
      }

      if (status === StatusContratacao.STATUS.PAGAMENTO_CONFIRMADO && etapaAtual === ETAPAS.PAGAMENTO) {
        renderAcompanhamentoStep(updated);
        showStep(ETAPAS.ACOMPANHAMENTO);
        return;
      }

      if (etapaAtual === ETAPAS.PAGAMENTO) {
        renderPagamentoStep(updated);
      } else if (etapaAtual === ETAPAS.ACOMPANHAMENTO) {
        renderAcompanhamentoStep(updated);
      }
    } catch {
      /* mantém último estado conhecido */
    }
  }, STATUS_POLL_INTERVAL_MS);
}

function stopStatusPolling() {
  if (identificadorConsultaStatus) {
    clearInterval(identificadorConsultaStatus);
    identificadorConsultaStatus = null;
  }
}
