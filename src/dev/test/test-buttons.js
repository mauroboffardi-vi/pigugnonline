import { Card } from "../../domain/cards/Card.js";
import { GameState } from "../../domain/game/GameState.js";
/** @import {CardAllocations, RerenderFn} from '../../domain/domain-types.js' */
/** @import {TestApi} from '../../ui/ui-types.js' */


/** @returns {TestApi | null} */
function getApi() {
    return /** @type {any} */ (window).__PIGUGNO_TEST_API__ || null;
}

/**
 * @param {HTMLElement | null} button
 * @param {boolean} enabled
 * @returns {void}
 */
function updateDebugButtonState(button, enabled) {
    if (!button) return;
    button.dataset.debugEnabled = enabled ? 'true' : 'false';
    button.textContent = enabled
        ? 'Debug carte CPU: ON'
        : 'Debug carte CPU: OFF';
}

/**
 * @returns {{ api: TestApi, gameState: GameState }}
 */
function getGameStateOrThrow() {
    const api = getApi();

    if (!api || typeof api.getGameState !== 'function') {
        throw new Error('Test API non disponibile');
    }

    const gameState = api.getGameState();

    if (!gameState) {
        throw new Error('GameState non disponibile');
    }

    return { api, gameState };
}

/**
 * @param {GameState} gameState
 * @returns {Card[]}
 */
function flattenCards(gameState) {
    const cards = [];

    if (Array.isArray(gameState.deck?.cards)) {
        cards.push(...gameState.deck.cards);
    }

    for (const player of gameState.players) {
        if (Array.isArray(player.hand)) cards.push(...player.hand);
        if (Array.isArray(player.captures)) cards.push(...player.captures);
    }

    for (const entry of gameState.trick) {
        if (entry?.card) cards.push(entry.card);
    }

    return cards;
}

/**
 * @param {GameState} gameState
 * @returns {void}
 */
function resetHandState(gameState) {
    gameState.phase = 'playing';
    gameState.trick = [];
    gameState.isFirstTrick = false;
    gameState.lastHandSummary = null;

    for (const player of gameState.players) {
        player.hand = [];
        player.captures = [];
        player.capturedTricks = 0;
        player.pointsThisHand = 0;
        player.buscheThisHand = 0;
    }

    if (gameState.deck?.cards) {
        gameState.deck.cards = [];
    }
}

/**
 * 
 * @param {Card[]} cards 
 * @param {number} playersCount 
 * @returns {Card[][]}
 */
function splitIntoTricks(cards, playersCount = 4) {
    const tricks = [];

    for (let i = 0; i < cards.length; i += playersCount) {
        const group = cards.slice(i, i + playersCount);
        if (group.length > 0) {
            tricks.push(group);
        }
    }

    return tricks;
}
/**
 * 
 * @param {GameState} gameState 
 * @param {CardAllocations} allocations
 * @param {number} lastHandWinnerId 
 */
function assignCardsAndTricks(gameState, allocations, lastHandWinnerId) {
    for (const player of gameState.players) {
        player.captures = allocations[player.id] ? [...allocations[player.id]] : [];
        player.hand = [];
        player.capturedTricks = Math.floor(player.captures.length / gameState.players.length);
    }

    if (gameState.deck?.cards) {
        gameState.deck.cards = [];
    }

    gameState.trick = [];
    gameState.isFirstTrick = false;
    gameState.phase = 'hand-ended';
    gameState.lastHandWinnerId = lastHandWinnerId;
}
/**
 * @param {Card[]} cards
 * @param {number} playersCount
 * @returns {CardAllocations}
 */
function buildBalancedAllocations(cards, playersCount = 4) {
    /** @type {CardAllocations} */
    const allocations = {};

    for (let i = 0; i < playersCount; i++) {
        allocations[i] = [];
    }

    const tricks = splitIntoTricks(cards, playersCount);

    tricks.forEach((trick, index) => {
        const winnerId = index % playersCount;
        allocations[winnerId].push(...trick);
    });

    return allocations;
}

/**
 * @param {CardAllocations} allocations
 * @returns {Card | null}
 */
function takePigugnoFromAllocations(allocations) {
    for (const playerIdKey of Object.keys(allocations)) {
        const playerId = Number(playerIdKey);
        const index = allocations[playerId].findIndex(
            /** @param {Card} card */
            card => card.suit === 'spade' && card.value === 8
        );

        if (index !== -1) {
            const [pigugno] = allocations[playerId].splice(index, 1);
            return pigugno;
        }
    }

    return null;
}
/**
 * 
 * @param {GameState} gameState 
 * @param {RerenderFn} rerender 
 */
async function finalizeForcedHand(gameState, rerender) {
    await clearHandsThenFinalize(gameState, rerender);
}
/**
 * 
 * @param {GameState} gameState 
 * @param {RerenderFn} rerender 
 */
async function presetNormal(gameState, rerender) {
    const cards = flattenCards(gameState);
    resetHandState(gameState);

    const allocations = buildBalancedAllocations(cards, gameState.players.length);
    assignCardsAndTricks(gameState, allocations, 0);
    await finalizeForcedHand(gameState, rerender);
}
/**
 * 
 * @param {GameState} gameState 
 * @param {RerenderFn} rerender 
 */
async function presetPigugnoYou(gameState, rerender) {
    const cards = flattenCards(gameState);
    resetHandState(gameState);

    const allocations = buildBalancedAllocations(cards, gameState.players.length);
    const pigugno = takePigugnoFromAllocations(allocations);

    if (pigugno) {
        allocations[0].push(pigugno);
    }

    assignCardsAndTricks(gameState, allocations, 0);
    await finalizeForcedHand(gameState, rerender);
}

