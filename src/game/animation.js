/**
 * Animazione di lancio di una carta verso il centro del tavolo.
 * Crea un clone dell'immagine, anima un arco con rotazione casuale
 * e lascia il clone nella posizione finale mantenendo la rotazione.
 *
 * @param {HTMLImageElement} img - immagine sorgente cliccata
 * @param {HTMLElement} container - area giocatore contenente la carta
 * @param {HTMLElement} centerElem - elemento della zona centrale del tavolo
 * @param {string} direction - direzione del lancio ('top', 'bottom', 'left', 'right')
 * @param {number} zIndex - z-index base per l'animazione
 * @param {DOMRect} startRect - rettangolo di confinamento della carta iniziale (opzionale)
 * @param {Function} onPlayed - callback da chiamare al termine dell'animazione (opzionale)
 */
export async function animateThrow(
    img,
    container,
    centerElem,
    direction,
    zIndex,
    startRect = null,
    onPlayed = () => { }
) {
    const rect = startRect || img.getBoundingClientRect();
    const centerRect = centerElem.getBoundingClientRect();

    const clone = img.cloneNode(true);
    clone.classList.add('flying-card');
    clone.style.position = 'fixed';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = String(zIndex);
    clone.style.transformOrigin = 'center center';

    document.body.appendChild(clone);

    const previousVisibility = img.style.visibility;
    img.style.visibility = 'hidden';

    const padX = Math.max(12, centerRect.width * 0.08);
    const padY = Math.max(12, centerRect.height * 0.08);
    const midY = centerRect.top + centerRect.height / 2;

    let box;

    if (direction === 'top') {
        box = {
            minX: centerRect.left + padX,
            maxX: centerRect.right - rect.width - padX,
            minY: centerRect.top + padY,
            maxY: midY - rect.height - padY
        };
    } else if (direction === 'bottom') {
        box = {
            minX: centerRect.left + padX,
            maxX: centerRect.right - rect.width - padX,
            minY: midY + padY,
            maxY: centerRect.bottom - rect.height - padY
        };
    } else if (direction === 'left') {
        box = {
            minX: centerRect.left + padX,
            maxX: centerRect.left + centerRect.width * 0.45,
            minY: centerRect.top + padY,
            maxY: centerRect.bottom - rect.height - padY
        };
    } else if (direction === 'right') {
        box = {
            minX: centerRect.left + centerRect.width * 0.55,
            maxX: centerRect.right - rect.width - padX,
            minY: centerRect.top + padY,
            maxY: centerRect.bottom - rect.height - padY
        };
    } else {
        box = {
            minX: centerRect.left + padX,
            maxX: centerRect.right - rect.width - padX,
            minY: centerRect.top + padY,
            maxY: centerRect.bottom - rect.height - padY
        };
    }

    box.maxX = Math.max(box.minX, box.maxX);
    box.maxY = Math.max(box.minY, box.maxY);

    const landingX = rand(box.minX, box.maxX);
    const landingY = rand(box.minY, box.maxY);

    const dx = landingX - rect.left;
    const dy = landingY - rect.top;

    const lift = getArcHeight(direction, Math.abs(dx), Math.abs(dy));
    const tiltStart = rand(-8, 8);
    const tiltMid = rand(-35, 35);
    const tiltEnd = rand(-20, 20);
    const duration = rand(800, 1100);

    try {
        const animation = clone.animate(
            [
                {
                    transform: `translate(0px, 0px) rotate(${tiltStart}deg)`,
                    offset: 0
                },
                {
                    transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) rotate(${tiltMid}deg)`,
                    offset: 0.55
                },
                {
                    transform: `translate(${dx}px, ${dy}px) rotate(${tiltEnd}deg)`,
                    offset: 1
                }
            ],
            {
                duration,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'forwards'
            }
        );

        await animation.finished;

        clone.style.transform = `translate(${dx}px, ${dy}px) rotate(${tiltEnd}deg)`;

        onPlayed();
        return clone;
    } catch (e) {
        img.style.visibility = previousVisibility;
        clone.remove();
        throw e;
    }
}

function rand(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function getArcHeight(direction, absDx, absDy) {
    if (direction === 'top' || direction === 'bottom') {
        return Math.max(60, Math.min(180, absDy * 0.22));
    }
    return Math.max(35, Math.min(120, absDx * 0.16));
}

/**
 * High-level API: play a card. Single.js can call this and provide an `onPlayed`
 * callback that updates game state (remove card from hand and re-render).
 * The animation internals (start rect capture, out/in sequence) are handled here.
 *
 * @param {HTMLImageElement} img
 * @param {HTMLElement} container
 * @param {HTMLElement} centerElem
 * @param {Object} opts
 * @param {Function} opts.onPlayed - called when the card is considered played (between out and in)
 * @param {number} opts.zIndex
 * @returns {Promise<HTMLImageElement>} clone
 */
export async function playCard(img, container, centerElem, opts = {}) {
    const { onPlayed = () => { }, zIndex = 1000 } = opts;

    let direction;
    if (container.classList.contains('top')) direction = 'top';
    else if (container.classList.contains('bottom')) direction = 'bottom';
    else if (container.classList.contains('left')) direction = 'left';
    else if (container.classList.contains('right')) direction = 'right';
    else throw new Error('Container senza direzione valida');

    const startRect = img.getBoundingClientRect();

    const clone = await animateThrow(
        img,
        container,
        centerElem,
        direction,
        zIndex,
        startRect,
        onPlayed
    );

    return clone;
}
