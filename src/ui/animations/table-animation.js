/** @typedef {import('../ui-types').PlayerAreaDirections} PlayerAreaDirections */
/** @typedef {import('../domain-types').TrickEntry} TrickEntry */

/**
 * Animazioni per la gestione del tavolo, carte giocate, buttate
 *
 * Funzioni esportate:
 * - animateThrow: Anima il lancio di una carta dal suo punto di partenza verso un elemento di destinazione.
 * - animatePlayCard: API di alto livello per giocare una carta con l'animazione.
 * - animateTrickResolution: Anima le carte vinte verso il giocatore vincitore.
 */


/**
 * Wait for the passed milliseconds
 * @param {number} ms 
 * @returns {Promise<void>}
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function rand(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

/**
 * 
 * @param {string} direction 
 * @param {number} absDx 
 * @param {number} absDy 
 * @returns 
 */
function getArcHeight(direction, absDx, absDy) {
    if (direction === 'top' || direction === 'you' || direction === 'bottom') {
        return Math.max(60, Math.min(180, absDy * 0.22));
    }

    return Math.max(35, Math.min(120, absDx * 0.16));
}

/**
 * @param {HTMLImageElement} cardImg
 * @param {string} revealSrc
 * @returns {Promise<void>}
 */
async function revealCardInFlight(cardImg, revealSrc) {
    if (!revealSrc) return;

    cardImg.style.transformOrigin = 'center center';

    const shrink = cardImg.animate(
        [
            { transform: 'rotateY(0deg) scaleX(1)' },
            { transform: 'rotateY(90deg) scaleX(0.08)' }
        ],
        {
            duration: 120,
            easing: 'ease-in',
            fill: 'forwards'
        }
    );

    await shrink.finished;

    cardImg.src = revealSrc;
    cardImg.dataset.faceSrc = revealSrc;
    cardImg.dataset.faceUp = 'true';

    const expand = cardImg.animate(
        [
            { transform: 'rotateY(-90deg) scaleX(0.08)' },
            { transform: 'rotateY(0deg) scaleX(1)' }
        ],
        {
            duration: 140,
            easing: 'ease-out',
            fill: 'forwards'
        }
    );

    await expand.finished;

    cardImg.style.transform = 'none';
    cardImg.style.backfaceVisibility = 'visible';
    cardImg.style.transformStyle = 'flat';
}

/**
 * @param {HTMLImageElement} img
 * @param {HTMLElement} centerElem
 * @param {PlayerAreaDirections} direction
 * @param {number} zIndex
 * @param {DOMRect | null} [startRect=null]
 * @param {(wrapper: HTMLDivElement) => void} [onPlayed=() => {}]
 * @param {{ onPlayed?: (wrapper: HTMLDivElement) => void, zIndex?: number, revealSrc?: string | null }} [options={}]
 * @returns {Promise<HTMLDivElement>}
 */
export async function animateThrow(
    img,
    centerElem,
    direction,
    zIndex,
    startRect = null,
    onPlayed = () => { },
    options = {}
) {
    const { revealSrc = null } = options;

    const rect = startRect || img.getBoundingClientRect();
    const centerRect = centerElem.getBoundingClientRect();

    const wrapper = document.createElement('div');
    wrapper.className = 'flying-card';
    wrapper.style.position = 'fixed';
    wrapper.style.left = `${rect.left}px`;
    wrapper.style.top = `${rect.top}px`;
    wrapper.style.width = `${rect.width}px`;
    wrapper.style.height = `${rect.height}px`;
    wrapper.style.margin = '0';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.zIndex = String(zIndex);
    wrapper.style.transformOrigin = 'center center';

    /** @type {HTMLImageElement} */
    const clone = /** @type {HTMLImageElement} */ (img.cloneNode(true));
    clone.style.display = 'block';
    clone.style.width = '100%';
    clone.style.height = '100%';
    clone.style.margin = '0';
    clone.style.transformOrigin = 'center center';

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const previousVisibility = img.style.visibility;
    img.style.visibility = 'hidden';

    const padX = Math.max(12, centerRect.width * 0.08);
    const padY = Math.max(12, centerRect.height * 0.08);
    const midY = centerRect.top + centerRect.height / 2;

    /** @type {{ minX: number, maxX: number, minY: number, maxY: number }} */
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
        throw new Error('animateThrow(): Container senza direzione valida');
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
        const flight = wrapper.animate(
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

        if (revealSrc) {
            await wait(duration * 0.18);
            revealCardInFlight(clone, revealSrc);
        }

        await flight.finished;

        wrapper.style.transform = `translate(${dx}px, ${dy}px) rotate(${tiltEnd}deg)`;
        clone.src = clone.dataset.faceSrc || revealSrc || clone.src;
        clone.dataset.faceUp = 'true';

        onPlayed(wrapper);
        return wrapper;
    } catch (e) {
        img.style.visibility = previousVisibility;
        wrapper.remove();
        throw e;
    }
}

