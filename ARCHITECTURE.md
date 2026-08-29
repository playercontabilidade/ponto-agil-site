# Arquitetura do Projeto Ponto Ágil Site

Site institucional em **Node.js + Express + EJS**, organizado em **MVC**. Em desenvolvimento roda como servidor Express; em produção gera artefato estático (`dist/`) publicado no **GitHub Pages** (`portal.pontoagil.com.br`).

---

## Visão geral

| Ambiente | Como roda | Entrada |
|----------|-----------|---------|
| Desenvolvimento | `npm run dev` → Express na porta 3000 | `server.js` → `src/app.js` |
| Preview do build | `npm start` → serve `dist/` | `scripts/preview.js` |
| Produção | `npm run build` → push do conteúdo de `dist/` | GitHub Pages |

| Comando | Uso |
|---------|-----|
| `npm run dev` | Servidor Express com hot-reload manual (reiniciar ao alterar código) |
| `npm run build` | Renderiza páginas EJS e copia assets para `dist/` |
| `npm start` | Preview local do site estático gerado |
| `npm test` | Testes smoke (`node:test`) |

### Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `PORT` | Porta do servidor dev/preview (padrão: 3000) |
| `NODE_ENV` | `development` ou `production` |
| `PONTO_AGIL_API` | API usada em dev (`npm run dev`) |
| `PONTO_AGIL_API_BUILD` | API usada no `npm run build` (padrão: produção) |
| `INCLUIR_CNAME` | `false` omite `CNAME` do `dist/` (preview) |

Nunca commitar `.env`. Ver `.env.example`.

### Deploy em produção

1. `npm ci && npm run build`
2. Validar com `npm start`
3. Publicar o **conteúdo de `dist/`** na branch configurada no GitHub Pages (ex.: `master`, raiz `/`)

O GitHub Pages serve apenas arquivos estáticos. Código em `src/` e `server.js` não executam em produção.

---

## Padrão MVC

```text
Requisição HTTP
      │
      ▼
  routes/          ← define URL e método
      │
      ▼
  controllers/     ← orquestra: valida entrada, chama service, escolhe view
      │
      ├──► services/   ← regras de negócio e chamadas à API Ponto Ágil
      ├──► models/     ← estrutura de dados e helpers
      │
      ▼
  views/           ← templates EJS
      │
      ▼
  Resposta HTML ou JSON
```

### Responsabilidade de cada camada

| Camada | Faz | Não faz |
|--------|-----|---------|
| **Model** | Formato dos dados, normalização, helpers | HTTP, renderizar HTML |
| **View** | Exibir dados do controller (`<%= %>`) | Regra de negócio, `fetch` |
| **Controller** | Recebe `req`/`res`, chama service, monta locals da view | `fetch` direto (delega ao service) |
| **Service** | Integração com API, montagem de DTOs para cliente | Conhecer `req`/`res` |
| **Route** | Mapear path → controller | Lógica de aplicação |

---

## Estrutura de pastas

```text
ponto-agil-site/
├── src/
│   ├── app.js                        # Express: views, static, rotas, middleware
│   ├── config/
│   │   ├── config.js                 # variáveis de ambiente
│   │   └── api.js                    # baseUrl e endpoints da API externa
│   ├── controllers/
│   │   ├── pagina_controlador.js     # homepage, privacidade
│   │   ├── plano_controlador.js      # GET /api/planos
│   │   ├── manifestacao_controlador.js
│   │   └── parceiro_controlador.js   # query ?partner=
│   ├── middleware/
│   │   └── tratador_erro.js
│   ├── models/
│   │   ├── plano.js
│   │   ├── manifestacao.js
│   │   └── parceiro.js
│   ├── routes/
│   │   ├── index.js                  # monta rotas no app
│   │   ├── web.js                    # páginas HTML
│   │   ├── api.js                    # JSON interno
│   │   └── ouvidoria.js              # canal de ouvidoria
│   ├── services/
│   │   ├── integracao_api_servico.js
│   │   ├── plano_servico.js
│   │   └── manifestacao_servico.js
│   └── views/
│       ├── layouts/
│       │   ├── main.ejs              # shell do site principal
│       │   └── ouvidoria.ejs         # shell da ouvidoria
│       ├── pages/
│       │   ├── index.ejs
│       │   ├── privacidade.ejs
│       │   └── ouvidoria.ejs
│       └── partials/
│           ├── header.ejs
│           ├── navbar.ejs
│           ├── footer.ejs
│           ├── secao_planos.ejs
│           └── cards/
│               └── card_plano.ejs
│
├── public/
│   ├── css/
│   │   ├── style.css
│   │   └── pages/
│   ├── js/
│   │   ├── app.js                    # entry da homepage
│   │   ├── ouvidoria_app.js
│   │   ├── modules/
│   │   └── utils/
│   └── images/
│
├── scripts/
│   ├── build.js                      # gera dist/
│   └── preview.js                    # serve dist/
│
├── tests/unit/
├── dist/                             # artefato de deploy (gitignored)
├── CNAME                             # portal.pontoagil.com.br
├── server.js
└── package.json
```

