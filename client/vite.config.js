import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react-swc"

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd())
	const port = Number(env.VITE_PORT) || 3000

	return {
		server: {
			port
		},
		plugins: [react()],
		resolve: {
			alias: [{ find: "~", replacement: "/src" }]
		}
	}
})
