# 🐾 达达营养监控 — Zeabur 部署指南

## 整体流程概览

```
本地代码 → GitHub仓库 → Zeabur连接GitHub → 自动构建部署 → 获得访问链接
```

整个过程大约 **10-15 分钟**，只需要操作一次，后续改代码推送到GitHub就会自动重新部署。

---

## 第一步：初始化Git仓库并推送到GitHub

### 1.1 在项目目录初始化Git

```bash
cd /Users/royshen/WorkBuddy/2026-05-18-task-9/dog-nutrition-tracker

# 初始化
git init

# 添加所有文件（.gitignore会自动排除node_modules和data/*.db）
git add .

# 首次提交
git commit -m "🐾 达达营养监控系统 v1.0 - 含历史分析"
```

### 1.2 在GitHub创建仓库

1. 打开 https://github.com/new
2. Repository name 填：`dog-nutrition-tracker`
3. 选择 **Private**（因为是私人应用，不公开）
4. **不要**勾选 README / .gitignore / License（我们本地已有）
5. 点击 **Create repository**

### 1.3 推送代码到GitHub

```bash
# 添加远程仓库（替换为你的GitHub用户名）
git remote add origin https://github.com/你的用户名/dog-nutrition-tracker.git

# 推送到main分支
git branch -M main
git push -u origin main
```

> 💡 如果你用的SSH方式，地址改为 `git@github.com:你的用户名/dog-nutrition-tracker.git`

---

## 第二步：Zeabur 创建项目并部署

### 2.1 注册/登录 Zeabur

1. 打开 https://zeabur.com
2. 点击 **登录**，推荐用 GitHub 账号直接登录（省去绑定步骤）

### 2.2 创建新项目

1. 进入 Zeabur 控制台
2. 点击 **+ New Project**（新建项目）
3. 项目名称填：`dog-nutrition`（随意取）
4. 选择区域：**Singapore（新加坡）** — 国内访问速度最快
5. 点击创建

### 2.3 部署服务

1. 在项目页面，点击 **+ Add Service**（添加服务）
2. 选择 **Git** → **GitHub**
3. 首次需要 **Authorize Zeabur** 访问你的GitHub
4. 授权后，选择 `dog-nutrition-tracker` 仓库
5. Zeabur会自动识别Node.js项目并开始构建

### 2.4 等待构建完成

- 构建过程大约 1-2 分钟
- 你可以在日志中看到 `npm ci` 和构建进度
- 出现 `🐾 狗狗营养监控服务已启动` 表示成功

### 2.5 绑定域名

1. 服务部署成功后，点击服务名称进入详情
2. 找到 **Networking**（网络）或 **Domains**（域名）标签
3. 点击 **Generate Domain**（生成域名）
4. Zeabur会分配一个 `xxx.zeabur.app` 的域名
5. 你也可以绑定自己的域名（如果有）

> 🎉 此时访问分配的域名，就能看到应用了！

---

## 第三步：数据持久化（⚠️ 关键步骤！）

**问题**：Zeabur默认每次重新部署会重置容器文件系统，SQLite数据库会丢失！

### 方案A：使用Zeabur的持久化存储（推荐）

1. 在项目页面，点击 **+ Add Service**
2. 选择 **Prebuilt** → **Disk**（持久化存储）
3. 配置挂载路径为：`/app/data`（与server.js中的DATA_DIR对应）
4. 容量选择 1GB（足够了）

### 方案B：环境变量指定数据目录

如果Zeabur的Disk挂载路径不同，可以设置环境变量：

1. 在服务详情页找到 **Variables**（环境变量）
2. 添加：`DATA_DIR` = `/app/data`（与Disk挂载路径一致）

### 方案C：改用外部数据库（可选，长期方案）

如果数据非常重要，后续可以改用 Zeabur 提供的 PostgreSQL 服务，但 SQLite + 持久化磁盘对当前需求完全够用。

---

## 第四步：验证部署

1. 打开 Zeabur 分配的域名
2. 验证以下功能：
   - [ ] 首页正常显示"达达每日营养监控"
   - [ ] 食材库有60+种食材
   - [ ] 可以添加饮食记录
   - [ ] 历史分析页面可以查看
   - [ ] 刷新页面后数据还在（持久化生效）

---

## 日常更新流程

以后修改代码后，只需要：

```bash
cd /Users/royshen/WorkBuddy/2026-05-18-task-9/dog-nutrition-tracker

# 提交改动
git add .
git commit -m "描述你的改动"
git push
```

Zeabur 会在 1-2 分钟内自动完成重新部署。

---

## 费用说明

| 项目 | 费用 |
|------|------|
| Zeabur 免费额度 | 每月 $5 免费额度 |
| 本项目预估 | 小型应用 + SQLite，每月约 $1-3 |
| 超出后 | 按量计费，非常便宜 |

> 💡 对于这个轻量级应用，免费额度完全够用！

---

## 常见问题

### Q: 部署后打开页面是空白？
A: 检查 Zeabur 构建日志，确认没有构建错误。检查 `public/` 目录是否正确复制。

### Q: 数据第二天没了？
A: 没有配置持久化磁盘！请完成第三步。

### Q: 国内访问很慢？
A: 确认选择的是 Singapore 区域。如果绑定自定义域名，可以套 Cloudflare CDN 加速。

### Q: Chart.js 图表不显示？
A: 服务器需要能访问 `cdn.jsdelivr.net`，Zeabur海外节点没问题。如果国内加载慢，可以把Chart.js下载到本地 `public/` 目录。

### Q: 想让妈妈手机直接用？
A: 把 Zeabur 分配的域名发给妈妈，手机浏览器打开后"添加到主屏幕"，就像App一样用！
