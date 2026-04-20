const baseUrl =
  typeof window.PONTO_AGIL_API === 'string' && window.PONTO_AGIL_API
    ? window.PONTO_AGIL_API.replace(/\/$/, '')
    : 'http://localhost:8080';

/** UUID do protocolo após consulta bem-sucedida + token (para POST replicar). */
const protocoloReplicarCtx = {
  protocoloUuid: null,
  token: ''
};

const MAX_ANEXOS_ACOMPANHAMENTO = 5;
const MAX_MB_ANEXO_ACOMPANHAMENTO = 20;

function fillSelect(selectEl, options) {
  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.id;
    option.textContent = opt.nome;
    selectEl.appendChild(option);
  });
}

function resetSelectKeepingPlaceholder(selectEl) {
  const first = selectEl.querySelector('option[value=""]');
  selectEl.innerHTML = '';
  if (first) {
    selectEl.appendChild(first);
  } else {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecione';
    placeholder.selected = true;
    placeholder.disabled = true;
    selectEl.appendChild(placeholder);
  }
}

function normalizeListPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [
    payload.categorias,
    payload.departamentos,
    payload.data,
    payload.items,
    payload.content,
    payload.resultado,
    payload.lista
  ].find(Array.isArray);

  return Array.isArray(candidates) ? candidates : [];
}

function firstStringFromObject(obj, keys) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const val = obj[key];
    if (val == null) continue;
    const str = String(val).trim();
    if (str) return str;
  }
  return '';
}

function mapSelectableItem(item, idKeys, nomeKeys) {
  if (!item) return null;

  if (typeof item === 'string') {
    const nome = item.trim();
    if (!nome) return null;
    return { id: nome, nome };
  }

  if (typeof item !== 'object') return null;

  const nomeStr = firstStringFromObject(item, nomeKeys);
  const idStrRaw = firstStringFromObject(item, idKeys);
  const idStr = idStrRaw || nomeStr;
  const nomeFinal = nomeStr || idStr;

  if (!idStr && !nomeFinal) return null;

  return { id: idStr || nomeFinal, nome: nomeFinal || idStr };
}

const CATEGORIA_ID_KEYS = ['valor', 'id', 'categoriaId', 'codigo', 'uuid', 'key'];
const CATEGORIA_NOME_KEYS = ['descricao', 'nome', 'titulo', 'label', 'name'];

const DEPARTAMENTO_ID_KEYS = ['id', 'departamentoId', 'codigo', 'uuid', 'key'];
const DEPARTAMENTO_NOME_KEYS = ['nome', 'descricao', 'name', 'titulo', 'label'];

function dedupeOptions(items) {
  const dedup = new Map();
  items.forEach((d) => {
    if (!dedup.has(d.id)) dedup.set(d.id, d);
  });
  return Array.from(dedup.values());
}

function sortOptionsByNome(items) {
  return [...items].sort((a, b) =>
    String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', {
      sensitivity: 'base'
    })
  );
}

