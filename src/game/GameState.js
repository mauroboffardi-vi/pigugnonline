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
        this.onTrickResolved = null; //  callback for trick resolution
        this.isFirstTrick = true;
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

        console.debug(
            `canPlayCard(): turno ${this.trick.length} : ${player.name} sta provando a giocare ${card.value} di ${card.suit}`
        );

        const isPigugno = card.suit === 'spade' && card.value === 8;

        // Apertura della presa
        if (this.trick.length === 0) {
            if (this.isFirstTrick && isPigugno) {
                console.debug('click ignorato: il Pigugno non può essere giocato in apertura della prima mano');
                return false;
            }

            return true;
        }

        const leadingSuit = this.trick[0].card.suit;
        const cardsOfLeadingSuit = player.hand.filter(c => c.suit === leadingSuit);
        const hasLeadingSuit = cardsOfLeadingSuit.length > 0;

        // Se non hai il seme richiesto, puoi rifiutare con qualsiasi carta
        if (!hasLeadingSuit) {
            return true;
        }

        // Se hai il seme richiesto, devi rispondere a seme
        if (card.suit !== leadingSuit) {
            return false;
        }

        // Eccezione del Pigugno: solo nella prima mano, su uscita a spade,
        // si può giocare solo se è l'unica spada disponibile
        if (this.isFirstTrick && isPigugno && leadingSuit === 'spade') {
            const otherSpades = cardsOfLeadingSuit.filter(
                c => !(c.suit === 'spade' && c.value === 8)
            );

            if (otherSpades.length > 0) {
                console.debug(
                    'click ignorato: nella prima mano il Pigugno su spade si può giocare solo se è l’unica spada'
                );
                return false;
            }
        }

        return true;
    }
    /**
     * Risolve la mano corrente.
     */
    resolveTrick() {
        console.debug('Fine della mano.');

        const resolvedTrick = [...this.trick];
        const leadingSuit = resolvedTrick[0].card.suit;

        const candidates = resolvedTrick.filter(({ card }) => card.suit === leadingSuit);

        const winner = candidates.reduce((prev, current) =>
            CardSorter.compare(prev.card, current.card) > 0 ? prev : current
        );

        winner.player.captures.push(...resolvedTrick.map(t => t.card));
        this.currentTurn = winner.player.id;

        console.debug(`la presa è di ${winner.player.name}`);

        if (typeof this.onTrickResolved === 'function') {
            this.onTrickResolved(winner.player.id, resolvedTrick);
        }

        this.trick = [];
        this.isFirstTrick = false;

        if (this.deck.cards.length === 0 && this.players.every(player => player.hand.length === 0)) {
            this.phase = 'gameover';
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