/**
 * 
 * @param {GameState} gameState 
 * @param {RerenderFn} rerender 
 */
async function presetNoCaptureYou(gameState, rerender) {
    const cards = flattenCards(gameState);
    resetHandState(gameState);

    /** @type {CardAllocations} */
    const allocations = {
        0: [],
        1: [],
        2: [],
        3: [],
    };

    const tricks = splitIntoTricks(cards, gameState.players.length);
    const winnersCycle = [1, 2, 3];

    tricks.forEach((trick, index) => {

        const winnerId = winnersCycle[index % winnersCycle.length];
        allocations[winnerId].push(...trick);
    });

    assignCardsAndTricks(gameState, allocations, 1);
    await finalizeForcedHand(gameState, rerender);
}

/**
 * 
 * @param {GameState} gameState 
 * @param {RerenderFn} rerender 
 */
async function presetTenTricksLeft(gameState, rerender) {
    const cards = flattenCards(gameState);
    resetHandState(gameState);

    const allocations = {
        0: [],
        1: [...cards],
        2: [],
        3: [],
    };

    assignCardsAndTricks(gameState, allocations, 1);
    await finalizeForcedHand(gameState, rerender);
}

/**
 * 
 * @param {string} preset
 * @returns {Promise<void>} 
 */
async function runPreset(preset) {
    const { api, gameState } = getGameStateOrThrow();
    const rerender = api.rerender;
    if (rerender == null) {
        console.warn('api.renderer is null');
        return;
    }

    switch (preset) {
        case 'normal':
            await presetNormal(gameState, rerender);
            break;
        case 'pigugno-you':
            await presetPigugnoYou(gameState, rerender);
            break;
        case 'no-capture-you':
            await presetNoCaptureYou(gameState, rerender);
            break;
        case 'two-no-capture':
            await presetTwoNoCapture(gameState, rerender);
            break;
        case 'ten-tricks-left':
            await presetTenTricksLeft(gameState, rerender);
            break;
        default:
            console.warn('Preset di test sconosciuto:', preset);
    }
}

/**
 * @param {GameState} gameState 
 * @param {RerenderFn} rerender 
 */
function presetTwoNoCapture(gameState, rerender) {
    const cards = flattenCards(gameState);
    resetHandState(gameState);

    /** @type {CardAllocations} */
    const allocations = {
        0: [],
        1: [],
        2: [],
        3: [],
    };

    const tricks = splitIntoTricks(cards, gameState.players.length);

    // Solo due giocatori coprono: left(1) e top(2)
    tricks.forEach((trick, index) => {
        const winnerId = index % 2 === 0 ? 1 : 2;
        allocations[winnerId].push(...trick);
    });

    // Ultima presa a top
    const lastWinnerId = 2;

    assignCardsAndTricks(gameState, allocations, lastWinnerId);
    finalizeForcedHand(gameState, rerender);
}

/**
 * @returns {Promise<void>}
 */
function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

/** 
 * @param {GameState} gameState 
 * @param {RerenderFn| undefined} rerender 
 */
async function clearHandsThenFinalize(gameState, rerender) {
    for (const player of gameState.players) {
        player.hand = [];
    }

    if (typeof rerender === 'function') {
        rerender();
    }

    await nextFrame();
    await nextFrame();

    gameState.finalizeHand();

    if (typeof rerender === 'function') {
        rerender();
    }
}

function wireButtons() {
    const root = document.getElementById('test-buttons');
    if (!root) {
        console.warn('Container test-buttons non trovato');
        return;
    }

    root.addEventListener('click', async (event) => {
        if (!(event.target instanceof Element)) return;

        const debugBtn = event.target.closest('[data-test-toggle-debug]');
        if (debugBtn instanceof HTMLElement) {
            const api = getApi();

            if (!api || typeof api.toggleDebugShowCpuCards !== 'function') {
                console.error('Toggle debug non disponibile nella test API');
                return;
            }

            const enabled = api.toggleDebugShowCpuCards();

            if (typeof api.rerender === 'function') {
                api.rerender();
            }

            updateDebugButtonState(debugBtn, enabled);
            return;
        }

        const btn = event.target.closest('[data-test-preset]');
        if (!(btn instanceof HTMLElement)) return;

        const preset = btn.dataset.testPreset;
        if (!preset) return;

        try {
            await runPreset(preset);
        } catch (err) {
            console.error('Errore preset test:', err);
        }
    });

    const debugBtn = root.querySelector('[data-test-toggle-debug]');
    const api = getApi();
    const enabled = api && typeof api.getDebugShowCpuCards === 'function'
        ? api.getDebugShowCpuCards()
        : false;

    updateDebugButtonState(
        debugBtn instanceof HTMLElement ? debugBtn : null,
        enabled
    );

    console.debug('Test buttons collegati');
}

/*
 *. insert DEBUG buttons in the body 
 *
 */
export function initDebugUI() {
    // Crea il wrapper dei bottoni di debug
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.innerHTML = `
    <div id="test-buttons"
        style="position:fixed;top:12px;right:12px;z-index:99999;display:flex;flex-direction:column;gap:8px;">
        <button type="button" data-test-preset="normal">TEST normale</button>
        <button type="button" data-test-preset="pigugno-you">TEST pigugno tu</button>
        <button type="button" data-test-preset="no-capture-you">TEST tu senza prese</button>
        <button type="button" data-test-preset="ten-tricks-left">TEST 10 prese sinistra</button>
        <button type="button" data-test-preset="two-no-capture">TEST due senza prese</button>
        <button type="button" data-test-toggle-debug> Debug carte CPU: OFF </button>
    </div>
  `;

    // Inserisce il pannello all'inizio del <body>
    document.body.prepend(debugPanel);

    wireButtons();
}

