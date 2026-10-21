const app = require('./src/app');
const config = require('./src/config/config');

app.listen(config.porta, () => {
  console.log(`Site: http://localhost:${config.porta}`);
  console.log(`API: ${config.apiBaseUrl}`);
});
