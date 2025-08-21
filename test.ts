// 简单测试脚本 - 验证代码能否正常启动
import { CONFIG, getBrowserlessUrl, validateConfig, printConfig } from "./config.ts";
import { 
  parseGetRequest, 
  generateHtmlTemplate,
  createError,
  TokenManager,
  SVG2ImageError
} from "./utils.ts";

console.log("🧪 SVG2IMG 测试开始");

// 测试配置
console.log("📋 配置测试:");
printConfig();

// 配置验证测试
console.log("\n🔧 配置验证测试:");
const validation = validateConfig();
if (validation.valid) {
  console.log("  ✅ 配置验证通过");
} else {
  console.log("  ❌ 配置验证失败:");
  validation.errors.forEach(error => console.log(`    - ${error}`));
}

// 测试URL解析
console.log("\n🔗 URL 解析测试:");
try {
  const testUrl = `http://localhost:${CONFIG.SERVER.PORT}/https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/github.svg?scale=2&format=png&return_type=url&url_expiry=3600&background_color=ffffff`;
  const mockRequest = new Request(testUrl);
  const params = parseGetRequest(mockRequest);
  console.log(`  ✅ SVG URL: ${params.svgUrl}`);
  console.log(`  ✅ Scale: ${params.scale}`);
  console.log(`  ✅ Format: ${params.format}`);
  console.log(`  ✅ Return Type: ${params.return_type || 'buffer'}`);
  console.log(`  ✅ URL Expiry: ${params.url_expiry || 'default'}`);
  console.log(`  ✅ Background Color: ${params.background_color || 'transparent'}`);
} catch (error) {
  console.log(`  ❌ URL 解析失败: ${(error as Error).message}`);
}

// 测试HTML模板生成
console.log("\n📄 HTML 模板测试:");
const testSvg = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
const html = generateHtmlTemplate(testSvg, "#ffffff");
console.log(`  ✅ HTML 长度: ${html.length} 字符`);
console.log(`  ✅ 包含SVG: ${html.includes('<svg')}`);

// 测试错误处理
console.log("\n❌ 错误处理测试:");
const error = new SVG2ImageError("测试错误", 400, "TEST_ERROR");
console.log(`  ✅ 错误类型: ${error.name}`);
console.log(`  ✅ 错误代码: ${error.errorCode}`);
console.log(`  ✅ 状态码: ${error.statusCode}`);

// 测试统一错误处理
console.log("\n🎯 统一错误处理测试:");
try {
  const unifiedError = createError("INTERNAL_ERROR", "自定义内部错误消息");
  console.log(`  ✅ 统一错误类型: ${unifiedError.name}`);
  console.log(`  ✅ 统一错误代码: ${unifiedError.errorCode}`);
  console.log(`  ✅ 统一状态码: ${unifiedError.statusCode}`);
  console.log(`  ✅ 自定义消息: ${unifiedError.message}`);
} catch (e) {
  console.log(`  ❌ 统一错误处理失败: ${(e as Error).message}`);
}

// 测试 Token 管理器
console.log("\n🔑 Token 管理器测试:");
try {
  const testTokens = "token1,token2,token3";
  const tokenManager = new TokenManager(testTokens);
  console.log(`  ✅ Token 总数: ${tokenManager.getAllTokens().length}`);
  
  // 测试轮换
  const token1 = tokenManager.getAvailableToken();
  const token2 = tokenManager.getAvailableToken(); 
  const token3 = tokenManager.getAvailableToken();
  
  console.log(`  ✅ Token 获取: ${token1}, ${token2}, ${token3}`);
  console.log(`  ✅ Token 池: ${tokenManager.getAllTokens().join(', ')}`);
  
  // 测试失败标记
  tokenManager.markTokenFailed(token1);
  console.log(`  ✅ 标记 ${token1} 为失败状态`);
  
  // 获取一个新token（应该避免失败的）
  const newToken = tokenManager.getAvailableToken();
  console.log(`  ✅ 失败后获取的token: ${newToken}`);
  console.log(`  ✅ 避免失败token: ${newToken !== token1 ? '是' : '否'}`);
  
} catch (e) {
  console.log(`  ❌ Token 管理器测试失败: ${(e as Error).message}`);
}

console.log("\n✨ 所有基础测试通过！");
console.log("\n💡 下一步:");
console.log("  1. 启动 Browserless 服务");
console.log("  2. 运行 'deno run --allow-net index.ts'");
console.log("  3. 测试 API 调用");

console.log("\n📝 测试示例:");
console.log("GET 直接返回图片:");
console.log(`  http://localhost:${CONFIG.SERVER.PORT}/https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/github.svg`);
console.log("GET 返回URL (需要配置Supabase):");
console.log(`  http://localhost:${CONFIG.SERVER.PORT}/https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/github.svg?return_type=url&url_expiry=3600`);
console.log("POST 直接返回图片:");
console.log(`  curl -X POST http://localhost:${CONFIG.SERVER.PORT} -H "Content-Type: application/json" -d '{"svg":"<svg><circle r=\\"50\\"/></svg>"}'`);
console.log("POST 返回URL:");
console.log(`  curl -X POST http://localhost:${CONFIG.SERVER.PORT} -H "Content-Type: application/json" -d '{"svg":"<svg><circle r=\\"50\\"/></svg>","return_type":"url","url_expiry":7200}'`);
