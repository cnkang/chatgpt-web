import { z } from 'zod';

/**
 * Shared TypeScript types and interfaces
 * Common types used across frontend and backend applications
 */
interface ChatMessage {
    id?: string;
    content?: string;
    text?: string;
    role: 'user' | 'assistant' | 'system';
    timestamp?: number;
    reasoning?: ReasoningStep[];
    name?: string;
    delta?: string;
    detail?: unknown;
    parentMessageId?: string;
    conversationId?: string;
}
interface ReasoningStep {
    step: number;
    thought: string;
    confidence: number;
    duration?: number;
}
interface ChatContext {
    conversationId?: string;
    parentMessageId?: string;
}
interface ConversationRequest {
    conversationId?: string;
    parentMessageId?: string;
}
interface ConversationResponse {
    conversationId: string;
    detail: {
        choices: {
            finish_reason: string;
            index: number;
            logprobs: unknown;
            text: string;
        }[];
        created: number;
        id: string;
        model: string;
        object: string;
        usage: {
            completion_tokens: number;
            prompt_tokens: number;
            total_tokens: number;
        };
    };
    id: string;
    parentMessageId: string;
    role: string;
    text: string;
}
interface Chat {
    dateTime: string;
    text: string;
    inversion?: boolean;
    error?: boolean;
    loading?: boolean;
    conversationOptions?: ConversationRequest | null;
    requestOptions: {
        prompt: string;
        options?: ConversationRequest | null;
    };
}
interface History {
    title: string;
    isEdit: boolean;
    uuid: number;
}
interface ChatState {
    active: number | null;
    usingContext: boolean;
    history: History[];
    chat: {
        uuid: number;
        data: Chat[];
    }[];
}
interface ApiResponse<T = unknown> {
    data: T;
    error?: string;
    success: boolean;
}
interface RequestProps {
    prompt: string;
    options?: ChatContext;
    systemMessage: string;
    temperature?: number;
    top_p?: number;
}
interface ChatProcessRequest {
    prompt: string;
    options?: ChatContext;
    systemMessage?: string;
    temperature?: number;
    top_p?: number;
}
interface ChatCompletionRequest {
    messages: ChatMessage[];
    model: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    stream?: boolean;
    reasoningMode?: boolean;
}
interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: ChatMessage;
        finishReason: string;
    }>;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
interface ChatCompletionChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        delta: Partial<ChatMessage>;
        finishReason?: string;
    }>;
}
interface UsageInfo {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    cost?: number;
}
interface ProviderError extends Error {
    code?: string;
    statusCode?: number;
    provider: string;
}
interface BaseProviderConfig {
    provider: 'openai' | 'azure';
    defaultModel: string;
    enableReasoning: boolean;
    timeout?: number;
}
interface OpenAIConfig {
    apiKey: string;
    baseUrl?: string;
    organization?: string;
}
interface AzureOpenAIConfig {
    apiKey: string;
    endpoint: string;
    deployment: string;
    apiVersion: string;
    useResponsesAPI?: boolean;
}
interface ServerConfig {
    port: number;
    host: string;
    cors: {
        origin: string | string[];
        credentials: boolean;
    };
}
interface SecurityConfig {
    enableRateLimit: boolean;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    enableCSP: boolean;
    enableHSTS: boolean;
    apiKeyHeader: string;
}
interface DevelopmentConfig {
    debug: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    hotReload: boolean;
}
interface AIConfig extends BaseProviderConfig {
    openai?: OpenAIConfig;
    azure?: AzureOpenAIConfig;
}
interface AppConfiguration {
    server: ServerConfig;
    ai: AIConfig;
    security: SecurityConfig;
    development: DevelopmentConfig;
}
interface ModelConfig {
    apiModel?: ApiModel;
    timeoutMs?: number;
    socksProxy?: string;
    httpsProxy?: string;
    usage?: string;
}
type ApiModel = 'ChatGPTAPI' | 'AzureOpenAI' | undefined;
interface TokenVerificationRequest {
    token: string;
}
interface ConfigRequest {
    model?: string;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
}
interface AuthHeader {
    authorization?: string;
}
interface PaginationQuery {
    page: number;
    limit: number;
}
interface RequestOptions {
    message: string;
    lastContext?: {
        conversationId?: string;
        parentMessageId?: string;
    };
    process?: (chat: ChatMessage) => void;
    systemMessage?: string;
    temperature?: number;
    top_p?: number;
}
interface UsageResponse {
    total_usage: number;
}
type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<unknown>;
interface SetProxyOptions {
    fetch?: FetchLike;
}

