# Segurança

## Modelo de ameaça

O site é publicado como HTML estático no GitHub Pages. Não existe servidor da
aplicação em produção: o código em `src/` e o `server.js` só rodam em
desenvolvimento e durante o build. Isso reduz bastante a superfície de ataque,
mas concentra o risco em dois lugares.

O primeiro é o navegador do visitante. Todo o comportamento dinâmico acontece
no cliente, então qualquer conteúdo que chega e vai para o DOM precisa ser
tratado como não confiável.

O segundo é a API externa. O site consome `plano/publico`, os endpoints de
ouvidoria e os de contratação. Essa API é mantida por outra equipe, então do
ponto de vista deste repositório ela é uma fonte externa. Se ela devolver
conteúdo inesperado, por comprometimento ou por bug, o site não pode virar
vetor de execução.

## Content Security Policy

A CSP é declarada por meta tag nas três páginas, porque o GitHub Pages não
permite configurar cabeçalho HTTP.

O ponto principal é que `script-src` não usa `unsafe-inline`. Isso só foi
possível porque a página não tem script inline: os dados que o servidor injeta
saem em blocos `<script type="application/json">`, que o navegador não executa,
e a configuração de analytics ficou em arquivo próprio. Sem essa condição a
policy precisaria liberar inline e deixaria de bloquear coisas como
`<img src=x onerror=...>`, que é exatamente o cenário que ela existe para impedir.

O `style-src` também não usa `unsafe-inline`. Os atributos `style=` literais que
existiam nas views viraram classe, e o `iframe` de impressão do contrato passou a
receber estilo por propriedade (`elemento.style.prop`) em vez de `cssText`, que a
policy trataria como estilo inline. Com isso a diretiva ficou fechada.

Uma limitação conhecida fica registrada aqui para não virar surpresa:

`frame-ancestors` só tem efeito como cabeçalho HTTP e é ignorado quando vem em
meta tag. Ele está declarado assim mesmo para já estar no lugar certo caso o
site passe a ser servido por um proxy ou CDN que permita configurar cabeçalho.
Hoje ele não protege contra clickjacking.

## Domínio da API na CSP

A diretiva `connect-src` lista o domínio da API. Se esse domínio mudar, as
chamadas passam a ser bloqueadas pelo navegador e o sintoma aparece como falha
de rede no console, não como erro de configuração. Vale lembrar disso ao mexer
em `PONTO_AGIL_API_BUILD`.

## Tratamento de conteúdo vindo da API

Existem duas situações diferentes e elas pedem soluções diferentes.

Quando o dado é texto, como nome de plano, nome de faixa ou nome de
funcionalidade, ele passa por `escaparHtml` antes de ir para o DOM. Isso vale
inclusive dentro de atributo, por isso o escape cobre aspas simples e duplas.

Quando o dado é HTML de verdade, que é o caso do corpo do contrato, escapar
quebraria a funcionalidade. Nesse caso o conteúdo passa por DOMPurify com uma
lista restrita de tags e atributos, permitindo só formatação de documento.

O contrato tem três pontos de saída e todos os três são sanitizados: a
visualização, o modal e o iframe de impressão. O iframe merece atenção especial
porque é same origin, então script executado ali roda no contexto do site.
Sanitizar só os dois primeiros deixaria o terceiro aberto.

Se o DOMPurify não carregar, a função falha fechada e mostra um aviso em vez de
renderizar o HTML sem tratamento.

## Token da ouvidoria

O acesso à ouvidoria chega por `?token=` na URL. Depois de ser guardado em
`sessionStorage`, o parâmetro é removido da barra de endereços com
`history.replaceState`.

Isso evita que ele fique no histórico do navegador, em logs de proxy e em links
que o usuário eventualmente copie para um chamado de suporte.

As requisições continuam enviando o token como estão hoje, tanto na query
quanto no cabeçalho `Authorization`. A query é redundante e poderia sair, mas
isso depende de confirmar que o backend aceita apenas o cabeçalho. Fica como
melhoria a avaliar.

## Reportando um problema

Problemas de segurança devem ser comunicados em canal privado com a equipe
responsável pelo repositório, sem abrir issue pública com detalhes de
exploração.
