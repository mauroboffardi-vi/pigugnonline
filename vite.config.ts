import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    // Indica a Vite che i sorgenti sono nella cartella src
    root: 'src',

    base: './', // <-- Questo trasforma gli URL da "/assets/..." a "./assets/..."

    build: {
        // L'output della build andrà nella cartella dist (nella root del progetto)
        outDir: '../dist',
        emptyOutDir: true, // Svuota la cartella dist prima di ogni build
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/index.html'),
                single: resolve(__dirname, 'src/app/single/single.html'),
                // multiplayer: resolve(__dirname, 'src/app/multiplayer/multiplayer.html'),            
            }
        }
    }
});