/**
 * Shared utility functions
 * Framework-agnostic utilities used across frontend and backend
 */
declare function isNumber<T extends number>(value: T | unknown): value is number;
declare function isString<T extends string>(value: T | unknown): value is string;
declare function isNotEmptyString(value: unknown): value is string;
declare function isBoolean<T extends boolean>(value: T | unknown): value is boolean;
declare function isNull<T extends null>(value: T | unknown): value is null;
declare function isUndefined<T extends undefined>(value: T | unknown): value is undefined;
declare function isObject<T extends object>(value: T | unknown): value is object;
declare function isArray<T extends unknown[]>(value: T | unknown): value is T;
declare function isFunction<T extends (...args: unknown[]) => unknown | void | never>(value: T | unknown): value is T;
declare function isDate<T extends Date>(value: T | unknown): value is T;
declare function isRegExp<T extends RegExp>(value: T | unknown): value is T;
declare function isPromise<T extends Promise<unknown>>(value: T | unknown): value is T;
declare function isSet<T extends Set<unknown>>(value: T | unknown): value is T;
declare function isMap<T extends Map<unknown, unknown>>(value: T | unknown): value is T;
declare function isFile<T extends File>(value: T | unknown): value is T;
declare function getCurrentDate(): string;
declare function formatTimestamp(date: Date): string;
declare function parseTimestamp(timestamp: string): Date;
declare function isValidDate(date: Date): boolean;
declare function generateId(): string;
declare function generateUUID(): string;
declare function truncateString(str: string, maxLength: number): string;
declare function sanitizeString(str: string): string;
declare function validateApiKey(key: string): boolean;
declare function validateAzureApiKey(key: string): boolean;
declare function maskApiKey(key: string): string;
declare function validateBearerToken(token: string): boolean;
declare function isValidUrl(url: string): boolean;
declare function normalizeUrl(url: string): string;
declare function buildApiUrl(baseUrl: string, path: string, params?: Record<string, string>): string;
declare function deepClone<T>(obj: T): T;
declare function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
declare function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
declare function isEmpty(value: unknown): boolean;
declare function createError(message: string, code?: string, statusCode?: number): Error & {
    code?: string;
    statusCode?: number;
};
declare function isErrorWithCode(error: unknown): error is Error & {
    code: string;
};
declare function isErrorWithStatusCode(error: unknown): error is Error & {
    statusCode: number;
};
declare function validateTemperature(temperature: number): boolean;
declare function validateTopP(topP: number): boolean;
declare function validateMaxTokens(maxTokens: number): boolean;
declare function validateModel(model: string): boolean;
declare function unique<T>(array: T[]): T[];
declare function chunk<T>(array: T[], size: number): T[][];
declare function shuffle<T>(array: T[]): T[];
declare function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void;
declare function throttle<T extends (...args: unknown[]) => unknown>(func: T, limit: number): (...args: Parameters<T>) => void;

/**
 * Shared validation schemas using Zod
 * Comprehensive input validation and sanitization schemas
 */

