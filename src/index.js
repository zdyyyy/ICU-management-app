require('dotenv').config(); // 加载 .env 文件中的环境变量

const app = require('./app');
const config = require('./config');
const messageQueueService = require('./services/messageQueueService');

async function main() {
  await messageQueueService.init();

  const server = app.listen(config.port, () => {
    console.log(`ICU Resource Manager running at http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    await messageQueueService.close();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown().catch(console.error));
  process.on('SIGTERM', () => shutdown().catch(console.error));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
