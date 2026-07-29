// src/game/single.js
import { GameState } from '../../domain/game/GameState.js';
import { pickRandomNames } from '../../domain/players/player-names.js';
import ComputerPlayer from '../../domain/players/ComputerPlayer.js';
import { showCaptureOverlay, closeCaptureOverlay } from '../../ui/overlays/CaptureOverlay.js';
import { GameOverOverlay } from '../../ui/overlays/GameOverOverlay.js';
import { animatePlayCard, animateTrickResolution } from '../../ui/animations/table-animation.js';
import { animateHandSummary, clearHandSummaryOverlay } from '../../ui/animations/score-animation.js';
import BuscheTracker from '../../ui/BuscheTracker.js';

function createCardMarkup(card) {
  return `
    <div class="card-item">
      <img
        data-card-id="${card.id}"
        class="card-image small"
        src="${card.imagePath}"
        alt="${card.value} di ${card.suit}"
      />
    </div>
  `;
}

const gameState = new GameState(['Io', ...pickRandomNames(3)]);
let playCounter = 0;
const cardsOnTable = new Map();
let isResolvingTrick = false;
const buscheTracker = new BuscheTracker(document.getElementById('busche-note'), { gameState });
const gameOverOverlay = new GameOverOverlay();
const computerPlayer = new ComputerPlayer();


function renderPlayerArea(container, player) {
  const title = player.name;
  const captureStatus = renderPlayerStatus(player);
  const cardsMarkup = player.hand.map(createCardMarkup).join('');

  container.dataset.playerId = player.id;
  container.innerHTML = `
    <div class="player-meta">
      <span class="player-name">${title}</span>
      <span class="player-status">${captureStatus}</span>
    </div>
    <div class="player-hand">${cardsMarkup}</div>
  `;
}

function renderBoard(state) {
  for (const player of state.players) {
    const container = getContainerByPlayerId(player.id);
    if (!container) continue;
    renderPlayerArea(container, player);
  }

  const center = document.getElementById('table-center');
  let playArea = center.querySelector('.play-area');

  if (!playArea) {
    playArea = document.createElement('div');
    playArea.className = 'play-area';
    playArea.innerHTML = '&nbsp;';
    center.appendChild(playArea);
  }
}

function getPlayerByContainer(container) {
  const pid = container?.dataset?.playerId;
  return gameState.players.find((p) => String(p.id) === String(pid));
}

/*
* funzione che gioca una carta, animandola sullo schermo,
* a prescindere che sia umana o bot
*/
async function playCardWithAnimation(player, card, img, container) {
  const center = document.getElementById('table-center');

  const clone = await animatePlayCard(img, container, center, {
    zIndex: 1000 + playCounter,
    onPlayed(clone) {
      cardsOnTable.set(String(card.id), clone);

      const success = gameState.playCard(player.id, card.id);
      if (!success) {
        console.error(`Mossa non valida: ${player.name} -> ${card.id}`);
        clone.remove();
        cardsOnTable.delete(String(card.id));
        return;
      }

      const cardItem = img.closest('.card-item');
      if (cardItem) cardItem.remove();

      playCounter += 1;
    },
  });

  if (clone) {
    cardsOnTable.set(String(card.id), clone);
  }
}

/*
 * 
 *   funzione che gestisce il click di un umano su una carta.
 *   la AI usa un'altro metodo.
 *
 */
async function handleCardClick(e) {
  if (isResolvingTrick) return;

  const img = e.target.closest('.card-image');
  if (!img) return;

  const container = img.closest('.player-area');
  const player = getPlayerByContainer(container);
  if (!player || player.id !== gameState.currentTurn) {
    console.debug('click ignorato: non è il tuo turno');
    return;
  }

  const cardId = img.dataset.cardId;
  if (!cardId) return;

  const card = player.hand.find(c => String(c.id) === String(cardId));
  if (!card) return;

  if (!gameState.canPlayCard(card, player.id)) {
    console.debug('click ignorato: carta non valida');
    return;
  }

  await playCardWithAnimation(player, card, img, container);
  await continueGameFlow();
}

/*
 *. funzione che gioca il turno del computer.
 *
 */