declare const stringSchema: z.ZodString;
declare const optionalStringSchema: z.ZodOptional<z.ZodString>;
declare const numberSchema: z.ZodNumber;
declare const optionalNumberSchema: z.ZodOptional<z.ZodNumber>;
declare const ReasoningStepSchema: z.ZodObject<{
    step: z.ZodNumber;
    thought: z.ZodString;
    confidence: z.ZodNumber;
    duration: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
declare const ChatMessageSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<{
        user: "user";
        assistant: "assistant";
        system: "system";
    }>;
    timestamp: z.ZodOptional<z.ZodNumber>;
    reasoning: z.ZodOptional<z.ZodArray<z.ZodObject<{
        step: z.ZodNumber;
        thought: z.ZodString;
        confidence: z.ZodNumber;
        duration: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
    name: z.ZodOptional<z.ZodString>;
    delta: z.ZodOptional<z.ZodString>;
    detail: z.ZodOptional<z.ZodUnknown>;
    parentMessageId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const ChatContextSchema: z.ZodOptional<z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    parentMessageId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
declare const ConversationRequestSchema: z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    parentMessageId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const ChatSchema: z.ZodObject<{
    dateTime: z.ZodString;
    text: z.ZodString;
    inversion: z.ZodOptional<z.ZodBoolean>;
    error: z.ZodOptional<z.ZodBoolean>;
    loading: z.ZodOptional<z.ZodBoolean>;
    conversationOptions: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        conversationId: z.ZodOptional<z.ZodString>;
        parentMessageId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    requestOptions: z.ZodObject<{
        prompt: z.ZodString;
        options: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            conversationId: z.ZodOptional<z.ZodString>;
            parentMessageId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const HistorySchema: z.ZodObject<{
    title: z.ZodString;
    isEdit: z.ZodBoolean;
    uuid: z.ZodNumber;
}, z.core.$strip>;
declare const ChatStateSchema: z.ZodObject<{
    active: z.ZodNullable<z.ZodNumber>;
    usingContext: z.ZodBoolean;
    history: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        isEdit: z.ZodBoolean;
        uuid: z.ZodNumber;
    }, z.core.$strip>>;
    chat: z.ZodArray<z.ZodObject<{
        uuid: z.ZodNumber;
        data: z.ZodArray<z.ZodObject<{
            dateTime: z.ZodString;
            text: z.ZodString;
            inversion: z.ZodOptional<z.ZodBoolean>;
            error: z.ZodOptional<z.ZodBoolean>;
            loading: z.ZodOptional<z.ZodBoolean>;
            conversationOptions: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                conversationId: z.ZodOptional<z.ZodString>;
                parentMessageId: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            requestOptions: z.ZodObject<{
                prompt: z.ZodString;
                options: z.ZodOptional<z.ZodNullable<z.ZodObject<{
                    conversationId: z.ZodOptional<z.ZodString>;
                    parentMessageId: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const ApiResponseSchema: z.ZodObject<{
    data: z.ZodUnknown;
    error: z.ZodOptional<z.ZodString>;
    success: z.ZodBoolean;
}, z.core.$strip>;
declare const RequestPropsSchema: z.ZodObject<{
    prompt: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        conversationId: z.ZodOptional<z.ZodString>;
        parentMessageId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    systemMessage: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    top_p: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
declare const ChatProcessRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        conversationId: z.ZodOptional<z.ZodString>;
        parentMessageId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    systemMessage: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    top_p: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
declare const ChatCompletionRequestSchema: z.ZodObject<{
    messages: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodString>;
        role: z.ZodEnum<{
            user: "user";
            assistant: "assistant";
            system: "system";
        }>;
        timestamp: z.ZodOptional<z.ZodNumber>;
        reasoning: z.ZodOptional<z.ZodArray<z.ZodObject<{
            step: z.ZodNumber;
            thought: z.ZodString;
            confidence: z.ZodNumber;
            duration: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
        name: z.ZodOptional<z.ZodString>;
        delta: z.ZodOptional<z.ZodString>;
        detail: z.ZodOptional<z.ZodUnknown>;
        parentMessageId: z.ZodOptional<z.ZodString>;
        conversationId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    model: z.ZodString;
    temperature: z.ZodOptional<z.ZodNumber>;
    topP: z.ZodOptional<z.ZodNumber>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    stream: z.ZodOptional<z.ZodBoolean>;
    reasoningMode: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
declare const UsageInfoSchema: z.ZodObject<{
    promptTokens: z.ZodNumber;
    completionTokens: z.ZodNumber;
    totalTokens: z.ZodNumber;
}, z.core.$strip>;
declare const ChatCompletionResponseSchema: z.ZodObject<{
    id: z.ZodString;
    object: z.ZodString;
    created: z.ZodNumber;
    model: z.ZodString;
    choices: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        message: z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodString>;
            text: z.ZodOptional<z.ZodString>;
            role: z.ZodEnum<{
                user: "user";
                assistant: "assistant";
                system: "system";
            }>;
            timestamp: z.ZodOptional<z.ZodNumber>;
            reasoning: z.ZodOptional<z.ZodArray<z.ZodObject<{
                step: z.ZodNumber;
                thought: z.ZodString;
                confidence: z.ZodNumber;
                duration: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>>;
            name: z.ZodOptional<z.ZodString>;
            delta: z.ZodOptional<z.ZodString>;
            detail: z.ZodOptional<z.ZodUnknown>;
            parentMessageId: z.ZodOptional<z.ZodString>;
            conversationId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        finishReason: z.ZodString;
    }, z.core.$strip>>;
    usage: z.ZodOptional<z.ZodObject<{
        promptTokens: z.ZodNumber;
        completionTokens: z.ZodNumber;
        totalTokens: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const ChatCompletionChunkSchema: z.ZodObject<{
    id: z.ZodString;
    object: z.ZodString;
    created: z.ZodNumber;
    model: z.ZodString;
    choices: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        delta: z.ZodObject<{
            id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            content: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            text: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            role: z.ZodOptional<z.ZodEnum<{
                user: "user";
                assistant: "assistant";
                system: "system";
            }>>;
            timestamp: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
            reasoning: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
                step: z.ZodNumber;
                thought: z.ZodString;
                confidence: z.ZodNumber;
                duration: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>>>;
            name: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            delta: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            detail: z.ZodOptional<z.ZodOptional<z.ZodUnknown>>;
            parentMessageId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
            conversationId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>;
        finishReason: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const BaseProviderConfigSchema: z.ZodObject<{
    provider: z.ZodEnum<{
        openai: "openai";
        azure: "azure";
    }>;
    defaultModel: z.ZodString;
    enableReasoning: z.ZodBoolean;
    timeout: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
declare const OpenAIConfigSchema: z.ZodObject<{
    apiKey: z.ZodString;
    baseUrl: z.ZodOptional<z.ZodString>;
    organization: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const AzureOpenAIConfigSchema: z.ZodObject<{
    apiKey: z.ZodString;
    endpoint: z.ZodString;
    deployment: z.ZodString;
    apiVersion: z.ZodString;
    useResponsesAPI: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
declare const ServerConfigSchema: z.ZodObject<{
    port: z.ZodNumber;
    host: z.ZodString;
    cors: z.ZodObject<{
        origin: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
        credentials: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const SecurityConfigSchema: z.ZodObject<{
    enableRateLimit: z.ZodBoolean;
    rateLimitWindowMs: z.ZodNumber;
    rateLimitMaxRequests: z.ZodNumber;
    enableCSP: z.ZodBoolean;
    enableHSTS: z.ZodBoolean;
    apiKeyHeader: z.ZodString;
}, z.core.$strip>;
declare const DevelopmentConfigSchema: z.ZodObject<{
    debug: z.ZodBoolean;
    logLevel: z.ZodEnum<{
        error: "error";
        warn: "warn";
        info: "info";
        debug: "debug";
    }>;
    hotReload: z.ZodBoolean;
}, z.core.$strip>;
declare const AIConfigSchema: z.ZodObject<{
    provider: z.ZodEnum<{
        openai: "openai";
        azure: "azure";
    }>;
    defaultModel: z.ZodString;
    enableReasoning: z.ZodBoolean;
    timeout: z.ZodOptional<z.ZodNumber>;
    openai: z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodString;
        baseUrl: z.ZodOptional<z.ZodString>;
        organization: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    azure: z.ZodOptional<z.ZodObject<{
        apiKey: z.ZodString;
        endpoint: z.ZodString;
        deployment: z.ZodString;
        apiVersion: z.ZodString;
        useResponsesAPI: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const AppConfigurationSchema: z.ZodObject<{
    server: z.ZodObject<{
        port: z.ZodNumber;
        host: z.ZodString;
        cors: z.ZodObject<{
            origin: z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>;
            credentials: z.ZodBoolean;
        }, z.core.$strip>;
    }, z.core.$strip>;
    ai: z.ZodObject<{
        provider: z.ZodEnum<{
            openai: "openai";
            azure: "azure";
        }>;
        defaultModel: z.ZodString;
        enableReasoning: z.ZodBoolean;
        timeout: z.ZodOptional<z.ZodNumber>;
        openai: z.ZodOptional<z.ZodObject<{
            apiKey: z.ZodString;
            baseUrl: z.ZodOptional<z.ZodString>;
            organization: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        azure: z.ZodOptional<z.ZodObject<{
            apiKey: z.ZodString;
            endpoint: z.ZodString;
            deployment: z.ZodString;
            apiVersion: z.ZodString;
            useResponsesAPI: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    security: z.ZodObject<{
        enableRateLimit: z.ZodBoolean;
        rateLimitWindowMs: z.ZodNumber;
        rateLimitMaxRequests: z.ZodNumber;
        enableCSP: z.ZodBoolean;
        enableHSTS: z.ZodBoolean;
        apiKeyHeader: z.ZodString;
    }, z.core.$strip>;
    development: z.ZodObject<{
        debug: z.ZodBoolean;
        logLevel: z.ZodEnum<{
            error: "error";
            warn: "warn";
            info: "info";
            debug: "debug";
        }>;
        hotReload: z.ZodBoolean;
    }, z.core.$strip>;
}, z.core.$strip>;
declare const ModelConfigSchema: z.ZodObject<{
    apiModel: z.ZodOptional<z.ZodEnum<{
        ChatGPTAPI: "ChatGPTAPI";
    }>>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    socksProxy: z.ZodOptional<z.ZodString>;
    httpsProxy: z.ZodOptional<z.ZodString>;
    usage: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const TokenVerificationSchema: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
declare const AuthHeaderSchema: z.ZodObject<{
    authorization: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const ConfigRequestSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    top_p: z.ZodOptional<z.ZodNumber>;
    max_tokens: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
declare const IdSchema: z.ZodString;
declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
declare const UUIDSchema: z.ZodString;
declare const EmailSchema: z.ZodString;
declare const UrlSchema: z.ZodString;
declare const RequestOptionsSchema: z.ZodObject<{
    message: z.ZodString;
    lastContext: z.ZodOptional<z.ZodObject<{
        conversationId: z.ZodOptional<z.ZodString>;
        parentMessageId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    process: z.ZodOptional<z.ZodFunction<z.core.$ZodFunctionArgs, z.core.$ZodFunctionOut>>;
    systemMessage: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    top_p: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
declare const UsageResponseSchema: z.ZodObject<{
    total_usage: z.ZodNumber;
}, z.core.$strip>;

export { type AIConfig, AIConfigSchema, type ApiModel, type ApiResponse, ApiResponseSchema, type AppConfiguration, AppConfigurationSchema, type AuthHeader, AuthHeaderSchema, type AzureOpenAIConfig, AzureOpenAIConfigSchema, type BaseProviderConfig, BaseProviderConfigSchema, type Chat, type ChatCompletionChunk, ChatCompletionChunkSchema, type ChatCompletionRequest, ChatCompletionRequestSchema, type ChatCompletionResponse, ChatCompletionResponseSchema, type ChatContext, ChatContextSchema, type ChatMessage, ChatMessageSchema, type ChatProcessRequest, ChatProcessRequestSchema, ChatSchema, type ChatState, ChatStateSchema, type ConfigRequest, ConfigRequestSchema, type ConversationRequest, ConversationRequestSchema, type ConversationResponse, type DevelopmentConfig, DevelopmentConfigSchema, EmailSchema, type FetchLike, type History, HistorySchema, IdSchema, type ModelConfig, ModelConfigSchema, type OpenAIConfig, OpenAIConfigSchema, type PaginationQuery, PaginationSchema, type ProviderError, type ReasoningStep, ReasoningStepSchema, type RequestOptions, RequestOptionsSchema, type RequestProps, RequestPropsSchema, type SecurityConfig, SecurityConfigSchema, type ServerConfig, ServerConfigSchema, type SetProxyOptions, type TokenVerificationRequest, TokenVerificationSchema, UUIDSchema, UrlSchema, type UsageInfo, UsageInfoSchema, type UsageResponse, UsageResponseSchema, buildApiUrl, chunk, createError, debounce, deepClone, formatTimestamp, generateId, generateUUID, getCurrentDate, isArray, isBoolean, isDate, isEmpty, isErrorWithCode, isErrorWithStatusCode, isFile, isFunction, isMap, isNotEmptyString, isNull, isNumber, isObject, isPromise, isRegExp, isSet, isString, isUndefined, isValidDate, isValidUrl, maskApiKey, normalizeUrl, numberSchema, omit, optionalNumberSchema, optionalStringSchema, parseTimestamp, pick, sanitizeString, shuffle, stringSchema, throttle, truncateString, unique, validateApiKey, validateAzureApiKey, validateBearerToken, validateMaxTokens, validateModel, validateTemperature, validateTopP };
