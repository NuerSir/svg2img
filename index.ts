import { serve } from "./deps.ts";
import { puppeteer } from "./deps.ts";
import { CONFIG, getBrowserlessUrl, validateConfig, printConfig } from "./config.ts";
import {
  parseGetRequest,
  parsePostRequest,
  normalizeRenderOptions,
  fetchSvgContent,
  generateHtmlTemplate,
  createErrorResponse,
  createImageResponse,
  createUrlResponse,
  uploadToStorage,
  sleep,
  withTimeout,
  createError,
  SVG2ImageError,
  type RenderOptions,
} from "./utils.ts";

// 核心渲染函数
async function renderSvgToImage(svgContent: string, options: RenderOptions): Promise<Uint8Array> {
  let browser = null;
  const currentToken = CONFIG.BROWSERLESS.TOKEN; // 记录当前使用的 token

  try {
    // 连接到 Browserless，添加超时
    browser = await withTimeout(
      puppeteer.connect({
        browserWSEndpoint: getBrowserlessUrl(),
      }),
      15000, // 15秒连接超时
      "Browserless connection timeout"
    );

    // 创建新页面，添加超时
    const page = await withTimeout(
      browser.newPage(),
      10000, // 10秒页面创建超时
      "Page creation timeout"
    );

    // 生成 HTML 模板并设置页面内容，添加超时
    const htmlTemplate = generateHtmlTemplate(svgContent, options.backgroundColor, options.scale);
    await withTimeout(
      page.setContent(htmlTemplate),
      10000, // 10秒内容设置超时
      "Page content setting timeout"
    );

    // 等待额外时间以确保 SVG 完全渲染（字体加载等）
    await sleep(options.waitFor);

    // 计算最终的渲染尺寸
    let finalWidth = options.width;
    let finalHeight = options.height;

    // 如果用户没有指定尺寸，从 DOM 中获取 SVG 的实际尺寸（已经应用了 scale）
    if (!finalWidth || !finalHeight) {
      const svgDimensions = await page.evaluate(`
        (() => {
          const svg = document.querySelector('svg');
          if (!svg) return { width: 0, height: 0 };
          
          // 获取 SVG 的边界框尺寸（已经包含了 CSS transform scale）
          const rect = svg.getBoundingClientRect();
          return {
            width: rect.width || svg.clientWidth || 800,
            height: rect.height || svg.clientHeight || 600
          };
        })()
      `) as { width: number; height: number };

      if (!finalWidth) {
        finalWidth = Math.round(svgDimensions.width);
      }
      if (!finalHeight) {
        finalHeight = Math.round(svgDimensions.height);
      }

      console.log(`📐 从DOM获取SVG尺寸（已缩放）: ${svgDimensions.width}x${svgDimensions.height}, 最终渲染: ${finalWidth}x${finalHeight} (scale: ${options.scale})`);
    } else {
      // 用户指定了尺寸，也需要应用 scale（因为 CSS 中的 scale 是基于原始尺寸的）
      finalWidth = Math.round(finalWidth * options.scale);
      finalHeight = Math.round(finalHeight * options.scale);
      console.log(`📐 用户指定尺寸，最终渲染: ${finalWidth}x${finalHeight} (scale: ${options.scale})`);
    }

    // 设置视窗大小（始终设置，确保尺寸精确）
    await page.setViewport({
      width: finalWidth,
      height: finalHeight,
      deviceScaleFactor: 1, // 不在这里应用 scale，而是通过尺寸计算应用
    });

    // 准备截图参数
    const screenshotOptions: {
      type: 'png' | 'jpeg' | 'webp';
      fullPage: boolean;
      quality?: number;
    } = {
      type: options.format === 'jpg' ? 'jpeg' : options.format as 'png' | 'jpeg' | 'webp',
      fullPage: false, // 不使用 fullPage，使用精确的视窗尺寸
    };

    // 设置质量（仅对 jpeg 和 webp 有效）
    if ((options.format === 'jpg' || options.format === 'jpeg' || options.format === 'webp') && options.quality) {
      screenshotOptions.quality = options.quality;
    }

    // 如果是 PDF 格式，使用 PDF 生成
    if (options.format === 'pdf') {
      const pdfBuffer = await withTimeout(
        page.pdf({
          format: 'A4',
          printBackground: true,
          scale: options.scale,
        }),
        30000, // 30秒 PDF 生成超时
        "PDF generation timeout"
      );
      return new Uint8Array(pdfBuffer);
    }

    // 截图生成图片，添加超时
    const imageBuffer = await withTimeout(
      page.screenshot(screenshotOptions),
      20000, // 20秒截图超时
      "Screenshot timeout"
    );
    return new Uint8Array(imageBuffer);

  } catch (error) {
    console.error("Rendering error:", error);
    
    // 如果是连接相关错误，标记 token 失败
    if (error instanceof Error && (
      error.message.includes('connect') || 
      error.message.includes('Target closed') ||
      error.message.includes('timeout') ||
      error.message.includes('Protocol error')
    )) {
      CONFIG.BROWSERLESS.markTokenFailed(currentToken);
      console.warn(`❌ 标记 token 失败: ${currentToken.substring(0, 10)}...`);
    }
    
    if (error instanceof SVG2ImageError) throw error;
    throw createError("RENDER_ERROR", `Rendering failed: ${(error as Error).message}`);
  } finally {
    // 确保浏览器实例被关闭
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn("Failed to close browser:", closeError);
      }
    }
  }
}

