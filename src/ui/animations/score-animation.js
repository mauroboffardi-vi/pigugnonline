/**
 * Animazione dei punteggi fine mano e fine partita
 *  
 */

function rand(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

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

export async function animateHandSummary(summary, gameState, buscheTracker) {
    const overlay = ensureSummaryLayer();
    overlay.classList.add('visible');

    overlay.querySelector('.summary-cards-layer').innerHTML = '';
    overlay.querySelectorAll('.summary-score').forEach((el) => {
        el.classList.remove('visible');
        el.querySelector('.summary-points-value').textContent = '';
        el.querySelector('.summary-busche').innerHTML = '';
    });

    const everyoneCovered = summary.players.every(p => p.tricks > 0);

    for (const playerSummary of summary.players) {
        await scatterScoringCardsForPlayer(playerSummary, everyoneCovered);
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

    // Primo giro: mostra i punti per tutti, se tutti hanno coperto
    if (everyoneCovered) {
        for (const playerSummary of orderedPlayers) {
            await animatePlayerPoints(playerSummary);
        }

        // Piccola pausa tra i due giri
        await sleep(400);
    }


    // Aggiungi i punti Busche uno alla volta
    await animatePlayerBusche(summary, gameState, buscheTracker);
    await sleep(500);
}

async function scatterScoringCardsForPlayer(playerSummary, everyoneCovered) {
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

        // mostra animazione carta per carta solo se tutti hanno coperto,
        // se no vistoche non serve contare tutti "buttano" le carte senza pausa
        if (everyoneCovered) {
            await anim.finished;
            await sleep(70);
        }
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

    // se non ha punti, non mostrare niente. Altrimenti parti da 0 e poi incerementa
    if (playerSummary.points == 0) {
        pointsEl.textContent = '';
    } else {
        pointsEl.textContent = '0';
    }

    await countUp(pointsEl, playerSummary.points, 900);
}

async function animatePlayerBusche(summary, gameState, buscheTracker) {
    if (!summary || !buscheTracker) return;

    const increments = summary.players
        .map((playerSummary) => ({
            playerId: playerSummary.playerId,
            previous: playerSummary.buscheBeforeHand ?? 0,
            total: playerSummary.buscheAfterHand ?? 0,
            gained: playerSummary.buscheEarned ?? 0,
        }))
        .filter((entry) => entry.gained > 0);

    if (!increments.length) {
        if (gameState) buscheTracker.setPlayersByState(gameState);
        return;
    }

    for (const { playerId, previous } of increments) {
        buscheTracker.setPlayerBusche(playerId, previous);
    }

    for (const { playerId, previous, total } of increments) {
        const previousVisible = Math.min(previous, 10);
        const nextVisible = Math.min(total, 10);

        for (let value = previousVisible + 1; value <= nextVisible; value += 1) {
            buscheTracker.setPlayerBusche(playerId, value);
            buscheTracker.markBusca(playerId, value);
            await sleep(750);
        }
    }
}

async function countUp(el, target, duration = 1000) {
    if (target <= 0) {
        el.textContent = '';
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
      <div class="summary-points-value"></div>
      <div class="summary-busche"></div>
    </div>

    <div class="summary-score left">
      <div class="summary-points-value"></div>
      <div class="summary-busche"></div>
    </div>

    <div class="summary-score right">
      <div class="summary-points-value"></div>
      <div class="summary-busche"></div>
    </div>

    <div class="summary-score you">
      <div class="summary-points-value"></div>
      <div class="summary-busche"></div>
    </div>
  `;

    document.body.appendChild(layer);
    return layer;
}

export function clearHandSummaryOverlay() {
    const layer = document.querySelector('.hand-summary-overlay');
    if (!layer) return;
    layer.remove();
}

