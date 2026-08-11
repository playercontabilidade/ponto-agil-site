function getEmailRemainingMs(state) {
  const created = state.contratacaoCreatedAt || Date.now();
  return EMAIL_EXPIRY_MS - (Date.now() - created);
}

function updateEmailTimer() {
  const state = EstadoContratacao.load();
  const remaining = getEmailRemainingMs(state);

  if (remaining <= 0) {
    stopEmailTimer();
    handleExpiredContratacao("O código expirou. Inicie uma nova contratação.");
    return;
  }

  elementos.emailTimer.textContent = UtilitariosContratacao.formatCountdown(remaining);
  elementos.emailAttemptsLeft.textContent = String(
    Math.max(0, EMAIL_MAX_ATTEMPTS - (state.emailAttempts || 0)),
  );
}

function startEmailTimer() {
  clearInterval(identificadorTemporizadorEmail);
  updateEmailTimer();
  identificadorTemporizadorEmail = setInterval(updateEmailTimer, 1000);
}

function stopEmailTimer() {
  clearInterval(identificadorTemporizadorEmail);
  identificadorTemporizadorEmail = null;
}

async function loadPlanos() {
  planosEmCache = await ApiContratacao.getPlanosPublicos();
  if (!Array.isArray(planosEmCache)) planosEmCache = [];
  planosEmCache.sort((a, b) => UtilitariosContratacao.getPlanWeight(a.nome) - UtilitariosContratacao.getPlanWeight(b.nome));
  return planosEmCache;
}

function findPlanoDetails(planoId, faixaId) {
  const identificadorPlano = Number(planoId);
  const identificadorFaixa = Number(faixaId);
  const plano = planosEmCache.find((p) => Number(p.id) === identificadorPlano);
  const faixa = plano?.faixas?.find((f) => Number(f.id) === identificadorFaixa);
  return { plano, faixa };
}

function applyPlanoFromParams(planoId, faixaId) {
  const { plano, faixa } = findPlanoDetails(planoId, faixaId);
  if (!plano || !faixa) return false;

  EstadoContratacao.setPlano(Number(planoId), Number(faixaId), {
    planoNome: plano.nome || "",
    faixaNome: faixa.nome || "",
    planoPreco: faixa.preco || 0,
    planoFuncionalidades: Array.isArray(plano.funcionalidades)
      ? plano.funcionalidades.map((f) => f.nome).filter(Boolean)
      : [],
  });
  renderSidebarSummary();
  return true;
}

function renderPlanos() {
  if (!planosEmCache.length) {
    elementos.planosContainer.innerHTML =
      '<p class="ctr-step__hint">Nenhum plano disponível no momento.</p>';
    return;
  }

  elementos.planosContainer.innerHTML = planosEmCache
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
                <span class="faixa-option__price">R$ ${UtilitariosContratacao.formatCurrencyBRL(faixa.preco)}/mês</span>
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
