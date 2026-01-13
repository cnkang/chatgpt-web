import { z } from 'zod';

// src/utils/index.ts
function isNumber(value) {
  return Object.prototype.toString.call(value) === "[object Number]";
}
function isString(value) {
  return Object.prototype.toString.call(value) === "[object String]";
}
function isNotEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}
function isBoolean(value) {
  return Object.prototype.toString.call(value) === "[object Boolean]";
}
function isNull(value) {
  return Object.prototype.toString.call(value) === "[object Null]";
}
function isUndefined(value) {
  return Object.prototype.toString.call(value) === "[object Undefined]";
}
function isObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
function isArray(value) {
  return Object.prototype.toString.call(value) === "[object Array]";
}
function isFunction(value) {
  return Object.prototype.toString.call(value) === "[object Function]";
}
function isDate(value) {
  return Object.prototype.toString.call(value) === "[object Date]";
}
function isRegExp(value) {
  return Object.prototype.toString.call(value) === "[object RegExp]";
}
function isPromise(value) {
  return Object.prototype.toString.call(value) === "[object Promise]";
}
function isSet(value) {
  return Object.prototype.toString.call(value) === "[object Set]";
}
function isMap(value) {
  return Object.prototype.toString.call(value) === "[object Map]";
}
function isFile(value) {
  return Object.prototype.toString.call(value) === "[object File]";
}
function getCurrentDate() {
  const date = /* @__PURE__ */ new Date();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}
