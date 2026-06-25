const config = require('./config');

const baseUrl = config.apiBaseUrl.replace(/\/$/, '');

const endpoints = {
  planoPublico: '/plano/publico',
  leads: '/leads',
  cobrancas: '/cobrancas',
  ouvidoriaEnviar: '/ouvidoria/public/enviar',
  ouvidoriaCategorias: '/ouvidoria/public/categorias',
  departamentoPorTokenListar: '/departamento/por-token/listar',
  ouvidoriaAcompanhamento: (uuid) =>
    `/ouvidoria/public/acompanhamento/${encodeURIComponent(String(uuid ?? '').trim())}`,
  ouvidoriaAcompanhamentoReplicar: (uuid) =>
    `/ouvidoria/public/acompanhamento/replicar/${encodeURIComponent(String(uuid ?? '').trim())}`,
  ouvidoriaAnexo: (id) =>
    `/ouvidoria/public/anexo/${encodeURIComponent(String(id ?? '').trim())}`,
  ouvidoriaAcompanhamentoAnexo: (id) =>
    `/ouvidoria/public/acompanhamento/anexo/${encodeURIComponent(String(id ?? '').trim())}`,
};

const tiposManifestacao = ['DENUNCIA', 'ELOGIO', 'RECLAMACAO', 'SUGESTAO'];
const tipoManifestacaoPadrao = 'DENUNCIA';

const rotulosTipoManifestacao = Object.freeze({
  DENUNCIA: 'Denúncia',
  ELOGIO: 'Elogio',
  RECLAMACAO: 'Reclamação',
  SUGESTAO: 'Sugestão',
});

const tiposMimePermitidos = ['image/jpeg', 'image/png', 'application/pdf'];
const extensoesArquivoPermitidas = ['.jpg', '.jpeg', '.png', '.pdf'];

module.exports = {
  baseUrl,
  endpoints,
  tiposManifestacao,
  tipoManifestacaoPadrao,
  rotulosTipoManifestacao,
  tiposMimePermitidos,
  extensoesArquivoPermitidas,
};
