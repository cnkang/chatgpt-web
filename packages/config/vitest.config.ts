// Shared Vitest configuration for ChatGPT Web monorepo
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"build/",
				"**/*.d.ts",
				"**/*.config.*",
				"**/test/**",
				"**/*.test.*",
				"**/*.spec.*",
			],
		},
		include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/build/**",
			"**/.git/**",
			"**/.turbo/**",
		],
	},
});
