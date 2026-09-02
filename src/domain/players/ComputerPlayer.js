/**
 * @typedef {import('../domain-types').CiapaETorna} CiapaETorna
 * @typedef {import('../domain-types').CiapaETornaMode} CiapaETornaMode
 * @typedef {import('../domain-types').DangerousShortSuitInfo} DangerousShortSuitInfo
 * @typedef {import('../domain-types').DecimaAnalysisInfo} DecimaAnalysisInfo
 * @typedef {import('../domain-types').DecimaAnalysisSuitInfo} DecimaAnalysisSuitInfo
 * @typedef {import('../domain-types').DecimaPressureInfo} DecimaPressureInfo
 * @typedef {import('../domain-types').DecimaPressureSuitInfo} DecimaPressureSuitInfo
 * @typedef {import('../domain-types').EntryPreservationInfo} EntryPreservationInfo
 * @typedef {import('../domain-types').ForcedTricksEstimate} ForcedTricksEstimate
 * @typedef {import('../domain-types').FragileShortSuitInfo} FragileShortSuitInfo
 * @typedef {import('../domain-types').HandPlan} HandPlan
 * @typedef {import('../domain-types').MatchPlan} MatchPlan 
 * @typedef {import('../domain-types').LeadControl} LeadControl
 * @typedef {import('../domain-types').Player} Player
 * @typedef {import('../domain-types').ScoredCardEntry} ScoredCardEntry
 * @typedef {import('../domain-types').ShortSuitPriorityInfo} ShortSuitPriorityInfo
 * @typedef {import('../domain-types').TenaceSuitInfo} TenaceSuitInfo
 * @typedef {import('../domain-types').TrickEntry} TrickEntry
 * @typedef {import('../domain-types').Trick} Trick
 * 
 * @typedef {import('../../domain/cards/Card').Card} Card 
 */

import { CardSorter } from '../../domain/cards/CardSorter'
import { Suits } from '../domain-types.js';

import { GameState } from "../game/GameState.js";
import * as gh from "./computer/generic-helpers.js";
import * as hph from "./computer/handplan-helpers.js";
import * as ev from './computer/strategy-evaluators.js';
import * as scoreev from './computer/score-evaluators.js';


/**
 * AI base per la scelta della carta da giocare.
 *
 */
export default class ComputerPlayer {
    static ISDEBUG = false;
    static RANDOM_PLAY_PROBABILITY = 0.05; // fattore aleatorio per imprevedibilità


    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {boolean} ISDEBUG
     */
    chooseCard(gameState, playerId, ISDEBUG) {
        this.ISDEBUG = ISDEBUG;
        if (ISDEBUG) {
            this.RANDOM_PLAY_PROBABILITY = 0; // no randomness in debug
        }

        const currentPlayer = gameState.getCurrentPlayer();
        if (!currentPlayer || playerId !== currentPlayer.id) {
            throw new Error(
                `ComputerPlayer: playerId ${playerId} non è il giocatore che deve giocare ora!`
            );
        }


        const player = gameState.getPlayerById(playerId);
        if (!player) {
            throw new Error(`ComputerPlayer: giocatore ${playerId} non trovato`);
        }


        const playableCards = gameState.getPlayableCards(playerId);
        if (!playableCards.length) {
            throw new Error(`ComputerPlayer: nessuna carta giocabile per ${player.name}`);
        }

        // defines a function for logging to pass to evaluate methods
        /** @param {string} msg */
        const log = (msg) => this.#log(player.name, msg);

        log("vediamo cosa giocare...");

        if (Math.random() < ComputerPlayer.RANDOM_PLAY_PROBABILITY) {
            const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
            this.#log(player.name, `gioco a caso ${randomCard.toString()}`);
            return randomCard;
        }


        const handPlan = this.buildHandStrategy(gameState, player, log);
        const matchPlan = this.buildMatchStrategy(gameState, player, log);


        log(`strategia di mano: ${JSON.stringify(handPlan)}`);
        log(`strategia di partita: ${JSON.stringify(matchPlan)}`);

        /** @type {ScoredCardEntry[]} */
        const scoredCards = playableCards.map((card) => {
            const score = scoreev.scorePlayableCard(gameState, player, card, handPlan, matchPlan, log);
            log(`score ${card.toString()} = ${score}`);
            return { card, score };
        });


        scoredCards.sort((a, b) => b.score - a.score);


        const bestScore = scoredCards[0].score;
        const topCards = scoredCards.filter((entry) => entry.score === bestScore);
        const chosen = gh.breakTies(topCards).card;


        log(`scelgo ${chosen.toString()} con score ${bestScore}`);
        return chosen;
    }


