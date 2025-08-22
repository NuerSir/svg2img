// SVG2IMG 配置文件 - 支持配置覆盖和环境变量
// 优先级: 配置覆盖 > 环境变量 > 默认值
// 适用于多种部署环境：Supabase Edge Functions, Deno Deploy, 本地服务等

import { TokenManager } from "./utils.ts";

// 配置覆盖接口 - 可以在这里直接设置值来覆盖环境变量
interface ConfigOverrides {
  // Browserless 配置
  USE_SELF_HOSTED?: string;
  BROWSERLESS_SELF_HOSTED_URL?: string;
  BROWSERLESS_CLOUD_URL?: string;
  BROWSERLESS_TOKEN?: string;
  
  // 默认参数
  DEFAULT_FORMAT?: string;
  DEFAULT_SCALE?: string;
  DEFAULT_QUALITY?: string;
  DEFAULT_BACKGROUND_COLOR?: string;
  DEFAULT_WAIT_FOR?: string;
  DEFAULT_RETURN_TYPE?: string;
  DEFAULT_URL_EXPIRY?: string;
  
  // 限制参数
  MAX_WIDTH?: string;
  MAX_HEIGHT?: string;
  MAX_SVG_SIZE?: string;
  TIMEOUT?: string;
  
  // 安全配置
  ALLOWED_DOMAINS?: string;
  BLOCKED_DOMAINS?: string;
  
  // 服务器配置
  PORT?: string;
  
  // Supabase Storage 配置
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;

  // 缓存配置
  CACHE_ENABLED?: string;
  CACHE_KV_TYPE?: string;
}

// 配置覆盖 - 直接在这里设置值来覆盖环境变量（部署时修改）
const overrides: ConfigOverrides = {
  // 示例：取消注释并设置值来覆盖环境变量
  // USE_SELF_HOSTED: "false",
  // BROWSERLESS_TOKEN: "your-browserless-token-here",
  // DEFAULT_FORMAT: "png",
};

// 获取配置值的辅助函数（你提供的方案）
const getEnvValue = (key: keyof ConfigOverrides, fallback?: string): string => {
  return overrides[key] ?? Deno.env.get(key) ?? fallback ?? '';
};

// 解析布尔值
const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  return value.toLowerCase() === 'true';
};

// 解析数字值
const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
};

// 解析数组值（逗号分隔）
const parseArray = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) return fallback;
  return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
};

// 创建 token 管理器实例
const tokenManager = new TokenManager(getEnvValue('BROWSERLESS_TOKEN', 'your-browserless-token-here'));

