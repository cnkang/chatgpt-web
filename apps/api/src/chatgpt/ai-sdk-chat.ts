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

function selectConversationMessages(messages: UIMessage[], usingContext = true) {
  if (usingContext) return messages

  const lastUserMessage = [...messages].reverse().find(message => message.role === 'user')
  return lastUserMessage ? [lastUserMessage] : messages
}

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

function normalizeAzureBaseUrl(endpoint: string) {
  const trimmedEndpoint = endpoint.replace(/\/+$/, '')
  return trimmedEndpoint.endsWith('/openai') ? trimmedEndpoint : `${trimmedEndpoint}/openai`
}

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

function resolveLanguageModel() {
  const config = getConfig()
  return config.ai.provider === 'azure' ? buildAzureModel() : buildOpenAIModel()
}

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

export async function pipeUIChatResponse(response: ServerResponse, options: StreamUIChatOptions) {
  const result = await streamUIChat(options)

  result.pipeUIMessageStreamToResponse(response, {
    onError: () => 'Something went wrong.',
  })
}
