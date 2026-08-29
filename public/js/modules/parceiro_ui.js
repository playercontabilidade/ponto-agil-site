import { lerDadosPagina } from '../utils/dados_pagina.js';

const CHAVE_LOCAL_STORAGE = 'partner';

export function inicializarParceiro() {
  const parceiro = lerDadosPagina()?.parceiro;
  if (typeof parceiro === 'string' && parceiro) {
    localStorage.setItem(CHAVE_LOCAL_STORAGE, parceiro);
  }

  const hash = window.location.hash;
  if (!hash.includes('?')) return;

  const params = new URLSearchParams(hash.split('?')[1]);
  const codigo = params.get('partner');
  if (codigo) {
    localStorage.setItem(CHAVE_LOCAL_STORAGE, codigo);
  }
}
