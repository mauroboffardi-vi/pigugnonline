// handPlanHelpers.ts
import { GameState } from '../../game/GameState';
import { CardRef, HandPlan } from '../../domain-types';
import { Card } from "../../cards/Card";

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {boolean}
 */
export function isFragileShortSuit(handPlan: HandPlan, suit: string): boolean {
    return !!handPlan.fragileShortSuits?.[suit]?.isFragile;
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {number}
 */
export function getFragileShortSuitScore(handPlan: HandPlan, suit: string): number {
    return handPlan.fragileShortSuits?.[suit]?.fragilityScore || 0;
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {boolean}
 */
export function isTenaceSuit(handPlan: HandPlan, suit: string): boolean {
    return !!handPlan.tenaceSuits?.[suit]?.isTenace;
}

/**
 * @param {HandPlan} handPlan 
 * @param {Card} card 
 * @returns {boolean}
 */
export function isFragileEntryCard(handPlan: HandPlan, card: Card): boolean {
    const entries = handPlan.entryPreservation?.fragileEntries || [];
    return entries.some(entry => entry.suit === card.suit && entry.value === card.value);
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {boolean}
 */
export function isEntrySuit(handPlan: HandPlan, suit: string): boolean {
    return (handPlan.entryPreservation?.entrySuits || []).includes(suit);
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {number}
 */
export function getTenaceTension(handPlan: HandPlan, suit: string): number {
    return handPlan.tenaceSuits?.[suit]?.tension || 0;
}

/**
 * @param {HandPlan} handPlan 
 * @param {Card} card 
 * @returns {boolean}
 */
export function isTenaceLowCard(handPlan: HandPlan, card: Card): boolean {
    const info = handPlan.tenaceSuits?.[card.suit];
    if (!info?.isTenace || !info.lowCard) return false;
    return info.lowCard.value === card.value;
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {boolean}
 */
export function isDangerousShortSuit(handPlan: HandPlan, suit: string): boolean {
    return !!handPlan.dangerousShortSuits?.[suit]?.isDangerous;
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {number}
 */
export function getShortSuitDangerScore(handPlan: HandPlan, suit: string): number {
    return handPlan.dangerousShortSuits?.[suit]?.dangerScore || 0;
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {number}
 */
export function getShortSuitUrgency(handPlan: HandPlan, suit: string): number {
    return handPlan.shortSuitPriority?.[suit]?.urgency || 0;
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {boolean}
 */
export function isKnownDecimaSuit(handPlan: HandPlan, suit: string): boolean {
    return !!handPlan.decimaPressure?.[suit]?.knownMissing;
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {CardRef | null}
 */
export function getKnownMissingCardForSuit(handPlan: HandPlan, suit: string): CardRef | null {
    return handPlan.decimaPressure?.[suit]?.missingCard || null;
}

/**
 * @param {GameState} gameState
 * @param {number} playerId
 */
export function isForcedToFollow(gameState: GameState, playerId: number): boolean {
    const leadingSuit = gameState.getLeadingSuit();
    if (!leadingSuit) return false;

    const hand = gameState.getPlayerHand(playerId);
    return hand.some((card: Card) => card.suit === leadingSuit);
}

/**
 * @param {GameState} gameState
 * @param {number} playerId
 */
export function isLastTrickLikely(gameState: GameState, playerId: number): boolean {
    const hand = gameState.getPlayerHand(playerId);
    return hand.length <= 1;
}