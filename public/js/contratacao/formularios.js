function readEmpresaForm() {
  return {
    razaoSocial: $("razaoSocial").value.trim(),
    cnpj: $("cnpj").value.trim(),
    emailCorporativo: $("emailCorporativo").value.trim(),
    telefoneEmpresa: UtilitariosContratacao.onlyDigits($("telefoneEmpresa").value),
    cep: $("cep").value.trim(),
  };
}

function readResponsavelForm() {
  return {
    responsavelNome: $("responsavelNome").value.trim(),
    responsavelCpf: $("responsavelCpf").value.trim(),
    responsavelEmail: $("responsavelEmail").value.trim(),
    responsavelTelefone: UtilitariosContratacao.onlyDigits($("responsavelTelefone").value),
  };
}

function fillEmpresaForm(data) {
  $("razaoSocial").value = data.razaoSocial || "";
  $("cnpj").value = data.cnpj || "";
  $("emailCorporativo").value = data.emailCorporativo || "";
  $("telefoneEmpresa").value = data.telefoneEmpresa ? UtilitariosContratacao.maskPhone(data.telefoneEmpresa) : "";
  $("cep").value = data.cep || "";
}

function fillResponsavelForm(data) {
  $("responsavelNome").value = data.responsavelNome || "";
  $("responsavelCpf").value = data.responsavelCpf || "";
  $("responsavelEmail").value = data.responsavelEmail || "";
  $("responsavelTelefone").value = data.responsavelTelefone
    ? UtilitariosContratacao.maskPhone(data.responsavelTelefone)
    : "";
}

function validateEmpresa(data) {
  if (!data.razaoSocial) return "Informe a razão social.";
  if (!UtilitariosContratacao.isValidCnpj(data.cnpj)) return "Informe um CNPJ válido.";
  if (!UtilitariosContratacao.isValidEmail(data.emailCorporativo)) return "Informe um e-mail corporativo válido.";
  if (!UtilitariosContratacao.isValidPhone(data.telefoneEmpresa)) return "Informe um telefone válido.";
  if (!UtilitariosContratacao.isValidCep(data.cep)) return "Informe um CEP válido.";
  return null;
}

function validateResponsavel(data) {
  if (!data.responsavelNome) return "Informe o nome completo do responsável.";
  if (!UtilitariosContratacao.isValidCpf(data.responsavelCpf)) return "Informe um CPF válido.";
  if (!UtilitariosContratacao.isValidEmail(data.responsavelEmail)) return "Informe um e-mail válido.";
  if (!UtilitariosContratacao.isValidPhone(data.responsavelTelefone)) return "Informe um telefone válido.";
  return null;
}

function hideConflictPanel() {
  if (!elementos.conflictPanel) return;
  elementos.conflictPanel.hidden = true;
  if (elementos.responsavelActions) elementos.responsavelActions.hidden = false;
}

function showConflictPanel(body, mensagem) {
  if (!elementos.conflictPanel) return;

  const data = body || {};
  elementos.conflictPanel.hidden = false;
  if (elementos.responsavelActions) elementos.responsavelActions.hidden = true;

  elementos.conflictMessage.textContent =
    mensagem || data.mensagem || "Já existe uma contratação em andamento para este CNPJ.";

  if (data.responsavelEmail) {
    elementos.conflictEmail.hidden = false;
    elementos.conflictEmail.textContent = `Código enviado para ${data.responsavelEmail}`;
  } else {
    elementos.conflictEmail.hidden = true;
  }

  const podeContinuar = data.podeContinuar !== false;
  elementos.btnContinuarContratacao.hidden = !podeContinuar;
  elementos.btnReenviarCodigoConflict.hidden = !data.podeReenviarCodigo;
  elementos.btnCancelarContratacao.hidden = !data.podeCancelar;
}

function handleConflict409(erro) {
  const body = erro.body || {};
  EstadoContratacao.applyConflictPayload(body);

  if (body.responsavelEmail) {
    elementos.emailDestino.textContent = body.responsavelEmail;
  }

  showConflictPanel(body, erro.message);
  UtilitariosContratacao.showMessage(elementos.responsavelMessage, "", "");
}

function updateEmailActionButtons() {
  const state = EstadoContratacao.load();
  const podeReenviar =
    Boolean(state.podeReenviarCodigo) && StatusContratacao.canValidateEmail(StatusContratacao.normalizeStatus(state.status));
  elementos.btnReenviarCodigoEmail.hidden = !podeReenviar;
  elementos.btnCancelarRecomecar.hidden = !state.podeCancelar;
  elementos.btnRecomecarLocal.hidden = Boolean(state.contratacaoId);
}

