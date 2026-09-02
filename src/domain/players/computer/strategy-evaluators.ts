
import { Card } from '../../../domain/cards/Card';
import { GameState } from '../../game/GameState';
import { CardSorter } from '../../../domain/cards/CardSorter';
import { Suit, Suits, Player } from '../../domain-types';
import * as gh from './generic-helpers';
import * as hph from './handplan-helpers';
import {
    DecimaAnalysisInfo,
    ForcedTricksEstimate,
    ShortSuitPriorityInfo,
    DecimaPressureInfo,
    DangerousShortSuitInfo,
    TenaceSuitInfo,
    LeadControl,
    EntryPreservationInfo,
    CiapaETorna,
    FragileShortSuitInfo,
    CiapaETornaMode
} from '../../domain-types';

type LogFn = (msg: string) => void;

function getPlayedCardsBySuit(gameState: GameState, suit: string): Card[] {
    const history = (gameState as any).completedTricks || [];
    const cards: Card[] = [];

    for (const trick of history) {
        for (const entry of trick) {
            if (entry?.card?.suit === suit) {
                cards.push(entry.card);
            }
        }
    }

    const currentTrick = (gameState as any).getCurrentTrick?.() || [];
    for (const entry of currentTrick) {
        if (entry?.card?.suit === suit) {
            cards.push(entry.card);
        }
    }

    return cards;
}

function countRefusalsOnSuit(gameState: GameState, suit: string): number {
    const history = (gameState as any).completedTricks || [];
    let refusals = 0;

    for (const trick of history) {
        if (!trick?.length) continue;
        const leadingSuit = trick[0]?.card?.suit;
        if (leadingSuit !== suit) continue;

        for (const entry of trick.slice(1)) {
            if (entry?.card?.suit !== suit) refusals += 1;
        }
    }

    return refusals;
}

function getLastCompletedTrick(gameState: GameState): any {
    const history = (gameState as any).completedTricks || [];
    if (!history.length) return null;
    return history[history.length - 1];
}

function getWinnerOfTrick(trick: any[]): number | null {
    if (!trick || !trick.length) return null;

    const leadingSuit = trick[0]?.card?.suit;
    if (!leadingSuit) return null;

    const candidates = trick.filter((entry) => entry.card.suit === leadingSuit);
    if (!candidates.length) return null;

    let winningEntry = candidates[0];

    for (const entry of candidates.slice(1)) {
        if (CardSorter.compare(entry.card, winningEntry.card) > 0) {
            winningEntry = entry;
        }
    }

    return winningEntry.player.id ?? null;
}

export function analyzeDecime(gameState: GameState, player: Player, hand: Card[], log?: LogFn): DecimaAnalysisInfo {

    const suits = Object.values(Suits);
    const result = {} as DecimaAnalysisInfo;

    for (const suit of suits) {
        const handSuitCards = gh.getSuitCards(hand, suit);
        const playedSuitCards = getPlayedCardsBySuit(gameState, suit);
        const seenCount = handSuitCards.length + playedSuitCards.length;


        const missingCards = gh.getMissingSuitCards(suit, handSuitCards, playedSuitCards);

        const knownMissing = missingCards.length === 1;
        const missingCard = knownMissing ? missingCards[0] : null;

        result[suit] = {
            handCount: handSuitCards.length,
            playedCount: playedSuitCards.length,
            seenCount,
            mayKnowDecima: seenCount === 9,
            missingCards,
            knownMissing,
            missingCard,
        };
    }


    log?.(`analisi decime: ${JSON.stringify(result)}`);
    return result;
}

export function estimateForcedTricks(player: Player, hand: Card[], log?: LogFn): ForcedTricksEstimate {


    let guaranteedHighTricks = 0;
    let dangerousHighCards = 0;
    let protectedHighCards = 0;


    for (const card of hand) {
        const power = CardSorter.cardPower(card);
        const suitCount = gh.countSuit(hand, card.suit);


        if (power >= 8) dangerousHighCards += 1;
        if (power >= 9) guaranteedHighTricks += 1;
        if (power >= 8 && suitCount >= 2) protectedHighCards += 1;
    }


    const missingTricks = Math.max(0, hand.length - guaranteedHighTricks);

    const result = {
        guaranteedHighTricks,
        dangerousHighCards,
        protectedHighCards,
        missingTricks,
    } as ForcedTricksEstimate;


    log?.(`stima prese forzate: ${JSON.stringify(result)}`);
    return result;
}

