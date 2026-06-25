const api = require('../config/api');

function montarEndpointsCliente() {
  return {
    OUVIDORIA_ENVIAR: api.endpoints.ouvidoriaEnviar,
    OUVIDORIA_CATEGORIAS: api.endpoints.ouvidoriaCategorias,
    OUVIDORIA_PRAZO_RESPOSTA: api.endpoints.ouvidoriaPrazoResposta,
    DEPARTAMENTO_POR_TOKEN_LISTAR: api.endpoints.departamentoPorTokenListar,
  };
}

function montarConfigCliente() {
  return {
    baseUrl: api.baseUrl,
    API_ENDPOINTS: montarEndpointsCliente(),
    ALLOWED_MIME_TYPES: api.tiposMimePermitidos,
    ALLOWED_FILE_EXTENSIONS: api.extensoesArquivoPermitidas,
    TIPOS_MANIFESTACAO: api.tiposManifestacao,
    TIPO_MANIFESTACAO_PADRAO: api.tipoManifestacaoPadrao,
    TIPO_MANIFESTACAO: api.tipoManifestacaoPadrao,
    ROTULOS_TIPO_MANIFESTACAO: api.rotulosTipoManifestacao,
  };
}

module.exports = {
  montarConfigCliente,
  montarEndpointsCliente,
};
