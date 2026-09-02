import { Card } from '../../cards/Card';
import { HandPlan, MatchPlan } from '../../domain-types';
import { GameState } from '../../game/GameState';
import { Suit, Suits, Player } from '../../domain-types';
import { CardSorter } from '../../../domain/cards/CardSorter';
import * as gh from './generic-helpers';
import * as hph from './handplan-helpers';

type LogFn = (msg: string) => void;

/**
 * @param {GameState} gameState
 * @param {number} playerId
 * @param {Card} card
 * @param {HandPlan} handPlan
 * @param {any} matchPlan
 */
export function scorePlayableCard(gameState: GameState, player: Player, card: Card, handPlan: HandPlan, matchPlan: MatchPlan, log: LogFn) {
    const trick = gameState.getCurrentTrick();
    if (!trick.length) {
        return scoreLeadCard(gameState, player, card, handPlan, matchPlan, log);
    }


    if (hph.isForcedToFollow(gameState, player.id)) {
        return scoreFollowCard(gameState, player, card, handPlan, matchPlan, log);
    }


    return scoreRefuseCard(gameState, player, card, handPlan, matchPlan, log);
}


/**
 * @param {GameState} gameState
 * @param {number} playerId
 * @param {Card} card
 * @param {HandPlan} handPlan
 * @param {any} matchPlan
 */
export function scoreLeadCard(gameState: GameState, player: Player, card: Card, handPlan: HandPlan, matchPlan: MatchPlan, log: LogFn) {
    let score = 0;

    log(`valuto apertura con ${card.toString()}`);

    if (handPlan.shouldPull) {
        score += 40;
        score += card.getPoints() * 8;
        score += CardSorter.cardPower(card) * 3;

        if (handPlan.endgameMode.isEndgame && CardSorter.cardPower(card) >= 8) {
            score += 20;
            log(`endgame aggressivo: apro alto mentre tiro`);
        }

        if (card.isPigugno()) score -= 200;
        log(`modalità tirare: bonus aggressivo su ${card.toString()}`);
        return score;
    }

    score -= card.getPoints() * 10;
    score -= CardSorter.cardPower(card);

    if (card.isPigugno()) {
        score -= 120;
        score -= handPlan.pigugnoUrgency;
        log(`evito di aprire col pigugno`);
    }

    const hand = gameState.getPlayerHand(player.id);
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
            log(
                `seme corto ${card.suit} ma pericoloso da svuotare: malus ${malus}`
            );
        } else if (hph.isFragileShortSuit(handPlan, card.suit) && !handPlan.shouldPull) {
            const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 2);
            score -= malus;
            log(
                `seme corto ${card.suit} fragile (tipo 5–2): evito di svuotarlo in apertura, malus ${malus}`
            );
        } else {
            score += 10;
            score += hph.getShortSuitUrgency(handPlan, card.suit);
            log(`seme corto ${card.suit}: possibile preparare rifiuto più avanti`);
            log(`apro in seme corto ${card.suit} per provare a svuotarlo`);
        }
    }

    if (tenaceSuit) {
        const malus = Math.floor(hph.getTenaceTension(handPlan, card.suit) / 2);
        score -= malus;
        log(`evito di aprire il seme tenace ${card.suit}: malus ${malus}`);
    }

    if (handPlan.protectLastTrick && card.getPoints() === 0) {
        score += 12;
        log(`provo a liberarmi di una carta bassa pensando all'ultima presa`);
    }

    if (handPlan.endgameMode.isEndgame) {
        if (card.getPoints() === 0) {
            score += 8;
            log(`endgame: preferisco uscire con carta leggera`);
        } else {
            score -= 8;
        }
    }

    if (hph.isKnownDecimaSuit(handPlan, card.suit)) {
        const missing = hph.getKnownMissingCardForSuit(handPlan, card.suit);
        score += handPlan.decimaPressure?.[card.suit as Suit]?.pressure ?? 0;

        if (missing) {
            log(
                `seme ${card.suit} leggibile a decima; manca ${missing.value} di ${missing.suit}`
            );
        }
    }
    if (wantsLeadControl && CardSorter.cardPower(card) >= 8) {
        score += 12;
        log(`voglio il lead control: bonus su apertura forte`);
    }

    if (avoidLeadControl && CardSorter.cardPower(card) >= 8 && !handPlan.shouldPull) {
        score -= 14;
        log(`preferisco non tenere il lead: malus su apertura troppo forte`);
    }

    if (handPlan.entryPreservation?.entryPreservationMode) {
        if (isFragileEntry) {
            score -= 18;
            log(`proteggo una entry fragile: evito di aprire con ${card.toString()}`);
        } else if (isEntrySuit && CardSorter.cardPower(card) >= 8) {
            score -= 10;
            log(`preservo un seme-entry per dopo`);
        }
    }

    if (ciapaETorna?.active && ciapaETorna.suit === card.suit) {
        let bonus = ciapaETorna.bonus;

        if (dangerousShortSuit || tenaceSuit) {
            bonus = Math.floor(bonus / 2);
        }

        score += bonus;
        log(
            `ciapa e torna su ${card.suit} (${ciapaETorna.mode}): bonus ${bonus}`
        );
    }
    return score;
}


