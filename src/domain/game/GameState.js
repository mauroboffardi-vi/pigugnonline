// src/game/GameState.js
import { Deck } from '../cards/Deck.js';
import { Card } from '../cards/Card.js';
import { CardSorter } from '../cards/CardSorter.js';
/** @import {TrickEntry, PlayerHandSummary, Player, LastHandSummary} from '../domain-types.js' */


/**
 * Rappresenta lo stato della partita singola.
 */

export class GameState {
    /**
     * Crea il nuovo stato di gioco.
     *
     * @param {string[]} playerNames - I nomi dei giocatori coinvolti.
     */
    constructor(playerNames) {
        this.playerNames = playerNames;

        /** @type {Player[]} */
        this.players = playerNames.map((name, index) => ({
            id: index,
            name,
            isComputer: index > 0,
            hand: [],
            faceUp: false,
            captures: [],
            capturedTricks: 0,
            busche: 0,
            buscheThisHand: 0,
            pointsThisHand: 0,
        }));

        this.deck = null;
        this.currentTurn = 0;
        this.phase = 'setup';
        /** @type {import('../domain-types.js').TrickEntry[]} */
        this.trick = [];
        this.trumpSuit = 'spade';
        /** @type {((winnerPlayerId: number, resolvedTrick: TrickEntry[]) => void) | null} */
        this.onTrickResolved = null;
        /** @type {((summary: LastHandSummary) => void) | null} */
        this.onHandEnded = null;

        this.isFirstTrick = true;
        /** @type {TrickEntry[][]} */
        this.completedTricks = [];

        this.handNumber = 1;
        this.dealerId = null;
        this.startingPlayerForHand = 0;
        this.lastHandWinnerId = null;
        this.lastHandSummary = null;
    }

    startGame() {
        this.handNumber = 1;
        this.players.forEach((player) => {
            player.busche = 0;
        });

        this.startHand({ firstHand: true });
    }

    startHand({ firstHand = false } = {}) {
        this.deck = new Deck();
        this.deck.shuffle();

        this.phase = 'playing';
        this.trick = [];
        this.isFirstTrick = true;
        this.lastHandWinnerId = null;
        this.lastHandSummary = null;

        this.players.forEach((player) => {
            player.hand = [];
            player.captures = [];
            player.capturedTricks = 0;
            player.buscheThisHand = 0;
            player.pointsThisHand = 0;
        });

        const playersInOrder = [...this.players];

        while (this.deck.cards.length > 0 && playersInOrder.some((player) => player.hand.length < 10)) {
            for (const player of playersInOrder) {
                if (player.hand.length < 10 && this.deck.cards.length > 0) {
                    const card = this.deck.cards.shift();
                    if (card) {
                        player.hand.push(card);
                    }
                }
            }
        }

        this.players.forEach((player) => {
            CardSorter.sortHand(player.hand);
        });

        if (firstHand) {
            const sevenOfDiamondsOwner = this.players.find(player =>
                player.hand.some(card => card.value === 7 && card.suit === 'denari')
            );

            if (sevenOfDiamondsOwner) {
                this.currentTurn = sevenOfDiamondsOwner.id;
                this.startingPlayerForHand = sevenOfDiamondsOwner.id;
            } else {
                this.currentTurn = 0;
                this.startingPlayerForHand = 0;
            }
        } else {
            if (this.dealerId == null) {
                this.dealerId = 0;
            }
            this.currentTurn = this.getNextPlayerId(this.dealerId);
            this.startingPlayerForHand = this.currentTurn;
        }

        console.debug(`Inizia la mano ${this.handNumber}, turno a ${this.players[this.currentTurn].name}`);
    }

    startNextHand() {
        if (!this.lastHandSummary) return false;

        this.handNumber += 1;
        this.startHand({ firstHand: false });
        return true;
    }

    /**
     * Restituisce i giocatori nell'ordine di gioco,
     * a partire dal giocatore indicato.
     *
     * @param {number} startPlayerId
     * @returns {Player[]}
     */
    getPlayersInTurnOrder(startPlayerId = this.currentTurn) {
        const orderedPlayers = [];
        let playerId = startPlayerId;

        for (let i = 0; i < this.players.length; i += 1) {
            orderedPlayers.push(this.getPlayerById(playerId));
            playerId = this.getNextPlayerId(playerId);
        }

        return orderedPlayers;
    }

