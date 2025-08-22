# 开发文档

本文档面向项目维护者和贡献者，包含详细的开发计划和技术实现细节。

> **用户文档**: 如果你是使用者，请查看 [README.md](../README.md) 和 [API 文档](API.md)

## 🎯 项目状态

### 已完成功能 ✅

**核心功能**：
- ✅ SVG 转图片服务（PNG/JPG/WebP/PDF）
- ✅ GET/POST 两种调用方式
- ✅ 参数验证和错误处理
- ✅ 安全控制（域名白名单/黑名单）
- ✅ Browserless 集成和 Token 池管理

**缓存系统**：
- ✅ **Deno KV 适配器**（完全功能）
- ✅ KV 抽象层设计
- ✅ 缓存管理器
- ✅ 工厂模式架构

**部署支持**：
- ✅ Deno Deploy（推荐，完整缓存支持）
- ✅ Supabase Edge Functions
- ✅ Vercel/Cloudflare（需禁用缓存）

### 开发中功能 🚧

**缓存系统扩展**：
- 🚧 **Vercel KV 适配器**（接口已定义，实现待完成）
- 🚧 **Cloudflare KV 适配器**（接口已定义，实现待完成）

**功能增强**：
- 🚧 缓存统计和监控
- 🚧 批量处理接口
- 🚧 Webhook 支持

## 🏗️ 技术架构

### 核心模块

```
├── index.ts          # HTTP 服务入口
├── config.ts         # 配置管理（三级配置系统）
├── utils.ts          # 工具函数和缓存系统
└── deps.ts          # 依赖管理
```

### 缓存系统架构

```typescript
// 抽象接口
interface KVAdapter {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, value: CacheEntry, ttl: number): Promise<void>;
  // ...
}

// 具体实现
class DenoKVAdapter implements KVAdapter { /* 已实现 */ }
class VercelKVAdapter implements KVAdapter { /* 待实现 */ }
class CloudflareKVAdapter implements KVAdapter { /* 待实现 */ }

// 工厂模式
KVFactory.create(type) → KVAdapter
```

## 🔧 开发环境

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-repo/svg2img
cd svg2img

# 配置环境
cp .env.example .env
# 编辑 .env 文件

# 启动开发服务
deno run --allow-net --allow-env --unstable-kv --watch index.ts

# 运行测试
deno run --allow-net --allow-env test.ts

# 类型检查
deno check --allow-import .
```

### 开发工具

- **Deno**: 主要运行时
- **VSCode**: 推荐编辑器
- **Deno 插件**: VSCode 的 Deno 支持
- **Postman/curl**: API 测试

## 📋 开发计划

### 近期计划（优先级高）

**1. 完善 Vercel KV 适配器**
```typescript
class VercelKVAdapter implements KVAdapter {
  // 需要集成 @vercel/kv
  // 参考: https://vercel.com/docs/storage/vercel-kv
}
```

**2. 完善 Cloudflare KV 适配器**
```typescript
class CloudflareKVAdapter implements KVAdapter {
  // 需要集成 Cloudflare Workers KV
  // 参考: https://developers.cloudflare.com/workers/runtime-apis/kv/
}
```

### 中期计划

**1. 功能增强**
- 批量处理接口
- Webhook 回调支持
- 缓存统计接口

**2. 性能优化**
- 连接池管理
- 请求队列
- 智能重试机制

**3. 监控系统**
- 健康检查接口
- 性能指标收集
- 错误追踪

## 🧪 测试策略

### 功能验证清单

**基础功能**：
- [ ] GET 请求：`/https://example.com/test.svg`
- [ ] POST 请求：`{svg: "<svg>...</svg>"}`
- [ ] 格式支持：PNG, JPG, WebP, PDF
- [ ] 参数支持：scale, width, height, quality

**缓存功能**（仅 Deno）：
- [ ] 首次请求正常生成图片
- [ ] 重复请求命中缓存（302 重定向）
- [ ] 不同参数请求生成不同缓存
- [ ] KV 存储可用性检测

### 性能测试
```bash
# 并发测试
ab -n 1000 -c 10 "http://localhost:8000/https://github.githubassets.com/pinned-octocat.svg"

# 缓存性能测试
time curl "http://localhost:8000/https://github.githubassets.com/pinned-octocat.svg"
```

## 🐛 调试指南

### 常见问题排查

**1. KV 缓存问题**
```bash
# 检查 KV 可用性
deno run --unstable-kv -e "console.log(typeof Deno.openKv)"
```

**2. Browserless 连接问题**
```bash
# 测试连接
curl "ws://localhost:3000" # 自建服务
```

**3. 内存问题**
```bash
# 启用内存监控
deno run --v8-flags=--max-old-space-size=4096 --allow-net --allow-env index.ts
```

## 📚 代码规范

### TypeScript 规范
- 使用严格类型检查
- 明确的接口定义
- 合理的错误处理

### 提交规范
```
feat: 新功能
fix: 错误修复
docs: 文档更新
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

## 🤝 贡献指南

### 贡献流程
1. Fork 项目
2. 创建特性分支
3. 完成开发和测试
4. 提交 Pull Request

### 代码审查
- 功能完整性
- 代码质量
- 测试覆盖率
- 文档更新

## 📊 项目指标

### 性能目标
- 平均响应时间 < 2s
- 缓存命中率 > 80%（Deno 平台）
- 内存使用 < 128MB

### 可靠性目标
- 99.9% 可用性
- 故障自动恢复
- 完善的错误处理