    /**
     * @param {any} playerName
     * @param {any} message
     */
    #log(playerName, message) {
        if (!this.ISDEBUG) return;
        console.log(`${playerName}: "${message}"`);
    }


    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @retrun {number}
     */
    #countTakenTricks(gameState, playerId) {
        const player = gameState.getPlayerById(playerId);
        return player?.captures?.length
            ? Math.floor(player.captures.length / gameState.players.length)
            : 0;
    }


    /**
     *@param {GameState} gameState
     * @param {number} playerId
     */
    #hasCovered(gameState, playerId) {
        return this.#countTakenTricks(gameState, playerId) > 0;
    }


    /* 
     * Valutazione e peso delle differenti stratgie
     */


    /**
     * @param {GameState} gameState
     * @param {Player} player
     * @param {(msg: string) => void} log
     * @returns {HandPlan}
     */
    buildHandStrategy(gameState, player, log) {
        const playerId = player.id;
        const hand = gameState.getPlayerHand(playerId);
        const hasCovered = this.#hasCovered(gameState, playerId);
        const hasPigugno = hand.some(card => card.isPigugno());
        const isLeading = gameState.getCurrentTrick().length === 0;
        const isLastTrickLikely = hph.isLastTrickLikely(gameState, playerId);
        const forcedTricksEstimate = this.estimateForcedTricks(gameState, playerId);
        const decimeAnalysisInfo = this.analyzeDecime(gameState, playerId, log);

        const shouldPull = ev.evaluatePull(gameState, player, hand, forcedTricksEstimate, hasCovered, log);
        const shouldGoUnder = hasCovered && !shouldPull;
        const protectLastTrick = !shouldPull && isLastTrickLikely;

        const endgameMode = ev.evaluateEndgameMode(gameState, player, hand, forcedTricksEstimate, hasCovered, log);
        const shortSuitPriority = ev.evaluateShortSuitPriority(hand);
        const dangerousShortSuits = ev.evaluateDangerousShortSuits(
            gameState,
            player,
            hand,
            shortSuitPriority,
            decimeAnalysisInfo,
            shouldPull,
            log
        );
        const fragileShortSuits = ev.evaluateFragileShortSuits(player, hand, shouldPull, log);
        const tenaceSuits = ev.evaluateTenaceSuits(player, hand, decimeAnalysisInfo, shouldPull, log);
        const pigugnoUrgency = ev.evaluatePigugnoUrgency(player, hand, hasCovered, shouldPull, log);
        const decimaPressure = ev.evaluateDecimaPressure(player, decimeAnalysisInfo, shouldPull, log);
        const leadControl = ev.evaluateLeadControl(player, hand, shouldPull, hasCovered, log);
        const entryPreservation = ev.evaluateEntryPreservation(player, hand, shouldPull, log);
        const ciapaETorna = ev.evaluateCiapaETorna(gameState, player, hand, shouldPull, hasCovered, decimeAnalysisInfo, log);

        return {
            hasCovered,
            hasPigugno,
            isLeading,
            shouldPull,
            shouldGoUnder,
            mustDumpPigugno: pigugnoUrgency >= 70,
            pigugnoUrgency,
            protectLastTrick,
            isLastTrickLikely,
            endgameMode,
            shortSuitPriority,
            tenaceSuits,
            decimaPressure,
            dangerousShortSuits,
            fragileShortSuits,
            leadControl,
            entryPreservation,
            ciapaETorna,
            forcedTricksEstimate,
            decimeAnalysisInfo,
        };
    }


    /**
     * @param {GameState} gameState
     * @param {Player} player
     * @param {(msg: string) => void} log
     * @returns {MatchPlan}
     */
    buildMatchStrategy(gameState, player, log) {
        return {
            player,
            preferBuscheOnAlivePlayers: true,
            preferAvoidHelpingEliminatedPlayers: true,
            canSetUpDoubleExit: false,
            notes: "struttura pronta per futura strategia di partita basata sulle busche",
        };
    }





    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {(msg: string) => void} log
     * @returns {DecimaAnalysisInfo}
     */
    analyzeDecime(gameState, playerId, log) {
        const player = gameState.getPlayerById(playerId);
        const hand = gameState.getPlayerHand(playerId);

        const suits = Object.values(Suits);
        /** @type {DecimaAnalysisInfo} */
        const result = {};


        for (const suit of suits) {
            const handSuitCards = gh.getSuitCards(hand, suit);
            const playedSuitCards = this.#getPlayedCardsBySuit(gameState, suit);
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


        log(`analisi decime: ${JSON.stringify(result)}`);
        return result;
    }


    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @returns {ForcedTricksEstimate}
     */
    estimateForcedTricks(gameState, playerId) {
        const player = gameState.getPlayerById(playerId);
        const hand = gameState.getPlayerHand(playerId);


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

        /**  @type {ForcedTricksEstimate} */
        const result = {
            guaranteedHighTricks,
            dangerousHighCards,
            protectedHighCards,
            missingTricks,
        };


        this.#log(player.name, `stima prese forzate: ${JSON.stringify(result)}`);
        return result;
    }


    /**
     * @param {GameState} gameState
     * @param {string} suit
     * @returns {Card[]}
     */
    #getPlayedCardsBySuit(gameState, suit) {
        const history = gameState.completedTricks || [];
        const cards = [];

        for (const trick of history) {
            for (const entry of trick) {
                if (entry?.card?.suit === suit) {
                    cards.push(entry.card);
                }
            }
        }

        const currentTrick = gameState.getCurrentTrick?.() || [];
        for (const entry of currentTrick) {
            if (entry?.card?.suit === suit) {
                cards.push(entry.card);
            }
        }


        return cards;
    }

}