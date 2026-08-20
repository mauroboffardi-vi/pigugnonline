import { rm, mkdir, cp } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const SRC = join(root, 'src');
const DIST = join(root, 'dist');

async function cleanDist() {
    await rm(DIST, { recursive: true, force: true });
    await mkdir(DIST, { recursive: true });
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {Promise<void>}
 */
async function copyFile(from, to) {
    await mkdir(dirname(to), { recursive: true });
    await cp(from, to, { recursive: true, force: true });
}

async function copyHtmlAndAssets() {
    // HTML
    await copyFile(join(SRC, 'index.html'), join(DIST, 'index.html'));
    await copyFile(join(SRC, 'app/single', 'single.html'), join(DIST, 'app/single', 'single.html'));
    await copyFile(join(SRC, 'app/multiplayer', 'multiplayer.html'), join(DIST, 'app/multiplayer', 'multiplayer.html'));

    await cp(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true, force: true });
}

async function bundleJs() {
    await build({
        entryPoints: [
            join(SRC, 'app', 'single', 'single.js'),
            join(SRC, 'app', 'single', 'test-buttons.js'),
            join(SRC, 'index.js'),

            // quando hai network.js:
            // join(SRC, 'app', 'network.js'),
        ],
        outdir: DIST,
        outbase: SRC,
        bundle: true,
        format: 'esm',
        sourcemap: false, // metti true se vuoi sourcemap per debug
        minify: true,    // true per produzione
    });
}

async function main() {
    await cleanDist();
    await copyHtmlAndAssets();
    await bundleJs();
    console.log('Build completata in dist/');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});