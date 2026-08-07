const app = require('./src/app');
const config = require('./src/config/config');

app.listen(config.porta, () => {
  console.log(`Servidor em http://localhost:${config.porta}`);
});
