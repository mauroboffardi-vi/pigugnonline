// @ts-check
// src/game/single.js
/** @import { Player, TrickEntry } from "../../domain/domain-types.js" */
/** @import { HandSummary } from "../../ui/ui-types.js" */
import { Card } from '../../domain/cards/Card.js';
import { GameState } from '../../domain/game/GameState.js';
import { pickRandomNames } from '../../domain/players/player-names.js';
import ComputerPlayer from '../../domain/players/ComputerPlayer.js';
import { showCaptureOverlay, closeCaptureOverlay } from '../../ui/overlays/CaptureOverlay.js';
import { GameOverOverlay } from '../../ui/overlays/GameOverOverlay.js';
import { animatePlayCard, animateTrickResolution } from '../../ui/animations/table-animation.js';
import { animateHandSummary, clearHandSummaryOverlay } from '../../ui/animations/score-animation.js';
import BuscheTracker from '../../ui/BuscheTracker.js';

/**
 *  Questo associa il nome del container delle areee di gioco ai giocatori 0-3
 */
/** @type {Record<number, string} */
const PLAYER_CONTAINER_IDS = Object.freeze({
  0: 'player-you',
  1: 'player-left',
  2: 'player-top',
  3: 'player-right',
});

/**
 * @param {Card} card
 * @param {{ faceUp?: boolean, extraClass?: string }} [options={}]
 */
function createCardMarkup(card, options = {}) {
  const {
    faceUp = true,
    extraClass = '',
  } = options;

  const visibleSrc = faceUp ? card.imagePath : card.imageBackPath;
  const classes = ['card-image', 'small'];
  if (extraClass) classes.push(extraClass);
  if (!faceUp) classes.push('is-face-down');

  return `
    <div class="card-item">
      <img
        class="${classes.join(' ')}"
        src="${visibleSrc}"
        alt="${faceUp ? `${card.value} di ${card.suit}` : 'Carta coperta'}"
        data-card-id="${card.id}"
        data-card-suit="${card.suit}"
        data-card-value="${card.value}"
        data-face-src="${card.imagePath}"
        data-back-src="${card.imageBackPath}"
        data-face-up="${faceUp ? 'true' : 'false'}"
        draggable="false"
      />
    </div>
  `;
}

/* 
 * 
 *           INIZIALIZZAZIONE
 * 
 */

// Controlla se nell'URL è presente ?debug=true
const ISDEBUG = new URLSearchParams(window.location.search).get('debug') === 'true';
let DEBUG_SHOW_CPU_CARDS = ISDEBUG;
if (ISDEBUG) {
  console.info('🛠️ Modalità Debug attiva');
  const { initDebugUI } = await import('../../dev/test/test-buttons.js');
  initDebugUI();
}

const gameState = new GameState(['Io', ...pickRandomNames(3)]);
let playCounter = 0;
const cardsOnTable = new Map();

// variabili di gestione del flow
let isResolvingTrick = false;
let isAdvancingGameFlow = false;
let gameFlowVersion = 0;

const buscheNoteEl = document.getElementById('busche-note');
if (!buscheNoteEl) {
  throw new Error('Elemento #busche-note non trovato');
}

const buscheTracker = new BuscheTracker(buscheNoteEl, gameState);
const gameOverOverlay = new GameOverOverlay();
const computerPlayer = new ComputerPlayer();

/**
 * 
 * @param {Player} player 
 * @returns {boolean}
 */
function isHumanPlayer(player) {
  // 0 corrisponde al giocatore "in basso", detto anche "you"
  return player?.id === 0;
}

/**
 * 
 * @param {Player} player 
 * @returns {boolean}
 */
function shouldShowCardFace(player) {
  return isHumanPlayer(player) || DEBUG_SHOW_CPU_CARDS;
}

/**
 * 
 * @param {HTMLElement} container 
 * @param {Player} player 
 * @returns {void}
 */
