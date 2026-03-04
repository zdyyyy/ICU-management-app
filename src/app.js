// Express 框架
const express = require('express');
// 跨域中间件，允许前端从不同域名访问 API
const cors = require('cors');
// 应用配置（端口、优先级、床位类型等）
const config = require('./config');
// 内存数据仓库与生成唯一 ID 的函数
const { store, id } = require('./store');

// 各业务模块的路由：病人、床位、分诊、候诊列表、患者门户
const patientsRouter = require('./routes/patients');
const bedsRouter = require('./routes/beds');
const triageRouter = require('./routes/triage');
const waitlistRouter = require('./routes/waitlist');
const patientPortalRouter = require('./routes/patientPortal');

// 创建 Express 应用实例
const app = express();

// 全局中间件：允许跨域
app.use(cors());
// 全局中间件：解析请求体为 JSON（Content-Type: application/json）
app.use(express.json());

// 根路径 GET / — 在浏览器打开时显示简易说明页，避免“无法访问”的空白感
app.get('/', (req, res) => {
  const port = config.port;
  // 设置响应类型为 html，并返回内联 HTML 字符串
  res.type('html').send(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>ICU Resource Manager</title></head>
<body style="font-family: system-ui; max-width: 600px; margin: 2rem auto; padding: 0 1rem;">
  <h1>ICU Resource Manager</h1>
  <p>API is running. Use these endpoints:</p>
  <ul>
    <li><a href="/api/health">/api/health</a> – health check</li>
    <li><a href="/api/patients">/api/patients</a> – patients</li>
    <li><a href="/api/beds">/api/beds</a> – beds</li>
    <li><a href="/api/triage">/api/triage</a> – triage</li>
    <li><a href="/api/waitlist">/api/waitlist</a> – waitlist</li>
    <li><a href="/api/patient-portal">/api/patient-portal</a> – patient portal</li>
  </ul>
</body>
</html>
  `);
});

// GET /api/health — 健康检查，供监控或负载均衡探测用
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'icu-resource-manager' });
});

// 将各子路由挂载到对应路径下（请求会进入各自 router 处理）
app.use('/api/patients', patientsRouter);
app.use('/api/beds', bedsRouter);
app.use('/api/triage', triageRouter);
app.use('/api/waitlist', waitlistRouter);
app.use('/api/patient-portal', patientPortalRouter);

// 仅开发环境且当前无病人数据时：自动注入示例数据，方便本地调试
if (config.env === 'development' && store.patients.length === 0) {
  // 写入 3 名示例病人（不同优先级、所需床位类型、到达时间）
  store.patients = [
    { id: id(), name: 'Patient A', mrn: 'MRN001', priorityLevel: 'CRITICAL', requiredBedType: 'ICU', arrivalTime: new Date().toISOString(), status: 'WAITING', notes: '' },
    { id: id(), name: 'Patient B', mrn: 'MRN002', priorityLevel: 'URGENT', requiredBedType: 'ICU', arrivalTime: new Date(Date.now() - 3600000).toISOString(), status: 'WAITING', notes: '' },
    { id: id(), name: 'Patient C', mrn: 'MRN003', priorityLevel: 'HIGH', requiredBedType: 'GENERAL', arrivalTime: new Date().toISOString(), status: 'WAITING', notes: '' }
  ];
  // 写入 3 张示例床位（2 张 ICU、1 张 GENERAL），初始均为可用
  store.beds = [
    { id: id(), label: 'ICU-1', type: 'ICU', status: 'AVAILABLE', patientId: null, occupiedAt: null },
    { id: id(), label: 'ICU-2', type: 'ICU', status: 'AVAILABLE', patientId: null, occupiedAt: null },
    { id: id(), label: 'GEN-1', type: 'GENERAL', status: 'AVAILABLE', patientId: null, occupiedAt: null }
  ];
  // 候诊列表：取前 2 名病人，每人一条候诊记录（id、patientId、到达时间、加入时间）
  store.waitlist = store.patients.slice(0, 2).map(p => ({ id: id(), patientId: p.id, arrivalTime: p.arrivalTime, addedAt: new Date().toISOString() }));
  console.log('Seeded sample data for development.');
}

// 导出 app，供 index.js 调用 listen 启动服务
module.exports = app;
