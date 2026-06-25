const CHAVE_LOCAL_STORAGE = 'partner';

export function inicializarParceiro() {
  if (typeof window.__PARCEIRO__ === 'string' && window.__PARCEIRO__) {
    localStorage.setItem(CHAVE_LOCAL_STORAGE, window.__PARCEIRO__);
  }

  const hash = window.location.hash;
  if (!hash.includes('?')) return;

  const params = new URLSearchParams(hash.split('?')[1]);
  const codigo = params.get('partner');
  if (codigo) {
    localStorage.setItem(CHAVE_LOCAL_STORAGE, codigo);
  }
}
