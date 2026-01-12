<script setup lang="ts">
import { fetchChatConfig } from '@/api'
import { useAuthStore } from '@/store'
import { NSpin } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import pkg from '../../../../package.json'

interface ConfigState {
	timeoutMs?: number
	apiModel?: string
	socksProxy?: string
	httpsProxy?: string
	usage?: string
}

const authStore = useAuthStore()

const loading = ref(false)

const config = ref<ConfigState>()

const isChatGPTAPI = computed<boolean>(() => !!authStore.isChatGPTAPI)

async function fetchConfig() {
	try {
		loading.value = true
		const { data } = await fetchChatConfig<ConfigState>()
		config.value = data
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	fetchConfig()
})
</script>

<template>
	<NSpin :show="loading">
		<div class="p-4 space-y-4">
			<h2 class="text-xl font-bold">
Version - {{ pkg.version }}
</h2>
			<div class="p-2 space-y-2 rounded-md bg-neutral-100 dark:bg-neutral-700">
				<p>
					{{ $t('setting.openSource') }}
					<a
						class="text-blue-600 dark:text-blue-500"
						href="https://github.com/Chanzhaoyu/chatgpt-web"
						target="_blank"
					>
						GitHub
					</a>
					{{ $t('setting.freeMIT') }}
				</p>
				<p>
					{{ $t('setting.stars') }}
				</p>
			</div>

			<!-- Configuration Information -->
			<div
				class="p-3 space-y-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
			>
				<h3 class="font-medium text-blue-800 dark:text-blue-200">
					{{ $t('setting.config') }}
				</h3>
				<p>
					<span class="font-medium">{{ $t('setting.api') }}:</span>
					<span v-if="isChatGPTAPI" class="text-green-600 dark:text-green-400 ml-1">
						{{ $t('setting.officialAPI') }}
					</span>
					<span v-else class="text-orange-600 dark:text-orange-400 ml-1">
						{{ config?.apiModel ?? $t('setting.unknownAPI') }}
					</span>
				</p>
				<p v-if="isChatGPTAPI">
					<span class="font-medium">{{ $t('setting.monthlyUsage') }}:</span>
					<span class="ml-1">{{ config?.usage ?? '-' }}</span>
				</p>
				<p>
					<span class="font-medium">{{ $t('setting.timeout') }}:</span>
					<span class="ml-1">{{ config?.timeoutMs ?? '-' }}</span>
				</p>
				<p>
					<span class="font-medium">{{ $t('setting.socks') }}:</span>
					<span class="ml-1">{{ config?.socksProxy ?? '-' }}</span>
				</p>
				<p>
					<span class="font-medium">{{ $t('setting.httpsProxy') }}:</span>
					<span class="ml-1">{{ config?.httpsProxy ?? '-' }}</span>
				</p>
			</div>

			<!-- Migration Guidance Section -->
			<div
				class="p-4 space-y-3 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
			>
				<h3 class="font-medium text-green-800 dark:text-green-200">
					{{ $t('setting.migrationNotice') }}
				</h3>
				<p class="text-sm text-green-700 dark:text-green-300">
					{{ $t('setting.migrationDescription') }}
				</p>
				<div class="space-y-2">
					<p class="text-sm font-medium text-green-800 dark:text-green-200">
						{{ $t('setting.migrationSteps') }}:
					</p>
					<ul class="text-sm text-green-700 dark:text-green-300 space-y-1 ml-4">
						<li>• {{ $t('setting.migrationStep1') }}</li>
						<li>• {{ $t('setting.migrationStep2') }}</li>
						<li>• {{ $t('setting.migrationStep3') }}</li>
					</ul>
				</div>
				<div class="pt-2">
					<a
						href="https://platform.openai.com/api-keys"
						target="_blank"
						class="inline-flex items-center text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 underline"
					>
						{{ $t('setting.getAPIKey') }}
						<svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
					</a>
				</div>
			</div>
		</div>
	</NSpin>
</template>
