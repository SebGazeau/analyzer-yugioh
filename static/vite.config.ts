import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: 'js/main.ts',
            output: {
                entryFileNames: 'main.js',
            },
        },
    },
    test: {
        environment: 'jsdom',
        include: ['js/__tests__/**/*.test.ts'],
        globals: false,
    },
});
