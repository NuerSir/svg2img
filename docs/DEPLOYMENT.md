# 部署指南

本指南将帮助你在不同平台上部署 SVG2IMG 服务。

## 🎯 平台选择

### 推荐平台

| 平台 | 缓存支持 | 部署难度 | 性能 | 推荐指数 |
|------|----------|----------|------|----------|
| **Deno Deploy** | ✅ 完整支持 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Supabase Edge Functions | ❌ 需禁用 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Vercel | ❌ 需禁用 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Cloudflare Workers | ❌ 需禁用 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

> **注意**: Vercel 和 Cloudflare 的 KV 适配器尚未实现，部署时需设置 `CACHE_ENABLED=false`

## 🚀 Deno Deploy（推荐）

### 优势
- ✅ 完整的 KV 缓存支持
- ✅ 原生 Deno 环境，性能最佳
- ✅ 全球边缘节点分布
- ✅ 免费额度充足

### 部署步骤

**1. 准备代码**
```bash
# 克隆或上传代码到 GitHub
git clone your-repo
cd svg2img
```

**2. 配置环境变量**

在 Deno Deploy 项目设置中添加：

```bash
# 必需配置
BROWSERLESS_TOKEN=your-browserless-token
USE_SELF_HOSTED=false

# 缓存配置（推荐）
CACHE_ENABLED=true
CACHE_KV_TYPE=deno

# URL 返回模式配置（可选）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=svg-images

# 安全配置（可选）
ALLOWED_DOMAINS=cdn.jsdelivr.net,unpkg.com
BLOCKED_DOMAINS=localhost,127.0.0.1

# 默认参数（可选）
DEFAULT_FORMAT=png
DEFAULT_SCALE=1
DEFAULT_QUALITY=90
```

**3. 部署设置**
- **Build Command**: 留空
- **Entry Point**: `index.ts`
- **Environment**: Production

**4. 本地测试**
```bash
# 使用与 Deno Deploy 相同的标志
deno run --allow-net --allow-env --unstable-kv index.ts
```

## 🔵 Supabase Edge Functions

### 优势
- ✅ 与 Supabase 生态集成良好
- ✅ 内置 Storage 支持
- ✅ 简单的部署流程

### 部署步骤

**1. 安装 Supabase CLI**
```bash
npm install -g supabase
supabase login
```

**2. 配置项目**
```bash
# 初始化项目（如果还没有）
supabase init

# 创建函数
supabase functions new svg2img
```

**3. 复制代码**
```bash
# 将项目文件复制到 functions/svg2img/ 目录
cp index.ts config.ts utils.ts deps.ts supabase/functions/svg2img/
```

**4. 配置方式**

**方式一：修改 config.ts（推荐）**
```typescript
// supabase/functions/svg2img/config.ts
const overrides: ConfigOverrides = {
  USE_SELF_HOSTED: "false",
  BROWSERLESS_TOKEN: "your-real-token",
  CACHE_ENABLED: "false", // Supabase 暂不支持 KV 缓存
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key",
};
```

**方式二：环境变量**
```bash
# 在 Supabase 项目设置中添加
supabase secrets set BROWSERLESS_TOKEN=your-token
supabase secrets set CACHE_ENABLED=false
```

**5. 部署**
```bash
supabase functions deploy svg2img
```

## 🟢 Vercel

### 部署步骤

**1. 项目配置**

创建 `vercel.json`:
```json
{
  "functions": {
    "index.ts": {
      "runtime": "edge"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.ts"
    }
  ]
}
```

**2. 环境变量**

在 Vercel 项目设置中添加：
```bash
BROWSERLESS_TOKEN=your-token
USE_SELF_HOSTED=false
CACHE_ENABLED=false  # Vercel KV 适配器尚未实现
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**3. 部署**
```bash
# 使用 Vercel CLI
npx vercel

# 或连接 GitHub 自动部署
```

## 🟠 Cloudflare Workers

### 部署步骤

**1. 安装 Wrangler**
```bash
npm install -g wrangler
wrangler login
```

**2. 配置 wrangler.toml**
```toml
name = "svg2img"
main = "index.ts"
compatibility_date = "2023-12-01"

[env.production.vars]
BROWSERLESS_TOKEN = "your-token"
USE_SELF_HOSTED = "false"
CACHE_ENABLED = "false"  # Cloudflare KV 适配器尚未实现
```

**3. 部署**
```bash
wrangler deploy
```

## 🛠️ 自建环境（Docker）

### 完整自建方案

**1. 创建 docker-compose.yml**
```yaml
version: '3.8'

services:
  browserless:
    image: ghcr.io/browserless/chrome
    ports:
      - "3000:3000"
    environment:
      - CONCURRENT=10
      - TOKEN=your-secret-token
      - MAX_PAYLOAD_SIZE=30MB
    restart: unless-stopped

  svg2img:
    build: .
    ports:
      - "8000:8000"
    environment:
      - USE_SELF_HOSTED=true
      - BROWSERLESS_SELF_HOSTED_URL=ws://browserless:3000
      - BROWSERLESS_TOKEN=your-secret-token
      - CACHE_ENABLED=true
      - CACHE_KV_TYPE=deno
    depends_on:
      - browserless
    restart: unless-stopped
```

**2. 创建 Dockerfile**
```dockerfile
FROM denoland/deno:1.40.0

WORKDIR /app

# 复制文件
COPY . .

# 缓存依赖
RUN deno cache index.ts

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["deno", "run", "--allow-net", "--allow-env", "--unstable-kv", "index.ts"]
```

**3. 启动服务**
```bash
docker-compose up -d
```

## 🔧 配置详解

### 环境变量配置

#### 必需配置
```bash
# Browserless 配置
BROWSERLESS_TOKEN=your-token        # 云端服务 token
USE_SELF_HOSTED=false              # 是否使用自建服务

