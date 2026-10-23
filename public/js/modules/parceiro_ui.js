const CHAVE_LOCAL_STORAGE = 'codigoConsultor';
const CHAVE_LEGADA_LOCAL_STORAGE = 'partner';
const CHAVE_ORIGEM_LOCAL_STORAGE = 'codigoConsultorOrigemUrl';

function obterBaseUrl() {
  if (typeof window.PONTO_AGIL_API === 'string' && window.PONTO_AGIL_API) {
    return window.PONTO_AGIL_API.replace(/\/$/, '');
  }
  if (window.__CONFIG__?.apiBaseUrl) {
    return String(window.__CONFIG__.apiBaseUrl).replace(/\/$/, '');
  }
  return 'http://localhost:8080';
}

function guardarCodigoConsultor(codigo) {
  const valor = String(codigo ?? '').trim();
  if (!valor) return;
  localStorage.setItem(CHAVE_LOCAL_STORAGE, valor);
  localStorage.setItem(CHAVE_LEGADA_LOCAL_STORAGE, valor);
  localStorage.setItem(CHAVE_ORIGEM_LOCAL_STORAGE, window.location.href);
}

export function obterCodigoConsultor() {
  return (
    localStorage.getItem(CHAVE_LOCAL_STORAGE) ||
    localStorage.getItem(CHAVE_LEGADA_LOCAL_STORAGE) ||
    ''
  ).trim();
}

export function obterOrigemConsultorUrl() {
  return (localStorage.getItem(CHAVE_ORIGEM_LOCAL_STORAGE) || window.location.href).trim();
}

function abrirModalParceiro() {
  const modal = document.getElementById('partnerModal');
  if (!modal) return;
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  window.requestAnimationFrame(() => document.getElementById('partner_nome')?.focus());
}

function fecharModalParceiro() {
  const modal = document.getElementById('partnerModal');
  if (!modal) return;
  modal.setAttribute('hidden', '');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function vincularModalParceiro() {
  if (document.body.dataset.partnerModalBound === 'true') return;
  document.body.dataset.partnerModalBound = 'true';

  document.querySelectorAll('[data-open-partner-modal]').forEach((botao) => {
    botao.addEventListener('click', abrirModalParceiro);
  });
  document.querySelectorAll('[data-close-partner-modal]').forEach((botao) => {
    botao.addEventListener('click', fecharModalParceiro);
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') fecharModalParceiro();
  });
}

function extrairMensagemErro(resposta) {
  return resposta
    .clone()
    .json()
    .then((payload) => payload.message || payload.mensagem || payload.error)
    .catch(() => resposta.text())
    .then((mensagem) => mensagem || 'Não foi possível enviar sua solicitação. Tente novamente.');
}

function vincularFormularioParceiro() {
  const formulario = document.getElementById('partnerForm');
  if (!formulario || formulario.dataset.bound === 'true') return;
  formulario.dataset.bound = 'true';

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const botao = formulario.querySelector('button[type="submit"]');
    const textoBotao = botao?.querySelector('.btn-text');
    const mensagem = document.getElementById('partner-form-message');
    const textoOriginal = textoBotao?.textContent || 'Quero ser Parceiro';

    if (textoBotao) textoBotao.textContent = 'Enviando...';
    if (botao) botao.disabled = true;
    if (mensagem) mensagem.style.display = 'none';

    const corpo = {
      nome: document.getElementById('partner_nome')?.value?.trim() || '',
      empresa: document.getElementById('partner_empresa')?.value?.trim() || '',
      email: document.getElementById('partner_email')?.value?.trim() || '',
      telefone: document.getElementById('partner_telefone')?.value?.trim() || '',
      mensagem: document.getElementById('partner_mensagem')?.value?.trim() || '',
    };

    try {
      const resposta = await fetch(`${obterBaseUrl()}/consultores/solicitacoes`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });

      if (!resposta.ok) throw new Error(await extrairMensagemErro(resposta));

      formulario.reset();
      if (mensagem) {
        mensagem.textContent = 'Solicitação enviada com sucesso. Nossa equipe vai analisar seu cadastro.';
        mensagem.className = 'form-message success';
        mensagem.style.display = 'block';
      }
    } catch (erro) {
      if (mensagem) {
        mensagem.textContent = erro instanceof Error ? erro.message : 'Erro inesperado. Tente novamente.';
        mensagem.className = 'form-message error';
        mensagem.style.display = 'block';
      }
    } finally {
      if (textoBotao) textoBotao.textContent = textoOriginal;
      if (botao) botao.disabled = false;
    }
  });
}

export function inicializarParceiro() {
  if (typeof window.__PARCEIRO__ === 'string' && window.__PARCEIRO__) {
    guardarCodigoConsultor(window.__PARCEIRO__);
  }

  const paramsUrl = new URLSearchParams(window.location.search);
  const codigoUrl = paramsUrl.get('codigoConsultor') || paramsUrl.get('partner');
  if (codigoUrl) guardarCodigoConsultor(codigoUrl);

  const hash = window.location.hash;
  if (hash.includes('?')) {
    const paramsHash = new URLSearchParams(hash.split('?')[1]);
    const codigoHash = paramsHash.get('codigoConsultor') || paramsHash.get('partner');
    if (codigoHash) guardarCodigoConsultor(codigoHash);
  }

  vincularModalParceiro();
  vincularFormularioParceiro();
}
