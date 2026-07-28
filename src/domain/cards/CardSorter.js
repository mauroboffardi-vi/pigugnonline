/**
 * Utility per ordinare le carte secondo le regole di potenza e ordine dei semi.
 */
export class CardSorter {
    /**
     * Restituisce il valore numerico del seme per l'ordinamento.
     * @param {string} suit
     * @returns {number}
     */
    static suitOrder(suit) {
        const order = {
            coppe: 0,
            denari: 1,
            bastoni: 2,
            spade: 3,
        };
        return order[suit] ?? 0;
    }

    /**
     * Restituisce il valore di "potenza" di una carta dato il suo valore numerico.
     * Ordine di potenza (dal più debole al più forte): 4,5,6,7,fante(8),cavallo(9),re(10),asso(1),2,3
     * @param {number} value
     * @returns {number}
     */
    static cardPower(value) {
        const powerMap = {
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
        return powerMap[value] ?? value;
    }

    /**
     * Comparator per ordinare due carte: prima per seme, poi per potenza.
     * @param {{suit:string, value:number}} a
     * @param {{suit:string, value:number}} b
     * @returns {number}
     */
    static compare(a, b) {
        if (a.suit === b.suit) {
            return CardSorter.cardPower(a.value) - CardSorter.cardPower(b.value);
        }
        return CardSorter.suitOrder(a.suit) - CardSorter.suitOrder(b.suit);
    }

    /**
     * Ordina una mano di carte in-place usando il comparatore di potenza.
     * Restituisce la stessa array per comodità.
     * @param {Array<{suit:string,value:number}>} hand
     * @returns {Array}
     */
    static sortHand(hand) {
        if (!Array.isArray(hand)) return hand;
        hand.sort(CardSorter.compare);
        return hand;
    }
}

export default CardSorter;