function renderPlayerArea(container, player) {
  const title = player.name;
  const captureStatus = renderPlayerStatus(player);
  const cardsMarkup = player.hand
    .map(card => createCardMarkup(card, { faceUp: shouldShowCardFace(player) }))
    .join('');

  container.dataset.playerId = player.id.toString();
  container.innerHTML = `
    <div class="player-meta">
      <span class="player-name">${title}</span>
      <span class="player-status">${captureStatus}</span>
    </div>
    <div class="player-hand">${cardsMarkup}</div>
  `;
}

/**
 * 
 * @param {GameState} state 
 * @returns {void}
 */
function renderBoard(state) {
  state.players.forEach((player) => {
    const container = getContainerByPlayerId(player.id);
    if (container) {
      renderPlayerArea(container, player);
    }
  });

  /** @type {HTMLElement | null} */
  const center = document.getElementById('table-center');
  if (center != null) {
    let playArea = center.querySelector('.play-area');

    if (!playArea) {
      playArea = document.createElement('div');
      playArea.className = 'play-area';
      playArea.innerHTML = '&nbsp;';
      center.appendChild(playArea);
    }
  }
}

/**
 * identifica il player a seconda della playerid associato alla carta cliccata
 * @param {HTMLDivElement} container 
 * @returns {Player | undefined}
 */
function getPlayerByContainer(container) {
  const pid = container?.dataset?.playerId;
  return gameState.players.find((p) => String(p.id) === String(pid));
}

/**
* funzione che gioca una carta, animandola sullo schermo,
* a prescindere che sia umana o bot
 * @param {Player} player 
 * @param {Card} card 
 * @param {HTMLImageElement} img 
 * @param {HTMLElement} container 
 * @param {number} flowVersion 
 * @returns {Promise<boolean>}
 */
async function playCardWithAnimation(player, card, img, container, flowVersion = getCurrentGameFlowVersion()) {
  if (!player || !card || !img || !container) return false;
  if (isStaleFlow(flowVersion)) return false;
  if (gameState.phase !== 'playing') return false;
  if (gameState.currentTurn !== player.id) return false;
  if (!gameState.canPlayCard(card, player.id)) return false;

  const center = document.getElementById('table-center');
  if (!center) return false;

  let playApplied = false;

  /** @type {string | null} */
  const revealSrc =
    img.dataset.faceUp === 'true'
      ? null
      : (img.dataset.faceSrc ?? null);

  const clone = await animatePlayCard(img, container, center, {
    zIndex: 1000 + playCounter,
    revealSrc,
    onPlayed: (playedClone) => {
      if (isStaleFlow(flowVersion)) {
        try { playedClone.remove(); } catch { }
        return;
      }

      const success = gameState.playCard(player.id, card.id);
      if (!success) {
        try { playedClone.remove(); } catch { }
        return;
      }

      const playedImg = playedClone.querySelector('img');
      if (playedImg instanceof HTMLImageElement) {
        playedImg.src = img.dataset.faceSrc ?? playedImg.src;
        playedImg.dataset.faceUp = 'true';
      }

      cardsOnTable.set(String(card.id), playedClone);

      const cardItem = img.closest('.card-item');
      if (cardItem) cardItem.remove();

      playCounter += 1;
      playApplied = true;
    },
  });

  if (!clone || !playApplied) {
    return false;
  }

  if (isStaleFlow(flowVersion)) {
    try { clone.remove(); } catch (_) { }
    cardsOnTable.delete(String(card.id));
    return false;
  }

  return true;
}

/**
 * 
 * funzione che gestisce il click di un umano su una carta.
 * la AI usa un'altro metodo.
 * 
 * @param {MouseEvent} e
 */
