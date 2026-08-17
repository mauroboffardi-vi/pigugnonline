/**
 * Animazione dei punteggi fine mano e fine partita
 *  
 */
/** @typedef {import('../ui-types').HandSummary} HandSummary */
/** @typedef {import('../ui-types').HandSummaryPlayer} HandSummaryPlayer */
/** @typedef {import('../../domain/cards/Card').Card} Card */

import { GameState } from "../../domain/game/GameState.js";
import BuscheTracker from "../BuscheTracker.js";

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
 * @param {number} ms 
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
* @param {"top" | "left" | "right" | "you" | "bottom"} positionClass
* @returns {DOMRect | null}
*/
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

/**
 * @param {Card} card
 * @param {string} [className]
 * @returns {HTMLDivElement}
 */
function createScoreCard(card, className = '') {
    const el = document.createElement('div');
    el.className = `summary-card ${className}`.trim();
    el.dataset.cardId = card.id.toString();

    const src = card.imagePath;
    el.innerHTML = `<img src="${src}" alt="${card.value} di ${card.suit}">`;

    return el;
}
/**
 * @param {number} playerId
 * @returns {"you" | "left" | "top" | "right"}
 */
function getPositionClassByPlayerId(playerId) {
    switch (playerId) {
        case 0: return 'you';
        case 1: return 'left';
        case 2: return 'top';
        case 3: return 'right';
        default: return 'you';
    }
}

/**
 * @param {HandSummary} summary
 * @param {GameState} gameState
 * @param {BuscheTracker} buscheTracker
 * @param {{ playerOrder?: number[] }} [options]
 * @returns {Promise<void>}
 */
export async function animateHandSummary(
    summary,
    gameState,
    buscheTracker,
    { playerOrder = [] } = {}
) {
    const overlay = ensureSummaryLayer();
    overlay.classList.add('visible');

    const cardsLayer = overlay.querySelector('.summary-cards-layer');
    if (cardsLayer) {
        cardsLayer.innerHTML = '';
    }

    overlay.querySelectorAll('.summary-score').forEach((el) => {
        el.classList.remove('visible');

        const pointsValue = el.querySelector('.summary-points-value');
        if (pointsValue) {
            pointsValue.textContent = '';
        }

        const buscheEl = el.querySelector('.summary-busche');
        if (buscheEl) {
            buscheEl.innerHTML = '';
        }
    });

    const summaryByPlayerId = new Map(
        summary.players.map((playerSummary) => [
            playerSummary.playerId,
            playerSummary,
        ])
    );

    const orderedPlayers = playerOrder.length > 0
        ? playerOrder
            .map((playerId) => summaryByPlayerId.get(playerId))
            .filter(isDefined)
        : getOrderedPlayersFromStartingPlayer(summary);

    const everyoneCovered = summary.players.every(
        (playerSummary) => playerSummary.tricks > 0
    );

    for (const playerSummary of orderedPlayers) {
        await scatterScoringCardsForPlayer(playerSummary, everyoneCovered);
        await sleep(180);
    }

    if (everyoneCovered && summary.pigugnoWinnerId != null) {
        await sleep(rand(500, 1500));

        const pigugnoOwner = summaryByPlayerId.get(summary.pigugnoWinnerId);
        const pigugnoCard = pigugnoOwner?.captures.find(
            (card) => card.suit === 'spade' && card.value === 8
        );

        if (pigugnoCard) {
            await showPigugnoCenter(pigugnoCard, summary.pigugnoWinnerId);
        }
    }

    if (everyoneCovered) {
        for (const playerSummary of orderedPlayers) {
            await animatePlayerPoints(playerSummary);
        }

        await sleep(400);
    }

    await animatePlayerBusche(
        summary,
        gameState,
        buscheTracker,
        { orderedPlayers }
    );

    await sleep(500);
}

/**
 * Type guard: rimuove null e undefined preservando il tipo.
 *
 * @template T
 * @param {T | null | undefined} value
 * @returns {value is T}
 */
function isDefined(value) {
    return value != null;
}

/**
 * @param {HandSummaryPlayer} playerSummary
 * @param {boolean} everyoneCovered
 * @returns {Promise<void>}
 */
