// src/game/GameOverOverlay.js

export class GameOverOverlay {
    show(gameOverData, onClickCallback) {
        this.close();

        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';
        overlay.innerHTML = `
            <div class="game-over-content" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
                <h1 id="game-over-title" class="game-over-title">
                    ${gameOverData.isDoubleWin ? 'DOPPIA VITTORIA!' : 'PARTITA FINITA'}
                </h1>
                <p class="winner-message">${gameOverData.message}</p>
                <p class="click-to-continue">Clicca per tornare al menu</p>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.style.pointerEvents = 'none';
        overlay.style.pointerEvents = 'auto';

        const handleClose = () => {
            this.close();
            if (onClickCallback) {
                onClickCallback();
            } else {
                window.location.href = '../../index.html';
            }
        };

        overlay.addEventListener('click', handleClose);
        this.overlayElement = overlay;
    }

    close() {
        const overlay = this.overlayElement || document.querySelector('.game-over-overlay');
        if (!overlay) return;

        overlay.remove();
        document.body.style.pointerEvents = 'auto';
        this.overlayElement = null;
    }
}