# 或自建服务配置
USE_SELF_HOSTED=true
BROWSERLESS_SELF_HOSTED_URL=ws://localhost:3000
```

#### 缓存配置
```bash
CACHE_ENABLED=true                 # 启用缓存
CACHE_KV_TYPE=deno                # KV 类型（目前仅支持 deno）
```

#### Storage 配置（URL 返回模式）
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=svg-images
```

#### 安全配置
```bash
# 域名白名单（逗号分隔，留空表示允许所有）
ALLOWED_DOMAINS=cdn.jsdelivr.net,unpkg.com,example.com

# 域名黑名单（逗号分隔）
BLOCKED_DOMAINS=localhost,127.0.0.1,0.0.0.0,10.0.0.0,192.168.0.0

# 大小限制
MAX_WIDTH=2048                     # 最大输出宽度
MAX_HEIGHT=2048                    # 最大输出高度
MAX_SVG_SIZE=1048576              # 最大 SVG 大小（字节）
TIMEOUT=30000                      # 请求超时时间（毫秒）
```

#### 默认参数
```bash
DEFAULT_FORMAT=png                 # 默认输出格式
DEFAULT_SCALE=1                   # 默认缩放比例
DEFAULT_QUALITY=90                # 默认图片质量
DEFAULT_BACKGROUND_COLOR=#ffffff  # 默认背景色
DEFAULT_WAIT_FOR=1000            # 默认等待时间（毫秒）
DEFAULT_RETURN_TYPE=binary       # 默认返回方式
DEFAULT_URL_EXPIRY=3600          # 默认 URL 有效期（秒）
```

### Browserless 服务配置

#### 云端服务（推荐）

**1. 注册账号**
- 访问 [browserless.io](https://browserless.io)
- 注册并获取 API Token

**2. 配置 Token 池**
```bash
# 单个 Token
BROWSERLESS_TOKEN=your-token

# 多个 Token（提高并发能力）
BROWSERLESS_TOKEN=token1,token2,token3
```

**3. Token 管理特性**
- ✅ 自动轮询分配
- ✅ 故障转移（失败 Token 暂时排除）
- ✅ 负载均衡

#### 自建服务

**1. Docker 启动**
```bash
# 基础启动
docker run -p 3000:3000 ghcr.io/browserless/chrome

# 带配置启动
docker run -p 3000:3000 \
  -e CONCURRENT=10 \
  -e TOKEN=your-secret-token \
  -e MAX_PAYLOAD_SIZE=30MB \
  ghcr.io/browserless/chrome
```

**2. 配置连接**
```bash
USE_SELF_HOSTED=true
BROWSERLESS_SELF_HOSTED_URL=ws://localhost:3000
BROWSERLESS_TOKEN=your-secret-token  # 如果设置了 TOKEN
```

## 🔍 部署验证

### 健康检查
```bash
# 基础功能测试
curl "https://your-function/svg2img/https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/icons/home.svg"

# 参数测试
curl "https://your-function/svg2img/https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/icons/user.svg?scale=2&format=png"

# POST 测试
curl -X POST "https://your-function/svg2img" \
  -H "Content-Type: application/json" \
  -d '{"svg": "<svg width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"red\"/></svg>", "format": "png"}'
```

### 缓存验证（仅 Deno Deploy）
```bash
# 第一次请求
time curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg"

# 第二次请求（应该更快）
time curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg"
```

### 错误处理测试
```bash
# 无效 URL
curl "https://your-function/svg2img/invalid-url"

# 无效参数
curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg?scale=100"
```

## 🚨 故障排除

### 常见问题

**1. 连接 Browserless 失败**
```
Error: connect ECONNREFUSED
```
- 检查 `BROWSERLESS_TOKEN` 是否正确
- 检查网络连接
- 验证 Browserless 服务状态

**2. KV 缓存不可用**
```
Error: Deno KV not available
```
- 确保使用 `--unstable-kv` 标志
- 检查平台是否支持 Deno KV
- 或设置 `CACHE_ENABLED=false`

**3. Storage 上传失败**
```
Error: Storage upload failed
```
- 检查 Supabase 配置是否正确
- 验证 Storage bucket 是否存在
- 确认 anon key 权限

**4. 域名被阻止**
```
Error: Domain blocked
```
- 检查 `ALLOWED_DOMAINS` 配置
- 更新 `BLOCKED_DOMAINS` 设置

### 日志调试

**Deno Deploy 日志**
- 在项目控制台查看实时日志
- 使用 `console.log` 添加调试信息

**本地调试**
```bash
# 启用详细日志
DEBUG=1 deno run --allow-net --allow-env --unstable-kv index.ts
```

## 🎛️ 性能优化

### 缓存策略
- **启用 KV 缓存**：在支持的平台上启用
- **合理设置 TTL**：与 Storage URL 过期时间同步
- **Cache-Control 头**：设置适当的浏览器缓存

### 并发优化
- **多 Token 池**：配置多个 Browserless Token
- **适当的超时**：根据网络情况调整 `TIMEOUT`
- **资源限制**：设置合理的 `MAX_WIDTH/HEIGHT`

### 成本优化
- **使用缓存**：减少 Browserless 调用次数
- **合理的参数**：避免过大的输出尺寸
- **监控用量**：定期检查 Browserless 用量

## 📊 监控与维护

### 关键指标
- 请求成功率
- 平均响应时间
- Browserless 用量
- 缓存命中率

### 维护建议
- 定期更新依赖
- 监控错误日志
- 备份配置文件
- 测试新版本功能
