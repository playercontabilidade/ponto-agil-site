(function () {
  const {
    EMAIL_CODE_LENGTH,
    EMAIL_MAX_ATTEMPTS,
    EMAIL_EXPIRY_MS,
  } = window.PONTO_AGIL_CONTRATACAO_CONFIG;

  const U = window.ContratacaoUtils;
  const State = window.ContratacaoState;
  const Api = window.ContratacaoApi;

  const STEPS = {
    PLANO: "plano",
    EMPRESA: "empresa",
    RESPONSAVEL: "responsavel",
    EMAIL: "email",
    CONTRATO: "contrato",
    PLANO_RESUMO: "plano-resumo",
    PAGAMENTO: "pagamento",
  };

  const STEPPER_MAP = {
    [STEPS.EMPRESA]: "empresa",
    [STEPS.RESPONSAVEL]: "responsavel",
    [STEPS.EMAIL]: "responsavel",
    [STEPS.CONTRATO]: "contrato",
    [STEPS.PLANO_RESUMO]: "plano-resumo",
    [STEPS.PAGAMENTO]: "plano-resumo",
  };

  let currentStep = STEPS.PLANO;
  let planosCache = [];
  let emailTimerId = null;
  let contractLoaded = false;
  let isSubmitting = false;

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

    const showStepper = step !== STEPS.PLANO && step !== STEPS.PAGAMENTO;
    els.stepper.classList.toggle("is-hidden", !showStepper);
    updateStepper(step);
    updateFlowSidebar(step);
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
    else if (step === STEPS.CONTRATO) activeFlow = "contrato";
    else if ([STEPS.PLANO_RESUMO, STEPS.PAGAMENTO].includes(step)) activeFlow = "pagamento";

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

  function handleExpiredContratacao(message) {
    State.clear();
    contractLoaded = false;
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
      clearInterval(emailTimerId);
      emailTimerId = null;
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
      U.showMessage(
        els.contratoMessage,
        err instanceof Error ? err.message : "Não foi possível carregar o contrato.",
        "error",
      );
    }

    updateAceiteButton();
  }

  function updateAceiteButton() {
    const checked = els.aceiteContrato.checked;
    els.btnAceitarContrato.disabled = !contractLoaded || !checked || isSubmitting;
  }

  function goToPayment(checkoutUrl) {
    State.save({ checkoutUrl, status: "AGUARDANDO_PAGAMENTO" });
    showStep(STEPS.PAGAMENTO);

    if (checkoutUrl) {
      els.btnAbrirCheckout.hidden = false;
      els.btnAbrirCheckout.onclick = () => {
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      };
      window.location.href = checkoutUrl;
    }
  }

  function resumeFromState() {
    const state = State.load();
    fillEmpresaForm(state.empresa);
    fillResponsavelForm(state.responsavel);

    if (state.status === "AGUARDANDO_PAGAMENTO" && state.checkoutUrl) {
      showStep(STEPS.PAGAMENTO);
      els.btnAbrirCheckout.hidden = false;
      els.btnAbrirCheckout.onclick = () => {
        window.open(state.checkoutUrl, "_blank", "noopener,noreferrer");
      };
      return true;
    }

    if (state.contratacaoId) {
      if (state.status === "AGUARDANDO_VALIDACAO_EMAIL") {
        els.emailDestino.textContent = state.responsavel.responsavelEmail || state.empresa.emailCorporativo;
        showStep(STEPS.EMAIL);
        startEmailTimer();
        return true;
      }

      if (state.status === "EMAIL_VALIDADO") {
        showStep(STEPS.CONTRATO);
        loadContract();
        return true;
      }

      if (state.status === "CONTRATO_ACEITO") {
        renderPlanSummary();
        showStep(STEPS.PLANO_RESUMO);
        return true;
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
      if (!resumeFromState()) showStep(STEPS.EMPRESA);
    } else if (!resumeFromState()) {
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

        State.setContratacao(contratacaoId, result.status || "AGUARDANDO_VALIDACAO_EMAIL");
        els.emailDestino.textContent = responsavel.responsavelEmail;
        $("codigoEmail").value = "";
        U.showMessage(els.emailMessage, "", "");
        showStep(STEPS.EMAIL);
        startEmailTimer();
      } catch (err) {
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
        State.save({ status: result.status || "EMAIL_VALIDADO" });
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
      if (!contractLoaded || !els.aceiteContrato.checked) return;
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

      isSubmitting = true;
      els.btnFinalizarContratacao.disabled = true;
      U.showMessage(els.planoResumoMessage, "", "");

      try {
        const result = await Api.aceitarContrato(state.contratacaoId);
        const checkoutUrl = result.checkoutUrl;
        if (!checkoutUrl) {
          throw new Error("Não foi possível obter o link de pagamento. Tente novamente.");
        }

        State.save({ status: result.status || "AGUARDANDO_PAGAMENTO", checkoutUrl });
        goToPayment(checkoutUrl);
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

    document.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]");
      if (!action) return;

      switch (action.getAttribute("data-action")) {
        case "voltar-empresa":
          showStep(STEPS.EMPRESA);
          break;
        case "reiniciar":
          State.clear();
          contractLoaded = false;
          stopEmailTimer();
          showStep(STEPS.PLANO);
          renderPlanos();
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
