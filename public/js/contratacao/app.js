async function resumeFromState() {
  const state = EstadoContratacao.load();
  fillEmpresaForm(state.empresa);
  fillResponsavelForm(state.responsavel);

  if (state.contratacaoId) {
    try {
      await syncWithServer();
      await navigateByStatus();
      return true;
    } catch (erro) {
      UtilitariosContratacao.showMessage(
        elementos.planoMessage,
        erro instanceof Error ? erro.message : "Não foi possível recuperar a contratação.",
        "error",
      );
      if (EstadoContratacao.hasPlanoSelecionado()) {
        showStep(ETAPAS.EMPRESA);
        return true;
      }
      return false;
    }
  }

  if (EstadoContratacao.hasPlanoSelecionado()) {
    showStep(ETAPAS.EMPRESA);
    return true;
  }

  return false;
}

async function init() {
  UtilitariosContratacao.bindMask($("cnpj"), UtilitariosContratacao.maskCnpj);
  UtilitariosContratacao.bindMask($("responsavelCpf"), UtilitariosContratacao.maskCpf);
  UtilitariosContratacao.bindMask($("cep"), UtilitariosContratacao.maskCep);
  UtilitariosContratacao.bindMask($("telefoneEmpresa"), UtilitariosContratacao.maskPhone);
  UtilitariosContratacao.bindMask($("responsavelTelefone"), UtilitariosContratacao.maskPhone);

  $("codigoEmail")?.addEventListener("input", (e) => {
    e.target.value = UtilitariosContratacao.onlyDigits(e.target.value).slice(0, EMAIL_CODE_LENGTH);
  });

  try {
    await loadPlanos();
  } catch (erro) {
    UtilitariosContratacao.showMessage(
      elementos.planoMessage,
      erro instanceof Error ? erro.message : "Erro ao carregar planos.",
      "error",
    );
  }

  const params = new URLSearchParams(window.location.search);
  const planoParam = params.get("planoId");
  const faixaParam = params.get("faixaId");

  if (planoParam && faixaParam && applyPlanoFromParams(planoParam, faixaParam)) {
    if (!(await resumeFromState())) showStep(ETAPAS.EMPRESA);
  } else if (!(await resumeFromState())) {
    showStep(ETAPAS.PLANO);
    renderPlanos();
  }

  bindEvents();
}

