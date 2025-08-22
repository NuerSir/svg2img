# API 文档

SVG2IMG 提供了简单易用的 REST API 来将 SVG 转换为各种图片格式。

## 请求方式

### GET 请求

通过 URL 路径传递 SVG 地址：

```
GET /{svg-url}?param1=value1&param2=value2
```

**URL 格式说明**：
- SVG URL 直接作为路径传递，如：`/https://github.githubassets.com/pinned-octocat.svg`
- 参数通过查询字符串传递

**示例**：
```bash
# 基础转换
curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg"

# 2倍缩放，PNG 格式
curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg?scale=2&format=png"

# 指定尺寸
curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg?width=800&height=600"

# 返回 URL 模式
curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg?return_type=url&url_expiry=3600"

# 自定义背景色
curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg?background_color=transparent"

# JPG 格式，高质量
curl "https://your-function/svg2img/https://github.githubassets.com/pinned-octocat.svg?format=jpg&quality=95"
```

### POST 请求

通过 JSON 请求体传递 SVG 内容：

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
  "return_type": "binary",
  "url_expiry": 3600
}
```

**示例**：
```bash
# 基础转换
curl -X POST "https://your-function/svg2img" \
  -H "Content-Type: application/json" \
  -d '{
    "svg": "<svg width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"40\" fill=\"red\"/></svg>",
    "format": "png"
  }'

# 复杂转换
curl -X POST "https://your-function/svg2img" \
  -H "Content-Type: application/json" \
  -d '{
    "svg": "<svg width=\"200\" height=\"200\"><rect x=\"10\" y=\"10\" width=\"180\" height=\"180\" fill=\"blue\"/></svg>",
    "format": "webp",
    "scale": 1.5,
    "quality": 85,
    "background_color": "transparent",
    "waitFor": 2000,
    "return_type": "url",
    "url_expiry": 7200
  }'
```

## 参数详解

### 通用参数

| 参数名 | 类型 | 默认值 | 取值范围 | 说明 |
|--------|------|--------|----------|------|
| `scale` | number | 1 | 0.1-10 | 缩放比例 |
| `format` | string | "png" | png/jpg/jpeg/webp/pdf | 输出格式 |
| `width` | number | - | 1-2048 | 指定输出宽度（像素） |
| `height` | number | - | 1-2048 | 指定输出高度（像素） |
| `quality` | number | 90 | 1-100 | 图片质量（仅 JPG/WebP） |
| `background_color` | string | "#ffffff" | CSS 颜色值 | 背景色 |
| `return_type` | string | "binary" | binary/url | 返回方式 |
| `url_expiry` | number | 3600 | 60-86400 | URL 有效期（秒，仅 URL 模式） |

### POST 专用参数

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `svg` | string | - | SVG 内容（必需） |
| `waitFor` | number | 1000 | 等待渲染时间（毫秒） |

### 参数说明

#### scale（缩放比例）
- 控制输出图片的整体大小
- `scale=2` 表示 2 倍放大
- `scale=0.5` 表示缩小到一半

#### format（输出格式）
- **png**: 支持透明背景，适合图标
- **jpg/jpeg**: 文件较小，适合照片
- **webp**: 现代格式，压缩率高
- **pdf**: 矢量格式，适合文档

#### width/height（指定尺寸）
- 可以单独指定宽度或高度，另一边自动按比例缩放
- 同时指定则强制使用指定尺寸（可能变形）
- 优先级高于 `scale` 参数

#### background_color（背景色）
支持多种格式：
- 十六进制：`#ffffff`, `#fff`
- RGB：`rgb(255, 255, 255)`
- 颜色名：`white`, `red`, `blue`
- 透明：`transparent`

#### return_type（返回方式）
- **binary（默认）**: 直接返回图片二进制数据
- **url**: 上传到 Storage 并返回带签名的 URL

#### waitFor（等待时间）
- 仅 POST 请求可用
- 用于等待 SVG 中的外部资源加载（字体、样式等）
- 建议根据 SVG 复杂度调整

## 响应格式

### Binary 模式（默认）

直接返回图片二进制数据：

```
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 12345

[图片二进制数据]
```

### URL 模式

返回 JSON 格式的 URL 信息：

