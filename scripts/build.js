const sistemaArquivos = require('fs/promises');
const path = require('path');
const motorTemplates = require('ejs');

const RAIZ = path.join(__dirname, '..');
const DIST = path.join(RAIZ, 'dist');
const PUBLIC = path.join(RAIZ, 'public');
const VIEWS = path.join(RAIZ, 'src', 'views');

require('dotenv').config({ path: path.join(RAIZ, '.env') });

process.env.NODE_ENV = 'production';
if (process.env.PONTO_AGIL_API_BUILD) {
  process.env.PONTO_AGIL_API = process.env.PONTO_AGIL_API_BUILD;
} else {
  delete process.env.PONTO_AGIL_API;
}

const configuracaoApi = require('../src/config/api');
const planoServico = require('../src/services/plano_servico');
const manifestacaoServico = require('../src/services/manifestacao_servico');
const manifestacaoModel = require('../src/models/manifestacao');

async function limparDist() {
  await sistemaArquivos.rm(DIST, { recursive: true, force: true });
  await sistemaArquivos.mkdir(DIST, { recursive: true });
}

async function copiarDiretorio(origem, destino) {
  await sistemaArquivos.mkdir(destino, { recursive: true });
  const entradas = await sistemaArquivos.readdir(origem, { withFileTypes: true });

  for (const entrada of entradas) {
    const origemEntrada = path.join(origem, entrada.name);
    const destinoEntrada = path.join(destino, entrada.name);

    if (entrada.isDirectory()) {
      await copiarDiretorio(origemEntrada, destinoEntrada);
    } else {
      await sistemaArquivos.copyFile(origemEntrada, destinoEntrada);
    }
  }
}

async function copiarAssets() {
  await copiarDiretorio(path.join(PUBLIC, 'css'), path.join(DIST, 'css'));
  await copiarDiretorio(path.join(PUBLIC, 'js'), path.join(DIST, 'js'));
  await copiarDiretorio(path.join(PUBLIC, 'images'), path.join(DIST, 'images'));

  // Sanitizador do contrato, vendorizado a partir do node_modules para nao
  // depender de CDN nem de blob commitado no repositorio.
  const vendorDestino = path.join(DIST, 'js', 'vendor');
  await sistemaArquivos.mkdir(vendorDestino, { recursive: true });
  await sistemaArquivos.copyFile(
    path.join(RAIZ, 'node_modules', 'dompurify', 'dist', 'purify.min.js'),
    path.join(vendorDestino, 'purify.min.js'),
  );

  const incluirCname = process.env.INCLUIR_CNAME !== 'false';
  const cname = path.join(RAIZ, 'CNAME');
  if (incluirCname) {
    try {
      await sistemaArquivos.copyFile(cname, path.join(DIST, 'CNAME'));
    } catch {
      /* CNAME opcional */
    }
  }
}

function renderizar(template, locals) {
  return new Promise((resolve, reject) => {
    motorTemplates.renderFile(path.join(VIEWS, `${template}.ejs`), locals, (erro, html) => {
      if (erro) reject(erro);
      else resolve(html);
    });
  });
}

async function montarHtmlInicio() {
  let planos = [];
  let precificacao = null;

  try {
    planos = await planoServico.listarPublicos();
    precificacao = planoServico.montarPrecificacao(planos);
  } catch (erro) {
    console.warn('Planos indisponíveis no build:', erro.message);
  }

  return renderizar('layouts/main', {
    titulo: 'Ponto Ágil - Gestão de Ponto Eletrônico e RH',
    pagina: 'inicio',
    conteudoParcial: 'pages/index',
    estiloPagina: null,
    exibirWhatsapp: true,
    caminhoCanonico: '/',
    planos,
    precificacao,
    parceiro: null,
    apiBaseUrl: configuracaoApi.baseUrl,
  });
}

function montarHtmlPrivacidade() {
  return renderizar('layouts/main', {
    titulo: 'Política de Privacidade - Ponto Ágil',
    pagina: 'privacidade',
    conteudoParcial: 'pages/privacidade',
    estiloPagina: 'privacidade',
    exibirWhatsapp: false,
    descricao: 'Como o Ponto Ágil trata e protege os dados pessoais dos usuários e das empresas clientes.',
    caminhoCanonico: '/privacidade',
    apiBaseUrl: configuracaoApi.baseUrl,
  });
}

function montarHtmlOuvidoria(tipoManifestacao) {
  const tipo = manifestacaoModel.normalizarTipoManifestacao(tipoManifestacao);

  return renderizar('layouts/ouvidoria', {
    titulo: `Ouvidoria - ${manifestacaoModel.obterRotuloTipo(tipo)}`,
    conteudoParcial: 'pages/ouvidoria',
    configOuvidoria: manifestacaoServico.montarConfigCliente(),
    tipoManifestacao: tipo,
  });
}

function montarHtmlContratacao() {
  return renderizar('pages/contratacao', {
    apiBaseUrl: configuracaoApi.baseUrl,
  });
}

async function gravarPaginas() {
  const [htmlInicio, htmlPrivacidade, htmlOuvidoria, htmlContratacao] = await Promise.all([
    montarHtmlInicio(),
    montarHtmlPrivacidade(),
    montarHtmlOuvidoria(),
    montarHtmlContratacao(),
  ]);

  await sistemaArquivos.writeFile(path.join(DIST, 'index.html'), htmlInicio, 'utf8');

  await sistemaArquivos.mkdir(path.join(DIST, 'privacidade'), { recursive: true });
  await sistemaArquivos.writeFile(
    path.join(DIST, 'privacidade', 'index.html'),
    htmlPrivacidade,
    'utf8',
  );

  await sistemaArquivos.mkdir(path.join(DIST, 'ouvidoria'), { recursive: true });
  await sistemaArquivos.writeFile(
    path.join(DIST, 'ouvidoria', 'index.html'),
    htmlOuvidoria,
    'utf8',
  );

  await sistemaArquivos.mkdir(path.join(DIST, 'contratacao'), { recursive: true });
  await sistemaArquivos.writeFile(
    path.join(DIST, 'contratacao', 'index.html'),
    htmlContratacao,
    'utf8',
  );
}

async function executar() {
  console.log(`Build estático → dist/ (API: ${configuracaoApi.baseUrl})`);

  await limparDist();
  await gravarPaginas();
  await copiarAssets();

  console.log('Build concluído.');
}

executar().catch((erro) => {
  console.error('Falha no build:', erro);
  process.exit(1);
});
