// src/domain/domain-types.ts
import { Card } from "./cards/Card";
import { GameState } from "./game/GameState";

/**
 * 
 * Questi tipi, a parte alcuni tipo Player, CardRef, etc.. sono tutti usati per passare strutture complesse 
 * fra i vari metodi di ComputerPlayer. C'é un po di casino ma ogni situazione ha bisogno di tipi differenti.
 * 
 * importante la distinzione fra CardRef e la classe Card! Card ha un proprio ID e corrisponde alle 40 carte distribuite
 * fra le varie mani, e le prese. Durante il calcolo della strategia si valutano carte "ipotetiche" (per esempio quando 
 * si valuta una decima che non é stata ancora giocata e non si sa "dov'e'") per cui li si passa seme+valore.
 * istanziare una Card() nuova genererebbe un nuovo ID e creerebbe molta confusione nel caso questo object "Card" 
 * dovessere finire giocata nella UI
 * 
 */

export interface Player {
    id: number;
    name: string;
    isComputer: boolean;
    hand: Card[];
    faceUp: boolean;
    captures: Card[];
    capturedTricks: number;
    busche: number;
    buscheThisHand: number;
    pointsThisHand: number;
}

/**
 * Usata quando nelle logiche di calcolo deve essere referenziata una carta che non si sa ancora in che mano sia
 */
export interface CardRef {
    suit: string;
    value: number;
}


/**
 * src/domain/domain-types.ts
 * 
 * Definisce l'oggetto costante con i semi disponibili.
 * Usiamo "as const" per dire a TypeScript che queste stringhe sono immutabili (sola lettura).
 */
export const Suits = {
    SPADE: 'spade',
    BASTONI: 'bastoni',
    DENARI: 'denari',
    COPPE: 'coppe'
} as const;

/**
 * Estraiamo il tipo TypeScript dall'oggetto costante.
 * Questo tipo sarà equivalente a: 'spade' | 'bastoni' | 'denari' | 'coppe'
 * e potrà essere usato per il type-checking sia in file TS che JS.
 */
export type Suit = typeof Suits[keyof typeof Suits];


export interface PlayerHandSummary {
    playerId: number;
    name: string;
    points: number;
    tricks: number;
    hasPigugno: boolean;
    scoringCards: Card[];
    captures: Card[];
    buscheEarned: number;
    buscheBeforeHand?: number;
    buscheAfterHand?: number;
}

export interface LastHandSummary {
    handNumber: number;
    dealerId: number | null;
    startingPlayerId: number;
    lastTrickWinnerId: number | null;
    pigugnoWinnerId: number | null;
    players: PlayerHandSummary[];
}

export interface FragileShortSuitInfo {
    isFragile: boolean;
    fragilityScore: number;
    lowCard: Card | null;
    highCard: Card | null;
    reason: string;
}

export interface TenaceSuitInfo {
    isTenace: boolean;
    tension: number;
    seenCount: number;
    handCount: number;
    lowCard: Card | null;
    highCard: Card | null;
    reason: string;
}

export interface DangerousShortSuitInfo {
    isDangerous: boolean;
    dangerScore: number;
    totalPoints?: number;
    maxPower?: number;
    highCards?: number;
    topCards?: number;
    knownDecima?: boolean;
    seenCount?: number;
    reason: string;
}

export interface ShortSuitPriorityInfo {
    count: number;
    shouldVoid: boolean;
    urgency: number;
}

export interface DecimaAnalysisSuitInfo {
    handCount: number;
    playedCount: number;
    seenCount: number;
    mayKnowDecima: boolean;
    missingCards: CardRef[];
    knownMissing: boolean;
    missingCard: CardRef | null;
}

export type DecimaAnalysisInfo = Record<string, DecimaAnalysisSuitInfo | undefined>;

export interface DecimaPressureSuitInfo {
    knownMissing: boolean;
    missingCard: CardRef | null;
    pressure: number;
}

export type DecimaPressureInfo = Record<string, DecimaPressureSuitInfo | undefined>;

export interface FragileEntryInfo {
    suit: string;
    value: number;
    power: number;
}

export interface EntryPreservationInfo {
    entryPreservationMode: boolean;
    entryCount: number;
    entrySuits: string[];
    fragileEntries: FragileEntryInfo[];
}

export interface ForcedTricksEstimate {
    guaranteedHighTricks: number;
    dangerousHighCards: number;
    protectedHighCards: number;
    missingTricks: number;
}

export interface LeadControl {
    wantsLeadControl: boolean;
    avoidLeadControl: boolean;
    intensity: number;
}

export type CiapaETornaMode = "none" | "tirare" | "darla_via";

export interface CiapaETorna {
    active: boolean;
    suit: string | null;
    mode: CiapaETornaMode;
    bonus: number;
    refusalsOnSuit: number;
}

export interface HandPlan {
    hasCovered: boolean;
    hasPigugno: boolean;
    isLeading: boolean;
    shouldPull: boolean;
    shouldGoUnder: boolean;
    mustDumpPigugno: boolean;
    pigugnoUrgency: number;
    protectLastTrick: boolean;
    isLastTrickLikely: boolean;
    endgameMode: EndgameMode;
    fragileShortSuits: Record<string, FragileShortSuitInfo | undefined>;
    tenaceSuits: Record<string, TenaceSuitInfo | undefined>;
    dangerousShortSuits: Record<string, DangerousShortSuitInfo | undefined>;
    shortSuitPriority: Record<string, ShortSuitPriorityInfo | undefined>;
    decimaPressure: DecimaPressureInfo;
    entryPreservation: EntryPreservationInfo;
    leadControl: LeadControl;
    ciapaETorna: CiapaETorna;
    forcedTricksEstimate: any;
    decimeAnalysisInfo: DecimaAnalysisInfo;
}

export interface EndgameMode {
    isEndgame: boolean;
    isVeryLateEndgame: boolean;
    pressure: number;
}

export type CardAllocations = Record<number, Card[]>;

export type RerenderFn = () => void;

export interface ScoredCardEntry {
    card: Card;
    score: number;
}

export interface TrickEntry {
    player: Player;
    card: Card;
}