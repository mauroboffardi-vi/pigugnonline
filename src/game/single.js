import { GameState } from './GameState.js';

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
      <img class="card-image small" src="${card.imagePath}" alt="${card.value} di ${card.suit}" />
    </div>
  `;
}

function renderPlayerArea(container, player) {
  const title = player.isComputer ? `${player.name} (${player.hand.length} carte)` : `${player.name} (${player.hand.length} carte)`;
  const cardsMarkup = player.hand.map(createCardMarkup).join('');

  container.innerHTML = `
    <div class="player-meta">
      <h2>${title}</h2>
    </div>
    <div class="player-hand">${cardsMarkup}</div>
  `;
}

function renderBoard(state) {
  const layout = [
    { playerIndex: 0, containerId: 'player-you' },
    { playerIndex: 1, containerId: 'player-top' },
    { playerIndex: 2, containerId: 'player-left' },
    { playerIndex: 3, containerId: 'player-right' },
  ];

  layout.forEach(({ playerIndex, containerId }) => {
    const player = state.players[playerIndex];
    const container = document.getElementById(containerId);

    if (container) {
      renderPlayerArea(container, player);
    }
  });
}

const gameState = new GameState(['Tu', ...pickRandomNames(3)]);
gameState.startGame();
renderBoard(gameState);