function formatTimestamp(date) {
  return date.toISOString();
}
function parseTimestamp(timestamp) {
  return new Date(timestamp);
}
function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}
function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
function truncateString(str, maxLength) {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength - 3)}...`;
}
function sanitizeString(str) {
  return str.trim().replace(/\s+/g, " ");
}
function validateApiKey(key) {
  if (!isNotEmptyString(key)) return false;
  const openaiPatterns = [
    /^sk-[a-zA-Z0-9]{48}$/,
    // Standard OpenAI API key
    /^sk-proj-[a-zA-Z0-9]{48}$/
    // Project-based OpenAI API key
  ];
  return openaiPatterns.some((pattern) => pattern.test(key));
}
function validateAzureApiKey(key) {
  return isNotEmptyString(key) && key.length >= 32;
}
function maskApiKey(key) {
  if (!isNotEmptyString(key)) return "";
  if (key.startsWith("sk-")) {
    return key.startsWith("sk-proj-") ? "sk-proj-****" : "sk-****";
  }
  if (key.length > 8) {
    return `${key.substring(0, 4)}****${key.substring(key.length - 4)}`;
  }
  return "****";
}
function validateBearerToken(token) {
  const bearerPattern = /^Bearer [\w\-.]+$/;
  return bearerPattern.test(token);
}
function isValidUrl(url) {
  return URL.canParse(url);
}
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}
function buildApiUrl(baseUrl, path, params) {
  const normalizedBase = normalizeUrl(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let url = `${normalizedBase}${normalizedPath}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  return url;
}
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}
function omit(obj, keys) {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
function isEmpty(value) {
  if (value === null || value === void 0) return true;
  if (typeof value === "string") return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}
function createError(message, code, statusCode) {
  const error = new Error(message);
  if (code) error.code = code;
  if (statusCode) error.statusCode = statusCode;
  return error;
}
function isErrorWithCode(error) {
  return error instanceof Error && "code" in error && typeof error.code === "string";
}
function isErrorWithStatusCode(error) {
  return error instanceof Error && "statusCode" in error && typeof error.statusCode === "number";
}
function validateTemperature(temperature) {
  return isNumber(temperature) && temperature >= 0 && temperature <= 2;
}
function validateTopP(topP) {
  return isNumber(topP) && topP >= 0 && topP <= 1;
}
function validateMaxTokens(maxTokens) {
  return isNumber(maxTokens) && maxTokens > 0 && maxTokens <= 32e3;
}
function validateModel(model) {
  return isNotEmptyString(model) && model.length <= 100;
}
function unique(array) {
  return [...new Set(array)];
}
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    const later = () => {
      timeout = void 0;
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
function throttle(func, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
var stringSchema = z.string().trim().min(1, "Field cannot be empty");
var optionalStringSchema = z.string().trim().optional();
var numberSchema = z.number().min(0).max(2, "Value must be between 0 and 2");
var optionalNumberSchema = z.number().min(0).max(2).optional();
var ReasoningStepSchema = z.object({
  step: z.number().int().min(1),
  thought: z.string().trim().min(1),
  confidence: z.number().min(0).max(1),
  duration: z.number().int().min(0).optional()
});
var ChatMessageSchema = z.object({
  id: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
  text: z.string().trim().min(1).optional(),
  role: z.enum(["user", "assistant", "system"]),
  timestamp: z.number().int().min(0).optional(),
  reasoning: z.array(ReasoningStepSchema).optional(),
  name: z.string().trim().optional(),
  delta: z.string().optional(),
  detail: z.unknown().optional(),
  parentMessageId: z.string().trim().optional(),
  conversationId: z.string().trim().optional()
});
var ChatContextSchema = z.object({
  conversationId: z.string().optional(),
  parentMessageId: z.string().optional()
}).optional();
var ConversationRequestSchema = z.object({
  conversationId: z.string().optional(),
  parentMessageId: z.string().optional()
});
var ChatSchema = z.object({
  dateTime: z.string(),
  text: z.string(),
  inversion: z.boolean().optional(),
  error: z.boolean().optional(),
  loading: z.boolean().optional(),
  conversationOptions: ConversationRequestSchema.nullable().optional(),
  requestOptions: z.object({
    prompt: z.string(),
    options: ConversationRequestSchema.nullable().optional()
  })
});
var HistorySchema = z.object({
  title: z.string(),
  isEdit: z.boolean(),
  uuid: z.number().int()
});
var ChatStateSchema = z.object({
  active: z.number().int().nullable(),
  usingContext: z.boolean(),
  history: z.array(HistorySchema),
  chat: z.array(
    z.object({
      uuid: z.number().int(),
      data: z.array(ChatSchema)
    })
  )
});
var ApiResponseSchema = z.object({
  data: z.unknown(),
  error: z.string().optional(),
  success: z.boolean()
});
var RequestPropsSchema = z.object({
  prompt: z.string().trim().min(1),
  options: ChatContextSchema,
  systemMessage: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional()
});
var ChatProcessRequestSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt cannot be empty").max(32e3, "Prompt too long").refine((val) => {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];
    return !dangerousPatterns.some((pattern) => pattern.test(val));
  }, "Invalid content detected"),
  options: ChatContextSchema,
  systemMessage: z.string().trim().max(8e3, "System message too long").optional(),
  temperature: z.number().min(0, "Temperature must be at least 0").max(2, "Temperature must be at most 2").optional(),
  top_p: z.number().min(0, "Top_p must be at least 0").max(1, "Top_p must be at most 1").optional()
});
var ChatCompletionRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, "At least one message is required"),
  model: z.string().trim().min(1, "Model is required"),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(1).max(32e3).optional(),
  stream: z.boolean().optional(),
  reasoningMode: z.boolean().optional()
});
var UsageInfoSchema = z.object({
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0)
});
var ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number().int(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number().int(),
      message: ChatMessageSchema,
      finishReason: z.string()
    })
  ),
  usage: UsageInfoSchema.optional()
});
var ChatCompletionChunkSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number().int(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number().int(),
      delta: ChatMessageSchema.partial(),
      finishReason: z.string().optional()
    })
  )
});
var BaseProviderConfigSchema = z.object({
  provider: z.enum(["openai", "azure"]),
  defaultModel: z.string().trim().min(1),
  enableReasoning: z.boolean(),
  timeout: z.number().int().min(1e3).optional()
});
var OpenAIConfigSchema = z.object({
  apiKey: z.string().trim().min(1, "OpenAI API key is required").refine((key) => key.startsWith("sk-"), "Invalid OpenAI API key format"),
  baseUrl: z.string().url().optional(),
  organization: z.string().trim().optional()
});
var AzureOpenAIConfigSchema = z.object({
  apiKey: z.string().trim().min(1, "Azure API key is required"),
  endpoint: z.string().url("Invalid Azure endpoint URL"),
  deployment: z.string().trim().min(1, "Azure deployment is required"),
  apiVersion: z.string().trim().min(1, "Azure API version is required"),
  useResponsesAPI: z.boolean().optional()
});
var ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  host: z.string().trim().min(1),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]),
    credentials: z.boolean()
  })
});
var SecurityConfigSchema = z.object({
  enableRateLimit: z.boolean(),
  rateLimitWindowMs: z.number().int().min(1e3),
  rateLimitMaxRequests: z.number().int().min(1),
  enableCSP: z.boolean(),
  enableHSTS: z.boolean(),
  apiKeyHeader: z.string().trim().min(1)
});
var DevelopmentConfigSchema = z.object({
  debug: z.boolean(),
  logLevel: z.enum(["error", "warn", "info", "debug"]),
  hotReload: z.boolean()
});
var AIConfigSchema = BaseProviderConfigSchema.extend({
  openai: OpenAIConfigSchema.optional(),
  azure: AzureOpenAIConfigSchema.optional()
});
var AppConfigurationSchema = z.object({
  server: ServerConfigSchema,
  ai: AIConfigSchema,
  security: SecurityConfigSchema,
  development: DevelopmentConfigSchema
});
var ModelConfigSchema = z.object({
  apiModel: z.enum(["ChatGPTAPI"]).optional(),
  timeoutMs: z.number().int().min(1e3).optional(),
  socksProxy: z.string().url().optional(),
  httpsProxy: z.string().url().optional(),
  usage: z.string().optional()
});
var TokenVerificationSchema = z.object({
  token: z.string().trim().min(1, "Token cannot be empty").max(1e3, "Token too long").refine((val) => {
    const safePattern = /^[\w\-.]+$/;
    return safePattern.test(val);
  }, "Token contains invalid characters")
});
var AuthHeaderSchema = z.object({
  authorization: z.string().trim().min(1, "Authorization header cannot be empty").refine((val) => {
    const bearerPattern = /^Bearer [\w\-.]+$/;
    return bearerPattern.test(val);
  }, "Invalid authorization header format").optional()
});
var ConfigRequestSchema = z.object({
  model: z.string().trim().optional(),
  temperature: optionalNumberSchema,
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().min(1).max(32e3).optional()
});
var IdSchema = z.string().trim().min(1, "ID cannot be empty").max(100, "ID too long").refine((val) => {
  const safePattern = /^[\w\-]+$/;
  return safePattern.test(val);
}, "ID contains invalid characters");
var PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1e3).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
var UUIDSchema = z.string().uuid("Invalid UUID format");
var EmailSchema = z.string().email("Invalid email format");
var UrlSchema = z.string().url("Invalid URL format");
var RequestOptionsSchema = z.object({
  message: z.string().trim().min(1),
  lastContext: z.object({
    conversationId: z.string().optional(),
    parentMessageId: z.string().optional()
  }).optional(),
  process: z.function().optional(),
  systemMessage: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional()
});
var UsageResponseSchema = z.object({
  total_usage: z.number().int().min(0)
});

