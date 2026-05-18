# 🐾 达达营养监控 — Zeabur + Supabase 部署指南

## 架构总览

```
┌─────────────────────────────────────────────────┐
│  你妈妈的手机浏览器                                │
│  ↓ 访问 xxx.zeabur.app                          │
├─────────────────────────────────────────────────┤
│  Zeabur (新加坡 $2/月)                           │
│  ├─ Node.js Express 服务 (你的应用代码)           │
│  └─ 通过 DATABASE_URL 连接 ↓                    │
├─────────────────────────────────────────────────┤
│  Supabase (免费)                                 │
│  └─ PostgreSQL 数据库 (500MB, 自动备份)           │
└─────────────────────────────────────────────────┘
```

**月费总计：~$2（约 ¥14）**

- Zeabur 服务器：$2/月（你已选的新加坡节点）
- Supabase PostgreSQL：**免费**（500MB，达达用到20岁都用不完）

---

## 第一步：创建 Supabase 项目 🐘

### 1.1 注册/登录 Supabase

1. 打开 https://supabase.com
2. 点击 **Start your project**，推荐用 GitHub 账号直接登录

### 1.2 创建新项目

1. 进入 Dashboard，点击 **New Project**
2. 填写：
   - **Name**：`dog-nutrition`（或任意名称）
   - **Database Password**：⚠️ **设一个强密码并保存好**（后面要用）
   - **Region**：选 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**
     - 推荐东京节点，和你的 Zeabur 新加坡服务器延迟更低
3. 点击 **Create new project**，等待约 2 分钟

### 1.3 获取数据库连接字符串

1. 项目创建完成后，进入 **Project Settings**（左下角齿轮图标）
2. 点击 **Database**
3. 找到 **Connection string** 区域
4. 选择 **URI** 格式，复制连接字符串

连接字符串格式类似：
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

⚠️ **重要**：把 `[YOUR-PASSWORD]` 替换成你在 1.2 步设置的密码！

### 1.4 选择连接模式

Supabase 提供两种连接方式：

| 模式 | 地址特征 | 适用场景 | 推荐度 |
|------|---------|---------|--------|
| **直连模式** | `db.xxxxx.supabase.co:5432` | 长连接服务器（我们的场景） | ✅ 推荐 |
| **连接池模式** | `pooler.supabase.com:6543` | Serverless / 短连接 | 不需要 |

**如何获取直连地址**：
1. 在 Project Settings → Database → Connection string
2. 切换到 **Direct connection** 标签
3. 复制 URI 格式，替换密码

最终你的 `DATABASE_URL` 应该类似：
```
postgresql://postgres.xxxxx:你的密码@db.xxxxx.supabase.co:5432/postgres
```

> 💡 两种模式都能用。如果直连偶尔超时，换池模式也行。我们的代码已做了连接池限制（max=5），不会超 Supabase 的连接上限。

---

## 第二步：Zeabur 部署应用 🚀

### 2.1 创建 Zeabur 项目

1. 打开 https://zeabur.com 并登录
2. 点击 **+ New Project**
3. 项目名称：`dog-nutrition`
4. 区域：**Singapore（新加坡）** — 你已选的 $2/月节点

### 2.2 部署 Git 服务

1. 在项目页面，点击 **+ Add Service**
2. 选择 **Git** → **GitHub**
3. 首次需要授权 Zeabur 访问你的 GitHub
4. 选择 `dog-nutrition-tracker` 仓库
5. Zeabur 会自动识别 Node.js 项目

### 2.3 ⚠️ 关键：配置环境变量

**在服务构建之前**，先设置环境变量：

1. 点击部署的服务进入详情
2. 找到 **Variables**（环境变量）标签
3. 添加变量：
   - 变量名：`DATABASE_URL`
   - 变量值：粘贴第一步获取的 Supabase 连接字符串
4. 点击保存

### 2.4 等待构建完成

- 构建过程约 1-2 分钟
- 日志中出现 `🐘 检测到 DATABASE_URL，使用 PostgreSQL` → 数据库连接配置正确
- 出现 `✅ PostgreSQL 连接成功` → Supabase 连通！
- 出现 `🐾 狗狗营养监控服务已启动 [🐘 PostgreSQL]` → 部署成功 🎉

---

## 第三步：绑定域名 🌐

1. 服务部署成功后，点击服务名称进入详情
2. 找到 **Networking** / **Domains** 标签
3. 点击 **Generate Domain**
4. Zeabur 分配一个 `xxx.zeabur.app` 的域名

> 🎉 访问这个域名，就能看到应用了！

---

## 第四步：验证部署 ✅