    /**
     * 
     * @param {number} playerId 
     * @param {number} cardId 
     * @returns 
     */
    playCard(playerId, cardId) {
        if (this.phase !== 'playing') return false;
        if (playerId !== this.currentTurn) {
            console.debug('click ignorato: non è il turno di questo giocatore');
            return false;
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player) return false;

        const cardIndex = this.findCardIndex(player, cardId);
        if (cardIndex === -1) {
            console.debug('click ignorato: la carta non esiste nella mano del giocatore');
            return false;
        }

        const card = player.hand[cardIndex];

        if (!this.canPlayCard(card, playerId)) {
            console.debug('click ignorato: la carta non può essere giocata');
            return false;
        }

        player.hand.splice(cardIndex, 1);
        this.trick.push({ player, card });

        // ordine di gioco nella mano spefica
        this.currentTurn = this.getNextPlayerId(this.currentTurn);

        console.debug(`Tocca al giocatore ${this.currentTurn}: ${this.players[this.currentTurn].name}`);

        if (this.trick.length === this.players.length) {
            this.resolveTrick();
        }

        return true;
    }

    /**
    * Controlla se una carta può essere giocata in questo momento.
    *
    * Regole implementate:
    * - Se la presa è vuota, in generale si può aprire con qualsiasi carta.
    * - Eccezione: nella prima presa il Pigugno non può mai essere giocato in apertura.
    * - Se la presa è già aperta e il giocatore ha il seme di uscita, deve rispondere a seme.
    * - Se non ha il seme di uscita, può rifiutare con qualsiasi carta.
    * - Eccezione sul Pigugno nella prima presa:
    *   - non si può giocare di rifiuto su un seme diverso da spade;
    *   - si può giocare rispondendo a spade solo se è l’unica spada in mano.
    *
    * @param {Card} card - La carta che il giocatore vuole giocare.
    * @param {number} playerId - ID del giocatore.
    * @param {{ verbose?: boolean }} [options]
    * @returns {boolean}
    */
    canPlayCard(card, playerId, { verbose = false } = {}) {
        // La funzione ha senso solo durante la fase di gioco.
        if (this.phase !== 'playing') return false;

        // Recupero il giocatore che sta tentando la giocata.
        const player = this.players.find(p => p.id === playerId);
        if (!player) return false;

        if (verbose) {
            console.debug(
                `canPlayCard(): turno ${this.trick.length} : ${player.name} sta provando a giocare ${card.value} di ${card.suit}`
            );
        }

        // -------------------------------------------------------------------------
        // 1. CASO: apertura della presa
        // -------------------------------------------------------------------------
        // Se la presa è ancora vuota, normalmente qualunque carta è lecita.
        // L'unica eccezione è il Pigugno nella prima presa della mano:
        // in quel caso non può mai essere usato per aprire.
        if (this.trick.length === 0) {
            if (this.isFirstTrick && card.isPigugno()) {
                if (verbose) {
                    console.debug(
                        'click ignorato: il Pigugno non può essere giocato in apertura della prima presa'
                    );
                }
                return false;
            }

            return true;
        }

        // Da qui in poi siamo nel caso in cui qualcuno ha già aperto la presa.
        const leadingSuit = this.trick[0].card.suit;

        // Tutte le carte del seme di uscita che il giocatore ha attualmente in mano.
        const cardsOfLeadingSuit = player.hand.filter(c => c.suit === leadingSuit);

        // Se true, il giocatore è obbligato a rispondere a seme.
        const hasLeadingSuit = cardsOfLeadingSuit.length > 0;

        // -------------------------------------------------------------------------
        // 2. REGOLA SPECIALE: Pigugno nella prima presa
        // -------------------------------------------------------------------------
        // Questa è l’unica parte veramente speciale.
        //
        // Nella prima presa:
        // - il Pigugno NON si può giocare di rifiuto su coppe / denari / bastoni;
        // - il Pigugno si può giocare solo su uscita a spade;
        // - ma anche su uscita a spade è lecito solo se è l’unica spada in mano.
        //
        // Qui concentriamo tutta la logica speciale in un solo blocco,
        // così evitiamo duplicazioni e incoerenze più sotto.
        if (this.isFirstTrick && card.isPigugno()) {
            // Se il seme di uscita non è spade, il Pigugno è sempre vietato.
            // Questo copre sia il caso di rifiuto sia il caso impossibile in cui
            // qualcuno pensi di "rispondere" col Pigugno a un seme diverso.
            if (leadingSuit !== 'spade') {
                if (verbose) {
                    console.debug(
                        'click ignorato: nella prima presa il Pigugno può essere giocato solo su uscita a spade'
                    );
                }
                return false;
            }

            // Se l’uscita è a spade, allora il Pigugno è ammesso solo se è l’unica
            // spada che il giocatore possiede.
            //
            // cardsOfLeadingSuit qui contiene tutte le spade del giocatore.
            // Se dentro ci sono altre spade oltre al Pigugno, il giocatore deve
            // rispondere con un’altra spada e non può usare il Pigugno.
            const otherSpades = cardsOfLeadingSuit.filter(
                c => !c.isPigugno()
            );

            if (otherSpades.length > 0) {
                if (verbose) {
                    console.debug(
                        'click ignorato: nella prima presa il Pigugno su spade si può giocare solo se è l’unica spada'
                    );
                }
                return false;
            }

            // Se siamo arrivati qui:
            // - siamo nella prima presa;
            // - l’uscita è spade;
            // - il Pigugno è l’unica spada del giocatore.
            //
            // In questo caso la giocata è consentita.
            return true;
        }

        // -------------------------------------------------------------------------
        // 3. REGOLA GENERALE: obbligo di risposta a seme
        // -------------------------------------------------------------------------
        // Se il giocatore possiede almeno una carta del seme di uscita,
        // deve obbligatoriamente giocare quel seme.
        if (hasLeadingSuit) {
            if (card.suit !== leadingSuit) {
                if (verbose) {
                    console.debug(
                        `click ignorato: ${player.name} ha ${leadingSuit} in mano e deve rispondere a seme`
                    );
                }
                return false;
            }

            return true;
        }

        // -------------------------------------------------------------------------
        // 4. REGOLA GENERALE: rifiuto
        // -------------------------------------------------------------------------
        // Se il giocatore NON ha il seme di uscita, può rifiutare liberamente
        // con qualsiasi carta.
        //
        // Nota importante:
        // l’eventuale eccezione del Pigugno nella prima presa è già stata gestita
        // completamente sopra, quindi qui non dobbiamo più fare controlli speciali.
        return true;
    }

