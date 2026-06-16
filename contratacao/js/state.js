(function () {
  const { STORAGE_KEY } = window.PONTO_AGIL_CONTRATACAO_CONFIG;

  const defaultState = () => ({
    planoId: null,
    faixaId: null,
    planoNome: "",
    faixaNome: "",
    planoPreco: 0,
    planoFuncionalidades: [],
    contratacaoId: null,
    status: null,
    checkoutUrl: null,
    hashDocumento: null,
    emailAttempts: 0,
    contratacaoCreatedAt: null,
    empresa: {
      razaoSocial: "",
      cnpj: "",
      emailCorporativo: "",
      telefoneEmpresa: "",
      cep: "",
    },
    responsavel: {
      responsavelNome: "",
      responsavelCpf: "",
      responsavelEmail: "",
      responsavelTelefone: "",
    },
  });

  function load() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return { ...defaultState(), ...JSON.parse(raw) };
    } catch (_) {
      return defaultState();
    }
  }

  function save(partial) {
    const current = load();
    const next = { ...current, ...partial };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function clear() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function setPlano(planoId, faixaId, details) {
    return save({
      planoId,
      faixaId,
      planoNome: details?.planoNome ?? "",
      faixaNome: details?.faixaNome ?? "",
      planoPreco: details?.planoPreco ?? 0,
      planoFuncionalidades: details?.planoFuncionalidades ?? [],
    });
  }

  function setEmpresa(data) {
    const state = load();
    return save({ empresa: { ...state.empresa, ...data } });
  }

  function setResponsavel(data) {
    const state = load();
    return save({ responsavel: { ...state.responsavel, ...data } });
  }

  function setContratacao(contratacaoId, status) {
    return save({
      contratacaoId,
      status,
      contratacaoCreatedAt: Date.now(),
      emailAttempts: 0,
    });
  }

  function incrementEmailAttempts() {
    const state = load();
    return save({ emailAttempts: (state.emailAttempts || 0) + 1 });
  }

  function hasPlanoSelecionado() {
    const { planoId, faixaId } = load();
    return Number.isFinite(Number(planoId)) && Number.isFinite(Number(faixaId));
  }

  window.ContratacaoState = Object.freeze({
    load,
    save,
    clear,
    setPlano,
    setEmpresa,
    setResponsavel,
    setContratacao,
    incrementEmailAttempts,
    hasPlanoSelecionado,
  });
})();
