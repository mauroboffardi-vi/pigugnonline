// generic-helpers.js
import { CardSorter } from "../../cards/CardSorter.js";
import { Card } from "../../cards/Card.js";
/** @typedef {import('../domain-types').CardRef} CardRef */
/** @typedef {import('../domain-types').HandPlan} HandPlan */
/** @typedef {import('../domain-types').ScoredCardEntry} ScoredCardEntry */
/** @typedef {import('../domain-types').TrickEntry} TrickEntry */

/**
 * 
 * @param {Card[]} cards 
 * @returns {Card | null}
 */
export function getLowestCard(cards) {
    if (cards.length === 0) return null;
    return cards.reduce((lowest, current) =>
        CardSorter.compare(lowest, current) < 0 ? lowest : current
    );
}

/**
 * 
 * @param {Card[]} cards 
 * @returns {Card | null}
 */
export function getHighestCard(cards) {
    if (cards.length === 0) return null;
    return cards.reduce((lowest, current) =>
        CardSorter.compare(lowest, current) > 0 ? lowest : current
    );
}

/**
 * 
 * @param {string} suit 
 * @param {Card[]} handSuitCards 
 * @param {Card[]} playedSuitCards
 * @returns {CardRef[]}
¨ */
export function getMissingSuitCards(suit, handSuitCards, playedSuitCards) {
    const allValues = [1, 2, 3, 8, 9, 10, 7, 6, 5, 4];
    const seen = new Set(
        [...handSuitCards, ...playedSuitCards].map(card => `${card.suit}:${card.value}`)
    );

    return allValues
        .map(value => ({ suit, value }))
        .filter(card => !seen.has(`${card.suit}:${card.value}`));
}


/**
 * 
 * @param {Card[]} hand 
 * @param {string} suit 
 * @returns {number}
 */
export function countSuit(hand, suit) {
    return hand.filter(card => card.suit === suit).length;
}

/**
 * 
 * @param {Card[]} hand 
 * @param {string} suit 
 * @returns {Card[]}
 */

export function getSuitCards(hand, suit) {
    return hand.filter(card => card.suit === suit);
}

/**
 * 
 * @param {Card} lowerCard 
 * @param {Card} higherCard 
 * @returns {number}
 */
export function rankDistance(lowerCard, higherCard) {
    return Math.max(0, CardSorter.cardPower(higherCard) - CardSorter.cardPower(lowerCard));
}
/**
 * Ritorna il seme di mano
 * @param {TrickEntry[]} trick 
 * @returns {string}
 */
export function getLeadingSuitFromTrick(trick) {
    return trick?.[0]?.card.suit || null;
}

/**
 * @param {ScoredCardEntry[]} entries
 * @returns {ScoredCardEntry}
 */
export function breakTies(entries) {
    if (entries.length === 1) return entries[0];
    return [...entries].sort((a, b) => CardSorter.compare(a.card, b.card))[0];
}
