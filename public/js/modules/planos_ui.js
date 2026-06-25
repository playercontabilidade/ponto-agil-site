import {
  formatarMoedaBrl,
  normalizarChaveFaixa,
  obterPesoPlano,
  faixaEhAcimaDe100,
  interpretarErroApi,
} from '../utils/formatadores.js';

const WHATSAPP_URL = 'https://wa.me/5563993124723';
const FAIXA_ENTERPRISE = 'Acima de 100 colaboradores';

let cachePlanos = [];
let ultimoFocoModal = null;

function obterBaseUrl() {
  if (typeof window.PONTO_AGIL_API === 'string' && window.PONTO_AGIL_API) {
    return window.PONTO_AGIL_API.replace(/\/$/, '');
  }
  if (window.__CONFIG__?.apiBaseUrl) {
    return String(window.__CONFIG__.apiBaseUrl).replace(/\/$/, '');
  }
  return 'https://pontoagil.playercontabilidade.com';
}

function criarPainelEnterprise(nomeFaixa, ativo) {
  const painel = document.createElement('div');
  painel.className = `pricing-panel pricing-panel--large${ativo ? ' active' : ''}`;
  painel.setAttribute('data-band', normalizarChaveFaixa(nomeFaixa));
  const textoWa = encodeURIComponent(
    `Olá! Tenho interesse em uma proposta especial para a faixa ${nomeFaixa}.`,
  );
  painel.innerHTML = `
    <article class="plan-enterprise-card">
      <h4 class="plan-enterprise-title">Proposta especial</h4>
      <p class="plan-enterprise-text">Para empresas com <strong>${nomeFaixa}</strong>, elaboramos um plano sob medida.
        Entre em contato pelo WhatsApp e nossa equipe prepara a melhor proposta para você.</p>
      <a href="${WHATSAPP_URL}?text=${textoWa}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
    </article>
  `;
  return painel;
}

function criarCardPlano(plano, faixa, emDestaque) {
  const card = document.createElement('article');
  card.className = `plan-detail-card${emDestaque ? ' plan-detail-card--highlight' : ''}`;
  const funcionalidades = Array.isArray(plano.funcionalidades) ? plano.funcionalidades : [];
  const classeCta = emDestaque ? 'plan-detail-cta plan-detail-cta--primary' : 'plan-detail-cta';
  const nomeFaixa = faixa ? faixa.nome : '';
  const precoFaixa = faixa ? faixa.preco : 0;
  const botaoAssinar =
    plano.id != null && faixa && faixa.id != null
      ? `<button type="button" class="${classeCta} plan-checkout-btn" data-plan-id="${plano.id}" data-faixa-id="${faixa.id}" aria-label="Assinar ${plano.nome || ''} ${nomeFaixa}">Assinar</button>`
      : `<button type="button" class="${classeCta} open-lead-modal-btn">Falar com a equipe</button>`;

  card.innerHTML = `
    <h4 class="plan-detail-name">${plano.nome || ''}</h4>
    <p class="plan-detail-audience">${nomeFaixa}</p>
    <p class="plan-detail-price">R$&nbsp;<span>${formatarMoedaBrl(precoFaixa)}</span><small>/mês</small></p>
    <ul class="plan-detail-list">
      ${funcionalidades.map((item) => `<li>${item.nome || ''}</li>`).join('')}
    </ul>
    ${botaoAssinar}
  `;
  return card;
}

function abrirModalCheckout() {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;
  ultimoFocoModal = document.activeElement;
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const email = document.getElementById('email');
  window.requestAnimationFrame(() => {
    if (email) email.focus();
  });
}

function fecharModalCheckout() {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;
  modal.setAttribute('hidden', '');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (ultimoFocoModal && typeof ultimoFocoModal.focus === 'function') {
    ultimoFocoModal.focus({ preventScroll: true });
  }
  ultimoFocoModal = null;
}

function obterRotuloCheckout(planoId, faixaId) {
  const pid = Number(planoId);
  const fid = Number(faixaId);
  const plano = cachePlanos.find((item) => Number(item.id) === pid);
  const faixa =
    plano && Array.isArray(plano.faixas)
      ? plano.faixas.find((item) => Number(item.id) === fid)
      : null;

  if (plano && faixa) {
    return `${plano.nome} — ${faixa.nome} (R$ ${formatarMoedaBrl(faixa.preco)}/mês)`;
  }
  return 'Plano selecionado';
}

function definirSelecaoCheckout(planoId, faixaId) {
  const inputPlano = document.getElementById('field_plano_id');
  const inputFaixa = document.getElementById('field_faixa_id');
  const dica = document.getElementById('lead-selection-hint');

  if (inputPlano) inputPlano.value = String(planoId);
  if (inputFaixa) inputFaixa.value = String(faixaId);
  if (dica) {
    dica.textContent = `Selecionado: ${obterRotuloCheckout(planoId, faixaId)}. Preencha os dados e prossiga ao pagamento.`;
    dica.classList.add('is-ok');
  }
  abrirModalCheckout();
}

