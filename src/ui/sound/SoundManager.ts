import { gameEvents } from '../../app/EventBus';
import { Card } from '../animations/table-animation';

/**
 * 
 * intercetta gli eventi che necessitano di un audio
 * 
 */

export class SoundManager {
    private isMuted: boolean = false;
    private sounds: Record<string, HTMLAudioElement> = {
        cardLand1: new Audio('../../assets/audio/card1.mp3'),
        cardLand2: new Audio('../../assets/audio/card2.mp3'),
        cardLand3: new Audio('../../assets/audio/card3.mp3'),
        cardLand4: new Audio('../../assets/audio/card4.mp3'),
        cardLand5: new Audio('../../assets/audio/card5.mp3'),
        cardLand6: new Audio('../../assets/audio/card6.mp3'),
        cardLand7: new Audio('../../assets/audio/card7.mp3'),
        cardLand8: new Audio('../../assets/audio/card8.mp3'),
        cardLand9: new Audio('../../assets/audio/card9.mp3'),
        cardLandPigugno: new Audio('../../assets/audio/card_land_pigugno.mp3'),
        trickSweep: new Audio('../../assets/audio/sweep.mp3'),
        busca: new Audio('../../assets/audio/pencil_circle.mp3'),
        strike: new Audio('../../assets/audio/pencil_line.mp3'),
        cross: new Audio('../../assets/audio/pencil_cross.mp3')
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

    private rand(min: number, max: number): number {
        return Math.round(Math.random() * (max - min) + min);
    }
}