function isUuid(val) {
  const s = String(val || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

function normalizeUuidLike(val) {
  const s = String(val || '').trim().replace(/^\{/, '').replace(/\}$/, '');

  // Alguns lugares removem o zero à esquerda do 1º bloco (7 chars).
  // Ex.: "107d15b-..." -> "0107d15b-..."
  const m = /^([0-9a-f]{7})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i.exec(s);
  if (m) return `0${m[1]}-${m[2]}-${m[3]}-${m[4]}-${m[5]}`;

  return s;
}

async function fetchBearerJson(path, token) {
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Erro HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchJson(path) {
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Erro HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * POST multipart: campos simples + anexos (parte repetida "anexos").
 * Compatível com Spring `List<MultipartFile> anexos`.
 */
async function postEnviarDenunciaMultipart(token, fields, files) {
  const url = new URL(`${baseUrl}/denuncia/enviar`);
  const formData = new FormData();

  Object.entries(fields || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'boolean') formData.append(k, v ? 'true' : 'false');
    else formData.append(k, String(v));
  });

  const arr = Array.isArray(files) ? files : Array.from(files || []);
  arr.forEach((f) => {
    formData.append('anexos', f);
  });

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${String(token || '').trim()}`
    },
    body: formData
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Erro HTTP ${response.status}`);
  }

  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function fetchCategoriasPorToken(token) {
  const data = await fetchBearerJson('/denuncia/categorias', token);
  const rawList = normalizeListPayload(data);
  const mapped = rawList
    .map((item) => mapSelectableItem(item, CATEGORIA_ID_KEYS, CATEGORIA_NOME_KEYS))
    .filter(Boolean);
  return sortOptionsByNome(dedupeOptions(mapped));
}

async function fetchDepartamentosPorToken(token) {
  const data = await fetchBearerJson('/departamento/por-token/listar', token);
  const rawList = normalizeListPayload(data);
  const mapped = rawList
    .map((item) => mapSelectableItem(item, DEPARTAMENTO_ID_KEYS, DEPARTAMENTO_NOME_KEYS))
    .filter(Boolean);
  return sortOptionsByNome(dedupeOptions(mapped));
}

async function fetchAcompanharPorProtocolo(uuid, token) {
  const safeUuid = encodeURIComponent(String(uuid || '').trim());
  const rawToken = String(token || '').trim();
  const safeToken = encodeURIComponent(rawToken);

  if (rawToken) {
    return fetchBearerJson(`/denuncia/acompanhamento/${safeUuid}?token=${safeToken}`, rawToken);
  }

  // Fallback: permite consulta pública (se o backend suportar).
  return fetchJson(`/denuncia/acompanhamento/${safeUuid}`);
}

/**
 * POST multipart: mensagem + anexos (parte repetida "anexos").
 * URL: /denuncia/replicar/{uuid}?token=...
 */
async function postReplicarAcompanhamentoMultipart(uuid, token, mensagem, files) {
  const id = String(uuid || '').trim();
  const rawToken = String(token || '').trim();
  const path = `/denuncia/acompanhamento/replicar/${encodeURIComponent(id)}`;
  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.set('token', rawToken);

  const formData = new FormData();
  formData.append('mensagem', mensagem);

  const arr = Array.isArray(files) ? files : Array.from(files || []);
  arr.forEach((f) => {
    formData.append('anexos', f);
  });

  const headers = { Accept: 'application/json' };
  if (rawToken) headers.Authorization = `Bearer ${rawToken}`;

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Erro HTTP ${response.status}`);
  }

  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function getProtocoloConsultaUiElements() {
  return {
    protocoloStatusBadge: document.getElementById('protocoloStatusBadge'),
    protocoloValor: document.getElementById('protocoloValor'),
    protocoloAnonima: document.getElementById('protocoloAnonima'),
    protocoloCategoria: document.getElementById('protocoloCategoria'),
    protocoloDepartamento: document.getElementById('protocoloDepartamento'),
    protocoloDataOcorrido: document.getElementById('protocoloDataOcorrido'),
    protocoloDataAbertura: document.getElementById('protocoloDataAbertura'),
    protocoloDescricao: document.getElementById('protocoloDescricao'),
    protocoloDenunciaAnexos: document.getElementById('protocoloDenunciaAnexos'),
    protocoloAcompanhamentosList: document.getElementById('protocoloAcompanhamentosList')
  };
}

function extrairAnexosDenuncia(data) {
  if (!data || typeof data !== 'object') return [];
  const candidatos = [data.anexos, data.Anexos, data.listaAnexos, data.arquivos, data.files];
  const arr = candidatos.find(Array.isArray);
  return Array.isArray(arr) ? arr : [];
}

function truncarNomeArquivo(nome, limite) {
  const s = String(nome || '').trim();
  const n = Number(limite);
  if (!s) return '';
  if (!Number.isFinite(n) || n <= 0) return s;
  if (s.length <= n) return s;
  if (n <= 1) return '…';
  return `${s.slice(0, n - 1)}…`;
}

function getTokenParaPreview() {
  const fromSession = (sessionStorage.getItem('denunciaToken') || '').trim();
  if (fromSession) return fromSession;
  const params = new URLSearchParams(window.location.search);
  return (params.get('token') || '').trim();
}

function initAnexoModal() {
  const modal = document.getElementById('anexoModal');
  const body = document.getElementById('anexoModalBody');
  const titleEl = document.getElementById('anexoModalTitulo');
  const errEl = document.getElementById('anexoModalErro');
  if (!modal || !body || !titleEl || !errEl) return null;

  let currentObjectUrl = '';

  function cleanupObjectUrl() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = '';
    }
  }

  function close() {
    cleanupObjectUrl();
    body.replaceChildren();
    errEl.textContent = '';
    errEl.classList.remove('is-visible');
    modal.classList.add('is-hidden');
  }

  modal.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-modal-close="1"]')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('is-hidden')) close();
  });

  function tipoParaPreview(fileOrBlob, nomeFallback) {
    const t = fileOrBlob && typeof fileOrBlob.type === 'string' ? fileOrBlob.type.trim() : '';
    if (t) return t;
    const n = String(nomeFallback || '').toLowerCase();
    if (n.endsWith('.pdf')) return 'application/pdf';
    if (/\.(jpe?g|jfif)$/i.test(n)) return 'image/jpeg';
    if (n.endsWith('.png')) return 'image/png';
    if (n.endsWith('.gif')) return 'image/gif';
    if (n.endsWith('.webp')) return 'image/webp';
    if (n.endsWith('.svg')) return 'image/svg+xml';
    return 'application/octet-stream';
  }

  function renderBlobNoFetch(blobLike, displayName) {
    cleanupObjectUrl();
    body.replaceChildren();
    const type = tipoParaPreview(blobLike, displayName);
    currentObjectUrl = URL.createObjectURL(blobLike);

    if (type.startsWith('image/')) {
      const img = document.createElement('img');
      img.className = 'modal__viewer modal__viewer--img';
      img.alt = displayName || 'Anexo';
      img.src = currentObjectUrl;
      body.appendChild(img);
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.className = 'modal__viewer';
    iframe.src = currentObjectUrl;
    iframe.title = displayName || 'Anexo';
    body.appendChild(iframe);
  }

  /** Arquivo ainda não enviado (input[type=file]) — preview local. */
  function openFile(file) {
    if (!(file instanceof File)) return;
    cleanupObjectUrl();
    body.replaceChildren();
    errEl.textContent = '';
    errEl.classList.remove('is-visible');

    const name = file.name || 'Anexo';
    titleEl.textContent = name;
    modal.classList.remove('is-hidden');

    try {
      renderBlobNoFetch(file, name);
    } catch (err) {
      body.replaceChildren();
      errEl.textContent = mensagemErroAmigavel(err);
      errEl.classList.add('is-visible');
    }
  }

  async function open(url, filename) {
    cleanupObjectUrl();
    body.replaceChildren();
    errEl.textContent = '';
    errEl.classList.remove('is-visible');

    titleEl.textContent = filename || 'Anexo';
    modal.classList.remove('is-hidden');

    const token = getTokenParaPreview();
    const loading = document.createElement('p');
    loading.textContent = 'Carregando...';
    loading.style.margin = '0';
    body.appendChild(loading);

    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: '*/*',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(text || `Erro HTTP ${resp.status}`);
      }

      const blob = await resp.blob();
      body.replaceChildren();
      renderBlobNoFetch(blob, filename || 'Anexo');
    } catch (err) {
      body.replaceChildren();
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Abrir em outra aba';
      body.appendChild(a);
      errEl.textContent = mensagemErroAmigavel(err);
      errEl.classList.add('is-visible');
    }
  }

  return { open, openFile, close };
}

const anexoModalApi = initAnexoModal();

function getAnexoDenunciaUrl(idAnexo, protocolo) {
  const id = String(idAnexo ?? '').trim();
  const p = String(protocolo ?? '').trim();
  if (!id || !p) return '';
  const url = new URL(`${baseUrl}/denuncia/anexo/${encodeURIComponent(id)}`);
  url.searchParams.set('protocolo', p);
  return url.toString();
}

function renderAnexosDenunciaBotoes(container, protocolo, anexos) {
  if (!container) return;
  container.replaceChildren();

  const list = Array.isArray(anexos) ? anexos : [];
  if (list.length === 0) {
    container.textContent = '—';
    return;
  }

  list.forEach((a) => {
    const nome = nomeAnexoParaChat(a);
    if (!nome) return;
    const id = a && typeof a === 'object' ? a.id : '';
    const href = getAnexoDenunciaUrl(id, protocolo);

    if (href) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-secondary protocolo-denuncia-anexo-btn';
      btn.textContent = truncarNomeArquivo(nome, 42);
      btn.title = nome;
      btn.addEventListener('click', () => {
        if (anexoModalApi) anexoModalApi.open(href, nome);
        else window.open(href, '_blank', 'noopener,noreferrer');
      });
      container.appendChild(btn);
      return;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary protocolo-denuncia-anexo-btn';
    btn.textContent = truncarNomeArquivo(nome, 42);
    btn.title = nome;
    btn.addEventListener('click', () => {
      alert(nome);
    });
    container.appendChild(btn);
  });

  if (container.childElementCount === 0) {
    container.textContent = '—';
  }
}

function refreshProtocoloConsultaViewFromApi() {
  const uuid = protocoloReplicarCtx.protocoloUuid;
  const tok = protocoloReplicarCtx.token;
  if (!uuid || !tok) return Promise.resolve();

  return fetchAcompanharPorProtocolo(uuid, tok).then((data) => {
    const els = getProtocoloConsultaUiElements();
    preencherProtocoloConsultaUI(data, els);
    const det = document.getElementById('protocoloDetalhe');
    const result = document.getElementById('protocoloResult');
    if (det) det.classList.remove('is-hidden');
    if (result) result.classList.remove('is-hidden');
    const msgEl = document.getElementById('protocoloResultMessage');
    if (msgEl) {
      msgEl.textContent = '';
      msgEl.classList.add('is-hidden');
      msgEl.classList.remove('is-error');
    }
  });
}

function getDenunciaDraft() {
  try {
    const raw = sessionStorage.getItem('denunciaDraft');
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && typeof d === 'object' ? d : null;
  } catch (_) {
    return null;
  }
}

function bytesToMb(bytes) {
  return bytes / (1024 * 1024);
}

function setInputFileList(input, files) {
  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  input.files = dt.files;
}

function arquivoKeyInputFile(f) {
  return `${f.name}\0${f.size}\0${f.lastModified}`;
}

function mergeUniqueFiles(prev, incoming) {
  const map = new Map();
  for (const f of prev) map.set(arquivoKeyInputFile(f), f);
  for (const f of incoming) map.set(arquivoKeyInputFile(f), f);
  return Array.from(map.values());
}

function setError(el, on) {
  if (!el) return;
  el.classList.toggle('is-visible', Boolean(on));
}

function setTextError(el, on, message) {
  if (!el) return;
  if (!on) {
    el.textContent = '';
    setError(el, false);
    return;
  }
  if (message) el.textContent = message;
  setError(el, true);
}

/** Converte falhas técnicas em texto claro para quem está preenchendo o formulário. */
function mensagemErroAmigavel(err) {
  if (err instanceof TypeError && String(err.message).includes('fetch')) {
    return 'Não conseguimos conectar. Confira sua internet e tente de novo.';
  }
  if (!(err instanceof Error) || !err.message) {
    return 'Algo não saiu como esperado. Tente novamente em alguns instantes.';
  }
  const m = err.message.trim();
  if (/^Erro HTTP\s*401\b/i.test(m) || /^Erro HTTP\s*403\b/i.test(m)) {
    return 'Não foi possível validar seu acesso. O link pode estar incorreto ou expirado — peça um novo link se precisar.';
  }
  if (/^Erro HTTP\s*404\b/i.test(m)) {
    return 'Não encontramos essa informação no momento. Se o problema continuar, fale com o suporte.';
  }
  if (/^Erro HTTP\s*5\d\d\b/i.test(m)) {
    return 'O serviço está temporariamente indisponível. Tente de novo daqui a pouco.';
  }
  if (m.length > 0 && m.length < 160 && !/[<>]/.test(m) && !m.includes('{')) {
    return m;
  }
  return 'Não conseguimos carregar os dados agora. Tente novamente em instantes.';
}

function extrairDescricaoProtocolo(data) {
  if (!data || typeof data !== 'object') return '';
  if (data.descricao != null) return String(data.descricao);
  if (data['descrição'] != null) return String(data['descrição']);
  return '';
}

function formatDataAberturaProtocolo(iso) {
  if (iso == null || iso === '') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** LocalDate em JSON costuma vir como "yyyy-MM-dd" ou [ano, mês, dia]. */
function formatDataOcorridoProtocolo(val) {
  if (val == null || val === '') return '—';
  if (Array.isArray(val) && val.length >= 3) {
    const y = Number(val[0]);
    const mo = Number(val[1]);
    const da = Number(val[2]);
    if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(da)) {
      const dt = new Date(y, mo - 1, da);
      if (!Number.isNaN(dt.getTime())) {
        return dt.toLocaleDateString('pt-BR', { dateStyle: 'long' });
      }
    }
  }
  const s = String(val).trim();
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (isoDate) {
    const y = Number(isoDate[1]);
    const mo = Number(isoDate[2]);
    const da = Number(isoDate[3]);
    const dt = new Date(y, mo - 1, da);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('pt-BR', { dateStyle: 'long' });
    }
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('pt-BR', { dateStyle: 'long' });
  }
  return s;
}

/** ISO-8601 ou array Jackson [ano, mês, dia, hora, min, seg, nano]. */
function parseBackendDateTime(val) {
  if (val == null || val === '') return null;
  if (Array.isArray(val) && val.length >= 5) {
    const y = Number(val[0]);
    const mo = Number(val[1]);
    const da = Number(val[2]);
    const h = Number(val[3]);
    const mi = Number(val[4]);
    const se = val.length > 5 ? Number(val[5]) : 0;
    if (
      [y, mo, da, h, mi, se].every((n) => Number.isFinite(n)) &&
      mo >= 1 &&
      mo <= 12 &&
      da >= 1 &&
      da <= 31
    ) {
      const d = new Date(y, mo - 1, da, h, mi, se);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDataHoraAcompanhamento(val) {
  const d = parseBackendDateTime(val);
  if (!d) return val != null && val !== '' ? String(val) : '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Alinha bolhas: RH/sistema à esquerda; denunciante à direita. */
function chatRoleFromAutorDenuncia(autor) {
  const a = String(autor || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (!a) return 'outro';
  if (
    a === 'RH' ||
    a === 'SISTEMA' ||
    a.includes('ADMIN') ||
    a.includes('GESTOR') ||
    a.startsWith('RH_') ||
    a.endsWith('_RH')
  ) {
    return 'rh';
  }
  if (a === 'DENUNCIANTE' || a.includes('DENUNCIANTE')) return 'denunciante';
  return 'outro';
}

function labelAutorAcompanhamento(autor) {
  const a = String(autor || '').trim().toUpperCase().replace(/\s+/g, '_');
  const map = {
    RH: 'Equipe (RH)',
    DENUNCIANTE: 'Denunciante',
    SISTEMA: 'Sistema'
  };
  if (map[a]) return map[a];
  if (!autor) return 'Acompanhamento';
  return String(autor).replace(/_/g, ' ');
}

function safeHttpUrl(href) {
  if (href == null || href === '') return '';
  try {
    const u = new URL(String(href).trim(), window.location.origin);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch (_) {
    /* ignore */
  }
  return '';
}

const NOME_ANEXO_CHAT_KEYS = [
  'nome',
  'nomeArquivo',
  'nomeOriginal',
  'fileName',
  'filename',
  'name',
  'titulo',
  'descricao'
];

/** Lista de acompanhamentos no payload da consulta ao protocolo (várias convenções de API). */
function extrairListaAcompanhamentos(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const candidatos = [
    data.acompanhamentos,
    data.Acompanhamentos,
    data.acompanhamentoList,
    data.acompanhamentoDTOList,
    data.mensagens,
    data.historico
  ];
  const arr = candidatos.find(Array.isArray);
  return Array.isArray(arr) ? arr : [];
}

/** Anexos de um item de acompanhamento (objetos `{ id, nome }` ou equivalentes). */
function extrairAnexosDoItem(item) {
  if (!item || typeof item !== 'object') return [];
  const chaves = ['anexos', 'Anexos', 'listaAnexos', 'anexoList', 'arquivos', 'files'];
  for (const k of chaves) {
    if (!Object.prototype.hasOwnProperty.call(item, k)) continue;
    const v = item[k];
    if (v == null) continue;
    if (typeof v === 'string') {
      try {
        const p = JSON.parse(v);
        if (Array.isArray(p)) return p;
      } catch {
        /* não é JSON */
      }
      continue;
    }
    if (Array.isArray(v)) return v;
  }
  return [];
}

function nomeAnexoParaChat(arq) {
  if (arq == null) return '';
  if (typeof arq === 'string') {
    const s = String(arq).trim();
    return s || '';
  }
  if (typeof arq === 'number' && Number.isFinite(arq)) {
    return `Anexo #${arq}`;
  }
  if (typeof arq !== 'object') return '';
  const nome = firstStringFromObject(arq, NOME_ANEXO_CHAT_KEYS);
  if (nome) return nome;
  if (arq.id != null) return `Arquivo (${arq.id})`;
  return 'Arquivo';
}

