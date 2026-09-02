// src/domain/game/GameState.ts

import { Deck } from '../../domain/cards/Deck';
import { CardSorter } from '../../domain/cards/CardSorter';
import { Card } from '../../domain/cards/Card';
import { Suit, LastHandSummary, PlayerHandSummary, Player, Trick, TrickEntry, CompletedTricks, GameOverState } from '../domain-types';

/**
 * Rappresenta lo stato della partita singola.
 */
export class GameState {
    playerNames: string[];
    players: Player[];
    deck: Deck | null;
    currentTurn: number;
    phase: 'setup' | 'playing' | 'hand-ended';
    trick: Trick;
    trumpSuit: Suit;
    onTrickResolved: ((winnerPlayerId: number, resolvedTrick: Trick) => void) | null;
    onHandEnded: ((summary: LastHandSummary) => void) | null;
    isFirstTrick: boolean;
    completedTricks: CompletedTricks;
    handNumber: number;
    dealerId: number | null;
    startingPlayerForHand: number;
    lastHandWinnerId: number | null;
    lastHandSummary: LastHandSummary | null;
    gameOverState: GameOverState | null = null;

    /**
     * Crea il nuovo stato di gioco.
     *
     */

    constructor(playerNames: string[]) {
        this.playerNames = playerNames;
        this.players = playerNames.map((name, index) => ({
            id: index,
            name,
            isComputer: index > 0,
            hand: [] as Card[],
            faceUp: false,
            captures: [] as Card[],
            capturedTricks: 0,
            busche: 0,
            buscheThisHand: 0,
            pointsThisHand: 0,
        }));

        this.deck = null;
        this.currentTurn = 0;
        this.phase = 'setup';
        this.trick = [];
        this.trumpSuit = 'spade';
        this.onTrickResolved = null;
        this.onHandEnded = null;
        this.isFirstTrick = true;
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

    getPlayersInTurnOrder(startPlayerId: number = this.currentTurn): Player[] {
        const orderedPlayers = [];
        let playerId = startPlayerId;

        for (let i = 0; i < this.players.length; i += 1) {
            orderedPlayers.push(this.getPlayerById(playerId));
            playerId = this.getNextPlayerId(playerId);
        }

        return orderedPlayers;
    }

    playCard(playerId: number, cardId: number): boolean {
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

        this.currentTurn = this.getNextPlayerId(this.currentTurn);

        console.debug(`Tocca al giocatore ${this.currentTurn}: ${this.players[this.currentTurn].name}`);

        if (this.trick.length === this.players.length) {
            this.resolveTrick();
        }

        return true;
    }

    canPlayCard(card: Card, playerId: number, { verbose = false } = {}): boolean {
        if (this.phase !== 'playing') return false;

        const player = this.players.find(p => p.id === playerId);
        if (!player) return false;

        if (verbose) {
            console.debug(
                `canPlayCard(): turno ${this.trick.length} : ${player.name} sta provando a giocare ${card.value} di ${card.suit}`
            );
        }

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

        const leadingSuit = this.trick[0].card.suit;
        const cardsOfLeadingSuit = player.hand.filter(c => c.suit === leadingSuit);
        const hasLeadingSuit = cardsOfLeadingSuit.length > 0;

        if (this.isFirstTrick && card.isPigugno()) {
            if (leadingSuit !== 'spade') {
                if (verbose) {
                    console.debug(
                        'click ignorato: nella prima presa il Pigugno può essere giocato solo su uscita a spade'
                    );
                }
                return false;
            }

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

            return true;
        }

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

        return true;
    }

    getPlayableCards(playerId: number): Card[] {
        const player = this.getPlayerById(playerId);
        if (!player) return [];

        return player.hand.filter(card =>
            this.canPlayCard(card, playerId, { verbose: false })
        );
    }

    getPlayedCards(): Card[] {
        return this.players.flatMap(player => player.captures);
    }

    getCurrentTrick(): Trick {
        return this.trick.map(entry => ({ ...entry }));
    }

    getSeenCards(): Card[] {
        return [
            ...this.getPlayedCards(),
            ...this.trick.map(entry => entry.card),
        ];
    }

    getLeadingSuit(): string | null {
        if (this.trick.length === 0) return null;
        return this.trick[0].card.suit;
    }

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
        const summaryPlayers: PlayerHandSummary[] = this.players.map(player => {
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

    calculatePointsFromCaptures(cards: Card[]): number {
        return cards.reduce((sum, card) => sum + card.getPoints(), 0);
    }

    calculateBuscheForHand(playersSummary: PlayerHandSummary[]): Map<number, number> {
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

    pointsToBusche(points: number): number {
        if (points <= 17) return 1;
        if (points >= 18 && points <= 20) return 2;
        if (points >= 21 && points <= 23) return 3;
        if (points === 24) return 4;
        if (points >= 25) return points - 20;
        return 1;
    }

    getPlayerById(playerId: number): Player {
        const player = this.players.find(player => player.id === playerId);
        if (player == null) {
            throw new Error(
                `GameState.getPlayerById(): Player with id ${playerId} not found (??)`
            );
        }
        return player;
    }

    getNextPlayerId(playerId: number): number {
        return (playerId - 1 + this.players.length) % this.players.length;
    }

    getCurrentPlayer(): Player {
        return this.players[this.currentTurn];
    }

    getPlayerCaptureStatus(player: Player, viewerPlayerId: number): string {
        const capturesCount = Math.floor(player.captures.length / this.players.length);
        const isSelf = player.id === viewerPlayerId;

        switch (capturesCount) {
            case 0: return isSelf ? 'non ho coperto' : 'non ha coperto';
            case 1: return `1 presa`;
            default: return `${capturesCount} prese`;
        }
    }

    getCapturedCards(player: Player): Card[] {
        return player.captures;
    }

    findCardIndex(player: Player, cardId: number | string): number {
        return player.hand.findIndex(c => c.id.toString() === cardId.toString());
    }

    getPlayerBusche(playerId: number): number | null {
        const player = this.getPlayerById(playerId);
        return player ? player.busche : null;
    }

    getPlayerCapturedTricksCount(playerId: number): number | null {
        const player = this.getPlayerById(playerId);
        return player ? player.capturedTricks : null;
    }

    isFirstTrickOfHand(): boolean {
        return this.isFirstTrick;
    }

    getHandNumber(): number {
        return this.handNumber;
    }

    getPlayerHand(playerId: number): Card[] {
        const player = this.getPlayerById(playerId);
        return player?.hand || [];
    }

    computeGameOverState(): GameOverState {
        console.debug("computeGameOverState()");
        const BUSCHE_LIMIT = 10;

        const eliminated = this.players.filter(p => p.busche >= BUSCHE_LIMIT);
        const active = this.players.filter(p => p.busche < BUSCHE_LIMIT);

        let isGameOver = false;
        let winners: Player[] = [];
        let isDoubleWin = false;
        let message = "";

        if (eliminated.length === 2) {
            isGameOver = true;
            winners = active;
            isDoubleWin = false;
            message = `La vittoria va a ${winners[0].name} e ${winners[1].name}`;

        } else if (eliminated.length === 3) {
            isGameOver = true;
            winners = active;
            isDoubleWin = true;
            message = `DOPPIA vittoria per ${winners[0].name}!`;

        } else if (eliminated.length === 4) {
            isGameOver = true;
            isDoubleWin = false;
            const sortedByBusche = [...this.players].sort((a, b) => a.busche - b.busche);
            winners = [sortedByBusche[0], sortedByBusche[1]];
            message = `La vittoria va a ${winners[0].name} e ${winners[1].name}`;

        } else {
            isGameOver = false;
        }

        return { isGameOver, winners, isDoubleWin, message };
    }

    checkGameOver(): boolean {
        console.debug('CheckGameOver()');
        const state: GameOverState = this.computeGameOverState();
        this.gameOverState = state;
        console.debug(`isGameOver= ${state.isGameOver}`);
        return state.isGameOver;
    }
}