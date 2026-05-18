# ===== Dockerfile - 狗狗营养监控系统 =====
FROM node:20-alpine

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码（不包含 node_modules）
COPY server.js ./
COPY public/ ./public/
COPY data/ ./data/

# Zeabur 动态端口
ENV PORT=3000
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
