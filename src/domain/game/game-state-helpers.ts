import { Card } from '../../domain/cards/Card';
import { CardSorter } from '../../domain/cards/CardSorter';
import { GameState } from '../../domain/game/GameState';

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

    return playedCards;
}