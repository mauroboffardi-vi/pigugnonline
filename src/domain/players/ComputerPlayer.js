import { CardSorter } from "../cards/CardSorter.js";


/**
 * AI base per la scelta della carta da giocare.
 *
 * Strategia iniziale:
 * - genera solo mosse legali
 * - se può vincere la presa, gioca la carta vincente più bassa
 * - se non può vincere, scarta la carta più bassa
 * - in apertura, gioca la carta più bassa tra quelle legali
 * - il RANDOM_PLAY_PROBABILITY per ora é zero
 * 
 * 
 * todos:
 *- "ciapa e torna"
- rendere le carte del computer non cliccabili
 */
export default class ComputerPlayer {
    static DEBUG = true;
    static RANDOM_PLAY_PROBABILITY = 0.00; // mettere piú avanti a 0.05 ?


    chooseCard(gameState, playerId) {
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
            this.#log(player.name, `gioco a caso ${this.#cardLabel(randomCard)}`);
            return randomCard;
        }


        const handPlan = this.buildHandStrategy(gameState, playerId);
        const matchPlan = this.buildMatchStrategy(gameState, playerId);


        this.#log(player.name, `strategia di mano: ${JSON.stringify(handPlan)}`);
        this.#log(player.name, `strategia di partita: ${JSON.stringify(matchPlan)}`);


        const scoredCards = playableCards.map(card => {
            const score = this.scorePlayableCard(gameState, playerId, card, handPlan, matchPlan);
            this.#log(player.name, `score ${this.#cardLabel(card)} = ${score}`);
            return { card, score };
        });


        scoredCards.sort((a, b) => b.score - a.score);


        const bestScore = scoredCards[0].score;
        const topCards = scoredCards.filter(entry => entry.score === bestScore);
        const chosen = this.#breakTies(topCards).card;


