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
    const title = player.name;
    const cardsMarkup = player.hand.map(createCardMarkup).join('');

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
        center.innerHTML = `<div class="play-area">&nbsp;</div>`;
    }
}

const gameState = new GameState(['Tu', ...pickRandomNames(3)]);
gameState.startGame();
renderBoard(gameState);
