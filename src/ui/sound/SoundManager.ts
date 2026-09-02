import { gameEvents } from '../../app/EventBus';
import { Card } from '../animations/table-animation';


// Importa ogni file audio all'inizio del file
// Vite restituirà una stringa con l'URL corretto (e l'hash per il server remoto)
// vedi anche types/media.d.ts
import card1Url from '../../assets/audio/card1.mp3';
import card2Url from '../../assets/audio/card2.mp3';
import card3Url from '../../assets/audio/card3.mp3';
import card4Url from '../../assets/audio/card4.mp3';
import card5Url from '../../assets/audio/card5.mp3';
import card6Url from '../../assets/audio/card6.mp3';
import card7Url from '../../assets/audio/card7.mp3';
import card8Url from '../../assets/audio/card8.mp3';
import card9Url from '../../assets/audio/card9.mp3';
import cardPigugnoUrl from '../../assets/audio/card_land_pigugno.mp3';
import sweepUrl from '../../assets/audio/sweep.mp3';
import buscaUrl from '../../assets/audio/pencil_circle.mp3';
import strikeUrl from '../../assets/audio/pencil_line.mp3';
import crossUrl from '../../assets/audio/pencil_cross.mp3';
import fanfareUrl from '../../assets/audio/victory_fanfare.mp3';

/**
 * 
 * intercetta gli eventi che necessitano di un audio
 * 
 */

export class SoundManager {
    private isMuted: boolean = false;
    private sounds: Record<string, HTMLAudioElement> = {
        cardLand1: new Audio(card1Url),
        cardLand2: new Audio(card2Url),
        cardLand3: new Audio(card3Url),
        cardLand4: new Audio(card4Url),
        cardLand5: new Audio(card5Url),
        cardLand6: new Audio(card6Url),
        cardLand7: new Audio(card7Url),
        cardLand8: new Audio(card8Url),
        cardLand9: new Audio(card9Url),
        cardLandPigugno: new Audio(cardPigugnoUrl),
        trickSweep: new Audio(sweepUrl),
        busca: new Audio(buscaUrl),
        strike: new Audio(strikeUrl),
        cross: new Audio(crossUrl),
        fanfare: new Audio(fanfareUrl),
    };

    constructor() {
        // Register listeners for animation events
        gameEvents.on<{ card: Card }>('CARD_LAND', ({ card }) => {
            this.playCardLand(card);
        });
        gameEvents.on('TRICK_SWEEP', () => this.playSound('trickSweep'));
        gameEvents.on('BUSCA_MARKED', () => this.playSound('busca'));
        gameEvents.on('BUSCA_SEPARATOR_MARKED', () => this.playSound('strike'));
        gameEvents.on('BUSCA_10_MARKED', () => this.playSound('cross'));
        gameEvents.on('GAME_OVER', () => this.playSound('fanfare'));
    }

    private playCardLand(card: Card) {
        if (card.isPigugno()) {
            this.playSound('cardLandPigugno');
        } else {
            this.playSound('cardLand' + this.rand(1, 9));
        }
    }

    private playSound(soundName: string) {
        console.debug(`🔊 ${soundName}`);
        if (this.isMuted || !this.sounds[soundName]) return;

        // Clone or reset time to allow rapid overlapping plays
        const audio = this.sounds[soundName].cloneNode() as HTMLAudioElement;
        audio.volume = 0.8;
        audio.play().catch(() => {/* Handle browser autoplay restrictions */ });
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        return this.isMuted;
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

    private rand(min: number, max: number): number {
        return Math.round(Math.random() * (max - min) + min);
    }
}