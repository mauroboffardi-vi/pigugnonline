// src/game/single.js
import { GameState } from './GameState.js';
import { pickRandomNames } from './PlayerNames.js';
import { showCaptureOverlay, closeCaptureOverlay } from './CaptureOverlay.js';
import { GameOverOverlay } from './GameOverOverlay.js';
import {
  playCard as animatePlayCard,
  animateTrickResolution,
  animateHandSummary,
  clearHandSummaryOverlay
} from './animation.js';
import BuscheVisualizer from './BuscheVisualizer.js';

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

const gameState = new GameState(['Tu', ...pickRandomNames(3)]);
let playCounter = 0;
const cardsOnTable = new Map();
let isResolvingTrick = false;
const buscheVisualizer = new BuscheVisualizer(document.getElementById('busche-note'), { gameState });
const gameOverOverlay = new GameOverOverlay();


function renderPlayerArea(container, player) {
  const title = player.name;
  const captureStatus = gameState.getPlayerCaptureStatus(player);
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
  const mapping = {
    you: state.players[0],
    left: state.players[1],
    top: state.players[2],
    right: state.players[3],
  };

  const topEl = document.getElementById('player-top');
  const leftEl = document.getElementById('player-left');
  const rightEl = document.getElementById('player-right');
  const youEl = document.getElementById('player-you');

  if (topEl) renderPlayerArea(topEl, mapping.top);
  if (leftEl) renderPlayerArea(leftEl, mapping.left);
  if (rightEl) renderPlayerArea(rightEl, mapping.right);
  if (youEl) renderPlayerArea(youEl, mapping.you);

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

async function handleCardClick(e) {
  if (isResolvingTrick) return;

  const img = e.target.closest('.card-image');
  if (!img) return;

  const cardId = img.dataset.cardId;
  if (!cardId) return;

  const container = img.closest('.player-area');
  const player = getPlayerByContainer(container);

  if (!player || player.id !== gameState.currentTurn) {
    console.debug('click ignorato: non è il tuo turno');
    return;
  }

  const idx = player.hand.findIndex((c) => String(c.id) === String(cardId));
  if (idx === -1) return;

  const card = player.hand[idx];

  if (!gameState.canPlayCard(card, player.id)) {
    console.debug('click ignorato: carta non valida');
    return;
  }

  const center = document.getElementById('table-center');

  const clone = await animatePlayCard(img, container, center, {
    zIndex: 1000 + playCounter,
    onPlayed(clone) {
      cardsOnTable.set(String(cardId), clone);
      gameState.playCard(player.id, cardId);
      //invece di renderBoard(gameState); che ricostruisce tutto il DOM, rimuovo solo la carta giocata.
      const cardItem = img.closest('.card-item');
      if (cardItem) cardItem.remove();
      playCounter += 1;
    },
  });

  if (clone) {
    cardsOnTable.set(String(cardId), clone);
    playCounter += 1;
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

    statusEl.innerHTML = getPlayerStatusMarkup(player);
  });
}

function getPlayerStatusMarkup(player) {
  const capturesCount = Math.floor(player.captures.length / gameState.players.length);

  if (capturesCount === 0) {
    return 'non ha coperto';
  }

  const label = capturesCount === 1 ? 'presa' : 'prese';
  const peek = player.id === 0 ? ' (<a href="#" id="view-captures">guarda</a>)' : '';

  return `${capturesCount} ${label}${peek}`;
}

async function syncBuscheVisualizerFromState(summary) {
  if (summary) {
    buscheVisualizer.setPlayersByState(gameState);
  }
}

async function handleHandEnded(summary) {
  await animateHandSummary(summary, gameState, buscheVisualizer);
  //buscheVisualizer.updateFromSummary(summary, gameState);

  clearHandSummaryOverlay();

  refreshPlayerStatuses();

  const gameOverState = gameState.computeGameOverState();

  if (gameOverState.isGameOver) {
    gameState.gameOverState = gameOverState; // se vuoi tenerlo in GameState
    gameOverOverlay.show(gameOverState, () => {
      window.location.href = '../index.html';
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
}

gameState.onTrickResolved = onTrickResolved;
gameState.onHandEnded = handleHandEnded;

document.addEventListener('click', handleCardClick);

document.addEventListener('click', (e) => {
  if (e.target.id === 'view-captures') {
    e.preventDefault();
    openCaptureOverlay(gameState.players[0]);
  }
});

gameState.startGame();
renderBoard(gameState);

/*
 * Hook per bottoni di test
 */
window.__PIGUGNO_TEST_API__ = {
  getGameState: () => gameState,
  render: () => renderBoard(gameState),
  syncBuscheVisualizerFromState,
};