function abrirModalLeadDaFaixa() {
  const plano = document.getElementById('field_plano_id')?.value?.trim();
  const faixa = document.getElementById('field_faixa_id')?.value?.trim();
  const dica = document.getElementById('lead-selection-hint');

  if ((!plano || !faixa) && dica) {
    dica.classList.remove('is-ok');
    dica.innerHTML =
      'Nenhum plano selecionado. Feche e clique em <strong>Assinar</strong> em um dos planos antes de ir ao pagamento.';
  }
  abrirModalCheckout();
}

function vincularModalCheckout() {
  document.getElementById('checkoutModalClose')?.addEventListener('click', fecharModalCheckout);
  document.getElementById('checkoutModalBackdrop')?.addEventListener('click', fecharModalCheckout);
  document.getElementById('openLeadModalBtn')?.addEventListener('click', abrirModalLeadDaFaixa);

  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape') return;
    const modal = document.getElementById('checkoutModal');
    if (!modal || modal.hasAttribute('hidden')) return;
    fecharModalCheckout();
  });

  document.addEventListener('click', (evento) => {
    const botaoPlano = evento.target.closest('.plan-checkout-btn');
    if (botaoPlano && !botaoPlano.disabled) {
      const planoId = botaoPlano.getAttribute('data-plan-id');
      const faixaId = botaoPlano.getAttribute('data-faixa-id');
      if (planoId != null && faixaId != null && planoId !== '' && faixaId !== '') {
        definirSelecaoCheckout(planoId, faixaId);
      }
      return;
    }
    if (evento.target.closest('.open-lead-modal-btn')) {
      abrirModalLeadDaFaixa();
    }
  });
}

function vincularAlternanciaFaixas(toggle, panelWrap) {
  const botoes = toggle.querySelectorAll('.pricing-toggle-btn');
  const paineis = panelWrap.querySelectorAll('.pricing-panel');

  botoes.forEach((botao, indice) => {
    botao.addEventListener('click', () => {
      botoes.forEach((item) => item.classList.remove('active'));
      paineis.forEach((item) => item.classList.remove('active'));
      botao.classList.add('active');
      if (paineis[indice]) paineis[indice].classList.add('active');
    });
  });
}

function renderizarPrecificacao(planos, toggle, panelWrap) {
  const lista = [...planos].sort((a, b) => obterPesoPlano(a.nome) - obterPesoPlano(b.nome));
  const indiceDestaque = lista.findIndex((plano) =>
    String(plano.nome || '').toLowerCase().includes('profissional'),
  );
  const destaque = indiceDestaque >= 0 ? indiceDestaque : Math.min(1, lista.length - 1);

  const mapaFaixas = new Map();
  lista.forEach((plano) => {
    (Array.isArray(plano.faixas) ? plano.faixas : []).forEach((faixa) => {
      const chave = normalizarChaveFaixa(faixa.nome);
      if (!mapaFaixas.has(chave)) mapaFaixas.set(chave, faixa.nome);
    });
  });

  const faixas = Array.from(mapaFaixas.values());
  if (!faixas.some((nome) => normalizarChaveFaixa(nome) === normalizarChaveFaixa(FAIXA_ENTERPRISE))) {
    faixas.push(FAIXA_ENTERPRISE);
  }
  if (faixas.length === 0) return;

  toggle.innerHTML = '';
  panelWrap.innerHTML = '';

  faixas.forEach((nomeFaixa, indiceFaixa) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = `pricing-toggle-btn${indiceFaixa === 0 ? ' active' : ''}`;
    botao.textContent = nomeFaixa;
    botao.setAttribute('role', 'tab');
    toggle.appendChild(botao);

    let painel;
    if (faixaEhAcimaDe100(nomeFaixa)) {
      painel = criarPainelEnterprise(nomeFaixa, indiceFaixa === 0);
    } else {
      painel = document.createElement('div');
      painel.className = `pricing-panel pricing-panel-grid${indiceFaixa === 0 ? ' active' : ''}`;
      painel.setAttribute('data-band', normalizarChaveFaixa(nomeFaixa));

      lista.forEach((plano, indicePlano) => {
        const faixa = (Array.isArray(plano.faixas) ? plano.faixas : []).find(
          (item) => normalizarChaveFaixa(item.nome) === normalizarChaveFaixa(nomeFaixa),
        );
        if (faixa) {
          painel.appendChild(criarCardPlano(plano, faixa, indicePlano === destaque));
        }
      });
    }

    panelWrap.appendChild(painel);
  });
}