export function evaluateEndgameMode(
    gameState: GameState,
    player: Player,
    hand: Card[],
    forcedTricksEstimate: ForcedTricksEstimate,
    hasCovered: boolean,
    log?: LogFn
) {
    const handSize = hand.length;

    const isEndgame = handSize <= 3;
    const isVeryLateEndgame = handSize <= 2;

    let pressure = 0;
    if (isEndgame) pressure += 30;
    if (isVeryLateEndgame) pressure += 20;
    if (!hasCovered) pressure += 18;
    pressure += forcedTricksEstimate.guaranteedHighTricks * 8;
    pressure += forcedTricksEstimate.missingTricks * 5;

    const mode = {
        isEndgame,
        isVeryLateEndgame,
        pressure,
    };

    log?.(`valuto endgame: ${JSON.stringify(mode)}`);
    return mode;
}

export function evaluateShortSuitPriority(hand: Card[]): Record<string, ShortSuitPriorityInfo> {
    const suits = Object.values(Suits);
    const priorities: Partial<Record<Suit, ShortSuitPriorityInfo>> = {};

    for (const suit of suits) {
        const count = gh.countSuit(hand, suit);

        priorities[suit] = {
            count,
            shouldVoid: count > 0 && count <= 2,
            urgency: count === 1 ? 30 : count === 2 ? 16 : 0,
        };
    }

    return priorities;
}

export function evaluatePigugnoUrgency(player: Player, hand: Card[], hasCovered: boolean, shouldPull: boolean, log?: LogFn): number {
    const hasPigugno = hand.some((card) => card.isPigugno());

    if (!hasPigugno) return 0;

    let urgency = 40;
    if (hasCovered) urgency += 25;
    if (!shouldPull) urgency += 15;
    if (hand.length <= 5) urgency += 10;
    if (hand.length <= 3) urgency += 15;

    log?.(`urgenza pigugno: ${urgency}`);
    return urgency;
}

export function evaluateDecimaPressure(player: Player, decimeAnalysisInfo: DecimaAnalysisInfo, shouldPull: boolean, log?: LogFn): DecimaPressureInfo {
    /* @type {Record<string, DecimaPressureSuitInfo>} */
    const result = {} as DecimaPressureInfo;

    for (const [suit, info] of Object.entries(decimeAnalysisInfo)) {
        // Controllo difensivo: garantisce a TS che info esiste
        if (!info) continue;

        result[suit] = {
            knownMissing: info.knownMissing,
            missingCard: info.missingCard,
            pressure: info.knownMissing ? (shouldPull ? 12 : 22) : 0,
        };
    }

    log?.(`pressione decime: ${JSON.stringify(result)}`);
    return result;
}

export function evaluateDangerousShortSuits(gameState: GameState, player: Player, hand: Card[], shortSuitPriority: Record<string, ShortSuitPriorityInfo>, decimeAnalysisInfo: DecimaAnalysisInfo, shouldPull: boolean, log?: LogFn): Record<string, DangerousShortSuitInfo> {
    const suits = Object.values(Suits);
    const result: Partial<Record<Suit, DangerousShortSuitInfo>> = {};

    for (const suit of suits) {
        const suitCards = gh.getSuitCards(hand, suit);
        const shortInfo = shortSuitPriority[suit];

        if (!shortInfo || !shortInfo.shouldVoid) {
            result[suit] = {
                isDangerous: false,
                dangerScore: 0,
                reason: "not-short-suit",
            };
            continue;
        }

        const totalPoints = suitCards.reduce((sum, card) => sum + card.getPoints(), 0);
        const maxPower = suitCards.reduce((max, card) => Math.max(max, CardSorter.cardPower(card)), 0);
        const highCards = suitCards.filter((card) => CardSorter.cardPower(card) >= 8).length;
        const topCards = suitCards.filter((card) => CardSorter.cardPower(card) >= 9).length;
        const knownDecima = !!decimeAnalysisInfo?.[suit]?.knownMissing;
        const seenCount = decimeAnalysisInfo?.[suit]?.seenCount || 0;

        let dangerScore = 0;

        dangerScore += totalPoints * 10;
        dangerScore += highCards * 16;
        dangerScore += topCards * 18;

        if (maxPower >= 8) dangerScore += 18;
        if (maxPower >= 9) dangerScore += 22;
        if (seenCount >= 8) dangerScore += 12;
        if (knownDecima) dangerScore += 16;
        if (!shouldPull) dangerScore += 15;

        const isDangerous = dangerScore >= 45;

        result[suit] = {
            isDangerous,
            dangerScore,
            totalPoints,
            maxPower,
            highCards,
            topCards,
            knownDecima,
            seenCount,
            reason: isDangerous ? "high-risk-short-suit" : "safe-to-void",
        };
    }

    log?.(`semi corti pericolosi: ${JSON.stringify(result)}`);
    return result;
}