async function playComputerTurn() {
  const player = gameState.getCurrentPlayer();
  if (!player || !player.isComputer) return;

  const card = computerPlayer.chooseCard(gameState, player.id);
  if (!card) {
    throw new Error(`Il bot ${player.name} non ha scelto nessuna carta`);
  }

  const container = getContainerByPlayerId(player.id);
  if (!container) {
    throw new Error(`Container non trovato per il player ${player.id}`);
  }

  const img = container.querySelector(`[data-card-id="${card.id}"]`);
  if (!img) {
    throw new Error(`Elemento DOM non trovato per la carta ${card.id}`);
  }

  await playCardWithAnimation(player, card, img, container);
  await continueGameFlow();
}

let isAdvancingGameFlow = false;

async function continueGameFlow() {
  if (isAdvancingGameFlow) return;
  isAdvancingGameFlow = true;

  try {
    while (!isResolvingTrick && gameState.phase === 'playing' && gameState.getCurrentPlayer()?.isComputer) {
      await sleep(600);
      await playComputerTurn();
    }
  } finally {
    isAdvancingGameFlow = false;
  }
}

async function onTrickResolved(winnerId, resolvedTrick) {
  isResolvingTrick = true;

  const center = document.getElementById('table-center');

  await animateTrickResolution(center, resolvedTrick, winnerId, cardsOnTable);

  resolvedTrick.forEach(({ card }) => {
    cardsOnTable.delete(String(card.id));
  });

  playCounter = 0;
  refreshPlayerStatuses();

  isResolvingTrick = false;
  await continueGameFlow();
}

function openCaptureOverlay(player) {
  const capturedCards = gameState.getCapturedCards(player);
  showCaptureOverlay(capturedCards);
}

function refreshPlayerStatuses() {
  const mapping = {
    0: document.getElementById('player-you'),
    1: document.getElementById('player-left'),
    2: document.getElementById('player-top'),
    3: document.getElementById('player-right'),
  };

  gameState.players.forEach((player) => {
    const container = mapping[player.id];
    if (!container) return;

    const statusEl = container.querySelector('.player-status');
    if (!statusEl) return;
    statusEl.innerHTML = renderPlayerStatus(player);
  });
}

function renderPlayerStatus(player) {
  const baseStatus = gameState.getPlayerCaptureStatus(player, 0);
  const capturesCount = Math.floor(player.captures.length / gameState.players.length);
  const canPeek = player.id === 0 && capturesCount > 0;

  if (!canPeek) return baseStatus;

  return `${baseStatus} (<a href="#" class="view-captures-link">guarda</a>)`;
}


async function syncBuscheTrackerFromState(summary) {
  if (summary) {
    buscheTracker.setPlayersByState(gameState);
  }
}

async function handleHandEnded(summary) {
  await animateHandSummary(summary, gameState, buscheTracker);
  //buscheTracker.updateFromSummary(summary, gameState);

  clearHandSummaryOverlay();

  refreshPlayerStatuses();

  const gameOverState = gameState.computeGameOverState();

  if (gameOverState.isGameOver) {
    gameState.gameOverState = gameOverState; // se vuoi tenerlo in GameState
    gameOverOverlay.show(gameOverState, () => {
      window.location.href = '../../index.html';
    });
    return;
  }

  // se la partita non é finita prosegui con la prossima mano

  const ok = gameState.startNextHand();
  if (!ok) return;

  cardsOnTable.forEach((clone) => {
    try {
      clone.remove();
    } catch (_) { }
  });
  cardsOnTable.clear();

  closeCaptureOverlay();
  playCounter = 0;
  isResolvingTrick = false;

  renderBoard(gameState);
  await continueGameFlow();
}

function getContainerByPlayerId(playerId) {
  const mapping = {
    0: document.getElementById('player-you'),
    1: document.getElementById('player-left'),
    2: document.getElementById('player-top'),
    3: document.getElementById('player-right'),
  };

  return mapping[playerId] || null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

gameState.onTrickResolved = onTrickResolved;
gameState.onHandEnded = handleHandEnded;

document.addEventListener('click', handleCardClick);

document.addEventListener('click', (e) => {
  const link = e.target.closest('.view-captures-link');
  if (!link) return;

  e.preventDefault();
  openCaptureOverlay(gameState.players[0]);
});

async function bootstrapGame() {
  gameState.startGame();
  renderBoard(gameState);
  await continueGameFlow();
}

/* QUI PARTE TUTTO */
bootstrapGame();

/*
 * Hook per bottoni di test
 */
window.__PIGUGNO_TEST_API__ = {
  getGameState: () => gameState,
  render: () => renderBoard(gameState),
  syncBuscheTrackerFromState,
};

