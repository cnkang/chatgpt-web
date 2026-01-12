// Shared tsup configuration for ChatGPT Web monorepo
import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node24",
	outDir: "build",
	clean: true,
	sourcemap: true,
	dts: true,
	minify: false,
	splitting: false,
	treeshake: true,
	external: [],
	noExternal: [],
	platform: "node",
	env: {
		NODE_ENV: "production",
	},
});
