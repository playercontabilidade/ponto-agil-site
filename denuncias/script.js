const baseUrl =
  typeof window.PONTO_AGIL_API === 'string' && window.PONTO_AGIL_API
    ? window.PONTO_AGIL_API.replace(/\/$/, '')
    : 'http://localhost:8080';

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
  const safeToken = encodeURIComponent(String(token || '').trim());
  return fetchBearerJson(`/denuncia/acompanhar/${safeUuid}?token=${safeToken}`, token);
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

document.addEventListener('DOMContentLoaded', () => {
  const pageTitleEl = document.querySelector('main.card h1');
  const messageEl = document.getElementById('message');
  const btnNovaDenuncia = document.getElementById('btnNovaDenuncia');
  const btnConsultarProtocolo = document.getElementById('btnConsultarProtocolo');
  const protocoloBox = document.getElementById('protocoloBox');
  const protocoloForm = document.getElementById('protocoloForm');
  const protocoloNumeroEl = document.getElementById('protocoloNumero');
  const protocoloResultEl = document.getElementById('protocoloResult');
  const btnConsultar = document.getElementById('btnConsultar');

  const params = new URLSearchParams(window.location.search);
  const draftPeek = getDenunciaDraft();

  let token =
    (params.get('token') || '').trim() ||
    (sessionStorage.getItem('denunciaToken') || '').trim() ||
    (draftPeek && draftPeek.token != null && String(draftPeek.token).trim()) ||
    '';

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
  const btnRevisar = document.getElementById('btnRevisar');
  const dataEl = document.getElementById('dataAproximada');

  if (
    !categoriaEl ||
    !departamentoEl ||
    !form ||
    !descricaoEl ||
    !descricaoCountEl ||
    !anexosEl ||
    !anexosInfoEl ||
    !btnRevisar ||
    !dataEl
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
    anexosInfoEl.textContent = `${files.length} selecionado(s)`;
    let msg = '';
    if (tooMany) {
      msg = 'Você pode enviar no máximo 5 arquivos. Remova alguns e selecione de novo.';
    } else if (tooLarge) {
      msg = 'Cada arquivo pode ter até 20 MB. Escolha versões menores ou comprimidas e tente outra vez.';
    }
    setTextError(anexosErrorEl, !isValid, msg);
    return isValid;
  }

  descricaoEl.addEventListener('input', updateDescricaoUi);
  anexosEl.addEventListener('change', validateAnexos);

  updateDescricaoUi();
  validateAnexos();

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

    const anexosMeta = Array.from(anexosEl.files || []).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type || ''
    }));

    const departamentoNome =
      departamentoEl.selectedOptions && departamentoEl.selectedOptions[0]
        ? departamentoEl.selectedOptions[0].textContent
        : '';

    const categoriaNome =
      categoriaEl.selectedOptions && categoriaEl.selectedOptions[0]
        ? categoriaEl.selectedOptions[0].textContent
        : '';

    const payload = {
      token: token || '',
      cpf: cpf || '',
      categoria: categoriaEl.value,
      categoriaNome: categoriaNome || '',
      departamento: departamentoEl.value,
      departamentoNome: departamentoNome || '',
      dataAproximada: dataEl.value,
      descricao: descricaoEl.value,
      anexos: anexosMeta,
      createdAt: new Date().toISOString()
    };

    sessionStorage.setItem('denunciaDraft', JSON.stringify(payload));
    window.location.href = './revisar/';
  });

  function setMode(mode) {
    const isDenuncia = mode === 'denuncia';
    if (form) form.classList.toggle('is-hidden', !isDenuncia);
    if (protocoloBox) protocoloBox.classList.toggle('is-hidden', isDenuncia);
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
    const val = rawVal.replace(/^\{/, '').replace(/\}$/, '');

    if (!val || !isUuid(val)) {
      if (protocoloNumeroEl) {
        protocoloNumeroEl.setCustomValidity(
          rawVal ? 'Informe um UUID válido de protocolo.' : 'Informe o número do protocolo.'
        );
        protocoloNumeroEl.reportValidity();
        protocoloNumeroEl.setCustomValidity('');
      }
      return;
    }

    if (!token) {
      alert(
        'Não foi possível validar seu acesso. O link pode estar incorreto ou expirado — peça um novo link se precisar.'
      );
      return;
    }

    try {
      if (btnConsultar) btnConsultar.disabled = true;
      if (protocoloResultEl) {
        protocoloResultEl.textContent = 'Consultando...';
        protocoloResultEl.classList.toggle('is-hidden', false);
      }

      const data = await fetchAcompanharPorProtocolo(val, token);
      if (protocoloResultEl) {
        protocoloResultEl.textContent = JSON.stringify(data, null, 2);
        protocoloResultEl.classList.toggle('is-hidden', false);
      }
    } catch (err) {
      if (protocoloResultEl) {
        protocoloResultEl.textContent = `Erro ao consultar: ${mensagemErroAmigavel(err)}`;
        protocoloResultEl.classList.toggle('is-hidden', false);
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