function resetParaNovaContratacao() {
  stopStatusPolling();
  stopEmailTimer();
  hideConflictPanel();
  EstadoContratacao.clearContratacao();
  contratoCarregado = false;
  htmlContratoEmCache = "";
  checkoutAberto = false;
  elementos.aceiteContrato.checked = false;
  $("codigoEmail").value = "";
}

async function continuarContratacao(messageEl) {
  hideConflictPanel();
  const state = EstadoContratacao.load();
  if (!state.contratacaoId) return;

  if (messageEl) UtilitariosContratacao.showMessage(messageEl, "", "");

  try {
    await syncWithServer();
    await navigateByStatus();
  } catch (erro) {
    UtilitariosContratacao.showMessage(
      messageEl || elementos.responsavelMessage,
      erro instanceof Error ? erro.message : "Não foi possível continuar a contratação.",
      "error",
    );
  }
}

async function reenviarCodigo(messageEl) {
  const state = EstadoContratacao.load();
  if (!state.contratacaoId || envioEmAndamento) return;

  envioEmAndamento = true;
  if (messageEl) UtilitariosContratacao.showMessage(messageEl, "", "");

  try {
    await ApiContratacao.reenviarCodigo(state.contratacaoId);
    EstadoContratacao.save({
      contratacaoCreatedAt: Date.now(),
      emailAttempts: 0,
      podeReenviarCodigo: true,
    });
    UtilitariosContratacao.showMessage(messageEl || elementos.emailMessage, "Novo código enviado por e-mail.", "success");
    $("codigoEmail").value = "";

    const updated = EstadoContratacao.load();
    elementos.emailDestino.textContent =
      updated.responsavel.responsavelEmail || updated.responsavelEmailMascarado || elementos.emailDestino.textContent;

    if (etapaAtual !== ETAPAS.EMAIL) showStep(ETAPAS.EMAIL);
    startEmailTimer();
    updateEmailActionButtons();
  } catch (erro) {
    UtilitariosContratacao.showMessage(
      messageEl || elementos.emailMessage,
      erro instanceof Error ? erro.message : "Não foi possível reenviar o código.",
      "error",
    );
  } finally {
    envioEmAndamento = false;
  }
}

async function cancelarERecomecar(messageEl) {
  const state = EstadoContratacao.load();

  if (!state.contratacaoId) {
    resetParaNovaContratacao();
    showStep(EstadoContratacao.hasPlanoSelecionado() ? ETAPAS.EMPRESA : ETAPAS.PLANO);
    if (!EstadoContratacao.hasPlanoSelecionado()) renderPlanos();
    return;
  }

  if (!state.podeCancelar) {
    UtilitariosContratacao.showMessage(
      messageEl || elementos.emailMessage,
      "Não é possível cancelar esta contratação pelo portal. Entre em contato com o suporte.",
      "error",
    );
    return;
  }

  if (envioEmAndamento) return;
  envioEmAndamento = true;
  if (messageEl) UtilitariosContratacao.showMessage(messageEl, "", "");

  try {
    await ApiContratacao.cancelarContratacao(state.contratacaoId);
    resetParaNovaContratacao();
    UtilitariosContratacao.showMessage(
      messageEl || elementos.responsavelMessage,
      "Contratação cancelada. Você pode iniciar uma nova.",
      "success",
    );
    showStep(EstadoContratacao.hasPlanoSelecionado() ? ETAPAS.EMPRESA : ETAPAS.PLANO);
    if (!EstadoContratacao.hasPlanoSelecionado()) renderPlanos();
  } catch (erro) {
    UtilitariosContratacao.showMessage(
      messageEl || elementos.responsavelMessage,
      erro instanceof Error ? erro.message : "Não foi possível cancelar a contratação.",
      "error",
    );
  } finally {
    envioEmAndamento = false;
  }
}

function handleExpiredContratacao(message) {
  stopStatusPolling();
  stopEmailTimer();
  hideConflictPanel();
  EstadoContratacao.clearContratacao();
  contratoCarregado = false;
  htmlContratoEmCache = "";
  checkoutAberto = false;
  elementos.aceiteContrato.checked = false;
  UtilitariosContratacao.showMessage(
    elementos.emailMessage,
    message || "A contratação expirou. Selecione o plano novamente para recomeçar.",
    "error",
  );
  showStep(ETAPAS.PLANO);
  renderPlanos();
}
