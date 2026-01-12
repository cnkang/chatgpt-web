/**
 * Example usage of the AI Provider system
 * Shows how to use both OpenAI and Azure OpenAI providers
 */

import type { AIConfig, ChatCompletionRequest } from './index.js'
import { createProvider, getAvailableProviders } from './index.js'

const log = (...args: unknown[]) => console.warn(...args)

async function exampleUsage() {
  log('🚀 AI Provider System Example Usage\n')

  // Show available providers
  log('Available providers:', getAvailableProviders())

  // Example OpenAI configuration
  const openAIConfig: AIConfig = {
    provider: 'openai',
    defaultModel: 'gpt-4o-mini',
    enableReasoning: false,
    openai: {
      apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
      baseUrl: process.env.OPENAI_API_BASE_URL,
      organization: process.env.OPENAI_ORGANIZATION,
    },
  }

  // Example Azure OpenAI configuration
  const azureConfig: AIConfig = {
    provider: 'azure',
    defaultModel: 'gpt-4o',
    enableReasoning: false,
    azure: {
      apiKey: process.env.AZURE_OPENAI_API_KEY || 'your-azure-api-key',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://your-resource.openai.azure.com',
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    },
  }

  // Example chat request
  const chatRequest: ChatCompletionRequest = {
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user',
        content: 'Hello! Can you help me understand AI providers?',
      },
    ],
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 150,
  }

  try {
    // Example 1: Using OpenAI provider
    log('\n📝 Example 1: OpenAI Provider')
    const openAIProvider = createProvider(openAIConfig)
    log(`Created ${openAIProvider.name} provider`)
    log(`Model capabilities for ${chatRequest.model}:`)
    log(openAIProvider.getModelCapabilities(chatRequest.model))

    // Note: Actual API calls would require valid API keys
    log('💡 To make actual API calls, set OPENAI_API_KEY environment variable')

    // Example 2: Using Azure OpenAI provider
    log('\n📝 Example 2: Azure OpenAI Provider')
    const azureProvider = createProvider(azureConfig)
    log(`Created ${azureProvider.name} provider`)
    log(`Model capabilities for ${chatRequest.model}:`)
    log(azureProvider.getModelCapabilities(chatRequest.model))

    log('💡 To make actual API calls, set Azure OpenAI environment variables:')
    log('   - AZURE_OPENAI_API_KEY')
    log('   - AZURE_OPENAI_ENDPOINT')
    log('   - AZURE_OPENAI_DEPLOYMENT')

    // Example 3: Provider switching
    log('\n📝 Example 3: Dynamic Provider Switching')
    const configs = [openAIConfig, azureConfig]

    for (const config of configs) {
      const provider = createProvider(config)
      log(`\n${provider.name.toUpperCase()} Provider:`)
      log(`  - Supports streaming: ${provider.supportsStreaming}`)
      log(`  - Supports reasoning: ${provider.supportsReasoning}`)
      log(`  - Supported models: ${provider.supportedModels.length} models`)
    }

    log('\n✅ Example completed successfully!')
  }
  catch (error) {
    console.error('\n❌ Example failed:', error)
  }
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage().catch(console.error)
}

export { exampleUsage }
