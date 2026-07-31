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
// types.js
export { };

/**
 * @typedef {Object} Player
 * @property {number} id
 * @property {string} name
 * @property {boolean} isComputer
 * @property { Card[] } hand
 * @property {boolean} faceUp
 * @property { Card[] } captures
 * @property {number} capturedTricks
 * @property {number} busche
 * @property {number} buscheThisHand
 * @property {number} pointsThisHand
 * 
*/


/**
 * Usata quando nelle logiche di calcolo deve essere referenziata una carta che non si sa ancora in che mano sia
 * @typedef {Object} CardRef
 * @property {string} suit
 * @property {number} value
 */

/**
 * @typedef {Object} PlayerHandSummary
 * @property {number} playerId
 * @property {string} name
 * @property {number} points
 * @property {number} tricks
 * @property {boolean} hasPigugno
 * @property {Card[]} scoringCards
 * @property {Card[]} captures
 * @property {number} buscheEarned
 * @property {number} [buscheBeforeHand]
 * @property {number} [buscheAfterHand]
 */

/**
 * @typedef {Object} LastHandSummary
 * @property {number} handNumber
 * @property {number | null} dealerId
 * @property {number} startingPlayerId
 * @property {number | null} lastTrickWinnerId
 * @property {number | null} pigugnoWinnerId
 * @property {PlayerHandSummary[]} players
 */

/**
 * @typedef {Object} FragileShortSuitInfo
 * @property {boolean} isFragile
 * @property {number} fragilityScore
 * @property {Card | null} lowCard
 * @property {Card | null} highCard
 * @property {string} reason
 */

/**
 * @typedef {Object} TenaceSuitInfo
 * @property {boolean} isTenace
 * @property {number} tension
 * @property {number} seenCount
 * @property {number} handCount
 * @property {Card | null} lowCard
 * @property {Card | null} highCard
 * @property {string} reason
 */

/**
 * @typedef {Object} DangerousShortSuitInfo
 * @property {boolean} isDangerous
 * @property {number} dangerScore
 * @property {number} [totalPoints]
 * @property {number} [maxPower]
 * @property {number} [highCards]
 * @property {number} [topCards]
 * @property {boolean} [knownDecima]
 * @property {number} [seenCount]
 * @property {string} reason
 */

/**
 * @typedef {Object} ShortSuitPriorityInfo
 * @property {number} count
 * @property {boolean} shouldVoid
 * @property {number} urgency
 */

/**
 * @typedef {Object} DecimaAnalysisSuitInfo
 * @property {number} handCount
 * @property {number} playedCount
 * @property {number} seenCount
 * @property {boolean} mayKnowDecima
 * @property {CardRef[]} missingCards
 * @property {boolean} knownMissing
 * @property {CardRef|null} missingCard
 */

/**
 * @typedef {Object.<string, DecimaAnalysisSuitInfo>} DecimaAnalysisInfo
 */

/**
 * @typedef {Object} DecimaPressureSuitInfo
 * @property {boolean} knownMissing
 * @property {CardRef|null} missingCard
 * @property {number} pressure
 */

/**
 * @typedef {Object.<string, DecimaPressureSuitInfo>} DecimaPressureInfo
 */

/**
 * @typedef {Object} FragileEntryInfo
 * @property {string} suit
 * @property {number} value
 * @property {number} power
 */

/**
 * @typedef {Object} EntryPreservationInfo
 * @property {boolean} entryPreservationMode
 * @property {number} entryCount
 * @property {string[]} entrySuits
 * @property {FragileEntryInfo[]} fragileEntries
 */

/**
 * @typedef {Object} ForcedTricksEstimate
 * @property {number} guaranteedHighTricks
 * @property {number} dangerousHighCards
 * @property {number} protectedHighCards
 * @property {number} missingTricks
 */

/**
 * @typedef {Object} LeadControl
 * @property {boolean} wantsLeadControl
 * @property {boolean} avoidLeadControl
 * @property {number} intensity
 */

/**
 * @typedef {"none" | "tirare" | "darla_via"} CiapaETornaMode
 */

/**
 * @typedef {Object} CiapaETorna
 * @property {boolean} active
 * @property {string | null} suit
 * @property {CiapaETornaMode} mode
 * @property {number} bonus
 * @property {number} refusalsOnSuit
 */

/**
 * @typedef {Object} HandPlan
 * @property {boolean} hasCovered
 * @property {boolean} hasPigugno
 * @property {boolean} isLeading
 * @property {boolean} shouldPull
 * @property {boolean} shouldGoUnder
 * @property {boolean} mustDumpPigugno
 * @property {number} pigugnoUrgency
 * @property {boolean} protectLastTrick
 * @property {boolean} isLastTrickLikely
 * @property {EndgameMode} endgameMode
 * @property {Record<string, FragileShortSuitInfo | undefined>} fragileShortSuits
 * @property {Record<string, TenaceSuitInfo | undefined>} tenaceSuits
 * @property {Record<string, DangerousShortSuitInfo | undefined>} dangerousShortSuits
 * @property {Record<string, ShortSuitPriorityInfo | undefined>} shortSuitPriority
 * @property {DecimaPressureInfo} decimaPressure
 * @property {EntryPreservationInfo} entryPreservation
 * @property {LeadControl} leadControl
 * @property {CiapaETorna} ciapaETorna
 * @property {any} forcedTricksEstimate
 * @property {DecimaAnalysisInfo} decimeAnalysisInfo
 */

/**
 * @typedef {Object} EndgameMode
 * @property {boolean} isEndgame
 * @property {boolean} isVeryLateEndgame
 * @property {number} pressure
 */



/**
 * @typedef {Record<number, Card[]>} CardAllocations
 */

/**
 * @callback RerenderFn
 * @returns {void}
 */

/**
 * @typedef {Object} ScoredCardEntry
 * @property {Card} card
 * @property {number} score
 */

/**
 * @typedef {Object} TrickEntry
 * @property {Player} player
 * @property {Card} card
 */

