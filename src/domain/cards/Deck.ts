/**
 * Rappresenta un mazzo di carte da 40 carte per il gioco del Pigugno.
 */

import { Suits, Suit } from '../domain-types';
import { Card } from './Card'



export class Deck {

    public cards: Card[];
    public remaining: number;

    /**
     * Crea un nuovo mazzo inizializzato con tutte le carte del gioco.
     */
    constructor() {
        this.cards = this.createDeck();
        this.remaining = this.cards.length;
    }

    /**
     * Genera il mazzo da 40 carte.
     *
     * @returns {Card[]} Elenco delle carte create.
     */
    createDeck(): Card[] {
        const suits = Object.values(Suits) as Suit[];
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const deck: Card[] = [];

        for (const suit of suits) {
            for (const value of values) {
                deck.push(new Card(suit, value));
            }
        }

        return deck;
    }

    /**
     * Mescola le carte del mazzo in modo casuale.
     */
    shuffle(): void {
        for (let index = this.cards.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [this.cards[index], this.cards[randomIndex]] = [this.cards[randomIndex], this.cards[index]];
        }
    }

    /**
     * Pesca un numero specificato di carte dal mazzo.
     *
     * @param {number} count - Il numero di carte da pescare.
     * @returns {Card[]} Le carte pescate.
     */
    draw(count = 1): Card[] {
        if (!Number.isInteger(count) || count < 1) {
            throw new Error('Il numero di carte da pescare non è valido');
        }

        const drawnCards: Card[] = [];
        const availableCount = Math.min(count, this.cards.length);

        for (let index = 0; index < availableCount; index += 1) {
            drawnCards.push(this.cards.shift() as Card);
        }

        this.remaining = this.cards.length;
        return drawnCards;
    }
}