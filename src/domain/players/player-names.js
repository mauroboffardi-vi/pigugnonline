// src/game/PlayerNames.js

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
    'Còppel',
    'Mirkuz',
    'Il Gelataio',
    'Daviduz',
    'Mario',
    'Il Dottore',
    'Woody',
    'Mauro',
];

/**
 * Sceglie un certo numero di nomi in modo casuale.
 *
 * @param {number} count - Il numero di nomi da scegliere.
 * @returns {string[]} Un array contenente i nomi scelti in ordine casuale.
 */
export function pickRandomNames(count) {
    const shuffled = [...availableNames].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Ottiene tutti i nomi dei giocatori disponibili.
 *
 * @returns {string[]} Un array contenente tutti i nomi dei giocatori.
 */
export function getAllPlayerNames() {
    return availableNames;
}