export function evaluateTenaceSuits(player: Player, hand: Card[], decimeAnalysisInfo: DecimaAnalysisInfo, shouldPull: boolean, log?: LogFn): Record<string, TenaceSuitInfo> {
    const suits = Object.values(Suits);
    const result: Partial<Record<Suit, TenaceSuitInfo>> = {};

    for (const suit of suits) {
        const suitCards = gh.getSuitCards(hand, suit);
        const seenCount = decimeAnalysisInfo?.[suit]?.seenCount || 0;
        const sortedSuitCards = [...suitCards].sort((a, b) => CardSorter.compare(a, b));
        const lowCard = sortedSuitCards[0] || null;
        const highCard = sortedSuitCards[sortedSuitCards.length - 1] || null;

        let tension = 0;
        let isTenace = false;
        let reason = "none";

        if (suitCards.length === 2 && seenCount >= 8) {
            tension += 30;
            if (lowCard && CardSorter.cardPower(lowCard) <= 3) tension += 15;
            if (highCard && CardSorter.cardPower(highCard) <= 5) tension += 20;
            if (!shouldPull) tension += 20;

            isTenace = tension >= 45;
            reason = isTenace ? "late-two-card-suit" : "two-card-suit";
        }

        result[suit] = {
            isTenace,
            tension,
            seenCount,
            handCount: suitCards.length,
            lowCard: lowCard ?? null,
            highCard: highCard ?? null,
            reason,
        };
    }

    log?.(`semi tenaci: ${JSON.stringify(result)}`);
    return result;
}

export function evaluateLeadControl(player: Player, hand: Card[], shouldPull: boolean, hasCovered: boolean, log?: LogFn): LeadControl {

    let wantsLeadControl = false;
    let avoidLeadControl = false;
    let intensity = 0;

    const highCards = hand.filter(card => CardSorter.cardPower(card) >= 8).length;
    const topCards = hand.filter(card => CardSorter.cardPower(card) >= 9).length;
    const handSize = hand.length;

    if (shouldPull) {
        wantsLeadControl = true;
        intensity += 35;
    }

    if (topCards >= 2) intensity += 15;
    if (highCards >= 3) intensity += 10;
    if (handSize <= 3 && !shouldPull) intensity -= 12;

    if (hasCovered && !shouldPull && handSize <= 5) {
        avoidLeadControl = true;
        intensity -= 10;
    }

    const result = {
        wantsLeadControl,
        avoidLeadControl,
        intensity,
    };

    log?.(`lead control: ${JSON.stringify(result)}`);
    return result;
}

export function evaluateEntryPreservation(player: Player, hand: Card[], shouldPull: boolean, log?: LogFn): EntryPreservationInfo {
    const suits = Object.values(Suits);

    const entrySuits = [];
    const fragileEntries = [];
    let entryCount = 0;

    for (const suit of suits) {
        const suitCards = gh.getSuitCards(hand, suit);
        if (!suitCards.length) continue;

        const sorted = [...suitCards].sort((a, b) => CardSorter.compare(a, b));
        const highest = sorted[sorted.length - 1];
        const suitCount = suitCards.length;

        if (highest && CardSorter.cardPower(highest) >= 8) {
            entryCount += 1;
            entrySuits.push(suit);

            if (suitCount <= 2) {
                fragileEntries.push({
                    suit,
                    value: highest.value,
                    power: CardSorter.cardPower(highest),
                });
            }
        }
    }

    const entryPreservationMode = !shouldPull && entryCount <= 2;

    const result = {
        entryPreservationMode,
        entryCount,
        entrySuits,
        fragileEntries,
    };

    log?.(`entry preservation: ${JSON.stringify(result)}`);
    return result;
}

