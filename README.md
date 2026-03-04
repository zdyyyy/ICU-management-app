# ICU / Hospital Resource Manager (Ottawa 场景)

针对渥太华医院“人多床少、资源有限”的现状，用软件辅助：**让需要治疗的病人及时得到治疗**，并**改善患者等待体验**。

## 思路简述

- **分流与优先级**：按病情紧急程度（CRITICAL → LOW）和等待时间给病人排序，优先安排最需要床位的病人。
- **床位管理**：维护 ICU / Step-down / 普通床 等类型与占用状态，方便快速匹配“下一个空床给谁”。
- **等候名单**：统一等候名单 + 优先级排序，便于护士/医生一眼看到“下一个该安排谁”、以及“建议分配哪张床”。

后续可扩展：**预估等待时间**、**患者端查询状态**、**通知（短信/App）**、与医院现有系统对接等。

## 技术栈

- **Node.js** + **Express**
- 内存存储（可后续换成 PostgreSQL / MongoDB）

## 项目结构

```
ICU/
├── package.json
├── README.md
├── src/
│   ├── index.js          # 入口
│   ├── app.js            # Express 挂载路由
│   ├── config.js         # 端口、优先级等级、床位类型
│   ├── seed.js           # 开发用种子数据
│   ├── routes/
│   │   ├── patients.js   # 病人 CRUD
│   │   ├── beds.js      # 床位、分配/释放
│   │   ├── triage.js    # 优先级计算、排序
│   │   ├── waitlist.js     # 等候名单、入床建议
│   │   └── patientPortal.js # 患者端查询
│   ├── services/
│   │   ├── triageService.js    # 优先级与排序
│   │   ├── bedService.js      # 床位可用性、分配
│   │   ├── suggestionService.js # 下一个入床建议算法
│   │   └── patientPortalService.js # 患者状态、排队、预估
│   └── store/
│       └── index.js      # 内存数据
```

## 快速开始

```bash
# 安装依赖
npm install

# 写入示例数据（可选）
node src/seed.js

# 启动服务
npm start
# 或开发时自动重启
npm run dev
```

服务默认：`http://localhost:3000`

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET/POST | `/api/patients` | 病人列表 / 登记 |
| GET/PATCH | `/api/patients/:id` | 病人详情 / 更新 |
| GET/POST | `/api/beds` | 床位列表 / 新增床位 |
| GET | `/api/beds/available?type=ICU` | 可用床位 |
| POST | `/api/beds/:id/assign` | 分配病人到床（body: `{ "patientId": "..." }`） |
| POST | `/api/beds/:id/release` | 释放床位 |
| GET | `/api/triage/priority-levels` | 优先级等级说明 |
| GET | `/api/triage/waitlist-ranked` | 按优先级排序的等候名单 |
| GET/POST | `/api/waitlist` | 等候名单 / 加入名单 |
| POST | `/api/waitlist/add` | 加入等候（body: `{ "patientId": "..." }`） |
| GET | `/api/waitlist/next-bed-suggestion` | 单条：下一个建议入床的病人+床位 |
| GET | `/api/waitlist/next-bed-suggestions?limit=5` | 多条建议（床位兼容性+优先级） |
| GET | `/api/patient-portal/status?mrn=MRN001` | **患者端**：按 MRN 查状态、排队位、预估等待 |

### 下一个入床建议算法

- 按**优先级分数**（病情等级 + 等待时间）排序等候名单。
- **床位兼容**：ICU 仅匹配 ICU；STEP_DOWN/GENERAL 可互替；紧急时可“高床低用”（配置 `allowOverflowAssignment`）。
- 返回多条建议时，每条为「病人–床位–匹配质量(exact/compatible/overflow)」，不重复占用同一床/同一病人。

### 患者端 API

- 患者用 **MRN**（病历号）查询：`GET /api/patient-portal/status?mrn=MRN001`。
- 返回：`status`（WAITING/ASSIGNED）、`queuePosition`、`totalInQueue`、`estimatedWait`（类别 + 预估分钟）、`currentBed`（若已分配）、`priorityDisplay`。

## 后续可做

- 接入真实数据库（如 PostgreSQL）
- 患者端：增加 MRN+出生日期验证、短信/App 通知
- 通知：空床时短信/App 提醒家属或病人
- 仪表盘：床位占用率、平均等待时间、优先级分布
- 与 Ottawa 医院现有系统（如 ADT/EMR）做接口对接

---

**Idea 可行性**：在资源有限的前提下，用优先级 + 床位匹配 + 等候名单来“让最需要的病人先得到治疗”，并让等候更透明，是可行且有实际意义的；本仓库提供一个可运行的 Node 框架，便于你在此基础上迭代。