async function handleCardClick(e) {
  if (isResolvingTrick) return;
  if (isAdvancingGameFlow) return;
  if (gameState.phase !== 'playing') return;
  if (!(e.target instanceof Element)) return;

  const img = e.target.closest('.card-image');
  if (!img) return;
  if (!(img instanceof HTMLImageElement)) return;

  const cardId = img.dataset.cardId;
  if (!cardId) return;

  /** @type {HTMLDivElement | null} */
  const container = /** @type {HTMLDivElement | null} */ (img.closest('.player-area'));
  if (!container) return;
  const player = getPlayerByContainer(container);

  if (!player || player.isComputer) return;
  if (player.id !== gameState.currentTurn) {
    console.debug('click ignorato: non è il tuo turno');
    return;
  }

  const card = player.hand.find((c) => String(c.id) === String(cardId));
  if (!card) return;

  const flowVersion = getCurrentGameFlowVersion();
  const played = await playCardWithAnimation(player, card, img, container, flowVersion);
  if (!played) return;

  await continueGameFlow();
}

/** 
 * funzione che gioca il turno del computer.
 * @param {number} flowVersion
 * @returns {Promise<boolean>}
 */
async function playComputerTurn(flowVersion) {
  if (isStaleFlow(flowVersion)) return false;
  if (gameState.phase !== 'playing') return false;

  const player = gameState.getCurrentPlayer();
  if (!player || !player.isComputer) return false;

  const card = computerPlayer.chooseCard(gameState, player.id, ISDEBUG);
  if (!card) {
    console.error(`ComputerPlayer non ha scelto alcuna carta per ${player.name}`);
    return false;
  }


  const container = getContainerByPlayerId(player.id);
  if (!container) {
    console.error(`Container non trovato per il player ${player.id}`);
    return false;
  }

  /** @type {HTMLImageElement | null } */
  const img = container.querySelector(`[data-card-id="${card.id}"]`);
  if (!img) {
    console.error(`Immagine carta non trovata nel DOM per cardId=${card.id}`);
    return false;
  }

  return playCardWithAnimation(player, card, img, container, flowVersion);
}

async function continueGameFlow() {
  if (isAdvancingGameFlow) return;
  if (gameState.phase !== 'playing') return;

  isAdvancingGameFlow = true;
  const flowVersion = getCurrentGameFlowVersion();

  try {
    while (true) {
      if (isStaleFlow(flowVersion)) return;
      if (gameState.phase !== 'playing') return;
      if (isResolvingTrick) return;

      const currentPlayer = gameState.getCurrentPlayer();
      if (!currentPlayer || !currentPlayer.isComputer) return;

      await sleep(500);

      if (isStaleFlow(flowVersion)) return;
      if (gameState.phase !== 'playing') return;
      if (isResolvingTrick) return;
      if (gameState.getCurrentPlayer()?.id !== currentPlayer.id) continue;

      const played = await playComputerTurn(flowVersion);
      if (!played) return;

      if (isStaleFlow(flowVersion)) return;
      if (gameState.phase !== 'playing') return;

      await sleep(120);
    }
  } finally {
    isAdvancingGameFlow = false;
  }
}

/**
 * 
 * @param {number} winnerId 
 * @param {TrickEntry[]} resolvedTrick 
 */
async function onTrickResolved(winnerId, resolvedTrick) {
  isResolvingTrick = true;
  nextGameFlowVersion();

  /** @type {HTMLDivElement | null } */
  const center = /** @type {HTMLDivElement | null} */ (document.getElementById('table-center'));
  if (!center) return;
  await animateTrickResolution(center, resolvedTrick, winnerId, cardsOnTable);

  resolvedTrick.forEach(({ card }) => {
    cardsOnTable.delete(String(card.id));
  });

  playCounter = 0;
  refreshPlayerStatuses();

  isResolvingTrick = false;
  await continueGameFlow();
}

/**
 * @param {Player} player 
 * @returns {void}
 */
function openCaptureOverlay(player) {
  const capturedCards = gameState.getCapturedCards(player);
  showCaptureOverlay(capturedCards);
}

/**
 * @returns {void}
 */
function refreshPlayerStatuses() {
  gameState.players.forEach((player) => {
    const container = getContainerByPlayerId(player.id);
    if (!container) return;

    const statusEl = container.querySelector('.player-status');
    if (!statusEl) return;

    statusEl.innerHTML = renderPlayerStatus(player);
  });
}

