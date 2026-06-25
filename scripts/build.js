const fs = require('fs/promises');
const path = require('path');
const ejs = require('ejs');

const RAIZ = path.join(__dirname, '..');
const DIST = path.join(RAIZ, 'dist');
const PUBLIC = path.join(RAIZ, 'public');
const VIEWS = path.join(RAIZ, 'src', 'views');
const API_PRODUCAO = 'https://pontoagil.playercontabilidade.com';

require('dotenv').config({ path: path.join(RAIZ, '.env') });

process.env.NODE_ENV = 'production';
process.env.PONTO_AGIL_API =
  process.env.PONTO_AGIL_API_BUILD || API_PRODUCAO;

const api = require('../src/config/api');
const planoServico = require('../src/services/plano_servico');
const manifestacaoServico = require('../src/services/manifestacao_servico');
const manifestacaoModel = require('../src/models/manifestacao');

async function limparDist() {
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
}

async function copiarDiretorio(origem, destino) {
  await fs.mkdir(destino, { recursive: true });
  const entradas = await fs.readdir(origem, { withFileTypes: true });

  for (const entrada of entradas) {
    const origemEntrada = path.join(origem, entrada.name);
    const destinoEntrada = path.join(destino, entrada.name);

    if (entrada.isDirectory()) {
      await copiarDiretorio(origemEntrada, destinoEntrada);
    } else {
      await fs.copyFile(origemEntrada, destinoEntrada);
    }
  }
}

async function copiarAssets() {
  await copiarDiretorio(path.join(PUBLIC, 'css'), path.join(DIST, 'css'));
  await copiarDiretorio(path.join(PUBLIC, 'js'), path.join(DIST, 'js'));
  await copiarDiretorio(path.join(PUBLIC, 'images'), path.join(DIST, 'images'));

  const incluirCname = process.env.INCLUIR_CNAME !== 'false';
  const cname = path.join(RAIZ, 'CNAME');
  if (incluirCname) {
    try {
      await fs.copyFile(cname, path.join(DIST, 'CNAME'));
    } catch {
      /* CNAME opcional */
    }
  }

  const mock = path.join(RAIZ, 'mock.png');
  try {
    await fs.copyFile(mock, path.join(DIST, 'mock.png'));
  } catch {
    /* mock opcional */
  }
}

function renderizar(template, locals) {
  return new Promise((resolve, reject) => {
    ejs.renderFile(path.join(VIEWS, `${template}.ejs`), locals, (erro, html) => {
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
    planos,
    precificacao,
    parceiro: null,
    apiBaseUrl: api.baseUrl,
  });
}

function montarHtmlPrivacidade() {
  return renderizar('layouts/main', {
    titulo: 'Política de Privacidade - Ponto Ágil',
    pagina: 'privacidade',
    conteudoParcial: 'pages/privacidade',
    estiloPagina: 'privacidade',
    exibirWhatsapp: false,
    apiBaseUrl: api.baseUrl,
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

async function gravarPaginas() {
  const [htmlInicio, htmlPrivacidade, htmlOuvidoria] = await Promise.all([
    montarHtmlInicio(),
    montarHtmlPrivacidade(),
    montarHtmlOuvidoria(),
  ]);

  await fs.writeFile(path.join(DIST, 'index.html'), htmlInicio, 'utf8');

  await fs.mkdir(path.join(DIST, 'privacidade'), { recursive: true });
  await fs.writeFile(
    path.join(DIST, 'privacidade', 'index.html'),
    htmlPrivacidade,
    'utf8',
  );

  await fs.mkdir(path.join(DIST, 'ouvidoria'), { recursive: true });
  await fs.writeFile(
    path.join(DIST, 'ouvidoria', 'index.html'),
    htmlOuvidoria,
    'utf8',
  );
}

async function executar() {
  console.log(`Build estático → dist/ (API: ${api.baseUrl})`);

  await limparDist();
  await gravarPaginas();
  await copiarAssets();

  console.log('Build concluído.');
}

executar().catch((erro) => {
  console.error('Falha no build:', erro);
  process.exit(1);
});