function bindEvents() {
  elementos.planosContainer.addEventListener("click", (e) => {
    const botao = e.target.closest(".faixa-option");
    if (!botao) return;

    const planoId = botao.getAttribute("data-plan-id");
    const faixaId = botao.getAttribute("data-faixa-id");
    if (!applyPlanoFromParams(planoId, faixaId)) {
      UtilitariosContratacao.showMessage(elementos.planoMessage, "Plano ou faixa inválidos.", "error");
      return;
    }

    UtilitariosContratacao.showMessage(elementos.planoMessage, "", "");
    showStep(ETAPAS.EMPRESA);
  });

  elementos.formEmpresa.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = readEmpresaForm();
    const error = validateEmpresa(data);
    if (error) {
      UtilitariosContratacao.showMessage(elementos.empresaMessage, error, "error");
      return;
    }

    EstadoContratacao.setEmpresa(data);
    UtilitariosContratacao.showMessage(elementos.empresaMessage, "", "");
    showStep(ETAPAS.RESPONSAVEL);
  });

  elementos.formResponsavel.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (envioEmAndamento) return;

    const empresa = readEmpresaForm();
    const responsavel = readResponsavelForm();
    const empresaError = validateEmpresa(empresa);
    const responsavelError = validateResponsavel(responsavel);

    if (empresaError) {
      UtilitariosContratacao.showMessage(elementos.responsavelMessage, empresaError, "error");
      showStep(ETAPAS.EMPRESA);
      return;
    }
    if (responsavelError) {
      UtilitariosContratacao.showMessage(elementos.responsavelMessage, responsavelError, "error");
      return;
    }

    const state = EstadoContratacao.load();
    if (!EstadoContratacao.hasPlanoSelecionado()) {
      UtilitariosContratacao.showMessage(elementos.responsavelMessage, "Selecione um plano antes de continuar.", "error");
      showStep(ETAPAS.PLANO);
      renderPlanos();
      return;
    }

    if (state.contratacaoId && !StatusContratacao.isTerminal(state.status)) {
      try {
        await syncWithServer();
        const synced = EstadoContratacao.load();
        if (synced.contratacaoId && !StatusContratacao.isTerminal(synced.status)) {
          await navigateByStatus();
          return;
        }
      } catch {
        /* tenta criar nova ou trata conflito abaixo */
      }
    }

    hideConflictPanel();
    EstadoContratacao.setEmpresa(empresa);
    EstadoContratacao.setResponsavel(responsavel);

    const botao = $("btnCriarContratacao");
    envioEmAndamento = true;
    botao.disabled = true;
    UtilitariosContratacao.showMessage(elementos.responsavelMessage, "", "");

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

      const result = await ApiContratacao.criarContratacao(payload);
      const contratacaoId = result.contratacaoId;
      if (!contratacaoId) throw new Error("Resposta da API sem identificador da contratação.");

      EstadoContratacao.setContratacao(
        contratacaoId,
        StatusContratacao.normalizeStatus(result.status) || StatusContratacao.STATUS.AGUARDANDO_VALIDACAO_EMAIL,
      );
      EstadoContratacao.save({ podeReenviarCodigo: true, podeCancelar: true });
      checkoutAberto = false;
      hideConflictPanel();
      elementos.emailDestino.textContent = responsavel.responsavelEmail;
      $("codigoEmail").value = "";
      elementos.aceiteContrato.checked = false;
      UtilitariosContratacao.showMessage(elementos.emailMessage, "", "");
      showStep(ETAPAS.EMAIL);
      startEmailTimer();
      updateEmailActionButtons();
    } catch (erro) {
      if (erro?.status === 409 && erro.body) {
        EstadoContratacao.setEmpresa(empresa);
        EstadoContratacao.setResponsavel(responsavel);
        handleConflict409(erro);
        return;
      }
      UtilitariosContratacao.showMessage(
        elementos.responsavelMessage,
        erro instanceof Error ? erro.message : "Erro ao criar contratação.",
        "error",
      );
    } finally {
      envioEmAndamento = false;
      botao.disabled = false;
    }
  });

  elementos.formEmail.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (envioEmAndamento) return;

    const state = EstadoContratacao.load();
    const codigo = $("codigoEmail").value.trim();

    if (!StatusContratacao.canValidateEmail(state.status)) {
      try {
        await syncWithServer();
        await navigateByStatus();
      } catch (erro) {
        UtilitariosContratacao.showMessage(
          elementos.emailMessage,
          erro instanceof Error ? erro.message : "Não foi possível validar o status.",
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

    if (!UtilitariosContratacao.isValidEmailCode(codigo)) {
      UtilitariosContratacao.showMessage(elementos.emailMessage, `Informe um código de ${EMAIL_CODE_LENGTH} dígitos.`, "error");
      return;
    }

    const botao = $("btnValidarEmail");
    envioEmAndamento = true;
    botao.disabled = true;
    UtilitariosContratacao.showMessage(elementos.emailMessage, "", "");

    try {
      const result = await ApiContratacao.validarEmail(state.contratacaoId, codigo);
      EstadoContratacao.save({ status: StatusContratacao.normalizeStatus(result.status) || StatusContratacao.STATUS.AGUARDANDO_ASSINATURA });
      stopEmailTimer();
      elementos.aceiteContrato.checked = false;
      showStep(ETAPAS.CONTRATO);
      await loadContract();
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Código inválido.";
      const attempts = EstadoContratacao.incrementEmailAttempts();

      if (
        attempts.emailAttempts >= EMAIL_MAX_ATTEMPTS ||
        /expir/i.test(mensagem) ||
        /cancel/i.test(mensagem)
      ) {
        handleExpiredContratacao(mensagem);
        return;
      }

      UtilitariosContratacao.showMessage(elementos.emailMessage, mensagem, "error");
    } finally {
      envioEmAndamento = false;
      botao.disabled = false;
    }
  });

  elementos.aceiteContrato.addEventListener("change", updateAceiteButton);

  elementos.btnAceitarContrato.addEventListener("click", async () => {
    if (envioEmAndamento) return;

    const state = EstadoContratacao.load();
    if (!state.contratacaoId) {
      UtilitariosContratacao.showMessage(elementos.contratoMessage, "Contratação não encontrada. Recomece o processo.", "error");
      return;
    }

    if (!contratoCarregado || !elementos.aceiteContrato.checked) return;

    if (!StatusContratacao.canAcceptContract(state.status) && !StatusContratacao.canOpenCheckout(state.status)) {
      try {
        await syncWithServer();
      } catch {
        /* segue */
      }
    }

    const current = EstadoContratacao.load();
    if (StatusContratacao.canOpenCheckout(current.status) && current.checkoutUrl) {
      goToPayment(current.checkoutUrl);
      return;
    }

    if (!StatusContratacao.canAcceptContract(current.status)) {
      UtilitariosContratacao.showMessage(
        elementos.contratoMessage,
        "O contrato só pode ser assinado após a validação do e-mail.",
        "error",
      );
      await navigateByStatus();
      return;
    }

    envioEmAndamento = true;
    elementos.btnAceitarContrato.disabled = true;
    UtilitariosContratacao.showMessage(elementos.contratoMessage, "", "");

    try {
      const result = await ApiContratacao.aceitarContrato(state.contratacaoId);
      const normalized = applyStatusPayload(result);
      const checkoutUrl = normalized.checkoutUrl;

      if (!checkoutUrl && !StatusContratacao.canOpenCheckout(normalized.status)) {
        throw new Error("Não foi possível obter o link de pagamento. Tente novamente.");
      }

      if (checkoutUrl) {
        goToPayment(checkoutUrl);
      } else {
        await navigateByStatus();
      }
    } catch (erro) {
      UtilitariosContratacao.showMessage(
        elementos.contratoMessage,
        erro instanceof Error ? erro.message : "Erro ao assinar contrato.",
        "error",
      );
    } finally {
      envioEmAndamento = false;
      updateAceiteButton();
    }
  });

  elementos.btnContractZoomIn?.addEventListener("click", () => {
    zoomContrato = Math.min(150, zoomContrato + 10);
    applyContractZoom();
  });

  elementos.btnContractZoomOut?.addEventListener("click", () => {
    zoomContrato = Math.max(70, zoomContrato - 10);
    applyContractZoom();
  });

  elementos.btnModalZoomIn?.addEventListener("click", () => {
    zoomModalContrato = Math.min(150, zoomModalContrato + 10);
    applyModalZoom();
  });

  elementos.btnModalZoomOut?.addEventListener("click", () => {
    zoomModalContrato = Math.max(70, zoomModalContrato - 10);
    applyModalZoom();
  });

  elementos.btnContractDownload?.addEventListener("click", downloadContractPdf);
  elementos.btnModalDownload?.addEventListener("click", downloadContractPdf);
  elementos.btnContractFullscreen?.addEventListener("click", toggleContractFullscreen);
  elementos.btnCloseContractModal?.addEventListener("click", closeContractModal);
  elementos.btnBaixarContrato?.addEventListener("click", downloadContractPdf);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && elementos.contractModal && !elementos.contractModal.hidden) {
      closeContractModal();
    }
  });

  elementos.btnContinuarContratacao?.addEventListener("click", () => {
    continuarContratacao(elementos.responsavelMessage);
  });

  elementos.btnReenviarCodigoConflict?.addEventListener("click", async () => {
    await reenviarCodigo(elementos.responsavelMessage);
    hideConflictPanel();
    showStep(ETAPAS.EMAIL);
  });

  elementos.btnCancelarContratacao?.addEventListener("click", () => {
    cancelarERecomecar(elementos.responsavelMessage);
  });

  elementos.btnReenviarCodigoEmail?.addEventListener("click", () => {
    reenviarCodigo(elementos.emailMessage);
  });

  elementos.btnAtualizarStatus?.addEventListener("click", async () => {
    try {
      await syncWithServer();
      await navigateByStatus();
    } catch (erro) {
      elementos.pagamentoDescricao.textContent =
        erro instanceof Error ? erro.message : "Erro ao atualizar status.";
    }
  });

  elementos.btnAtualizarAcompanhamento?.addEventListener("click", async () => {
    try {
      const updated = await syncWithServer();
      if (updated) renderAcompanhamentoStep(updated);
      await navigateByStatus();
    } catch (erro) {
      elementos.acompanhamentoDescricao.textContent =
        erro instanceof Error ? erro.message : "Erro ao atualizar status.";
    }
  });

  document.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]");
    if (!action) return;

    switch (action.getAttribute("data-action")) {
      case "voltar-empresa":
        hideConflictPanel();
        showStep(ETAPAS.EMPRESA);
        break;
      case "voltar-responsavel":
        showStep(ETAPAS.RESPONSAVEL);
        break;
      case "cancelar-recomecar":
        cancelarERecomecar(elementos.emailMessage);
        break;
      case "reiniciar":
        resetParaNovaContratacao();
        showStep(ETAPAS.PLANO);
        renderPlanos();
        UtilitariosContratacao.showMessage(
          elementos.emailMessage,
          "Para usar o mesmo CNPJ, cancele a contratação anterior ou continue de onde parou.",
          "error",
        );
        break;
      case "voltar-contrato":
        showStep(ETAPAS.CONTRATO);
        break;
      case "close-contract-modal":
        closeContractModal();
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