    /**
     * Restutuisce le carte che il giocatore puó giocare in questo momento.
     * @param {number} playerId 
     * @returns {Card[]} un array delle possibili carte giocabili
     */
    getPlayableCards(playerId) {
        const player = this.getPlayerById(playerId);
        if (!player) return [];

        return player.hand.filter(card =>
            this.canPlayCard(card, playerId, { verbose: false })
        );
    }

    /**
     * Restituisce tutte le carte già uscite in prese concluse.
     *
     * Le carte sono restituite come lista piatta, senza informazioni
     * su quale giocatore le abbia catturate, per non esporre dati non pubblici.
     *
     * @returns {Card[]} Tutte le carte già giocate in prese concluse.
     */
    getPlayedCards() {
        return this.players.flatMap(player => player.captures);
    }

    /**
     * Restituisce le carte sul tavolo. 
     * 
     * @returns {TrickEntry[]}
     */

    getCurrentTrick() {
        return this.trick.map(entry => ({ ...entry }));
    }

    /**
     * Restituisce tutte le carte pubblicamente viste finora.
     *
     * Include sia le carte nelle prese concluse sia quelle attualmente
     * presenti nel trick corrente.
     *
     * @returns {Card[]} Tutte le carte pubblicamente viste.
     */
    getSeenCards() {
        return [
            ...this.getPlayedCards(),
            ...this.trick.map(entry => entry.card),
        ];
    }