        this.#log(player.name, `scelgo ${this.#cardLabel(chosen)} con score ${bestScore}`);
        return chosen;
    }


    #getWinningCards(gameState, playableCards) {
        const trick = gameState.getCurrentTrick();
        if (!trick.length) return [];


        const leadingSuit = gameState.getLeadingSuit();
        if (!leadingSuit) return [];


        const currentWinningEntry = trick
            .filter(entry => entry.card.suit === leadingSuit)
            .reduce((best, entry) => {
                if (!best) return entry;
                return CardSorter.compare(best.card, entry.card) > 0 ? best : entry;
            }, null);


        if (!currentWinningEntry) return [];


        return playableCards.filter(card => {
            if (card.suit !== leadingSuit) return false;
            return CardSorter.compare(card, currentWinningEntry.card) > 0;
        });
    }


    #getLowestCard(cards) {
        return cards.reduce((lowest, current) => {
            if (!lowest) return current;
            return CardSorter.compare(lowest, current) < 0 ? lowest : current;
        }, null);
    }


    #getHighestCard(cards) {
        return cards.reduce((highest, current) => {
            if (!highest) return current;
            return CardSorter.compare(highest, current) > 0 ? highest : current;
        }, null);
    }


    #cardLabel(card) {
        return `${card.value} di ${card.suit}`;
    }


    #log(playerName, message) {
        if (!ComputerPlayer.DEBUG) return;
        console.log(`${playerName}: "${message}"`);
    }


    #breakTies(entries) {
        if (entries.length === 1) return entries[0];


        const sorted = [...entries].sort((a, b) => {
            return CardSorter.compare(a.card, b.card);
        });


        return sorted[0];
    }


    #getCardPoints(card) {
        return card ? card.getPoints() : 0;
    }

    #isPigugno(card) {
        return card ? card.isPigugno() : false;
    }


    #getPlayerHand(gameState, playerId) {
        const player = gameState.getPlayerById(playerId);
        return player?.hand || [];
    }


    #countTakenTricks(gameState, playerId) {
        const player = gameState.getPlayerById(playerId);
        return player?.takenCards?.length ? Math.floor(player.takenCards.length / gameState.players.length) : 0;
    }


    #hasCovered(gameState, playerId) {
        return this.#countTakenTricks(gameState, playerId) > 0;
    }


    #isLastTrickLikely(gameState, playerId) {
        const hand = this.#getPlayerHand(gameState, playerId);
        return hand.length <= 1;
    }


    #getCurrentWinningEntry(gameState) {
        const trick = gameState.getCurrentTrick();
        if (!trick.length) return null;


        const leadingSuit = gameState.getLeadingSuit();
        if (!leadingSuit) return null;


        return trick
            .filter(entry => entry.card.suit === leadingSuit)
            .reduce((best, entry) => {
                if (!best) return entry;
                return CardSorter.compare(best.card, entry.card) > 0 ? best : entry;
            }, null);
    }


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


    #estimateCurrentTrickPoints(gameState) {
        const trick = gameState.getCurrentTrick();
        return trick.reduce((sum, entry) => sum + this.#getCardPoints(entry.card), 0);
    }


    #countSuit(hand, suit) {
        return hand.filter(card => card.suit === suit).length;
    }


    #getSuitCards(hand, suit) {
        return hand.filter(card => card.suit === suit);
    }


    #isForcedToFollow(gameState, playerId) {
        const leadingSuit = gameState.getLeadingSuit();
        if (!leadingSuit) return false;


        const hand = this.#getPlayerHand(gameState, playerId);
        return hand.some(card => card.suit === leadingSuit);
    }


    #getLowerCardsThanCurrentWinner(gameState, playableCards) {
        const trick = gameState.getCurrentTrick();
        if (!trick.length) return [...playableCards];


        const leadingSuit = gameState.getLeadingSuit();
        const currentWinningEntry = this.#getCurrentWinningEntry(gameState);
        if (!leadingSuit || !currentWinningEntry) return [...playableCards];


        return playableCards.filter(card => {
            if (card.suit !== leadingSuit) return false;
            return CardSorter.compare(card, currentWinningEntry.card) < 0;
        });
    }


    /* 
     * Valutazione e peso delle differenti stratgie
     */


    buildHandStrategy(gameState, playerId) {
        const hand = this.#getPlayerHand(gameState, playerId);
        const hasCovered = this.#hasCovered(gameState, playerId);
        const hasPigugno = hand.some(card => this.#isPigugno(card));
        const isLeading = gameState.getCurrentTrick().length === 0;
        const isLastTrickLikely = this.#isLastTrickLikely(gameState, playerId);
        const forcedTricksEstimate = this.estimateForcedTricks(gameState, playerId);
        const decimeInfo = this.analyzeDecime(gameState, playerId);

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
            decimeInfo,
            shouldPull
        );
        const tenaceSuits = this.#evaluateTenaceSuits(gameState, playerId, hand, decimeInfo, shouldPull);
        const pigugnoUrgency = this.#evaluatePigugnoUrgency(gameState, playerId, hand, hasCovered, shouldPull);
        const decimaPressure = this.#evaluateDecimaPressure(gameState, playerId, decimeInfo, shouldPull);

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
            dangerousShortSuits,
            tenaceSuits,
            decimaPressure,
            forcedTricksEstimate,
            decimeInfo,
        };
    }


    buildMatchStrategy(gameState, playerId) {
        return {
            playerId,
            preferBuscheOnAlivePlayers: true,
            preferAvoidHelpingEliminatedPlayers: true,
            canSetUpDoubleExit: false,
            notes: "struttura pronta per futura strategia di partita basata sulle busche",
        };
    }


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


    scoreLeadCard(gameState, playerId, card, handPlan, matchPlan) {
        let score = 0;
        const player = gameState.getPlayerById(playerId);

        this.#log(player.name, `valuto apertura con ${this.#cardLabel(card)}`);

        if (handPlan.shouldPull) {
            score += 40;
            score += this.#getCardPoints(card) * 8;
            score += this.#cardPower(card) * 3;

            if (handPlan.endgameMode.isEndgame && this.#cardPower(card) >= 8) {
                score += 20;
                this.#log(player.name, `endgame aggressivo: apro alto mentre tiro`);
            }

            if (this.#isPigugno(card)) score -= 200;
            this.#log(player.name, `modalità tirare: bonus aggressivo su ${this.#cardLabel(card)}`);
            return score;
        }

        score -= this.#getCardPoints(card) * 10;
        score -= this.#cardPower(card);

        if (this.#isPigugno(card)) {
            score -= 120;
            score -= handPlan.pigugnoUrgency;
            this.#log(player.name, `evito di aprire col pigugno`);
        }

        const hand = this.#getPlayerHand(gameState, playerId);
        const suitCount = this.#countSuit(hand, card.suit);
        const dangerousShortSuit = this.#isDangerousShortSuit(handPlan, card.suit);
        const tenaceSuit = this.#isTenaceSuit(handPlan, card.suit);

        if (suitCount <= 2) {
            if (dangerousShortSuit) {
                const malus = Math.floor(this.#getShortSuitDangerScore(handPlan, card.suit) / 2);
                score -= malus;
                this.#log(
                    player.name,
                    `seme corto ${card.suit} ma pericoloso da svuotare: malus ${malus}`
                );
            } else {
                score += 10;
                score += this.#getShortSuitUrgency(handPlan, card.suit);
                this.#log(player.name, `seme corto ${card.suit}: possibile preparare rifiuto più avanti`);
                this.#log(player.name, `apro in seme corto ${card.suit} per provare a svuotarlo`);
            }
        }

        if (tenaceSuit) {
            const malus = Math.floor(this.#getTenaceTension(handPlan, card.suit) / 2);
            score -= malus;
            this.#log(player.name, `evito di aprire il seme tenace ${card.suit}: malus ${malus}`);
        }

        if (handPlan.protectLastTrick && this.#getCardPoints(card) === 0) {
            score += 12;
            this.#log(player.name, `provo a liberarmi di una carta bassa pensando all'ultima presa`);
        }

        if (handPlan.endgameMode.isEndgame) {
            if (this.#getCardPoints(card) === 0) {
                score += 8;
                this.#log(player.name, `endgame: preferisco uscire con carta leggera`);
            } else {
                score -= 8;
            }
        }

        if (this.#isKnownDecimaSuit(handPlan, card.suit)) {
            const missing = this.#getKnownMissingCardForSuit(handPlan, card.suit);
            score += handPlan.decimaPressure[card.suit].pressure;

            if (missing) {
                this.#log(
                    player.name,
                    `seme ${card.suit} leggibile a decima; manca ${missing.value} di ${missing.suit}`
                );
            }
        }

        return score;
    }


    scoreFollowCard(gameState, playerId, card, handPlan, matchPlan) {
        let score = 0;
        const player = gameState.getPlayerById(playerId);
        const canWin = this.#canCardWinCurrentTrick(gameState, card);
        const trickPoints = this.#estimateCurrentTrickPoints(gameState);
        const currentWinner = this.#getCurrentWinningEntry(gameState)?.card || null;
        const dangerousShortSuit = this.#isDangerousShortSuit(handPlan, card.suit);
        const tenaceSuit = this.#isTenaceSuit(handPlan, card.suit);

        this.#log(
            player.name,
            `valuto risposta con ${this.#cardLabel(card)}; canWin=${canWin}; trickPoints=${trickPoints}`
        );

        if (handPlan.shouldPull) {
            if (canWin) {
                score += 100;
                score += trickPoints * 20;
                score += this.#cardPower(card);

                if (handPlan.endgameMode.isEndgame) {
                    score += 20;
                    this.#log(player.name, `endgame + tirare: massimizzo presa`);
                }

                if (this.#isPigugno(card)) score -= 60;
                this.#log(player.name, `sto tirando: se posso prendere, spingo forte`);
            } else {
                score -= 40;
                score -= this.#getCardPoints(card) * 5;

                if (handPlan.endgameMode.isEndgame) {
                    score -= 12;
                }

                this.#log(player.name, `sto tirando ma questa non prende`);
            }
            return score;
        }

        if (!handPlan.hasCovered) {
            if (canWin) {
                score += 80;
                score -= this.#getCardPoints(card) * 8;
                score -= this.#cardPower(card);
                score -= trickPoints * 6;

                if (handPlan.endgameMode.isEndgame) {
                    score += 10;
                    this.#log(player.name, `endgame senza presa ancora fatta: accetto presa economica`);
                }

                this.#log(player.name, `non ho ancora coperto: provo una presa economica`);
            } else {
                score -= 20;
                score -= this.#getCardPoints(card) * 4;
                score -= this.#cardPower(card);

                if (tenaceSuit) {
                    const malus = this.#isTenaceLowCard(handPlan, card)
                        ? Math.floor(this.#getTenaceTension(handPlan, card.suit) / 2)
                        : Math.floor(this.#getTenaceTension(handPlan, card.suit) / 3);
                    score -= malus;
                    this.#log(
                        player.name,
                        `non copro e consumo una carta del seme tenace ${card.suit}: malus ${malus}`
                    );
                }

                if (dangerousShortSuit) {
                    const malus = Math.floor(this.#getShortSuitDangerScore(handPlan, card.suit) / 3);
                    score -= malus;
                    this.#log(
                        player.name,
                        `non copro e questa appartiene a un seme corto tossico (${card.suit}): malus ${malus}`
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
                score -= this.#getCardPoints(card) * 10;

                if (handPlan.endgameMode.isVeryLateEndgame && this.#getCardPoints(card) > 0) {
                    score -= 25;
                    this.#log(player.name, `endgame tardissimo: prendere ora con punti è pessimo`);
                }

                if (this.#isPigugno(card)) {
                    score += handPlan.pigugnoUrgency;
                    this.#log(player.name, `se devo prendere col pigugno almeno provo a liberarmene`);
                }

                this.#log(player.name, `ho già coperto: evitare di prendere`);
            } else {
                score += 60;
                score -= this.#getCardPoints(card) * 3;

                if (currentWinner && card.suit === currentWinner.suit) {
                    const delta = this.#rankDistance(card, currentWinner);
                    score += Math.min(delta, 8);
                }

                if (handPlan.protectLastTrick && this.#getCardPoints(card) === 0) {
                    score += 8;
                }

                if (tenaceSuit) {
                    const malus = this.#isTenaceLowCard(handPlan, card)
                        ? Math.floor(this.#getTenaceTension(handPlan, card.suit) / 2)
                        : Math.floor(this.#getTenaceTension(handPlan, card.suit) / 3);
                    score -= malus;
                    this.#log(
                        player.name,
                        `vado sotto ma sto consumando il seme tenace ${card.suit}: malus ${malus}`
                    );
                }

                if (dangerousShortSuit) {
                    const malus = Math.floor(this.#getShortSuitDangerScore(handPlan, card.suit) / 4);
                    score -= malus;
                    this.#log(
                        player.name,
                        `vado sotto, ma su seme corto tossico ${card.suit}: malus ${malus}`
                    );
                }

                if (handPlan.endgameMode.isEndgame && this.#getCardPoints(card) === 0) {
                    score += 10;
                    this.#log(player.name, `endgame: sotto con carta innocua`);
                }

                this.#log(player.name, `vado sotto volentieri con ${this.#cardLabel(card)}`);
            }
        }

        if (this.#isPigugno(card)) {
            if (canWin) {
                score += 40;
                score -= handPlan.pigugnoUrgency / 2;
                this.#log(player.name, `pigugno in presa: situazione delicata`);
            } else {
                score += 120 + handPlan.pigugnoUrgency;
                this.#log(player.name, `ottimo: pigugno giocato sotto, provo a scaricarlo`);
            }
        }

        if (this.#isKnownDecimaSuit(handPlan, card.suit)) {
            score += handPlan.decimaPressure[card.suit].pressure / 2;
            this.#log(player.name, `risposta su seme leggibile a decima`);
        }

        return score;
    }


    scoreRefuseCard(gameState, playerId, card, handPlan, matchPlan) {
        let score = 0;
        const player = gameState.getPlayerById(playerId);
        const points = this.#getCardPoints(card);
        const dangerousShortSuit = this.#isDangerousShortSuit(handPlan, card.suit);
        const tenaceSuit = this.#isTenaceSuit(handPlan, card.suit);

        this.#log(player.name, `valuto rifiuto con ${this.#cardLabel(card)}`);

        if (handPlan.shouldPull) {
            score -= points * 4;
            if (this.#isPigugno(card)) score -= 200;
            this.#log(player.name, `sto tirando: rifiuto sgradito`);
            return score;
        }

        score += points * 25;
        score += this.#cardPower(card);

        if (card.value === "A") {
            score += 30;
            this.#log(player.name, `scaricare un asso in rifiuto è ottimo`);
        }

        if (this.#isPigugno(card)) {
            score += 260 + handPlan.pigugnoUrgency;
            this.#log(player.name, `pigugno da scaricare a tutti i costi`);
        }

        const suitInfo = handPlan.shortSuitPriority?.[card.suit];
        if (suitInfo?.shouldVoid) {
            if (dangerousShortSuit) {
                const malus = Math.floor(this.#getShortSuitDangerScore(handPlan, card.suit) / 2);
                score -= malus;
                this.#log(
                    player.name,
                    `rifiuto su seme corto ${card.suit}, ma è tossico da svuotare: malus ${malus}`
                );
            } else {
                score += suitInfo.urgency;
                this.#log(player.name, `rifiuto su seme corto ${card.suit}: provo a svuotarlo`);
            }
        }

        if (tenaceSuit) {
            const malus = this.#isTenaceLowCard(handPlan, card)
                ? Math.floor(this.#getTenaceTension(handPlan, card.suit) / 2)
                : Math.floor(this.#getTenaceTension(handPlan, card.suit) / 3);
            score -= malus;
            this.#log(player.name, `rifiuto sul seme tenace ${card.suit}: malus ${malus}`);
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

        if (this.#isKnownDecimaSuit(handPlan, card.suit)) {
            score += handPlan.decimaPressure[card.suit].pressure / 2;
            this.#log(player.name, `rifiuto su seme leggibile a decima`);
        }

        return score;
    }


    analyzeDecime(gameState, playerId) {
        const player = gameState.getPlayerById(playerId);
        const hand = this.#getPlayerHand(gameState, playerId);


        const suits = ["denari", "coppe", "spade", "bastoni"];
        const result = {};


        for (const suit of suits) {
            const handSuitCards = this.#getSuitCards(hand, suit);
            const playedSuitCards = this.#getPlayedCardsBySuit(gameState, suit);
            const seenCount = handSuitCards.length + playedSuitCards.length;


            const missingCards = this.#getMissingSuitCards(gameState, suit, handSuitCards, playedSuitCards);

            result[suit] = {
                handCount: handSuitCards.length,
                playedCount: playedSuitCards.length,
                seenCount,
                mayKnowDecima: seenCount === 9,
                missingCards,
                knownMissing: missingCards.length === 1 ? missingCards[0] : null,
            };
        }


        this.#log(player.name, `analisi decime: ${JSON.stringify(result)}`);
        return result;
    }


    estimateForcedTricks(gameState, playerId) {
        const player = gameState.getPlayerById(playerId);
        const hand = this.#getPlayerHand(gameState, playerId);


        let guaranteedHighTricks = 0;
        let dangerousHighCards = 0;
        let protectedHighCards = 0;


        for (const card of hand) {
            const power = this.#cardPower(card);
            const suitCount = this.#countSuit(hand, card.suit);


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
        };


        this.#log(player.name, `stima prese forzate: ${JSON.stringify(result)}`);
        return result;
    }


    #getPlayedCardsBySuit(gameState, suit) {
        const history = gameState.trickHistory || gameState.completedTricks || [];
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


    #getMissingSuitCards(gameState, suit, handSuitCards, playedSuitCards) {
        const allValues = ["A", "2", "3", "R", "C", "F", "7", "6", "5", "4"];
        const seen = new Set(
            [...handSuitCards, ...playedSuitCards].map(card => `${card.suit}:${card.value}`)
        );


        return allValues
            .map(value => ({ suit, value }))
            .filter(card => !seen.has(`${card.suit}:${card.value}`));
    }


    #cardPower(card) {
        return CardSorter.cardPower(card.value);
    }

    #rankDistance(lowerCard, higherCard) {
        return Math.max(0, this.#cardPower(higherCard) - this.#cardPower(lowerCard));
    }

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

    #evaluateShortSuitPriority(hand) {
        const suits = ["denari", "coppe", "spade", "bastoni"];
        const priorities = {};

        for (const suit of suits) {
            const count = this.#countSuit(hand, suit);
            priorities[suit] = {
                count,
                shouldVoid: count > 0 && count <= 2,
                urgency: count === 1 ? 30 : count === 2 ? 16 : 0,
            };
        }

        return priorities;
    }

    #evaluatePigugnoUrgency(gameState, playerId, hand, hasCovered, shouldPull) {
        const player = gameState.getPlayerById(playerId);
        const hasPigugno = hand.some(card => this.#isPigugno(card));

        if (!hasPigugno) return 0;

        let urgency = 40;
        if (hasCovered) urgency += 25;
        if (!shouldPull) urgency += 15;
        if (hand.length <= 5) urgency += 10;
        if (hand.length <= 3) urgency += 15;

        this.#log(player.name, `urgenza pigugno: ${urgency}`);
        return urgency;
    }

    #evaluateDecimaPressure(gameState, playerId, decimeInfo, shouldPull) {
        const player = gameState.getPlayerById(playerId);
        const result = {};

        for (const [suit, info] of Object.entries(decimeInfo)) {
            const missingCount = info.missingCards.length;
            const knownMissing = missingCount === 1;
            const missingCard = knownMissing ? info.missingCards[0] : null;

            result[suit] = {
                knownMissing,
                missingCard,
                pressure: knownMissing ? (shouldPull ? 12 : 22) : 0,
            };
        }

        this.#log(player.name, `pressione decime: ${JSON.stringify(result)}`);
        return result;
    }

    #evaluateDangerousShortSuits(gameState, playerId, hand, shortSuitPriority, decimeInfo, shouldPull) {
        const player = gameState.getPlayerById(playerId);
        const suits = ["denari", "coppe", "spade", "bastoni"];
        const result = {};

        for (const suit of suits) {
            const suitCards = this.#getSuitCards(hand, suit);
            const shortInfo = shortSuitPriority[suit];

            if (!shortInfo || !shortInfo.shouldVoid) {
                result[suit] = {
                    isDangerous: false,
                    dangerScore: 0,
                    reason: "not-short-suit",
                };
                continue;
            }

            const totalPoints = suitCards.reduce((sum, card) => sum + this.#getCardPoints(card), 0);
            const maxPower = suitCards.reduce((max, card) => Math.max(max, this.#cardPower(card)), 0);
            const highCards = suitCards.filter(card => this.#cardPower(card) >= 8).length;
            const topCards = suitCards.filter(card => this.#cardPower(card) >= 9).length;
            const knownDecima = !!decimeInfo?.[suit]?.knownMissing;
            const seenCount = decimeInfo?.[suit]?.seenCount || 0;

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

    #evaluateTenaceSuits(gameState, playerId, hand, decimeInfo, shouldPull) {
        const player = gameState.getPlayerById(playerId);
        const suits = ["denari", "coppe", "spade", "bastoni"];
        const result = {};

        for (const suit of suits) {
            const suitCards = this.#getSuitCards(hand, suit);
            const seenCount = decimeInfo?.[suit]?.seenCount || 0;
            const sortedSuitCards = [...suitCards].sort((a, b) => CardSorter.compare(a, b));
            const lowCard = sortedSuitCards[0] || null;
            const highCard = sortedSuitCards[sortedSuitCards.length - 1] || null;

            let tension = 0;
            let isTenace = false;
            let reason = "none";

            if (suitCards.length === 2 && seenCount >= 8) {
                tension += 30;
                if (lowCard && this.#cardPower(lowCard) <= 3) tension += 15;
                if (highCard && this.#cardPower(highCard) <= 5) tension += 20;
                if (!shouldPull) tension += 20;

                isTenace = tension >= 45;
                reason = isTenace ? "late-two-card-suit" : "two-card-suit";
            }

            result[suit] = {
                isTenace,
                tension,
                seenCount,
                handCount: suitCards.length,
                lowCard: lowCard ? { suit: lowCard.suit, value: lowCard.value } : null,
                highCard: highCard ? { suit: highCard.suit, value: highCard.value } : null,
                reason,
            };
        }

        this.#log(player.name, `semi tenaci: ${JSON.stringify(result)}`);
        return result;
    }

    #isTenaceSuit(handPlan, suit) {
        return !!handPlan.tenaceSuits?.[suit]?.isTenace;
    }

    #getTenaceTension(handPlan, suit) {
        return handPlan.tenaceSuits?.[suit]?.tension || 0;
    }

    #isTenaceLowCard(handPlan, card) {
        const info = handPlan.tenaceSuits?.[card.suit];
        if (!info?.isTenace || !info.lowCard) return false;
        return info.lowCard.value === card.value;
    }

    #isDangerousShortSuit(handPlan, suit) {
        return !!handPlan.dangerousShortSuits?.[suit]?.isDangerous;
    }

    #getShortSuitDangerScore(handPlan, suit) {
        return handPlan.dangerousShortSuits?.[suit]?.dangerScore || 0;
    }

    #getShortSuitUrgency(handPlan, suit) {
        return handPlan.shortSuitPriority?.[suit]?.urgency || 0;
    }

    #isKnownDecimaSuit(handPlan, suit) {
        return !!handPlan.decimaPressure?.[suit]?.knownMissing;
    }

    #getKnownMissingCardForSuit(handPlan, suit) {
        return handPlan.decimaPressure?.[suit]?.missingCard || null;
    }


    #evaluatePull(gameState, playerId, hand, forcedTricksEstimate) {
        const player = gameState.getPlayerById(playerId);
        const hasCovered = this.#hasCovered(gameState, playerId);
        const highCards = hand.filter(card => this.#cardPower(card) >= 8).length;
        const topCards = hand.filter(card => this.#cardPower(card) >= 9).length;
        const zeroPointCards = hand.filter(card => this.#getCardPoints(card) === 0).length;
        const pigugnoInHand = hand.some(card => this.#isPigugno(card));
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