export function evaluateCiapaETorna(gameState: GameState, player: Player, hand: Card[], shouldPull: boolean, hasCovered: boolean, decimeAnalysisInfo: DecimaAnalysisInfo, log?: LogFn): CiapaETorna {
    const lastTrick = getLastCompletedTrick(gameState);

    if (!lastTrick) {
        const emptyResult: CiapaETorna = {
            active: false,
            suit: null,
            mode: "none",
            bonus: 0,
            refusalsOnSuit: 0,
        };
        log?.(`ciapa e torna: ${JSON.stringify(emptyResult)}`);
        return emptyResult;
    }

    const winnerId = getWinnerOfTrick(lastTrick);
    const suit = gh.getLeadingSuitFromTrick(lastTrick) as Suit | null;

    if (winnerId !== player.id || !suit) {
        const emptyResult: CiapaETorna = {
            active: false,
            suit: null,
            mode: "none",
            bonus: 0,
            refusalsOnSuit: 0,
        };
        log?.(`ciapa e torna: ${JSON.stringify(emptyResult)}`);
        return emptyResult;
    }

    const refusalsOnSuit = countRefusalsOnSuit(gameState, suit);
    const handSuitCards = gh.getSuitCards(hand, suit);
    const seenCount = decimeAnalysisInfo?.[suit]?.seenCount || 0;

    let active = false;
    let mode: CiapaETornaMode = "none";
    let bonus = 0;

    if (handSuitCards.length >= 1) {
        if (shouldPull && refusalsOnSuit >= 1) {
            active = true;
            mode = "tirare";
            bonus = 18 + Math.min(refusalsOnSuit * 4, 10);
        } else if (!shouldPull && hasCovered && seenCount >= 6) {
            active = true;
            mode = "darla_via";
            bonus = 10 + Math.min(refusalsOnSuit * 3, 8);
        }
    }

    const result = {
        active,
        suit,
        mode,
        bonus,
        refusalsOnSuit,
    };

    log?.(`ciapa e torna: ${JSON.stringify(result)}`);
    return result;
}

export function evaluateFragileShortSuits(player: Player, hand: Card[], shouldPull: boolean, log?: LogFn): Record<string, FragileShortSuitInfo> {
    const suits = Object.values(Suits);

    const result: Partial<Record<Suit, FragileShortSuitInfo>> = {};

    for (const suit of suits) {
        const suitCards = gh.getSuitCards(hand, suit);
        const count = suitCards.length;
        if (count !== 2) {
            result[suit] = {
                isFragile: false,
                fragilityScore: 0,
                lowCard: null,
                highCard: null,
                reason: "count!=2",
            };
            continue;
        }

        const sorted = [...suitCards].sort((a, b) => CardSorter.compare(a, b));
        const lowCard = sorted[0];
        const highCard = sorted[sorted.length - 1];

        const lowPower = CardSorter.cardPower(lowCard);
        const highPower = CardSorter.cardPower(highCard);

        let fragilityScore = 0;

        // basso davvero pessimo come uscita
        if (lowPower <= 3) fragilityScore += 20;
        // alto non abbastanza alto da essere vero vincente
        if (highPower <= 6) fragilityScore += 15;

        // se non sto tirando, la fragilità pesa di più
        if (!shouldPull) fragilityScore += 15;

        const isFragile = fragilityScore >= 40;

        result[suit] = {
            isFragile,
            fragilityScore,
            lowCard,
            highCard,
            reason: isFragile ? "two-card-fragile-suit" : "two-card-neutral-suit",
        };
    }

    log?.(`semi corti fragili: ${JSON.stringify(result)}`);
    return result;
}

export function evaluatePull(
    gameState: GameState,
    player: Player,
    hand: Card[],
    forcedTricksEstimate: ForcedTricksEstimate,
    hasCovered: boolean,
    log?: LogFn
): boolean {
    const highCards = hand.filter(card => CardSorter.cardPower(card) >= 8).length;
    const topCards = hand.filter(card => CardSorter.cardPower(card) >= 9).length;
    const zeroPointCards = hand.filter(card => card.getPoints() === 0).length;
    const pigugnoInHand = hand.some(card => card.isPigugno());
    const handSize = hand.length;


    let score = 0;


    score += forcedTricksEstimate.guaranteedHighTricks * 30;
    score += forcedTricksEstimate.dangerousHighCards * 12;
    score += topCards * 10;
    score += highCards * 6;


    score -= forcedTricksEstimate.missingTricks * 22;
    score -= zeroPointCards * 4;


    if (handSize <= 3) score -= 20;
    if (handSize >= 7) score += 10;


    if (hasCovered) score += 12;
    if (pigugnoInHand) score += 8;


    const shouldPull = score >= 55;


    log?.(
        `valuto se tirare: guaranteed=${forcedTricksEstimate.guaranteedHighTricks}, dangerous=${forcedTricksEstimate.dangerousHighCards}, missing=${forcedTricksEstimate.missingTricks}, high=${highCards}, top=${topCards}, zero=${zeroPointCards}, score=${score}, shouldPull=${shouldPull}`
    );

    return shouldPull;
}