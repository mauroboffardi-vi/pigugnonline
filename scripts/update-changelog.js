import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const changelogPath = join(__dirname, '../CHANGELOG.md');

function getGitVersion() {
    try {
        return execSync('git describe --tags --always --dirty', { encoding: 'utf8' }).trim();
    } catch (error) {
        return 'dev-build';
    }
}

const date = new Date().toISOString().split('T')[0];
const time = new Date().toLocaleTimeString();
const version = getGitVersion();

// Struttura della nuova riga da inserire nel Changelog
const newEntry = `- **[${version}]** - ${date} ${time}: Aggiornamento automatico della build.\n`;

let currentContent = '';
if (existsSync(changelogPath)) {
    currentContent = readFileSync(changelogPath, 'utf8');
}

// Se il file è nuovo, aggiungiamo un'intestazione
if (!currentContent.includes('# Changelog')) {
    currentContent = `# Changelog\n\n` + currentContent;
}

// Inseriamo la nuova voce subito sotto l'intestazione
const updatedContent = currentContent.replace('# Changelog\n\n', `# Changelog\n\n${newEntry}`);

writeFileSync(changelogPath, updatedContent);
console.log(`[Changelog] Aggiunta voce per versione ${version}`);

// Aggiungiamo CHANGELOG.md allo stage per includerlo nel commit in corso
execSync('git add CHANGELOG.md');