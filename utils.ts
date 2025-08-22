import { CONFIG, type ImageFormat } from "./config.ts";
import { createClient } from "./deps.ts";

// Token 管理器 - 处理多 token 的轮询和故障转移
export class TokenManager {
  private tokens: string[];
  private failedTokens = new Map<string, number>(); // token -> 失败时间
  private readonly recoveryTime = 60000; // 1分钟恢复时间

  constructor(tokenString: string) {
    this.tokens = tokenString.split(',').map(t => t.trim()).filter(t => t.length > 0);
    if (this.tokens.length === 0) {
      this.tokens = ['your-browserless-token-here'];
    }
  }

  getAvailableToken(): string {
    const now = Date.now();
    
    // 过滤出可用的token（未失败或已恢复）
    const availableTokens = this.tokens.filter(token => {
      const failTime = this.failedTokens.get(token);
      return !failTime || (now - failTime) > this.recoveryTime;
    });
    
    if (availableTokens.length === 0) {
      // 所有token都失败，强制使用最早失败的
      const entries = Array.from(this.failedTokens.entries());
      if (entries.length > 0) {
        const [oldestToken] = entries.sort(([,a], [,b]) => a - b)[0];
        return oldestToken;
      }
      return this.tokens[0]; // 兜底方案
    }
    
    // 基于时间戳的无状态轮询
    const index = Math.floor(Date.now() / 1000) % availableTokens.length;
    return availableTokens[index];
  }
  
  markTokenFailed(token: string): void {
    this.failedTokens.set(token, Date.now());
  }
  
  getAllTokens(): string[] {
    return [...this.tokens];
  }
}

// 统一错误定义
const ERROR_DEFINITIONS = {
  // 输入参数错误 (400)
  MISSING_SVG_URL: { status: 400, message: "SVG URL is required" },
  INVALID_SVG_URL: { status: 400, message: "Invalid SVG URL format" },
  MISSING_SVG_CONTENT: { status: 400, message: "SVG content is required" },
  SVG_TOO_LARGE: { status: 400, message: "SVG content too large" },
  INVALID_JSON: { status: 400, message: "Invalid JSON body" },
  INVALID_SCALE: { status: 400, message: "Scale must be between 0 and 10" },
  INVALID_WIDTH: { status: 400, message: "Width out of range" },
  INVALID_HEIGHT: { status: 400, message: "Height out of range" },
  INVALID_QUALITY: { status: 400, message: "Quality must be between 1 and 100" },
  UNSUPPORTED_FORMAT: { status: 400, message: "Unsupported format" },
  INVALID_RETURN_TYPE: { status: 400, message: "Invalid return type" },
  
  // 权限/安全错误 (403)
  DOMAIN_BLOCKED: { status: 403, message: "Access to this domain is blocked" },
  DOMAIN_NOT_ALLOWED: { status: 403, message: "Access to this domain is not allowed" },
  
  // 资源不存在 (404)
  SVG_FETCH_FAILED: { status: 404, message: "Failed to fetch SVG" },
  
  // 内容错误 (422)
  INVALID_SVG_CONTENT: { status: 422, message: "Content does not appear to be SVG" },
  
  // 方法错误 (405)
  METHOD_NOT_ALLOWED: { status: 405, message: "Method not allowed" },
  
  // 服务器错误 (500)
  SVG_FETCH_ERROR: { status: 500, message: "Failed to fetch SVG" },
  RENDER_ERROR: { status: 500, message: "Rendering failed" },
  STORAGE_UPLOAD_FAILED: { status: 500, message: "Failed to upload to storage" },
  STORAGE_CONFIG_ERROR: { status: 500, message: "Storage configuration error" },
  CACHE_ERROR: { status: 500, message: "Cache operation failed" },
  INTERNAL_ERROR: { status: 500, message: "Internal server error" },
} as const;

// 简化错误创建函数
export function createError(code: keyof typeof ERROR_DEFINITIONS, customMessage?: string) {
  const def = ERROR_DEFINITIONS[code];
  return new SVG2ImageError(customMessage || def.message, def.status, code);
}

// 请求参数接口
export interface GetParams {
  svgUrl: string;
  scale?: number;
  format?: ImageFormat;
  width?: number;
  height?: number;
  quality?: number;
  background_color?: string;
  return_type?: "binary" | "url";
  url_expiry?: number;
}