function hrefBrutoAnexo(arq) {
  if (!arq || typeof arq !== 'object') return '';
  if (arq.url != null) return arq.url;
  if (arq.link != null) return arq.link;
  if (arq.downloadUrl != null) return arq.downloadUrl;
  if (arq.href != null) return arq.href;
  if (arq.caminho != null) return arq.caminho;
  return '';
}

function getAnexoAcompanhamentoUrl(idAnexo, protocolo) {
  const id = String(idAnexo ?? '').trim();
  const p = String(protocolo ?? '').trim();
  if (!id || !p) return '';
  const url = new URL(`${baseUrl}/denuncia/acompanhamento/anexo/${encodeURIComponent(id)}`);
  url.searchParams.set('protocolo', p);
  return url.toString();
}

function appendAnexosAcompanhamento(bubbleEl, protocolo, anexos) {
  if (!Array.isArray(anexos) || anexos.length === 0) return;
  const ul = document.createElement('ul');
  ul.className = 'protocolo-chat-anexos-list';
  anexos.forEach((arq) => {
    const nome = nomeAnexoParaChat(arq);
    if (!nome) return;
    const id = arq && typeof arq === 'object' ? arq.id : '';
    const hrefFromId = getAnexoAcompanhamentoUrl(id, protocolo);
    const hrefRaw =
      typeof arq === 'object' && arq != null ? hrefBrutoAnexo(arq) : '';
    const href = hrefFromId || safeHttpUrl(hrefRaw);
    const li = document.createElement('li');
    if (href) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'protocolo-chat-anexo-btn';
      btn.textContent = nome;
      btn.title = nome;
      btn.addEventListener('click', () => {
        if (anexoModalApi) anexoModalApi.open(href, nome);
        else window.open(href, '_blank', 'noopener,noreferrer');
      });
      li.appendChild(btn);
    } else {
      li.textContent = nome;
      li.title = nome;
    }
    ul.appendChild(li);
  });
  if (ul.childElementCount === 0) return;
  const wrap = document.createElement('div');
  wrap.className = 'protocolo-chat-anexos';
  const title = document.createElement('span');
  title.className = 'protocolo-chat-anexos-title';
  title.textContent = 'Anexos';
  wrap.appendChild(title);
  wrap.appendChild(ul);
  bubbleEl.appendChild(wrap);
}

