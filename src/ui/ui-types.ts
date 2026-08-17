import { Card } from "../domain/cards/Card";
import { GameState } from "../domain/game/GameState";

export interface HandSummaryPlayer {
    playerId: number;
    tricks: number;
    points: number;
    captures: Card[];
    scoringCards: Card[];
    buscheBeforeHand?: number;
    buscheAfterHand?: number;
    buscheEarned?: number;
}

export interface HandSummary {
    players: HandSummaryPlayer[];
    pigugnoWinnerId: number | null;
    startingPlayerId: number;
    lastTrickWinnerId: number;
}

export type PlayerAreaDirections = "bottom" | "left" | "top" | "right";

export interface TestApi {
    getGameState: () => GameState | null;
    toggleDebugShowCpuCards?: () => boolean;
    getDebugShowCpuCards?: () => boolean;
    rerender?: () => void;
}