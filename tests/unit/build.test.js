const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const DIST = path.join(RAIZ, 'dist');

before(() => {
  execSync('node scripts/build.js', {
    cwd: RAIZ,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PONTO_AGIL_API_BUILD: 'https://pontoagil.playercontabilidade.com',
    },
    stdio: 'pipe',
  });
});

test('build gera páginas HTML em dist/', () => {
  assert.ok(fs.existsSync(path.join(DIST, 'index.html')));
  assert.ok(fs.existsSync(path.join(DIST, 'privacidade', 'index.html')));
  assert.ok(fs.existsSync(path.join(DIST, 'ouvidoria', 'index.html')));
});

test('build copia assets públicos', () => {
  assert.ok(fs.existsSync(path.join(DIST, 'css', 'style.css')));
  assert.ok(fs.existsSync(path.join(DIST, 'js', 'app.js')));
  assert.ok(fs.existsSync(path.join(DIST, 'images', 'favicon.png')));
});

test('build inclui CNAME para GitHub Pages', () => {
  const cname = fs.readFileSync(path.join(DIST, 'CNAME'), 'utf8').trim();
  assert.equal(cname, 'portal.pontoagil.com.br');
});
