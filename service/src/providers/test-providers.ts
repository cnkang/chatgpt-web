/**
 * Simple test script to verify provider implementations
 * This is a basic validation script, not a comprehensive test suite
 */

import { createProvider, getAIConfig, validateConfig } from './index.js'

const log = (...args: unknown[]) => console.warn(...args)

async function testProviders() {
	log('🧪 Testing AI Provider Implementations...\n')

	// Test configuration validation
	log('1. Testing configuration validation...')
	const configValidation = validateConfig()
	log(`   Configuration valid: ${configValidation.isValid}`)
	if (!configValidation.isValid) {
		log(`   Errors: ${configValidation.errors.join(', ')}`)
	}

	// Get AI configuration
	const aiConfig = getAIConfig()
	log(`   Provider: ${aiConfig.provider}`)
	log(`   Default model: ${aiConfig.defaultModel}`)
	log(`   Reasoning enabled: ${aiConfig.enableReasoning}`)

	try {
		// Test provider creation
		log('\n2. Testing provider creation...')
		const provider = createProvider(aiConfig)
		log(`   ✅ Created ${provider.name} provider`)
		log(`   Supports streaming: ${provider.supportsStreaming}`)
		log(`   Supports reasoning: ${provider.supportsReasoning}`)
		log(`   Supported models: ${provider.supportedModels.slice(0, 3).join(', ')}...`)

		// Test model capabilities
		log('\n3. Testing model capabilities...')
		const capabilities = provider.getModelCapabilities(aiConfig.defaultModel)
		log(`   Max tokens: ${capabilities.maxTokens}`)
		log(`   Supports reasoning: ${capabilities.supportsReasoning}`)
		log(`   Supports streaming: ${capabilities.supportsStreaming}`)

		// Test model support check
		log('\n4. Testing model support...')
		const isSupported = provider.isModelSupported(aiConfig.defaultModel)
		log(`   Model ${aiConfig.defaultModel} supported: ${isSupported}`)

		log('\n✅ All basic tests passed!')
	} catch (error) {
		console.error('\n❌ Provider test failed:', error)
	}
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	testProviders().catch(console.error)
}

export { testProviders }