async function buscarPlanos() {
  const baseUrl = obterBaseUrl();
  const response = await fetch(`${baseUrl}/plano/publico`);
  if (!response.ok) return null;
  const payload = await response.json();
  if (!Array.isArray(payload) || payload.length === 0) return null;
  return payload.sort((a, b) => obterPesoPlano(a.nome) - obterPesoPlano(b.nome));
}

function vincularFormularioLead() {
  const formulario = document.getElementById('leadForm');
  if (!formulario) return;

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const botao = formulario.querySelector('button[type="submit"]');
    const textoBotao = botao ? botao.querySelector('.btn-text') : null;
    const mensagem = document.getElementById('form-message');
    const textoOriginal = textoBotao ? textoBotao.textContent : botao ? botao.textContent : '';

    const planoIdVal = document.getElementById('field_plano_id')?.value?.trim();
    const faixaIdVal = document.getElementById('field_faixa_id')?.value?.trim();

    if (!planoIdVal || !faixaIdVal) {
      if (mensagem) {
        mensagem.textContent =
          'Selecione um plano nos cards acima (botão Assinar) antes de continuar.';
        mensagem.style.display = 'block';
        mensagem.className = 'form-message error';
      }
      const dica = document.getElementById('lead-selection-hint');
      if (dica) {
        dica.classList.remove('is-ok');
        dica.innerHTML =
          'Nenhum plano selecionado. Feche e clique em <strong>Assinar</strong> em um dos planos.';
      }
      abrirModalCheckout();
      return;
    }

    const planoId = Number(planoIdVal);
    const faixaId = Number(faixaIdVal);
    if (!Number.isFinite(planoId) || !Number.isFinite(faixaId)) {
      if (mensagem) {
        mensagem.textContent = 'Seleção de plano inválida. Escolha novamente em Planos.';
        mensagem.style.display = 'block';
        mensagem.className = 'form-message error';
      }
      return;
    }

    if (textoBotao) textoBotao.textContent = 'Processando...';
    else if (botao) botao.textContent = 'Processando...';
    if (botao) botao.disabled = true;
    if (mensagem) mensagem.style.display = 'none';

    const corpoLead = {
      email: document.getElementById('email')?.value?.trim() || '',
      razao_social: document.getElementById('razao_social')?.value?.trim() || '',
      cnpj: document.getElementById('cnpj')?.value?.trim() || '',
      cep: document.getElementById('cep')?.value?.trim() || '',
      cpf_proprietario: document.getElementById('cpf_proprietario')?.value?.trim() || '',
    };
    const telefone = document.getElementById('telefone')?.value?.trim();
    if (telefone) corpoLead.telefone = telefone;

    const baseUrl = obterBaseUrl();

    try {
      const respostaLead = await fetch(`${baseUrl}/leads`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(corpoLead),
      });

      if (!respostaLead.ok) throw new Error(await interpretarErroApi(respostaLead));

      const dadosLead = await respostaLead.json();
      const leadId = dadosLead.lead_id ?? dadosLead.leadId;
      if (!leadId) throw new Error('Resposta da API sem identificador do lead.');

      if (textoBotao) textoBotao.textContent = 'Abrindo pagamento...';
      else if (botao) botao.textContent = 'Abrindo pagamento...';

      const respostaCobranca = await fetch(`${baseUrl}/cobrancas`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, plano_id: planoId, faixa_id: faixaId }),
      });

      if (!respostaCobranca.ok) throw new Error(await interpretarErroApi(respostaCobranca));

      const dadosCobranca = await respostaCobranca.json();
      const checkoutUrl = dadosCobranca.checkout_url ?? dadosCobranca.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error(
          'Não foi possível obter o link de pagamento. Tente novamente ou contate o suporte.',
        );
      }

      window.location.href = checkoutUrl;
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : 'Erro inesperado. Tente novamente.';
      if (mensagem) {
        mensagem.textContent = msg;
        mensagem.style.display = 'block';
        mensagem.className = 'form-message error';
      }
      if (textoBotao) textoBotao.textContent = textoOriginal;
      else if (botao) botao.textContent = textoOriginal;
      if (botao) botao.disabled = false;
    }
  });
}

export async function inicializarPlanosUi() {
  const toggle = document.getElementById('pricing-toggle');
  const panelWrap = document.getElementById('pricing-panel-wrap');
  if (!toggle || !panelWrap) return;

  vincularModalCheckout();
  vincularFormularioLead();

  let planos = Array.isArray(window.__PLANOS__) ? window.__PLANOS__ : null;
  if (!planos || planos.length === 0) {
    try {
      planos = await buscarPlanos();
    } catch {
      planos = null;
    }
  }

  if (!planos || planos.length === 0) return;

  cachePlanos = planos;

  if (toggle.children.length === 0) {
    renderizarPrecificacao(planos, toggle, panelWrap);
  }

  vincularAlternanciaFaixas(toggle, panelWrap);
}
