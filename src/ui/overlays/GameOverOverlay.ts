// src/ui/overlays/GameOverOverlay.ts

import { GameOverState } from "../../domain/domain-types";
import ConfettiGenerator, { ConfettiSettings } from 'confetti-js';

export class GameOverOverlay {
    private overlayElement: HTMLDivElement | null = null;
    private confetti: ConfettiGenerator | null = null;

    constructor() {
        this.confetti = null;
    }

    show(gameOverData: GameOverState, onClickCallback?: () => void) {
        this.close();

        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';
        overlay.innerHTML = `
            <div class="game-over-content" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
                <canvas id="confetti-canvas"></canvas>
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

        // Avvio dei confetti
        const confettiSettings: ConfettiSettings = {
            target: 'confetti-canvas',
            max: 80,
            size: 2,
            animate: true,
            props: ['circle', 'square', 'triangle'],
            colors: [[216, 162, 74], [46, 125, 50], [255, 255, 255], [200, 50, 50]]
        };
        this.confetti = new ConfettiGenerator(confettiSettings);
        this.confetti.render();

    }

    close() {
        const overlay = this.overlayElement || document.querySelector('.game-over-overlay');
        if (!overlay) return;
        if (this.confetti) {
            this.confetti.clear();
            this.confetti = null;
        }

        overlay.remove();
        document.body.style.pointerEvents = 'auto';
        this.overlayElement = null;
    }
}