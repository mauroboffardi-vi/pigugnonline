// src/game/single.js
import { GameState } from './GameState.js';
import { playCard as animatePlayCard, animateTrickResolution } from './animation.js';
import { pickRandomNames } from './PlayerNames.js';
import { showCaptureOverlay, closeCaptureOverlay } from './CaptureOverlay.js';

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

const gameState = new GameState(['Tu', ...pickRandomNames(3)]);
gameState.startGame();
renderBoard(gameState);

let playCounter = 0;
const cardsOnTable = new Map();
let isResolvingTrick = false;

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
      renderBoard(gameState);
      playCounter += 1;
    },
  });

  cardsOnTable.set(String(cardId), clone);
  playCounter += 1;
}

async function onTrickResolved(winnerId, resolvedTrick) {
  isResolvingTrick = true;

  const center = document.getElementById('table-center');

  await animateTrickResolution(center, resolvedTrick, winnerId, cardsOnTable);

  resolvedTrick.forEach(({ card }) => {
    cardsOnTable.delete(String(card.id));
  });

  playCounter = 0;
  renderBoard(gameState);

  isResolvingTrick = false;
}

gameState.onTrickResolved = onTrickResolved;
document.addEventListener('click', handleCardClick);

document.addEventListener('click', (e) => {
  if (e.target.id === 'view-captures') {
    e.preventDefault();
    openCaptureOverlay(gameState.players[0]);
  }
});

function openCaptureOverlay(player) {
  const capturedCards = gameState.getCapturedCards(player);
  // This will trigger the overlay logic in CaptureOverlay.js
  showCaptureOverlay(capturedCards);
}