// 处理 GET 请求
async function handleGetRequest(request: Request): Promise<Response> {
  try {
    // 解析请求参数
    const params = parseGetRequest(request);
    const options = normalizeRenderOptions(params);

    // 获取 SVG 内容
    const svgContent = await fetchSvgContent(params.svgUrl);

    // 渲染图片
    const imageBuffer = await renderSvgToImage(svgContent, options);

    // 根据返回类型返回响应
    if (options.returnType === 'url') {
      const url = await uploadToStorage(imageBuffer, options.format, options.urlExpiry, svgContent, options);
      return createUrlResponse(url, options.urlExpiry);
    } else {
      return createImageResponse(imageBuffer, options.format);
    }

  } catch (error) {
    console.error("GET request error:", error);
    if (error instanceof SVG2ImageError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(createError("INTERNAL_ERROR"));
  }
}

// 处理 POST 请求
async function handlePostRequest(request: Request): Promise<Response> {
  try {
    // 解析请求体
    const body = await parsePostRequest(request);
    const options = normalizeRenderOptions(body);

    // 渲染图片
    const imageBuffer = await renderSvgToImage(body.svg, options);

    // 根据返回类型返回响应
    if (options.returnType === 'url') {
      const url = await uploadToStorage(imageBuffer, options.format, options.urlExpiry, body.svg, options);
      return createUrlResponse(url, options.urlExpiry);
    } else {
      return createImageResponse(imageBuffer, options.format);
    }

  } catch (error) {
    console.error("POST request error:", error);
    if (error instanceof SVG2ImageError) {
      return createErrorResponse(error);
    }
    return createErrorResponse(createError("INTERNAL_ERROR"));
  }
}

// 处理 OPTIONS 请求（CORS 预检）
function handleOptionsRequest(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// 主请求处理函数
async function handleRequest(request: Request): Promise<Response> {
  const method = request.method;

  try {
    switch (method) {
      case "GET":
        return await handleGetRequest(request);
      case "POST":
        return await handlePostRequest(request);
      case "OPTIONS":
        return handleOptionsRequest();
      default:
        return createErrorResponse(createError("METHOD_NOT_ALLOWED", `Method ${method} not allowed`));
    }
  } catch (error) {
    console.error("Request handling error:", error);
    return createErrorResponse(createError("INTERNAL_ERROR"));
  }
}

// 启动服务器
console.log("🚀 SVG2IMG service starting...");

// 验证配置
const configValidation = validateConfig();
if (!configValidation.valid) {
  console.error("❌ 配置验证失败:");
  configValidation.errors.forEach(error => console.error(`  - ${error}`));
  Deno.exit(1);
}

// 打印配置信息
printConfig();
// console.log(`� Browserless URL: ${getBrowserlessUrl()}`);

serve(handleRequest, { port: CONFIG.SERVER.PORT });
console.log(`✅ SVG2IMG service running on http://localhost:${CONFIG.SERVER.PORT}`);