function getApi() {
    return window.__PIGUGNO_TEST_API__ || null;
}

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

function buildBalancedAllocations(cards, playersCount = 4) {
    const allocations = Object.fromEntries(
        Array.from({ length: playersCount }, (_, i) => [i, []])
    );

    const tricks = splitIntoTricks(cards, playersCount);

    tricks.forEach((trick, index) => {
        const winnerId = index % playersCount;
        allocations[winnerId].push(...trick);
    });

    return allocations;
}

function takePigugnoFromAllocations(allocations) {
    for (const playerId of Object.keys(allocations)) {
        const index = allocations[playerId].findIndex(
            card => card.suit === 'spade' && card.value === 8
        );

        if (index !== -1) {
            const [pigugno] = allocations[playerId].splice(index, 1);
            return pigugno;
        }
    }

    return null;
}

function finalizeForcedHand(gameState, rerender) {
    gameState.finalizeHand();

    if (typeof rerender === 'function') {
        rerender();
    }
}

function presetNormal(gameState, rerender) {
    const cards = flattenCards(gameState);
    resetHandState(gameState);

    const allocations = buildBalancedAllocations(cards, gameState.players.length);
    assignCardsAndTricks(gameState, allocations, 0);
    finalizeForcedHand(gameState, rerender);
}

function presetPigugnoYou(gameState, rerender) {
    const cards = flattenCards(gameState);
    resetHandState(gameState);

    const allocations = buildBalancedAllocations(cards, gameState.players.length);
    const pigugno = takePigugnoFromAllocations(allocations);

    if (pigugno) {
        allocations[0].push(pigugno);
    }

    assignCardsAndTricks(gameState, allocations, 0);
    finalizeForcedHand(gameState, rerender);
}

function presetNoCaptureYou(gameState, rerender) {
    const cards = flattenCards(gameState);
    resetHandState(gameState);

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
    finalizeForcedHand(gameState, rerender);
}

function presetTenTricksLeft(gameState, rerender) {
    const cards = flattenCards(gameState);
    resetHandState(gameState);

    const allocations = {
        0: [],
        1: [...cards],
        2: [],
        3: [],
    };

    assignCardsAndTricks(gameState, allocations, 1);
    finalizeForcedHand(gameState, rerender);
}

function runPreset(preset) {
    const { api, gameState } = getGameStateOrThrow();
    const rerender = api.rerender;

    switch (preset) {
        case 'normal':
            presetNormal(gameState, rerender);
            break;
        case 'pigugno-you':
            presetPigugnoYou(gameState, rerender);
            break;
        case 'no-capture-you':
            presetNoCaptureYou(gameState, rerender);
            break;
        case 'ten-tricks-left':
            presetTenTricksLeft(gameState, rerender);
            break;
        default:
            console.warn('Preset di test sconosciuto:', preset);
    }
}

function wireButtons() {
    const root = document.getElementById('test-buttons');
    if (!root) {
        console.warn('Container test-buttons non trovato');
        return;
    }

    root.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-test-preset]');
        if (!btn) return;

        const preset = btn.dataset.testPreset;

        try {
            runPreset(preset);
        } catch (err) {
            console.error('Errore preset test:', err);
        }
    });

    console.debug('Test buttons collegati');
}

wireButtons();