1. 打开 Zeabur 分配的域名
2. 验证以下功能：
   - [ ] 首页正常显示"达达每日营养监控"
   - [ ] 食材库有 64 种食材（Supabase 首次启动会自动初始化）
   - [ ] 可以添加饮食记录
   - [ ] 历史分析页面可以查看
   - [ ] 刷新页面后数据还在（Supabase 持久化）
   - [ ] 修改营养上限能保存

---

## 本地开发

本地无需 Supabase，代码会自动回退到 SQLite：

```bash
cd /Users/royshen/WorkBuddy/2026-05-18-task-9/dog-nutrition-tracker
npm start
# → 📦 未检测到 DATABASE_URL，使用 SQLite（本地模式）
```

如果想本地也连 Supabase PostgreSQL 测试：

```bash
DATABASE_URL="postgresql://postgres.xxxxx:密码@db.xxxxx.supabase.co:5432/postgres" npm start
# → 🐘 检测到 DATABASE_URL，使用 PostgreSQL
```

---

## 数据库模式自动切换

| 模式 | 触发条件 | 数据持久性 | 用途 |
|------|---------|-----------|------|
| 🐘 **PostgreSQL** | 有 `DATABASE_URL` | ✅ 云端永久保存 | 线上（Supabase） |
| 📦 **SQLite** | 无 `DATABASE_URL` | 本地文件 | 开发测试 |

系统自动判断，无需手动切换。

---

## 费用说明

| 项目 | 月费 | 说明 |
|------|------|------|
| Zeabur 服务器 | $2 | 新加坡节点（你已选的） |
| Supabase Free Tier | **$0** | 500MB 数据库 + 2GB 带宽/月 |
| **合计** | **~$2/月（约¥14）** | 达达用到20岁都够 |

Supabase 免费额度：
- 数据库空间：500MB（纯文本数字，用到天荒地老）
- 带宽：2GB/月（日常记录远远用不完）
- 自动备份：✅ 每日备份
- 连接数：最多 60 个直连（我们的池上限设为 5，绰绰有余）

---

## 日常更新流程

修改代码后只需：

```bash
cd /Users/royshen/WorkBuddy/2026-05-18-task-9/dog-nutrition-tracker
git add . && git commit -m "描述改动" && git push
```

Zeabur 会在 1-2 分钟内自动重新部署。数据在 Supabase，重新部署不丢失。

---

## 常见问题

### Q: 日志显示"使用SQLite"而不是PostgreSQL？
A: 环境变量 `DATABASE_URL` 没设置或值不对。检查 Zeabur 的 Variables 配置。

### Q: PostgreSQL 连接失败？
A: 检查几点：
1. 密码中的特殊字符是否做了 URL 编码（如 `#` → `%23`）
2. 是否选了直连模式（`db.xxx.supabase.co:5432`）
3. Supabase 项目是否已暂停（免费项目 7 天无活动会暂停，去 Dashboard 点 Resume）

### Q: Supabase 项目暂停了？
A: 免费项目 7 天无 API 调用会自动暂停。去 Supabase Dashboard 点击 **Restore** 即可恢复，数据不丢失。

### Q: 国内访问慢？
A: 新加坡节点到国内延迟约 50-80ms，日常使用够用。如果觉得慢，可绑定自定义域名 + Cloudflare CDN 加速。

### Q: 想让妈妈手机直接用？
A: 把 `xxx.zeabur.app` 域名发给妈妈，手机浏览器打开后 **"添加到主屏幕"**，体验跟 App 一样！

### Q: 如何备份数据？
A: Supabase Free Tier 每日自动备份。也可手动导出：
1. Supabase Dashboard → Database → Backups
2. 或用 `pg_dump` 命令行导出

### Q: 数据库密码忘了？
A: Supabase Dashboard → Project Settings → Database → 可以重置密码（重置后需更新 Zeabur 的 `DATABASE_URL` 环境变量）

---

## 关于"Supabase SDK 不需要后端"的说明

Supabase 确实提供 REST API + JS SDK，可以直接从前端操作数据库，省掉后端。但对于我们的项目：

| 考量 | 用 SDK 直连 | 保持 Express 后端 + Supabase PostgreSQL |
|------|-----------|--------------------------------------|
| 改动量 | 需要重写整个前端 | ✅ 几乎零改动 |
| 安全性 | 前端暴露数据库 anon key | ✅ 后端代理，数据库不可直连 |
| 数据验证 | 需配置 RLS 策略 | ✅ 后端已有完整校验 |
| 维护成本 | 需学 Supabase SDK + RLS | ✅ 已有的代码直接跑 |

**结论**：保持现有 Express 后端 + Supabase 当纯 PostgreSQL 用 = 零风险、零改动、立即上线 🚀
