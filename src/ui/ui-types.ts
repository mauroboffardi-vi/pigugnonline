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


export type PlayerAreaDirections = "bottom" | "left" | "top" | "right";

export interface TestApi {
    getGameState: () => GameState | null;
    toggleDebugShowCpuCards?: () => boolean;
    getDebugShowCpuCards?: () => boolean;
    rerender?: () => void;
}


/** 
 *  collega il playerID al nome del container dell'area di gioco
 */
export const PLAYER_CONTAINER_IDS: Record<number, string> = Object.freeze({
    0: 'player-you',
    1: 'player-left',
    2: 'player-top',
    3: 'player-right',
});