export interface PostBody {
  svg: string;
  format?: ImageFormat;
  scale?: number;
  width?: number;
  height?: number;
  quality?: number;
  background_color?: string;
  waitFor?: number;
  return_type?: "binary" | "url";
  url_expiry?: number;
}

export interface RenderOptions {
  format: ImageFormat;
  scale: number;
  width?: number;
  height?: number;
  quality?: number;
  backgroundColor: string;
  waitFor: number;
  returnType: "binary" | "url";
  urlExpiry: number;
}


/**
 * Pauses execution for the specified duration.
 *
 * @param ms - The number of milliseconds to sleep.
 * @returns A promise that resolves after the specified timeout.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a promise with a timeout mechanism.
 *
 * @param promise - The promise to wrap with timeout.
 * @param timeoutMs - The timeout duration in milliseconds.
 * @param timeoutMessage - The error message to throw on timeout.
 * @returns A promise that resolves to the original promise's result or rejects with timeout error.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
}


// 错误类型
export class SVG2ImageError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public errorCode: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "SVG2ImageError";
  }
}

// 解析 GET 请求参数
export function parseGetRequest(request: Request): GetParams {
  const url = new URL(request.url);
  
  // 从路径中提取 SVG URL (去掉开头的 /)
  const svgUrl = url.pathname.slice(1);
  if (!svgUrl) {
    throw createError("MISSING_SVG_URL");
  }

  // 验证 SVG URL 格式
  try {
    new URL(svgUrl);
  } catch {
    console.warn("Failed to parse SVG URL:", svgUrl);
    throw createError("INVALID_SVG_URL");
  }

  // 解析查询参数
  const params: GetParams = { svgUrl };
  
  const scale = url.searchParams.get("scale");
  if (scale) params.scale = parseFloat(scale);
  
  const format = url.searchParams.get("format");
  if (format) params.format = format as ImageFormat;
  
  const width = url.searchParams.get("width");
  if (width) params.width = parseInt(width);
  
  const height = url.searchParams.get("height");
  if (height) params.height = parseInt(height);
  
  const quality = url.searchParams.get("quality");
  if (quality) params.quality = parseInt(quality);
  
  const backgroundColor = url.searchParams.get("background_color");
  if (backgroundColor) params.background_color = backgroundColor;

  const returnType = url.searchParams.get("return_type");
  if (returnType) params.return_type = returnType as "binary" | "url";

  const urlExpiry = url.searchParams.get("url_expiry");
  if (urlExpiry) params.url_expiry = parseInt(urlExpiry);

  return params;
}

// 解析 POST 请求参数
export async function parsePostRequest(request: Request): Promise<PostBody> {
  try {
    const body = await request.json();
    
    if (!body.svg) {
      throw createError("MISSING_SVG_CONTENT");
    }

    // 检查 SVG 内容大小
    if (body.svg.length > CONFIG.LIMITS.MAX_SVG_SIZE) {
      throw createError("SVG_TOO_LARGE");
    }

    return body as PostBody;
  } catch (error) {
    if (error instanceof SVG2ImageError) throw error;
    throw createError("INVALID_JSON");
  }
}

// 标准化渲染参数
export function normalizeRenderOptions(params: GetParams | PostBody): RenderOptions {
  const options: RenderOptions = {
    format: params.format || CONFIG.DEFAULTS.FORMAT,
    scale: params.scale || CONFIG.DEFAULTS.SCALE,
    width: params.width,
    height: params.height,
    quality: params.quality || CONFIG.DEFAULTS.QUALITY,
    backgroundColor: params.background_color || CONFIG.DEFAULTS.BACKGROUND_COLOR || "#ffffff",
    waitFor: ('waitFor' in params ? params.waitFor : undefined) || CONFIG.DEFAULTS.WAIT_FOR,
    returnType: params.return_type || CONFIG.DEFAULTS.RETURN_TYPE,
    urlExpiry: params.url_expiry || CONFIG.DEFAULTS.URL_EXPIRY,
  };

  // 验证参数
  if (options.scale <= 0 || options.scale > 10) {
    throw createError("INVALID_SCALE");
  }

  if (options.width && (options.width <= 0 || options.width > CONFIG.LIMITS.MAX_WIDTH)) {
    throw createError("INVALID_WIDTH", `Width must be between 1 and ${CONFIG.LIMITS.MAX_WIDTH}`);
  }

  if (options.height && (options.height <= 0 || options.height > CONFIG.LIMITS.MAX_HEIGHT)) {
    throw createError("INVALID_HEIGHT", `Height must be between 1 and ${CONFIG.LIMITS.MAX_HEIGHT}`);
  }

  if (options.quality !== undefined && (options.quality < 1 || options.quality > 100)) {
    throw createError("INVALID_QUALITY");
  }

  if (!CONFIG.SUPPORTED_FORMATS.includes(options.format)) {
    throw createError("UNSUPPORTED_FORMAT", `Unsupported format: ${options.format}`);
  }

  if (!['binary', 'url'].includes(options.returnType)) {
    throw createError("INVALID_RETURN_TYPE");
  }

  return options;
}

// 获取 SVG 内容
export async function fetchSvgContent(url: string): Promise<string> {
  // 检查域名安全性
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.toLowerCase();

  // 检查阻止列表
  if (CONFIG.SECURITY.BLOCKED_DOMAINS.some(blocked => hostname.includes(blocked))) {
    throw createError("DOMAIN_BLOCKED");
  }

  // 检查允许列表（如果配置了）
  if (CONFIG.SECURITY.ALLOWED_DOMAINS.length > 0) {
    const allowed = CONFIG.SECURITY.ALLOWED_DOMAINS.some(domain => hostname.endsWith(domain));
    if (!allowed) {
      throw createError("DOMAIN_NOT_ALLOWED");
    }
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw createError("SVG_FETCH_FAILED", `Failed to fetch SVG: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("svg") && !contentType.includes("xml")) {
      // 宽松验证，允许一些服务器不设置正确的 Content-Type
      console.warn(`Warning: Content-Type is ${contentType}, but proceeding anyway`);
    }

    const svgContent = await response.text();
    
    // 基础 SVG 格式验证
    if (!svgContent.includes("<svg")) {
      throw createError("INVALID_SVG_CONTENT");
    }

    return svgContent;
  } catch (error) {
    if (error instanceof SVG2ImageError) throw error;
    throw createError("SVG_FETCH_ERROR", `Failed to fetch SVG: ${(error as Error).message}`);
  }
}

// 生成 HTML 模板
export function generateHtmlTemplate(svgContent: string, backgroundColor: string, scale: number = 1): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: 100%;
      height: 100%;
      background: ${backgroundColor};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    svg {
      display: block;
      transform: scale(${scale});
      transform-origin: center center;
    }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;
}

// 生成参数哈希，用于缓存和文件命名
export async function generateParamsHash(svgContent: string, options: RenderOptions): Promise<string> {
  // 创建包含所有影响渲染结果的参数的字符串
  const paramString = JSON.stringify({
    svg: svgContent,
    format: options.format,
    scale: options.scale,
    width: options.width,
    height: options.height,
    quality: options.quality,
    backgroundColor: options.backgroundColor,
    waitFor: options.waitFor,
  });
  
  // 生成 SHA-256 哈希
  const encoder = new TextEncoder();
  const data = encoder.encode(paramString);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // 取前16位作为文件名
}

// 上传图片到 Supabase Storage
export async function uploadToStorage(imageBuffer: Uint8Array, format: ImageFormat, expiry: number, svgContent?: string, options?: RenderOptions): Promise<string> {
  const { STORAGE } = CONFIG;
  
  if (!STORAGE.SUPABASE_URL || !STORAGE.SUPABASE_ANON_KEY) {
    throw createError("STORAGE_CONFIG_ERROR", "Supabase configuration missing");
  }

  try {
    const supabase = createClient(STORAGE.SUPABASE_URL, STORAGE.SUPABASE_ANON_KEY);
    
    // 生成文件名：如果有 SVG 内容和选项，使用哈希命名；否则使用时间戳
    let fileName: string;
    if (svgContent && options) {
      const hash = await generateParamsHash(svgContent, options);
      fileName = `${hash}.${format}`;
    } else {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      fileName = `svg2img_${timestamp}_${randomId}.${format}`;
    }
    
    // 检查文件是否已存在（用于缓存）
    if (svgContent && options) {
      const { data: existingFile } = await supabase.storage
        .from(STORAGE.BUCKET)
        .list('', { search: fileName });
      
      if (existingFile && existingFile.length > 0) {
        // 文件已存在，直接返回签名 URL
        const { data: urlData, error: urlError } = await supabase.storage
          .from(STORAGE.BUCKET)
          .createSignedUrl(fileName, expiry);

        if (urlError || !urlData) {
          throw createError("STORAGE_UPLOAD_FAILED", `Failed to create signed URL: ${urlError?.message}`);
        }

        return urlData.signedUrl;
      }
    }
    
    // 上传文件
    const { error } = await supabase.storage
      .from(STORAGE.BUCKET)
      .upload(fileName, imageBuffer, {
        contentType: getContentType(format),
        cacheControl: `max-age=${expiry}`,
        upsert: true, // 允许覆盖同名文件
      });

    if (error) {
      throw createError("STORAGE_UPLOAD_FAILED", `Upload failed: ${error.message}`);
    }

    // 生成带过期时间的签名 URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from(STORAGE.BUCKET)
      .createSignedUrl(fileName, expiry);

    if (urlError || !urlData) {
      throw createError("STORAGE_UPLOAD_FAILED", `Failed to create signed URL: ${urlError?.message}`);
    }

    return urlData.signedUrl;
  } catch (error) {
    if (error instanceof SVG2ImageError) throw error;
    throw createError("STORAGE_UPLOAD_FAILED", `Storage error: ${(error as Error).message}`);
  }
}

// 获取内容类型
function getContentType(format: ImageFormat): string {
  const mimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    pdf: "application/pdf",
  };
  return mimeTypes[format];
}

// 创建错误响应
export function createErrorResponse(error: SVG2ImageError): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
      },
    }),
    {
      status: error.statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

// 创建图片响应（二进制）
export function createImageResponse(imageBuffer: Uint8Array, format: ImageFormat): Response {
  return new Response(imageBuffer, {
    headers: {
      "Content-Type": getContentType(format),
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400", // 缓存 24 小时
    },
  });
}

// 创建 URL 响应（JSON）
export function createUrlResponse(url: string, expiry: number): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        url,
        expires_at: new Date(Date.now() + expiry * 1000).toISOString(),
        expires_in: expiry,
      },
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache", // URL 响应不缓存
      },
    }
  );
}

// ========================= 缓存系统 =========================

// 缓存条目接口
export interface CacheEntry {
  storageUrl: string;      // Supabase Storage 的签名 URL
  urlExpiresAt: number;    // 签名 URL 的过期时间
  format: ImageFormat;     // 图片格式
  createdAt: number;       // 创建时间
}

// KV 适配器接口 - 支持多种 KV 提供商
export interface KVAdapter {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, value: CacheEntry, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  init?(): Promise<void>;
  close?(): Promise<void>;
}

// Deno KV 适配器实现
export class DenoKVAdapter implements KVAdapter {
  private kv: Deno.Kv | null = null;

  async init(): Promise<void> {
    try {
      // 检查 Deno.openKv 是否可用
      if (typeof Deno.openKv !== 'function') {
        throw new Error('Deno.openKv is not available. Please run with --unstable-kv flag.');
      }

      this.kv = await Deno.openKv();
      console.log('🔗 Deno KV initialized successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Deno KV:', error);
      throw createError("CACHE_ERROR", `Failed to initialize Deno KV: ${(error as Error).message}`);
    }
  }

  async get(key: string): Promise<CacheEntry | null> {
    if (!this.kv) return null;

    try {
      const result = await this.kv.get([key]);
      return result.value as CacheEntry | null;
    } catch (error) {
      console.warn('⚠️ KV get failed:', error);
      return null; // 优雅降级，不抛出错误
    }
  }

  async set(key: string, value: CacheEntry, ttlSeconds: number): Promise<void> {
    if (!this.kv) return;

    try {
      await this.kv.set([key], value, { expireIn: ttlSeconds * 1000 });
    } catch (error) {
      console.warn('⚠️ KV set failed:', error);
      // 不抛出错误，允许继续执行
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.kv) return;

    try {
      await this.kv.delete([key]);
    } catch (error) {
      console.warn('⚠️ KV delete failed:', error);
    }
  }

  async close(): Promise<void> {
    if (this.kv) {
      this.kv.close();
      this.kv = null;
    }
  }
}

// Vercel KV 适配器（未来实现）
export class VercelKVAdapter implements KVAdapter {
  init(): Promise<void> {
    throw new Error("Vercel KV adapter not implemented yet");
  }

  get(_key: string): Promise<CacheEntry | null> {
    throw new Error("Vercel KV adapter not implemented yet");
  }

  set(_key: string, _value: CacheEntry, _ttlSeconds: number): Promise<void> {
    throw new Error("Vercel KV adapter not implemented yet");
  }

  delete(_key: string): Promise<void> {
    throw new Error("Vercel KV adapter not implemented yet");
  }
}

// Cloudflare KV 适配器（未来实现）
export class CloudflareKVAdapter implements KVAdapter {
  init(): Promise<void> {
    throw new Error("Cloudflare KV adapter not implemented yet");
  }

  get(_key: string): Promise<CacheEntry | null> {
    throw new Error("Cloudflare KV adapter not implemented yet");
  }

  set(_key: string, _value: CacheEntry, _ttlSeconds: number): Promise<void> {
    throw new Error("Cloudflare KV adapter not implemented yet");
  }

  delete(_key: string): Promise<void> {
    throw new Error("Cloudflare KV adapter not implemented yet");
  }

  close(): Promise<void> {
    // No-op for future implementation
    return Promise.resolve();
  }
}

// KV 工厂类
export class KVFactory {
  static create(type: 'deno' | 'vercel' | 'cloudflare'): KVAdapter {
    switch (type) {
      case 'deno':
        return new DenoKVAdapter();
      case 'vercel':
        return new VercelKVAdapter();
      case 'cloudflare':
        return new CloudflareKVAdapter();
      default:
        throw createError("CACHE_ERROR", `Unsupported KV type: ${type}`);
    }
  }
}

// 缓存管理器
export class CacheManager {
  private kvAdapter: KVAdapter | null = null;
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  async init(kvType: 'deno' | 'vercel' | 'cloudflare'): Promise<void> {
    if (!this.enabled) {
      console.log('📋 Cache disabled');
      return;
    }

    try {
      this.kvAdapter = KVFactory.create(kvType);
      await this.kvAdapter.init?.();
      console.log(`🎯 Cache initialized with ${kvType} KV`);
    } catch (error) {
      console.warn('⚠️ Cache initialization failed, running without cache:', error);
      this.kvAdapter = null;
    }
  }

  // 检查缓存并返回响应（如果命中）
  async checkCacheAndRespond(svgContent: string, options: RenderOptions): Promise<Response | null> {
    if (!this.kvAdapter) return null;

    try {
      const hash = await generateParamsHash(svgContent, options);
      const cacheKey = `svg2img:${hash}:${options.format}`;

      const cached = await this.kvAdapter.get(cacheKey);

      if (cached && cached.urlExpiresAt > Date.now()) {
        console.log(`🎯 Cache hit: ${hash.substring(0, 8)}... (${options.format})`);

        if (options.returnType === 'url') {
          // 直接返回缓存的 URL
          const remainingExpiry = Math.floor((cached.urlExpiresAt - Date.now()) / 1000);
          return createUrlResponse(cached.storageUrl, remainingExpiry);
        } else {
          // return_type='binary'，使用 HTTP 重定向到 Storage URL
          return new Response(null, {
            status: 302, // Found - 临时重定向
            headers: {
              'Location': cached.storageUrl,
              'Cache-Control': 'no-cache'
            }
          });
        }
      }

      // 缓存过期，清理
      if (cached && cached.urlExpiresAt <= Date.now()) {
        await this.kvAdapter.delete(cacheKey);
        console.log(`🗑️ Expired cache cleared: ${hash.substring(0, 8)}...`);
      }

      return null; // 缓存未命中
    } catch (error) {
      console.warn('⚠️ Cache check failed:', error);
      return null; // 优雅降级
    }
  }

  // 设置缓存条目
  async setCacheEntry(svgContent: string, options: RenderOptions, storageUrl: string): Promise<void> {
    if (!this.kvAdapter) return;

    try {
      const hash = await generateParamsHash(svgContent, options);
      const cacheKey = `svg2img:${hash}:${options.format}`;

      const entry: CacheEntry = {
        storageUrl,
        urlExpiresAt: Date.now() + options.urlExpiry * 1000,
        format: options.format,
        createdAt: Date.now()
      };

      await this.kvAdapter.set(cacheKey, entry, options.urlExpiry);
      console.log(`💾 Cache stored: ${hash.substring(0, 8)}... (${options.format})`);
    } catch (error) {
      console.warn('⚠️ Cache set failed:', error);
      // 不抛出错误，允许继续执行
    }
  }

  async close(): Promise<void> {
    if (this.kvAdapter) {
      await this.kvAdapter.close?.();
      this.kvAdapter = null;
    }
  }
}

// 创建重定向响应（用于 binary 类型的缓存命中）
export function createRedirectResponse(url: string): Response {
  return new Response(null, {
    status: 302, // Found - 临时重定向
    headers: {
      'Location': url,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
