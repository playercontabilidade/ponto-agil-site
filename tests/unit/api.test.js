const { test } = require('node:test');
const assert = require('node:assert/strict');

const api = require('../../src/config/api');

test('api exporta baseUrl sem barra final', () => {
  assert.ok(api.baseUrl);
  assert.equal(api.baseUrl.endsWith('/'), false);
});

test('api define endpoints de planos e ouvidoria', () => {
  assert.equal(api.endpoints.planoPublico, '/plano/publico');
  assert.equal(api.endpoints.ouvidoriaEnviar, '/ouvidoria/public/enviar');
  assert.equal(api.endpoints.ouvidoriaCategorias, '/ouvidoria/public/categorias');
});

test('endpoints dinâmicos de ouvidoria codificam parâmetros', () => {
  const uuid = 'abc/def';
  assert.equal(
    api.endpoints.ouvidoriaAcompanhamento(uuid),
    '/ouvidoria/public/acompanhamento/abc%2Fdef',
  );
});