async function scatterScoringCardsForPlayer(playerSummary, everyoneCovered) {
    const pos = getPositionClassByPlayerId(playerSummary.playerId);
    const rect = getPlayerAnchorRect(pos);
    if (!rect) return;

    const cards = playerSummary.scoringCards.filter(
        card => !card.isPigugno()
    );
    /** @type {HTMLDivElement | null} */
    const layer = ensureSummaryLayer().querySelector('.summary-cards-layer');
    if (layer == null) {
        return;
    }

    for (const card of cards) {
        const node = createScoreCard(card);
        layer.appendChild(node);

        const baseX = rect.left + rect.width / 2;
        const baseY = rect.top + rect.height / 2;

        const spreadX = pos === 'left' || pos === 'right' ? 50 : 140;
        const spreadY = pos === 'top' || pos === 'you' ? 50 : 140;

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
 * @param {Card} card 
 * @param {number} playerId 
 */
async function showPigugnoCenter(card, playerId) {
    const pos = getPositionClassByPlayerId(playerId);
    const rect = getPlayerAnchorRect(pos);

    /** @type {HTMLDivElement | null} */
    const layer = ensureSummaryLayer().querySelector('.summary-cards-layer');
    const node = createScoreCard(card, 'pigugno-center');
    if (layer != null) {
        layer.appendChild(node);
    }

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

/**
 * @param {HandSummaryPlayer} playerSummary
 * @returns {Promise<void>}
 */
async function animatePlayerPoints(playerSummary) {
    const overlay = ensureSummaryLayer();
    const pos = getPositionClassByPlayerId(playerSummary.playerId);
    /** @type {HTMLDivElement | null} */
    const area = overlay.querySelector(`.summary-score.${pos}`);
    if (!area) return;

    area.classList.add('visible');

    /** @type {HTMLDivElement | null} */
    const pointsEl = area.querySelector('.summary-points-value');
    if (!pointsEl) return;

    // se non ha punti, non mostrare niente. Altrimenti parti da 0 e poi incerementa
    if (playerSummary.points == 0) {
        pointsEl.textContent = '';
    } else {
        pointsEl.textContent = '0';
    }

    await countUp(pointsEl, playerSummary.points, 900);
}


/**
 * Anima l'assegnazione delle busche nell'ordine di gioco ricevuto.
 *
 * @param {HandSummary} summary
 * @param {GameState} gameState
 * @param {BuscheTracker} buscheTracker
 * @param {{ orderedPlayers?: HandSummaryPlayer[] }} [options]
 * @returns {Promise<void>}
 */
async function animatePlayerBusche(
    summary,
    gameState,
    buscheTracker,
    { orderedPlayers = summary.players } = {}
) {
    if (!summary || !buscheTracker) return;

    const increments = orderedPlayers
        .map((playerSummary) => ({
            playerId: playerSummary.playerId,
            previous: playerSummary.buscheBeforeHand ?? 0,
            total: playerSummary.buscheAfterHand ?? 0,
            gained: playerSummary.buscheEarned ?? 0,
        }))
        .filter((entry) => entry.gained > 0);

    if (!increments.length) {
        if (gameState) {
            buscheTracker.setPlayersByState(gameState);
        }
        return;
    }

    // Porta tutti i giocatori coinvolti al valore precedente alla mano,
    // prima di iniziare l'animazione degli incrementi.
    for (const { playerId, previous } of increments) {
        buscheTracker.setPlayerBusche(playerId, previous);
    }

    // L'ordine di `increments` coincide ora con `orderedPlayers`.
    for (const { playerId, previous, total } of increments) {
        const previousVisible = Math.min(previous, 10);
        const nextVisible = Math.min(total, 10);

        for (
            let value = previousVisible + 1;
            value <= nextVisible;
            value += 1
        ) {
            buscheTracker.setPlayerBusche(playerId, value);
            buscheTracker.markBusca(playerId, value);
            await sleep(750);
        }
    }

    // Utile per riallineare eventuali giocatori senza incremento
    // e assicurare che il tracker rifletta sempre GameState.
    if (gameState) {
        buscheTracker.setPlayersByState(gameState);
    }
}

/**
 * @param {HTMLElement} el
 * @param {number} target
 * @param {number} [duration]
 * @returns {Promise<void>}
 */
async function countUp(el, target, duration = 1000) {
    if (target <= 0) {
        el.textContent = '';
        return;
    }

    const start = performance.now();

    return new Promise(resolve => {
        /**
         * @param {number} now
        */
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

/**
 * @param {HandSummary} summary
 * @returns {HandSummaryPlayer[]}
 */
function getOrderedPlayersFromStartingPlayer(summary) {
    const ids = summary.players.map(p => p.playerId);
    const startIndex = ids.indexOf(summary.startingPlayerId);
    if (startIndex === -1) return summary.players;

    return [
        ...summary.players.slice(startIndex),
        ...summary.players.slice(0, startIndex)
    ];
}
/**
 * @returns {HTMLDivElement}
 */
function ensureSummaryLayer() {
    /** @type {HTMLDivElement | null} */
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

/**
 * @returns {void}
 */
export function clearHandSummaryOverlay() {
    const layer = document.querySelector('.hand-summary-overlay');
    if (!layer) return;
    layer.remove();
}