---

## Fluxos de requisição

### Homepage — `GET /`

```text
GET /
  → routes/web.js
  → pagina_controlador.exibirInicio
  → plano_servico.listarPublicos()        # GET {API}/plano/publico
  → plano_servico.montarPrecificacao()
  → parceiro_controlador.obterDaRequisicao(req)
  → res.render('layouts/main', { planos, precificacao, parceiro, ... })
  → layouts/main.ejs + pages/index.ejs + partials
```

Dados injetados no HTML para o cliente saem em um bloco `<script type="application/json" id="dados-pagina">` (nao em globals `window.*`), com `apiBaseUrl`, `planos` (quando houver) e `parceiro` (quando houver). Um bloco JSON nao e executavel pelo navegador, entao a pagina dispensa `script-src 'unsafe-inline'` na CSP. No cliente, `lerDadosPagina('dados-pagina')` (em `public/js/utils/dados_pagina.js`) le e faz o parse desse bloco.

O JS em `public/js/app.js` cuida apenas de interação (menu, slider, planos, animações). A configuração do gtag saiu do inline e virou o arquivo `public/js/analytics.js`, carregado via `<script src="/js/analytics.js" defer>`.

### Privacidade — `GET /privacidade`

```text
GET /privacidade
  → routes/web.js
  → pagina_controlador.exibirPrivacidade
  → res.render('layouts/main', { pagina: 'privacidade', estiloPagina: 'privacidade', ... })
```

### Ouvidoria — `GET /ouvidoria`

```text
GET /ouvidoria
  → routes/ouvidoria.js
  → manifestacao_controlador.exibirFormulario
  → manifestacao_servico.montarConfigCliente()
  → res.render('layouts/ouvidoria', { configOuvidoria, tipoManifestacao, ... })
```

Config injetada em `<script type="application/json" id="dados-ouvidoria">` (baseUrl, endpoints, tipos de manifestação), lida no cliente com `lerDadosPagina('dados-ouvidoria')`. O formulário roda inteiramente no cliente (`public/js/modules/ouvidoria/`), chamando a API externa via `fetch`.

### API interna — `GET /api/planos`

```text
GET /api/planos
  → routes/api.js
  → plano_controlador.listarPublicosJson
  → plano_servico.listarPublicos()
  → res.json(planos)
```

Disponível apenas com Express em dev. No GitHub Pages o cliente usa o bloco `dados-pagina` (build, via `lerDadosPagina`) ou `fetch` direto à API.

### Build estático — `npm run build`

```text
scripts/build.js
  → busca planos na API (PONTO_AGIL_API_BUILD)
  → renderiza layouts/main e layouts/ouvidoria via EJS
  → grava dist/index.html, dist/privacidade/index.html, dist/ouvidoria/index.html
  → copia public/css, public/js, public/images
  → copia CNAME (se INCLUIR_CNAME ≠ false)
```

---

## API externa (Ponto Ágil)

Centralizada em `src/config/api.js`. Consumida pelos services (servidor) e injetada no cliente (ouvidoria e homepage).

| Uso | Endpoint |
|-----|----------|
| Planos públicos | `GET /plano/publico` |
| Enviar manifestação | `POST /ouvidoria/public/enviar` |
| Categorias | `GET /ouvidoria/public/categorias` |
| Prazo de resposta | `GET /ouvidoria/public/prazo-resposta` |
| Acompanhamento | `GET /ouvidoria/public/acompanhamento/:uuid` |
| Departamentos por token | `GET /departamento/por-token/listar` |

