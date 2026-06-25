const { test } = require('node:test');
const assert = require('node:assert/strict');

const planoModel = require('../../src/models/plano');

test('normalizarLista ordena planos por peso', () => {
  const planos = planoModel.normalizarLista([
    { nome: 'Completo', faixas: [] },
    { nome: 'Essencial', faixas: [] },
    { nome: 'Profissional', faixas: [] },
  ]);

  assert.deepEqual(
    planos.map((plano) => plano.nome),
    ['Essencial', 'Profissional', 'Completo'],
  );
});

test('normalizarLista retorna array vazio para payload inválido', () => {
  assert.deepEqual(planoModel.normalizarLista(null), []);
  assert.deepEqual(planoModel.normalizarLista({}), []);
});

test('montarPrecificacao retorna null sem planos', () => {
  assert.equal(planoModel.montarPrecificacao([]), null);
});
