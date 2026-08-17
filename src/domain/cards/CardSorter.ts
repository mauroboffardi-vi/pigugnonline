import { Card } from './Card';

/**
 * Utility per ordinare le carte secondo le regole di potenza e ordine dei semi.
 */
export class CardSorter {
    /**
     * Restituisce il valore numerico del seme per l'ordinamento.
     * L'ordine é coppe, denari, bastoni e spade
     * @param {string} suit
     * @returns {number}
     */
    static suitOrder(suit: string): number {
        const order: Record<string, number> = {
            coppe: 0,
            denari: 1,
            bastoni: 2,
            spade: 3,
        };
        return order[suit] ?? 0;
    }

    /**
     * Restituisce il valore di "potenza" di una carta 
     * Ordine di potenza (dal più debole al più forte): 4,5,6,7,fante(8),cavallo(9),re(10),asso(1),2,3
     * @param {Card} card
     * @returns {number}
     */
    static cardPower(card: Card): number {
        const powerMap: Record<number, number> = {
            4: 1,
            5: 2,
            6: 3,
            7: 4,
            8: 5,
            9: 6,
            10: 7,
            1: 8,
            2: 9,
            3: 10,
        };
        return powerMap[card.value] ?? card.value;
    }

    /**
     * Comparator per ordinare due carte: prima per seme, poi per potenza.
     * @param {Card} a
     * @param {Card} b
     * @returns {number}
     */
    static compare(a: Card, b: Card): number {
        if (a.suit === b.suit) {
            return CardSorter.cardPower(a) - CardSorter.cardPower(b);
        }
        return CardSorter.suitOrder(a.suit) - CardSorter.suitOrder(b.suit);
    }

    /**
     * Ordina una mano di carte in-place usando il comparatore di potenza.
     * Restituisce la stessa array per comodità.
     * @param {Card[]} hand
     * @returns {Card[]}
     */
    static sortHand(hand: Card[]): Card[] {
        if (!Array.isArray(hand)) return hand;
        hand.sort(CardSorter.compare);
        return hand;
    }
}

export default CardSorter;