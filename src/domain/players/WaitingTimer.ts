import { gameEvents } from '../../app/EventBus';

class WaitingTimer {
    private timerId: ReturnType<typeof setTimeout> | null = null;

    /**
     * Avvia un timer casuale tra 3 e 6 secondi per il giocatore umano.
     */
    start() {
        this.clear();

        // Calcola una durata casuale tra 6000ms (6s) e 12000ms (12s)
        const randomDelay = Math.floor(Math.random() * 6001) + 6000;
        console.debug(`⏱️ Timer started, wait for ${randomDelay}ms`);

        this.timerId = setTimeout(() => {
            console.debug(`⏱️ Timer expired!!!`);
            gameEvents.emit('WAITING_FOR_PLAYER');
            this.timerId = null;
            // fa ripartire il timer dopo aver sollevato l'evento,
            // cosí continua a pungolare il giocatore finche non gioca
            this.start();
        }, randomDelay);
    }

    /**
     * Annulla e resetta il timer attivo.
     */
    clear() {
        if (this.timerId) {
            console.debug(`⏱️ Timer stopped`);
            clearTimeout(this.timerId);
            this.timerId = null;
        }
    }
}

export const waitingTimer = new WaitingTimer();