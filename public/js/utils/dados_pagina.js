/**
 * Le dados injetados pelo servidor em um bloco <script type="application/json">.
 * Blocos JSON nao sao executaveis, entao a pagina dispensa script-src 'unsafe-inline'
 * e a CSP consegue bloquear injecao de script de verdade.
 */
export function lerDadosPagina(id = 'dados-pagina') {
  const elemento = document.getElementById(id);
  if (!elemento) return null;
  try {
    return JSON.parse(elemento.textContent || '{}');
  } catch {
    return null;
  }
}
