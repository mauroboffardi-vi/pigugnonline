export class ClickToStartOverlay {

    private overlayElement: HTMLElement | null = null;

    public show(): Promise<void> {
        this.close();

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'click-to-start-overlay';
            overlay.innerHTML = `
            <div class="click-to-start-content" role="dialog" aria-modal="true" aria-labelledby="click-to-start-title">
                <h1 id="click-to-start-title" class="click-to-start-title">
                    Pronto?
                </h1>
                <p class="click-to-continue">Clicca iniziare la partita</p>
            </div>`;

            document.body.appendChild(overlay);
            document.body.style.pointerEvents = 'none';
            overlay.style.pointerEvents = 'auto';

            const handleClose = () => {
                this.close();
                resolve();
            };

            overlay.addEventListener('click', handleClose);
            this.overlayElement = overlay;

        });
    }

    close() {
        const overlay = this.overlayElement || document.querySelector('.click-to-start-overlay');
        if (!overlay) return;

        overlay.remove();
        document.body.style.pointerEvents = 'auto';
        this.overlayElement = null;
    }
}