```json
{
  "success": true,
  "data": {
    "url": "https://your-storage.supabase.co/storage/v1/object/sign/svg-images/abc123.png?token=xyz789",
    "expires_at": "2023-12-01T10:00:00.000Z",
    "expires_in": 3600
  }
}
```

### 错误响应

所有错误都返回统一格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

## 错误码说明

### 客户端错误（4xx）

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `MISSING_SVG_URL` | 400 | GET 请求缺少 SVG URL |
| `INVALID_SVG_URL` | 400 | SVG URL 格式错误 |
| `MISSING_SVG_CONTENT` | 400 | POST 请求缺少 SVG 内容 |
| `SVG_TOO_LARGE` | 413 | SVG 内容超过大小限制 |
| `INVALID_JSON` | 400 | POST 请求 JSON 格式错误 |
| `INVALID_SCALE` | 400 | 缩放比例超出范围 (0.1-10) |
| `INVALID_WIDTH` | 400 | 宽度参数超出范围 (1-2048) |
| `INVALID_HEIGHT` | 400 | 高度参数超出范围 (1-2048) |
| `INVALID_QUALITY` | 400 | 质量参数超出范围 (1-100) |
| `UNSUPPORTED_FORMAT` | 400 | 不支持的输出格式 |
| `INVALID_RETURN_TYPE` | 400 | 无效的返回类型 |
| `DOMAIN_BLOCKED` | 403 | SVG 来源域名被阻止 |
| `DOMAIN_NOT_ALLOWED` | 403 | SVG 来源域名不在白名单内 |
| `SVG_FETCH_FAILED` | 404 | 无法获取 SVG 内容（URL 不存在） |
| `INVALID_SVG_CONTENT` | 422 | SVG 内容格式无效 |
| `METHOD_NOT_ALLOWED` | 405 | 不支持的 HTTP 方法 |

### 服务器错误（5xx）

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `SVG_FETCH_ERROR` | 500 | SVG 获取过程中发生错误 |
| `RENDER_ERROR` | 500 | 图片渲染失败 |
| `STORAGE_UPLOAD_FAILED` | 500 | 文件上传失败 |
| `STORAGE_CONFIG_ERROR` | 500 | Storage 配置错误 |
| `CACHE_ERROR` | 500 | 缓存系统错误 |

### 超时错误（408）

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `TIMEOUT_ERROR` | 408 | 请求处理超时 |

## 使用限制

### 安全限制
- **SVG 大小**: 最大 1MB
- **输出尺寸**: 最大 2048x2048 像素
- **请求超时**: 30 秒
- **域名控制**: 支持白名单/黑名单机制

### 并发限制
- 依赖于 Browserless 服务的并发限制
- 支持多 Token 池提高并发能力

### 缓存机制
- **Deno 平台**: 支持 KV 缓存，相同参数的请求会返回缓存结果
- **其他平台**: 暂不支持缓存，每次都会重新渲染

## 最佳实践

### 性能优化
1. **使用 GET 请求**：更适合缓存，性能更好
2. **合理设置 waitFor**：根据 SVG 复杂度调整等待时间
3. **选择适当格式**：PNG 用于图标，JPG 用于复杂图片
4. **启用缓存**：在支持的平台上启用 KV 缓存

### 错误处理
1. **检查响应状态**：始终检查 HTTP 状态码
2. **解析错误信息**：根据错误码进行相应处理
3. **重试机制**：对于网络错误可实现重试

### 安全考虑
1. **验证 SVG 来源**：使用域名白名单限制 SVG 来源
2. **内容过滤**：避免处理包含恶意代码的 SVG
3. **大小限制**：合理设置 SVG 内容大小限制

## 示例集合

### 常见用例

**1. 图标转换**
```bash
curl "https://your-function/svg2img/https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/icons/home.svg?format=png&scale=2"
```

**2. Logo 转换**
```bash
curl "https://your-function/svg2img/https://example.com/logo.svg?format=webp&width=300&background_color=transparent"
```

**3. 批量处理**
```bash
# 使用 URL 模式避免大文件传输
for icon in home user settings; do
  curl "https://your-function/svg2img/https://cdn.jsdelivr.net/npm/feather-icons@4.29.0/dist/icons/$icon.svg?return_type=url&format=png&scale=2"
done
```

**4. PDF 文档**
```bash
curl "https://your-function/svg2img/https://example.com/diagram.svg?format=pdf&width=800&height=600" > diagram.pdf
```
