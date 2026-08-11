function applyContractZoom() {
  if (!elementos.contractContent) return;
  elementos.contractContent.style.transform = `scale(${zoomContrato / 100})`;
  if (elementos.contractZoomLabel) elementos.contractZoomLabel.textContent = `${zoomContrato}%`;
}

function applyModalZoom() {
  if (!elementos.contractContentModal) return;
  elementos.contractContentModal.style.transform = `scale(${zoomModalContrato / 100})`;
  if (elementos.modalZoomLabel) elementos.modalZoomLabel.textContent = `${zoomModalContrato}%`;
}

function openContractModal() {
  const html = getContractHtmlForExport();
  if (!html || !elementos.contractModal || !elementos.contractContentModal) return;

  elementos.contractContentModal.innerHTML = html;
  elementos.contractContentModal.scrollTop = 0;
  zoomModalContrato = zoomContrato;
  applyModalZoom();

  elementos.contractModal.hidden = false;
  document.body.style.overflow = "hidden";
  elementos.btnCloseContractModal?.focus();
}

function closeContractModal() {
  if (!elementos.contractModal) return;
  elementos.contractModal.hidden = true;
  document.body.style.overflow = "";
  elementos.btnContractFullscreen?.focus();
}

function getContractHtmlForExport() {
  const html = htmlContratoEmCache || elementos.contractContent?.innerHTML || "";
  if (!html || html.includes("Carregando contrato")) return null;
  return html;
}

async function ensureContractHtml() {
  const cached = getContractHtmlForExport();
  if (cached) return cached;

  const state = EstadoContratacao.load();
  if (!state.contratacaoId) return null;

  try {
    const data = await ApiContratacao.getContrato(state.contratacaoId);
    htmlContratoEmCache = data.conteudoHtml || "";
    return getContractHtmlForExport();
  } catch {
    return null;
  }
}

function printContractAsPdf(html) {
  const printStyles = `
    @page { margin: 2cm; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111;
      margin: 0;
      padding: 0;
    }
    img { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; }
    h1, h2, h3 { page-break-after: avoid; }
    p, li { orphans: 3; widows: 3; }
  `;

  const docHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato - Ponto Ágil</title>
<style>${printStyles}</style>
</head>
<body>${html}</body>
</html>`;

  let iframe = document.getElementById("contract-print-frame");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "contract-print-frame";
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none";
    document.body.appendChild(iframe);
  }

  const janelaImpressao = iframe.contentWindow;
  if (!janelaImpressao) return;

  const documentoImpressao = janelaImpressao.document;
  documentoImpressao.open();
  documentoImpressao.write(docHtml);
  documentoImpressao.close();

  const triggerPrint = () => {
    janelaImpressao.focus();
    janelaImpressao.print();
  };

  if (documentoImpressao.readyState === "complete") {
    setTimeout(triggerPrint, 150);
  } else {
    janelaImpressao.addEventListener("load", () => setTimeout(triggerPrint, 150), { once: true });
  }
}

async function downloadContractPdf() {
  const html = await ensureContractHtml();
  if (!html) return;
  printContractAsPdf(html);
}

function toggleContractFullscreen() {
  if (elementos.contractModal && !elementos.contractModal.hidden) {
    closeContractModal();
    return;
  }
  openContractModal();
}

async function loadContract() {
  const state = EstadoContratacao.load();
  if (!state.contratacaoId) return;

  if (!StatusContratacao.canViewContract(state.status)) {
    UtilitariosContratacao.showMessage(
      elementos.contratoMessage,
      "Valide o e-mail antes de visualizar o contrato.",
      "error",
    );
    showStep(ETAPAS.EMAIL);
    return;
  }

  UtilitariosContratacao.showMessage(elementos.contratoMessage, "", "");
  elementos.contractContent.innerHTML = '<p class="ctr-step__hint">Carregando contrato...</p>';
  contratoCarregado = false;
  updateAceiteButton();

  try {
    const data = await ApiContratacao.getContrato(state.contratacaoId);
    htmlContratoEmCache = data.conteudoHtml || "";
    elementos.contractContent.innerHTML = htmlContratoEmCache || "<p>Contrato indisponível.</p>";
    elementos.contractContent.scrollTop = 0;
    contratoCarregado = Boolean(data.conteudoHtml);
    zoomContrato = 100;
    applyContractZoom();

    if (data.hashDocumento) {
      elementos.hashDocumento.hidden = false;
      elementos.hashDocumento.textContent = `Identificador do documento: ${data.hashDocumento}`;
      EstadoContratacao.save({ hashDocumento: data.hashDocumento });
    }
  } catch (erro) {
    elementos.contractContent.innerHTML = "";
    const mensagem = erro instanceof Error ? erro.message : "Não foi possível carregar o contrato.";
    if (/valid/i.test(mensagem) || /e-?mail/i.test(mensagem)) {
      showStep(ETAPAS.EMAIL);
    }
    UtilitariosContratacao.showMessage(elementos.contratoMessage, mensagem, "error");
  }

  updateAceiteButton();
}

function updateAceiteButton() {
  const state = EstadoContratacao.load();
  const checked = elementos.aceiteContrato.checked;
  const canProceed =
    contratoCarregado &&
    checked &&
    !envioEmAndamento &&
    StatusContratacao.canAcceptContract(state.status);
  elementos.btnAceitarContrato.disabled = !canProceed;
}

function goToPayment(checkoutUrl) {
  const updated = EstadoContratacao.save({
    checkoutUrl,
    status: StatusContratacao.STATUS.AGUARDANDO_PAGAMENTO,
  });
  renderPagamentoStep(updated);
  showStep(ETAPAS.PAGAMENTO);
  if (checkoutUrl) openCheckout(checkoutUrl);
}