// 动态配置对象
export const CONFIG = {
  // Browserless 配置
  BROWSERLESS: {
    USE_SELF_HOSTED: parseBoolean(getEnvValue('USE_SELF_HOSTED'), false),
    SELF_HOSTED_URL: getEnvValue('BROWSERLESS_SELF_HOSTED_URL', 'ws://localhost:3000'),
    CLOUD_URL: getEnvValue('BROWSERLESS_CLOUD_URL', 'wss://production-sfo.browserless.io'),
    get TOKEN(): string {
      return tokenManager.getAvailableToken();
    },
    TOKENS: tokenManager.getAllTokens(),
    markTokenFailed: (token: string) => tokenManager.markTokenFailed(token),
  },

  // 默认参数
  DEFAULTS: {
    FORMAT: getEnvValue('DEFAULT_FORMAT', 'png') as 'png' | 'jpg' | 'jpeg' | 'webp' | 'pdf',
    SCALE: parseNumber(getEnvValue('DEFAULT_SCALE'), 1),
    QUALITY: parseNumber(getEnvValue('DEFAULT_QUALITY'), 90),
    BACKGROUND_COLOR: getEnvValue('DEFAULT_BACKGROUND_COLOR', '#ffffff'),
    WAIT_FOR: parseNumber(getEnvValue('DEFAULT_WAIT_FOR'), 1000),
    RETURN_TYPE: getEnvValue('DEFAULT_RETURN_TYPE', 'binary') as 'binary' | 'url',
    URL_EXPIRY: parseNumber(getEnvValue('DEFAULT_URL_EXPIRY'), 259200), // 3天
  },

  // 限制参数 - 防止滥用
  LIMITS: {
    MAX_WIDTH: parseNumber(getEnvValue('MAX_WIDTH'), 2048),
    MAX_HEIGHT: parseNumber(getEnvValue('MAX_HEIGHT'), 2048),
    MAX_SVG_SIZE: parseNumber(getEnvValue('MAX_SVG_SIZE'), 1024 * 1024), // 1MB
    TIMEOUT: parseNumber(getEnvValue('TIMEOUT'), 30000), // 30秒
  },

  // 安全配置
  SECURITY: {
    ALLOWED_DOMAINS: parseArray(getEnvValue('ALLOWED_DOMAINS'), []),
    BLOCKED_DOMAINS: parseArray(getEnvValue('BLOCKED_DOMAINS'), ['localhost', '127.0.0.1', '0.0.0.0', '10.0.0.0', '192.168.0.0']),
  },

  // 服务器配置
  SERVER: {
    PORT: parseNumber(getEnvValue('PORT'), 8000),
  },

  // Supabase Storage 配置
  STORAGE: {
    SUPABASE_URL: getEnvValue('SUPABASE_URL'),
    SUPABASE_ANON_KEY: getEnvValue('SUPABASE_ANON_KEY'),
    BUCKET: getEnvValue('SUPABASE_STORAGE_BUCKET', 'svg-images'),
  },

  // 缓存配置
  CACHE: {
    ENABLED: parseBoolean(getEnvValue('CACHE_ENABLED'), true),
    KV_TYPE: getEnvValue('CACHE_KV_TYPE', 'deno') as 'deno' | 'vercel' | 'cloudflare',
    // TTL 复用 DEFAULTS.URL_EXPIRY，保持时间一致性
  },

  // 支持的格式
  SUPPORTED_FORMATS: ['png', 'jpg', 'jpeg', 'webp', 'pdf'] as const,
} as const;

// 导出类型
export type ImageFormat = typeof CONFIG.SUPPORTED_FORMATS[number];

// 获取 Browserless 连接 URL
export function getBrowserlessUrl(): string {
  const { BROWSERLESS } = CONFIG;
  
  if (BROWSERLESS.USE_SELF_HOSTED) {
    return BROWSERLESS.SELF_HOSTED_URL;
  } else {
    const token = BROWSERLESS.TOKEN;
    const cloudUrl = BROWSERLESS.CLOUD_URL;
    
    if (token && token !== 'your-browserless-token-here') {
      return `${cloudUrl}?token=${token}`;
    }
    return cloudUrl;
  }
}

// 配置验证函数
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查 Browserless 配置
  if (!CONFIG.BROWSERLESS.USE_SELF_HOSTED) {
    const tokens = CONFIG.BROWSERLESS.TOKENS;
    if (!tokens || tokens.length === 0 || tokens.includes('your-browserless-token-here')) {
      errors.push('云端 Browserless 需要有效的 TOKEN');
    }
  }

  // 检查格式支持
  if (!CONFIG.SUPPORTED_FORMATS.includes(CONFIG.DEFAULTS.FORMAT as ImageFormat)) {
    errors.push(`不支持的默认格式: ${CONFIG.DEFAULTS.FORMAT}`);
  }

  // 检查数值范围
  if (CONFIG.DEFAULTS.SCALE <= 0 || CONFIG.DEFAULTS.SCALE > 10) {
    errors.push('默认缩放比例必须在 0-10 之间');
  }

  if (CONFIG.DEFAULTS.QUALITY < 1 || CONFIG.DEFAULTS.QUALITY > 100) {
    errors.push('默认质量必须在 1-100 之间');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// 打印当前配置（用于调试）
export function printConfig(): void {
  console.log('📋 当前配置:');
  console.log(`  🔗 Browserless: ${CONFIG.BROWSERLESS.USE_SELF_HOSTED ? '自建' : '云端'}`);
  console.log(`  🎯 默认格式: ${CONFIG.DEFAULTS.FORMAT}`);
  console.log(`  📏 最大尺寸: ${CONFIG.LIMITS.MAX_WIDTH}x${CONFIG.LIMITS.MAX_HEIGHT}`);
  console.log(`  🔒 域名限制: ${CONFIG.SECURITY.ALLOWED_DOMAINS.length > 0 ? '已启用' : '未启用'}`);
  console.log(`  🚪 端口: ${CONFIG.SERVER.PORT}`);
}