/**
 * 
 * @param {Player} player 
 * @returns {string}
 */
function renderPlayerStatus(player) {
  const baseStatus = gameState.getPlayerCaptureStatus(player, 0);
  const capturesCount = Math.floor(player.captures.length / gameState.players.length);
  const canPeek = player.id === 0 && capturesCount > 0;

  if (!canPeek) return baseStatus;

  return `${baseStatus} (<a href="#" class="view-captures-link">guarda</a>)`;
}

/**
 * 
 * @param {HandSummary} summary
 * @returns {Promise<void>}
 */
async function syncBuscheTrackerFromState(summary) {
  if (summary) {
    buscheTracker.setPlayersByState(gameState);
  }
}

/**
 * 
 * @param {HandSummary} summary 
 * @returns 
 */
async function handleHandEnded(summary) {
  nextGameFlowVersion();

  const playerOrder = gameState
    .getPlayersInTurnOrder(summary.lastTrickWinnerId)
    .map((player) => player.id);

  await animateHandSummary(summary, gameState, buscheTracker, {
    playerOrder,
  });

  clearHandSummaryOverlay();

  refreshPlayerStatuses();

  const gameOverState = gameState.computeGameOverState();

  if (gameOverState.isGameOver) {
    gameState.gameOverState = gameOverState;
    gameOverOverlay.show(gameOverState, () => {
      window.location.href = '../../index.html';
    });
    return;
  }

  const ok = gameState.startNextHand();
  if (!ok) return;

  cardsOnTable.forEach((clone) => {
    try { clone.remove(); } catch (_) { }
  });
  cardsOnTable.clear();

  closeCaptureOverlay();
  playCounter = 0;
  isResolvingTrick = false;

  renderBoard(gameState);

  nextGameFlowVersion();
  await continueGameFlow();
}

/**
 * Restituisce il contenitore grafico assegnato al giocatore.
 * Non determina né modifica l'ordine dei turni.
 *
 * @param {number} playerId
 * @returns {HTMLElement | null}
 */
function getContainerByPlayerId(playerId) {
  const containerId = PLAYER_CONTAINER_IDS[playerId];
  return containerId ? document.getElementById(containerId) : null;
}

/** * 
 * @param {number} ms 
 * @returns 
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @returns {number}
 */
function nextGameFlowVersion() {
  gameFlowVersion += 1;
  return gameFlowVersion;
}

/**
 * @returns {number}
 */
function getCurrentGameFlowVersion() {
  return gameFlowVersion;
}

/**
 * @param {number} version
 * @returns {boolean}
 */
function isStaleFlow(version) {
  return version !== gameFlowVersion;
}

/**
 * @returns {Promise<void>}
 */
async function bootstrapGame() {
  nextGameFlowVersion();
  gameState.startGame();
  renderBoard(gameState);
  await continueGameFlow();
}



/** 
 *            FINE DELLE FUNZIONI! 
 *       QUI PARTE IL CODICE CHE VIENE ESEGUITO QUANDO LO SCRIPT É CARICATO
 */

gameState.onTrickResolved = onTrickResolved;
gameState.onHandEnded = handleHandEnded;
document.addEventListener('click', handleCardClick);
document.addEventListener('click', (e) => {
  if (!(e.target instanceof Element)) return;

  const link = e.target.closest('.view-captures-link');
  if (!link) return;

  e.preventDefault();
  openCaptureOverlay(gameState.players[0]);
});

bootstrapGame();

/*
 * Hook per bottoni di test
 */
/** @type {any} */ (window).__PIGUGNO_TEST_API__ = {
  getGameState: () => gameState,
  rerender: () => renderBoard(gameState),
  syncBuscheTrackerFromState,
  getDebugShowCpuCards: () => DEBUG_SHOW_CPU_CARDS,
  toggleDebugShowCpuCards: () => {
    DEBUG_SHOW_CPU_CARDS = !DEBUG_SHOW_CPU_CARDS;
    renderBoard(gameState);
    return DEBUG_SHOW_CPU_CARDS;
  },
};
