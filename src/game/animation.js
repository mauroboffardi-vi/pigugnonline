/**
 * Animazione di lancio di una carta verso il centro del tavolo.
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
    } else if (direction === 'you' || direction === 'bottom') {
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

        onPlayed(clone);
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
    if (direction === 'top' || direction === 'you' || direction === 'bottom') {
        return Math.max(60, Math.min(180, absDy * 0.22));
    }
    return Math.max(35, Math.min(120, absDx * 0.16));
}

/**
 * High-level API: play a card.
 */
export async function playCard(img, container, centerElem, opts = {}) {
    const { onPlayed = () => { }, zIndex = 1000 } = opts;

    let direction;
    if (container.classList.contains('top')) direction = 'top';
    else if (container.classList.contains('bottom')) direction = 'bottom';
    else if (container.classList.contains('you')) direction = 'you';
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

/*
 * Animazione per muovere le carte vinte verso il giocatore vincitore.
 */
export async function animateTrickResolution(centerElem, trickEntries, winnerId, cardsOnTable) {
    const centerRect = centerElem.getBoundingClientRect();
    const margin = 40;

    let targetX = 0;
    let targetY = 0;

    switch (winnerId) {
        case 0: // you
            targetX = centerRect.left + centerRect.width / 2;
            targetY = window.innerHeight + margin;
            break;
        case 1: // left
            targetX = -window.innerWidth - margin;
            targetY = centerRect.top + centerRect.height / 2;
            break;
        case 2: // top
            targetX = centerRect.left + centerRect.width / 2;
            targetY = -window.innerHeight - margin;
            break;
        case 3: // right
            targetX = window.innerWidth + margin;
            targetY = centerRect.top + centerRect.height / 2;
            break;
    }

    const animations = trickEntries.map(({ card }, index) => {
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
    }).filter(Boolean);

    await Promise.all(animations);
}

/*
 * ANIMAZIONI DI FINE MANO E SHOW PUNTEGGIO
 */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getPlayerAnchorRect(positionClass) {
    const byId = {
        top: 'player-top',
        left: 'player-left',
        right: 'player-right',
        you: 'player-you',
        bottom: 'player-you'
    };

    const el = document.getElementById(byId[positionClass]);
    if (!el) return null;
    return el.getBoundingClientRect();
}

function createScoreCard(card, className = '') {
    const el = document.createElement('div');
    el.className = `summary-card ${className}`.trim();
    el.dataset.cardId = card.id;

    const src = card.imagePath || card.image || '';
    el.innerHTML = `<img src="${src}" alt="${card.value} di ${card.suit}">`;

    return el;
}

function getPositionClassByPlayerId(playerId) {
    switch (playerId) {
        case 0: return 'you';
        case 1: return 'left';
        case 2: return 'top';
        case 3: return 'right';
        default: return 'you';
    }
}

export async function animateHandSummary(summary) {
    const overlay = ensureSummaryLayer();
    overlay.classList.add('visible');

    const nextBtn = overlay.querySelector('.next-hand-button');
    nextBtn.hidden = true;
    nextBtn.onclick = null;

    overlay.querySelector('.summary-cards-layer').innerHTML = '';
    overlay.querySelectorAll('.summary-score').forEach((el) => {
        el.classList.remove('visible');
        el.querySelector('.summary-points-value').textContent = '0';
        el.querySelector('.summary-busche').innerHTML = '';
    });

    const everyoneCovered = summary.players.every(p => p.tricks > 0);

    for (const playerSummary of summary.players) {
        await scatterScoringCardsForPlayer(playerSummary);
        await sleep(180);
    }

    if (everyoneCovered && summary.pigugnoWinnerId != null) {
        await sleep(rand(500, 1500));
        const pigugnoOwner = summary.players.find(p => p.playerId === summary.pigugnoWinnerId);
        const pigugnoCard = pigugnoOwner?.captures.find(card => card.suit === 'spade' && card.value === 8);
        if (pigugnoCard) {
            await showPigugnoCenter(pigugnoCard, summary.pigugnoWinnerId);
        }
    }

    const orderedPlayers = getOrderedPlayersFromStartingPlayer(summary);

    // Primo giro: mostra i punti per tutti
    for (const playerSummary of orderedPlayers) {
        await animatePlayerPoints(playerSummary);
    }

    // Piccola pausa tra i due giri
    await sleep(400);

    // Secondo giro: mostra le busche per tutti
    for (const playerSummary of orderedPlayers) {
        await animatePlayerBusche(playerSummary);
    }

    nextBtn.hidden = false;

    return new Promise(resolve => {
        nextBtn.onclick = () => {
            nextBtn.onclick = null;
            resolve();
        };
    });
}

async function scatterScoringCardsForPlayer(playerSummary) {
    const pos = getPositionClassByPlayerId(playerSummary.playerId);
    const rect = getPlayerAnchorRect(pos);
    if (!rect) return;

    const cards = playerSummary.scoringCards.filter(
        card => !(card.suit === 'spade' && card.value === 8)
    );
    const layer = ensureSummaryLayer().querySelector('.summary-cards-layer');

    for (const card of cards) {
        const node = createScoreCard(card);
        layer.appendChild(node);

        const baseX = rect.left + rect.width / 2;
        const baseY = rect.top + rect.height / 2;

        const spreadX = pos === 'left' || pos === 'right' ? 50 : 140;
        const spreadY = pos === 'top' || pos === 'you' || pos === 'bottom' ? 50 : 140;

        const x = baseX + rand(-spreadX, spreadX);
        const y = baseY + rand(-spreadY, spreadY);
        const rot = rand(-28, 28);

        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(0.4)`;
        node.style.opacity = '0';

        const anim = node.animate(
            [
                { transform: `translate(-50%, -50%) rotate(${rot - 18}deg) scale(0.2)`, opacity: 0 },
                { transform: `translate(-50%, -50%) rotate(${rot}deg) scale(1)`, opacity: 1 }
            ],
            {
                duration: 260,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'forwards'
            }
        );

        await anim.finished;
        await sleep(70);
    }
}

/**
 * Mostra il pigugno dopo il reveal delle prese, alla fine di ciascuna mano.
 * @param {*} card 
 * @param {*} playerId 
 */
async function showPigugnoCenter(card, playerId) {
    const pos = getPositionClassByPlayerId(playerId);
    const rect = getPlayerAnchorRect(pos);

    const layer = ensureSummaryLayer().querySelector('.summary-cards-layer');
    const node = createScoreCard(card, 'pigugno-center');
    layer.appendChild(node);

    // Ancora sopra la zona prese del vincitore, con offset casuale minimo
    const anchorX = rect ? rect.left + rect.width / 2 + rand(-40, 40) : window.innerWidth / 2;
    const anchorY = rect ? rect.top + rect.height / 2 + rand(-30, 30) : window.innerHeight / 2;

    node.style.left = `${anchorX}px`;
    node.style.top = `${anchorY}px`;
    node.style.opacity = '0';

    // Rotazione finale casuale ±30°
    const finalRot = rand(-30, 30);
    // Rotazione iniziale leggermente diversa per dare movimento
    const startRot = finalRot + rand(-15, 15);

    node.style.transform = `translate(-50%, -50%) scale(3.5) rotate(${startRot}deg)`;

    const anim = node.animate(
        [
            { transform: `translate(-50%, -50%) scale(3.5) rotate(${startRot}deg)`, opacity: 0, offset: 0 },
            { transform: `translate(-50%, -50%) scale(3.8) rotate(${startRot}deg)`, opacity: 1, offset: 0.08 },
            { transform: `translate(-50%, -50%) scale(1.1) rotate(${finalRot}deg)`, opacity: 1, offset: 0.80 },
            { transform: `translate(-50%, -50%) scale(1.0) rotate(${finalRot}deg)`, opacity: 1, offset: 1 },
        ],
        {
            duration: 900,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards',
        }
    );

    await anim.finished;
}

async function animatePlayerPoints(playerSummary) {
    const overlay = ensureSummaryLayer();
    const pos = getPositionClassByPlayerId(playerSummary.playerId);
    const area = overlay.querySelector(`.summary-score.${pos}`);
    if (!area) return;

    area.classList.add('visible');

    const pointsEl = area.querySelector('.summary-points-value');
    pointsEl.textContent = '0';

    await countUp(pointsEl, playerSummary.points, 900);
}

async function animatePlayerBusche(playerSummary) {
    const overlay = ensureSummaryLayer();
    const pos = getPositionClassByPlayerId(playerSummary.playerId);
    const area = overlay.querySelector(`.summary-score.${pos}`);
    if (!area) return;

    area.classList.add('visible');

    const buscheEl = area.querySelector('.summary-busche');
    buscheEl.innerHTML = '';

    for (let i = 0; i < playerSummary.buscheEarned; i++) {
        await sleep(750);

        const dot = document.createElement('span');
        dot.className = 'busca-dot';
        dot.textContent = '●';
        buscheEl.appendChild(dot);

        const anim = dot.animate(
            [
                { transform: 'scale(0.2)', opacity: 0 },
                { transform: 'scale(1.35)', opacity: 1, offset: 0.7 },
                { transform: 'scale(1)', opacity: 1, offset: 1 }
            ],
            {
                duration: 280,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'forwards'
            }
        );

        await anim.finished;
    }
}


async function countUp(el, target, duration = 1000) {
    if (target <= 0) {
        el.textContent = '0';
        return;
    }

    const start = performance.now();

    return new Promise(resolve => {
        function tick(now) {
            const progress = Math.min(1, (now - start) / duration);
            const value = Math.max(0, Math.floor(progress * target));
            el.textContent = String(value);

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                el.textContent = String(target);
                resolve();
            }
        }
        requestAnimationFrame(tick);
    });
}

function getOrderedPlayersFromStartingPlayer(summary) {
    const ids = summary.players.map(p => p.playerId);
    const startIndex = ids.indexOf(summary.startingPlayerId);
    if (startIndex === -1) return summary.players;

    return [
        ...summary.players.slice(startIndex),
        ...summary.players.slice(0, startIndex)
    ];
}

function ensureSummaryLayer() {
    let layer = document.querySelector('.hand-summary-overlay');
    if (layer) return layer;

    layer = document.createElement('div');
    layer.className = 'hand-summary-overlay';
    layer.innerHTML = `
    <div class="summary-cards-layer"></div>

    <div class="summary-score top">
      <div class="summary-points-value">0</div>
      <div class="summary-busche"></div>
    </div>

    <div class="summary-score left">
      <div class="summary-points-value">0</div>
      <div class="summary-busche"></div>
    </div>

    <div class="summary-score right">
      <div class="summary-points-value">0</div>
      <div class="summary-busche"></div>
    </div>

    <div class="summary-score you">
      <div class="summary-points-value">0</div>
      <div class="summary-busche"></div>
    </div>

    <button class="next-hand-button" hidden>Prossima mano</button>
  `;

    document.body.appendChild(layer);
    return layer;
}

export function clearHandSummaryOverlay() {
    const layer = document.querySelector('.hand-summary-overlay');
    if (!layer) return;
    layer.remove();
}