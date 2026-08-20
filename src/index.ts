import { APP_VERSION } from './version';

function renderVersionInfo() {
    const versionEl = document.getElementById('app-version');

    if (versionEl) {
        // Formatta la data in un formato leggibile (es: 20/08/2026, 17:12)
        const formattedDate = new Date(APP_VERSION.buildTime).toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        versionEl.textContent = `v${APP_VERSION.version} (${formattedDate})`;
    }
}

// Richiama la funzione all'avvio dell'app
document.addEventListener('DOMContentLoaded', renderVersionInfo);