function compareAcompanhamentoPorId(a, b) {
  const idA = a && a.id != null ? Number(a.id) : NaN;
  const idB = b && b.id != null ? Number(b.id) : NaN;
  const okA = Number.isFinite(idA);
  const okB = Number.isFinite(idB);
  if (okA && okB) return idA - idB;
  if (okA && !okB) return -1;
  if (!okA && okB) return 1;
  const ta = parseBackendDateTime(a && a.dataHoraEnvio)?.getTime() ?? 0;
  const tb = parseBackendDateTime(b && b.dataHoraEnvio)?.getTime() ?? 0;
  return ta - tb;
}

function scrollChatAteFinal(container) {
  if (!container) return;
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

function renderAcompanhamentosChat(container, protocolo, list) {
  if (!container) return;
  container.textContent = '';
  container.classList.remove('protocolo-chat-root--empty');

  if (!Array.isArray(list) || list.length === 0) {
    container.classList.add('protocolo-chat-root--empty');
    const p = document.createElement('p');
    p.className = 'protocolo-chat-empty';
    p.textContent = 'Nenhum acompanhamento registrado.';
    container.appendChild(p);
    return;
  }

  const sorted = [...list].sort(compareAcompanhamentoPorId);

  sorted.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const role = chatRoleFromAutorDenuncia(item.autor);
    const row = document.createElement('div');
    row.className =
      role === 'denunciante'
        ? 'protocolo-chat-row protocolo-chat-row--end'
        : role === 'rh'
          ? 'protocolo-chat-row protocolo-chat-row--start'
          : 'protocolo-chat-row protocolo-chat-row--start';

    const bubble = document.createElement('div');
    bubble.className =
      role === 'denunciante'
        ? 'protocolo-chat-bubble protocolo-chat-bubble--denunciante'
        : role === 'rh'
          ? 'protocolo-chat-bubble protocolo-chat-bubble--rh'
          : 'protocolo-chat-bubble protocolo-chat-bubble--outro';

    const meta = document.createElement('div');
    meta.className = 'protocolo-chat-meta';
    const autorEl = document.createElement('span');
    autorEl.className = 'protocolo-chat-autor';
    autorEl.textContent = labelAutorAcompanhamento(item.autor);
    const horaEl = document.createElement('span');
    horaEl.className = 'protocolo-chat-hora';
    horaEl.textContent = formatDataHoraAcompanhamento(item.dataHoraEnvio);
    meta.appendChild(autorEl);
    meta.appendChild(horaEl);
    bubble.appendChild(meta);

    const msg = document.createElement('p');
    msg.className = 'protocolo-chat-msg';
    msg.textContent =
      item.mensagem != null && String(item.mensagem).trim() !== ''
        ? String(item.mensagem)
        : '(Sem mensagem)';
    bubble.appendChild(msg);

    appendAnexosAcompanhamento(bubble, protocolo, extrairAnexosDoItem(item));

    row.appendChild(bubble);
    container.appendChild(row);
  });

  scrollChatAteFinal(container);
}

function labelStatusProtocolo(status) {
  const s = String(status || '').trim();
  if (!s) return '—';
  const u = s.toUpperCase().replace(/\s+/g, '_');
  const map = {
    RECEBIDA: 'Recebida',
    REGISTRADA: 'Registrada',
    EM_ANALISE: 'Em análise',
    DEFERIDA: 'Deferida',
    INDEFERIDA: 'Indeferida',
    ENCERRADA: 'Encerrada',
    ARQUIVADA: 'Arquivada',
    CANCELADA: 'Cancelada'
  };
  return map[u] || s;
}

