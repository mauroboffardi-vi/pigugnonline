import { GameState } from "../game/GameState";

/**
 * 
 *  AI per la scelta della carta da giocare.
 * 
 *  espone solo chooseCard(gameState, playerID)
 *  per restituire la carta migliore da giocare per un giocatore, dato il contesto gameState
 * 
 *  @param {GameState} gameState - lo stato corrente del gioco
 *  @param {*} playerId - Id del player per cui si vuole calcolare la mossa.
 */
export default class ComputerPlayer {
    static DEBUG = true;
    static RANDOM_PLAY_PROBABILITY = 0.05;

    chooseCard(gameState, playerId) {
        if (playerId !== gameState.getCurrentPlayer().playerId) {
            throw new Error(`ComputerPlayer: playerId ${playerId} non è il giocatore che deve giocare ora!`);
        }
        const io = gameState.getPlayerById(playerId);
        this.#log("vediamo cosa giocare...");
    }

    #log(playerName, message) {
        if (!ComputerPlayer.DEBUG) return;
        console.log(`${playerName}: "${message}"`);
    }
}