    /**
     * Restituisce il seme di uscita della presa corrente.
     *
     * Se la presa corrente è vuota, restituisce null.
     * Questo accade quando il giocatore di turno è il primo a giocare nel trick.
     *
     * @returns {string|null} Il seme di uscita, oppure null se il trick non è ancora iniziato.
     */
    getLeadingSuit() {
        if (this.trick.length === 0) return null;
        return this.trick[0].card.suit;
    }

    /**
     * Risolve la mano corrente.
     */
    resolveTrick() {
        console.debug('Fine della mano.');

        if (this.deck == null) {
            console.warn("Deck null?");
            return;
        }

        const resolvedTrick = [...this.trick];
        const leadingSuit = resolvedTrick[0].card.suit;
        const candidates = resolvedTrick.filter(({ card }) => card.suit === leadingSuit);

        const winner = candidates.reduce((prev, current) =>
            CardSorter.compare(prev.card, current.card) > 0 ? prev : current
        );

        winner.player.captures.push(...resolvedTrick.map(t => t.card));
        winner.player.capturedTricks += 1;
        this.currentTurn = winner.player.id;
        this.lastHandWinnerId = winner.player.id;

        console.debug(`la presa è di ${winner.player.name}`);

        this.completedTricks.push(resolvedTrick);
        if (typeof this.onTrickResolved === 'function') {
            this.onTrickResolved(winner.player.id, resolvedTrick);
        }

        this.trick = [];
        this.isFirstTrick = false;

        const handFinished = this.deck.cards.length === 0 && this.players.every(player => player.hand.length === 0);

        if (handFinished) {
            this.finalizeHand();
            this.phase = 'hand-ended';
        }
    }

    finalizeHand() {
        /** @type {PlayerHandSummary[]} */
        const summaryPlayers = this.players.map(player => {
            const points = this.calculatePointsFromCaptures(player.captures);
            const tricks = player.capturedTricks;
            const hasPigugno = player.captures.some(card => card.isPigugno());
            const scoringCards = player.captures.filter(card => card.isScoringCard());

            return {
                playerId: player.id,
                name: player.name,
                points,
                tricks,
                hasPigugno,
                scoringCards,
                captures: [...player.captures],
                buscheEarned: 0,
            };
        });

        const lastTrickWinner = summaryPlayers.find(p => p.playerId === this.lastHandWinnerId);
        if (lastTrickWinner) {
            lastTrickWinner.points += 3;
        }

        const buscheMap = this.calculateBuscheForHand(summaryPlayers);

        summaryPlayers.forEach(p => {
            /** @type {Player | undefined} */
            const player = this.players.find(x => x.id === p.playerId);
            if (player != null) {
                const earned = buscheMap.get(p.playerId) || 0;
                const before = player.busche;

                p.buscheBeforeHand = before;
                p.buscheEarned = earned;

                player.pointsThisHand = p.points;
                player.buscheThisHand = earned;
                player.busche = before + earned;

                p.buscheAfterHand = player.busche;
            }

        });

        const pigugnoWinner = summaryPlayers.find(p => p.hasPigugno) || null;
        if (pigugnoWinner) {
            this.dealerId = pigugnoWinner.playerId;

            // QUI: logga chi ha preso il pigugno e chi partirà dopo
            const nextPlayerId = this.getNextPlayerId(this.dealerId);
            const pigugnoName = pigugnoWinner.name;
            const nextPlayerName = this.players[nextPlayerId]?.name || '(sconosciuto)';
            console.debug(
                `${pigugnoName} ha preso il Pigugno, la mano successiva inizia da ${nextPlayerName}`
            );
        }

        this.lastHandSummary = {
            handNumber: this.handNumber,
            dealerId: this.dealerId,
            startingPlayerId: this.startingPlayerForHand,
            lastTrickWinnerId: this.lastHandWinnerId,
            pigugnoWinnerId: pigugnoWinner ? pigugnoWinner.playerId : null,
            players: summaryPlayers,
        };

        if (typeof this.onHandEnded === 'function') {
            this.onHandEnded(this.lastHandSummary);
        }
    }

