import { GameState } from './GameState.js';
import { playCard } from './animation.js';

const availableNames = [
  'Babi',
  'Bazza',
  'Bòia',
  'Bòia Càn',
  'Cagna Mègra',
  'Zént Omen',
  'Pâg’',
  'Mastrilli',
  'Chiccaja',
  'Scucmai',
  'Beccamòrt',
  'Pizzigòn',
  'Ciàcol',
  'Ciòch',
  'Magnòn',
  'Scarpelìn',
  'Fumaghèn',
  'Sgurlàtt',
  'Zavàj',
  'Ganàsc',
  'Gròpp',
  'Lungòtt',
  'Cicciòl',
  'Pìngol',
  'Tira Via',
  'Porcellìn',
  'Ghiacc',
  'Pèss',
  'Pég',
  'Sgagn',
  'Bicarìn',
  'Cultelìn',
  'Càndol',
  'Furbètt',
  'Pavàj',
  'Ciàpp',
  'Sgheff',
  'Cipria',
  'Mirko',
  'Il Gelataio',
  'Daviduz',
  'Mario',
  'Il Dottore',
  'Woody',
  'Mauro',
];

function pickRandomNames(count) {
  const shuffled = [...availableNames].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

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
  // Map players to cells: index 0 = human (bottom), 1 = top (1B), 2 = left (2A), 3 = right (2C)
  const mapping = {
    top: state.players[1],
    left: state.players[2],
    right: state.players[3],
    you: state.players[0],
  };

  if (document.getElementById('player-top')) renderPlayerArea(document.getElementById('player-top'), mapping.top);
  if (document.getElementById('player-left')) renderPlayerArea(document.getElementById('player-left'), mapping.left);
  if (document.getElementById('player-right')) renderPlayerArea(document.getElementById('player-right'), mapping.right);
  if (document.getElementById('player-you')) renderPlayerArea(document.getElementById('player-you'), mapping.you);

  // The central play area can show the current trick or be left empty for now
  const center = document.getElementById('table-center');
  if (center) {
    let playArea = center.querySelector('.play-area');
    if (!playArea) {
      playArea = document.createElement('div');
      playArea.className = 'play-area';
      playArea.innerHTML = '&nbsp;';
      center.appendChild(playArea);
    }
  }
}

const gameState = new GameState(['Tu', ...pickRandomNames(3)]);
gameState.startGame();
renderBoard(gameState);

// --- Play animation logic ---
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
  if (!player) return;

  // find card in player's hand
  const idx = player.hand.findIndex(c => String(c.id) === String(cardId));
  if (idx === -1) return;

  const card = player.hand[idx];

  // play the card: animation module handles startRect, out/in and calls onPlayed
  const center = document.getElementById('table-center');
  await playCard(img, container, center, {
    zIndex: 1000 + playCounter,
    onPlayed: () => {
      player.hand.splice(idx, 1);
      renderBoard(gameState);
    }
  });
  playCounter += 1;

}

document.addEventListener('click', handleCardClick);
