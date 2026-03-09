require('dotenv').config(); // 加载 .env 文件中的环境变量

const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`ICU Resource Manager running at http://localhost:${config.port}`);
});
