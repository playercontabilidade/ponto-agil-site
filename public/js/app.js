import { inicializarAlternarMenu } from './modules/alternar_menu.js';
import { inicializarSliderHero } from './modules/slider_hero.js';
import { inicializarPlanosUi } from './modules/planos_ui.js';
import { inicializarParceiro } from './modules/parceiro_ui.js';
import { inicializarAnimacoesPagina } from './modules/animacoes_pagina.js';

document.addEventListener('DOMContentLoaded', () => {
  inicializarAlternarMenu();
  inicializarSliderHero();
  inicializarAnimacoesPagina();
  inicializarParceiro();
  inicializarPlanosUi();
});

window.addEventListener('load', inicializarParceiro);