/** @returns {'' | 'neutral' | 'warning' | 'danger'} */
function toneStatusProtocolo(status) {
  const u = String(status || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (['ENCERRADA', 'ARQUIVADA', 'CANCELADA', 'FINALIZADA'].includes(u)) return 'neutral';
  if (['REJEITADA', 'INDEFERIDA'].includes(u)) return 'danger';
  if (['EM_ANALISE', 'PENDENTE', 'EM_ANDAMENTO'].includes(u)) return 'warning';
  return '';
}

function preencherProtocoloConsultaUI(data, els) {
  const desc = extrairDescricaoProtocolo(data);
  const statusRaw = data.status != null ? String(data.status) : '';
  const tone = toneStatusProtocolo(statusRaw);

  if (els.protocoloStatusBadge) {
    els.protocoloStatusBadge.textContent = labelStatusProtocolo(statusRaw);
    if (tone) els.protocoloStatusBadge.setAttribute('data-tone', tone);
    else els.protocoloStatusBadge.removeAttribute('data-tone');
  }
  if (els.protocoloValor) {
    els.protocoloValor.textContent = data.protocolo != null ? String(data.protocolo) : '—';
  }
  if (els.protocoloAnonima) {
    els.protocoloAnonima.textContent =
      data.anonima === true ? 'Sim' : data.anonima === false ? 'Não' : '—';
  }
  if (els.protocoloCategoria) {
    els.protocoloCategoria.textContent = data.categoria != null ? String(data.categoria) : '—';
  }
  if (els.protocoloDepartamento) {
    els.protocoloDepartamento.textContent =
      data.departamento != null ? String(data.departamento) : '—';
  }
  if (els.protocoloDataOcorrido) {
    els.protocoloDataOcorrido.textContent = formatDataOcorridoProtocolo(data.dataOcorrido);
  }
  if (els.protocoloDataAbertura) {
    els.protocoloDataAbertura.textContent = formatDataAberturaProtocolo(data.dataAbertura);
  }
  if (els.protocoloDescricao) {
    els.protocoloDescricao.textContent = desc || '—';
  }

  renderAnexosDenunciaBotoes(
    els.protocoloDenunciaAnexos,
    data && typeof data === 'object' ? data.protocolo : '',
    extrairAnexosDenuncia(data)
  );

  const list = extrairListaAcompanhamentos(data);
  renderAcompanhamentosChat(
    els.protocoloAcompanhamentosList,
    data && typeof data === 'object' ? data.protocolo : '',
    list
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const pageTitleEl = document.querySelector('main.card h1');
  const messageEl = document.getElementById('message');
  const btnNovaDenuncia = document.getElementById('btnNovaDenuncia');
  const btnConsultarProtocolo = document.getElementById('btnConsultarProtocolo');
  const protocoloBox = document.getElementById('protocoloBox');
  const protocoloChatAside = document.getElementById('protocoloChatAside');
  const denunciasShell = document.querySelector('.denuncias-shell');
  const protocoloForm = document.getElementById('protocoloForm');
  const protocoloNumeroEl = document.getElementById('protocoloNumero');
  const protocoloResultEl = document.getElementById('protocoloResult');
  const protocoloResultMessageEl = document.getElementById('protocoloResultMessage');
  const protocoloDetalheEl = document.getElementById('protocoloDetalhe');
  const protocoloStatusBadgeEl = document.getElementById('protocoloStatusBadge');
  const protocoloValorEl = document.getElementById('protocoloValor');
  const protocoloAnonimaEl = document.getElementById('protocoloAnonima');
  const protocoloCategoriaEl = document.getElementById('protocoloCategoria');
  const protocoloDepartamentoEl = document.getElementById('protocoloDepartamento');
  const protocoloDataOcorridoEl = document.getElementById('protocoloDataOcorrido');
  const protocoloDataAberturaEl = document.getElementById('protocoloDataAbertura');
  const protocoloDescricaoEl = document.getElementById('protocoloDescricao');
  const protocoloDenunciaAnexosEl = document.getElementById('protocoloDenunciaAnexos');
  const protocoloAcompanhamentosListEl = document.getElementById('protocoloAcompanhamentosList');
  const btnConsultar = document.getElementById('btnConsultar');

  const protocoloUiEls = {
    protocoloStatusBadge: protocoloStatusBadgeEl,
    protocoloValor: protocoloValorEl,
    protocoloAnonima: protocoloAnonimaEl,
    protocoloCategoria: protocoloCategoriaEl,
    protocoloDepartamento: protocoloDepartamentoEl,
    protocoloDataOcorrido: protocoloDataOcorridoEl,
    protocoloDataAbertura: protocoloDataAberturaEl,
    protocoloDescricao: protocoloDescricaoEl,
    protocoloDenunciaAnexos: protocoloDenunciaAnexosEl,
    protocoloAcompanhamentosList: protocoloAcompanhamentosListEl
  };

  function showProtocoloFeedback(message, isError) {
    if (protocoloDetalheEl) protocoloDetalheEl.classList.add('is-hidden');
    if (protocoloResultMessageEl) {
      protocoloResultMessageEl.textContent = message;
      protocoloResultMessageEl.classList.toggle('is-error', Boolean(isError));
      protocoloResultMessageEl.classList.remove('is-hidden');
    }
  }

  function hideProtocoloFeedback() {
    if (protocoloResultMessageEl) {
      protocoloResultMessageEl.textContent = '';
      protocoloResultMessageEl.classList.add('is-hidden');
      protocoloResultMessageEl.classList.remove('is-error');
    }
  }

  function showProtocoloDetalhe(data) {
    hideProtocoloFeedback();
    preencherProtocoloConsultaUI(data, protocoloUiEls);
    if (protocoloDetalheEl) protocoloDetalheEl.classList.remove('is-hidden');
  }

  const params = new URLSearchParams(window.location.search);
  const draftPeek = getDenunciaDraft();

  let token =
    (params.get('token') || '').trim() ||
    (sessionStorage.getItem('denunciaToken') || '').trim() ||
    (draftPeek && draftPeek.token != null && String(draftPeek.token).trim()) ||
    '';

  protocoloReplicarCtx.token = token;

  let cpf =
    (params.get('cpf') || '').trim() ||
    (draftPeek && draftPeek.cpf != null ? String(draftPeek.cpf).trim() : '') ||
    '';

  const tokenValue = document.getElementById('tokenValue');
  const cpfValue = document.getElementById('cpfValue');

  if (token && tokenValue) tokenValue.textContent = token;
  if (cpf && cpfValue) cpfValue.textContent = cpf;

  if (token) sessionStorage.setItem('denunciaToken', token);

  const categoriaEl = document.getElementById('categoria');
  const departamentoEl = document.getElementById('departamento');
  const categoriaErrorEl = document.getElementById('categoriaError');
  const departamentoErrorEl = document.getElementById('departamentoError');
  const form = document.getElementById('denunciaForm');
  const descricaoEl = document.getElementById('descricao');
  const descricaoCountEl = document.getElementById('descricaoCount');
  const descricaoErrorEl = document.getElementById('descricaoError');
  const anexosEl = document.getElementById('anexos');
  const anexosInfoEl = document.getElementById('anexosInfo');
  const anexosErrorEl = document.getElementById('anexosError');
  const btnAnexosDenuncia = document.getElementById('denunciaBtnAnexos');
  const btnRevisar = document.getElementById('btnRevisar');
  const dataEl = document.getElementById('dataAproximada');
  const denunciaReviewEl = document.getElementById('denunciaReview');
  const denunciaReviewGridEl = document.getElementById('denunciaReviewGrid');
  const denunciaReviewVoltarEl = document.getElementById('denunciaReviewVoltar');
  const denunciaReviewConfirmarEl = document.getElementById('denunciaReviewConfirmar');
  const denunciaReviewErroEl = document.getElementById('denunciaReviewErro');

  if (
    !categoriaEl ||
    !departamentoEl ||
    !form ||
    !descricaoEl ||
    !descricaoCountEl ||
    !anexosEl ||
    !anexosInfoEl ||
    !btnAnexosDenuncia ||
    !btnRevisar ||
    !dataEl ||
    !denunciaReviewEl ||
    !denunciaReviewGridEl ||
    !denunciaReviewVoltarEl ||
    !denunciaReviewConfirmarEl ||
    !denunciaReviewErroEl
  ) {
    return;
  }

  resetSelectKeepingPlaceholder(categoriaEl);
  resetSelectKeepingPlaceholder(departamentoEl);
  setTextError(categoriaErrorEl, false, '');
  setTextError(departamentoErrorEl, false, '');

  categoriaEl.disabled = true;
  departamentoEl.disabled = true;
  btnRevisar.disabled = true;

  let listsLoadedOk = false;

  function hasSelectableOptions(selectEl) {
    return Array.from(selectEl.options || []).some((opt) => Boolean(opt.value));
  }

  (async () => {
    listsLoadedOk = false;
    btnRevisar.disabled = true;

    let categoriasOk = false;
    let departamentosOk = false;

    try {
      if (!token) {
        resetSelectKeepingPlaceholder(categoriaEl);
        resetSelectKeepingPlaceholder(departamentoEl);
        const semToken =
          'Abra este formulário pelo link completo que você recebeu — ele precisa incluir o código de acesso (?token=...) no endereço.';
        setTextError(categoriaErrorEl, true, semToken);
        setTextError(departamentoErrorEl, true, semToken);
        categoriaEl.disabled = true;
        departamentoEl.disabled = true;
        listsLoadedOk = false;
        btnRevisar.disabled = true;
        return;
      }

      const loadCategorias = async () => {
        try {
          const categorias = await fetchCategoriasPorToken(token);
          resetSelectKeepingPlaceholder(categoriaEl);

          if (categorias.length === 0) {
            setTextError(
              categoriaErrorEl,
              true,
              'Não há categorias disponíveis no momento. Atualize a página ou tente de novo mais tarde.'
            );
            categoriasOk = false;
            return;
          }

          fillSelect(categoriaEl, categorias);
          setTextError(categoriaErrorEl, false, '');
          categoriasOk = true;
        } catch (err) {
          resetSelectKeepingPlaceholder(categoriaEl);
          setTextError(
            categoriaErrorEl,
            true,
            `Não foi possível carregar as categorias. ${mensagemErroAmigavel(err)}`
          );
          categoriasOk = false;
        }
      };

      const loadDepartamentos = async () => {
        try {
          const departamentos = await fetchDepartamentosPorToken(token);
          resetSelectKeepingPlaceholder(departamentoEl);

          if (departamentos.length === 0) {
            setTextError(
              departamentoErrorEl,
              true,
              'Não há departamentos disponíveis no momento. Atualize a página ou tente de novo mais tarde.'
            );
            departamentosOk = false;
            return;
          }

          fillSelect(departamentoEl, departamentos);
          setTextError(departamentoErrorEl, false, '');
          departamentosOk = true;
        } catch (err) {
          resetSelectKeepingPlaceholder(departamentoEl);
          setTextError(
            departamentoErrorEl,
            true,
            `Não foi possível carregar os departamentos. ${mensagemErroAmigavel(err)}`
          );
          departamentosOk = false;
        }
      };

      await Promise.all([loadCategorias(), loadDepartamentos()]);

      listsLoadedOk = categoriasOk && departamentosOk && hasSelectableOptions(categoriaEl) && hasSelectableOptions(departamentoEl);

      categoriaEl.disabled = !categoriasOk || !hasSelectableOptions(categoriaEl);
      departamentoEl.disabled = !departamentosOk || !hasSelectableOptions(departamentoEl);
      btnRevisar.disabled = !listsLoadedOk;

      if (listsLoadedOk) {
        aplicarRascunhoSalvo();
      }
    } catch (_) {
      listsLoadedOk = false;
      categoriaEl.disabled = true;
      departamentoEl.disabled = true;
      btnRevisar.disabled = true;
    }
  })();

  function aplicarRascunhoSalvo() {
    const draft = getDenunciaDraft();
    if (!draft) return;

    if (draft.categoria != null && String(draft.categoria) !== '') {
      categoriaEl.value = String(draft.categoria);
    }
    if (draft.departamento != null && String(draft.departamento) !== '') {
      departamentoEl.value = String(draft.departamento);
    }
    if (draft.dataAproximada) {
      dataEl.value = draft.dataAproximada;
    }
    if (draft.descricao != null) {
      descricaoEl.value = draft.descricao;
    }

    updateDescricaoUi();
    validateAnexos();
  }

  function updateDescricaoUi() {
    const len = (descricaoEl.value || '').length;
    descricaoCountEl.textContent = `${len}/5000`;
    const isValid = len >= 3 && len <= 5000;
    let msg = '';
    if (!isValid) {
      if (len === 0) {
        msg = 'Conte com calma o que aconteceu aqui — é o principal para entendermos sua denúncia (mínimo de 3 caracteres).';
      } else if (len < 3) {
        msg = 'Quase lá: escreva pelo menos 3 caracteres para podermos seguir.';
      } else {
        msg = 'O texto passou do limite de 5.000 caracteres. Você pode resumir mantendo o que for mais importante.';
      }
    }
    setTextError(descricaoErrorEl, !isValid, msg);
    return isValid;
  }

  function validateAnexos() {
    const files = Array.from(anexosEl.files || []);
    const maxFiles = 5;
    const maxMb = 20;
    const tooMany = files.length > maxFiles;
    const tooLarge = files.some((f) => bytesToMb(f.size) > maxMb);
    const isValid = !tooMany && !tooLarge;
    anexosInfoEl.replaceChildren();
    let msg = '';
    if (tooMany) {
      msg = 'Você pode enviar no máximo 5 arquivos. Remova alguns e selecione de novo.';
    } else if (tooLarge) {
      msg = 'Cada arquivo pode ter até 20 MB. Escolha versões menores ou comprimidas e tente outra vez.';
    }
    setTextError(anexosErrorEl, !isValid, msg);

    if (files.length === 0) {
      return isValid;
    }

    files.forEach((f, index) => {
      const row = document.createElement('div');
      row.className = 'protocolo-novo-anexo-item';

      const nome = document.createElement('span');
      nome.className = 'protocolo-novo-anexo-nome';
      nome.textContent = f.name;

      const btnVer = document.createElement('button');
      btnVer.type = 'button';
      btnVer.className = 'protocolo-novo-anexo-ver';
      btnVer.setAttribute('aria-label', `Visualizar ${f.name}`);
      btnVer.textContent = 'Ver';
      btnVer.addEventListener('click', () => {
        if (anexoModalApi && typeof anexoModalApi.openFile === 'function') {
          anexoModalApi.openFile(f);
        }
      });

      const btnRemover = document.createElement('button');
      btnRemover.type = 'button';
      btnRemover.className = 'protocolo-novo-anexo-remover';
      btnRemover.setAttribute('aria-label', `Remover ${f.name}`);
      btnRemover.textContent = 'Remover';
      btnRemover.addEventListener('click', () => {
        const list = Array.from(anexosEl.files || []);
        list.splice(index, 1);
        arquivosAcumuladosDenuncia = list;
        setInputFileList(anexosEl, list);
        validateAnexos();
      });

      row.append(nome, btnVer, btnRemover);
      anexosInfoEl.append(row);
    });

    return isValid;
  }

  descricaoEl.addEventListener('input', updateDescricaoUi);
  /** Lista acumulada: cada abertura do seletor substitui `input.files`; mesclamos aqui. */
  let arquivosAcumuladosDenuncia = [];

  btnAnexosDenuncia.addEventListener('click', () => {
    anexosEl.click();
  });

  anexosEl.addEventListener('change', () => {
    const incoming = Array.from(anexosEl.files || []);
    arquivosAcumuladosDenuncia = mergeUniqueFiles(arquivosAcumuladosDenuncia, incoming);
    setInputFileList(anexosEl, arquivosAcumuladosDenuncia);
    validateAnexos();
  });

  updateDescricaoUi();
  validateAnexos();

  function addReviewRow(key, valueNodeOrText) {
    const row = document.createElement('div');
    row.className = 'review-row';
    const k = document.createElement('div');
    k.className = 'review-k';
    k.textContent = key;
    const v = document.createElement('div');
    v.className = 'review-v';
    if (valueNodeOrText instanceof Node) v.appendChild(valueNodeOrText);
    else v.textContent = String(valueNodeOrText ?? '');
    row.append(k, v);
    denunciaReviewGridEl.appendChild(row);
  }

  function buildDenunciaFields() {
    const cpfTrim = String(cpf || '').trim();
    const desejaIdentificar = cpfTrim.length > 0;
    const fields = {
      categoriaEnum: categoriaEl.value,
      departamentoId: departamentoEl.value ? String(departamentoEl.value) : undefined,
      dataOcorrido: dataEl.value,
      descricao: String(descricaoEl.value || '').trim(),
      desejaIdentificar
    };
    if (cpfTrim) fields.cpf = cpfTrim;
    return fields;
  }

  function showReview() {
    denunciaReviewErroEl.textContent = '';
    denunciaReviewErroEl.classList.remove('is-visible');
    denunciaReviewGridEl.replaceChildren();

    const departamentoNome =
      departamentoEl.selectedOptions && departamentoEl.selectedOptions[0]
        ? departamentoEl.selectedOptions[0].textContent
        : '';
    const categoriaNome =
      categoriaEl.selectedOptions && categoriaEl.selectedOptions[0]
        ? categoriaEl.selectedOptions[0].textContent
        : '';

    addReviewRow('CPF', String(cpf || '').trim() || '—');
    addReviewRow('Categoria', categoriaNome || categoriaEl.value || '—');
    addReviewRow(
      'Departamento',
      departamentoNome ? `${departamentoNome} (${departamentoEl.value})` : departamentoEl.value || '—'
    );
    addReviewRow('Data do ocorrido', dataEl.value || '—');
    addReviewRow('Descrição', String(descricaoEl.value || '').trim() || '—');

    const files = Array.from(anexosEl.files || []);
    if (files.length > 0) {
      const ul = document.createElement('ul');
      ul.style.margin = '0';
      ul.style.paddingLeft = '18px';
      ul.style.fontSize = '13px';
      ul.style.color = '#374151';
      files.forEach((f) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '8px';
        li.style.flexWrap = 'wrap';
        const span = document.createElement('span');
        span.textContent = f.name;
        const btnVer = document.createElement('button');
        btnVer.type = 'button';
        btnVer.className = 'protocolo-novo-anexo-ver';
        btnVer.setAttribute('aria-label', `Visualizar ${f.name}`);
        btnVer.textContent = 'Ver';
        btnVer.addEventListener('click', () => {
          if (anexoModalApi && typeof anexoModalApi.openFile === 'function') {
            anexoModalApi.openFile(f);
          }
        });
        li.append(span, btnVer);
        ul.appendChild(li);
      });
      addReviewRow('Anexos', ul);
    } else {
      addReviewRow('Anexos', '—');
    }

    form.classList.add('is-hidden');
    denunciaReviewEl.classList.remove('is-hidden');
    denunciaReviewConfirmarEl.focus({ preventScroll: true });
  }

  function hideReview() {
    denunciaReviewErroEl.textContent = '';
    denunciaReviewErroEl.classList.remove('is-visible');
    denunciaReviewEl.classList.add('is-hidden');
    form.classList.remove('is-hidden');
    btnRevisar.focus({ preventScroll: true });
  }

  denunciaReviewVoltarEl.addEventListener('click', () => hideReview());

  denunciaReviewConfirmarEl.addEventListener('click', async () => {
    denunciaReviewErroEl.textContent = '';
    denunciaReviewErroEl.classList.remove('is-visible');

    const tok = String(token || '').trim();
    if (!tok) {
      denunciaReviewErroEl.textContent =
        'Token de acesso não encontrado. Abra o formulário pelo link com ?token=...';
      denunciaReviewErroEl.classList.add('is-visible');
      return;
    }

    const fields = buildDenunciaFields();
    const files = Array.from(anexosEl.files || []);

    const labelEnviando = 'Enviando…';
    const labelOriginal = denunciaReviewConfirmarEl.textContent;
    denunciaReviewConfirmarEl.disabled = true;
    denunciaReviewVoltarEl.disabled = true;
    btnRevisar.disabled = true;
    btnAnexosDenuncia.disabled = true;
    denunciaReviewConfirmarEl.textContent = labelEnviando;

    try {
      await postEnviarDenunciaMultipart(tok, fields, files);

      sessionStorage.removeItem('denunciaDraft');
      sessionStorage.removeItem('denunciaToken');

      setInputFileList(anexosEl, []);
      arquivosAcumuladosDenuncia = [];
      validateAnexos();

      form.reset();
      updateDescricaoUi();

      hideReview();
      if (messageEl) messageEl.textContent = 'Denúncia enviada com sucesso.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      denunciaReviewErroEl.textContent = mensagemErroAmigavel(err);
      denunciaReviewErroEl.classList.add('is-visible');
    } finally {
      denunciaReviewConfirmarEl.disabled = false;
      denunciaReviewVoltarEl.disabled = false;
      btnRevisar.disabled = false;
      btnAnexosDenuncia.disabled = false;
      denunciaReviewConfirmarEl.textContent = labelOriginal;
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!listsLoadedOk || categoriaEl.disabled || departamentoEl.disabled) {
      return;
    }

    const descricaoOk = updateDescricaoUi();
    const anexosOk = validateAnexos();
    const categoriaOk = Boolean(categoriaEl.value);
    const departamentoOk = Boolean(departamentoEl.value);
    const dataOk = Boolean(dataEl.value);

    if (!categoriaOk || !departamentoOk || !dataOk || !descricaoOk || !anexosOk) {
      if (listsLoadedOk) {
        setTextError(
          categoriaErrorEl,
          !categoriaOk,
          !categoriaOk ? 'Escolha a categoria que melhor descreve o caso.' : ''
        );
        setTextError(
          departamentoErrorEl,
          !departamentoOk,
          !departamentoOk ? 'Escolha o departamento relacionado ao ocorrido.' : ''
        );
      }
      if (!dataOk) {
        dataEl.setCustomValidity('Informe a data aproximada em que isso aconteceu.');
        dataEl.reportValidity();
      } else {
        dataEl.setCustomValidity('');
      }
      btnRevisar.disabled = false;
      return;
    }

    dataEl.setCustomValidity('');
    showReview();
  });

  function setMode(mode) {
    const isDenuncia = mode === 'denuncia';
    if (isDenuncia) protocoloReplicarCtx.protocoloUuid = null;
    if (!isDenuncia) {
      denunciaReviewEl.classList.add('is-hidden');
    }
    if (form) form.classList.toggle('is-hidden', !isDenuncia);
    if (protocoloBox) protocoloBox.classList.toggle('is-hidden', isDenuncia);
    if (protocoloChatAside) protocoloChatAside.classList.toggle('is-hidden', isDenuncia);
    if (denunciasShell) denunciasShell.classList.toggle('denuncias-shell--protocolo', !isDenuncia);
    if (protocoloResultEl) protocoloResultEl.classList.toggle('is-hidden', true);

    if (btnNovaDenuncia) btnNovaDenuncia.disabled = isDenuncia;
    if (btnConsultarProtocolo) btnConsultarProtocolo.disabled = !isDenuncia;

    if (pageTitleEl) {
      pageTitleEl.textContent = isDenuncia ? 'Registrar denúncia' : 'Consultar protocolo';
    }
    if (messageEl) {
      messageEl.textContent = isDenuncia
        ? 'Preencha o formulário abaixo. Você poderá revisar antes do envio.'
        : 'Digite o número do protocolo para consultar o status.';
    }

    if (!isDenuncia && protocoloNumeroEl) {
      protocoloNumeroEl.focus({ preventScroll: true });
    }
  }

  setMode('denuncia');

  if (btnConsultarProtocolo) {
    btnConsultarProtocolo.addEventListener('click', () => setMode('protocolo'));
  }
  if (btnNovaDenuncia) {
    btnNovaDenuncia.addEventListener('click', () => setMode('denuncia'));
  }

  async function consultarProtocolo() {
    const rawVal = protocoloNumeroEl ? String(protocoloNumeroEl.value || '').trim() : '';
    const val = normalizeUuidLike(rawVal);

    if (!val || !isUuid(val)) {
      if (protocoloNumeroEl) {
        protocoloNumeroEl.setCustomValidity(
          rawVal ? 'Informe um UUID válido de protocolo.' : 'Informe o número do protocolo.'
        );
        protocoloNumeroEl.reportValidity();
        protocoloNumeroEl.setCustomValidity('');
      }
      if (protocoloResultEl) {
        protocoloResultEl.classList.toggle('is-hidden', false);
        showProtocoloFeedback(
          rawVal
            ? 'UUID inválido. Use o formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
            : 'Informe o número do protocolo para consultar.',
          true
        );
      }
      return;
    }

    try {
      if (btnConsultar) btnConsultar.disabled = true;
      if (protocoloResultEl) {
        protocoloResultEl.classList.toggle('is-hidden', false);
        showProtocoloFeedback('Consultando...', false);
      }

      const data = await fetchAcompanharPorProtocolo(val, token);
      protocoloReplicarCtx.protocoloUuid =
        data.protocolo != null ? normalizeUuidLike(String(data.protocolo)) : val;
      protocoloReplicarCtx.token = token;
      if (protocoloResultEl) {
        showProtocoloDetalhe(data);
        protocoloResultEl.classList.toggle('is-hidden', false);
      }
    } catch (err) {
      if (protocoloResultEl) {
        protocoloResultEl.classList.toggle('is-hidden', false);
        if (protocoloDetalheEl) protocoloDetalheEl.classList.add('is-hidden');
        showProtocoloFeedback(`Erro ao consultar: ${mensagemErroAmigavel(err)}`, true);
      } else {
        alert(mensagemErroAmigavel(err));
      }
    } finally {
      if (btnConsultar) btnConsultar.disabled = false;
    }
  }

  if (protocoloForm) {
    protocoloForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await consultarProtocolo();
    });
  }

  if (btnConsultar) {
    btnConsultar.addEventListener('click', async (e) => {
      e.preventDefault();
      await consultarProtocolo();
    });
  }
});

