import { Deck } from './../core/Deck.js';
import { CardSorter } from '../core/CardSorter.js';

/**
 * Rappresenta lo stato della partita singola.
 */
export class GameState {
    /**
     * Crea il nuovo stato di gioco.
     *
     * @param {string[]} playerNames - I nomi dei giocatori coinvolti.
     */
    constructor(playerNames) {
        this.playerNames = playerNames;
        this.players = playerNames.map((name, index) => ({
            id: index,
            name,
            isComputer: index > 0,
            hand: [],
            faceUp: false,
        }));
        this.deck = null;
        this.currentTurn = 0;
        this.phase = 'setup';
    }

    /**
     * Inizia una nuova partita.
     */
    startGame() {
        this.deck = new Deck();
        this.deck.shuffle();

        this.players.forEach((player) => {
            player.hand = [];
        });

        const playersInOrder = [...this.players];

        while (this.deck.cards.length > 0 && playersInOrder.some((player) => player.hand.length < 10)) {
            for (const player of playersInOrder) {
                if (player.hand.length < 10 && this.deck.cards.length > 0) {
                    player.hand.push(this.deck.cards.shift());
                }
            }
        }

        this.players.forEach((player) => {
            CardSorter.sortHand(player.hand);
        });

        this.phase = 'playing';
    }

    /**
     * Calcola l'ordine dei semi per l'ordinamento delle carte.
     *
     * @param {string} suit - Il seme della carta.
     * @returns {number} Il valore numerico del seme.
     */
    // Sorting logic extracted to src/core/CardSorter.js
}
