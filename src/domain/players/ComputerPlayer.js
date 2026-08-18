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
 * @typedef {import('../domain-types').LeadControl} LeadControl
 * @typedef {import('../domain-types').Player} Player
 * @typedef {import('../domain-types').ScoredCardEntry} ScoredCardEntry
 * @typedef {import('../domain-types').ShortSuitPriorityInfo} ShortSuitPriorityInfo
 * @typedef {import('../domain-types').TenaceSuitInfo} TenaceSuitInfo
 * @typedef {import('../domain-types').TrickEntry} TrickEntry
 * 
 * @typedef {import('../../domain/cards/Card').Card} Card 
 */

import { CardSorter } from '../../domain/cards/CardSorter'
import { Suits } from '../domain-types.js';

import { GameState } from "../game/GameState.js";
import * as gh from "./computer/generic-helpers.js";
import * as hph from "./computer/handplan-helpers.js";


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


        this.#log(player.name, "vediamo cosa giocare...");


        if (Math.random() < ComputerPlayer.RANDOM_PLAY_PROBABILITY) {
            const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
            this.#log(player.name, `gioco a caso ${randomCard.toString()}`);
            return randomCard;
        }


        const handPlan = this.buildHandStrategy(gameState, playerId);
        const matchPlan = this.buildMatchStrategy(gameState, playerId);


        this.#log(player.name, `strategia di mano: ${JSON.stringify(handPlan)}`);
        this.#log(player.name, `strategia di partita: ${JSON.stringify(matchPlan)}`);

        /** @type {ScoredCardEntry[]} */
        const scoredCards = playableCards.map((card) => {
            const score = this.scorePlayableCard(gameState, playerId, card, handPlan, matchPlan);
            this.#log(player.name, `score ${card.toString()} = ${score}`);
            return { card, score };
        });


        scoredCards.sort((a, b) => b.score - a.score);


        const bestScore = scoredCards[0].score;
        const topCards = scoredCards.filter((entry) => entry.score === bestScore);
        const chosen = gh.breakTies(topCards).card;


        this.#log(player.name, `scelgo ${chosen.toString()} con score ${bestScore}`);
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
     * @returns {Card[]}
     */
    #getPlayerHand(gameState, playerId) {
        const player = gameState.getPlayerById(playerId);
        return player?.hand || [];
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


    /**
     *@param {GameState} gameState
     * @param {number} playerId
     */
    #isLastTrickLikely(gameState, playerId) {
        const hand = this.#getPlayerHand(gameState, playerId);
        return hand.length <= 1;
    }


    /**
     * @param {GameState} gameState
     * @returns {TrickEntry | null}
     */
    #getCurrentWinningEntry(gameState) {
        const trick = gameState.getCurrentTrick();
        if (!trick.length) return null;

        const leadingSuit = gameState.getLeadingSuit();
        if (!leadingSuit) return null;

        const candidates = trick.filter((entry) => entry.card.suit === leadingSuit);
        if (!candidates.length) return null;

        let best = candidates[0];

        for (const entry of candidates.slice(1)) {
            if (CardSorter.compare(entry.card, best.card) > 0) {
                best = entry;
            }
        }

        return best;
    }


    /**
     * @param {GameState} gameState
     * @param {Card} card
     */
    #canCardWinCurrentTrick(gameState, card) {
        const trick = gameState.getCurrentTrick();
        if (!trick.length) return true;


        const leadingSuit = gameState.getLeadingSuit();
        if (!leadingSuit) return false;
        if (card.suit !== leadingSuit) return false;


        const currentWinningEntry = this.#getCurrentWinningEntry(gameState);
        if (!currentWinningEntry) return false;


        return CardSorter.compare(card, currentWinningEntry.card) > 0;
    }


    /**
     * @param {GameState} gameState
     * @returns {number}
     */
    #estimateCurrentTrickPoints(gameState) {
        const trick = gameState.getCurrentTrick();
        return trick.reduce((/** @type {number} */ sum, /** @type {{ card: { getPoints(): number; }; }} */ entry) => sum + entry.card.getPoints(), 0);
    }



    /**
     * @param {GameState} gameState
     * @param {number} playerId
     */
    #isForcedToFollow(gameState, playerId) {
        const leadingSuit = gameState.getLeadingSuit();
        if (!leadingSuit) return false;


        const hand = this.#getPlayerHand(gameState, playerId);
        return hand.some((/** @type {Card} */ card) => card.suit === leadingSuit);
    }



    /* 
     * Valutazione e peso delle differenti stratgie
     */


    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @returns {HandPlan}
     */
    buildHandStrategy(gameState, playerId) {
        const hand = this.#getPlayerHand(gameState, playerId);
        const hasCovered = this.#hasCovered(gameState, playerId);
        const hasPigugno = hand.some(card => card.isPigugno());
        const isLeading = gameState.getCurrentTrick().length === 0;
        const isLastTrickLikely = this.#isLastTrickLikely(gameState, playerId);
        const forcedTricksEstimate = this.estimateForcedTricks(gameState, playerId);
        const decimeAnalysisInfo = this.analyzeDecime(gameState, playerId);

        const shouldPull = this.#evaluatePull(gameState, playerId, hand, forcedTricksEstimate);
        const shouldGoUnder = hasCovered && !shouldPull;
        const protectLastTrick = !shouldPull && isLastTrickLikely;

        const endgameMode = this.#evaluateEndgameMode(gameState, playerId, hand, forcedTricksEstimate);
        const shortSuitPriority = this.#evaluateShortSuitPriority(hand);
        const dangerousShortSuits = this.#evaluateDangerousShortSuits(
            gameState,
            playerId,
            hand,
            shortSuitPriority,
            decimeAnalysisInfo,
            shouldPull
        );
        const fragileShortSuits = this.#evaluateFragileShortSuits(gameState, playerId, hand, shouldPull);
        const tenaceSuits = this.#evaluateTenaceSuits(gameState, playerId, hand, decimeAnalysisInfo, shouldPull);
        const pigugnoUrgency = this.#evaluatePigugnoUrgency(gameState, playerId, hand, hasCovered, shouldPull);
        const decimaPressure = this.#evaluateDecimaPressure(gameState, playerId, decimeAnalysisInfo, shouldPull);
        const leadControl = this.#evaluateLeadControl(gameState, playerId, hand, shouldPull, hasCovered);
        const entryPreservation = this.#evaluateEntryPreservation(gameState, playerId, hand, shouldPull);
        const ciapaETorna = this.#evaluateCiapaETorna(gameState, playerId, hand, shouldPull, hasCovered, decimeAnalysisInfo);

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
     * @param {number} playerId
     */
    buildMatchStrategy(gameState, playerId) {
        return {
            playerId,
            preferBuscheOnAlivePlayers: true,
            preferAvoidHelpingEliminatedPlayers: true,
            canSetUpDoubleExit: false,
            notes: "struttura pronta per futura strategia di partita basata sulle busche",
        };
    }


    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card} card
     * @param {HandPlan} handPlan
     * @param {any} matchPlan
     */
    scorePlayableCard(gameState, playerId, card, handPlan, matchPlan) {
        const trick = gameState.getCurrentTrick();
        if (!trick.length) {
            return this.scoreLeadCard(gameState, playerId, card, handPlan, matchPlan);
        }


        if (this.#isForcedToFollow(gameState, playerId)) {
            return this.scoreFollowCard(gameState, playerId, card, handPlan, matchPlan);
        }


        return this.scoreRefuseCard(gameState, playerId, card, handPlan, matchPlan);
    }


    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card} card
     * @param {HandPlan} handPlan
     * @param {any} matchPlan
     */
    scoreLeadCard(gameState, playerId, card, handPlan, matchPlan) {
        let score = 0;
        /** @type {Player | null} */
        const player = gameState.getPlayerById(playerId);
        if (!player) {
            throw new Error(`ComputerPlayer: giocatore ${playerId} non trovato`);
        }

        this.#log(player.name, `valuto apertura con ${card.toString()}`);

        if (handPlan.shouldPull) {
            score += 40;
            score += card.getPoints() * 8;
            score += CardSorter.cardPower(card) * 3;

            if (handPlan.endgameMode.isEndgame && CardSorter.cardPower(card) >= 8) {
                score += 20;
                this.#log(player.name, `endgame aggressivo: apro alto mentre tiro`);
            }

            if (card.isPigugno()) score -= 200;
            this.#log(player.name, `modalità tirare: bonus aggressivo su ${card.toString()}`);
            return score;
        }

        score -= card.getPoints() * 10;
        score -= CardSorter.cardPower(card);

        if (card.isPigugno()) {
            score -= 120;
            score -= handPlan.pigugnoUrgency;
            this.#log(player.name, `evito di aprire col pigugno`);
        }

        const hand = this.#getPlayerHand(gameState, playerId);
        const suitCount = gh.countSuit(hand, card.suit);
        const dangerousShortSuit = hph.isDangerousShortSuit(handPlan, card.suit);
        const tenaceSuit = hph.isTenaceSuit(handPlan, card.suit);
        const wantsLeadControl = handPlan.leadControl?.wantsLeadControl;
        const avoidLeadControl = handPlan.leadControl?.avoidLeadControl;
        const ciapaETorna = handPlan.ciapaETorna;
        const isEntrySuit = hph.isEntrySuit(handPlan, card.suit);
        const isFragileEntry = hph.isFragileEntryCard(handPlan, card);

        if (suitCount <= 2) {
            if (dangerousShortSuit) {
                const malus = Math.floor(hph.getShortSuitDangerScore(handPlan, card.suit) / 2);
                score -= malus;
                this.#log(
                    player.name,
                    `seme corto ${card.suit} ma pericoloso da svuotare: malus ${malus}`
                );
            } else if (hph.isFragileShortSuit(handPlan, card.suit) && !handPlan.shouldPull) {
                const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 2);
                score -= malus;
                this.#log(
                    player.name,
                    `seme corto ${card.suit} fragile (tipo 5–2): evito di svuotarlo in apertura, malus ${malus}`
                );
            } else {
                score += 10;
                score += hph.getShortSuitUrgency(handPlan, card.suit);
                this.#log(player.name, `seme corto ${card.suit}: possibile preparare rifiuto più avanti`);
                this.#log(player.name, `apro in seme corto ${card.suit} per provare a svuotarlo`);
            }
        }

        if (tenaceSuit) {
            const malus = Math.floor(hph.getTenaceTension(handPlan, card.suit) / 2);
            score -= malus;
            this.#log(player.name, `evito di aprire il seme tenace ${card.suit}: malus ${malus}`);
        }

        if (handPlan.protectLastTrick && card.getPoints() === 0) {
            score += 12;
            this.#log(player.name, `provo a liberarmi di una carta bassa pensando all'ultima presa`);
        }

        if (handPlan.endgameMode.isEndgame) {
            if (card.getPoints() === 0) {
                score += 8;
                this.#log(player.name, `endgame: preferisco uscire con carta leggera`);
            } else {
                score -= 8;
            }
        }

        if (hph.isKnownDecimaSuit(handPlan, card.suit)) {
            const missing = hph.getKnownMissingCardForSuit(handPlan, card.suit);
            score += handPlan.decimaPressure[card.suit].pressure;

            if (missing) {
                this.#log(
                    player.name,
                    `seme ${card.suit} leggibile a decima; manca ${missing.value} di ${missing.suit}`
                );
            }
        }
        if (wantsLeadControl && CardSorter.cardPower(card) >= 8) {
            score += 12;
            this.#log(player.name, `voglio il lead control: bonus su apertura forte`);
        }

        if (avoidLeadControl && CardSorter.cardPower(card) >= 8 && !handPlan.shouldPull) {
            score -= 14;
            this.#log(player.name, `preferisco non tenere il lead: malus su apertura troppo forte`);
        }

        if (handPlan.entryPreservation?.entryPreservationMode) {
            if (isFragileEntry) {
                score -= 18;
                this.#log(player.name, `proteggo una entry fragile: evito di aprire con ${card.toString()}`);
            } else if (isEntrySuit && CardSorter.cardPower(card) >= 8) {
                score -= 10;
                this.#log(player.name, `preservo un seme-entry per dopo`);
            }
        }

        if (ciapaETorna?.active && ciapaETorna.suit === card.suit) {
            let bonus = ciapaETorna.bonus;

            if (dangerousShortSuit || tenaceSuit) {
                bonus = Math.floor(bonus / 2);
            }

            score += bonus;
            this.#log(
                player.name,
                `ciapa e torna su ${card.suit} (${ciapaETorna.mode}): bonus ${bonus}`
            );
        }
        return score;
    }


    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card} card
     * @param {HandPlan} handPlan
     * @param {any} matchPlan
     */
    scoreFollowCard(gameState, playerId, card, handPlan, matchPlan) {
        let score = 0;
        /** @type {Player | null} */
        const player = gameState.getPlayerById(playerId);
        if (!player) {
            throw new Error(`ComputerPlayer: giocatore ${playerId} non trovato`);
        }
        const canWin = this.#canCardWinCurrentTrick(gameState, card);
        const trickPoints = this.#estimateCurrentTrickPoints(gameState);
        const currentWinner = this.#getCurrentWinningEntry(gameState)?.card || null;
        const dangerousShortSuit = hph.isDangerousShortSuit(handPlan, card.suit);
        const fragileShortSuit = hph.isFragileShortSuit(handPlan, card.suit);
        const tenaceSuit = hph.isTenaceSuit(handPlan, card.suit);

        this.#log(
            player.name,
            `valuto risposta con ${card.toString()}; canWin=${canWin}; trickPoints=${trickPoints}`
        );

        if (handPlan.shouldPull) {
            if (canWin) {
                score += 100;
                score += trickPoints * 20;
                score += CardSorter.cardPower(card);

                if (handPlan.leadControl?.wantsLeadControl) {
                    score += 10;
                    this.#log(player.name, `prendere ora mi dà lead control utile`);
                }

                if (handPlan.endgameMode.isEndgame) {
                    score += 20;
                    this.#log(player.name, `endgame + tirare: massimizzo presa`);
                }

                if (card.isPigugno()) score -= 60;
                this.#log(player.name, `sto tirando: se posso prendere, spingo forte`);
            } else {
                score -= 40;
                score -= card.getPoints() * 5;

                if (handPlan.endgameMode.isEndgame) {
                    score -= 12;
                }

                if (fragileShortSuit) {
                    const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 3);
                    score -= malus;
                    this.#log(
                        player.name,
                        `anche tirando, consumo una carta di seme corto fragile ${card.suit}: malus ${malus}`
                    );
                }

                this.#log(player.name, `sto tirando ma questa non prende`);
            }
            return score;
        }

        if (!handPlan.hasCovered) {
            if (canWin) {
                score += 80;
                score -= card.getPoints() * 8;
                score -= CardSorter.cardPower(card);
                score -= trickPoints * 6;

                if (handPlan.leadControl?.wantsLeadControl) {
                    score += 8;
                    this.#log(player.name, `presa economica con lead utile dopo`);
                }

                if (handPlan.endgameMode.isEndgame) {
                    score += 10;
                    this.#log(player.name, `endgame senza presa ancora fatta: accetto presa economica`);
                }

                this.#log(player.name, `non ho ancora coperto: provo una presa economica`);
            } else {
                score -= 20;
                score -= card.getPoints() * 4;
                score -= CardSorter.cardPower(card);

                if (handPlan.entryPreservation?.entryPreservationMode && hph.isFragileEntryCard(handPlan, card)) {
                    score -= 14;
                    this.#log(player.name, `sto consumando una fragile entry senza coprire`);
                }

                if (tenaceSuit) {
                    const malus = hph.isTenaceLowCard(handPlan, card)
                        ? Math.floor(hph.getTenaceTension(handPlan, card.suit) / 2)
                        : Math.floor(hph.getTenaceTension(handPlan, card.suit) / 3);
                    score -= malus;
                    this.#log(
                        player.name,
                        `non copro e consumo una carta del seme tenace ${card.suit}: malus ${malus}`
                    );
                }

                if (dangerousShortSuit) {
                    const malus = Math.floor(hph.getShortSuitDangerScore(handPlan, card.suit) / 3);
                    score -= malus;
                    this.#log(
                        player.name,
                        `non copro e questa appartiene a un seme corto tossico (${card.suit}): malus ${malus}`
                    );
                } else if (fragileShortSuit && !handPlan.shouldPull) {
                    const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 3);
                    score -= malus;
                    this.#log(
                        player.name,
                        `consumo carta di seme corto fragile ${card.suit} senza tirare: malus ${malus}`
                    );
                }

                this.#log(player.name, `non copro ancora, ma questa non riesce a prendere`);
            }
            return score;
        }

        if (handPlan.shouldGoUnder) {
            if (canWin) {
                score -= 70;
                score -= trickPoints * 12;
                score -= card.getPoints() * 10;

                if (handPlan.leadControl?.avoidLeadControl) {
                    score -= 10;
                    this.#log(player.name, `prendere adesso mi lascia un lead scomodo`);
                }

                if (handPlan.endgameMode.isVeryLateEndgame && card.getPoints() > 0) {
                    score -= 25;
                    this.#log(player.name, `endgame tardissimo: prendere ora con punti è pessimo`);
                }

                if (card.isPigugno()) {
                    score += handPlan.pigugnoUrgency;
                    this.#log(player.name, `se devo prendere col pigugno almeno provo a liberarmene`);
                }

                this.#log(player.name, `ho già coperto: evitare di prendere`);
            } else {
                score += 60;
                score -= card.getPoints() * 3;

                if (currentWinner && card.suit === currentWinner.suit) {
                    const delta = gh.rankDistance(card, currentWinner);
                    score += Math.min(delta, 8);
                }

                if (handPlan.protectLastTrick && card.getPoints() === 0) {
                    score += 8;
                }

                if (tenaceSuit) {
                    const malus = hph.isTenaceLowCard(handPlan, card)
                        ? Math.floor(hph.getTenaceTension(handPlan, card.suit) / 2)
                        : Math.floor(hph.getTenaceTension(handPlan, card.suit) / 3);
                    score -= malus;
                    this.#log(
                        player.name,
                        `vado sotto ma sto consumando il seme tenace ${card.suit}: malus ${malus}`
                    );
                }

                if (dangerousShortSuit) {
                    const malus = Math.floor(hph.getShortSuitDangerScore(handPlan, card.suit) / 4);
                    score -= malus;
                    this.#log(
                        player.name,
                        `vado sotto, ma su seme corto tossico ${card.suit}: malus ${malus}`
                    );
                } else if (fragileShortSuit && !handPlan.shouldPull) {
                    const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 3);
                    score -= malus;
                    this.#log(
                        player.name,
                        `vado sotto ma consumo un seme corto fragile ${card.suit}: malus ${malus}`
                    );
                }

                if (handPlan.endgameMode.isEndgame && card.getPoints() === 0) {
                    score += 10;
                    this.#log(player.name, `endgame: sotto con carta innocua`);
                }

                this.#log(player.name, `vado sotto volentieri con ${card.toString()}`);
            }
        }

        if (card.isPigugno()) {
            if (canWin) {
                score += 40;
                score -= handPlan.pigugnoUrgency / 2;
                this.#log(player.name, `pigugno in presa: situazione delicata`);
            } else {
                score += 120 + handPlan.pigugnoUrgency;
                this.#log(player.name, `ottimo: pigugno giocato sotto, provo a scaricarlo`);
            }
        }

        if (hph.isKnownDecimaSuit(handPlan, card.suit)) {
            score += handPlan.decimaPressure[card.suit].pressure / 2;
            this.#log(player.name, `risposta su seme leggibile a decima`);
        }

        return score;
    }


    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card} card
     * @param {HandPlan} handPlan
     * @param {any} matchPlan
     */
    scoreRefuseCard(gameState, playerId, card, handPlan, matchPlan) {
        let score = 0;
        const player = gameState.getPlayerById(playerId);
        const points = card.getPoints();
        const dangerousShortSuit = hph.isDangerousShortSuit(handPlan, card.suit);
        const fragileShortSuit = hph.isFragileShortSuit(handPlan, card.suit);
        const tenaceSuit = hph.isTenaceSuit(handPlan, card.suit);

        this.#log(player.name, `valuto rifiuto con ${card.toString()}`);

        if (handPlan.shouldPull) {
            score -= points * 4;

            if (fragileShortSuit) {
                const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 3);
                score -= malus;
                this.#log(player.name, `sto tirando ma svuoto un seme fragile ${card.suit}: malus ${malus}`);
            }

            if (card.isPigugno()) score -= 200;
            this.#log(player.name, `sto tirando: rifiuto sgradito`);
            return score;
        }

        score += points * 25;
        score += CardSorter.cardPower(card);

        if (card.value == 1) {
            score += 30;
            this.#log(player.name, `scaricare un asso in rifiuto è ottimo`);
        }

        if (card.isPigugno()) {
            score += 260 + handPlan.pigugnoUrgency;
            this.#log(player.name, `pigugno da scaricare a tutti i costi`);
        }

        const suitInfo = handPlan.shortSuitPriority?.[card.suit];
        if (dangerousShortSuit) {
            const malus = Math.floor(hph.getShortSuitDangerScore(handPlan, card.suit) / 2);
            score -= malus;
            this.#log(
                player.name,
                `rifiuto su seme corto ${card.suit}, ma è tossico da svuotare: malus ${malus}`
            );
        } else if (fragileShortSuit && !handPlan.shouldPull) {
            const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 2);
            score -= malus;
            this.#log(
                player.name,
                `rifiuto su seme corto fragile ${card.suit}: evito di svuotarlo troppo presto, malus ${malus}`
            );
        } else if (suitInfo?.shouldVoid) {
            score += suitInfo.urgency;
            this.#log(player.name, `rifiuto su seme corto ${card.suit}: provo a svuotarlo`);
        }

        if (tenaceSuit) {
            const malus = hph.isTenaceLowCard(handPlan, card)
                ? Math.floor(hph.getTenaceTension(handPlan, card.suit) / 2)
                : Math.floor(hph.getTenaceTension(handPlan, card.suit) / 3);
            score -= malus;
            this.#log(player.name, `rifiuto sul seme tenace ${card.suit}: malus ${malus}`);
        }

        if (handPlan.entryPreservation?.entryPreservationMode && hph.isFragileEntryCard(handPlan, card)) {
            score -= 14;
            this.#log(player.name, `sto consumando una fragile entry in rifiuto`);
        }

        if (handPlan.endgameMode.isEndgame) {
            score += points * 8;
            if (points === 0) score -= 10;
            this.#log(player.name, `endgame: rifiuto più orientato a scaricare peso`);
        }

        if (handPlan.protectLastTrick && points === 0) {
            score -= 15;
            this.#log(player.name, `meglio tenere basse innocue per l'ultima presa`);
        }

        if (hph.isKnownDecimaSuit(handPlan, card.suit)) {
            score += handPlan.decimaPressure[card.suit].pressure / 2;
            this.#log(player.name, `rifiuto su seme leggibile a decima`);
        }

        return score;
    }


    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @returns {DecimaAnalysisInfo}
     */
    analyzeDecime(gameState, playerId) {
        const player = gameState.getPlayerById(playerId);
        const hand = this.#getPlayerHand(gameState, playerId);

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


        this.#log(player.name, `analisi decime: ${JSON.stringify(result)}`);
        return result;
    }


    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @returns {ForcedTricksEstimate}
     */
    estimateForcedTricks(gameState, playerId) {
        const player = gameState.getPlayerById(playerId);
        const hand = this.#getPlayerHand(gameState, playerId);


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

    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card[]} hand
     * @param {ForcedTricksEstimate} forcedTricksEstimate
     */
    #evaluateEndgameMode(gameState, playerId, hand, forcedTricksEstimate) {
        const player = gameState.getPlayerById(playerId);
        const handSize = hand.length;
        const hasCovered = this.#hasCovered(gameState, playerId);

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

        this.#log(player.name, `valuto endgame: ${JSON.stringify(mode)}`);
        return mode;
    }

    /**
     * @param {Card[]} hand
     * @returns {Record<string, ShortSuitPriorityInfo>}
     */
    #evaluateShortSuitPriority(hand) {
        const suits = Object.values(Suits);
        /** @type {Partial<Record<import('../../domain-types').Suit, ShortSuitPriorityInfo>>} */
        const priorities = {};

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

    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card[]} hand
     * @param {boolean} hasCovered
     * @param {boolean} shouldPull
     */
    #evaluatePigugnoUrgency(gameState, playerId, hand, hasCovered, shouldPull) {
        const player = gameState.getPlayerById(playerId);
        const hasPigugno = hand.some((/** @type {any} */ card) => card.isPigugno());

        if (!hasPigugno) return 0;

        let urgency = 40;
        if (hasCovered) urgency += 25;
        if (!shouldPull) urgency += 15;
        if (hand.length <= 5) urgency += 10;
        if (hand.length <= 3) urgency += 15;

        this.#log(player.name, `urgenza pigugno: ${urgency}`);
        return urgency;
    }

    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Record<string, DecimaAnalysisSuitInfo>} decimeAnalysisInfo
     * @param {boolean} shouldPull
     * @returns {DecimaPressureInfo}
     */
    #evaluateDecimaPressure(gameState, playerId, decimeAnalysisInfo, shouldPull) {
        const player = gameState.getPlayerById(playerId);
        /** @type {Record<string, DecimaPressureSuitInfo>} */
        const result = {};

        for (const [suit, info] of Object.entries(decimeAnalysisInfo)) {
            result[suit] = {
                knownMissing: info.knownMissing,
                missingCard: info.missingCard,
                pressure: info.knownMissing ? (shouldPull ? 12 : 22) : 0,
            };
        }

        this.#log(player.name, `pressione decime: ${JSON.stringify(result)}`);
        return result;
    }

    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card[]} hand
    * @param {Record<string, ShortSuitPriorityInfo>} shortSuitPriority
    * @param {Record<string, DecimaAnalysisSuitInfo>} decimeAnalysisInfo
     * @param {boolean} shouldPull
     * @returns {Record<string, DangerousShortSuitInfo>}
     */
    #evaluateDangerousShortSuits(gameState, playerId, hand, shortSuitPriority, decimeAnalysisInfo, shouldPull) {
        const player = gameState.getPlayerById(playerId);
        const suits = Object.values(Suits);
        /** @type {Record<string, DangerousShortSuitInfo>} */
        const result = {};

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

            const totalPoints = suitCards.reduce((/** @type {number} */ sum, /** @type {Card} */ card) => sum + card.getPoints(), 0);
            const maxPower = suitCards.reduce((/** @type {number} */ max, /** @type {Card} */ card) => Math.max(max, CardSorter.cardPower(card)), 0);
            const highCards = suitCards.filter((/** @type {Card} */ card) => CardSorter.cardPower(card) >= 8).length;
            const topCards = suitCards.filter((/** @type {Card} */ card) => CardSorter.cardPower(card) >= 9).length;
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

        this.#log(player.name, `semi corti pericolosi: ${JSON.stringify(result)}`);
        return result;
    }

    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card[]} hand
     * @param {DecimaAnalysisInfo} decimeAnalysisInfo
     * @param {boolean} shouldPull
     * @returns {Record<string, TenaceSuitInfo>}
     */
    #evaluateTenaceSuits(gameState, playerId, hand, decimeAnalysisInfo, shouldPull) {
        const player = gameState.getPlayerById(playerId);
        const suits = Object.values(Suits);
        /** @type {Record<string, TenaceSuitInfo>} */
        const result = {};

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

        this.#log(player.name, `semi tenaci: ${JSON.stringify(result)}`);
        return result;
    }

    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card[]} hand
     * @param {boolean} shouldPull
     * @param {boolean} hasCovered
     * @returns {LeadControl}
     */
    #evaluateLeadControl(gameState, playerId, hand, shouldPull, hasCovered) {
        const player = gameState.getPlayerById(playerId);

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

        this.#log(player.name, `lead control: ${JSON.stringify(result)}`);
        return result;
    }

    /**
    * @param {GameState} gameState
    * @param {number} playerId
    * @param {Card[]} hand
    * @param {boolean} shouldPull
    * @returns {EntryPreservationInfo}
    */
    #evaluateEntryPreservation(gameState, playerId, hand, shouldPull) {
        const player = gameState.getPlayerById(playerId);
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

        this.#log(player.name, `entry preservation: ${JSON.stringify(result)}`);
        return result;
    }

    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card[]} hand
     * @param {boolean} shouldPull
     * @param {boolean} hasCovered
     * @param {DecimaAnalysisInfo} decimeAnalysisInfo
     * @returns {CiapaETorna}
     */
    #evaluateCiapaETorna(gameState, playerId, hand, shouldPull, hasCovered, decimeAnalysisInfo) {
        const player = gameState.getPlayerById(playerId);
        const lastTrick = this.#getLastCompletedTrick(gameState);

        if (!lastTrick) {
            const emptyResult = {
                active: false,
                suit: null,
                /** @type {CiapaETornaMode} */
                mode: "none",
                bonus: 0,
                refusalsOnSuit: 0,
            };
            this.#log(player.name, `ciapa e torna: ${JSON.stringify(emptyResult)}`);
            return emptyResult;
        }

        const winnerId = this.#getWinnerOfTrick(lastTrick);
        const suit = gh.getLeadingSuitFromTrick(lastTrick);

        if (winnerId !== playerId || !suit) {
            const emptyResult = {
                active: false,
                suit: null,
                /** @type {CiapaETornaMode} */
                mode: "none",
                bonus: 0,
                refusalsOnSuit: 0,
            };
            this.#log(player.name, `ciapa e torna: ${JSON.stringify(emptyResult)}`);
            return emptyResult;
        }

        const refusalsOnSuit = this.#countRefusalsOnSuit(gameState, suit);
        const handSuitCards = gh.getSuitCards(hand, suit);
        const seenCount = decimeAnalysisInfo?.[suit]?.seenCount || 0;

        let active = false;
        /** @type {CiapaETornaMode} */
        let mode = "none";
        let bonus = 0;

        if (handSuitCards.length >= 1) {
            if (shouldPull && refusalsOnSuit >= 1) {
                active = true;
                /** @type {CiapaETornaMode} */
                mode = "tirare";
                bonus = 18 + Math.min(refusalsOnSuit * 4, 10);
            } else if (!shouldPull && hasCovered && seenCount >= 6) {
                active = true;
                /** @type {CiapaETornaMode} */
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

        this.#log(player.name, `ciapa e torna: ${JSON.stringify(result)}`);
        return result;
    }

    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card[]} hand
     * @param {boolean} shouldPull
     * @returns {Record<string, FragileShortSuitInfo>}
     */
    #evaluateFragileShortSuits(gameState, playerId, hand, shouldPull) {
        const player = gameState.getPlayerById(playerId);
        const suits = Object.values(Suits);

        /** @type {Record<string, FragileShortSuitInfo>} */
        const result = {};

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

        this.#log(player.name, `semi corti fragili: ${JSON.stringify(result)}`);
        return result;
    }


    /**
     * @param {GameState} gameState
     * @returns {TrickEntry[] | null}
     */
    #getLastCompletedTrick(gameState) {
        const history = gameState.completedTricks || [];
        if (!history.length) return null;
        return history[history.length - 1];
    }

    /**
     * @param {TrickEntry[]} trick
     * @returns {number | null}
     */
    #getWinnerOfTrick(trick) {
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

    /**
     * @param {GameState} gameState
     * @param {string} suit
     */
    #countRefusalsOnSuit(gameState, suit) {
        const history = gameState.completedTricks || [];
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


    /**
     * @param {GameState} gameState
     * @param {number} playerId
     * @param {Card[]} hand
     * @param {ForcedTricksEstimate} forcedTricksEstimate
     * @returns boolean
     */
    #evaluatePull(gameState, playerId, hand, forcedTricksEstimate) {
        const player = gameState.getPlayerById(playerId);
        const hasCovered = this.#hasCovered(gameState, playerId);
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


        this.#log(
            player.name,
            `valuto se tirare: guaranteed=${forcedTricksEstimate.guaranteedHighTricks}, dangerous=${forcedTricksEstimate.dangerousHighCards}, missing=${forcedTricksEstimate.missingTricks}, high=${highCards}, top=${topCards}, zero=${zeroPointCards}, score=${score}, shouldPull=${shouldPull}`
        );


        return shouldPull;
    }

}