/**
 * Rappresenta una singola carta del mazzo.
 */
export class Card {

    private static nextId = 1;

    public id: number;
    public suit: 'coppe' | 'denari' | 'bastoni' | 'spade';
    public value: number;
    public imagePath: string;
    public imageBackPath: string;

    /**
     * Crea una nuova carta.
     *
     * @param {('coppe'|'denari'|'bastoni'|'spade')} suit - Il seme della carta.
     * @param {number} value - Il valore della carta, compreso tra 1 e 10.
     */
    constructor(public newsuit: 'coppe' | 'denari' | 'bastoni' | 'spade', public newvalue: number) {
        if (!['coppe', 'denari', 'bastoni', 'spade'].includes(newsuit)) {
            throw new Error('Seme non valido');
        }

        if (!Number.isInteger(newvalue) || newvalue < 1 || newvalue > 10) {
            throw new Error('Valore della carta non valido');
        }
        this.suit = newsuit;
        this.value = newvalue;
        this.id = Card.nextId++;
        this.imagePath = this.getImagePath();
        this.imageBackPath = this.getBackImagePath();
    }

    /**
     * Restituisce la carta in formato testo descrittivo
     * @returns {string} descrizione della carta
     */
    toString(): string {
        return this.value + " di " + this.suit;
    }

    /**
     * Ritorna il valore della carta in punti (3 per asso, 1 per figuure, due e tre, 0 per le flinghe)
     * @returns {number}
     */
    getPoints(): number {
        if (this.value === 1) return 3;
        if (this.value === 2) return 1;
        if (this.value === 3) return 1;
        if ([8, 9, 10].includes(this.value)) return 1;
        return 0;
    }

    /**
    * returns true if the card has points (not a flinga)
    * @returns {boolean}
    */
    isScoringCard(): boolean {
        return this.getPoints() > 0;
    }

    /**
     * returns true if the card is the Pigugno
     * @returns {boolean}
     */
    isPigugno(): boolean {
        return this.suit === 'spade' && this.value === 8;
    }

    /**
     * Restituisce il nome del file immagine corrispondente alla carta.
     *
     * @returns {string} Il nome del file immagine.
     */
    getImageName(): string {
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
    getImagePath(): string {
        const imageFile = `${this.suit}_${this.getImageName()}.jpg`;
        return new URL(`../../assets/img/carte_piacentine/${imageFile}`, import.meta.url).href;
    }

    /**
     * Restituisce il percorso dell'immagine del dorso della carta.
     *
     * @returns {string} Il percorso assoluto dell'immagine.
     */
    getBackImagePath(): string {
        const imageFile = "retro.png";
        return new URL(`../../assets/img/carte_piacentine/${imageFile}`, import.meta.url).href;
    }
}