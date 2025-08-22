# SVG2IMG - SVG 转图片云函数

一个轻量级的 SVG 转图片服务，基于 Deno 和 Browserless 构建，适合部署在边缘计算平台。

## ✨ 功能特性

- 🚀 **轻量高效**: 基于 Deno 运行时，无需复杂配置
- 🎯 **多种调用方式**: 支持 GET/POST 两种请求方式  
- 🎨 **多格式支持**: 支持 PNG, JPG, WebP, PDF 输出
- 🔧 **参数可定制**: 支持缩放、尺寸、质量、背景色等参数
- 🛡️ **安全可靠**: 内置域名白名单、大小限制等安全机制
- 🌐 **边缘部署**: 专为云函数/边缘计算环境设计
- ⚡ **智能缓存**: 支持 KV 缓存，减少重复渲染（Deno 平台）

## 🚀 快速开始

### 1. 配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑关键配置
export BROWSERLESS_TOKEN="your-browserless-token"  # 必需
export USE_SELF_HOSTED="false"                     # 使用云端服务
export CACHE_ENABLED="true"                        # 启用缓存（可选）
```

### 2. 本地运行

```bash
# 安装并启动（Deno 平台完整支持）
deno run --allow-net --allow-env --unstable-kv index.ts

# 测试服务
curl "http://localhost:8000/https://github.githubassets.com/pinned-octocat.svg?format=png&scale=2"
```

### 3. 部署

- **推荐**: [Deno Deploy](https://deno.com/deploy)（完整缓存支持）
- **备选**: Supabase Edge Functions, Vercel, Cloudflare（需禁用缓存）

详细部署指南请参考 [部署文档](docs/DEPLOYMENT.md)

## 📖 基础使用

### GET 请求（推荐）
```bash
# 基础转换
curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg"

# 带参数
curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg?scale=2&format=png"

# 返回 URL 模式
curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg?return_type=url"
```

### POST 请求
```bash
curl -X POST "https://your-function/svg2img" \
  -H "Content-Type: application/json" \
  -d '{
    "svg": "<svg width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"red\"/></svg>",
    "format": "png",
    "scale": 2
  }'
```

### 常用参数
- `scale`: 缩放比例 (0.1-10)
- `format`: 输出格式 (png/jpg/webp/pdf)  
- `return_type`: 返回方式 (binary/url)
- `background_color`: 背景色

完整 API 文档请参考 [API 文档](docs/API.md)

## 🔧 配置说明

### Browserless 服务

**选项一：云端服务（推荐）**
```bash
USE_SELF_HOSTED=false
BROWSERLESS_TOKEN="your-token"  # 注册 browserless.io 获取
```

**选项二：自建服务**
```bash
# 启动 Docker 容器
docker run -p 3000:3000 ghcr.io/browserless/chrome

# 配置环境变量
USE_SELF_HOSTED=true
BROWSERLESS_SELF_HOSTED_URL="ws://localhost:3000"
```

### 缓存系统

```bash
CACHE_ENABLED=true      # 启用缓存（推荐）
CACHE_KV_TYPE=deno      # 当前仅支持 Deno KV
```

> **注意**: Vercel/Cloudflare 平台的 KV 适配器尚未实现，请设置 `CACHE_ENABLED=false`

## 📁 项目结构

```
├── index.ts          # 主服务入口
├── config.ts         # 配置管理
├── utils.ts          # 工具函数和缓存系统
├── test.ts           # 测试文件
└── docs/             # 文档目录
    ├── API.md            # 完整 API 文档
    ├── DEPLOYMENT.md     # 部署指南
    └── DEVELOPMENT.md    # 开发文档
```

## �️ 安全特性

- **域名控制**: 支持白名单/黑名单机制
- **大小限制**: 限制 SVG 内容和输出图片大小  
- **超时控制**: 防止长时间阻塞
- **参数验证**: 严格的输入参数验证

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
