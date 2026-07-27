// src/game/CaptureOverlay.js

export function showCaptureOverlay(cards) {
    const overlay = document.createElement('div');
    overlay.className = 'capture-overlay';
    overlay.innerHTML = `
    <span class="close-btn">&times;</span>
    <div class="overlay-content">
      ${cards.map(card => `<img src="${card.imagePath}" alt="${card.value} di ${card.suit}" />`).join('')}
    </div>
  `;

    document.body.appendChild(overlay);

    const closeButton = overlay.querySelector('.close-btn');
    closeButton.addEventListener('click', () => {
        closeCaptureOverlay();
    });

    // Disable interaction while overlay is open
    document.body.style.pointerEvents = 'none';
    overlay.style.pointerEvents = 'auto';

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeCaptureOverlay();
        }
    });
}

export function closeCaptureOverlay() {
    const overlay = document.querySelector('.capture-overlay');
    if (overlay) {
        document.body.removeChild(overlay);
        // Assicurati di ripristinare il comportamento di click
        document.body.style.pointerEvents = 'auto';
    }
}