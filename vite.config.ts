import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Indica a Vite che i sorgenti sono nella cartella src
    root: 'src',
    build: {
        // L'output della build andrà nella cartella dist (nella root del progetto)
        outDir: '../dist',
        emptyOutDir: true, // Svuota la cartella dist prima di ogni build
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/index.html'),
                single: resolve(__dirname, 'src/app/single/single.html'),
            }
        }
    }
});