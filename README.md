# SVG2IMG - SVG 转图片云函数

一个轻量级的 SVG 转图片服务，基于 Deno 和 Browserless 构建，适合部署在 Supabase Edge Functions 或 Deno Deploy 等边缘计算平台。

## ✨ 功能特性

- 🚀 **轻量高效**: 基于 Deno 运行时，无需复杂配置
- 🎯 **多种调用方式**: 支持 GET/POST 两种请求方式  
- 🎨 **多格式支持**: 支持 PNG, JPG, WebP, PDF 输出
- 🔧 **参数可定制**: 支持缩放、尺寸、质量、背景色等参数
- 🛡️ **安全可靠**: 内置域名白名单、大小限制等安全机制
- 🌐 **边缘部署**: 专为云函数/边缘计算环境设计

## 🚀 快速开始

### 1. 配置方式（三种选择）

#### 方式一：修改配置文件（推荐用于 Supabase Edge Functions）
编辑 `config.ts` 中的 `overrides` 对象：
```typescript
const overrides: ConfigOverrides = {
  USE_SELF_HOSTED: "false",
  BROWSERLESS_TOKEN: "your-real-token",
  DEFAULT_FORMAT: "png",
};
```

#### 方式二：使用环境变量（推荐用于 Deno Deploy、本地开发）
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
export BROWSERLESS_TOKEN="your-real-token"
export USE_SELF_HOSTED="false"
```

#### 方式三：运行时设置环境变量
```bash
BROWSERLESS_TOKEN="your-token" USE_SELF_HOSTED="false" deno run --allow-net --allow-env index.ts
```

**配置优先级**: 配置文件覆盖 > 环境变量 > 默认值

### 2. 本地运行

```bash
# 检查代码
deno check --allow-import .

# 运行测试
deno run --allow-net --allow-env test.ts

# 启动服务
deno run --allow-net --allow-env index.ts
```

### 3. 部署到各平台

#### Supabase Edge Functions
```bash
# 修改 config.ts 中的 overrides 设置
# 部署
supabase functions deploy svg2img
```

#### Deno Deploy
```bash
# 在 Deno Deploy 控制台中设置环境变量
# 从 GitHub 导入项目即可
```

#### Railway/Vercel 等
```bash
# 在平台设置中添加环境变量
# 支持所有支持 Deno 的平台
```

## 📖 API 文档

### GET 请求方式

直接通过 URL 传递 SVG 地址：

```
GET /{svg-url}?scale={number}&format={string}&width={number}&height={number}&return_type={string}&url_expiry={number}
```

**示例**:
```bash
# 基础转换（返回图片二进制）
curl "https://your-function.supabase.co/svg2img/https://example.com/icon.svg"

# 带参数转换
curl "https://your-function.supabase.co/svg2img/https://example.com/icon.svg?scale=2&format=png&width=800&height=600"

# 返回 URL 模式
curl "https://your-function.supabase.co/svg2img/https://example.com/icon.svg?return_type=url&url_expiry=3600"
```

### POST 请求方式

通过 JSON 传递 SVG 内容：

```json
{
  "svg": "<svg>...</svg>",
  "format": "png",
  "scale": 2,
  "width": 800,
  "height": 600,
  "quality": 90,
  "background_color": "#ffffff",
  "waitFor": 1000,
  "return_type": "url",
  "url_expiry": 3600
}
```

**示例**:
```bash
# 返回图片二进制
curl -X POST "https://your-function.supabase.co/svg2img" \
  -H "Content-Type: application/json" \
  -d '{
    "svg": "<svg width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"red\"/></svg>",
    "format": "png",
    "scale": 2
  }'

# 返回 URL 模式
curl -X POST "https://your-function.supabase.co/svg2img" \
  -H "Content-Type: application/json" \
  -d '{
    "svg": "<svg width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"red\"/></svg>",
    "format": "png",
    "return_type": "url",
    "url_expiry": 3600
  }'
