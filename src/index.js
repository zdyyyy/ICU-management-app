// 引入 app.js 导出的 Express 应用实例
const app = require('./app');
// 引入配置（端口、环境等）
const config = require('./config');

// 在 config.port 上启动 HTTP 服务
app.listen(config.port, () => {
  // 启动成功后打印服务地址
  console.log(`ICU Resource Manager running at http://localhost:${config.port}`);
  // 提示可用的 API 路径
  console.log('API: /api/patients, /api/beds, /api/triage, /api/waitlist, /api/patient-portal');
});
