# SVG2IMG 实施计划

## 阶段一：基础框架 ✅ 已完成

### 1.1 更新依赖配置
- [x] 更新 `deps.ts`，添加 puppeteer-core
- [x] 创建 `config.ts` 配置文件
- [x] 创建基础项目结构
- [x] 添加 `.env.example` 配置示例

### 1.2 核心类型定义
- [x] 定义请求参数接口 (`GetParams`, `PostBody`)
- [x] 定义配置选项接口 (`ConfigOverrides`)
- [x] 定义响应格式接口 (`RenderOptions`)
- [x] 定义错误处理类 (`SVG2ImageError`)

## 阶段二：核心功能实现 ✅ 已完成

### 2.1 主处理逻辑 (`index.ts`)
- [x] HTTP 请求路由 (`handleRequest`)
- [x] GET 请求处理（URL 解析）
- [x] POST 请求处理（JSON 解析）
- [x] OPTIONS 请求处理（CORS 支持）
- [x] 参数验证和标准化

### 2.2 SVG 处理逻辑
- [x] SVG URL 内容获取 (`fetchSvgContent`)
- [x] SVG 内容验证（格式检查、大小限制）
- [x] HTML 模板生成 (`generateHtmlTemplate`)
- [x] 域名安全检查（白名单/黑名单）

### 2.3 Browserless 集成
- [x] Puppeteer 连接管理 (`getBrowserlessUrl`)
- [x] 页面创建和内容设置
- [x] 截图功能实现 (`renderSvgToImage`)
- [x] 多格式支持（PNG/JPG/WebP/PDF）
- [x] 自动浏览器实例清理

### 2.4 工具函数 (`utils.ts`)
- [x] 参数解析工具 (`parseGetRequest`, `parsePostRequest`)
- [x] 参数标准化 (`normalizeRenderOptions`)
- [x] 错误处理工具 (`createErrorResponse`)
- [x] 响应格式化工具 (`createImageResponse`)

## 阶段三：功能完善和测试 ✅ 已完成

### 3.1 高级功能
- [x] 缩放支持（0.1-10）
- [x] 自定义尺寸（width/height）
- [x] 背景色设置（支持透明背景）
- [x] 质量控制（JPG/WebP）
- [x] 等待时间控制（POST 请求）

### 3.2 错误处理
- [x] 各种异常场景处理（17种错误码）
- [x] 友好的错误提示（JSON 格式错误响应）
- [x] 超时处理（请求级别和浏览器级别）
- [x] 资源清理（确保浏览器实例关闭）

### 3.3 测试
- [x] 基础功能测试 (`test.ts`)
- [x] 边界条件测试
- [x] 配置验证 (`validateConfig`)

## 阶段四：部署优化 ✅ 已完成

### 4.1 部署准备
- [x] 文档完善（README.md, 技术设计文档）
- [x] 使用示例（GET/POST 示例）
- [x] 部署说明（多平台支持）
- [x] 配置系统完善（三级配置优先级）

## 技术重点

### 1. URL 解析处理
**挑战**: GET 请求中 SVG URL 的正确解析
**方案**: 
```typescript
// 从 /https://example.com/icon.svg?params 中提取 URL
const svgUrl = request.url.pathname.slice(1); // 去掉开头的 /
```

### 2. SVG 渲染等待
**挑战**: SVG 中外部资源（字体、样式）的加载等待
**方案**:
```typescript
await page.setContent(htmlTemplate);
await page.waitForTimeout(waitFor); // 用户可配置等待时间
```

### 3. 内存管理
**挑战**: 云函数环境下的内存使用优化
**方案**:
```typescript
try {
  const browser = await puppeteer.connect({...});
  // 处理逻辑
} finally {
  await browser.close(); // 确保浏览器实例被关闭
}
```

## 快速验证清单

### 基础功能验证
- [ ] GET 请求：`/https://example.com/test.svg`
- [ ] POST 请求：`{svg: "<svg>...</svg>"}`
- [ ] 格式支持：PNG, JPG, WebP, PDF
- [ ] 参数支持：scale, width, height, quality

### 复杂场景验证
- [ ] 包含外部字体的 SVG
- [ ] 包含 CSS 样式的 SVG
- [ ] 大尺寸 SVG 转换
- [ ] 错误 SVG 处理

### 性能验证
- [ ] 单次请求耗时 < 5秒
- [ ] 内存使用合理
- [ ] 并发请求处理

## 部署配置示例

### Supabase Edge Functions
```typescript
// config.ts
export const CONFIG = {
  BROWSERLESS: {
    // 使用你的自建 browserless
    SELF_HOSTED_URL: "ws://your-server:3000",
    // 或使用 browserless.io
    CLOUD_URL: "wss://production-sfo.browserless.io",
    TOKEN: "your-browserless-token"
  }
};
```

### 使用示例
```bash
# GET 方式
curl "https://your-function.supabase.co/svg2img/https://example.com/icon.svg?scale=2&format=png"

# POST 方式
curl -X POST "https://your-function.supabase.co/svg2img" \
  -H "Content-Type: application/json" \
  -d '{"svg": "<svg>...</svg>", "format": "png", "scale": 2}'
```
