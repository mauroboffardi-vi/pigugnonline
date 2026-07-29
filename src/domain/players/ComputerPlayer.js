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
        const mustDumpPigugno = hasPigugno;
        const protectLastTrick = !shouldPull && isLastTrickLikely;


        return {
            hasCovered,
            hasPigugno,
            isLeading,
            shouldPull,
            shouldGoUnder,
            mustDumpPigugno,
            protectLastTrick,
            isLastTrickLikely,
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
            score += CardSorter.compare(card, this.#getLowestCard([card])) === 0 ? 0 : 0;
            if (this.#isPigugno(card)) score -= 200;
            this.#log(player.name, `modalità tirare: bonus aggressivo su ${this.#cardLabel(card)}`);
            return score;
        }


        score -= this.#getCardPoints(card) * 10;


        if (this.#isPigugno(card)) {
            score -= 120;
            this.#log(player.name, `evito di aprire col pigugno`);
        }


        const hand = this.#getPlayerHand(gameState, playerId);
        const suitCount = this.#countSuit(hand, card.suit);


        if (suitCount <= 2) {
            score += 10;
            this.#log(player.name, `seme corto ${card.suit}: possibile preparare rifiuto più avanti`);
        }


        if (handPlan.protectLastTrick && this.#getCardPoints(card) === 0) {
            score += 12;
            this.#log(player.name, `provo a liberarmi di una carta bassa pensando all'ultima presa`);
        }


        score -= this.#cardPower(card);
        return score;
    }


    scoreFollowCard(gameState, playerId, card, handPlan, matchPlan) {
        let score = 0;
        const player = gameState.getPlayerById(playerId);
        const canWin = this.#canCardWinCurrentTrick(gameState, card);
        const trickPoints = this.#estimateCurrentTrickPoints(gameState);
        const currentWinner = this.#getCurrentWinningEntry(gameState)?.card || null;


        this.#log(
            player.name,
            `valuto risposta con ${this.#cardLabel(card)}; canWin=${canWin}; trickPoints=${trickPoints}`
        );


        if (handPlan.shouldPull) {
            if (canWin) {
                score += 100;
                score += trickPoints * 20;
                score += this.#cardPower(card);
                if (this.#isPigugno(card)) score -= 60;
                this.#log(player.name, `sto tirando: se posso prendere, spingo forte`);
            } else {
                score -= 40;
                score -= this.#getCardPoints(card) * 5;
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
                this.#log(player.name, `non ho ancora coperto: provo una presa economica`);
            } else {
                score -= 20;
                score -= this.#getCardPoints(card) * 4;
                score -= this.#cardPower(card);
                this.#log(player.name, `non copro ancora, ma questa non riesce a prendere`);
            }
            return score;
        }


        if (handPlan.shouldGoUnder) {
            if (canWin) {
                score -= 70;
                score -= trickPoints * 12;
                score -= this.#getCardPoints(card) * 10;
                if (this.#isPigugno(card)) score += 140;
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


                this.#log(player.name, `vado sotto volentieri con ${this.#cardLabel(card)}`);
            }
        }


        if (this.#isPigugno(card)) {
            if (canWin) {
                score += 100;
                this.#log(player.name, `se devo giocare il pigugno, meglio perderlo prendendo meno rischio futuro`);
            } else {
                score += 180;
                this.#log(player.name, `ottimo: pigugno giocato sotto, provo a scaricarlo`);
            }
        }


        return score;
    }


    scoreRefuseCard(gameState, playerId, card, handPlan, matchPlan) {
        let score = 0;
        const player = gameState.getPlayerById(playerId);
        const points = this.#getCardPoints(card);

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
            score += 260;
            this.#log(player.name, `pigugno da scaricare a tutti i costi`);
        }


        if (handPlan.protectLastTrick && points === 0) {
            score -= 15;
            this.#log(player.name, `meglio tenere basse innocue per l'ultima presa`);
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


            result[suit] = {
                handCount: handSuitCards.length,
                playedCount: playedSuitCards.length,
                seenCount,
                mayKnowDecima: seenCount === 9,
                missingCards: this.#getMissingSuitCards(gameState, suit, handSuitCards, playedSuitCards),
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