/**
 * High-level API: play a card.
 * @param {HTMLImageElement} img
 * @param {HTMLElement} container
 * @param {HTMLElement} centerElem
 * @param {{ onPlayed?: (wrapper: HTMLDivElement) => void, zIndex?: number, revealSrc?: string | null }} [opts={}]
 * @returns {Promise<HTMLDivElement>}
 */
export async function animatePlayCard(img, container, centerElem, opts = {}) {
    const {
        onPlayed = () => { },
        zIndex = 1000,
        revealSrc = null
    } = opts;

    /** @type {PlayerAreaDirections} */
    let direction;
    if (container.classList.contains('top')) direction = 'top';
    else if (container.classList.contains('bottom')) direction = 'bottom';
    else if (container.classList.contains('left')) direction = 'left';
    else if (container.classList.contains('right')) direction = 'right';
    else throw new Error('Container senza direzione valida');

    const startRect = img.getBoundingClientRect();


    const flyingCard = await animateThrow(
        img,
        centerElem,
        direction,
        zIndex,
        startRect,
        onPlayed,
        { revealSrc }
    );

    return flyingCard;
}

/**
 * 
 * Animazione per muovere le carte vinte verso il giocatore vincitore.
 * 
 * @param {HTMLElement} centerElem
 * @param {TrickEntry[]} trickEntries
 * @param {number} winnerId
 * @param {Map<string, HTMLElement>} cardsOnTable
 * @returns {Promise<void>}
 */
export async function animateTrickResolution(centerElem, trickEntries, winnerId, cardsOnTable) {
    const centerRect = centerElem.getBoundingClientRect();
    const margin = 40;

    let targetX = 0;
    let targetY = 0;

    switch (winnerId) {
        case 0:
            targetX = centerRect.left + centerRect.width / 2;
            targetY = window.innerHeight + margin;
            break;
        case 1:
            targetX = -window.innerWidth - margin;
            targetY = centerRect.top + centerRect.height / 2;
            break;
        case 2:
            targetX = centerRect.left + centerRect.width / 2;
            targetY = -window.innerHeight - margin;
            break;
        case 3:
            targetX = window.innerWidth + margin;
            targetY = centerRect.top + centerRect.height / 2;
            break;
        default:
            break;
    }

    const animations = trickEntries
        .map(({ card }, index) => {
            const clone = cardsOnTable.get(String(card.id));
            if (!clone) return null;

            const rect = clone.getBoundingClientRect();
            const dx = targetX - (rect.left + rect.width / 2);
            const dy = targetY - (rect.top + rect.height / 2);

            const anim = clone.animate(
                [
                    { transform: clone.style.transform || 'translate(0px, 0px)', opacity: 1 },
                    { transform: `${clone.style.transform || 'translate(0px, 0px)'} translate(${dx}px, ${dy}px)`, opacity: 0.2 }
                ],
                {
                    duration: 700 + index * 80,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    fill: 'forwards'
                }
            );

            return anim.finished.then(() => clone.remove());
        })
        .filter(Boolean);

    await Promise.all(animations);
}