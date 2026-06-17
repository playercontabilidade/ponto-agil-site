(function () {
  const {
    EMAIL_CODE_LENGTH,
    EMAIL_MAX_ATTEMPTS,
    EMAIL_EXPIRY_MS,
    STATUS_POLL_INTERVAL_MS,
  } = window.PONTO_AGIL_CONTRATACAO_CONFIG;

  const U = window.ContratacaoUtils;
  const State = window.ContratacaoState;
  const Api = window.ContratacaoApi;
  const S = window.ContratacaoStatus;

  const STEPS = {
    PLANO: "plano",
    EMPRESA: "empresa",
    RESPONSAVEL: "responsavel",
    EMAIL: "email",
    CONTRATO: "contrato",
    PLANO_RESUMO: "plano-resumo",
    PAGAMENTO: "pagamento",
    ACOMPANHAMENTO: "acompanhamento",
  };

  const STEPPER_MAP = {
    [STEPS.EMPRESA]: "empresa",
    [STEPS.RESPONSAVEL]: "responsavel",
    [STEPS.EMAIL]: "responsavel",
    [STEPS.CONTRATO]: "contrato",
    [STEPS.PLANO_RESUMO]: "plano-resumo",
    [STEPS.PAGAMENTO]: "plano-resumo",
    [STEPS.ACOMPANHAMENTO]: "plano-resumo",
  };

  let currentStep = STEPS.PLANO;
  let planosCache = [];
  let emailTimerId = null;
  let statusPollId = null;
  let contractLoaded = false;
  let isSubmitting = false;
  let checkoutOpened = false;

  const els = {
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
    planoResumoMessage: document.getElementById("planoResumoMessage"),
    emailDestino: document.getElementById("emailDestino"),
    emailTimer: document.getElementById("emailTimer"),
    emailAttemptsLeft: document.getElementById("emailAttemptsLeft"),
    contractContent: document.getElementById("contractContent"),
    hashDocumento: document.getElementById("hashDocumento"),
    aceiteContrato: document.getElementById("aceiteContrato"),
    btnAceitarContrato: document.getElementById("btnAceitarContrato"),
    btnFinalizarContratacao: document.getElementById("btnFinalizarContratacao"),
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
    planSummaryName: document.getElementById("planSummaryName"),
    planSummaryFaixa: document.getElementById("planSummaryFaixa"),
    planSummaryPrice: document.getElementById("planSummaryPrice"),
    planSummaryFeatures: document.getElementById("planSummaryFeatures"),
    planRecommendedBadge: document.getElementById("planRecommendedBadge"),
    flowList: document.getElementById("flowList"),
  };

  function $(id) {
    return document.getElementById(id);
  }

  function showStep(step) {
    currentStep = step;
    document.querySelectorAll(".ctr-step").forEach((section) => {
      section.hidden = section.id !== `step-${step}`;
    });

    const hideStepper = [STEPS.PLANO, STEPS.PAGAMENTO, STEPS.ACOMPANHAMENTO].includes(step);
    els.stepper.classList.toggle("is-hidden", hideStepper);
    updateStepper(step);
    updateFlowSidebar(step);

    if (step === STEPS.EMAIL) updateEmailActionButtons();

    if (step === STEPS.PAGAMENTO || step === STEPS.ACOMPANHAMENTO) {
      startStatusPolling();
    } else {
      stopStatusPolling();
    }
  }

  function updateStepper(step) {
    const order = ["empresa", "responsavel", "contrato", "plano-resumo"];
    const activeKey = STEPPER_MAP[step];
    const activeIndex = order.indexOf(activeKey);

    document.querySelectorAll("[data-stepper]").forEach((item) => {
      const key = item.getAttribute("data-stepper");
      const index = order.indexOf(key);
      item.classList.remove("is-active", "is-done");

      if (index < activeIndex) item.classList.add("is-done");
      else if (index === activeIndex && step !== STEPS.EMAIL) item.classList.add("is-active");
      else if (step === STEPS.EMAIL && key === "responsavel") item.classList.add("is-active");
    });

    if (step === STEPS.EMAIL) {
      document.querySelector('[data-stepper="responsavel"]')?.classList.remove("is-done");
      document.querySelector('[data-stepper="responsavel"]')?.classList.add("is-active");
    }
  }

  function updateFlowSidebar(step) {
    const flowOrder = ["dados", "contrato", "pagamento", "ativacao", "acesso"];
    let activeFlow = "dados";

    if ([STEPS.EMPRESA, STEPS.RESPONSAVEL, STEPS.EMAIL].includes(step)) activeFlow = "dados";
    else if (step === STEPS.CONTRATO || step === STEPS.PLANO_RESUMO) activeFlow = "contrato";
    else if (step === STEPS.PAGAMENTO) activeFlow = "pagamento";
    else if (step === STEPS.ACOMPANHAMENTO) activeFlow = "ativacao";

    const activeIndex = flowOrder.indexOf(activeFlow);

    els.flowList.querySelectorAll("li").forEach((li) => {
      const key = li.getAttribute("data-flow");
      const index = flowOrder.indexOf(key);
      li.classList.remove("is-active", "is-done");
      if (index < activeIndex) li.classList.add("is-done");
      else if (index === activeIndex) li.classList.add("is-active");
    });

    if ([STEPS.RESPONSAVEL, STEPS.EMAIL].includes(step)) {
      els.flowList.querySelector('[data-flow="dados"]')?.classList.add("is-done");
    }
    if ([STEPS.PLANO_RESUMO, STEPS.PAGAMENTO].includes(step)) {
      els.flowList.querySelector('[data-flow="dados"]')?.classList.add("is-done");
      els.flowList.querySelector('[data-flow="contrato"]')?.classList.add("is-done");
    }
    if (step === STEPS.ACOMPANHAMENTO) {
      els.flowList.querySelectorAll("li").forEach((li) => li.classList.add("is-done"));
    }
  }

  function applyStatusPayload(payload) {
    const status = S.normalizeStatus(payload?.status);
    const checkoutUrl = payload?.checkoutUrl ?? payload?.checkout_url ?? null;
    return State.save({
      status,
      concluida: Boolean(payload?.concluida),
      checkoutUrl: checkoutUrl || State.load().checkoutUrl,
    });
  }

  function renderStatusTracker(status, concluida) {
    const steps = S.getTrackerProgress(status, concluida);
    els.statusTracker.innerHTML = steps
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
    const status = S.normalizeStatus(state.status);
    els.pagamentoStatusChip.hidden = false;
    els.pagamentoStatusChip.textContent = S.getLabel(status);
    els.pagamentoStatusChip.className = "status-chip";

    const hasCheckout = Boolean(state.checkoutUrl);
    els.btnAbrirCheckout.hidden = !hasCheckout;
    els.btnAtualizarStatus.hidden = false;

    if (hasCheckout) {
      els.btnAbrirCheckout.textContent = checkoutOpened ? "Abrir pagamento novamente" : "Ir para pagamento";
      els.btnAbrirCheckout.onclick = () => openCheckout(state.checkoutUrl);
    }

    els.pagamentoDescricao.textContent = hasCheckout
      ? "Conclua o pagamento no ambiente seguro do Asaas. Assim que for confirmado, seguiremos com a ativação da sua empresa."
      : "Aguardando geração do link de pagamento. Atualize o status em instantes.";
  }

  function renderAcompanhamentoStep(state) {
    const status = S.normalizeStatus(state.status);
    const concluida = Boolean(state.concluida) || status === S.STATUS.CONCLUIDA;

    renderStatusTracker(status, concluida);

    els.acompanhamentoStatusChip.textContent = S.getLabel(status);
    els.acompanhamentoStatusChip.className = concluida
      ? "status-chip status-chip--success"
      : "status-chip";

    if (state.contratacaoId) {
      els.acompanhamentoId.hidden = false;
      els.acompanhamentoId.textContent = `Contratação: ${state.contratacaoId}`;
    }

    if (concluida) {
      els.acompanhamentoIcon.className = "payment-wait__icon payment-wait__icon--success";
      els.acompanhamentoIcon.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i>';
      els.acompanhamentoTitulo.textContent = "Contratação concluída!";
      els.acompanhamentoDescricao.textContent =
        "Sua empresa foi ativada. Verifique seu e-mail para acessar as credenciais de login.";
      els.btnIrLogin.hidden = false;
      els.btnAtualizarAcompanhamento.hidden = true;
      stopStatusPolling();
      return;
    }

    els.acompanhamentoIcon.className = "payment-wait__icon";
    els.acompanhamentoIcon.innerHTML = '<i class="fa-solid fa-hourglass-half" aria-hidden="true"></i>';
    els.btnIrLogin.hidden = true;
    els.btnAtualizarAcompanhamento.hidden = false;

    if (status === S.STATUS.PAGAMENTO_CONFIRMADO) {
      els.acompanhamentoTitulo.textContent = "Pagamento confirmado";
      els.acompanhamentoDescricao.textContent =
        "Estamos criando sua empresa e enviando o acesso. Isso pode levar alguns instantes.";
    } else {
      els.acompanhamentoTitulo.textContent = "Processando contratação";
      els.acompanhamentoDescricao.textContent =
        "Estamos finalizando sua contratação. Você receberá as credenciais por e-mail assim que tudo estiver pronto.";
    }
  }

  function openCheckout(checkoutUrl) {
    if (!checkoutUrl) return;
    checkoutOpened = true;
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  }

  async function syncWithServer() {
    const state = State.load();
    if (!state.contratacaoId) return null;

    const payload = await Api.getStatus(state.contratacaoId);
    return applyStatusPayload(payload);
  }

  async function navigateByStatus(preferredStep) {
    const state = State.load();
    const status = S.normalizeStatus(state.status);
    const concluida = Boolean(state.concluida);

    if (S.isExpired(status)) {
      handleExpiredContratacao(
        status === S.STATUS.CANCELADA
          ? "Esta contratação foi cancelada. Inicie uma nova contratação."
          : "Esta contratação expirou. Inicie uma nova contratação.",
      );
      return;
    }

    if (concluida || status === S.STATUS.CONCLUIDA) {
      renderAcompanhamentoStep(state);
      showStep(STEPS.ACOMPANHAMENTO);
      return;
    }

    const step = preferredStep || S.resolveStep(status, concluida);
    if (!step) return;

    switch (step) {
      case "email":
        els.emailDestino.textContent =
          state.responsavel.responsavelEmail ||
          state.responsavelEmailMascarado ||
          state.empresa.emailCorporativo;
        if (S.canValidateEmail(status)) {
          if (!state.podeReenviarCodigo && !state.podeCancelar) {
            State.save({ podeReenviarCodigo: true, podeCancelar: true });
          }
          startEmailTimer();
        }
        showStep(STEPS.EMAIL);
        break;

      case "contrato":
        if (!S.canViewContract(status)) {
          showStep(STEPS.EMAIL);
          break;
        }
        showStep(STEPS.CONTRATO);
        await loadContract();
        break;

      case "plano-resumo":
        if (!S.canAcceptContract(status) && status !== S.STATUS.CONTRATO_ASSINADO) {
          showStep(STEPS.CONTRATO);
          await loadContract();
          break;
        }
        renderPlanSummary();
        showStep(STEPS.PLANO_RESUMO);
        break;

      case "pagamento":
        renderPagamentoStep(state);
        showStep(STEPS.PAGAMENTO);
        if (state.checkoutUrl && !checkoutOpened) {
          openCheckout(state.checkoutUrl);
        }
        break;

      case "acompanhamento":
        renderAcompanhamentoStep(state);
        showStep(STEPS.ACOMPANHAMENTO);
        break;

      default:
        break;
    }
  }

  function startStatusPolling() {
    stopStatusPolling();
    const state = State.load();
    if (!state.contratacaoId) return;
    if (!S.shouldPollStatus(state.status, state.concluida)) return;

    statusPollId = setInterval(async () => {
      try {
        const updated = await syncWithServer();
        if (!updated) return;

        const status = S.normalizeStatus(updated.status);
        if (S.isExpired(status)) {
          handleExpiredContratacao();
          return;
        }

        if (updated.concluida || status === S.STATUS.CONCLUIDA) {
          renderAcompanhamentoStep(updated);
          showStep(STEPS.ACOMPANHAMENTO);
          return;
        }

        if (status === S.STATUS.PAGAMENTO_CONFIRMADO && currentStep === STEPS.PAGAMENTO) {
          renderAcompanhamentoStep(updated);
          showStep(STEPS.ACOMPANHAMENTO);
          return;
        }

        if (currentStep === STEPS.PAGAMENTO) {
          renderPagamentoStep(updated);
        } else if (currentStep === STEPS.ACOMPANHAMENTO) {
          renderAcompanhamentoStep(updated);
        }
      } catch (_) {
        /* mantém último estado conhecido */
      }
    }, STATUS_POLL_INTERVAL_MS);
  }

  function stopStatusPolling() {
    if (statusPollId) {
      clearInterval(statusPollId);
      statusPollId = null;
    }
  }

  function readEmpresaForm() {
    return {
      razaoSocial: $("razaoSocial").value.trim(),
      cnpj: $("cnpj").value.trim(),
      emailCorporativo: $("emailCorporativo").value.trim(),
      telefoneEmpresa: U.onlyDigits($("telefoneEmpresa").value),
      cep: $("cep").value.trim(),
    };
  }

  function readResponsavelForm() {
    return {
      responsavelNome: $("responsavelNome").value.trim(),
      responsavelCpf: $("responsavelCpf").value.trim(),
      responsavelEmail: $("responsavelEmail").value.trim(),
      responsavelTelefone: U.onlyDigits($("responsavelTelefone").value),
    };
  }

  function fillEmpresaForm(data) {
    $("razaoSocial").value = data.razaoSocial || "";
    $("cnpj").value = data.cnpj || "";
    $("emailCorporativo").value = data.emailCorporativo || "";
    $("telefoneEmpresa").value = data.telefoneEmpresa ? U.maskPhone(data.telefoneEmpresa) : "";
    $("cep").value = data.cep || "";
  }

  function fillResponsavelForm(data) {
    $("responsavelNome").value = data.responsavelNome || "";
    $("responsavelCpf").value = data.responsavelCpf || "";
    $("responsavelEmail").value = data.responsavelEmail || "";
    $("responsavelTelefone").value = data.responsavelTelefone
      ? U.maskPhone(data.responsavelTelefone)
      : "";
  }

  function validateEmpresa(data) {
    if (!data.razaoSocial) return "Informe a razão social.";
    if (!U.isValidCnpj(data.cnpj)) return "Informe um CNPJ válido.";
    if (!U.isValidEmail(data.emailCorporativo)) return "Informe um e-mail corporativo válido.";
    if (!U.isValidPhone(data.telefoneEmpresa)) return "Informe um telefone válido.";
    if (!U.isValidCep(data.cep)) return "Informe um CEP válido.";
    return null;
  }

  function validateResponsavel(data) {
    if (!data.responsavelNome) return "Informe o nome completo do responsável.";
    if (!U.isValidCpf(data.responsavelCpf)) return "Informe um CPF válido.";
    if (!U.isValidEmail(data.responsavelEmail)) return "Informe um e-mail válido.";
    if (!U.isValidPhone(data.responsavelTelefone)) return "Informe um telefone válido.";
    return null;
  }

  function hideConflictPanel() {
    if (!els.conflictPanel) return;
    els.conflictPanel.hidden = true;
    if (els.responsavelActions) els.responsavelActions.hidden = false;
  }

  function showConflictPanel(body, mensagem) {
    if (!els.conflictPanel) return;

    const data = body || {};
    els.conflictPanel.hidden = false;
    if (els.responsavelActions) els.responsavelActions.hidden = true;

    els.conflictMessage.textContent =
      mensagem || data.mensagem || "Já existe uma contratação em andamento para este CNPJ.";

    if (data.responsavelEmail) {
      els.conflictEmail.hidden = false;
      els.conflictEmail.textContent = `Código enviado para ${data.responsavelEmail}`;
    } else {
      els.conflictEmail.hidden = true;
    }

    const podeContinuar = data.podeContinuar !== false;
    els.btnContinuarContratacao.hidden = !podeContinuar;
    els.btnReenviarCodigoConflict.hidden = !data.podeReenviarCodigo;
    els.btnCancelarContratacao.hidden = !data.podeCancelar;
  }

  function handleConflict409(err) {
    const body = err.body || {};
    State.applyConflictPayload(body);

    if (body.responsavelEmail) {
      els.emailDestino.textContent = body.responsavelEmail;
    }

    showConflictPanel(body, err.message);
    U.showMessage(els.responsavelMessage, "", "");
  }

  function updateEmailActionButtons() {
    const state = State.load();
    const podeReenviar =
      Boolean(state.podeReenviarCodigo) && S.canValidateEmail(S.normalizeStatus(state.status));
    els.btnReenviarCodigoEmail.hidden = !podeReenviar;
    els.btnCancelarRecomecar.hidden = !state.podeCancelar;
    els.btnRecomecarLocal.hidden = Boolean(state.contratacaoId);
  }

  function resetParaNovaContratacao() {
    stopStatusPolling();
    stopEmailTimer();
    hideConflictPanel();
    State.clearContratacao();
    contractLoaded = false;
    checkoutOpened = false;
    els.aceiteContrato.checked = false;
    $("codigoEmail").value = "";
  }

  async function continuarContratacao(messageEl) {
    hideConflictPanel();
    const state = State.load();
    if (!state.contratacaoId) return;

    if (messageEl) U.showMessage(messageEl, "", "");

    try {
      await syncWithServer();
      await navigateByStatus();
    } catch (err) {
      U.showMessage(
        messageEl || els.responsavelMessage,
        err instanceof Error ? err.message : "Não foi possível continuar a contratação.",
        "error",
      );
    }
  }

  async function reenviarCodigo(messageEl) {
    const state = State.load();
    if (!state.contratacaoId || isSubmitting) return;

    isSubmitting = true;
    if (messageEl) U.showMessage(messageEl, "", "");

    try {
      await Api.reenviarCodigo(state.contratacaoId);
      State.save({
        contratacaoCreatedAt: Date.now(),
        emailAttempts: 0,
        podeReenviarCodigo: true,
      });
      U.showMessage(messageEl || els.emailMessage, "Novo código enviado por e-mail.", "success");
      $("codigoEmail").value = "";

      const updated = State.load();
      els.emailDestino.textContent =
        updated.responsavel.responsavelEmail || updated.responsavelEmailMascarado || els.emailDestino.textContent;

      if (currentStep !== STEPS.EMAIL) showStep(STEPS.EMAIL);
      startEmailTimer();
      updateEmailActionButtons();
    } catch (err) {
      U.showMessage(
        messageEl || els.emailMessage,
        err instanceof Error ? err.message : "Não foi possível reenviar o código.",
        "error",
      );
    } finally {
      isSubmitting = false;
    }
  }

  async function cancelarERecomecar(messageEl) {
    const state = State.load();

    if (!state.contratacaoId) {
      resetParaNovaContratacao();
      showStep(State.hasPlanoSelecionado() ? STEPS.EMPRESA : STEPS.PLANO);
      if (!State.hasPlanoSelecionado()) renderPlanos();
      return;
    }

    if (!state.podeCancelar) {
      U.showMessage(
        messageEl || els.emailMessage,
        "Não é possível cancelar esta contratação pelo portal. Entre em contato com o suporte.",
        "error",
      );
      return;
    }

    if (isSubmitting) return;
    isSubmitting = true;
    if (messageEl) U.showMessage(messageEl, "", "");

    try {
      await Api.cancelarContratacao(state.contratacaoId);
      resetParaNovaContratacao();
      U.showMessage(
        messageEl || els.responsavelMessage,
        "Contratação cancelada. Você pode iniciar uma nova.",
        "success",
      );
      showStep(State.hasPlanoSelecionado() ? STEPS.EMPRESA : STEPS.PLANO);
      if (!State.hasPlanoSelecionado()) renderPlanos();
    } catch (err) {
      U.showMessage(
        messageEl || els.responsavelMessage,
        err instanceof Error ? err.message : "Não foi possível cancelar a contratação.",
        "error",
      );
    } finally {
      isSubmitting = false;
    }
  }

  function handleExpiredContratacao(message) {
    stopStatusPolling();
    stopEmailTimer();
    hideConflictPanel();
    State.clearContratacao();
    contractLoaded = false;
    checkoutOpened = false;
    els.aceiteContrato.checked = false;
    U.showMessage(
      els.emailMessage,
      message || "A contratação expirou. Selecione o plano novamente para recomeçar.",
      "error",
    );
    showStep(STEPS.PLANO);
    renderPlanos();
  }

  function getEmailRemainingMs(state) {
    const created = state.contratacaoCreatedAt || Date.now();
    return EMAIL_EXPIRY_MS - (Date.now() - created);
  }

  function updateEmailTimer() {
    const state = State.load();
    const remaining = getEmailRemainingMs(state);

    if (remaining <= 0) {
      stopEmailTimer();
      handleExpiredContratacao("O código expirou. Inicie uma nova contratação.");
      return;
    }

    els.emailTimer.textContent = U.formatCountdown(remaining);
    els.emailAttemptsLeft.textContent = String(
      Math.max(0, EMAIL_MAX_ATTEMPTS - (state.emailAttempts || 0)),
    );
  }

  function startEmailTimer() {
    clearInterval(emailTimerId);
    updateEmailTimer();
    emailTimerId = setInterval(updateEmailTimer, 1000);
  }

  function stopEmailTimer() {
    clearInterval(emailTimerId);
    emailTimerId = null;
  }

  async function loadPlanos() {
    planosCache = await Api.getPlanosPublicos();
    if (!Array.isArray(planosCache)) planosCache = [];
    planosCache.sort((a, b) => U.getPlanWeight(a.nome) - U.getPlanWeight(b.nome));
    return planosCache;
  }

  function findPlanoDetails(planoId, faixaId) {
    const pid = Number(planoId);
    const fid = Number(faixaId);
    const plano = planosCache.find((p) => Number(p.id) === pid);
    const faixa = plano?.faixas?.find((f) => Number(f.id) === fid);
    return { plano, faixa };
  }

  function applyPlanoFromParams(planoId, faixaId) {
    const { plano, faixa } = findPlanoDetails(planoId, faixaId);
    if (!plano || !faixa) return false;

    State.setPlano(Number(planoId), Number(faixaId), {
      planoNome: plano.nome || "",
      faixaNome: faixa.nome || "",
      planoPreco: faixa.preco || 0,
      planoFuncionalidades: Array.isArray(plano.funcionalidades)
        ? plano.funcionalidades.map((f) => f.nome).filter(Boolean)
        : [],
    });
    return true;
  }

  function renderPlanos() {
    if (!planosCache.length) {
      els.planosContainer.innerHTML =
        '<p class="ctr-step__hint">Nenhum plano disponível no momento.</p>';
      return;
    }

    els.planosContainer.innerHTML = planosCache
      .map((plano) => {
        const faixas = Array.isArray(plano.faixas) ? plano.faixas : [];
        const funcs = Array.isArray(plano.funcionalidades)
          ? plano.funcionalidades.map((f) => `<li>${f.nome || ""}</li>`).join("")
          : "";

        return `
          <article class="plano-picker">
            <h3>${plano.nome || ""}</h3>
            ${plano.descricao ? `<p class="ctr-step__hint">${plano.descricao}</p>` : ""}
            <div class="faixa-options">
              ${faixas
                .map(
                  (faixa) => `
                <button
                  type="button"
                  class="faixa-option"
                  data-plan-id="${plano.id}"
                  data-faixa-id="${faixa.id}"
                >
                  <span>${faixa.nome || ""}</span>
                  <span class="faixa-option__price">R$ ${U.formatCurrencyBRL(faixa.preco)}/mês</span>
                </button>
              `,
                )
                .join("")}
            </div>
            ${funcs ? `<ul class="plan-features">${funcs}</ul>` : ""}
          </article>
        `;
      })
      .join("");
  }

  function renderPlanSummary() {
    const state = State.load();
    els.planSummaryName.textContent = state.planoNome || "—";
    els.planSummaryFaixa.textContent = state.faixaNome || "—";
    els.planSummaryPrice.textContent = `R$ ${U.formatCurrencyBRL(state.planoPreco)}`;

    const isProfissional = String(state.planoNome || "")
      .toLowerCase()
      .includes("profissional");
    els.planRecommendedBadge.hidden = !isProfissional;

    const features = state.planoFuncionalidades?.length
      ? state.planoFuncionalidades
      : [
          "Ponto via app, web e biometria.",
          "Relatórios e dashboards automáticos.",
          "Integração com folha de pagamento.",
          "Suporte especializado 24h.",
        ];

    els.planSummaryFeatures.innerHTML = features
      .map((item) => `<li><i class="fa-solid fa-check" aria-hidden="true"></i> ${item}</li>`)
      .join("");
  }

  async function loadContract() {
    const state = State.load();
    if (!state.contratacaoId) return;

    if (!S.canViewContract(state.status)) {
      U.showMessage(
        els.contratoMessage,
        "Valide o e-mail antes de visualizar o contrato.",
        "error",
      );
      showStep(STEPS.EMAIL);
      return;
    }

    U.showMessage(els.contratoMessage, "", "");
    els.contractContent.innerHTML = '<p class="ctr-step__hint">Carregando contrato...</p>';
    contractLoaded = false;
    updateAceiteButton();

    try {
      const data = await Api.getContrato(state.contratacaoId);
      els.contractContent.innerHTML = data.conteudoHtml || "<p>Contrato indisponível.</p>";
      contractLoaded = Boolean(data.conteudoHtml);

      if (data.hashDocumento) {
        els.hashDocumento.hidden = false;
        els.hashDocumento.textContent = `Identificador do documento: ${data.hashDocumento}`;
        State.save({ hashDocumento: data.hashDocumento });
      }
    } catch (err) {
      els.contractContent.innerHTML = "";
      const msg = err instanceof Error ? err.message : "Não foi possível carregar o contrato.";
      if (/valid/i.test(msg) || /e-?mail/i.test(msg)) {
        showStep(STEPS.EMAIL);
      }
      U.showMessage(els.contratoMessage, msg, "error");
    }

    updateAceiteButton();
  }

  function updateAceiteButton() {
    const state = State.load();
    const checked = els.aceiteContrato.checked;
    const canProceed =
      contractLoaded &&
      checked &&
      !isSubmitting &&
      S.canAcceptContract(state.status);
    els.btnAceitarContrato.disabled = !canProceed;
  }

  function goToPayment(checkoutUrl) {
    const updated = State.save({
      checkoutUrl,
      status: S.STATUS.AGUARDANDO_PAGAMENTO,
    });
    renderPagamentoStep(updated);
    showStep(STEPS.PAGAMENTO);
    if (checkoutUrl) openCheckout(checkoutUrl);
  }

  async function resumeFromState() {
    const state = State.load();
    fillEmpresaForm(state.empresa);
    fillResponsavelForm(state.responsavel);

    if (state.contratacaoId) {
      try {
        await syncWithServer();
        await navigateByStatus();
        return true;
      } catch (err) {
        U.showMessage(
          els.planoMessage,
          err instanceof Error ? err.message : "Não foi possível recuperar a contratação.",
          "error",
        );
        if (State.hasPlanoSelecionado()) {
          showStep(STEPS.EMPRESA);
          return true;
        }
        return false;
      }
    }

    if (State.hasPlanoSelecionado()) {
      showStep(STEPS.EMPRESA);
      return true;
    }

    return false;
  }

  async function init() {
    U.bindMask($("cnpj"), U.maskCnpj);
    U.bindMask($("responsavelCpf"), U.maskCpf);
    U.bindMask($("cep"), U.maskCep);
    U.bindMask($("telefoneEmpresa"), U.maskPhone);
    U.bindMask($("responsavelTelefone"), U.maskPhone);

    $("codigoEmail")?.addEventListener("input", (e) => {
      e.target.value = U.onlyDigits(e.target.value).slice(0, EMAIL_CODE_LENGTH);
    });

    try {
      await loadPlanos();
    } catch (err) {
      U.showMessage(
        els.planoMessage,
        err instanceof Error ? err.message : "Erro ao carregar planos.",
        "error",
      );
    }

    const params = new URLSearchParams(window.location.search);
    const planoParam = params.get("planoId");
    const faixaParam = params.get("faixaId");

    if (planoParam && faixaParam && applyPlanoFromParams(planoParam, faixaParam)) {
      if (!(await resumeFromState())) showStep(STEPS.EMPRESA);
    } else if (!(await resumeFromState())) {
      showStep(STEPS.PLANO);
      renderPlanos();
    }

    bindEvents();
  }

  function bindEvents() {
    els.planosContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".faixa-option");
      if (!btn) return;

      const planoId = btn.getAttribute("data-plan-id");
      const faixaId = btn.getAttribute("data-faixa-id");
      if (!applyPlanoFromParams(planoId, faixaId)) {
        U.showMessage(els.planoMessage, "Plano ou faixa inválidos.", "error");
        return;
      }

      U.showMessage(els.planoMessage, "", "");
      showStep(STEPS.EMPRESA);
    });

    els.formEmpresa.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = readEmpresaForm();
      const error = validateEmpresa(data);
      if (error) {
        U.showMessage(els.empresaMessage, error, "error");
        return;
      }

      State.setEmpresa(data);
      U.showMessage(els.empresaMessage, "", "");
      showStep(STEPS.RESPONSAVEL);
    });

    els.formResponsavel.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const empresa = readEmpresaForm();
      const responsavel = readResponsavelForm();
      const empresaError = validateEmpresa(empresa);
      const responsavelError = validateResponsavel(responsavel);

      if (empresaError) {
        U.showMessage(els.responsavelMessage, empresaError, "error");
        showStep(STEPS.EMPRESA);
        return;
      }
      if (responsavelError) {
        U.showMessage(els.responsavelMessage, responsavelError, "error");
        return;
      }

      const state = State.load();
      if (!State.hasPlanoSelecionado()) {
        U.showMessage(els.responsavelMessage, "Selecione um plano antes de continuar.", "error");
        showStep(STEPS.PLANO);
        renderPlanos();
        return;
      }

      if (state.contratacaoId && !S.isTerminal(state.status)) {
        try {
          await syncWithServer();
          const synced = State.load();
          if (synced.contratacaoId && !S.isTerminal(synced.status)) {
            await navigateByStatus();
            return;
          }
        } catch (_) {
          /* tenta criar nova ou trata conflito abaixo */
        }
      }

      hideConflictPanel();
      State.setEmpresa(empresa);
      State.setResponsavel(responsavel);

      const btn = $("btnCriarContratacao");
      isSubmitting = true;
      btn.disabled = true;
      U.showMessage(els.responsavelMessage, "", "");

      try {
        const payload = {
          planoId: Number(state.planoId),
          faixaId: Number(state.faixaId),
          razaoSocial: empresa.razaoSocial,
          cnpj: empresa.cnpj,
          emailCorporativo: empresa.emailCorporativo,
          telefoneEmpresa: empresa.telefoneEmpresa,
          cep: empresa.cep,
          responsavelNome: responsavel.responsavelNome,
          responsavelCpf: responsavel.responsavelCpf,
          responsavelEmail: responsavel.responsavelEmail,
          responsavelTelefone: responsavel.responsavelTelefone,
        };

        const result = await Api.criarContratacao(payload);
        const contratacaoId = result.contratacaoId;
        if (!contratacaoId) throw new Error("Resposta da API sem identificador da contratação.");

        State.setContratacao(
          contratacaoId,
          S.normalizeStatus(result.status) || S.STATUS.AGUARDANDO_VALIDACAO_EMAIL,
        );
        State.save({ podeReenviarCodigo: true, podeCancelar: true });
        checkoutOpened = false;
        hideConflictPanel();
        els.emailDestino.textContent = responsavel.responsavelEmail;
        $("codigoEmail").value = "";
        els.aceiteContrato.checked = false;
        U.showMessage(els.emailMessage, "", "");
        showStep(STEPS.EMAIL);
        startEmailTimer();
        updateEmailActionButtons();
      } catch (err) {
        if (err?.status === 409 && err.body) {
          State.setEmpresa(empresa);
          State.setResponsavel(responsavel);
          handleConflict409(err);
          return;
        }
        U.showMessage(
          els.responsavelMessage,
          err instanceof Error ? err.message : "Erro ao criar contratação.",
          "error",
        );
      } finally {
        isSubmitting = false;
        btn.disabled = false;
      }
    });

    els.formEmail.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const state = State.load();
      const codigo = $("codigoEmail").value.trim();

      if (!S.canValidateEmail(state.status)) {
        try {
          await syncWithServer();
          await navigateByStatus();
        } catch (err) {
          U.showMessage(
            els.emailMessage,
            err instanceof Error ? err.message : "Não foi possível validar o status.",
            "error",
          );
        }
        return;
      }

      if (getEmailRemainingMs(state) <= 0) {
        handleExpiredContratacao("O código expirou. Inicie uma nova contratação.");
        return;
      }

      if ((state.emailAttempts || 0) >= EMAIL_MAX_ATTEMPTS) {
        handleExpiredContratacao("Número máximo de tentativas atingido. Inicie uma nova contratação.");
        return;
      }

      if (!U.isValidEmailCode(codigo)) {
        U.showMessage(els.emailMessage, `Informe um código de ${EMAIL_CODE_LENGTH} dígitos.`, "error");
        return;
      }

      const btn = $("btnValidarEmail");
      isSubmitting = true;
      btn.disabled = true;
      U.showMessage(els.emailMessage, "", "");

      try {
        const result = await Api.validarEmail(state.contratacaoId, codigo);
        State.save({ status: S.normalizeStatus(result.status) || S.STATUS.AGUARDANDO_ASSINATURA });
        stopEmailTimer();
        els.aceiteContrato.checked = false;
        showStep(STEPS.CONTRATO);
        await loadContract();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Código inválido.";
        const attempts = State.incrementEmailAttempts();

        if (
          attempts.emailAttempts >= EMAIL_MAX_ATTEMPTS ||
          /expir/i.test(msg) ||
          /cancel/i.test(msg)
        ) {
          handleExpiredContratacao(msg);
          return;
        }

        U.showMessage(els.emailMessage, msg, "error");
      } finally {
        isSubmitting = false;
        btn.disabled = false;
      }
    });

    els.aceiteContrato.addEventListener("change", updateAceiteButton);

    els.btnAceitarContrato.addEventListener("click", () => {
      const state = State.load();
      if (!contractLoaded || !els.aceiteContrato.checked || !S.canAcceptContract(state.status)) return;
      U.showMessage(els.contratoMessage, "", "");
      renderPlanSummary();
      showStep(STEPS.PLANO_RESUMO);
    });

    els.btnFinalizarContratacao.addEventListener("click", async () => {
      if (isSubmitting) return;

      const state = State.load();
      if (!state.contratacaoId) {
        U.showMessage(els.planoResumoMessage, "Contratação não encontrada. Recomece o processo.", "error");
        return;
      }

      if (!els.aceiteContrato.checked) {
        U.showMessage(els.planoResumoMessage, "Aceite o contrato antes de finalizar.", "error");
        showStep(STEPS.CONTRATO);
        return;
      }

      if (!S.canAcceptContract(state.status) && !S.canOpenCheckout(state.status)) {
        try {
          await syncWithServer();
        } catch (_) {
          /* segue */
        }
      }

      const current = State.load();
      if (S.canOpenCheckout(current.status) && current.checkoutUrl) {
        goToPayment(current.checkoutUrl);
        return;
      }

      if (!S.canAcceptContract(current.status)) {
        U.showMessage(
          els.planoResumoMessage,
          "O contrato só pode ser assinado após a validação do e-mail.",
          "error",
        );
        await navigateByStatus();
        return;
      }

      isSubmitting = true;
      els.btnFinalizarContratacao.disabled = true;
      U.showMessage(els.planoResumoMessage, "", "");

      try {
        const result = await Api.aceitarContrato(state.contratacaoId);
        const normalized = applyStatusPayload(result);
        const checkoutUrl = normalized.checkoutUrl;

        if (!checkoutUrl && !S.canOpenCheckout(normalized.status)) {
          throw new Error("Não foi possível obter o link de pagamento. Tente novamente.");
        }

        if (checkoutUrl) {
          goToPayment(checkoutUrl);
        } else {
          await navigateByStatus();
        }
      } catch (err) {
        U.showMessage(
          els.planoResumoMessage,
          err instanceof Error ? err.message : "Erro ao finalizar contratação.",
          "error",
        );
      } finally {
        isSubmitting = false;
        els.btnFinalizarContratacao.disabled = false;
      }
    });

    els.btnContinuarContratacao?.addEventListener("click", () => {
      continuarContratacao(els.responsavelMessage);
    });

    els.btnReenviarCodigoConflict?.addEventListener("click", async () => {
      await reenviarCodigo(els.responsavelMessage);
      hideConflictPanel();
      showStep(STEPS.EMAIL);
    });

    els.btnCancelarContratacao?.addEventListener("click", () => {
      cancelarERecomecar(els.responsavelMessage);
    });

    els.btnReenviarCodigoEmail?.addEventListener("click", () => {
      reenviarCodigo(els.emailMessage);
    });

    els.btnAtualizarStatus?.addEventListener("click", async () => {
      try {
        await syncWithServer();
        await navigateByStatus();
      } catch (err) {
        els.pagamentoDescricao.textContent =
          err instanceof Error ? err.message : "Erro ao atualizar status.";
      }
    });

    els.btnAtualizarAcompanhamento?.addEventListener("click", async () => {
      try {
        const updated = await syncWithServer();
        if (updated) renderAcompanhamentoStep(updated);
        await navigateByStatus();
      } catch (err) {
        els.acompanhamentoDescricao.textContent =
          err instanceof Error ? err.message : "Erro ao atualizar status.";
      }
    });

    document.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]");
      if (!action) return;

      switch (action.getAttribute("data-action")) {
        case "voltar-empresa":
          hideConflictPanel();
          showStep(STEPS.EMPRESA);
          break;
        case "cancelar-recomecar":
          cancelarERecomecar(els.emailMessage);
          break;
        case "reiniciar":
          resetParaNovaContratacao();
          showStep(STEPS.PLANO);
          renderPlanos();
          U.showMessage(
            els.emailMessage,
            "Para usar o mesmo CNPJ, cancele a contratação anterior ou continue de onde parou.",
            "error",
          );
          break;
        case "voltar-contrato":
          showStep(STEPS.CONTRATO);
          break;
        default:
          break;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
