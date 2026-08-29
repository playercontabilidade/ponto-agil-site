const MAPA_ENTIDADES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapa texto antes de injetar em innerHTML, tanto em contexto de texto quanto
 * dentro de atributo (data-plan-id, aria-label etc). Por isso aspas simples e
 * duplas entram no mapa junto com os tres caracteres classicos de HTML.
 * Aceita null/undefined e retorna string vazia nesses casos.
 *
 * Existe uma copia funcionalmente identica em public/js/contratacao/utils.js,
 * dentro de window.ContratacaoUtils. A duplicacao e proposital: os arquivos de
 * public/js/contratacao sao scripts classicos sem suporte a import, entao nao
 * podem consumir este modulo ES diretamente.
 */
export function escaparHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/[&<>"']/g, (caractere) => MAPA_ENTIDADES[caractere]);
}
