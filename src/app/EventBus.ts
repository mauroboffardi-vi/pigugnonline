type EventCallback<T = any> = (data: T) => void;
/**
 * 
 *   EVENT BUS usato per pubblicare eventi di gioco, come carta giocata, o punteggi presi.
 *   gli eventi sono raccolti dal SoundManager per i suoni e (quando implementato)
 *   dal BantManager per i fumetti di commento.
 *   Questa architettura consente di isolare nel codice  queste cose dagli eventi "Propri" di gioco.
 * 
 */
export class EventBus {
    private listeners: Map<string, Set<EventCallback>> = new Map();

    /**
     * Registra un listener per uno specifico evento.
     * Restituisce una funzione di pulizia per disiscriversi rapidamente.
     */
    public on<T = any>(event: string, callback: EventCallback<T>): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        this.listeners.get(event)!.add(callback);

        // Funzione di disiscrizione immediata
        return () => this.off(event, callback);
    }

    /**
     * Rimuove un listener specifico da un evento.
     */
    public off<T = any>(event: string, callback: EventCallback<T>): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
            if (eventListeners.size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    /**
     * Lancia un evento e invoca tutti i listener registrati passando i dati forniti.
     */
    public emit<T = any>(event: string, data?: T): void {
        console.debug(`EventBus: emit ${event} ${JSON.stringify(data)}`);
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Errore nell'esecuzione del listener per l'evento "${event}":`, error);
                }
            });
        }
    }

    /**
     * Registra un listener che viene eseguito una sola volta e poi rimosso.
     */
    public once<T = any>(event: string, callback: EventCallback<T>): void {
        const unsubscribe = this.on<T>(event, (data) => {
            unsubscribe();
            callback(data);
        });
    }

    /**
     * Rimuove tutti i listener di un evento o azzera l'intero bus se non viene specificato un evento.
     */
    public clear(event?: string): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

// Istanza condivisa pronta all'uso per l'intera applicazione
export const gameEvents = new EventBus();