```

### 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `scale` | number | 1 | 缩放比例 (0.1-10) |
| `format` | string | "png" | 输出格式 (png/jpg/webp/pdf) |
| `width` | number | - | 指定宽度（像素） |
| `height` | number | - | 指定高度（像素） |  
| `quality` | number | 90 | 图片质量 (1-100，仅 jpg/webp) |
| `background_color` | string | "#ffffff" | 背景色 |
| `waitFor` | number | 1000 | 等待渲染时间（毫秒，仅 POST） |
| `return_type` | string | "binary" | 返回方式 (binary/url) |
| `url_expiry` | number | 3600 | URL 有效期（秒，仅 URL 模式） |

#### 返回方式说明

- **binary（默认）**: 直接返回图片二进制数据
- **url**: 上传到 Supabase Storage 并返回带过期时间的 URL

**URL 模式返回格式**:
```json
{
  "success": true,
  "data": {
    "url": "https://your-storage.supabase.co/storage/v1/object/sign/svg-images/file.png?token=...",
    "expires_at": "2023-12-01T10:00:00.000Z",
    "expires_in": 3600
  }
}
```

## 🔧 配置选项

在 `config.ts` 中可以配置：

- **Browserless 连接**: 
  - 自建或云端服务
  - 多 Token 池管理（逗号分隔）
  - 自动故障转移
- **默认参数**: 格式、缩放、质量等
- **安全限制**: 最大尺寸、超时时间
- **域名控制**: 白名单/黑名单
- **Storage 配置**: Supabase Storage 用于 URL 模式

### Browserless Token 池配置

支持多个 Token 提高并发处理能力：

```bash
# 单个 Token
BROWSERLESS_TOKEN="your-token"

# 多个 Token（逗号分隔）
BROWSERLESS_TOKEN="token1,token2,token3"
```

系统会自动进行：
- **轮询分配**: 基于时间戳的无状态轮询
- **故障转移**: 失败的 Token 会被临时标记，1分钟后恢复
- **负载均衡**: 分散请求到不同的 Token

### Supabase Storage 配置

URL 返回模式需要配置 Supabase Storage：

```bash
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_STORAGE_BUCKET="svg-images"
```

## 🛡️ 安全特性

- **域名白名单**: 限制允许的 SVG 来源域名
- **大小限制**: 限制 SVG 内容和输出图片大小
- **超时控制**: 防止长时间阻塞
- **内容验证**: 基础的 SVG 格式验证

## 🐳 Browserless 部署

### 使用 Docker 自建

```bash
# 启动 browserless 服务
docker run -p 3000:3000 ghcr.io/browserless/chrome

# 或使用 docker-compose
version: '3'
services:
  browserless:
    image: ghcr.io/browserless/chrome
    ports:
      - "3000:3000"
    environment:
      - CONCURRENT=10
      - TOKEN=your-secret-token
```

### 使用云端服务

注册 [browserless.io](https://browserless.io) 获取 token，在 `config.ts` 中配置：

```typescript
BROWSERLESS: {
  USE_SELF_HOSTED: false,
  TOKEN: "your-browserless-token",
}
```

## 📁 项目结构

```
├── index.ts          # 主入口文件，HTTP 服务和渲染逻辑
├── config.ts         # 配置管理，三级配置系统
├── deps.ts          # 依赖导入管理
├── utils.ts         # 工具函数，参数解析和错误处理
├── test.ts          # 测试文件
├── .env.example     # 环境变量配置示例
└── docs/            # 技术文档
    ├── technical-design.md    # 技术设计方案
    └── implementation.md      # 实施计划
```

## 🔍 错误处理

API 返回标准的错误响应：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_SVG_URL",
    "message": "Invalid SVG URL format"
  }
}
```

常见错误码：
- `MISSING_SVG_URL`: SVG URL 缺失
- `INVALID_SVG_URL`: SVG URL 格式错误
- `MISSING_SVG_CONTENT`: SVG 内容缺失
- `SVG_TOO_LARGE`: SVG 内容过大
- `INVALID_JSON`: JSON 格式错误
- `INVALID_SCALE`: 缩放比例超出范围
- `INVALID_WIDTH`: 宽度参数超出范围
- `INVALID_HEIGHT`: 高度参数超出范围
- `INVALID_QUALITY`: 质量参数超出范围
- `UNSUPPORTED_FORMAT`: 不支持的输出格式
- `INVALID_RETURN_TYPE`: 无效的返回类型
- `DOMAIN_BLOCKED`: 域名被阻止
- `DOMAIN_NOT_ALLOWED`: 域名不在白名单内
- `SVG_FETCH_FAILED`: SVG 内容获取失败
- `INVALID_SVG_CONTENT`: SVG 内容格式无效
- `SVG_FETCH_ERROR`: SVG 获取错误
- `RENDER_ERROR`: 渲染失败
- `STORAGE_UPLOAD_FAILED`: 存储上传失败
- `STORAGE_CONFIG_ERROR`: 存储配置错误
- `METHOD_NOT_ALLOWED`: 请求方法不支持

## 📈 性能优化

- **无状态设计**: 每次请求独立处理，适合边缘计算
- **资源管理**: 自动关闭浏览器实例，避免内存泄漏
- **缓存友好**: 返回适当的缓存头
- **超时控制**: 避免长时间阻塞

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
