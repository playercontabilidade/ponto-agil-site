const { test } = require('node:test');
const assert = require('node:assert/strict');

const manifestacaoModel = require('../../src/models/manifestacao');

test('normalizarTipoManifestacao aceita tipos válidos', () => {
  assert.equal(manifestacaoModel.normalizarTipoManifestacao('elogio'), 'ELOGIO');
  assert.equal(manifestacaoModel.normalizarTipoManifestacao(' RECLAMACAO '), 'RECLAMACAO');
});

test('normalizarTipoManifestacao usa padrão para valor inválido', () => {
  assert.equal(
    manifestacaoModel.normalizarTipoManifestacao('invalido'),
    manifestacaoModel.tipoManifestacaoPadrao,
  );
});

test('obterRotuloTipo retorna rótulo em português', () => {
  assert.equal(manifestacaoModel.obterRotuloTipo('SUGESTAO'), 'Sugestão');
});
