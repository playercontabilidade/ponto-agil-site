const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { pathToFileURL } = require('url');

const CAMINHO_MODULO = path.join(__dirname, '..', '..', 'public', 'js', 'utils', 'escape_html.js');

let escaparHtml;
test.before(async () => {
  ({ escaparHtml } = await import(pathToFileURL(CAMINHO_MODULO).href));
});

test('escapa os cinco caracteres perigosos', () => {
  assert.equal(escaparHtml('<img src=x>'), '&lt;img src=x&gt;');
  assert.equal(escaparHtml('a & b'), 'a &amp; b');
  assert.equal(escaparHtml('aspas "duplas"'), 'aspas &quot;duplas&quot;');
  assert.equal(escaparHtml("aspas 'simples'"), 'aspas &#39;simples&#39;');
});

test('neutraliza payload de XSS com handler inline', () => {
  const payload = '<img src=x onerror="alert(1)">';
  const saida = escaparHtml(payload);
  assert.doesNotMatch(saida, /<img/);
  assert.doesNotMatch(saida, /onerror="/);
});

test('escapa quebra de atributo', () => {
  assert.equal(escaparHtml('" onmouseover="alert(1)'), '&quot; onmouseover=&quot;alert(1)');
});

test('lida com null, undefined e numero', () => {
  assert.equal(escaparHtml(null), '');
  assert.equal(escaparHtml(undefined), '');
  assert.equal(escaparHtml(42), '42');
});
