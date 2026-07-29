/**
 * Rappresenta una singola carta del mazzo.
 */
export class Card {
    /**
     * Crea una nuova carta.
     *
     * @param {('coppe'|'denari'|'bastoni'|'spade')} suit - Il seme della carta.
     * @param {number} value - Il valore della carta, compreso tra 1 e 10.
     */
    constructor(suit, value) {
        if (!['coppe', 'denari', 'bastoni', 'spade'].includes(suit)) {
            throw new Error('Seme non valido');
        }

        if (!Number.isInteger(value) || value < 1 || value > 10) {
            throw new Error('Valore della carta non valido');
        }

        this.suit = suit;
        this.value = value;
        this.id = Card.nextId++;
        this.imagePath = this.getImagePath();
    }

    /**
     * Restituisce la carta in formato testo descrittivo
     * @returns descrizione della carta
     */
    toString() {
        return value + " di " + this.suit;
    }

    /**
     * Ritorna il valore della carta in punti (3 per asso, 1 per figuure, due e tre, 0 per le flinghe)
     * @param {*} card 
     * @returns 
     */
    getPoints() {
        if (this.value === 1) return 3;
        if (this.value === 2) return 1;
        if (this.value === 3) return 1;
        if ([8, 9, 10].includes(this.value)) return 1;
        return 0;
    }


    isScoringCard() {
        return this.getPoints() > 0;
    }

    isPigugno() {
        return this.suit === 'spade' && this.value === 8;
    }


    /**
     * Restituisce il nome del file immagine corrispondente alla carta.
     *
     * @returns {string} Il nome del file immagine.
     */
    getImageName() {
        if (this.value === 8) {
            return 'fante';
        }

        if (this.value === 9) {
            return 'cavallo';
        }

        if (this.value === 10) {
            return 're';
        }

        return String(this.value);
    }

    /**
     * Restituisce il percorso dell'immagine associata alla carta.
     *
     * @returns {string} Il percorso assoluto dell'immagine.
     */
    getImagePath() {
        const imageFile = `${this.suit}_${this.getImageName()}.jpg`;
        return new URL(`../../assets/img/carte_piacentine/${imageFile}`, import.meta.url).href;
    }
}

Card.nextId = 1;
