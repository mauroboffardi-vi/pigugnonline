// src/game/GameOverOverlay.js

/**
 * Mostra l'overlay di fine partita con il risultato.
 * 
 * @param {Object} result - L'oggetto contenente il risultato della partita.
 * @param {boolean} result.isDoubleVictory - Se si tratta di una doppia vittoria.
 * @param {string} result.message - Il messaggio di vittoria da mostrare.
 */
export function showGameOverOverlay(result) {
    let overlay = document.getElementById('game-over-overlay');

    // Se non esiste, crea l'elemento overlay
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'game-over-overlay';
        overlay.className = 'game-over-overlay';
        document.body.appendChild(overlay);
    }

    // Costruisci l'HTML interno
    overlay.innerHTML = `
        <div class="game-over-content">
            <h1 class="game-over-title">PARTITA CONCLUSA</h1>
            ${result.isDoubleVictory ? '<h2 class="double-victory-text">DOPPIA VITTORIA!</h2>' : ''}
            <p class="winner-message">${result.message}</p>
            <button class="new-game-btn" id="new-game-btn">Nuova Partita</button>
        </div>
    `;

    // Aggiungi l'evento al pulsante per ricaricare la pagina (iniziare una nuova partita)
    const newGameBtn = overlay.querySelector('#new-game-btn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            location.reload();
        });
    }

    // Stili dinamici di base (opzionale se decidi di mettere tutto in un file CSS)
    overlay.style.display = 'flex';
    document.body.style.pointerEvents = 'none'; // Disabilita click sottostanti
    overlay.style.pointerEvents = 'auto';       // Riabilita click solo per l'overlay
}

/**
 * Chiude (o rimuove) l'overlay di fine partita.
 */
export function closeGameOverOverlay() {
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) {
        document.body.removeChild(overlay);
        document.body.style.pointerEvents = 'auto'; // Riabilita le interazioni
    }
}