function codificarSegmento(valor) {
  return encodeURIComponent(String(valor ?? '').trim());
}

export function hidratarEndpointsOuvidoria(endpoints = {}) {
  return {
    OUVIDORIA_ENVIAR: endpoints.OUVIDORIA_ENVIAR || '/ouvidoria/public/enviar',
    OUVIDORIA_CATEGORIAS: endpoints.OUVIDORIA_CATEGORIAS || '/ouvidoria/public/categorias',
    OUVIDORIA_PRAZO_RESPOSTA:
      endpoints.OUVIDORIA_PRAZO_RESPOSTA || '/ouvidoria/public/prazo-resposta',
    DEPARTAMENTO_POR_TOKEN_LISTAR:
      endpoints.DEPARTAMENTO_POR_TOKEN_LISTAR || '/departamento/por-token/listar',
    OUVIDORIA_ACOMPANHAMENTO: (uuid) =>
      `/ouvidoria/public/acompanhamento/${codificarSegmento(uuid)}`,
    OUVIDORIA_ACOMPANHAMENTO_REPLICAR: (uuid) =>
      `/ouvidoria/public/acompanhamento/replicar/${codificarSegmento(uuid)}`,
    OUVIDORIA_ANEXO: (id) => `/ouvidoria/public/anexo/${codificarSegmento(id)}`,
    OUVIDORIA_ACOMPANHAMENTO_ANEXO: (id) =>
      `/ouvidoria/public/acompanhamento/anexo/${codificarSegmento(id)}`,
  };
}
