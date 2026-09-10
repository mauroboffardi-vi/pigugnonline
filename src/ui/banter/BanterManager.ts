import { gameEvents } from '../../app/EventBus';
import { Card } from '../../domain/cards/Card';
import { GameState } from '../../domain/game/GameState';
import { Player } from '../../domain/domain-types';
import { PLAYER_CONTAINER_IDS } from '../ui-types';
import banterData from './banter-data.json';

import * as bh from './banter-helpers';

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

    // 2. Coefficente di probabilità (10%)
    public PROBABILITY: number = 0.1;

    constructor() {
        // Intercettiamo gli eventi (predisposti come richiesto)
        gameEvents.on('COMPUTER_CARD_CHOSEN', (payload: any) => this.handleEvent('COMPUTER_CARD_CHOSEN', payload));
        gameEvents.on('START_HAND', (payload: any) => this.handleEvent('START_HAND', payload));
        //gameEvents.on('BANTER2', (payload: any) => this.handleEvent('BANTER2', payload));
        //gameEvents.on('BANTER3', (payload: any) => this.handleEvent('BANTER3', payload));
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
        console.groupCollapsed(`💬 ${eventName}`);

        // 2. Coefficente di probabilità (5%)
        if (Math.random() > this.PROBABILITY) return;


        let text = '';

        // NON POSSO USARE METODI DI GAMESTATE, visto che viene passato non come oggetto, 
        // ma come snapshot dati statico, questo pereché deve passare per il bus.
        //let speaker: Player = gameState?.getCurrentPlayer();

        let speaker: Player = gameState.players[gameState.currentTurn];

        // 3. Logica basata sull'evento
        switch (eventName) {
            case 'COMPUTER_CARD_CHOSEN':
                const chosenCard: Card = payload?.chosen;
                text = this.computerCardChosen(gameState, chosenCard);
                break;
            case 'START_HAND':
                const options = banterData.INIZIOMANO;
                speaker = this.randomPlayer(gameState);
                text = this.pickOne(options);
                break;
            case 'BANTER3':
            default:
                // Preleva una frase random dalla lista generica BANTER
                const list = banterData.RANDOM;
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

        console.groupEnd();
    }

    private computerCardChosen(gameState: GameState, chosenCard: Card): string {
        var group = "DEFAULT";
        let options = banterData.COMPUTER_CARD_CHOSEN.find(obj => obj.hasOwnProperty('DEFAULT'))?.DEFAULT || [];

        if (chosenCard) {
            // Se sono il primo di mano uso "PRIMA", ma se sto giocando nona o decima ho un'eccezione
            if (!gameState?.trick || gameState.trick.length === 0) {
                var group = "PRIMA";

                console.debug(`isNona = ${bh.isNona(gameState, chosenCard)} ; isDecima=${bh.isDecima(gameState, chosenCard)}`);

                options = banterData.COMPUTER_CARD_CHOSEN.find(obj => obj.hasOwnProperty('PRIMA'))?.PRIMA || [];
                if (bh.isNona(gameState, chosenCard)) {
                    group = "PRIMA_NONA";
                    options = banterData.COMPUTER_CARD_CHOSEN.find(obj => obj.hasOwnProperty('PRIMA_NONA'))?.PRIMA_NONA || [];
                }
                if (bh.isDecima(gameState, chosenCard)) {
                    group = "PRIMA_DECIMA";
                    options = banterData.COMPUTER_CARD_CHOSEN.find(obj => obj.hasOwnProperty('PRIMA_DECIMA'))?.PRIMA_DECIMA || [];
                }

            } else {


                // ordine di presa (per il culo): commento se ci vado sotto, commento speciale se vado sotto con un asso,
                // commento ancora quando rifilo il pigugno in una mano a spade

                if (bh.vadosotto(gameState, chosenCard)) {
                    var group = "SOTTO";
                    options = banterData.COMPUTER_CARD_CHOSEN.find(obj => obj.hasOwnProperty('SOTTO'))?.SOTTO || [];
                    // comment
                    if (chosenCard.getPoints() == 3) {
                        var group = "ASSO";
                        options = banterData.COMPUTER_CARD_CHOSEN.find(obj => obj.hasOwnProperty('ASSO'))?.ASSO || [];
                    }
                    if (chosenCard.isPigugno()) {
                        var group = "PIGUGNOSOTTO";
                        options = banterData.COMPUTER_CARD_CHOSEN.find(obj => obj.hasOwnProperty('PIGUGNOSOTTO'))?.PIGUGNOSOTTO || [];
                    }
                    // Se gioco il pigugno in prima mano perchè secco
                    if ((chosenCard.isPigugno()) && (gameState.currentTurn == 1)) {
                        var group = "PIGUGNOSECCO";
                        options = banterData.COMPUTER_CARD_CHOSEN.find(obj => obj.hasOwnProperty('PIGUGNOSECCO'))?.PIGUGNOSECCO || [];
                    }
                }

                // se non vado sotto, testo se vado sopra (pootrei anche rifiutare).
                // caso speciale se vado sopra a decima

                if (bh.vadosopra(gameState, chosenCard)) {
                    var group = "SOPRA";
                    options = banterData.COMPUTER_CARD_CHOSEN.find(obj => obj.hasOwnProperty('SOPRA'))?.SOPRA || [];
                    if (bh.isDecima(gameState, chosenCard)) {
                        group = "SOPRA_DECIMA";
                        options = banterData.COMPUTER_CARD_CHOSEN.find(obj => obj.hasOwnProperty('SOPRA_DECIMA'))?.SOPRA_DECIMA || [];
                    }
                }

                // opzione migliore: se sto rifiutando (vadosopra e vadosotto = false) e sto giocando il pigugno,
                // STO DANDO IL PIGUGNO DI TRAVERSO!

                if (((chosenCard.isPigugno()) && (gameState.currentTurn > 1))) {
                    var group = "PIGUGNOTRAVERSO";
                    options = banterData.COMPUTER_CARD_CHOSEN.find(obj => obj.hasOwnProperty('PIGUGNOTRAVERSO'))?.PIGUGNOTRAVERSO || [];
                }
            } // fine dell'else primacarta
        }

        // se nessuno dei casi sopra, allora pesco dal default
        console.debug(`💬 COMPUTER_CARD_CHOSEN.${group}: ${chosenCard.toString()}`);
        return this.pickOne(options) as string;
    }


    // restituisce uno a caso fra player 1, 2, 3 (0 è il giocatore)
    private randomPlayer(gameState: GameState): Player {
        const players = gameState.players;
        const randomIndex = Math.floor(Math.random() * (players.length - 1)) + 1;
        return players[randomIndex];
    }

    private pickOne(options: string[]): string {
        if (!options || options.length === 0) {
            throw new Error("Options array is empty or undefined");
        }
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex];
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
            console.debug(` Appendo la bolla al contenitore ${containerId}`);
            if (!playerContainer) console.warn(`🚨 Contenitore ${containerId} non trovato! Fallback su body.`);

            playerContainer.appendChild(bubble);

            // Calcolo durata: min 2s, max 4s, proporzionale alla lunghezza
            const duration = Math.max(2000, Math.min(4000, text.length * 70));

            // Rimuove il fumetto e risolve la promise per passare al prossimo in coda
            setTimeout(() => {
                bubble.remove();
                resolve();
            }, duration);
        });
    }
}