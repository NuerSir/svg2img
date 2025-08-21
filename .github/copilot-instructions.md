# SVG2IMG Copilot Instructions

## Architecture Overview

This is a **stateless edge function service** that converts SVG to images using **Deno + Puppeteer + Browserless**. Key architectural principles:

- **Zero state**: Each request is completely independent, perfect for edge deployment
- **Multi-token resilience**: Built-in failover system for Browserless tokens
- **Triple config priority**: `config.ts` overrides > environment variables > defaults

## Critical File Structure

```
index.ts          # HTTP entry point + core rendering logic
config.ts         # Three-tier configuration system with TokenManager
utils.ts          # Utilities: parameter parsing, error handling, SVG processing
deps.ts          # Centralized dependency management (Deno pattern)
test.ts          # Validation script that tests all major components
```

## Core Workflows

### Development Commands
```bash
# Type check (essential before commits)
deno check --allow-import .

# Run tests (validates configuration and core functions)
deno run --allow-net --allow-env test.ts

# Start service locally
deno run --env-file=.env.local --allow-net --allow-env index.ts
```

### Configuration Pattern
The project uses a **three-tier configuration system** in `config.ts`:
1. `overrides` object (for deployment-specific hardcoded values)
2. Environment variables 
3. Sensible defaults

**Critical**: For Supabase Edge Functions, modify `overrides` object directly since env vars aren't always available.

## Key Patterns & Conventions

### Error Handling
- Use `createError()` from `utils.ts` with predefined error codes
- All errors are `SVG2ImageError` instances with HTTP status codes
- 17 standardized error types covering all failure scenarios

### Token Management
The `TokenManager` class in `utils.ts` implements **stateless round-robin** with failure recovery:
```typescript
// Comma-separated tokens automatically load balanced
BROWSERLESS_TOKEN="token1,token2,token3"
```

### Timeout Strategy
**Every** Puppeteer operation uses `withTimeout()` wrapper to prevent "Target closed" errors:
```typescript
await withTimeout(puppeteer.connect(...), 15000, "Connection timeout");
await withTimeout(page.newPage(), 10000, "Page creation timeout");
```

### SVG Rendering Architecture
1. Wrap SVG in HTML template with CSS `transform: scale(${scale})`
2. Use `page.evaluate()` to get actual DOM dimensions after scaling
3. Set viewport to exact scaled dimensions (never use `fullPage: true`)

## Integration Points

### Browserless Connection
- **Self-hosted**: Direct WebSocket to local Docker container
- **Cloud**: WebSocket to browserless.io with token authentication
- **Failover**: Automatic token rotation when connections fail

### Supabase Storage (URL mode)
- File naming uses SHA-256 hash of render parameters for caching
- Signed URLs with configurable expiry
- Automatic duplicate detection

## Request Flow Patterns

### GET Requests
URL structure: `/{svg-url}?scale=2&format=png`
- SVG URL extracted from pathname (after first `/`)
- Parameters parsed from query string

### POST Requests  
JSON body with inline SVG content:
```json
{"svg": "<svg>...</svg>", "scale": 2, "format": "png"}
```

## Critical Implementation Details

### Scale Handling
- **CSS transform** applied in HTML template, NOT Puppeteer's `deviceScaleFactor`
- DOM dimensions retrieved AFTER scaling via `getBoundingClientRect()`
- Viewport set to scaled dimensions for pixel-perfect output

### Security Model
- Domain allowlist/blocklist for SVG URLs
- Size limits on SVG content and output dimensions  
- Request timeouts prevent resource exhaustion

### Deployment Considerations
- **Supabase Edge Functions**: Use `config.ts` overrides (env vars unreliable)
- **Deno Deploy**: Use environment variables  
- **Railway/Vercel**: Standard env var configuration

## Testing Strategy

The `test.ts` file validates:
- Configuration parsing and validation
- URL parameter extraction
- Token manager functionality  
- Error handling systems
- HTML template generation

Always run `deno run --allow-net --allow-env test.ts` after configuration changes.