function validarAnexosNovoAcompanhamento(files) {
  const list = Array.from(files || []);
  if (list.length > MAX_ANEXOS_ACOMPANHAMENTO) {
    return {
      ok: false,
      msg: `Você pode enviar no máximo ${MAX_ANEXOS_ACOMPANHAMENTO} arquivos.`
    };
  }
  const tooLarge = list.some((f) => bytesToMb(f.size) > MAX_MB_ANEXO_ACOMPANHAMENTO);
  if (tooLarge) {
    return {
      ok: false,
      msg: `Cada arquivo pode ter até ${MAX_MB_ANEXO_ACOMPANHAMENTO} MB.`
    };
  }
  return { ok: true, msg: '' };
}

function setNovoAcompanhamentoErro(el, on, message) {
  if (!el) return;
  if (!on) {
    el.textContent = '';
    el.classList.remove('is-visible');
    return;
  }
  el.textContent = message || '';
  el.classList.add('is-visible');
}

document.addEventListener('DOMContentLoaded', () => {
  const inputAnexosNovo = document.getElementById('protocoloNovoAcompanhamentoAnexos');
  const btnAnexosNovo = document.getElementById('protocoloNovoAcompanhamentoBtnAnexos');
  const btnEnviarNovo = document.getElementById('protocoloNovoAcompanhamentoEnviar');
  const textareaNovo = document.getElementById('protocoloNovoAcompanhamentoTexto');
  const anexosNovoInfo = document.getElementById('protocoloNovoAcompanhamentoAnexosInfo');
  const erroNovo = document.getElementById('protocoloNovoAcompanhamentoErro');

  if (!inputAnexosNovo || !btnAnexosNovo) return;

  /** Lista acumulada: cada abertura do seletor substitui `input.files`; mesclamos aqui. */
  let arquivosAcumuladosNovo = [];

  btnAnexosNovo.addEventListener('click', () => {
    inputAnexosNovo.click();
  });

  function atualizarInfoAnexosNovo() {
    if (!anexosNovoInfo) return;
    anexosNovoInfo.replaceChildren();
    const files = inputAnexosNovo.files;
    if (!files || files.length === 0) {
      setNovoAcompanhamentoErro(erroNovo, false, '');
      return;
    }
    const v = validarAnexosNovoAcompanhamento(files);
    setNovoAcompanhamentoErro(erroNovo, !v.ok, v.msg);
    Array.from(files).forEach((f, index) => {
      const row = document.createElement('div');
      row.className = 'protocolo-novo-anexo-item';
      const nome = document.createElement('span');
      nome.className = 'protocolo-novo-anexo-nome';
      nome.textContent = f.name;

      const btnVer = document.createElement('button');
      btnVer.type = 'button';
      btnVer.className = 'protocolo-novo-anexo-ver';
      btnVer.setAttribute('aria-label', `Visualizar ${f.name}`);
      btnVer.textContent = 'Ver';
      btnVer.addEventListener('click', () => {
        if (anexoModalApi && typeof anexoModalApi.openFile === 'function') {
          anexoModalApi.openFile(f);
        }
      });

      const btnRemover = document.createElement('button');
      btnRemover.type = 'button';
      btnRemover.className = 'protocolo-novo-anexo-remover';
      btnRemover.setAttribute('aria-label', `Remover ${f.name}`);
      btnRemover.textContent = 'Remover';
      btnRemover.addEventListener('click', () => {
        const list = Array.from(inputAnexosNovo.files || []);
        list.splice(index, 1);
        arquivosAcumuladosNovo = list;
        setInputFileList(inputAnexosNovo, list);
        atualizarInfoAnexosNovo();
      });
      row.append(nome, btnVer, btnRemover);
      anexosNovoInfo.append(row);
    });
  }

  inputAnexosNovo.addEventListener('change', () => {
    const incoming = Array.from(inputAnexosNovo.files || []);
    arquivosAcumuladosNovo = mergeUniqueFiles(arquivosAcumuladosNovo, incoming);
    setInputFileList(inputAnexosNovo, arquivosAcumuladosNovo);
    atualizarInfoAnexosNovo();
  });

  if (btnEnviarNovo && textareaNovo) {
    btnEnviarNovo.addEventListener('click', async () => {
      const params = new URLSearchParams(window.location.search);
      const draftPeek = getDenunciaDraft();
      const token =
        (params.get('token') || '').trim() ||
        (sessionStorage.getItem('denunciaToken') || '').trim() ||
        (draftPeek && draftPeek.token != null && String(draftPeek.token).trim()) ||
        '';
      protocoloReplicarCtx.token = token;

      const uuid = protocoloReplicarCtx.protocoloUuid;
      const mensagem = String(textareaNovo.value || '').trim();
      const files = Array.from(inputAnexosNovo.files || []);

      setNovoAcompanhamentoErro(erroNovo, false, '');

      if (!token) {
        setNovoAcompanhamentoErro(
          erroNovo,
          true,
          'Abra a página pelo link com o código de acesso (?token=...) para enviar.'
        );
        return;
      }
      if (!uuid) {
        setNovoAcompanhamentoErro(
          erroNovo,
          true,
          'Consulte o protocolo antes de enviar um acompanhamento.'
        );
        return;
      }
      if (mensagem.length < 3) {
        setNovoAcompanhamentoErro(
          erroNovo,
          true,
          'A mensagem deve ter entre 3 e 2000 caracteres.'
        );
        return;
      }
      if (mensagem.length > 2000) {
        setNovoAcompanhamentoErro(erroNovo, true, 'A mensagem não pode passar de 2000 caracteres.');
        return;
      }

      const vAnexos = validarAnexosNovoAcompanhamento(files);
      if (!vAnexos.ok) {
        setNovoAcompanhamentoErro(erroNovo, true, vAnexos.msg);
        return;
      }

      const labelEnviando = 'Enviando…';
      const labelOriginal = btnEnviarNovo.textContent;
      btnEnviarNovo.disabled = true;
      btnAnexosNovo.disabled = true;
      btnEnviarNovo.textContent = labelEnviando;

      try {
        await postReplicarAcompanhamentoMultipart(uuid, token, mensagem, files);
        textareaNovo.value = '';
        arquivosAcumuladosNovo = [];
        setInputFileList(inputAnexosNovo, []);
        atualizarInfoAnexosNovo();
        await refreshProtocoloConsultaViewFromApi();
      } catch (err) {
        setNovoAcompanhamentoErro(erroNovo, true, mensagemErroAmigavel(err));
      } finally {
        btnEnviarNovo.disabled = false;
        btnAnexosNovo.disabled = false;
        btnEnviarNovo.textContent = labelOriginal;
      }
    });
  }
});

