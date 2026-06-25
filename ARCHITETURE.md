# Arquitetura do Projeto Ponto Ágil Site

## Estado atual vs. alvo

| Aspecto | Hoje (legado) | Alvo (MVC) |
|---------|---------------|------------|
| Stack | HTML/CSS/JS estático | Node.js + Express + EJS |
| Entrada | `index.html`, `privacidade.html` | `server.js` → `src/app.js` |
| Rotas | Arquivos no disco | `src/routes/*.js` |
| Templates | HTML monolítico | `src/views/**/*.ejs` |
| Lógica | `script.js`, `ouvidoria/script.js` | Controllers + Services |
| API externa | `fetch` no cliente | Service no servidor (e/ou módulo cliente em `public/js`) |
| Deploy | GitHub Pages (`CNAME`) | Servidor Node ou build estático |

> **Validação:** o documento abaixo descreve a arquitetura **alvo**. A pasta `src/` ainda não existe — a migração parte dos arquivos atuais listados na seção [Mapeamento do legado](#mapeamento-do-legado).

---

## Padrão MVC

```text
Requisição HTTP
      │
      ▼
  routes/          ← define URL e método (GET, POST…)
      │
      ▼
  controllers/     ← orquestra: valida entrada, chama service, escolhe view
      │
      ├──► services/   ← regras de negócio e chamadas à API Ponto Ágil
      ├──► models/     ← estrutura/dados (Plano, Manifestação, Parceiro…)
      │
      ▼
  views/           ← templates EJS (HTML renderizado no servidor)
      │
      ▼
  Resposta HTML/JSON
```

### Responsabilidade de cada camada

| Camada | Faz | Não faz |
|--------|-----|---------|
| **Model** | Define formato dos dados (campos, defaults, helpers) | Acessar HTTP, renderizar HTML |
| **View** | Exibe dados recebidos do controller (`<%= %>`) | Lógica de negócio ou chamadas à API |
| **Controller** | Recebe req/res, chama service, passa dados à view | SQL/fetch direto (delega ao service) |
| **Service** | Regras de negócio, integração com API, cache | Conhecer `req`/`res` do Express |
| **Route** | Mapear path → controller | Lógica de aplicação |

---

## Estrutura de pastas (alvo)

```text
ponto-agil-site/
├── src/
│   ├── models/
│   │   ├── Plano.js
│   │   ├── Manifestacao.js
│   │   ├── Usuario.js
│   │   └── Parceiro.js
│   │
│   ├── views/
│   │   ├── layouts/
│   │   │   └── main.ejs              # shell: <head>, header, footer, scripts
│   │   ├── pages/
│   │   │   ├── index.ejs             # homepage (hero, recursos, planos)
│   │   │   ├── privacidade.ejs
│   │   │   └── ouvidoria.ejs         # ou reutilizar módulo ouvidoria/
│   │   └── partials/
│   │       ├── header.ejs
│   │       ├── footer.ejs
│   │       ├── navbar.ejs
│   │       └── cards/
│   │           └── cardPlano.ejs
│   │
│   ├── controllers/
│   │   ├── PaginaControlador.js      # páginas estáticas (index, privacidade…)
│   │   ├── PlanoControlador.js       # listagem e seleção de planos
│   │   ├── ManifestacaoControlador.js # formulário ouvidoria (POST)
│   │   ├── ParceiroControlador.js    # query ?partner= na URL
│   │   └── ApiControlador.js         # proxy/endpoints internos (opcional)
│   │
│   ├── routes/
│   │   ├── index.js                  # agrupa e monta rotas no app
│   │   ├── web.js                    # GET páginas
│   │   ├── api.js                    # rotas JSON internas
│   │   └── ouvidoria.js              # rotas do canal de ouvidoria
│   │
│   ├── services/
│   │   ├── PlanoServico.js           # GET /plano/publico
│   │   ├── ManifestacaoServico.js    # POST /ouvidoria/public/enviar
│   │   └── IntegracaoApiServico.js   # cliente HTTP base (baseUrl, headers)
│   │
│   ├── middleware/
│   │   ├── tratadorErro.js
│   │   ├── validacao.js
│   │   └── cors.js
│   │
│   ├── config/
│   │   ├── config.js                 # variáveis de ambiente
│   │   └── api.js                    # endpoints (espelha ouvidoria/config.js)
│   │
│   └── app.js                        # Express: views, static, routes, middleware
│
├── public/                           # arquivos servidos sem processamento
│   ├── css/
│   │   ├── style.css                 # migrado de /style.css
│   │   ├── components/
│   │   └── pages/
│   │       └── ouvidoria.css
│   ├── js/
│   │   ├── app.js                    # entry do cliente
│   │   ├── modules/
│   │   │   ├── alternarMenu.js
│   │   │   ├── manipuladorFormulario.js
│   │   │   └── clienteApi.js
│   │   └── utils/
│   │       ├── formatadores.js
│   │       └── validadores.js
│   └── images/
│
├── ouvidoria/                        # legado — migrar para src/ gradualmente
│   ├── index.html
│   ├── script.js
│   ├── styles.css
│   └── config.js
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── .env
├── .gitignore
├── package.json
├── server.js                         # require('./src/app') + listen
└── README.md
```

---

## Mapeamento do legado

| Arquivo atual | Destino na migração |
|---------------|---------------------|
| `index.html` | `src/views/pages/index.ejs` + partials |
| `privacidade.html` | `src/views/pages/privacidade.ejs` |
| `style.css` | `public/css/style.css` |
| `script.js` | `public/js/modules/*` + lógica de planos em `PlanoServico` |
| `ouvidoria/*` | `src/views/pages/ouvidoria.ejs` + `ManifestacaoControlador` + `ManifestacaoServico` |
| `ouvidoria/config.js` | `src/config/api.js` |
| `images/` | `public/images/` |

### Observações de alinhamento

- **Homepage única:** hoje `index.html` concentra início, recursos e planos em seções (`#inicio`, `#recursos`, `#planos`). Na migração, pode permanecer uma única view `index.ejs` — não é obrigatório separar em `planos.ejs` e `recursos.ejs` enquanto forem âncoras na mesma página.
- **API no cliente:** `script.js` e `ouvidoria/script.js` chamam a API Ponto Ágil via `fetch`. Na migração, a lógica vai para **Services**; o JS do cliente fica apenas para interação de UI (menu, slider, formulário).
- **Parceiro:** hoje salvo em `localStorage` via hash `?partner=` — `ParceiroControlador` + `Parceiro.js` centralizam esse fluxo.
- **Ouvidoria:** manter como módulo de rotas (`routes/ouvidoria.js`) isolado facilita evolução sem impactar o site principal.

---

## Fluxo de uma requisição (exemplo: homepage)

```text
GET /
  → routes/web.js                    router.get('/', PaginaControlador.inicio)
  → PaginaControlador.inicio         const planos = await PlanoServico.listarPublicos()
  → PlanoServico                     fetch(baseUrl + '/plano/publico')
  → res.render('pages/index', { planos, titulo: '...' })
  → views/layouts/main.ejs + pages/index.ejs + partials
```

---

## Convenções

### Nomenclatura em português (pt-BR)

Todo identificador do projeto deve estar em **português do Brasil**:

- arquivos e pastas de domínio (`PaginaControlador.js`, `PlanoServico.js`, `sobre.ejs`)
- classes, funções, variáveis e parâmetros (`listarPublicos`, `descricao`, `paginaAtiva`)
- comentários e textos de commit relacionados ao código

**Única exceção:** termos de **frameworks** ou **padrões conhecidos**, quando já são convenção universal e trocar prejudica o entendimento. Exemplos permitidos em inglês:

| Categoria | Exemplos |
|-----------|----------|
| Frameworks / libs | `Express`, `EJS`, `fetch`, `module.exports` |
| Padrão MVC | pastas `controllers/`, `models/`, `views/`, `routes/`, `services/`, sufixos `Controlador`, `Servico`, `Model` |
| HTTP / Node | `req`, `res`, `next`, `GET`, `POST`, `middleware`, `router` |
| Siglas estabelecidas | `API`, `URL`, `CSS`, `LGPD` |
| Contratos externos | paths da API backend (`/plano/publico`) — definidos fora deste repositório |

```text
✅ PaginaControlador.js     → exporta função exibirSobre
✅ PlanoServico.js          → exporta listarPublicos
✅ alternarMenu.js          → módulo de UI no cliente
❌ PageController.js        → nome de domínio em inglês
❌ formHandler.js           → preferir manipuladorFormulario.js
```

### Demais convenções

- **Case:** PascalCase para classes/models/controladores/serviços; camelCase para funções e variáveis; kebab-case para classes CSS e rotas URL (`/sobre-nos`).
- **Views:** uma pasta `pages/` por rota GET; partials reutilizáveis em `partials/`.
- **Rotas:** prefixo `/api` para JSON; demais paths em `web.js`.
- **Config:** nunca commitar `.env`; `config.js` lê `process.env`.
- **CSS:** global em `style.css`; específico de página em `public/css/pages/<pagina>.css`.

---

## Exemplo: adicionar a página "Sobre"

Passo a passo para incluir `GET /sobre` seguindo o MVC.

### 1. View — `src/views/pages/sobre.ejs`

```ejs
<section class="page-sobre">
  <div class="container">
    <h1><%= titulo %></h1>
    <p><%= descricao %></p>
  </div>
</section>
```

### 2. Controlador — método em `src/controllers/PaginaControlador.js`

```js
// PaginaControlador.js
const exibirSobre = (req, res) => {
  res.render('pages/sobre', {
    titulo: 'Sobre o Ponto Ágil',
    descricao: 'Gestão de ponto eletrônico e RH para empresas de todos os portes.',
    pagina: 'sobre', // útil para marcar item ativo na navbar
  });
};

module.exports = { exibirInicio, exibirPrivacidade, exibirSobre };
```

### 3. Rota — `src/routes/web.js`

```js
const express = require('express');
const PaginaControlador = require('../controllers/PaginaControlador');

const router = express.Router();

router.get('/', PaginaControlador.exibirInicio);
router.get('/privacidade', PaginaControlador.exibirPrivacidade);
router.get('/sobre', PaginaControlador.exibirSobre);   // ← nova rota

module.exports = router;
```

### 4. Layout e navbar — `src/views/partials/navbar.ejs`

```ejs
<a href="/sobre" class="nav-link<%= pagina === 'sobre' ? ' nav-link--active' : '' %>">
  Sobre
</a>
```

### 5. CSS — `public/css/pages/sobre.css`

```css
.page-sobre { padding: 6rem 0 4rem; }
```

Incluir no layout (`main.ejs`) condicionalmente ou sempre:

```ejs
<% if (pagina === 'sobre') { %>
  <link rel="stylesheet" href="/css/pages/sobre.css">
<% } %>
```

### 6. (Opcional) Serviço — só se a página consumir API

Se "Sobre" precisar de dados dinâmicos (ex.: contagem de clientes):

```js
// src/services/EmpresaServico.js
const IntegracaoApiServico = require('./IntegracaoApiServico');

async function obterEstatisticas() {
  return IntegracaoApiServico.get('/empresa/publico/estatisticas');
}

module.exports = { obterEstatisticas };
```

```js
// PaginaControlador.exibirSobre
const EmpresaServico = require('../services/EmpresaServico');

const exibirSobre = async (req, res, next) => {
  try {
    const estatisticas = await EmpresaServico.obterEstatisticas();
    res.render('pages/sobre', { titulo: '...', estatisticas, pagina: 'sobre' });
  } catch (err) {
    next(err);
  }
};
```

### Checklist da nova página

- [ ] View em `src/views/pages/<nome>.ejs`
- [ ] Método no controlador correspondente
- [ ] Rota registrada em `src/routes/web.js`
- [ ] Link na navbar/footer (partials)
- [ ] CSS em `public/css/pages/` (se necessário)
- [ ] Serviço + Model (somente se houver dados de API)

---

## Ordem sugerida de migração

1. `package.json` + Express + EJS + `server.js` / `src/app.js`
2. Layout (`main.ejs`) + partials extraídos de `index.html`
3. `PaginaControlador` + rota `/` (homepage)
4. Migrar `privacidade.html`
5. Extrair `PlanoServico` a partir de `script.js`
6. Migrar módulo `ouvidoria/` para controladores/serviços/views
7. Mover assets para `public/` e ajustar paths
8. Testes em `tests/` para services e rotas críticas

---

## Referência rápida — endpoints da API (legado)

Definidos hoje em `ouvidoria/config.js` e usados em `script.js`:

| Uso | Endpoint |
|-----|----------|
| Planos públicos | `GET /plano/publico` |
| Enviar manifestação | `POST /ouvidoria/public/enviar` |
| Categorias | `GET /ouvidoria/public/categorias` |
| Acompanhamento | `GET /ouvidoria/public/acompanhamento/:uuid` |

Centralizar em `src/config/api.js` e consumir via `IntegracaoApiServico`.
