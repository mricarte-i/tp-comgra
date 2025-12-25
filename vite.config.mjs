import { defineConfig } from 'vite';

// Allow overriding base via env (used in CI for GitHub Pages)
const base = process.env.VITE_BASE || './';

export default defineConfig({
	server: {
		port: 10001, // Personaliza el puerto aquí
	},
	build: {
		outDir: 'dist', // Personaliza la carpeta de salida del build aquí
	},
	base,
});