export { AIConfigSchema, ApiResponseSchema, AppConfigurationSchema, AuthHeaderSchema, AzureOpenAIConfigSchema, BaseProviderConfigSchema, ChatCompletionChunkSchema, ChatCompletionRequestSchema, ChatCompletionResponseSchema, ChatContextSchema, ChatMessageSchema, ChatProcessRequestSchema, ChatSchema, ChatStateSchema, ConfigRequestSchema, ConversationRequestSchema, DevelopmentConfigSchema, EmailSchema, HistorySchema, IdSchema, ModelConfigSchema, OpenAIConfigSchema, PaginationSchema, ReasoningStepSchema, RequestOptionsSchema, RequestPropsSchema, SecurityConfigSchema, ServerConfigSchema, TokenVerificationSchema, UUIDSchema, UrlSchema, UsageInfoSchema, UsageResponseSchema, buildApiUrl, chunk, createError, debounce, deepClone, formatTimestamp, generateId, generateUUID, getCurrentDate, isArray, isBoolean, isDate, isEmpty, isErrorWithCode, isErrorWithStatusCode, isFile, isFunction, isMap, isNotEmptyString, isNull, isNumber, isObject, isPromise, isRegExp, isSet, isString, isUndefined, isValidDate, isValidUrl, maskApiKey, normalizeUrl, numberSchema, omit, optionalNumberSchema, optionalStringSchema, parseTimestamp, pick, sanitizeString, shuffle, stringSchema, throttle, truncateString, unique, validateApiKey, validateAzureApiKey, validateBearerToken, validateMaxTokens, validateModel, validateTemperature, validateTopP };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map