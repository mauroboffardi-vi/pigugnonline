import { Card } from '../../domain/cards/Card';
import { CardSorter } from '../../domain/cards/CardSorter';
import { GameState } from '../../domain/game/GameState';

/**
 * restituisce true se il giocatore sta giocando una carta del seme di presa, ma piú bassa.
 * Commenta solo se la presa non é un due o un tre
 * 
 * @param gameState 
 * @param chosenCard 
 * @returns boolean
 */
export function vadosotto(gameState: GameState, chosenCard: Card): boolean {
    // 1. Se il tavolo è vuoto, è la prima giocata della presa
    if (!gameState?.trick || gameState.trick.length === 0) {
        return false;
    }

    // 2. Identifica il seme di uscita (prima carta della presa)
    const leadingSuit = gameState.trick[0].card.suit;

    console.debug(`💬 COMPUTER_CARD_CHOSEN.vadosotto() il gioco é a ${leadingSuit}`);

    // 3. Ritorna false se la carta non è del seme di gioco
    if (chosenCard.suit !== leadingSuit) {
        console.debug(`💬 COMPUTER_CARD_CHOSEN.vadosotto() sto rifiutando -> false`);
        return false;
    }

    // 4. Trova la potenza massima giocata finora per il seme di uscita usando CardSorter
    const leadingValue = Math.max(
        ...gameState.trick
            .filter((entry: any) => entry.card.suit === leadingSuit)
            .map((entry: any) => CardSorter.cardPower(entry.card))
    );

    console.debug(`💬 COMPUTER_CARD_CHOSEN.vadosotto() leadingValue = ${leadingValue}`);


    // 4. Se la presa e' un due o un tre non dice "ci vado sotto", non ha senso. 
    // ma si se si tratta di un asso.
    if ((leadingValue == 3) || (leadingValue == 2)) {
        console.debug(`💬 COMPUTER_CARD_CHOSEN.vadosotto() 2 o 3, non commento`);
        return false;
    }

    // 6. Verifica se la carta scelta ha una potenza inferiore al massimo sul tavolo
    const chosenPower = CardSorter.cardPower(chosenCard);

    return chosenPower < leadingValue;
}

/**
 * restituisce true se il giocatore sta giocando una carta del seme di presa, e piú alta.
 * 
 * @param gameState 
 * @param chosenCard 
 * @returns boolean
 */
export function vadosopra(gameState: GameState, chosenCard: Card): boolean {
    // 1. Se il tavolo è vuoto, è la prima giocata della presa
    if (!gameState?.trick || gameState.trick.length === 0) {
        return false;
    }

    // 2. Identifica il seme di uscita (prima carta della presa)
    const leadingSuit = gameState.trick[0].card.suit;

    console.debug(`💬 COMPUTER_CARD_CHOSEN.vadosopra() il gioco é a ${leadingSuit}`);

    // 3. Ritorna false se la carta non è del seme di gioco
    if (chosenCard.suit !== leadingSuit) {
        console.debug(`💬 COMPUTER_CARD_CHOSEN.vadosopra() sto rifiutando -> false`);
        return false;
    }

    // 4. Trova la potenza massima giocata finora per il seme di uscita usando CardSorter
    const leadingValue = Math.max(
        ...gameState.trick
            .filter((entry: any) => entry.card.suit === leadingSuit)
            .map((entry: any) => CardSorter.cardPower(entry.card))
    );

    console.debug(`💬 COMPUTER_CARD_CHOSEN.vadosopra() leadingValue = ${leadingValue}`);

    // 5. Verifica se la carta scelta ha una potenza inferiore al massimo sul tavolo
    const chosenPower = CardSorter.cardPower(chosenCard);
    return chosenPower > leadingValue;
}



/**
 * Controlla se la carta scelta è la Nona e se è la più bassa tra le 2 rimaste.
 */
export function isNona(gameState: GameState, chosenCard: Card): boolean {
    if (!chosenCard) return false;

    const playedCards = getPlayedCardsOfSuit(gameState, chosenCard.suit);

    console.debug(`isNona(): queste sono le ${playedCards.length} carte giá giocate per questo seme: ${playedCards.toDebugString()}`);

    // Se sono già state giocate esattamente 8 carte, stiamo per tirare la nona
    if (playedCards.length === 8) {
        console.debug(`isNona(): Ottimo, sono 8 carte, qui o é una nona o é una decima`);

        const chosenCardStrength = CardSorter.cardPower(chosenCard);

        // Tutte le potenze possibili delle 10 carte del seme
        const allStrengths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const playedStrengths = playedCards.map(c => CardSorter.cardPower(c));

        // Troviamo i 2 valori rimasti in gioco (uno è la nostra chosenCard, l'altro l'ultima carta)
        const remainingStrengths = allStrengths.filter(val => !playedStrengths.includes(val));

        // Ordiniamo le due carte dalla più bassa alla più alta
        remainingStrengths.sort((a, b) => a - b);

        // Se la nostra carta equivale a quella più debole tra le due rimanenti, andiamo a Nona!
        if (chosenCardStrength === remainingStrengths[0]) {
            return true;
        }
    }

    return false;
}

/**
 * Controlla se la carta scelta è la Decima del suo seme
 */
export function isDecima(gameState: GameState, chosenCard: Card): boolean {
    if (!chosenCard) return false;

    const playedCards = getPlayedCardsOfSuit(gameState, chosenCard.suit);

    // Se sono uscite già 9 carte di quel seme (nei trick precedenti + nel trick attuale), 
    // stiamo per giocare in maniera inequivocabile l'ultima!
    if (playedCards.length === 9) {
        return true;
    }

    return false;
}


/**
 * Metodo helper per ottenere tutte le carte di un determinato seme
 * giocate precedentemente (sia nei trick passati che nel trick corrente).
 */
export function getPlayedCardsOfSuit(gameState: GameState, suit: string): Card[] {
    const playedCards: Card[] = [];

    // 1. Aggiungiamo le carte uscite nei completedTricks
    if (gameState.completedTricks && gameState.completedTricks.length > 0) {
        for (const trick of gameState.completedTricks) {
            // trick è un array di TrickEntry
            for (const entry of trick) {
                if (entry && entry.card && entry.card.suit === suit) {
                    playedCards.push(entry.card);
                }
            }
        }
    }

    // 2. Aggiungiamo le carte già calate nel trick *corrente* prima del nostro turno
    // Assumendo che anche gameState.trick sia un array di TrickEntry
    if (gameState.trick && gameState.trick.length > 0) {
        for (const entry of gameState.trick) {
            if (entry && entry.card && entry.card.suit === suit) {
                playedCards.push(entry.card);
            }
        }
    }

    console.debug(`Banter: getPlayedCardsOfSuit(${suit}): ${playedCards.toDebugString()}`);
    return playedCards;
}