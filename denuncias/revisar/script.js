const baseUrl =
  typeof window.PONTO_AGIL_API === 'string' && window.PONTO_AGIL_API
    ? window.PONTO_AGIL_API.replace(/\/$/, '')
    : 'http://localhost:8080';

/** Mesmo prefixo dos GETs em denuncias/script.js (`/denuncia/categorias`). */
const PATH_ENVIAR_DENUNCIA = '/denuncia/enviar';

function prettyBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  if (kb >= 1) return `${kb.toFixed(0)} KB`;
  return `${bytes} B`;
}

/** Formata valor vindo de input type="date" (YYYY-MM-DD) para dd/mm/aaaa. */
function formatarDataBR(valor) {
  if (valor == null || valor === '') return '—';
  const s = String(valor).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

function mensagemErroAmigavel(err) {
  if (err instanceof TypeError && String(err.message).includes('fetch')) {
    return 'Não conseguimos conectar. Confira sua internet e tente de novo.';
  }
  if (!(err instanceof Error) || !err.message) {
    return 'Algo não saiu como esperado. Tente novamente em alguns instantes.';
  }
  const m = err.message.trim();
  if (/^Erro HTTP\s*401\b/i.test(m) || /^Erro HTTP\s*403\b/i.test(m)) {
    return 'Não foi possível validar seu acesso. O link pode estar incorreto ou expirado.';
  }
  if (/^Erro HTTP\s*404\b/i.test(m)) {
    return 'Não encontramos esse serviço no momento.';
  }
  if (/^Erro HTTP\s*5\d\d\b/i.test(m)) {
    return 'O serviço está temporariamente indisponível. Tente de novo daqui a pouco.';
  }
  if (m.length > 0 && m.length < 160 && !/[<>]/.test(m) && !m.includes('{')) {
    return m;
  }
  return 'Não foi possível enviar agora. Tente novamente em instantes.';
}

/**
 * Monta o corpo conforme DenunciaRequestDTO (Spring):
 * categoriaEnum, desejaIdentificar, dataOcorrido, descricao (+ opcionais).
 */
function buildDenunciaRequestDTO(draft) {
  const cpf = (draft.cpf && String(draft.cpf).trim()) || '';
  const descricao = (draft.descricao && String(draft.descricao).trim()) || '';
  const dto = {
    categoriaEnum: draft.categoria,
    desejaIdentificar: cpf.length > 0,
    dataOcorrido: draft.dataAproximada,
    descricao
  };
  if (cpf) dto.cpf = cpf;
  if (draft.departamento != null && String(draft.departamento) !== '') {
    dto.departamentoId = String(draft.departamento);
  }
  return dto;
}

/**
 * POST com Authorization Bearer.
 * O controller usa @ModelAttribute no DTO: o corpo precisa ser form-urlencoded (JSON costuma não vincular).
 */
async function postBearerFormUrlEncoded(path, token, dto) {
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);

  const params = new URLSearchParams();
  Object.entries(dto).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'boolean') params.append(k, v ? 'true' : 'false');
    else params.append(k, String(v));
  });

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: params.toString()
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

function addRow(reviewGrid, key, valueNodeOrText) {
  const row = document.createElement('section');
  row.className = 'row';

  const k = document.createElement('div');
  k.className = 'k';
  k.textContent = key;

  const v = document.createElement('div');
  v.className = 'v';

  if (valueNodeOrText instanceof Node) v.appendChild(valueNodeOrText);
  else v.textContent = String(valueNodeOrText ?? '');

  row.appendChild(k);
  row.appendChild(v);
  reviewGrid.appendChild(row);
}

document.addEventListener('DOMContentLoaded', () => {
  const draftError = document.getElementById('draftError');
  const reviewGrid = document.getElementById('reviewGrid');
  const actions = document.getElementById('actions');
  const envioError = document.getElementById('envioError');
  const btnConfirmar = document.getElementById('btnConfirmar');

  let draft = null;
  try {
    draft = JSON.parse(sessionStorage.getItem('denunciaDraft') || 'null');
  } catch (_) {
    draft = null;
  }

  if (!draft || !reviewGrid || !actions || !draftError) {
    draftError?.classList.add('is-visible');
    return;
  }

  reviewGrid.hidden = false;
  actions.hidden = false;

  addRow(reviewGrid, 'CPF', draft.cpf || '—');
  addRow(reviewGrid, 'Categoria', draft.categoria != null && draft.categoria !== '' ? String(draft.categoria) : '—');
  addRow(
    reviewGrid,
    'Departamento',
    draft.departamentoNome
      ? `${draft.departamentoNome} (${draft.departamento || '—'})`
      : draft.departamento || '—'
  );
  addRow(reviewGrid, 'Data aproximada', formatarDataBR(draft.dataAproximada));
  addRow(reviewGrid, 'Descrição', draft.descricao || '—');

  const anexos = Array.isArray(draft.anexos) ? draft.anexos : [];
  if (anexos.length > 0) {
    const ul = document.createElement('ul');
    ul.className = 'files';
    anexos.forEach((f) => {
      const li = document.createElement('li');
      li.className = 'file';
      li.textContent = `${f.name || 'arquivo'} (${prettyBytes(Number(f.size) || 0)})`;
      ul.appendChild(li);
    });
    addRow(reviewGrid, 'Anexos', ul);
  } else {
    addRow(reviewGrid, 'Anexos', '—');
  }

  document.getElementById('btnVoltar')?.addEventListener('click', () => {
    const t =
      sessionStorage.getItem('denunciaToken') ||
      (draft && draft.token != null ? String(draft.token) : '') ||
      '';
    const c = (draft && draft.cpf != null ? String(draft.cpf) : '').trim();
    const u = new URL('../', window.location.href);
    if (t) u.searchParams.set('token', t);
    if (c) u.searchParams.set('cpf', c);
    window.location.href = u.pathname + u.search;
  });

  btnConfirmar?.addEventListener('click', async () => {
    if (!envioError) return;

    const token =
      (sessionStorage.getItem('denunciaToken') || '').trim() ||
      (draft && draft.token != null ? String(draft.token).trim() : '') ||
      '';

    if (!token) {
      envioError.textContent =
        'Token de acesso não encontrado. Volte ao formulário pelo link com ?token=...';
      envioError.removeAttribute('hidden');
      return;
    }

    envioError.setAttribute('hidden', '');
    envioError.textContent = '';

    const dto = buildDenunciaRequestDTO(draft);

    const labelEnviando = 'Enviando…';
    const labelOriginal = btnConfirmar.textContent;
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = labelEnviando;

    try {
      await postBearerFormUrlEncoded(PATH_ENVIAR_DENUNCIA, token, dto);
      sessionStorage.removeItem('denunciaDraft');
      sessionStorage.removeItem('denunciaToken');

      const u = new URL('../', window.location.href);
      u.searchParams.set('enviado', '1');
      u.searchParams.set('token', token);
      const c = (draft.cpf || '').trim();
      if (c) u.searchParams.set('cpf', c);
      window.location.href = u.pathname + u.search;
    } catch (err) {
      envioError.textContent = mensagemErroAmigavel(err);
      envioError.removeAttribute('hidden');
    } finally {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = labelOriginal;
    }
  });
});
