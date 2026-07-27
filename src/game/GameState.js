// src/game/GameState.js
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
            captures: [],
        }));
        this.deck = null;
        this.currentTurn = 0;
        this.phase = 'setup';
        this.trick = [];
        this.trumpSuit = 'spade'; // Pigugno
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

        // Determine the starting player with the seven of diamonds
        const sevenOfDiamonds = this.players.find(player =>
            player.hand.some(card => card.value === 7 && card.suit === 'denari')
        );
        if (sevenOfDiamonds) {
            this.currentTurn = this.players.indexOf(sevenOfDiamonds);
            console.debug(`Inizia il giocatore ${this.players[this.currentTurn].name}`);
        }

        this.phase = 'playing';
    }

    /**
     * Gioca una carta.
     *
     * @param {number} playerId - L'ID del giocatore che sta giocando la carta.
     * @param {number} cardId - L'ID della carta da giocare.
     */
    playCard(playerId, cardId) {
        console.debug(`playCard(): turno ${this.currentTurn} playerID [${playerId}] sta provando a giocare la cardId[${cardId}]`);

        if (playerId !== this.currentTurn) {
            console.debug('click ignorato: non è il turno di questo giocatore');
            return false;
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player) return false;

        const cardIndex = this.findCardIndex(player, cardId);
        if (cardIndex === -1) {
            console.debug('click ignorato: la carta non esiste nella mano del giocatore');
            return false;
        }

        const card = player.hand[cardIndex];

        if (!this.canPlayCard(card, playerId)) {
            console.debug('click ignorato: la carta non può essere giocata');
            return false;
        }

        player.hand.splice(cardIndex, 1);
        this.trick.push({ player, card });

        this.currentTurn = (this.currentTurn + 1) % this.players.length;
        console.debug(`Tocca al giocatore ${this.players[this.currentTurn].name}`);

        if (this.trick.length === this.players.length) {
            this.resolveTrick();
        }

        return true;
    }

    /**
     * Controlla se una carta può essere giocata.
     *
     * @param {object} card - La carta da controllare.
     * @param {number} playerId - L'ID del giocatore che sta giocando la carta.
     * @returns {boolean}
     */
    canPlayCard(card, playerId) {
        if (this.phase !== 'playing') return false;

        const player = this.players.find(p => p.id === playerId);
        if (!player) return false;

        console.debug(`canPlayCard(): turno ${this.trick.length} : ${player.name} sta provando a giocare ${card.value} di ${card.suit}`);

        const isPigugno = card.suit === this.trumpSuit && card.value === 8;

        // Primo giocatore della mano
        if (this.trick.length === 0) {
            if (isPigugno) {
                console.debug('click ignorato: non si può giocare il Pigugno come prima carta della mano');
                return false;
            }
            return true;
        }

        const leadingSuit = this.trick[0].card.suit;
        const hasLeadingSuit = player.hand.some(c => c.suit === leadingSuit);

        // Regola speciale del Pigugno
        if (isPigugno && leadingSuit === this.trumpSuit) {
            const spadeInHand = player.hand.filter(c => c.suit === this.trumpSuit);
            const hasOnlyPigugnoAsSpade =
                spadeInHand.length === 1 &&
                spadeInHand[0].value === 8;

            if (!hasOnlyPigugnoAsSpade) {
                console.debug('click ignorato: il Pigugno si può giocare su spade solo se è l’unica spada in mano');
                return false;
            }
        }

        // Obbligo di rispondere al seme
        if (hasLeadingSuit) {
            return card.suit === leadingSuit;
        }

        return true;
    }
    /**
     * Risolve la mano corrente.
     */
    resolveTrick() {
        const winner = this.trick.reduce((prev, current) => {
            return CardSorter.compare(prev.card, current.card) > 0 ? prev : current;
        });

        // Move the cards to the winner's captures
        winner.player.captures.push(...this.trick.map(t => t.card));

        // Clear the trick and determine the next player to start the new trick
        this.trick = [];
        this.currentTurn = winner.player.id; // The winner starts the next trick

        console.debug(`Mano vinta da ${winner.player.name}, ${winner.player.name} inizia il prossimo trucco`);

        // Check if all cards have been played
        if (this.deck.cards.length === 0 && this.players.every(player => player.hand.length === 0)) {
            this.phase = 'gameover';
            console.log('Partita terminata!');
        }
    }

    /**
     * Ottiene il giocatore attivo.
     *
     * @returns {object} Il giocatore attivo.
     */
    getCurrentPlayer() {
        return this.players[this.currentTurn];
    }

    /**
     * Trova l'indice della carta nella mano del giocatore.
     *
     * @param {Object} player - L'oggetto del giocatore.
     * @param {number|string} cardId - L'ID della carta da cercare.
     * @returns {number} L'indice della carta nella mano del giocatore, o -1 se non esiste.
     */
    findCardIndex(player, cardId) {
        return player.hand.findIndex(c => c.id.toString() === cardId.toString());
    }
}