    /**
     * @param {Card[]} cards 
     * @returns 
     */
    calculatePointsFromCaptures(cards) {
        return cards.reduce((sum, card) => sum + card.getPoints(), 0);
    }

    /**
     * @param {PlayerHandSummary[]} playersSummary
     * @returns {Map<number, number>}
     */
    calculateBuscheForHand(playersSummary) {
        const result = new Map(playersSummary.map(p => [p.playerId, 0]));
        const noCapturePlayers = playersSummary.filter(p => p.tricks === 0);
        const tenTricksPlayer = playersSummary.find(p => p.tricks === 10);

        if (tenTricksPlayer) {
            result.set(tenTricksPlayer.playerId, 0);
            playersSummary
                .filter(p => p.playerId !== tenTricksPlayer.playerId)
                .forEach(p => result.set(p.playerId, (result.get(p.playerId) || 0) + 6));
            return result;
        }

        if (noCapturePlayers.length > 0) {
            const malus = noCapturePlayers.length === 1 ? 2 : noCapturePlayers.length === 2 ? 4 : 6;
            noCapturePlayers.forEach(p => result.set(p.playerId, malus));
            return result;
        }

        const pigugnoHolder = playersSummary.find(p => p.hasPigugno);
        if (pigugnoHolder) {
            result.set(pigugnoHolder.playerId, (result.get(pigugnoHolder.playerId) || 0) + 1);
        }

        const maxPoints = Math.max(...playersSummary.map(p => p.points));
        const topPlayers = playersSummary.filter(p => p.points === maxPoints);

        const baseBusche = this.pointsToBusche(maxPoints);
        const multipliedBusche = baseBusche * topPlayers.length;

        topPlayers.forEach(p => {
            result.set(p.playerId, (result.get(p.playerId) || 0) + multipliedBusche);
        });

        return result;
    }

    /**
     * Determina il numero di busche in base al punteggio
     * @param {number} points 
     * @returns 
     */
    pointsToBusche(points) {
        if (points <= 17) return 1;
        if (points >= 18 && points <= 20) return 2;
        if (points >= 21 && points <= 23) return 3;
        if (points === 24) return 4;
        if (points >= 25) return points - 20;
        return 1;
    }

    /**
     * @param {number} playerId 
     * @returns {Player}
     */
    getPlayerById(playerId) {
        const player = this.players.find(player => player.id === playerId);
        if (player == null) {
            throw new Error(
                `GameState.getPlayerById(): Player with id ${playerId} not found (??)`
            );
        }
        return player;
    }
    /**
     * Ordine di gioco dei giocatori dipendente dalla presa
     * @param {number} playerId 
     * @returns {number}
     */
    getNextPlayerId(playerId) {
        return (playerId - 1 + this.players.length) % this.players.length;
    }

    /**
     * @returns {Player}
     */
    getCurrentPlayer() {
        return this.players[this.currentTurn];
    }

    /**
     * Restituisce per tutti i giocatori solo le informazioni pubbliche,
     * osservabili da chiunque durante la partita.
     *
     * Non include mani, carte catturate specifiche o altre informazioni private.
     *
     * @returns {Array<{
     *   playerId: number,
     *   name: string,
     *   busche: number,
     *   capturedTricks: number,
     *   cardsInHand: number,
     *   isEliminated: boolean
     * }>}
     *
    getPlayersPublicState() {
        return this.players.map(player => ({
            playerId: player.id,
            name: player.name,
            busche: player.busche,
            capturedTricks: player.capturedTricks,
            cardsInHand: player.hand.length,
            isEliminated: player.busche >= 10,
        }));
    }
        */


    /**
     * Restituisce la stringa di stato per il numero di presi di un giocatore.
     *
     * @param {Player} player - L'oggetto del giocatore.
     * @param {number} viewerPlayerId  - l'id del giocatore dalla cui prospettiva si gioca. usato per gestire prima/terza persona
     * @returns {string} La stringa di stato.
    */
    getPlayerCaptureStatus(player, viewerPlayerId) {
        const capturesCount = Math.floor(player.captures.length / this.players.length);

        const isSelf = player.id === viewerPlayerId;

        switch (capturesCount) {
            case 0: return isSelf ? 'non ho coperto' : 'non ha coperto';
            case 1: return `1 presa`;
            default: return `${capturesCount} prese`;
        }
    }

