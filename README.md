# 🐾 达达每日营养监控系统

为老年多系统疾病狗狗（达达）设计的每日饮食营养监控系统，支持食材管理和每日摄入追踪。

## 功能特性

- **食材数据库**：64种食材预置，支持增删改查，每种含蛋白/热量/脂肪/磷/钙/钾六项指标
- **每日饮食记录**：支持早饭/午饭/晚饭/夜宵/加餐五种餐次，每餐选择食材+用量
- **营养自动计算**：实时计算各餐及每日营养总量，自动计算脂肪/热量比
- **上限对比**：对比NRC 2006 / IRIS CKD / ACVIM推荐上限，进度条直观展示
- **设置灵活可调**：支持根据CKD分期灵活调整各项营养上限
- **移动端友好**：全响应式设计，手机/平板/电脑均可使用

## 技术栈

- **后端**：Node.js + Express + SQLite3
- **前端**：原生 HTML/CSS/JS（SPA，无需构建）
- **数据持久化**：SQLite（文件数据库，部署在容器内 volume）

## 本地运行

```bash
cd dog-nutrition-tracker
npm install
npm start
# 访问 http://localhost:3000
```

## Zeabur 部署指南

### 方式一：GitHub 部署（推荐）

1. **推送代码到 GitHub**
   ```bash
   cd dog-nutrition-tracker
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create dog-nutrition-tracker --private --push
   ```

2. **Zeabur 控制台部署**
   - 访问 [zeabur.com](https://zeabur.com)，登录账号
   - 点击 "New Project" → "Deploy from GitHub"
   - 授权 GitHub，选择 `dog-nutrition-tracker` 仓库
   - Zeabur 会自动检测为 Node.js 应用，无需额外配置
   - 点击 Deploy 等待构建完成

3. **环境变量（可选）**
   - `PORT`：服务端口（默认3000，Zeabur 会自动注入）
   - `DATA_DIR`：数据目录（默认 `./data`，数据库文件保存在此）

### 方式二：Docker 部署

```bash
# 构建镜像
docker build -t dog-nutrition-tracker .

# 运行容器
docker run -d -p 3000:3000 \
  -v ./data:/app/data \
  --name dog-nutrition \
  dog-nutrition-tracker
```

## 数据说明

### 默认营养上限（NRC 2006 / IRIS CKD 标准，7.2kg 体重）

| 指标 | 单位 | 上限 |
|------|------|------|
| 蛋白质 | g/天 | 20.16 |
| 热量 | kcal/天 | 576 |
| 脂肪 | g/天 | 10.8 |
| 磷 | mg/天 | 432 |
| 钙 | mg/天 | 864 |
| 钾 | mg/天 | 1440 |

> ⚠️ 以上为默认参考值，可根据达达的CKD分期在"设置"页面调整

### 脂肪/热量比参考
- ✅ <1.5 g/100kcal：适宜（绿色）
- ⚠️ 1.5-2.0：略偏高（黄色）
- 🔴 2.0-2.5：偏高（橙色）
- 🚨 >2.5：过高（红色）

## API 接口

```
GET  /api/ingredients?search=关键词   # 获取食材列表
POST /api/ingredients                 # 新增食材
PUT  /api/ingredients/:id             # 修改食材
DELETE /api/ingredients/:id          # 删除食材

GET  /api/diet/:date                 # 查询某日饮食记录
POST /api/diet                       # 新增饮食记录
PUT  /api/diet/:id                   # 更新用量
DELETE /api/diet/:id                 # 删除记录

GET  /api/limits                     # 获取营养上限
PUT  /api/limits                      # 更新营养上限

GET  /api/history?month=2026-05      # 查询历史记录
```

## 项目结构

```
dog-nutrition-tracker/
├── server.js          # Express 后端（API + SQLite）
├── public/
│   └── index.html     # 前端单页应用
├── data/              # 数据库文件目录（gitignore）
├── package.json
├── Dockerfile
└── .gitignore
```
