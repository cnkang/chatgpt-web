import type { ServerResponse } from 'node:http'
import { createAzure } from '@ai-sdk/azure'
import { createOpenAI } from '@ai-sdk/openai'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { getConfig } from '../providers/config.js'

interface StreamUIChatOptions {
  messages: UIMessage[]
  systemMessage?: string
  temperature?: number
  top_p?: number
  usingContext?: boolean
}

/**
 * Selects either the full conversation or only the most recent user message.
 *
 * @param messages - The conversation messages in chronological order.
 * @param usingContext - If `true`, return all messages; if `false`, return only the last message with role `"user"`.
 * @returns An array of `UIMessage`: all messages when `usingContext` is `true`, otherwise an array containing the most recent user message; if no user message is found, returns the original `messages`.
 */
function selectConversationMessages(messages: UIMessage[], usingContext = true) {
  if (usingContext) return messages

  const lastUserMessage = [...messages].reverse().find(message => message.role === 'user')
  return lastUserMessage ? [lastUserMessage] : messages
}

/**
 * Create and return an OpenAI-compatible chat model configured from application settings.
 *
 * @returns A chat model instance configured with the application's OpenAI settings (model chosen from config.ai.defaultModel).
 * @throws If the OpenAI API key is not configured.
 */
function buildOpenAIModel() {
  const config = getConfig()
  const openAIConfig = config.ai.openai

  if (!openAIConfig?.apiKey) {
    throw new Error('OpenAI API key is not configured')
  }

  const provider = createOpenAI({
    apiKey: openAIConfig.apiKey,
    baseURL: openAIConfig.baseUrl,
    organization: openAIConfig.organization,
    name: openAIConfig.baseUrl ? 'openai-compatible' : 'openai',
  })

  return provider.chat(config.ai.defaultModel as never)
}

/**
 * Normalize an Azure OpenAI endpoint URL to ensure it ends with '/openai'.
 *
 * @param endpoint - The base Azure endpoint URL, which may include trailing slashes or already end with '/openai'
 * @returns The endpoint with trailing slashes removed and guaranteed to end with '/openai'
 */
function normalizeAzureBaseUrl(endpoint: string) {
  const trimmedEndpoint = endpoint.replace(/\/+$/, '')
  return trimmedEndpoint.endsWith('/openai') ? trimmedEndpoint : `${trimmedEndpoint}/openai`
}

/**
 * Builds and returns a configured Azure OpenAI model instance.
 *
 * Throws if Azure API key or endpoint are not configured.
 *
 * @returns A configured Azure model instance. If the Azure configuration has `useResponsesAPI` set to `true`, returns the provider bound to the configured deployment identifier; otherwise returns the chat model for the configured deployment identifier.
 * @throws Error if the Azure API key or endpoint is missing
 */
function buildAzureModel() {
  const config = getConfig()
  const azureConfig = config.ai.azure

  if (!azureConfig?.apiKey || !azureConfig.endpoint) {
    throw new Error('Azure OpenAI is not fully configured')
  }

  const provider = createAzure({
    apiKey: azureConfig.apiKey,
    apiVersion: azureConfig.apiVersion,
    baseURL: normalizeAzureBaseUrl(azureConfig.endpoint),
    useDeploymentBasedUrls: !azureConfig.useResponsesAPI,
  })

  if (azureConfig.useResponsesAPI) {
    return provider(config.ai.defaultModel as never)
  }

  return provider.chat(config.ai.defaultModel as never)
}

/**
 * Selects the configured AI provider and returns its corresponding language model.
 *
 * @returns The language model instance for the configured provider — an Azure-backed model when the provider is `'azure'`, otherwise an OpenAI-backed model.
 */
function resolveLanguageModel() {
  const config = getConfig()
  return config.ai.provider === 'azure' ? buildAzureModel() : buildOpenAIModel()
}

/**
 * Starts a streamed chat response from the configured language model for the given UI messages.
 *
 * @param options - Streaming options including `messages`, optional `systemMessage`, `temperature`, `top_p`, and `usingContext`
 * @returns The model's streamed text response result suitable for piping to an HTTP response
 */
async function streamUIChat(options: StreamUIChatOptions) {
  const messages = selectConversationMessages(options.messages, options.usingContext ?? true)

  return streamText({
    model: resolveLanguageModel(),
    system: options.systemMessage,
    temperature: options.temperature,
    topP: options.top_p,
    messages: await convertToModelMessages(messages),
  })
}

/**
 * Stream a UI-formatted chat conversation directly to an HTTP response.
 *
 * @param response - The Node.js HTTP `ServerResponse` to send the streamed messages to
 * @param options - Streaming options (messages, optional `systemMessage`, `temperature`, `top_p`, `usingContext`)
 */
export async function pipeUIChatResponse(response: ServerResponse, options: StreamUIChatOptions) {
  const result = await streamUIChat(options)

  result.pipeUIMessageStreamToResponse(response)
}