Em dev: `PONTO_AGIL_API=http://localhost:8080`. No build de produção: `PONTO_AGIL_API_BUILD` aponta para a API real.

---

## Convenções

### Nomenclatura em português (pt-BR)

Identificadores de domínio em português:

- arquivos: `pagina_controlador.js`, `plano_servico.js`, `manipulador_formulario.js`
- funções: `exibirInicio`, `listarPublicos`, `montarPrecificacao`
- variáveis: `tipoManifestacao`, `conteudoParcial`

**Exceções** (termos de framework ou padrão universal):

| Categoria | Exemplos |
|-----------|----------|
| Frameworks | `Express`, `EJS`, `fetch`, `module.exports` |
| MVC | pastas `controllers/`, `models/`, `views/`, `routes/`, `services/` |
| HTTP / Node | `req`, `res`, `next`, `GET`, `POST`, `middleware`, `router` |
| Siglas | `API`, `URL`, `CSS`, `LGPD` |
| Contratos externos | paths da API backend (`/plano/publico`) |

```text
✅ pagina_controlador.js    → exibirInicio
✅ plano_servico.js         → listarPublicos
✅ alternar_menu.js           → módulo de UI
❌ PageController.js
❌ formHandler.js
```

### Case e organização

- **Arquivos de domínio:** `snake_case` (`plano_servico.js`, `card_plano.ejs`)
- **Funções e variáveis:** `camelCase`
- **Classes CSS e rotas URL:** `kebab-case` (`/privacidade`, `.nav-link--active`)
- **Views:** uma `pages/<nome>.ejs` por rota GET; partials em `partials/`
- **Rotas JSON:** prefixo `/api` em `routes/api.js`
- **CSS global:** `public/css/style.css`; por página em `public/css/pages/<pagina>.css`
- **Config:** `.env` local; `src/config/config.js` lê `process.env`

---

## Exemplo: adicionar a página "Sobre"

### 1. View — `src/views/pages/sobre.ejs`

```ejs
<section class="page-sobre">
  <div class="container">
    <h1><%= titulo %></h1>
    <p><%= descricao %></p>
  </div>
</section>
```

### 2. Controlador — `src/controllers/pagina_controlador.js`

```js
function exibirSobre(req, res) {
  res.render('layouts/main', {
    titulo: 'Sobre o Ponto Ágil',
    pagina: 'sobre',
    conteudoParcial: 'pages/sobre',
    estiloPagina: 'sobre',
    exibirWhatsapp: false,
    descricao: 'Gestão de ponto eletrônico e RH para empresas de todos os portes.',
    apiBaseUrl: api.baseUrl,
  });
}

module.exports = { exibirInicio, exibirPrivacidade, exibirSobre };
```

### 3. Rota — `src/routes/web.js`

```js
router.get('/sobre', PaginaControlador.exibirSobre);
```

### 4. Navbar — `src/views/partials/navbar.ejs`

```ejs
<a href="/sobre" class="nav-link">Sobre</a>
```

### 5. CSS — `public/css/pages/sobre.css`

O layout `main.ejs` já carrega `estiloPagina` automaticamente:

```ejs
<link rel="stylesheet" href="/css/pages/<%= estiloPagina %>.css">
```

### 6. Build estático

Incluir a nova página em `scripts/build.js` (renderizar e gravar `dist/sobre/index.html`), seguindo o padrão de `privacidade`.

### Checklist

- [ ] `src/views/pages/<nome>.ejs`
- [ ] Método no controlador
- [ ] Rota em `src/routes/web.js`
- [ ] Link em navbar/footer
- [ ] CSS em `public/css/pages/` (se necessário)
- [ ] Entrada em `scripts/build.js` (deploy estático)
- [ ] Service + model (somente se consumir API)

---

## Rotas publicadas

| Rota | Tipo | Saída |
|------|------|-------|
| `GET /` | HTML | Homepage |
| `GET /privacidade` | HTML | Política de privacidade |
| `GET /ouvidoria` | HTML | Formulário de ouvidoria |
| `GET /api/planos` | JSON | Lista de planos (somente dev) |

No artefato estático (`dist/`):

| URL | Arquivo |
|-----|---------|
| `/` | `index.html` |
| `/privacidade/` | `privacidade/index.html` |
| `/ouvidoria/` | `ouvidoria/index.html` |
