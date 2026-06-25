const path = require('path');
const express = require('express');
const montarRotas = require('./routes');
const tratadorErro = require('./middleware/tratador_erro');

const app = express();
const raizProjeto = path.join(__dirname, '..');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/css', express.static(path.join(raizProjeto, 'public', 'css')));
app.use('/images', express.static(path.join(raizProjeto, 'public', 'images')));
app.use('/js', express.static(path.join(raizProjeto, 'public', 'js')));
app.use('/ouvidoria', express.static(path.join(raizProjeto, 'ouvidoria')));

app.get('/mock.png', (req, res) => {
  res.sendFile(path.join(raizProjeto, 'mock.png'));
});

app.get('/index.html', (req, res) => res.redirect(301, '/'));

montarRotas(app);

app.use(tratadorErro);

module.exports = app;
