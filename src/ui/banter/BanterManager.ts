import { gameEvents } from '../../app/EventBus';
import { Player } from '../../app/single/single';
import { GameState } from '../../domain/game/GameState';
import { PLAYER_CONTAINER_IDS } from '../ui-types';
import banterData from './banter-data.json';

interface BanterTask {
    text: string;
    player: Player;
}

export class BanterManager {
    private isMuted: boolean = false;
    private queue: BanterTask[] = [];

    // Coda indipendente per ogni giocatore (chiave: playerId)
    private playerQueues: Map<number, BanterTask[]> = new Map();
    // Set che traccia quali giocatori hanno un fumetto attivo a schermo
    private activeSpeakers: Set<number> = new Set();

    // 2. Coefficente di probabilità (5%)
    private PROBABILITY: number = 0.05;
    // private PROBABILITY: number = 1;



    constructor() {
        // Intercettiamo gli eventi (predisposti come richiesto)
        gameEvents.on('COMPUTER_CARD_CHOSEN', (gameState: GameState) => this.handleEvent('COMPUTER_CARD_CHOSEN', gameState));
        gameEvents.on('BANTER2', (gameState: any) => this.handleEvent('BANTER2', gameState));
        gameEvents.on('BANTER3', (gameState: any) => this.handleEvent('BANTER3', gameState));
    }

    public toggle(state?: boolean): void {
        this.isMuted = state !== undefined ? state : !this.isMuted;
    }

    /**
 * Imposta lo stato del silenziatore audio.
 */
    public setMuted(muted: boolean): void {
        this.isMuted = muted;
    }

    /**
     * Ritorna true se l'audio è attualmente disattivato.
     */
    public getMuted(): boolean {
        return this.isMuted;
    }

    private handleEvent(eventName: string, payload: any): void {
        // 1. Controllo se abilitato
        if (this.isMuted) return;

        const gameState: GameState = payload?.gameState || payload;
        console.debug(`💬 ${eventName}, ${gameState}`);

        // 2. Coefficente di probabilità (5%)
        if (Math.random() > this.PROBABILITY) return;


        let text = '';

        // NON POSSO USARE METODI DI GAMESTATE, visto che viene passato non come oggetto, 
        // ma come snapshot dati statico, questo pereché deve passare per il bus.
        //let speaker: Player = gameState?.getCurrentPlayer();

        let speaker: Player = gameState.players[gameState.currentTurn];

        // 3. Logica basata sull'evento
        switch (eventName) {
            case 'BANTER1':
            case 'BANTER2':
            case 'BANTER3':
            default:
                // Preleva una frase random dalla lista generica BANTER
                const list = banterData.BANTER;
                text = list[Math.floor(Math.random() * list.length)];

                // Esempio logica speciale (commentato per il futuro):
                // if (gameState.points > 10 && eventName === 'BANTER2') { 
                //     text = "Guarda che roba!";
                //     speakerId = this.getRandomOpponent(gameState);
                // }
                break;
        }

        if (text) {
            const playerId = speaker.id;

            // Inizializza la coda per il giocatore se non esiste
            if (!this.playerQueues.has(playerId)) {
                this.playerQueues.set(playerId, []);
            }

            const queue = this.playerQueues.get(playerId)!;

            // (Opzionale) Limita la coda a max 2 elementi per evitare frasi obsolete
            if (queue.length < 2) {
                queue.push({ text, player: speaker });
            }

            this.processPlayerQueue(playerId);
        }
    }

    // --- LOGICA ASINCRONA DI DISPLAY ---

    private async processPlayerQueue(playerId: number): Promise<void> {
        const queue = this.playerQueues.get(playerId);

        // Se il giocatore sta già mostrando un fumetto o la sua coda è vuota, esce
        if (this.activeSpeakers.has(playerId) || !queue || queue.length === 0) {
            return;
        }

        // Blocca solo il giocatore corrente
        this.activeSpeakers.add(playerId);
        const task = queue.shift();

        if (task) {
            await this.showBubble(task.text, task.player);
        }

        // Sblocca il giocatore corrente
        this.activeSpeakers.delete(playerId);

        // Processa l'eventuale messaggio successivo dello STESSO giocatore
        this.processPlayerQueue(playerId);
    }



    private showBubble(text: string, player: Player): Promise<void> {
        return new Promise((resolve) => {
            console.debug(`💬 showBubble: ${player.name} says "${text}"`);



            // Crea il container ellittico
            const bubble = document.createElement('div');

            // Mappatura direzioni della coda per ciascun giocatore
            const TAIL_DIRECTIONS: Record<number, string> = {
                0: 'tail-down',  // Giocatore in basso (Tu)
                1: 'tail-left',  // Giocatore a sinistra
                2: 'tail-up',    // Giocatore in alto
                3: 'tail-right', // Giocatore a destra
            };

            // Mappatura delle posizioni della bolla rispetto al contenitore
            const BUBBLE_POSITIONS: Record<number, string> = {
                0: 'pos-bottom', // Tu: bolla sopra
                1: 'pos-left',   // Sinistra: bolla a destra
                2: 'pos-top',    // Alto: bolla sotto
                3: 'pos-right',  // Destra: bolla a sinistra
            };

            // Applichiamo sia la classe base che quella di posizione specifica del giocatore
            const posClass = BUBBLE_POSITIONS[player.id] || 'pos-bottom';
            bubble.className = `banter-bubble ${posClass}`;

            const textSpan = document.createElement('span');
            textSpan.className = 'banter-text';
            textSpan.textContent = text;
            bubble.appendChild(textSpan);

            // Creazione della coda con la direzione dinamica
            const tail = document.createElement('div');
            const directionClass = TAIL_DIRECTIONS[player.id] || 'tail-down';
            tail.className = `banter-tail ${directionClass}`;

            bubble.appendChild(tail);

            // Se non trova il playerId nell'array dei container (????) va di default a "top"
            const containerId = PLAYER_CONTAINER_IDS[player.id] || PLAYER_CONTAINER_IDS[2];

            // Trova la UI del giocatore. (Aggiusta l'ID in base a come è costruito il tuo HTML)
            const playerContainer = document.getElementById(containerId) || document.body;
            playerContainer.appendChild(bubble);

            // Calcolo durata: min 3s, max 6s, proporzionale alla lunghezza
            const duration = Math.max(3000, Math.min(6000, text.length * 70));

            // Rimuove il fumetto e risolve la promise per passare al prossimo in coda
            setTimeout(() => {
                bubble.remove();
                resolve();
            }, duration);
        });
    }
}