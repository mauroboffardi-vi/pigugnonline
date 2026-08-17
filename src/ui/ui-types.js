import { Card } from "../domain/cards/Card";
import { GameState } from "../domain/game/GameState";

/**
 * @typedef {Object} HandSummaryPlayer
 * @property {number} playerId
 * @property {number} tricks
 * @property {number} points
 * @property {Card[]} captures
 * @property {Card[]} scoringCards
 * @property {number} [buscheBeforeHand]
 * @property {number} [buscheAfterHand]
 * @property {number} [buscheEarned]
 */


/**
 * @typedef {Object} HandSummary
 * @property {HandSummaryPlayer[]} players
 * @property {number | null} pigugnoWinnerId
 * @property {number} startingPlayerId
 * @property {number} lastTrickWinnerId
 */

/**
 * @typedef {"bottom" | "left" | "top" | "right"} PlayerAreaDirections
 */


/**
 * @typedef {Object} TestApi
 * @property {() => GameState | null} getGameState
 * @property {() => boolean} [toggleDebugShowCpuCards]
 * @property {() => boolean} [getDebugShowCpuCards]
 * @property {() => void} [rerender]
 */