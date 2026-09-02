import { CardSorter } from '../../cards/CardSorter';
import { Card } from '../../cards/Card';
import { CardRef, ScoredCardEntry, Trick, Suit } from '../../domain-types';

/**
 * @param cards 
 * @returns 
 */
export function getLowestCard(cards: Card[]): Card | null {
    if (cards.length === 0) return null;
    return cards.reduce((lowest, current) =>
        CardSorter.compare(lowest, current) < 0 ? lowest : current
    );
}

/**
 * @param cards 
 * @returns 
 */
export function getHighestCard(cards: Card[]): Card | null {
    if (cards.length === 0) return null;
    return cards.reduce((lowest, current) =>
        CardSorter.compare(lowest, current) > 0 ? lowest : current
    );
}

/**
 * @param suit 
 * @param handSuitCards 
 * @param playedSuitCards
 * @returns 
 */
export function getMissingSuitCards(suit: Suit, handSuitCards: Card[], playedSuitCards: Card[]): CardRef[] {
    const allValues = [1, 2, 3, 8, 9, 10, 7, 6, 5, 4];
    const seen = new Set(
        [...handSuitCards, ...playedSuitCards].map(card => `${card.suit}:${card.value}`)
    );

    return allValues
        .map(value => ({ suit, value }))
        .filter(card => !seen.has(`${card.suit}:${card.value}`));
}

/**
 * @param hand 
 * @param suit 
 * @returns 
 */
export function countSuit(hand: Card[], suit: Suit): number {
    return hand.filter(card => card.suit === suit).length;
}

/**
 * @param hand 
 * @param suit 
 * @returns 
 */
export function getSuitCards(hand: Card[], suit: Suit): Card[] {
    return hand.filter(card => card.suit === suit);
}

/**
 * @param lowerCard 
 * @param higherCard 
 * @returns 
 */
export function rankDistance(lowerCard: Card, higherCard: Card): number {
    return Math.max(0, CardSorter.cardPower(higherCard) - CardSorter.cardPower(lowerCard));
}

/**
 * Ritorna il seme di mano
 * @param trick 
 * @returns 
 */
export function getLeadingSuitFromTrick(trick: Trick): string | null {
    return trick?.[0]?.card.suit || null;
}

/**
 * @param entries
 * @returns 
 */
export function breakTies(entries: ScoredCardEntry[]): ScoredCardEntry {
    if (entries.length === 1) return entries[0];
    return [...entries].sort((a, b) => CardSorter.compare(a.card, b.card))[0];
}
