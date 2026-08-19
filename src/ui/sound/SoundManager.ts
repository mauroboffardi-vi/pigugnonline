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
        cardLand: new Audio('/assets/audio/card_land.mp3'),
        cardLandPigugno: new Audio('/assets/audio/card_land_pigugno.mp3'),
        trickSweep: new Audio('/assets/audio/sweep.mp3')
    };

    constructor() {
        // Register listeners for animation events
        gameEvents.on<{ card: Card }>('CARD_LAND', ({ card }) => {
            this.playCardLand(card);
        });
        gameEvents.on('TRICK_SWEEP', () => this.playSound('trickSweep'));
    }

    private playCardLand(card: Card) {
        if (card.isPigugno()) {
            this.playSound('cardLandPigugno');
        } else {
            this.playSound('cardLand');
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
}