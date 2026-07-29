import { CardSorter } from "../cards/CardSorter.js";

/**
 * AI base per la scelta della carta da giocare.
 *
 * Strategia iniziale:
 * - genera solo mosse legali
 * - se può vincere la presa, gioca la carta vincente più bassa
 * - se non può vincere, scarta la carta più bassa
 * - in apertura, gioca la carta più bassa tra quelle legali
 * - il RANDOM_PLAY_PROBABILITY per ora é zero
 * 
 * 
 * todos:
 * 
 * - [ ] Estrarre una funzione comune `playCardWithAnimation(...)` usata sia dal click umano sia dal `ComputerPlayer`. [web:578][web:579]
- [ ] Integrare `ComputerPlayer` nel flow principale con `continueGameFlow()` che fa giocare tutti i bot finché non torna il turno umano. [web:561][web:564]
- [ ] Aggiungere `playComputerTurn()` che sceglie la carta col bot e la gioca passando dalla stessa pipeline UI/animazioni del giocatore umano. [web:579][web:588]
- [ ] Aggiungere `getContainerByPlayerId()` per recuperare il container DOM corretto del giocatore. [web:579]
- [ ] Evitare re-entry del flow automatico con un flag tipo `isAdvancingGameFlow`. [web:588]
- [ ] Far partire automaticamente il gioco se il giocatore iniziale con il settebello è un computer, invece di restare in attesa di un click umano. [web:561][web:570]
- [ ] Verificare che dopo ogni presa risolta il flow riparta correttamente col prossimo computer, se il turno è suo. [web:561][web:564]
- [ ] Mettere temporaneamente `ComputerPlayer.RANDOM_PLAY_PROBABILITY = 0` finché la logica base non è stabile. [web:558]
- "ciapa e torna"
 */
export default class ComputerPlayer {
    static DEBUG = true;
    static RANDOM_PLAY_PROBABILITY = 0.00; // mettere piú avanti a 0.05 ?

    chooseCard(gameState, playerId) {
        const currentPlayer = gameState.getCurrentPlayer();
        if (!currentPlayer || playerId !== currentPlayer.id) {
            throw new Error(
                `ComputerPlayer: playerId ${playerId} non è il giocatore che deve giocare ora!`
            );
        }

        const player = gameState.getPlayerById(playerId);
        if (!player) {
            throw new Error(`ComputerPlayer: giocatore ${playerId} non trovato`);
        }

        const playableCards = gameState.getPlayableCards(playerId);
        if (!playableCards.length) {
            throw new Error(`ComputerPlayer: nessuna carta giocabile per ${player.name}`);
        }

        this.#log(player.name, "vediamo cosa giocare...");

        if (Math.random() < ComputerPlayer.RANDOM_PLAY_PROBABILITY) {
            const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
            this.#log(player.name, `gioco a caso ${this.#cardLabel(randomCard)}`);
            return randomCard;
        }

        if (gameState.getCurrentTrick().length === 0) {
            const lowestLead = this.#getLowestCard(playableCards);
            this.#log(player.name, `apro con la più bassa: ${this.#cardLabel(lowestLead)}`);
            return lowestLead;
        }

        const winningCards = this.#getWinningCards(gameState, playableCards);
        if (winningCards.length > 0) {
            const cheapestWinner = this.#getLowestCard(winningCards);
            this.#log(player.name, `provo a prendere con ${this.#cardLabel(cheapestWinner)}`);
            return cheapestWinner;
        }

        const cheapestDiscard = this.#getLowestCard(playableCards);
        this.#log(player.name, `non posso prendere, scarto ${this.#cardLabel(cheapestDiscard)}`);
        return cheapestDiscard;
    }

    #getWinningCards(gameState, playableCards) {
        const trick = gameState.getCurrentTrick();
        if (!trick.length) return [];

        const leadingSuit = gameState.getLeadingSuit();
        if (!leadingSuit) return [];

        const currentWinningEntry = trick
            .filter(entry => entry.card.suit === leadingSuit)
            .reduce((best, entry) => {
                if (!best) return entry;
                return CardSorter.compare(best.card, entry.card) > 0 ? best : entry;
            }, null);

        if (!currentWinningEntry) return [];

        return playableCards.filter(card => {
            if (card.suit !== leadingSuit) return false;
            return CardSorter.compare(card, currentWinningEntry.card) > 0;
        });
    }

    #getLowestCard(cards) {
        return cards.reduce((lowest, current) => {
            if (!lowest) return current;
            return CardSorter.compare(lowest, current) < 0 ? lowest : current;
        }, null);
    }

    #cardLabel(card) {
        return `${card.value} di ${card.suit}`;
    }

    #log(playerName, message) {
        if (!ComputerPlayer.DEBUG) return;
        console.log(`${playerName}: "${message}"`);
    }
}