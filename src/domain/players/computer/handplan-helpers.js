// handPlanHelpers.js
/** @typedef {import('../domain-types').CardRef} CardRef */
/** @typedef {import('../domain-types').HandPlan} HandPlan */
/** @typedef {import('../../domain/cards/Card').Card} Card */


/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {boolean}
 */
export function isFragileShortSuit(handPlan, suit) {
    return !!handPlan.fragileShortSuits?.[suit]?.isFragile;
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {number}
 */
export function getFragileShortSuitScore(handPlan, suit) {
    return handPlan.fragileShortSuits?.[suit]?.fragilityScore || 0;
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {boolean}
 */
export function isTenaceSuit(handPlan, suit) {
    return !!handPlan.tenaceSuits?.[suit]?.isTenace;
}

/**
 * @param {HandPlan} handPlan 
 * @param {Card} card 
 * @returns {boolean}
 */
export function isFragileEntryCard(handPlan, card) {
    const entries = handPlan.entryPreservation?.fragileEntries || [];
    return entries.some(entry => entry.suit === card.suit && entry.value === card.value);
}

/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {boolean}
 */
export function isEntrySuit(handPlan, suit) {
    return (handPlan.entryPreservation?.entrySuits || []).includes(suit);
}
/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {number}
 */
export function getTenaceTension(handPlan, suit) {
    return handPlan.tenaceSuits?.[suit]?.tension || 0;
}
/**
 * @param {HandPlan} handPlan 
 * @param {Card} card 
 * @returns {boolean}
 */
export function isTenaceLowCard(handPlan, card) {
    const info = handPlan.tenaceSuits?.[card.suit];
    if (!info?.isTenace || !info.lowCard) return false;
    return info.lowCard.value === card.value;
}
/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {boolean}
 */
export function isDangerousShortSuit(handPlan, suit) {
    return !!handPlan.dangerousShortSuits?.[suit]?.isDangerous;
}
/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {number}
 */
export function getShortSuitDangerScore(handPlan, suit) {
    return handPlan.dangerousShortSuits?.[suit]?.dangerScore || 0;
}
/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {number}
 */
export function getShortSuitUrgency(handPlan, suit) {
    return handPlan.shortSuitPriority?.[suit]?.urgency || 0;
}
/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {boolean}
 */
export function isKnownDecimaSuit(handPlan, suit) {
    return !!handPlan.decimaPressure?.[suit]?.knownMissing;
}
/**
 * @param {HandPlan} handPlan 
 * @param {string} suit 
 * @returns {CardRef | null}
 */
export function getKnownMissingCardForSuit(handPlan, suit) {
    return handPlan.decimaPressure?.[suit]?.missingCard || null;
}