    /**
     * Ottiene le carte catturate da un giocatore specifico.
     *
     * @param {Player} player - L'oggetto del giocatore.
     * @returns {Card[]} Un array di carte catturate.
     */
    getCapturedCards(player) {
        return player.captures;
    }

    /**
     * Trova l'indice della carta nella mano del giocatore.
     *
     * @param {Player} player - L'oggetto del giocatore.
     * @param {number|string} cardId - L'ID della carta da cercare.
     * @returns {number} L'indice della carta nella mano del giocatore, o -1 se non esiste.
     */
    findCardIndex(player, cardId) {
        return player.hand.findIndex(c => c.id.toString() === cardId.toString());
    }

    /**
     * Restituisce il numero totale di busche del giocatore.
     *
     * @param {number} playerId - L'ID del giocatore.
     * @returns {number|null} Il numero di busche del giocatore, oppure null se il giocatore non esiste.
     */
    getPlayerBusche(playerId) {
        const player = this.getPlayerById(playerId);
        return player ? player.busche : null;
    }

    /**
     * Restituisce il numero di prese catturate dal giocatore nella mano corrente.
     *
     * @param {number} playerId - L'ID del giocatore.
     * @returns {number|null} Il numero di prese catturate, oppure null se il giocatore non esiste.
     */
    getPlayerCapturedTricksCount(playerId) {
        const player = this.getPlayerById(playerId);
        return player ? player.capturedTricks : null;
    }

    /**
     * Indica se la presa corrente è la prima della mano.
     *
     * @returns {boolean} true se è la prima presa della mano, altrimenti false.
     */
    isFirstTrickOfHand() {
        return this.isFirstTrick;
    }

    /**
     * Restituisce il numero della mano corrente.
     *
     * @returns {number} Il numero della mano corrente.
     */
    getHandNumber() {
        return this.handNumber;
    }


    /**
     * controlla se la partita sia terminata
     */

    computeGameOverState() {
        console.debug("computeGameOverState()");
        const BUSCHE_LIMIT = 10;

        // Separamento dei giocatori in base al limite delle busche
        const eliminated = this.players.filter(p => p.busche >= BUSCHE_LIMIT);
        const active = this.players.filter(p => p.busche < BUSCHE_LIMIT);

        let isGameOver = false;
        /** @type {Player[]} */
        let winners = [];
        let isDoubleWin = false;
        let message = "";

        if (eliminated.length === 2) {
            // CASO STANDARD: 2 giocatori fuori -> vincono i 2 rimasti dentro
            isGameOver = true;
            winners = active;
            isDoubleWin = false;
            message = `La vittoria va a ${winners[0].name} e ${winners[1].name}`;

        } else if (eliminated.length === 3) {
            // CASO SPECIALE 1: 3 giocatori fuori -> DOPPIA vittoria all'unico rimasto dentro
            isGameOver = true;
            winners = active; // 1 solo giocatore
            isDoubleWin = true;
            message = `DOPPIA vittoria per ${winners[0].name}!`;

        } else if (eliminated.length === 4) {
            // CASO SPECIALE 2: 4 giocatori fuori -> vittoria singola ai 2 con minor numero di busche
            isGameOver = true;
            isDoubleWin = false;

            // Ordiniamo tutti i giocatori per numero di busche crescenti
            const sortedByBusche = [...this.players].sort((a, b) => a.busche - b.busche);
            winners = [sortedByBusche[0], sortedByBusche[1]];
            message = `La vittoria va a ${winners[0].name} e ${winners[1].name}`;

        } else {
            // 0 o 1 giocatore fuori -> la partita prosegue
            isGameOver = false;
        }

        return { isGameOver, winners, isDoubleWin, message };
    }

    /**
     * 
     * @returns {boolean}
     */
    checkGameOver() {
        console.debug('CheckGameOver()');
        const state = this.computeGameOverState();
        this.gameOverState = state;
        console.debug(`isGameOver= ${state.isGameOver}`);
        return state.isGameOver;
    }

}