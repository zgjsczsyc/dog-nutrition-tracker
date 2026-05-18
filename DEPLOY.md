# 🐾 达达营养监控 — Zeabur 部署指南

## 整体流程概览

```
GitHub仓库 ✅(已完成) → Zeabur创建项目 → 添加PostgreSQL → 部署服务 → 绑定域名
```

代码已推送到 `zgjsczsyc/dog-nutrition-tracker`，只需在Zeabur操作即可。

---

## 第一步：Zeabur 创建项目

### 1.1 注册/登录 Zeabur

1. 打开 https://zeabur.com
2. 点击 **登录**，推荐用 GitHub 账号直接登录

### 1.2 创建新项目

1. 进入 Zeabur 控制台
2. 点击 **+ New Project**
3. 项目名称填：`dog-nutrition`
4. 选择区域：**Singapore（新加坡）** — 国内访问速度最快
5. 点击创建

---

## 第二步：添加 PostgreSQL 数据库 🐘

> ⚠️ 这一步必须先于部署服务完成，因为服务启动时需要 DATABASE_URL 环境变量

1. 在项目页面，点击 **+ Add Service**
2. 选择 **Prebuilt** → **PostgreSQL**
3. 选择与项目相同的区域（Singapore）
4. 等待 PostgreSQL 实例创建完成（约30秒）
5. 创建完成后，Zeabur 会自动生成连接信息

### 获取 DATABASE_URL

1. 点击 PostgreSQL 服务进入详情
2. 找到 **Variables**（变量）标签
3. 你会看到 Zeabur 已自动生成 `DATABASE_URL` 变量
4. **记下这个变量的引用格式**（通常是 `${POSTGRES_DATABASE_URL}`）

---

## 第三步：部署应用服务

1. 回到项目页面，点击 **+ Add Service**
2. 选择 **Git** → **GitHub**
3. 首次需要 **Authorize Zeabur** 访问你的GitHub
4. 授权后，选择 `dog-nutrition-tracker` 仓库
5. Zeabur会自动识别Node.js项目

### ⚠️ 关键：配置环境变量

在服务开始构建之前，先配置环境变量：

1. 点击部署的服务进入详情
2. 找到 **Variables**（环境变量）标签
3. 添加变量：
   - 变量名：`DATABASE_URL`
   - 变量值：选择 **Reference**，引用 PostgreSQL 服务的 `DATABASE_URL`
4. 点击保存

### 等待构建完成

- 构建过程大约 1-2 分钟
- 日志中出现 `🐘 检测到 DATABASE_URL，使用 PostgreSQL` 表示数据库连接成功
- 出现 `🐾 狗狗营养监控服务已启动 [🐘 PostgreSQL]` 表示部署成功

---

## 第四步：绑定域名

1. 服务部署成功后，点击服务名称进入详情
2. 找到 **Networking**（网络）或 **Domains**（域名）标签
3. 点击 **Generate Domain**（生成域名）
4. Zeabur会分配一个 `xxx.zeabur.app` 的域名

> 🎉 此时访问分配的域名，就能看到应用了！

---

## 第五步：验证部署

1. 打开 Zeabur 分配的域名
2. 验证以下功能：
   - [ ] 首页正常显示"达达每日营养监控"
   - [ ] 食材库有60+种食材
   - [ ] 可以添加饮食记录
   - [ ] 历史分析页面可以查看
   - [ ] 刷新页面后数据还在（PostgreSQL 持久化）

---

## 数据库架构说明

| 模式 | 何时使用 | 数据持久性 | 说明 |
|------|---------|-----------|------|
| 🐘 **PostgreSQL** | 线上（Zeabur） | ✅ 永久保存 | 云端托管，自动备份，不丢失 |
| 📦 **SQLite** | 本地开发 | 本地文件 | 零配置，无需安装数据库 |

系统通过环境变量 `DATABASE_URL` 自动判断：
- **有 DATABASE_URL** → 使用 PostgreSQL
- **无 DATABASE_URL** → 使用 SQLite

无需手动切换，本地开发始终用SQLite，部署到Zeabur自动用PostgreSQL。

---

## 费用说明

| 项目 | 月费 | 说明 |
|------|------|------|
| Zeabur 免费额度 | $5/月 | 新用户赠送 |
| Node.js 服务 | ~$1-2/月 | 轻量应用 |
| PostgreSQL | ~$1-3/月 | 最小规格 |
| **合计预估** | **~$2-5/月** | 免费额度基本覆盖 |

---

## 日常更新流程

修改代码后只需：

```bash
cd /Users/royshen/WorkBuddy/2026-05-18-task-9/dog-nutrition-tracker
git add . && git commit -m "描述改动" && git push
```

Zeabur 会在 1-2 分钟内自动重新部署。数据在PostgreSQL中，重新部署不会丢失。

---

## 常见问题

### Q: 部署后打开页面是空白？
A: 检查 Zeabur 构建日志，确认 `npm ci` 成功且 `public/` 目录已复制。

### Q: 日志显示"使用SQLite"而不是PostgreSQL？
A: 环境变量 `DATABASE_URL` 没有正确设置。检查是否引用了 PostgreSQL 服务的变量。

### Q: 国内访问很慢？
A: 确认选择的是 Singapore 区域。绑定自定义域名 + Cloudflare CDN 可加速。

### Q: Chart.js 图表不显示？
A: Zeabur海外节点加载CDN没问题。如果国内加载慢，可以把Chart.js下载到 `public/` 目录。

### Q: 想让妈妈手机直接用？
A: 把域名发给妈妈，手机浏览器打开后"添加到主屏幕"即可，体验跟App一样！

### Q: 如何备份数据库？
A: Zeabur的PostgreSQL有自动备份。也可以通过 `pg_dump` 手动导出备份。