export function scoreFollowCard(gameState: GameState, player: Player, card: Card, handPlan: HandPlan, matchPlan: MatchPlan, log: LogFn) {
    let score = 0;
    const canWin = canCardWinCurrentTrick(gameState, card);
    const trickPoints = estimateCurrentTrickPoints(gameState);
    const currentWinner = getCurrentWinningEntry(gameState)?.card || null;
    const dangerousShortSuit = hph.isDangerousShortSuit(handPlan, card.suit);
    const fragileShortSuit = hph.isFragileShortSuit(handPlan, card.suit);
    const tenaceSuit = hph.isTenaceSuit(handPlan, card.suit);

    log(
        `valuto risposta con ${card.toString()}; canWin=${canWin}; trickPoints=${trickPoints}`
    );

    if (handPlan.shouldPull) {
        if (canWin) {
            score += 100;
            score += trickPoints * 20;
            score += CardSorter.cardPower(card);

            if (handPlan.leadControl?.wantsLeadControl) {
                score += 10;
                log(`prendere ora mi dà lead control utile`);
            }

            if (handPlan.endgameMode.isEndgame) {
                score += 20;
                log(`endgame + tirare: massimizzo presa`);
            }

            if (card.isPigugno()) score -= 60;
            log(`sto tirando: se posso prendere, spingo forte`);
        } else {
            score -= 40;
            score -= card.getPoints() * 5;

            if (handPlan.endgameMode.isEndgame) {
                score -= 12;
            }

            if (fragileShortSuit) {
                const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 3);
                score -= malus;
                log(
                    `anche tirando, consumo una carta di seme corto fragile ${card.suit}: malus ${malus}`
                );
            }

            log(`sto tirando ma questa non prende`);
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
                log(`presa economica con lead utile dopo`);
            }

            if (handPlan.endgameMode.isEndgame) {
                score += 10;
                log(`endgame senza presa ancora fatta: accetto presa economica`);
            }

            log(`non ho ancora coperto: provo una presa economica`);
        } else {
            score -= 20;
            score -= card.getPoints() * 4;
            score -= CardSorter.cardPower(card);

            if (handPlan.entryPreservation?.entryPreservationMode && hph.isFragileEntryCard(handPlan, card)) {
                score -= 14;
                log(`sto consumando una fragile entry senza coprire`);
            }

            if (tenaceSuit) {
                const malus = hph.isTenaceLowCard(handPlan, card)
                    ? Math.floor(hph.getTenaceTension(handPlan, card.suit) / 2)
                    : Math.floor(hph.getTenaceTension(handPlan, card.suit) / 3);
                score -= malus;
                log(
                    `non copro e consumo una carta del seme tenace ${card.suit}: malus ${malus}`
                );
            }

            if (dangerousShortSuit) {
                const malus = Math.floor(hph.getShortSuitDangerScore(handPlan, card.suit) / 3);
                score -= malus;
                log(
                    `non copro e questa appartiene a un seme corto tossico (${card.suit}): malus ${malus}`
                );
            } else if (fragileShortSuit && !handPlan.shouldPull) {
                const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 3);
                score -= malus;
                log(
                    `consumo carta di seme corto fragile ${card.suit} senza tirare: malus ${malus}`
                );
            }

            log(`non copro ancora, ma questa non riesce a prendere`);
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
                log(`prendere adesso mi lascia un lead scomodo`);
            }

            if (handPlan.endgameMode.isVeryLateEndgame && card.getPoints() > 0) {
                score -= 25;
                log(`endgame tardissimo: prendere ora con punti è pessimo`);
            }

            if (card.isPigugno()) {
                score += handPlan.pigugnoUrgency;
                log(`se devo prendere col pigugno almeno provo a liberarmene`);
            }

            log(`ho già coperto: evitare di prendere`);
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

                log(
                    `vado sotto ma sto consumando il seme tenace ${card.suit}: malus ${malus}`
                );
            }

            if (dangerousShortSuit) {
                const malus = Math.floor(hph.getShortSuitDangerScore(handPlan, card.suit) / 4);
                score -= malus;
                log(
                    `vado sotto, ma su seme corto tossico ${card.suit}: malus ${malus}`
                );
            } else if (fragileShortSuit && !handPlan.shouldPull) {
                const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 3);
                score -= malus;
                log(
                    `vado sotto ma consumo un seme corto fragile ${card.suit}: malus ${malus}`
                );
            }

            if (handPlan.endgameMode.isEndgame && card.getPoints() === 0) {
                score += 10;
                log(`endgame: sotto con carta innocua`);
            }

            log(`vado sotto volentieri con ${card.toString()}`);
        }
    }

    if (card.isPigugno()) {
        if (canWin) {
            score += 40;
            score -= handPlan.pigugnoUrgency / 2;
            log(`pigugno in presa: situazione delicata`);
        } else {
            score += 120 + handPlan.pigugnoUrgency;
            log(`ottimo: pigugno giocato sotto, provo a scaricarlo`);
        }
    }

    if (hph.isKnownDecimaSuit(handPlan, card.suit)) {
        const pressure = handPlan.decimaPressure?.[card.suit as Suit]?.pressure ?? 0;
        score += pressure / 2;
        log(`risposta su seme leggibile a decima`);
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
export function scoreRefuseCard(gameState: GameState, player: Player, card: Card, handPlan: HandPlan, matchPlan: MatchPlan, log: LogFn) {
    let score = 0;
    const points = card.getPoints();
    const dangerousShortSuit = hph.isDangerousShortSuit(handPlan, card.suit);
    const fragileShortSuit = hph.isFragileShortSuit(handPlan, card.suit);
    const tenaceSuit = hph.isTenaceSuit(handPlan, card.suit);

    log(`valuto rifiuto con ${card.toString()}`);

    if (handPlan.shouldPull) {
        score -= points * 4;

        if (fragileShortSuit) {
            const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 3);
            score -= malus;
            log(`sto tirando ma svuoto un seme fragile ${card.suit}: malus ${malus}`);
        }

        if (card.isPigugno()) score -= 200;
        log(`sto tirando: rifiuto sgradito`);
        return score;
    }

    score += points * 25;
    score += CardSorter.cardPower(card);

    if (card.value == 1) {
        score += 30;
        log(`scaricare un asso in rifiuto è ottimo`);
    }

    if (card.isPigugno()) {
        score += 260 + handPlan.pigugnoUrgency;
        log(`pigugno da scaricare a tutti i costi`);
    }

    const suitInfo = handPlan.shortSuitPriority?.[card.suit];
    if (dangerousShortSuit) {
        const malus = Math.floor(hph.getShortSuitDangerScore(handPlan, card.suit) / 2);
        score -= malus;
        log(
            `rifiuto su seme corto ${card.suit}, ma è tossico da svuotare: malus ${malus}`
        );
    } else if (fragileShortSuit && !handPlan.shouldPull) {
        const malus = Math.floor(hph.getFragileShortSuitScore(handPlan, card.suit) / 2);
        score -= malus;
        log(
            `rifiuto su seme corto fragile ${card.suit}: evito di svuotarlo troppo presto, malus ${malus}`
        );
    } else if (suitInfo?.shouldVoid) {
        score += suitInfo.urgency;
        log(`rifiuto su seme corto ${card.suit}: provo a svuotarlo`);
    }

    if (tenaceSuit) {
        const malus = hph.isTenaceLowCard(handPlan, card)
            ? Math.floor(hph.getTenaceTension(handPlan, card.suit) / 2)
            : Math.floor(hph.getTenaceTension(handPlan, card.suit) / 3);
        score -= malus;
        log(`rifiuto sul seme tenace ${card.suit}: malus ${malus}`);
    }

    if (handPlan.entryPreservation?.entryPreservationMode && hph.isFragileEntryCard(handPlan, card)) {
        score -= 14;
        log(`sto consumando una fragile entry in rifiuto`);
    }

    if (handPlan.endgameMode.isEndgame) {
        score += points * 8;
        if (points === 0) score -= 10;
        log(`endgame: rifiuto più orientato a scaricare peso`);
    }

    if (handPlan.protectLastTrick && points === 0) {
        score -= 15;
        log(`meglio tenere basse innocue per l'ultima presa`);
    }

    if (hph.isKnownDecimaSuit(handPlan, card.suit)) {
        const pressure = handPlan.decimaPressure?.[card.suit]?.pressure ?? 0;
        score += pressure / 2;
        log(`rifiuto su seme leggibile a decima`);
    }

    return score;
}



function canCardWinCurrentTrick(gameState: GameState, card: Card): Boolean {
    const trick = gameState.getCurrentTrick();
    if (!trick.length) return true;


    const leadingSuit = gameState.getLeadingSuit();
    if (!leadingSuit) return false;
    if (card.suit !== leadingSuit) return false;


    const currentWinningEntry = getCurrentWinningEntry(gameState);
    if (!currentWinningEntry) return false;


    return CardSorter.compare(card, currentWinningEntry.card) > 0;
}

function getCurrentWinningEntry(gameState: GameState) {
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

function estimateCurrentTrickPoints(gameState: GameState) {
    const trick = gameState.getCurrentTrick();
    return trick.reduce((sum, entry) => sum + entry.card.getPoints(), 0);
}