import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getGitVersion() {
    try {
        // Esegue il comando git per recuperare la versione/commit corrente
        return execSync('git describe --tags --always --dirty', { encoding: 'utf8' }).trim();
    } catch (error) {
        // Fallback se il progetto viene eseguito senza la cartella .git
        return '1.0.0-dev';
    }
}

const versionInfo = {
    version: getGitVersion(),
    buildTime: new Date().toISOString()
};

// Genera direttamente un file TypeScript importabile nel codice
const outputPath = join(__dirname, '../src/version.ts');
const fileContent = `// Autogenerato da scripts/generate-version.js - NON MODIFICARE MANUALE
export const APP_VERSION = ${JSON.stringify(versionInfo, null, 2)} as const;
`;

writeFileSync(outputPath, fileContent);
console.log(`[Version Generator] Versione aggiornata: ${versionInfo.version}`);