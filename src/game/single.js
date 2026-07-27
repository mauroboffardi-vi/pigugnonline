// src/game/single.js

import { GameState } from './GameState.js';
import { playCard as animatePlayCard } from './animation.js';
import { pickRandomNames, getAllPlayerNames } from './PlayerNames.js';

function createCardMarkup(card) {
  return `
    <div class="card-item">
      <img data-card-id="${card.id}" class="card-image small" src="${card.imagePath}" alt="${card.value} di ${card.suit}" />
    </div>
  `;
}

function renderPlayerArea(container, player) {
  const title = player.name;
  const cardsMarkup = player.hand.map(createCardMarkup).join('');
  container.dataset.playerId = player.id;

  container.innerHTML = `
    <div class="player-meta">
      <h2>${title}</h2>
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

  if (document.getElementById('player-top')) renderPlayerArea(document.getElementById('player-top'), mapping.top);
  if (document.getElementById('player-left')) renderPlayerArea(document.getElementById('player-left'), mapping.left);
  if (document.getElementById('player-right')) renderPlayerArea(document.getElementById('player-right'), mapping.right);
  if (document.getElementById('player-you')) renderPlayerArea(document.getElementById('player-you'), mapping.you);

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

function getPlayerByContainer(container) {
  const pid = container?.dataset?.playerId;
  return gameState.players.find(p => String(p.id) === String(pid));
}

async function handleCardClick(e) {
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

  const idx = player.hand.findIndex(c => String(c.id) === String(cardId));
  if (idx === -1) return;

  const card = player.hand[idx];

  // Validazione PRIMA dell'animazione
  if (!gameState.canPlayCard(card, player.id)) {
    console.debug('click ignorato: carta non valida');
    return;
  }

  const center = document.getElementById('table-center');

  await animatePlayCard(img, container, center, {
    zIndex: 1000 + playCounter,
    onPlayed: () => {
      gameState.playCard(player.id, cardId);
      renderBoard(gameState);
    }
  });

  playCounter += 1;
}

document.addEventListener('click', handleCardClick);

// TODO: Implement animation for resolving the trick and capturing cards.
