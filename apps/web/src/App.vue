<script setup lang="ts">
import { LoadingSpinner, NaiveProvider } from '@/components/common'
import { useLanguage } from '@/hooks/useLanguage'
import { useTheme } from '@/hooks/useTheme'
import { NConfigProvider } from 'naive-ui'

const { theme, themeOverrides } = useTheme()
const { language } = useLanguage()
</script>

<template>
	<NConfigProvider
		class="h-full"
		:theme="theme"
		:theme-overrides="themeOverrides"
		:locale="language"
	>
		<NaiveProvider>
			<Suspense>
				<template #default>
					<RouterView />
				</template>
				<template #fallback>
					<LoadingSpinner size="large" text="Loading application..." />
				</template>
			</Suspense>
		</NaiveProvider>
	</NConfigProvider>
</template>
