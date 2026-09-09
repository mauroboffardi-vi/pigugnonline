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

